from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from src.config import get_settings


def get_llm(temperature: float | None = None) -> BaseChatModel:
    """OpenRouter, then OpenAI, then Gemini as fallbacks; only providers that have a key are built.

    Building ChatOpenAI without a key raises immediately, which used to hide the Gemini fallback.
    temperature overrides LLM_TEMPERATURE (classification passes 0 so the same column always gets the same label).
    """
    settings = get_settings()
    temp = settings.llm_temperature if temperature is None else temperature
    models: list[BaseChatModel] = []

    # Mô hình chính (Primary): Sử dụng OpenRouter
    if settings.openrouter_api_key:
        models.append(
            ChatOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
                model=settings.model_name,
                temperature=temp,
            )
        )

    # OpenAI trực tiếp (OPENAI_API_KEY + OPENAI_MODEL)
    if settings.openai_api_key:
        models.append(
            ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_model,
                temperature=temp,
            )
        )

    # Mô hình dự phòng (Fallback): Sử dụng Gemini 3.5 Flash Lite trực tiếp từ Google
    if settings.google_api_key:
        models.append(
            ChatGoogleGenerativeAI(
                model="gemini-3.5-flash-lite",
                api_key=settings.google_api_key,
                temperature=temp,
            )
        )

    if not models:
        raise RuntimeError("No LLM API key configured (set OPENROUTER_API_KEY, OPENAI_API_KEY or GOOGLE_API_KEY)")
    primary, *fallbacks = models
    return primary.with_fallbacks(fallbacks) if fallbacks else primary
