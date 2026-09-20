import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import resend

from app.services.http_client import request_sync

logger = logging.getLogger("visualmemory.email")

# Configurações do Brevo HTTP API
brevo_api_key = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "visualmemorylog@gmail.com"))

# Configurações do Resend
resend.api_key = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "VisualMemory <onboarding@resend.dev>")


def _send_email(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: str,
    debug_code: str = None,
    email_type: str = "verificação",
):
    if os.getenv("ENVIRONMENT", "development") in ("development", "testing") and not os.getenv(
        "RENDER"
    ):
        logger.info(f"[MOCK EMAIL] Simulação de Envio de E-mail ({email_type})")
        return

    # 1. Tentar por Brevo HTTP API (Funciona no Render e não exige domínio)
    if brevo_api_key:
        try:
            response = request_sync(
                "POST",
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {"name": "VisualMemory", "email": BREVO_SENDER_EMAIL},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content,
                },
                timeout=10,
            )
            if response.status_code in (200, 201, 202):
                logger.info(f"[BREVO SUCCESS] E-mail de {email_type} enviado para {to_email}")
                return
            else:
                logger.error("[BREVO ERROR] Falha no envio. Status: %s", response.status_code)
        except Exception as e:
            logger.error(f"Erro ao enviar via Brevo API para {to_email}: {e}")

    # 2. Tentar por Resend
    if resend.api_key:
        try:
            params: resend.Emails.SendParams = {
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": subject,
                "text": text_content,
                "html": html_content,
            }
            response = resend.Emails.send(params)
            logger.info(
                f"[RESEND SUCCESS] E-mail de {email_type} enviado para {to_email}. "
                f"ID: {response.get('id')}"
            )
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via Resend para {to_email}: {e}")

    # 3. Tentar por SMTP clássico
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            smtp_port_int = int(smtp_port)
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = os.getenv("SMTP_FROM", smtp_user)
            message["To"] = to_email

            part1 = MIMEText(text_content, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            message.attach(part1)
            message.attach(part2)

            if smtp_port_int == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port_int) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, message.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port_int) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, message.as_string())

            logger.info(f"[SMTP SUCCESS] E-mail de {email_type} enviado para {to_email}")
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via SMTP para {to_email}: {e}")

    # 4. Fallback (Modo Simulado / Mock)
    if debug_code:
        logger.warning(
            "Nenhum provedor de e-mail configurado; e-mail de %s não foi enviado.", email_type
        )


def send_verification_email(email: str, code: str):
    """Envia um e-mail contendo o código de verificação para o usuário."""
    text = f"Seu código de verificação para o VisualMemory é: {code}. Ele expira em 10 minutos."
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">Bem-vindo ao VisualMemory!</h2>
        <p>Use o código de verificação abaixo para confirmar seu cadastro:</p>
        <div style="font-size: 24px; font-weight: bold; padding: 15px 25px;
        background-color: #f3f4f6; display: inline-block; border-radius: 8px;
        letter-spacing: 4px; color: #111827; margin: 15px 0;">
          {code}
        </div>
        <p style="font-size: 14px; color: #6b7280;">Este código expira em 10 minutos.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">Se você não solicitou
        este código, por favor ignore este e-mail.</p>
      </body>
    </html>
    """
    _send_email(email, "Código de Verificação - VisualMemory", text, html, code, "verificação")


def send_password_reset_email(email: str, code: str):
    """Envia um e-mail contendo o código de redefinição de senha para o usuário."""
    text = (
        f"Seu código de redefinição de senha para o VisualMemory é: {code}. "
        "Ele expira em 10 minutos."
    )
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #ef4444;">Recuperação de Senha - VisualMemory</h2>
        <p>Você solicitou a redefinição de sua senha. Use o código abaixo para confirmar a
        alteração:</p>
        <div style="font-size: 24px; font-weight: bold; padding: 15px 25px;
        background-color: #fef2f2; display: inline-block; border-radius: 8px;
        letter-spacing: 4px; color: #991b1b; margin: 15px 0;">
          {code}
        </div>
        <p style="font-size: 14px; color: #6b7280;">Este código expira em 10 minutos.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">Se você não solicitou
        esta redefinição, por favor ignore este e-mail.</p>
      </body>
    </html>
    """
    _send_email(
        email, "Recuperação de Senha - VisualMemory", text, html, code, "redefinição de senha"
    )


def send_feedback_email(sender_email: str, sender_username: str, title: str, description: str):
    """Envia um e-mail contendo o feedback do usuário para o e-mail configurado."""
    receiver = os.getenv("SMTP_USER")
    subject = f"[VisualMemory Feedback] {title}"
    text = (
        f"Feedback enviado por {sender_username} ({sender_email}):\n\n"
        f"Título: {title}\n\n"
        f"Descrição:\n{description}"
    )
    div_style = (
        "background-color: #f9fafb; padding: 15px; border-radius: 8px; "
        "border: 1px solid #e5e7eb; white-space: pre-wrap;"
    )
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">Novo Feedback Recebido</h2>
        <p><strong>Usuário:</strong> {sender_username} ({sender_email})</p>
        <p><strong>Título:</strong> {title}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p><strong>Descrição:</strong></p>
        <div style="{div_style}">
          {description}
        </div>
      </body>
    </html>
    """
    _send_email(receiver, subject, text, html, None, "feedback")
