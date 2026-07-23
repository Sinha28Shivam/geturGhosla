from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USERNAME,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.SMTP_USERNAME,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=settings.SMTP_TLS,
    MAIL_SSL_TLS=settings.SMTP_SSL,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_otp_email(email_to: str, otp_code: str):
    """
    Sends an OTP code via email.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Your Room Discovery OTP</h2>
        <p>Please use the following OTP to log in to your account. This code will expire soon.</p>
        <h3 style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">{otp_code}</h3>
        <p>If you did not request this code, please ignore this email.</p>
    </div>
    """
    
    message = MessageSchema(
        subject="Your Login OTP",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )
    
    # If the username/password are not set in .env yet, we skip sending to prevent a crash
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD or settings.SMTP_USERNAME == "your_gmail_address@gmail.com":
        print(f"--- MOCK EMAIL SENDER ---")
        print(f"To: {email_to}")
        print(f"Your OTP is: {otp_code}")
        print(f"-------------------------")
        print("WARNING: SMTP credentials not set in .env. Mock email sent instead.")
        return
        
    try:
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        print(f"WARNING: Email delivery failed or timed out: {e}")
        print(f"--- FALLBACK MOCK EMAIL SENDER ---")
        print(f"To: {email_to}")
        print(f"Your OTP is: {otp_code}")
        print(f"---------------------------------")
