import os
import sys
import json
import requests
from pathlib import Path
from tempfile import NamedTemporaryFile
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request, Cookie, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

import config
from src.db import get_db, init_db, User, UserSettings
from src.linkedin_fetcher import fetch_linkedin_post
from src.email_extractor import extract_email
from src.gmail_sender import send_email
from src.ai_generator import generate_email_content, parse_resume_with_llm
from src.resume_handler import load_resume, extract_text_from_pdf
from src.auth import (
    get_google_auth_url,
    exchange_code_for_tokens,
    get_google_user_info,
    create_or_update_user,
    generate_token,
    decode_token,
    get_user_by_id,
    get_user_settings,
    update_user_settings,
    get_all_provider_configs,
    get_provider_config,
    update_provider_config,
    get_all_user_models,
    update_user_models,
    merge_user_models,
    get_default_provider_and_model,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    FRONTEND_URL
)
from src.db import ProviderConfig as DBProviderConfig, ProviderModel as DBProviderModel
from src.logger import logger

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="ApplyMate API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()
    logger.info("[DB] Database initialized")


# Auth dependencies
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        token = request.cookies.get("session_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = get_user_by_id(db, payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# === AUTH ROUTES ===

@app.get("/api/auth/login")
def auth_login():
    """Get Google OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.error("[AUTH] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
        raise HTTPException(status_code=500, detail="Google OAuth not configured. Please set environment variables.")
    
    auth_url, state = get_google_auth_url()
    return {
        "authorization_url": auth_url,
        "state": state
    }


class AuthCallbackRequest(BaseModel):
    code: str
    state: str


@app.post("/api/auth/callback")
def auth_callback(request: AuthCallbackRequest, db: Session = Depends(get_db)):
    """Handle OAuth callback - exchange code for JWT."""
    try:
        # Exchange code for tokens
        token_data = exchange_code_for_tokens(request.code, request.state)
        
        # Get user info from Google
        google_user = get_google_user_info(token_data["access_token"])
        
        # Create or update user (pass refresh_token for Gmail API)
        refresh_token = token_data.get("refresh_token")
        user = create_or_update_user(db, google_user, refresh_token)
        
        # Generate JWT
        jwt_token = generate_token(user.id)
        
        logger.info(f"[AUTH] User logged in: {user.email}")
        return {
            "token": jwt_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture
            }
        }
        
    except Exception as e:
        logger.error(f"[AUTH] Callback failed: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@app.post("/api/auth/logout")
def auth_logout():
    """Logout user."""
    response = {"status": "logged_out", "message": "Logged out successfully"}
    redirect = RedirectResponse(url="/")
    redirect.delete_cookie("session_token")
    return redirect


@app.get("/api/auth/me")
def auth_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture
    }


# === SETTINGS ROUTES ===

def ensure_defaults_exist(db: Session, user_id: int):
    """Ensure default provider configs and models exist for a user."""
    configs = db.query(DBProviderConfig).filter(DBProviderConfig.user_id == user_id).all()
    
    if not configs:
        # Create provider configs
        for provider in ["ollama", "openai", "anthropic", "google"]:
            config = DBProviderConfig(
                user_id=user_id,
                provider=provider,
                enabled=provider == "ollama",
                config={"url": "http://localhost:11434", "api_key": ""} if provider == "ollama" else {}
            )
            db.add(config)
        
        # Create provider models
        for provider, models in MODELS.items():
            for i, model_name in enumerate(models):
                model = DBProviderModel(
                    user_id=user_id,
                    provider=provider,
                    model_name=model_name,
                    is_default=(provider == "ollama" and i == 0)
                )
                db.add(model)
        
        db.commit()
        logger.info(f"[SETTINGS] Created defaults for user {user_id}")


@app.get("/api/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user settings."""
    # Ensure defaults exist
    ensure_defaults_exist(db, current_user.id)
    
    settings = get_user_settings(db, current_user.id)
    if not settings:
        settings = {"selected_model": None, "selected_provider": None}
    
    provider_configs = get_all_provider_configs(db, current_user.id)
    provider_models = get_all_user_models(db, current_user.id)
    
    return {
        "providers": provider_configs,
        "models": provider_models,
        "selected_model": settings.get("selected_model"),
        "selected_provider": settings.get("selected_provider")
    }


class ProviderConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[dict] = None


class ModelUpdate(BaseModel):
    model_name: str
    is_default: bool = False


class ProviderModelsUpdate(BaseModel):
    models: list


@app.get("/api/settings/providers")
def get_all_providers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all provider configs."""
    return get_all_provider_configs(db, current_user.id)


@app.put("/api/settings/providers/{provider}")
def update_provider(
    provider: str,
    config: ProviderConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a provider config."""
    updated = update_provider_config(
        db, 
        current_user.id, 
        provider, 
        enabled=config.enabled,
        config=config.config
    )
    return {
        "provider": updated.provider,
        "enabled": updated.enabled,
        "config": updated.config
    }


@app.get("/api/settings/models")
def get_all_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all model configs."""
    return get_all_user_models(db, current_user.id)


@app.put("/api/settings/models/{provider}")
def update_models(
    provider: str,
    data: ProviderModelsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update models for a provider."""
    updated = update_user_models(db, current_user.id, provider, data.models)
    return {"provider": provider, "models": updated}


@app.put("/api/settings/selection")
def update_global_selection(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the globally selected model."""
    selected_model = data.get("model")
    selected_provider = data.get("provider")
    
    update_user_settings(db, current_user.id, {
        "selected_model": selected_model,
        "selected_provider": selected_provider
    })
    
    return {"selected_model": selected_model, "selected_provider": selected_provider}


@app.post("/api/settings/models/fetch-ollama-cloud")
def fetch_ollama_cloud_models(
    api_key: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch available models from Ollama Cloud API and save to database."""
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(
            "https://cloud.ollama.com/api/tags",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            fetched_models = [model.get("name", "") for model in data.get("models", []) if model.get("name")]
            
            all_models = merge_user_models(db, current_user.id, "ollama_cloud", fetched_models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch models: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[API] Failed to fetch Ollama Cloud models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")


@app.get("/api/settings/models/fetch-ollama")
def fetch_local_ollama_models(
    url: str = Query(default="http://localhost:11434"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch available models from local Ollama instance and save to database."""
    try:
        health_check = requests.get(f"{url}/api/tags", timeout=5)
        if health_check.status_code != 200:
            raise HTTPException(status_code=503, detail="Ollama is not responding")
        
        response = requests.get(f"{url}/api/tags", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            fetched_models = [model.get("name", "") for model in data.get("models", []) if model.get("name")]
            
            all_models = merge_user_models(db, current_user.id, "ollama", fetched_models)
            return {"models": all_models}
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch models")
    except requests.RequestException as e:
        logger.error(f"[API] Failed to fetch local Ollama models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Ollama: {str(e)}")


@app.post("/api/settings/models/fetch-openrouter")
def fetch_openrouter_models(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch available models from OpenRouter API."""
    api_key = data.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            models = [model.get("id", "") for model in data.get("data", []) if model.get("id")]
            
            all_models = merge_user_models(db, current_user.id, "openrouter", models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch models: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[API] Failed to fetch OpenRouter models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")


@app.post("/api/settings/models/fetch-opencode")
def fetch_opencode_models(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch available models from OpenCode Zen or Go API."""
    provider_type = data.get("provider")  # "zen" or "go"
    api_key = data.get("api_key")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    if provider_type not in ["zen", "go"]:
        raise HTTPException(status_code=400, detail="Provider must be 'zen' or 'go'")
    
    base_url = f"https://opencode.ai/zen/{provider_type}/v1" if provider_type == "zen" else "https://opencode.ai/zen/go/v1"
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(
            f"{base_url}/models",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            models = [model.get("id", "") for model in data.get("data", []) if model.get("id")]
            
            db_provider = f"opencode_{provider_type}"
            all_models = merge_user_models(db, current_user.id, db_provider, models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch models: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[API] Failed to fetch OpenCode models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")


# === APPLICATION ROUTES ===

class ApplyRequest(BaseModel):
    linkedin_url: str
    resume_path: str = "./resume.pdf"
    to_email: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None


class ApplyResponse(BaseModel):
    title: str
    company: str
    location: str
    description: str
    email: str
    subject: str
    body: str
    status: str
    total_experience_years: str = None


class SendRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    resume_path: str = "./resume.pdf"


@app.get("/")
def root():
    return {"status": "ok", "message": "ApplyMate API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a resume PDF file."""
    logger.info(f"[API] Uploading resume: {file.filename}")
    
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"resume_{current_user.id}_{timestamp}.pdf"
        filepath = UPLOAD_DIR / filename
        
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Update user settings with resume path
        update_user_settings(db, current_user.id, {"resume_path": str(filepath)})
        
        logger.info(f"[API] Resume saved: {filepath}")
        
        return {
            "status": "uploaded",
            "path": str(filepath),
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"[API] Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/apply", response_model=ApplyResponse)
def apply_to_job(
    request: ApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process LinkedIn URL and generate email content."""
    logger.info(f"[API] Applying to job: {request.linkedin_url}")

    # Get default provider and model from settings
    provider, model = get_default_provider_and_model(db, current_user.id)
    
    if not provider or not model:
        raise HTTPException(status_code=400, detail="Please configure AI provider and model in Settings first.")
    
    # Get provider config for API key
    provider_config = get_provider_config(db, current_user.id, provider)
    api_key = provider_config.get("config", {}).get("api_key", "") if provider_config else ""
    base_url = provider_config.get("config", {}).get("url", "") if provider_config else ""
    
    logger.info(f"[API] Using provider: {provider}, model: {model}")

    try:
        # Fetch LinkedIn post
        post_data = fetch_linkedin_post(request.linkedin_url)

        title = post_data.get("title") or "Job Position"
        company = post_data.get("company") or "Company"
        location = post_data.get("location") or ""
        description = post_data.get("description") or ""

        # Parse resume with user's LLM (if provided)
        resume_parsed = None
        candidate_name = config.GMAIL_SENDER_NAME
        if request.resume_path:
            try:
                resume_text = extract_text_from_pdf(request.resume_path)
                resume_parsed = parse_resume_with_llm(
                    resume_text,
                    provider=provider,
                    model=model,
                    api_key=api_key
                )
                candidate_name = resume_parsed.get('name', config.GMAIL_SENDER_NAME)
                logger.info(f"[API] Resume parsed: {resume_parsed.get('name')}, {resume_parsed.get('total_experience_years')} years exp")
            except Exception as e:
                logger.warning(f"[API] Resume parsing failed: {e}, using fallback")
                resume_parsed = None

        # Generate email content (subject, body, extract email) in single AI call
        try:
            email_content = generate_email_content(
                post_data,
                resume_data=resume_parsed,
                candidate_name=candidate_name,
                provider=provider,
                model=model,
                api_key=api_key
            )
            subject = email_content.get('subject', f"Application for {title}")
            body = email_content.get('body', '')
            extracted_email = email_content.get('email')  # Email extracted by AI from job post
            
            # Get total experience from parsed resume (fallback to "0" if not available)
            total_exp = resume_parsed.get('total_experience_years', '0') if resume_parsed else "0"
            
            # Use extracted email from AI, or fallback to request.to_email or regex
            email = extracted_email or request.to_email
            if not email:
                text_to_search = f"{title} {company} {description}"
                email = extract_email(text_to_search) or ""
                
        except Exception as e:
            logger.error(f"AI email content generation failed: {e}")
            
            # Fallback: extract email with regex
            email = request.to_email
            if not email:
                text_to_search = f"{title} {company} {description}"
                email = extract_email(text_to_search) or ""
            
            # Fallback subject
            clean_title = title
            if '#' in title:
                clean_title = re.sub(r'#.*?:\s*', '', title).strip()
            if not clean_title:
                clean_title = "Software Engineer"
            subject = f"Application for {clean_title}"
            
            # Fallback body
            body = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {clean_title} position at {company}{f' in {location}' if location else ''}. With a solid background in software development and a passion for building efficient, scalable solutions, I am excited about the opportunity to contribute to your team.

Throughout my career, I have developed expertise in designing and implementing robust backend systems. My experience spans working with modern programming languages, cloud platforms, and distributed architectures. I have consistently delivered high-quality code that meets both functional requirements and industry best practices.

What draws me to {company} is your commitment to innovation and your focus on creating meaningful solutions. I am particularly impressed by your company's approach to technology initiatives and your dedication to excellence. I believe my technical skills align well with your needs and would enable me to make immediate contributions to your projects.

I am eager to discuss how my background and skills would benefit your team. I am available for a conversation at your convenience and look forward to learning more about this opportunity.

Thank you for considering my application. I hope to hear from you soon.

Best regards,
{candidate_name}"""
            
            # Fallback: use total experience from resume (fallback to "0")
            total_exp = resume_parsed.get('total_experience_years', '0') if resume_parsed else "0"

        if not email:
            raise HTTPException(status_code=400, detail="No email found in LinkedIn post and no --to provided")

        logger.info(f"[API] Generated email - Subject: {subject[:50]}...")

        return ApplyResponse(
            title=title,
            company=company,
            location=location,
            description=description[:500],
            email=email,
            subject=subject,
            body=body,
            status="generated",
            total_experience_years=total_exp
        )

    except Exception as e:
        logger.error(f"[API] Apply failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/send")
def send_job_email(
    request: SendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send the generated email using user's Gmail account."""
    logger.info(f"[API] Sending email to: {request.to_email}")
    
    if not current_user.refresh_token:
        logger.error(f"[API] No refresh token for user {current_user.id}")
        raise HTTPException(
            status_code=401,
            detail="Gmail not connected. Please log in again to authorize email sending."
        )
    
    try:
        result = send_email(
            refresh_token=current_user.refresh_token,
            from_email=current_user.email,
            to_email=request.to_email,
            subject=request.subject,
            body=request.body,
            resume_path=request.resume_path
        )
        logger.info(f"[API] Email sent successfully to {request.to_email}")
        return result
    except Exception as e:
        logger.error(f"[API] Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)