import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)

async def send_email(to_email, subject, body, html_body=None):
    """
    Send an email asynchronously
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text email body
        html_body: Optional HTML body
    """
    try:
        message = MIMEMultipart("alternative")
        message["From"] = settings.EMAIL_FROM
        message["To"] = to_email
        message["Subject"] = subject
        
        # Add plain text part
        message.attach(MIMEText(body, "plain"))
        
        # Add HTML part if provided
        if html_body:
            message.attach(MIMEText(html_body, "html"))
        
        # Send the email
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_TLS
        )
        
        return True
    except Exception as e:
        logger.error(f"Email sending failed to {to_email}: {str(e)}")
        return False