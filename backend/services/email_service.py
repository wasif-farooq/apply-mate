import logging
import base64
import os
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv()

logger = logging.getLogger("job-applier")


class EmailService:
    def __init__(self, refresh_token: str, from_email: str):
        self.refresh_token = refresh_token
        self.from_email = from_email

    def _get_gmail_service(self):
        credentials = Credentials(
            token=None,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/gmail.send"]
        )
        return build('gmail', 'v1', credentials=credentials, cache_discovery=False)

    def _create_message(self, to: str, subject: str, body: str, resume_path: str = None) -> dict:
        message = MIMEMultipart()
        message['To'] = to
        message['From'] = self.from_email
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
                logger.info(f"[Email] Attached resume: {resume_path}")
            except Exception as e:
                logger.warning(f"[Email] Failed to attach resume: {e}")

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return {'raw': raw_message}

    def send(self, to_email: str, subject: str, body: str, resume_path: str = None) -> dict:
        try:
            logger.info(f"[Email] Sending from {self.from_email} to {to_email}")

            service = self._get_gmail_service()
            message = self._create_message(to_email, subject, body, resume_path)

            result = service.users().messages().send(
                userId='me',
                body=message
            ).execute()

            logger.info(f"[Email] Sent successfully. Message ID: {result.get('id')}")
            return {
                "status": "sent",
                "message_id": result.get('id'),
                "from": self.from_email,
                "to": to_email
            }

        except Exception as e:
            logger.error(f"[Email] Failed to send: {e}")
            raise

    def validate(self) -> dict:
        try:
            service = self._get_gmail_service()
            service.users().getProfile(userId='me').execute()
            return {"status": "valid", "email": self.from_email}
        except Exception as e:
            logger.error(f"[Email] Validation failed: {e}")
            raise ValueError(f"Gmail authentication failed: {str(e)}")