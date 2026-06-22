from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, case
from typing import Optional, List
from database import get_db
from auth_utils import get_current_user
import models, schemas

router = APIRouter()


@router.get("/list/recurring", response_model=List[schemas.TransactionOut])
def list_recurring(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_recurring == True
    ).order_by(models.Transaction.date.desc()).all()


@router.get("/summary/monthly")
def monthly_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = db.query(
        func.coalesce(func.sum(
            case((models.Transaction.type == 'income', models.Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((models.Transaction.type == 'expense', models.Transaction.amount), else_=0)
        ), 0).label("expenses"),
        func.count(models.Transaction.id).label("total")
    ).filter(
        models.Transaction.user_id == current_user.id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year,
    ).first()

    income = float(result.income)
    expenses = float(result.expenses)

    return {
        "month": month,
        "year": year,
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "total_transactions": result.total
    }


@router.get("/summary/range")
def summary_range(
    months: int = Query(24, ge=1, le=60),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = db.query(
        extract("month", models.Transaction.date).label("month"),
        extract("year", models.Transaction.date).label("year"),
        func.coalesce(func.sum(
            case((models.Transaction.type == 'income', models.Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((models.Transaction.type == 'expense', models.Transaction.amount), else_=0)
        ), 0).label("expenses"),
    ).filter(
        models.Transaction.user_id == current_user.id,
    ).group_by(
        extract("year", models.Transaction.date),
        extract("month", models.Transaction.date),
    ).order_by(
        extract("year", models.Transaction.date),
        extract("month", models.Transaction.date),
    ).all()

    return [
        {
            "month": int(r.month),
            "year": int(r.year),
            "income": float(r.income),
            "expenses": float(r.expenses),
            "balance": float(r.income) - float(r.expenses),
        }
        for r in result
    ]


@router.get("/", response_model=List[schemas.TransactionOut])
def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    )
    if month:
        query = query.filter(extract("month", models.Transaction.date) == month)
    if year:
        query = query.filter(extract("year", models.Transaction.date) == year)
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if type:
        query = query.filter(models.Transaction.type == type)
    return query.order_by(models.Transaction.date.desc()).all()


@router.post("/", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transaction = models.Transaction(**data.dict(), user_id=current_user.id)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(
    transaction_id: int,
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    for key, value in data.dict().items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db.delete(transaction)
    db.commit()