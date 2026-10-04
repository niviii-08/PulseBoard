"""
Outbound email transport.

Two backends, selected automatically by whether SMTP is configured
(settings.SMTP_HOST):

  - "smtp": a real send via smtplib, with STARTTLS and optional auth.
  - "console" (the default in this build): logs the fully-rendered
    email at INFO level instead of sending it. This project has no
    SMTP/ESP account wired up -- the same honestly-documented gap
    app/services/status_public_service.py's subscribe() already calls
    out for the confirmation-email flow. The notification pipeline
    (subscriber targeting, retry, per-recipient failure handling) is
    still fully exercised end-to-end with this backend; only the actual
    wire send is stubbed. Setting SMTP_HOST (and friends) in the
    environment is the only change needed to start sending real mail --
    nothing else in the pipeline changes.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("pulseboard.email")


class EmailSendError(Exception):
    """Raised on any transport-level failure. Callers decide whether to retry."""


def send_email(*, to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    if not settings.SMTP_HOST:
        logger.info("[console-email] To: %s | Subject: %s\n%s", to, subject, text_body)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = (
        f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        if settings.EMAIL_FROM_NAME
        else settings.EMAIL_FROM
    )
    message["To"] = to
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS
        ) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        raise EmailSendError(f"{type(exc).__name__}: {exc}") from exc
