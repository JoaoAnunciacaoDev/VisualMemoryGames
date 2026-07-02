from sqlalchemy import Column, DateTime, String

from app.database import Base


class PasswordReset(Base):
    __tablename__ = "password_resets"

    email = Column(String, primary_key=True, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
