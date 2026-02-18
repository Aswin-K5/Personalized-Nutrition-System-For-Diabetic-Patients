from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class HealthGoal(Base):
    __tablename__ = "health_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    goal_type = Column(String, nullable=False)  # bmi | glucose | weight | triglycerides | hdl
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=True)
    deadline = Column(String, nullable=True)  # YYYY-MM-DD
    
    is_achieved = Column(Boolean, default=False)
    achieved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)