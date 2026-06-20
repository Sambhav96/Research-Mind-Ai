"""Email service using Brevo HTTP API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

def _get_api_key() -> str | None:
    """Return Brevo API key (which is stored in SMTP_PASSWORD)."""
    settings = get_settings()
    if not settings.smtp_password:
        logger.warning("SMTP_PASSWORD (Brevo API Key) is not set. Emails will not be sent.")
        return None
    return settings.smtp_password

async def send_password_reset_otp(email: str, otp_code: str) -> dict[str, Any] | None:
    """Send a password reset OTP email using Brevo HTTP API."""
    settings = get_settings()
    
    if settings.environment != "production":
        logger.info(f"🔑 [DEV/TEST] OTP for {email} is: {otp_code}")

    api_key = _get_api_key()
    if not api_key:
        return None

    # Use the configured from email, fallback to a default if missing
    from_email = settings.smtp_from_email or "noreply@researchmindai.com"
    subject = f"Your {settings.app_name} Password Reset Code"

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

    payload = {
        "sender": {"name": settings.app_name, "email": from_email},
        "to": [{"email": email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": f"Your OTP code is {otp_code}"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers={
                    "api-key": api_key,
                    "accept": "application/json",
                    "content-type": "application/json"
                }
            )
            response.raise_for_status()
            
        logger.info(f"Password reset email successfully sent to {email} via Brevo API")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to send email to {email} via Brevo API: {str(e)}")
        if isinstance(e, httpx.HTTPStatusError):
            logger.error(f"Brevo API Error Response: {e.response.text}")
        return None

async def send_password_changed_success(email: str) -> dict[str, Any] | None:
    """Send a success notification that the password was changed using Brevo HTTP API."""
    settings = get_settings()

    api_key = _get_api_key()
    if not api_key:
        logger.info(f"[DEV] Password changed success email for {email}")
        return None

    from_email = settings.smtp_from_email or "noreply@researchmindai.com"
    subject = f"Your {settings.app_name} Password Has Been Changed"

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Password Successfully Changed</h2>
          <p>The password for your {settings.app_name} account has been updated successfully.</p>
          <p>If you did not make this change, please contact support immediately.</p>
      </body>
    </html>
    """

    payload = {
        "sender": {"name": settings.app_name, "email": from_email},
        "to": [{"email": email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": "Your password has been changed successfully."
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers={
                    "api-key": api_key,
                    "accept": "application/json",
                    "content-type": "application/json"
                }
            )
            response.raise_for_status()
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to send success email to {email} via Brevo API: {str(e)}")
        if isinstance(e, httpx.HTTPStatusError):
            logger.error(f"Brevo API Error Response: {e.response.text}")
        return None
