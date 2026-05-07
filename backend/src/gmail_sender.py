import base64
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from .logger import logger


def get_gmail_service(refresh_token: str):
    """Build Gmail service using refresh token."""
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/gmail.send"]
    )
    
    service = build('gmail', 'v1', credentials=credentials, cache_discovery=False)
    return service


def create_message(sender: str, to: str, subject: str, body: str, resume_path: str = None) -> dict:
    """Create email message with optional attachment."""
    message = MIMEMultipart()
    message['To'] = to
    message['From'] = sender
    message['Subject'] = subject
    
    message.attach(MIMEText(body, 'html'))
    
    if resume_path and os.path.exists(resume_path):
        try:
            part = MIMEBase('application', 'octet-stream')
            with open(resume_path, 'rb') as f:
                part.set_payload(f.read())
            encoders.encode_base64(part)
            filename = os.path.basename(resume_path) or "resume.pdf"
            part.add_header('Content-Disposition', f'attachment; filename= {filename}')
            message.attach(part)
            logger.info(f"[GMAIL] Attached resume: {resume_path}")
        except Exception as e:
            logger.warning(f"[GMAIL] Failed to attach resume: {e}")
    
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
    return {'raw': raw_message}


def send_email(refresh_token: str, from_email: str, to_email: str, subject: str, body: str, resume_path: str = None) -> dict:
    """Send email via Gmail API using user's OAuth credentials."""
    try:
        logger.info(f"[GMAIL] Sending email from {from_email} to {to_email}")
        
        service = get_gmail_service(refresh_token)
        
        message = create_message(from_email, to_email, subject, body, resume_path)
        
        result = service.users().messages().send(
            userId='me',
            body=message
        ).execute()
        
        logger.info(f"[GMAIL] Email sent successfully. Message ID: {result.get('id')}")
        return {
            "status": "sent",
            "message_id": result.get('id'),
            "from": from_email,
            "to": to_email
        }
        
    except Exception as e:
        logger.error(f"[GMAIL] Failed to send email: {e}")
        raise


def authenticate_gmail(refresh_token: str):
    """Validate that refresh token can create a valid Gmail service."""
    try:
        service = get_gmail_service(refresh_token)
        # Test with a simple API call
        service.users().getProfile(userId='me').execute()
        return {"status": "valid", "email": "authenticated"}
    except Exception as e:
        logger.error(f"[GMAIL] Authentication failed: {e}")
        raise ValueError(f"Gmail authentication failed: {str(e)}")