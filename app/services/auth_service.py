import bcrypt


def get_password_hash(password: str) -> str:
    """Gera o hash bcrypt de uma senha em texto simples."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode("utf-8")
