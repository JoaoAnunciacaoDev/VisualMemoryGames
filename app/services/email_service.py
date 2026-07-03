import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("visualmemory.email")


def send_verification_email(email: str, code: str):
    """Envia um e-mail contendo o código de verificação para o usuário.

    Se o SMTP não estiver configurado, apenas registra o código no console/logs.
    """
    logger.info(f"[MOCK EMAIL] Código de verificação para {email}: {code}")
    print("\n==================================================")
    print(f"[MOCK EMAIL] Enviado código de verificação para {email}")
    print(f"CÓDIGO: {code}")
    print("==================================================\n")

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            smtp_port_int = int(smtp_port)

            # Criar a mensagem multipart
            message = MIMEMultipart("alternative")
            message["Subject"] = "Código de Verificação - VisualMemory"
            message["From"] = os.getenv("SMTP_FROM", smtp_user)
            message["To"] = email

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

            logger.info(f"E-mail de verificação real enviado com sucesso para {email}")
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail real para {email}: {e}")


def send_password_reset_email(email: str, code: str):
    """Envia um e-mail contendo o código de redefinição de senha para o usuário.

    Se o SMTP não estiver configurado, apenas registra o código no console/logs.
    """
    logger.info(f"[MOCK EMAIL] Código de redefinição de senha para {email}: {code}")
    print("\n==================================================")
    print(f"[MOCK EMAIL] Enviado código de redefinição de senha para {email}")
    print(f"CÓDIGO: {code}")
    print("==================================================\n")

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            smtp_port_int = int(smtp_port)

            # Criar a mensagem multipart
            message = MIMEMultipart("alternative")
            message["Subject"] = "Recuperação de Senha - VisualMemory"
            message["From"] = os.getenv("SMTP_FROM", smtp_user)
            message["To"] = email

            text = f"Seu código de redefinição de senha para o VisualMemory é: {code}."
            text += "Ele expira em 10 minutos."
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

            logger.info(f"E-mail de redefinição de senha real enviado para {email}")
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail de redefinição de senha real para {email}: {e}")
