"""Async email utility for transactional emails (password reset, etc.)."""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via SMTP. Returns True on success."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[EMAIL] SMTP not configured — skipping email to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("[EMAIL] Sent '%s' to %s", subject, to_email)
        return True
    except Exception as e:
        logger.error("[EMAIL] Failed to send to %s: %s", to_email, e)
        return False


async def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send a password-reset email with a clickable link."""
    subject = "Reset your SkillBridge password"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #111; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
            We received a request to reset your SkillBridge account password.
            Click the button below to choose a new password. This link expires in <strong>30 minutes</strong>.
        </p>
        <a href="{reset_url}"
           style="display: inline-block; margin: 24px 0; padding: 12px 28px;
                  background-color: #111; color: #fff; text-decoration: none;
                  border-radius: 8px; font-size: 14px; font-weight: 600;">
            Reset Password
        </a>
        <p style="color: #888; font-size: 12px; line-height: 1.5;">
            If you didn&rsquo;t request this, you can safely ignore this email.
            Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 11px;">SkillBridge &mdash; Learn, Grow, Get Hired</p>
    </div>
    """
    return await send_email(to_email, subject, html)
