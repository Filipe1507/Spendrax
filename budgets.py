from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List
from database import get_db
from auth_utils import get_current_user
import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.BudgetOut])
def list_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.month == month,
        models.Budget.year == year,
    ).all()

@router.post("/", response_model=schemas.BudgetOut, status_code=201)
def create_budget(data: schemas.BudgetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verifica se já existe budget para esta categoria/mês/ano
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category_id == data.category_id,
        models.Budget.month == data.month,
        models.Budget.year == data.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um orçamento para esta categoria neste mês")

    budget = models.Budget(**data.dict(), user_id=current_user.id)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    db.delete(budget)
    db.commit()
