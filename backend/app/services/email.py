"""Email service using Gmail SMTP."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

def _get_smtp_settings() -> tuple[str, str] | None:
    """Return SMTP credentials if present."""
    settings = get_settings()
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning("SMTP_USERNAME or SMTP_PASSWORD is not set. Emails will not be sent.")
        return None
    return settings.smtp_username, settings.smtp_password

async def send_password_reset_otp(email: str, otp_code: str) -> dict[str, Any] | None:
    """Send a password reset OTP email using Gmail SMTP."""
    settings = get_settings()
    
    if settings.environment != "production":
        logger.info(f"🔑 [DEV/TEST] OTP for {email} is: {otp_code}")

    creds = _get_smtp_settings()
    if not creds:
        return None

    username, password = creds
    subject = f"Your {settings.app_name} Password Reset Code"
    
    from_email = settings.smtp_from_email or username
    
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.app_name} <{from_email}>"
    msg["To"] = email

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>You requested a password reset for your {settings.app_name} account.</p>
          <p>Here is your 6-digit verification code:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">{otp_code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
      </body>
    </html>
    """
    msg.set_content(f"Your OTP code is {otp_code}")
    msg.add_alternative(html_content, subtype="html")

    try:
        # Send synchronously, but fast enough for BackgroundTasks with a strict timeout
        with smtplib.SMTP(settings.smtp_server, settings.smtp_port, timeout=5) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            
        logger.info(f"Password reset email sent to {email} via {settings.smtp_server}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return None

async def send_password_changed_success(email: str) -> dict[str, Any] | None:
    """Send a success notification that the password was changed using Gmail SMTP."""
    settings = get_settings()

    creds = _get_smtp_settings()
    if not creds:
        logger.info(f"[DEV] Password changed success email for {email}")
        return None

    username, password = creds
    subject = f"Your {settings.app_name} Password Has Been Changed"
    
    from_email = settings.smtp_from_email or username
    
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.app_name} <{from_email}>"
    msg["To"] = email

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Password Successfully Changed</h2>
          <p>The password for your {settings.app_name} account has been updated successfully.</p>
          <p>If you did not make this change, please contact support immediately.</p>
      </body>
    </html>
    """
    msg.set_content("Your password has been changed successfully.")
    msg.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_server, settings.smtp_port, timeout=5) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to send success email to {email}: {str(e)}")
        return None
