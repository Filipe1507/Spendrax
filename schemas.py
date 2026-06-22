from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from models import TransactionType

# ── AUTH ──────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ── CATEGORIES ────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "💰"
    color: Optional[str] = "#6366f1"

class CategoryOut(CategoryCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# ── TRANSACTIONS ──────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float
    description: str
    date: datetime
    type: TransactionType
    category_id: Optional[int] = None
    is_recurring: Optional[bool] = False

class TransactionOut(BaseModel):
    id: int
    amount: float
    description: str
    date: datetime
    type: TransactionType
    is_recurring: bool
    category_id: Optional[int]
    category: Optional[CategoryOut]
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# ── BUDGETS ───────────────────────────────────────────
class BudgetCreate(BaseModel):
    amount_limit: float
    month: int
    year: int
    category_id: int

class BudgetOut(BudgetCreate):
    id: int
    user_id: int
    category: Optional[CategoryOut]
    class Config:
        from_attributes = True

# ── SAVINGS GOALS ─────────────────────────────────────
class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[datetime] = None
    icon: Optional[str] = "🎯"

class SavingsGoalUpdate(BaseModel):
    current_amount: float

class SavingsGoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    deadline: Optional[datetime]
    icon: str
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

