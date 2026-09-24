from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models.chat_models import BaseChatModel

from src.config import get_settings


def get_llm() -> BaseChatModel:
    settings = get_settings()
    
    # Mô hình chính (Primary): Sử dụng OpenRouter
    primary_llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
        model=settings.model_name,
        temperature=settings.llm_temperature,
    )
    
    # Mô hình dự phòng (Fallback): Sử dụng Gemini 3.5 Flash Lite trực tiếp từ Google
    fallback_llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        api_key=settings.google_api_key,
    )
    
    # Trả về mô hình có tích hợp cơ chế tự động fallback
    return primary_llm.with_fallbacks([fallback_llm])
