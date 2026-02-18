from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, time
from app.models.dietary_record import MealType


class FoodItemIn(BaseModel):
    food_code: int
    food_description: str
    quantity_grams: float = Field(gt=0, description="Amount in grams")
    meal_type: MealType
    meal_time: Optional[time] = None


class DietaryRecallCreate(BaseModel):
    recall_date: date
    food_items: List[FoodItemIn] = Field(min_length=1)
    eating_window_start: Optional[time] = None
    eating_window_end: Optional[time] = None
    skipped_breakfast: bool = False
    late_night_eating: bool = False


class FoodItemOut(BaseModel):
    id: int
    food_code: int
    food_description: str
    quantity_grams: float
    meal_type: MealType
    meal_time: Optional[time]
    calories: Optional[float]
    carbs_g: Optional[float]
    protein_g: Optional[float]
    fat_g: Optional[float]
    fiber_g: Optional[float]
    sodium_mg: Optional[float]
    is_ultra_processed: bool

    class Config:
        from_attributes = True


class DietaryRecordOut(BaseModel):
    id: int
    user_id: int
    recall_date: date
    eating_window_start: Optional[time]
    eating_window_end: Optional[time]
    eating_window_hours: Optional[float]
    skipped_breakfast: bool
    late_night_eating: bool
    total_calories: Optional[float]
    carb_percent: Optional[float]
    protein_percent: Optional[float]
    fat_percent: Optional[float]
    saturated_fat_g: Optional[float]
    fiber_g: Optional[float]
    added_sugar_g: Optional[float]
    sodium_mg: Optional[float]
    omega3_g: Optional[float]
    ultra_processed_percent: Optional[float]
    glycemic_load: Optional[float]
    fruit_veg_servings: Optional[float]
    dietary_inflammatory_score: Optional[str]
    chrononutrition_score: Optional[float]
    diet_quality_score: Optional[float]
    food_items: List[FoodItemOut] = []

    class Config:
        from_attributes = True


class FFQCreate(BaseModel):
    assessment_date: date
    red_meat_servings_week: float = Field(0, ge=0)
    processed_meat_servings_week: float = Field(0, ge=0)
    fish_servings_week: float = Field(0, ge=0)
    poultry_servings_week: float = Field(0, ge=0)
    eggs_servings_week: float = Field(0, ge=0)
    dairy_servings_week: float = Field(0, ge=0)
    legumes_servings_week: float = Field(0, ge=0)
    nuts_seeds_servings_week: float = Field(0, ge=0)
    whole_grains_servings_week: float = Field(0, ge=0)
    refined_grains_servings_week: float = Field(0, ge=0)
    vegetables_servings_day: float = Field(0, ge=0)
    fruits_servings_day: float = Field(0, ge=0)
    fried_foods_servings_week: float = Field(0, ge=0)
    sweets_servings_week: float = Field(0, ge=0)
    sugary_beverages_servings_day: float = Field(0, ge=0)
    alcohol_servings_week: float = Field(0, ge=0)
    olive_oil_tbsp_day: float = Field(0, ge=0)
    fast_food_servings_week: float = Field(0, ge=0)


class FFQOut(FFQCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class FoodSearch(BaseModel):
    query: str = Field(min_length=2)
    limit: int = Field(10, ge=1, le=50)


class FoodOut(BaseModel):
    food_code: int
    main_description: str
    additional_description: Optional[str]
    wweia_category_description: str
    is_anti_inflammatory: bool
    is_pro_inflammatory: bool
    is_low_gi: bool
    is_high_fiber: bool
    is_omega3_rich: bool
    is_ultra_processed: bool
    is_mufa_rich: bool

    class Config:
        from_attributes = True