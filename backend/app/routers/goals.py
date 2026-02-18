from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.goals import HealthGoal
from app.models.patient import PatientProfile
from app.utils.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["Health Goals"])


class GoalCreate(BaseModel):
    goal_type: str  # bmi | glucose | weight | triglycerides | hdl
    target_value: float
    deadline: Optional[str] = None


class GoalOut(BaseModel):
    id: int
    goal_type: str
    target_value: float
    current_value: Optional[float]
    deadline: Optional[str]
    is_achieved: bool
    achieved_at: Optional[datetime]
    progress_percent: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=GoalOut, status_code=201, summary="Create a health goal")
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient sets a personal health goal (e.g., BMI < 25, glucose < 100)"""
    # Get current value from profile
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    current_val = None
    if profile:
        if payload.goal_type == "bmi":
            current_val = profile.bmi
        elif payload.goal_type == "glucose":
            current_val = profile.fasting_glucose_mg_dl
        elif payload.goal_type == "weight":
            current_val = profile.weight_kg
        elif payload.goal_type == "triglycerides":
            current_val = profile.triglycerides_mg_dl
        elif payload.goal_type == "hdl":
            current_val = profile.hdl_cholesterol_mg_dl

    goal = HealthGoal(
        user_id=current_user.id,
        goal_type=payload.goal_type,
        target_value=payload.target_value,
        current_value=current_val,
        deadline=payload.deadline,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Calculate progress
    progress = None
    if current_val and payload.target_value:
        if payload.goal_type in ["bmi", "glucose", "weight", "triglycerides"]:
            # Lower is better
            progress = min(100, max(0, (1 - (current_val - payload.target_value) / current_val) * 100))
        elif payload.goal_type == "hdl":
            # Higher is better
            progress = min(100, max(0, (current_val / payload.target_value) * 100))
    
    goal_dict = GoalOut.from_orm(goal).dict()
    goal_dict["progress_percent"] = progress
    return goal_dict


@router.get("", response_model=List[GoalOut], summary="List my health goals")
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all health goals for the current user"""
    goals = db.query(HealthGoal).filter(HealthGoal.user_id == current_user.id).order_by(HealthGoal.created_at.desc()).all()
    
    # Calculate progress for each
    result = []
    for goal in goals:
        progress = None
        if goal.current_value and goal.target_value:
            if goal.goal_type in ["bmi", "glucose", "weight", "triglycerides"]:
                progress = min(100, max(0, (1 - (goal.current_value - goal.target_value) / goal.current_value) * 100))
            elif goal.goal_type == "hdl":
                progress = min(100, max(0, (goal.current_value / goal.target_value) * 100))
        
        goal_dict = GoalOut.from_orm(goal).dict()
        goal_dict["progress_percent"] = progress
        result.append(goal_dict)
    
    return result


@router.delete("/{goal_id}", status_code=204, summary="Delete a goal")
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a health goal"""
    goal = db.query(HealthGoal).filter(
        HealthGoal.id == goal_id,
        HealthGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    return None