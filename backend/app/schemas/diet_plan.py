from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.diet_plan import PlanSource


class DietPlanRequest(BaseModel):
    """Request to generate a diet plan"""
    source: PlanSource = PlanSource.COMBINED
    dietary_record_id: Optional[int] = None
    ffq_id: Optional[int] = None


class RuleOutput(BaseModel):
    rule_name: str
    triggered: bool
    reason: str
    recommendations: List[str]


class FoodRecommendation(BaseModel):
    category: str
    action: str     # "increase" | "decrease" | "avoid"
    foods: List[str]
    reason: str


class DietPlanOut(BaseModel):
    id: int
    user_id: int
    source: PlanSource
    target_calories: Optional[float]
    target_carb_percent: Optional[float]
    target_protein_percent: Optional[float]
    target_fat_percent: Optional[float]
    target_fiber_g: Optional[float]
    target_sodium_mg: Optional[float]
    target_added_sugar_g: Optional[float]
    triggered_rules: Optional[List[Dict[str, Any]]]
    food_recommendations: Optional[List[Dict[str, Any]]]
    lifestyle_reminders: Optional[List[str]]
    meal_pattern: Optional[Dict[str, Any]]
    low_gi_plan: bool
    calorie_deficit_plan: bool
    anti_inflammatory_diet: bool
    omega3_emphasis: bool
    mufa_emphasis: bool
    soluble_fiber_emphasis: bool
    time_restricted_eating: bool
    portion_control: bool
    carb_distribution: bool
    ml_confidence_score: Optional[float]
    ml_predicted_risk_reduction: Optional[float]
    ml_recommended_plan_type: Optional[str]
    summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ModelComparisonOut(BaseModel):
    """Side-by-side comparison of rule-based vs ML recommendations"""
    patient_risk_profile: Dict[str, Any]
    rule_based_plan: DietPlanOut
    ml_plan: DietPlanOut
    agreement_score: float      # 0-1 how much both agree
    key_differences: List[str]