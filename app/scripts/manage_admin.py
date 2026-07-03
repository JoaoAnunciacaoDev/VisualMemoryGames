# ruff: noqa: F401
import argparse
import sys

from app.database import SessionLocal
from app.models import (
    custom_lists,
    email_verification,
    game,
    password_reset,
    steam_account,
    tierlist,
    user,
    user_game,
)
from app.models.user import User


def manage_admin(email: str, action: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Erro: Nenhum usuário encontrado com o e-mail '{email}'")
            sys.exit(1)

        if action == "promote":
            if user.is_admin:
                print(f"Aviso: O usuário '{user.username}' ({email}) já é um administrador.")
            else:
                user.is_admin = True
                db.commit()
                print(
                    f"Sucesso: O usuário '{user.username}' ({email}) foi promovido a administrador!"
                )
        elif action == "demote":
            if not user.is_admin:
                print(f"Aviso: O usuário '{user.username}' ({email}) não é um administrador.")
            else:
                user.is_admin = False
                db.commit()
                print(
                    f"Sucesso: O privilégio de administrador do usuário "
                    f"'{user.username}' ({email}) foi removido."
                )
    except Exception as e:
        db.rollback()
        print(f"Erro inesperado ao alterar privilégios do usuário: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gerenciador de privilégios administrativos para o VisualMemory."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Endereço de e-mail do usuário cadastrado no sistema.",
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["promote", "demote"],
        help="Ação a realizar: 'promote' para conceder admin, 'demote' para revogar.",
    )

    args = parser.parse_args()
    manage_admin(args.email, args.action)
