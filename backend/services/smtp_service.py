import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os

logger = logging.getLogger("job-applier")


class SmtpEmailService:
    def __init__(self, config: dict):
        self.host = config["host"]
        self.port = config["port"]
        self.username = config["username"]
        self.password = config["password"]
        self.from_email = config.get("from_email", config["username"])
        self.use_tls = config.get("use_tls", True)

    def _create_message(self, to: str, subject: str, body: str, resume_path: str = None) -> MIMEMultipart:
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
                logger.info(f"[SMTP] Attached resume: {resume_path}")
            except Exception as e:
                logger.warning(f"[SMTP] Failed to attach resume: {e}")

        return message

    def send(self, to_email: str, subject: str, body: str, resume_path: str = None) -> dict:
        try:
            logger.info(f"[SMTP] Sending from {self.from_email} to {to_email}")

            message = self._create_message(to_email, subject, body, resume_path)

            with smtplib.SMTP(self.host, self.port, timeout=30) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.from_email, to_email, message.as_string())

            logger.info(f"[SMTP] Email sent successfully")
            return {
                "status": "sent",
                "from": self.from_email,
                "to": to_email
            }

        except Exception as e:
            logger.error(f"[SMTP] Failed to send: {e}")
            raise

    def validate(self) -> dict:
        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
            return {"status": "valid", "email": self.from_email}
        except Exception as e:
            logger.error(f"[SMTP] Validation failed: {e}")
            raise ValueError(f"SMTP authentication failed: {str(e)}")