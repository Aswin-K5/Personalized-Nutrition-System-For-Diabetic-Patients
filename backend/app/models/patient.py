from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey,
    Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class SexEnum(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class ActivityLevel(str, enum.Enum):
    SEDENTARY = "sedentary"          # Little or no exercise
    LIGHT = "light"                   # 1-3 days/week
    MODERATE = "moderate"             # 3-5 days/week
    ACTIVE = "active"                 # 6-7 days/week
    VERY_ACTIVE = "very_active"       # Hard exercise + physical job


class SmokingStatus(str, enum.Enum):
    NEVER = "never"
    FORMER = "former"
    CURRENT = "current"


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Anthropometric
    age = Column(Integer, nullable=False)
    sex = Column(SAEnum(SexEnum), nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    waist_circumference_cm = Column(Float, nullable=True)

    # Blood pressure
    bp_systolic = Column(Integer, nullable=True)    # mmHg
    bp_diastolic = Column(Integer, nullable=True)   # mmHg

    # Lab values
    fasting_glucose_mg_dl = Column(Float, nullable=True)
    triglycerides_mg_dl = Column(Float, nullable=True)
    hdl_cholesterol_mg_dl = Column(Float, nullable=True)
    hs_crp_mg_l = Column(Float, nullable=True)      # Optional

    # Medications
    medications = Column(Text, nullable=True)        # JSON string list

    # Investigator annotations (written by research staff, not visible to patient)

    # Lifestyle
    activity_level = Column(SAEnum(ActivityLevel), default=ActivityLevel.SEDENTARY)
    sleep_duration_hours = Column(Float, nullable=True)
    smoking_status = Column(SAEnum(SmokingStatus), default=SmokingStatus.NEVER)

    # Calculated fields (stored for history)
    bmi = Column(Float, nullable=True)
    waist_height_ratio = Column(Float, nullable=True)
    metabolic_syndrome_component_count = Column(Integer, nullable=True)
    estimated_calorie_req = Column(Float, nullable=True)
    calorie_deficit = Column(Float, nullable=True)
    metabolic_risk_score = Column(Integer, nullable=True)
    metabolic_risk_category = Column(String, nullable=True)  # Mild/Moderate/Severe

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="patient_profile")