from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey,
    Enum as SAEnum, Text, Date, Time
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    MID_MORNING_SNACK = "mid_morning_snack"
    LUNCH = "lunch"
    AFTERNOON_SNACK = "afternoon_snack"
    DINNER = "dinner"
    LATE_NIGHT = "late_night"


class DietaryRecord(Base):
    """24-hour dietary recall record"""
    __tablename__ = "dietary_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recall_date = Column(Date, nullable=False)

    # Chrononutrition
    eating_window_start = Column(Time, nullable=True)   # First meal time
    eating_window_end = Column(Time, nullable=True)     # Last meal time
    eating_window_hours = Column(Float, nullable=True)
    skipped_breakfast = Column(Boolean, default=False)
    late_night_eating = Column(Boolean, default=False)  # After 9 PM

    # Calculated nutritional totals
    total_calories = Column(Float, nullable=True)
    carb_percent = Column(Float, nullable=True)
    protein_percent = Column(Float, nullable=True)
    fat_percent = Column(Float, nullable=True)
    saturated_fat_g = Column(Float, nullable=True)
    trans_fat_g = Column(Float, nullable=True)
    fiber_g = Column(Float, nullable=True)
    added_sugar_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    omega3_g = Column(Float, nullable=True)
    ultra_processed_percent = Column(Float, nullable=True)
    glycemic_load = Column(Float, nullable=True)
    fruit_veg_servings = Column(Float, nullable=True)

    # Scores
    dietary_inflammatory_score = Column(String, nullable=True)   # Anti-inflammatory/Neutral/Pro-inflammatory
    chrononutrition_score = Column(Float, nullable=True)
    diet_quality_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="dietary_records")
    food_items = relationship("DietaryFoodItem", back_populates="dietary_record", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DietaryRecord user={self.user_id} date={self.recall_date}>"


class DietaryFoodItem(Base):
    """Individual food item within a 24-hour recall"""
    __tablename__ = "dietary_food_items"

    id = Column(Integer, primary_key=True, index=True)
    dietary_record_id = Column(Integer, ForeignKey("dietary_records.id", ondelete="CASCADE"), nullable=False)
    food_code = Column(Integer, nullable=False, index=True)
    food_description = Column(String, nullable=False)
    quantity_grams = Column(Float, nullable=False)
    meal_type = Column(SAEnum(MealType), nullable=False)
    meal_time = Column(Time, nullable=True)

    # Per-serving nutrients (estimated from category)
    calories = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    fiber_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    is_ultra_processed = Column(Boolean, default=False)

    # Relationships
    dietary_record = relationship("DietaryRecord", back_populates="food_items")


class FFQResponse(Base):
    """Food Frequency Questionnaire structured response"""
    __tablename__ = "ffq_responses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assessment_date = Column(Date, nullable=False)

    # Frequency fields (servings/week)
    red_meat_servings_week = Column(Float, default=0)
    processed_meat_servings_week = Column(Float, default=0)
    fish_servings_week = Column(Float, default=0)
    poultry_servings_week = Column(Float, default=0)
    eggs_servings_week = Column(Float, default=0)
    dairy_servings_week = Column(Float, default=0)
    legumes_servings_week = Column(Float, default=0)
    nuts_seeds_servings_week = Column(Float, default=0)
    whole_grains_servings_week = Column(Float, default=0)
    refined_grains_servings_week = Column(Float, default=0)
    vegetables_servings_day = Column(Float, default=0)
    fruits_servings_day = Column(Float, default=0)
    fried_foods_servings_week = Column(Float, default=0)
    sweets_servings_week = Column(Float, default=0)
    sugary_beverages_servings_day = Column(Float, default=0)
    alcohol_servings_week = Column(Float, default=0)
    olive_oil_tbsp_day = Column(Float, default=0)
    fast_food_servings_week = Column(Float, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())