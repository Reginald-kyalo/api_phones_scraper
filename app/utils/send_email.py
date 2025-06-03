import logging
import asyncio
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.config import settings

logger = logging.getLogger(__name__)

async def send_email(to_email, subject, body, html_body=None):
    """
    Send an email asynchronously using Brevo API
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text email body
        html_body: Optional HTML body
    """
    try:
        # Configure API key
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = settings.BREVO_API_KEY
        
        # Create API instance
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        # Create the email data
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM},
            subject=subject,
            text_content=body,
            html_content=html_body if html_body else body
        )
        
        # Send email in a thread to avoid blocking
        def send_email_sync():
            return api_instance.send_transac_email(send_smtp_email)
        
        # Run in thread pool to make it async
        loop = asyncio.get_event_loop()
        api_response = await loop.run_in_executor(None, send_email_sync)
        
        logger.info(f"Email sent successfully to {to_email}. Message ID: {api_response.message_id}")
        return True
        
    except ApiException as e:
        logger.error(f"Brevo API error sending email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Email sending failed to {to_email}: {str(e)}")
        return False

if __name__ == "__main__":
    # Example usage
    import asyncio
    async def main():
        success = await send_email(
            to_email="reginald.kyalo@gmail.com",
            subject="Test Email via Brevo API",
            body="This is a test email sent via Brevo API.",
            html_body="<h1>This is a test email</h1><p>Sent via Brevo API with HTML content!</p>"
        )
        if success:
            print("Email sent successfully!")
        else:
            print("Failed to send email.")
    
    asyncio.run(main())