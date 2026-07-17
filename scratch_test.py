import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.follow import Follow
from app.models.user import User

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visualmemory.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()

follows = db.query(Follow).all()
print("All follows:")
for f in follows:
    print(f"Follower: {f.follower_id}, Following: {f.following_id}")
    
users = db.query(User).all()
print("All users:")
for u in users:
    print(f"ID: {u.id}, Username: {u.username}")
