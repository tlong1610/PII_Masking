from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

# Fix brotlicffi Decompressor.decompress signature compatibility with httpx2
try:
    import brotlicffi
    _orig_decompress = brotlicffi.Decompressor.decompress
    def _safe_decompress(self, data, *args, **kwargs):
        return _orig_decompress(self, data)
    brotlicffi.Decompressor.decompress = _safe_decompress
except (ImportError, AttributeError):
    pass

from src.config import get_settings


def get_llm(temperature: float | None = None) -> BaseChatModel:
    """OpenRouter, then OpenAI, then Gemini as fallbacks; only providers that have a key are built.

    Building ChatOpenAI without a key raises immediately, which used to hide the Gemini fallback.
    temperature overrides LLM_TEMPERATURE where supported. GPT-6 Luna uses the required
    default temperature and disables reasoning for short classification calls.
    """
    settings = get_settings()
    temp = settings.llm_temperature if temperature is None else temperature
    models: list[BaseChatModel] = []

    # Mô hình chính (Primary): OpenAI trực tiếp (OPENAI_API_KEY + OPENAI_MODEL)
    if settings.openai_api_key:
        is_luna = settings.openai_model.startswith("gpt-6-luna")
        models.append(
            ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_model or "gpt-4o-mini",
                temperature=1 if is_luna else temp,
                reasoning_effort="none" if is_luna else None,
                logprobs=True,
            )
        )

    # Mô hình dự phòng 1 (Fallback 1): Sử dụng OpenRouter
    if settings.openrouter_api_key:
        models.append(
            ChatOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
                model=settings.model_name or "gpt-4o-mini",
                temperature=temp,
            )
        )

    # Mô hình dự phòng 2 (Fallback 2): Sử dụng Gemini trực tiếp từ Google
    if settings.google_api_key:
        models.append(
            ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                api_key=settings.google_api_key,
                temperature=temp,
            )
        )

    if not models:
        raise RuntimeError("No LLM API key configured (set OPENROUTER_API_KEY, OPENAI_API_KEY or GOOGLE_API_KEY)")
    primary, *fallbacks = models
    return primary.with_fallbacks(fallbacks) if fallbacks else primary
