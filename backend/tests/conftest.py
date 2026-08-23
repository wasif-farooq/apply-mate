import os
import sys
from pathlib import Path

# Settings validate at import time, so the environment has to be sane before
# anything under backend/ is imported.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("JWT_SECRET", "test-secret-not-used-for-real-tokens")
os.environ.setdefault("DASHSCOPE_API_KEY", "sk-test")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
