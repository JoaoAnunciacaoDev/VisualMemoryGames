from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.database import Base


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    email = Column(String, primary_key=True, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
