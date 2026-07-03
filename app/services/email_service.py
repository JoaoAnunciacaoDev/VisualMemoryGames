import logging
import os

import resend

logger = logging.getLogger("visualmemory.email")

resend.api_key = os.getenv("RESEND_API_KEY", "")

RESEND_FROM = os.getenv(
    "RESEND_FROM",
    "VisualMemory <onboarding@resend.dev>",
)

def send_verification_email(email: str, code: str):
    """Envia um e-mail contendo o código de verificação para o usuário.

    Se a API do Resend não estiver configurada, apenas registra o código no console/logs.
    """

    if resend.api_key:
        try:
            text = (
                f"Seu código de verificação para o VisualMemory é: {code}. "
                "Ele expira em 10 minutos."
            )
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

            params: resend.Emails.SendParams = {
                "from": RESEND_FROM,
                "to": [email],
                "subject": "Código de Verificação - VisualMemory",
                "text": text,
                "html": html,
            }

            response = resend.Emails.send(params)

            logger.info(f"E-mail de verificação real enviado com sucesso para {email}."
                        f" ID: {response.get('id')}")
            print(f"[RESEND SUCCESS] E-mail de verificação enviado para {email}")

        except Exception:
            logger.exception(
                f"Erro ao enviar e-mail real para {email}"
            )
    else:
        logger.info(f"[MOCK EMAIL] Código de verificação para {email}: {code}")
        print("\n==================================================")
        print(f"[MOCK EMAIL] Enviado código de verificação para {email}")
        print(f"CÓDIGO: {code}")
        print("==================================================\n")
        print("[RESEND WARNING] Variável 'RESEND_API_KEY' ausente. Envio real ignorado.")
        logger.warning("Envio de e-mail real de verificação ignorado. RESEND_API_KEY ausente.")


def send_password_reset_email(email: str, code: str):
    """Envia um e-mail contendo o código de redefinição de senha para o usuário.

    Se a API do Resend não estiver configurada, apenas registra o código no console/logs.
    """
    if resend.api_key:
        try:
            text = (f"Seu código de redefinição de senha para o VisualMemory é: "
                    f"{code}. Ele expira em 10 minutos.")
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

            params: resend.Emails.SendParams = {
                "from": RESEND_FROM,
                "to": [email],
                "subject": "Recuperação de Senha - VisualMemory",
                "text": text,
                "html": html,
            }

            response = resend.Emails.send(params)

            logger.info(
                f"E-mail de redefinição de senha real enviado "
                f"para {email}. ID: {response.get('id')}")
            print(f"[RESEND SUCCESS] E-mail de redefinição de senha enviado para {email}")

        except Exception:
            logger.exception(
                f"Erro ao enviar e-mail real para {email}"
            )
    else:
        logger.info(f"[MOCK EMAIL] Código de redefinição de senha para {email}: {code}")
        print("\n==================================================")
        print(f"[MOCK EMAIL] Enviado código de redefinição de senha para {email}")
        print(f"CÓDIGO: {code}")
        print("==================================================\n")
        print("[RESEND WARNING] Variável 'RESEND_API_KEY' ausente. Envio de redefinição ignorado.")
        logger.warning("Envio de e-mail real de redefinição ignorado. RESEND_API_KEY ausente.")
