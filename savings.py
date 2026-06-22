from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth_utils import get_current_user
import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.SavingsGoalOut])
def list_goals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SavingsGoal).filter(models.SavingsGoal.user_id == current_user.id).all()

@router.post("/", response_model=schemas.SavingsGoalOut, status_code=201)
def create_goal(data: schemas.SavingsGoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    goal = models.SavingsGoal(**data.dict(), user_id=current_user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@router.put("/{goal_id}", response_model=schemas.SavingsGoalOut)
def update_goal(goal_id: int, data: schemas.SavingsGoalUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    goal = db.query(models.SavingsGoal).filter(
        models.SavingsGoal.id == goal_id,
        models.SavingsGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    goal.current_amount = data.current_amount
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    goal = db.query(models.SavingsGoal).filter(
        models.SavingsGoal.id == goal_id,
        models.SavingsGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(goal)
    db.commit()