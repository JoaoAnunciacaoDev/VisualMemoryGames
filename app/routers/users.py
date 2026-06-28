import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.security import get_current_user
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
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if str(db_user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Não tem permissão para deletar esta conta.")

    db.delete(db_user)
    db.commit()
    return None


@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = user_update.model_dump(exclude_unset=True)

    if "username" in update_data:
        existing = db.query(User).filter(User.username == update_data["username"]).first()
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Username já está em uso.")
        current_user.username = update_data["username"]

    if "email" in update_data:
        existing = db.query(User).filter(User.email == update_data["email"]).first()
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Email já está em uso.")
        current_user.email = update_data["email"]

    db.commit()
    db.refresh(current_user)
    return current_user