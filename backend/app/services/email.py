from email.message import EmailMessage
import smtplib

from app.core.config import settings
from app.schemas.feedback import FeedbackCreate


class EmailNotConfiguredError(RuntimeError):
    pass


def send_feedback_email(payload: FeedbackCreate) -> None:
    if not settings.smtp_host:
        raise EmailNotConfiguredError("SMTP host is not configured")

    from_email = settings.smtp_from_email or settings.smtp_username
    if not from_email:
        raise EmailNotConfiguredError("SMTP sender is not configured")

    message_text = payload.message.strip() if payload.message else "Без текста"
    email = EmailMessage()
    email["Subject"] = f"Заявка с сайта Dimika от {payload.name}"
    email["From"] = from_email
    email["To"] = settings.feedback_to_email
    email["Reply-To"] = payload.email
    email.set_content(
        "\n".join(
            [
                "Новая заявка с формы обратной связи.",
                "",
                f"Имя: {payload.name}",
                f"E-mail: {payload.email}",
                "",
                "Сообщение:",
                message_text,
            ]
        )
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(email)
