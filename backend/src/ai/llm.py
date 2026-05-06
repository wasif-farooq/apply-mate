from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOllama
import config
from src.logger import logger


class LLMProvider:
    """Unified LLM provider using LangChain."""

    _instance = None

    @classmethod
    def get_llm(cls, provider: str = None, model: str = None, api_key: str = None):
        """Get the configured LLM instance.
        
        Args:
            provider: Override provider (ollama, openai, anthropic, google)
            model: Override model name
            api_key: Override API key
        """
        provider = (provider or config.AI_PROVIDER).lower()

        logger.info(f"[LLM] Initializing provider: {provider}")

        if provider == "openai":
            key = api_key or config.OPENAI_API_KEY
            if not key:
                raise ValueError("OPENAI_API_KEY not configured")
            return ChatOpenAI(
                model=model or config.OPENAI_MODEL,
                api_key=key,
                temperature=0.7,
            )

        elif provider == "anthropic":
            key = api_key or config.ANTHROPIC_API_KEY
            if not key:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            return ChatAnthropic(
                model=model or config.ANTHROPIC_MODEL,
                api_key=key,
                temperature=0.7,
            )

        elif provider == "google":
            key = api_key or config.GOOGLE_API_KEY
            if not key:
                raise ValueError("GOOGLE_API_KEY not configured")
            return ChatGoogleGenerativeAI(
                model=model or config.GOOGLE_MODEL,
                google_api_key=key,
                temperature=0.7,
            )

        elif provider == "ollama":
            return ChatOllama(
                model=model or config.OLLAMA_MODEL,
                base_url=config.OLLAMA_BASE_URL,
                temperature=0.7,
            )

        else:
            raise ValueError(f"Unknown AI provider: {provider}. Use: ollama, openai, anthropic, google")

    @classmethod
    def generate(cls, prompt: str, system_prompt: str = None, provider: str = None, model: str = None, api_key: str = None) -> str:
        """Generate text using the configured LLM.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            provider: Override provider
            model: Override model
            api_key: Override API key
        """
        llm = cls.get_llm(provider, model, api_key)

        if system_prompt:
            messages = [
                ("system", system_prompt),
                ("human", prompt)
            ]
        else:
            messages = [("human", prompt)]

        try:
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"[LLM] Generation failed: {e}")
            raise

    @classmethod
    def get_provider_info(cls) -> dict:
        """Get information about the current provider."""
        provider = config.AI_PROVIDER.lower()

        info = {
            "provider": provider,
            "model": "",
            "status": "configured"
        }

        if provider == "openai":
            info["model"] = config.OPENAI_MODEL
            if not config.OPENAI_API_KEY:
                info["status"] = "not_configured"

        elif provider == "anthropic":
            info["model"] = config.ANTHROPIC_MODEL
            if not config.ANTHROPIC_API_KEY:
                info["status"] = "not_configured"

        elif provider == "google":
            info["model"] = config.GOOGLE_MODEL
            if not config.GOOGLE_API_KEY:
                info["status"] = "not_configured"

        elif provider == "ollama":
            info["model"] = config.OLLAMA_MODEL
            info["status"] = "ready"
            try:
                from langchain_community.chat_models import ChatOllama
                test_llm = ChatOllama(model=config.OLLAMA_MODEL, base_url=config.OLLAMA_BASE_URL)
                test_llm.invoke("test")
            except Exception:
                info["status"] = "not_running"

        return info


def generate_with_llm(prompt: str, system_prompt: str = None) -> str:
    """Convenience function to generate text."""
    return LLMProvider.generate(prompt, system_prompt)