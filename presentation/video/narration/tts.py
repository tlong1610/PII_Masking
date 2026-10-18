"""Generate Vietnamese voiceover per scene with edge-tts.

Reads ../script.json, writes ../assets/audio/<id>.mp3 and ../assets/audio/timing.json
(audio duration + sentence boundaries in seconds). Narration text contains no PII.

The product name is written as {PII} in script.json and spoken inline as BRAND_SPOKEN, at the
narration's own pace, in one breath with no pause (commas inside the name sounded broken).

Usage: python presentation/video/narration/tts.py [scene_id ...]
"""

import asyncio
import json
import sys
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "assets" / "audio"
TICKS = 10_000_000  # edge-tts offsets are in 100 ns ticks
BRAND_TOKEN = "{PII}"
BRAND_SPOKEN = "Pi Ai Ai Gát Siu"  # PIIGuard Shield, read in one breath


async def synth(scene: dict, voice: str, rate: str, pitch: str) -> dict:
    out = AUDIO_DIR / f"{scene['id']}.mp3"
    text = scene["vi"].replace(BRAND_TOKEN, BRAND_SPOKEN)
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    sentences = []
    with out.open("wb") as fh:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                fh.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start = chunk["offset"] / TICKS
                sentences.append({"start": round(start, 3), "end": round(start + chunk["duration"] / TICKS, 3)})
    return {"duration": round(MP3(out).info.length, 3), "sentences": sentences}


async def main(only: list[str]) -> None:
    script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    timing_path = AUDIO_DIR / "timing.json"
    timing = json.loads(timing_path.read_text(encoding="utf-8")) if timing_path.exists() else {}
    for scene in script["scenes"]:
        if only and scene["id"] not in only:
            continue
        for attempt in range(4):
            try:
                # The TTS stream occasionally stalls; give each attempt a deadline.
                timing[scene["id"]] = await asyncio.wait_for(
                    synth(scene, script["voice"], script["rate"], script.get("pitch", "+0Hz")), timeout=45
                )
                break
            except (edge_tts.exceptions.NoAudioReceived, asyncio.TimeoutError):
                if attempt == 3:
                    raise
                await asyncio.sleep(3 * (attempt + 1))
        print(f"{scene['id']}: {timing[scene['id']]['duration']:.2f}s")
        timing_path.write_text(json.dumps(timing, indent=2), encoding="utf-8")
    print(f"total voice: {sum(t['duration'] for t in timing.values()):.1f}s")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
