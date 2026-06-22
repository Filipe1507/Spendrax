from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth_utils import hash_password, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=schemas.Token, status_code=201)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verifica se o email já existe
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")

    user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Cria categorias padrão para o novo utilizador
    default_categories = [
        {"name": "Alimentação", "icon": "🍔", "color": "#f97316"},
        {"name": "Transportes", "icon": "🚗", "color": "#3b82f6"},
        {"name": "Lazer", "icon": "🎮", "color": "#a855f7"},
        {"name": "Saúde", "icon": "💊", "color": "#ef4444"},
        {"name": "Casa", "icon": "🏠", "color": "#22c55e"},
        {"name": "Salário", "icon": "💼", "color": "#10b981"},
    ]
    for cat in default_categories:
        db.add(models.Category(**cat, user_id=user.id))
    db.commit()

    token = create_access_token(user.id)
    return {"access_token": token, "user": user}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou password incorretos")

    token = create_access_token(user.id)
    return {"access_token": token, "user": user}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user, verify_password, hash_password
import models
from pydantic import BaseModel

class UpdateName(BaseModel):
    name: str

class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

@router.put("/profile", response_model=schemas.UserOut)
def update_profile(data: UpdateName, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.name = data.name
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def update_password(data: UpdatePassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password atual incorreta")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password atualizada"}

@router.delete("/account")
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).delete()
    db.query(models.Budget).filter(models.Budget.user_id == current_user.id).delete()
    db.query(models.Category).filter(models.Category.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Conta apagada"}
