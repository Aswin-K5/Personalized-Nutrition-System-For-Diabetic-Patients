from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey,
    Enum as SAEnum, Text, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class PlanSource(str, enum.Enum):
    RULE_BASED = "rule_based"
    ML_MODEL = "ml_model"
    COMBINED = "combined"


class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source = Column(SAEnum(PlanSource), nullable=False)

    # Core targets
    target_calories = Column(Float, nullable=True)
    target_carb_percent = Column(Float, nullable=True)
    target_protein_percent = Column(Float, nullable=True)
    target_fat_percent = Column(Float, nullable=True)
    target_fiber_g = Column(Float, nullable=True)
    target_sodium_mg = Column(Float, nullable=True)
    target_added_sugar_g = Column(Float, nullable=True)

    # Triggered rules (JSON list)
    triggered_rules = Column(JSON, nullable=True)

    # Recommendations (JSON structure)
    food_recommendations = Column(JSON, nullable=True)    # foods to increase/decrease
    lifestyle_reminders = Column(JSON, nullable=True)     # post-meal walk, TRE, etc.
    meal_pattern = Column(JSON, nullable=True)             # meal timing suggestions

    # Priority modules activated
    low_gi_plan = Column(Boolean, default=False)
    calorie_deficit_plan = Column(Boolean, default=False)
    anti_inflammatory_diet = Column(Boolean, default=False)
    omega3_emphasis = Column(Boolean, default=False)
    mufa_emphasis = Column(Boolean, default=False)
    soluble_fiber_emphasis = Column(Boolean, default=False)
    time_restricted_eating = Column(Boolean, default=False)
    portion_control = Column(Boolean, default=False)
    carb_distribution = Column(Boolean, default=False)

    # ML model outputs
    ml_confidence_score = Column(Float, nullable=True)
    ml_predicted_risk_reduction = Column(Float, nullable=True)
    ml_recommended_plan_type = Column(String, nullable=True)

    # Plan narrative
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="diet_plans")