import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="E-mail ou username já cadastrado."
        )

    hashed_password = get_password_hash(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Deleta a conta do usuário e todos os dados associados a ele."""
    
    db_user = db.query(User).filter(User.id == user_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    db.delete(db_user)
    db.commit()
    
    return None