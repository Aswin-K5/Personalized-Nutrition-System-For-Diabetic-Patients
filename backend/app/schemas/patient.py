from pydantic import BaseModel, Field, validator
from typing import Optional, List
from app.models.patient import SexEnum, ActivityLevel, SmokingStatus


class PatientProfileCreate(BaseModel):
    # Anthropometric
    age: int = Field(ge=18, le=120, description="Age in years")
    sex: SexEnum
    weight_kg: float = Field(gt=20, lt=300, description="Weight in kg")
    height_cm: float = Field(gt=100, lt=250, description="Height in cm")
    waist_circumference_cm: Optional[float] = Field(None, gt=40, lt=200, description="Waist circumference in cm")

    # Blood pressure
    bp_systolic: Optional[int] = Field(None, ge=60, le=300, description="Systolic BP in mmHg")
    bp_diastolic: Optional[int] = Field(None, ge=40, le=200, description="Diastolic BP in mmHg")

    # Lab values
    fasting_glucose_mg_dl: Optional[float] = Field(None, ge=40, le=800, description="Fasting glucose mg/dL")
    triglycerides_mg_dl: Optional[float] = Field(None, ge=20, le=5000, description="Triglycerides mg/dL")
    hdl_cholesterol_mg_dl: Optional[float] = Field(None, ge=10, le=200, description="HDL Cholesterol mg/dL")
    hs_crp_mg_l: Optional[float] = Field(None, ge=0, le=300, description="hs-CRP mg/L (optional)")

    # Medications (list as JSON)
    medications: Optional[List[str]] = Field(None, description="List of current medications")

    # Lifestyle
    activity_level: ActivityLevel = ActivityLevel.SEDENTARY
    sleep_duration_hours: Optional[float] = Field(None, ge=2, le=14)
    smoking_status: SmokingStatus = SmokingStatus.NEVER


class PatientProfileUpdate(PatientProfileCreate):
    """All fields optional for PATCH"""
    age: Optional[int] = None
    sex: Optional[SexEnum] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None


class AnthropometricSummary(BaseModel):
    bmi: float
    bmi_category: str
    waist_height_ratio: Optional[float]
    metabolic_syndrome_components: int
    metabolic_syndrome_present: bool
    estimated_calorie_req: float
    calorie_deficit: Optional[float]
    metabolic_risk_score: int
    metabolic_risk_category: str


class PatientProfileOut(BaseModel):
    id: int
    user_id: int
    age: int
    sex: SexEnum
    weight_kg: float
    height_cm: float
    waist_circumference_cm: Optional[float]
    bp_systolic: Optional[int]
    bp_diastolic: Optional[int]
    fasting_glucose_mg_dl: Optional[float]
    triglycerides_mg_dl: Optional[float]
    hdl_cholesterol_mg_dl: Optional[float]
    hs_crp_mg_l: Optional[float]
    activity_level: ActivityLevel
    sleep_duration_hours: Optional[float]
    smoking_status: SmokingStatus
    medications: Optional[List[str]]
    bmi: Optional[float]
    waist_height_ratio: Optional[float]
    metabolic_syndrome_component_count: Optional[int]
    estimated_calorie_req: Optional[float]
    metabolic_risk_score: Optional[int]
    metabolic_risk_category: Optional[str]

    class Config:
        from_attributes = True