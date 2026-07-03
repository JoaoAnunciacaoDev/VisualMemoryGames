import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import resend

logger = logging.getLogger("visualmemory.email")

# Configurações do Resend
resend.api_key = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "VisualMemory <onboarding@resend.dev>")


def send_verification_email(email: str, code: str):
    """Envia um e-mail contendo o código de verificação para o usuário.

    Decide o método de envio automaticamente com base nas variáveis disponíveis:
    1. Se RESEND_API_KEY estiver configurado, usa a API do Resend.
    2. Caso contrário, se SMTP_HOST estiver configurado, usa o envio SMTP clássico (ex: Gmail).
    3. Se nenhum estiver configurado, apenas registra o código em modo simulação (Mock).
    """
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

    # 1. Tentar por Resend
    if resend.api_key:
        try:
            params: resend.Emails.SendParams = {
                "from": RESEND_FROM,
                "to": [email],
                "subject": "Código de Verificação - VisualMemory",
                "text": text,
                "html": html,
            }
            response = resend.Emails.send(params)
            logger.info(
                f"[RESEND SUCCESS] E-mail de verificação enviado para {email}. "
                f"ID: {response.get('id')}"
            )
            print(f"[RESEND SUCCESS] E-mail de verificação enviado para {email}")
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via Resend para {email}: {e}")
            print(f"[RESEND ERROR] Erro ao enviar: {e}")

    # 2. Tentar por SMTP (Gmail)
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            smtp_port_int = int(smtp_port)
            message = MIMEMultipart("alternative")
            message["Subject"] = "Código de Verificação - VisualMemory"
            message["From"] = os.getenv("SMTP_FROM", smtp_user)
            message["To"] = email

            part1 = MIMEText(text, "plain", "utf-8")
            part2 = MIMEText(html, "html", "utf-8")
            message.attach(part1)
            message.attach(part2)

            if smtp_port_int == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port_int) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, email, message.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port_int) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, email, message.as_string())

            logger.info(f"[SMTP SUCCESS] E-mail de verificação enviado para {email}")
            print(f"[SMTP SUCCESS] E-mail de verificação enviado para {email}")
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via SMTP para {email}: {e}")
            print(f"[SMTP ERROR] Erro ao enviar via SMTP: {e}")

    # 3. Fallback (Modo Simulado / Mock)
    logger.info(f"[MOCK EMAIL] Código de verificação para {email}: {code}")
    print("\n==================================================")
    print(f"[MOCK EMAIL] Enviado código de verificação para {email}")
    print(f"CÓDIGO: {code}")
    print("==================================================\n")


def send_password_reset_email(email: str, code: str):
    """Envia um e-mail contendo o código de redefinição de senha para o usuário.

    Decide o método de envio automaticamente com base nas variáveis disponíveis.
    """
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

    # 1. Tentar por Resend
    if resend.api_key:
        try:
            params: resend.Emails.SendParams = {
                "from": RESEND_FROM,
                "to": [email],
                "subject": "Recuperação de Senha - VisualMemory",
                "text": text,
                "html": html,
            }
            response = resend.Emails.send(params)
            logger.info(
                f"[RESEND SUCCESS] E-mail de redefinição enviado para {email}. "
                f"ID: {response.get('id')}"
            )
            print(f"[RESEND SUCCESS] E-mail de redefinição de senha enviado para {email}")
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via Resend para {email}: {e}")
            print(f"[RESEND ERROR] Erro ao enviar: {e}")

    # 2. Tentar por SMTP (Gmail)
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            smtp_port_int = int(smtp_port)
            message = MIMEMultipart("alternative")
            message["Subject"] = "Recuperação de Senha - VisualMemory"
            message["From"] = os.getenv("SMTP_FROM", smtp_user)
            message["To"] = email

            part1 = MIMEText(text, "plain", "utf-8")
            part2 = MIMEText(html, "html", "utf-8")
            message.attach(part1)
            message.attach(part2)

            if smtp_port_int == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port_int) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, email, message.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port_int) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, email, message.as_string())

            logger.info(f"[SMTP SUCCESS] E-mail de redefinição enviado para {email}")
            print(f"[SMTP SUCCESS] E-mail de redefinição de senha enviado para {email}")
            return
        except Exception as e:
            logger.error(f"Erro ao enviar via SMTP para {email}: {e}")
            print(f"[SMTP ERROR] Erro ao enviar via SMTP: {e}")

    # 3. Fallback (Modo Simulado / Mock)
    logger.info(f"[MOCK EMAIL] Código de redefinição de senha para {email}: {code}")
    print("\n==================================================")
    print(f"[MOCK EMAIL] Enviado código de redefinição de senha para {email}")
    print(f"CÓDIGO: {code}")
    print("==================================================\n")
