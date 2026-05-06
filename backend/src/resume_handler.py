import base64
import os


def load_resume(file_path: str) -> bytes:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Resume file not found: {file_path}")

    with open(file_path, "rb") as f:
        return f.read()


def encode_resume_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")