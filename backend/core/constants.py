from datetime import timedelta

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send"
]

TOKEN_EXPIRE_DAYS = 7

DEFAULT_PROVIDERS = [
    "ollama",
    "ollama_cloud",
    "openrouter",
    "opencode_zen",
    "opencode_go",
    "openai",
    "anthropic",
    "google"
]

PROVIDER_DEFAULTS = {
    "ollama": {"url": "http://localhost:11434", "api_key": ""},
    "ollama_cloud": {"url": "https://cloud.ollama.com", "api_key": ""},
    "openrouter": {"url": "https://openrouter.ai/api/v1", "api_key": ""},
    "opencode_zen": {"url": "https://opencode.ai/zen/v1", "api_key": ""},
    "opencode_go": {"url": "https://opencode.ai/zen/go/v1", "api_key": ""},
    "openai": {},
    "anthropic": {},
    "google": {}
}

PROVIDER_BASE_URLS = {
    "ollama_cloud": "https://cloud.ollama.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "opencode_zen": "https://opencode.ai/zen/v1",
    "opencode_go": "https://opencode.ai/zen/go/v1"
}

DEFAULT_MODELS = {
    "ollama": ["gemma4:e2b", "llama3.1:8b", "codellama:13b"],
    "ollama_cloud": ["llama3.1:8b"],
    "openrouter": ["meta-llama/llama-3.1-8b-instruct"],
    "opencode_zen": ["qwen3-coder-32b"],
    "opencode_go": ["qwen3-coder-32b"],
    "openai": ["gpt-4"],
    "anthropic": ["claude-3-5-sonnet-20241022"],
    "google": ["gemini-1.5-pro"]
}