import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.schemas.patient import PatientProfileCreate, PatientProfileOut, AnthropometricSummary
from app.utils.auth import get_current_user
from app.services.anthropometric import run_all_anthropometric_calculations

router = APIRouter(prefix="/patients", tags=["Patient Profile"])


@router.post("/profile", response_model=PatientProfileOut, status_code=status.HTTP_201_CREATED,
             summary="Create patient clinical profile")
def create_profile(
    payload: PatientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create (or update) the authenticated patient's clinical profile.
    Automatically calculates:
    - BMI + category
    - Waist-to-height ratio
    - Metabolic syndrome component count
    - Estimated daily calorie requirement (Mifflin-St Jeor)
    - Metabolic risk score and category
    """
    existing = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists. Use PUT /patients/profile to update."
        )

    medications_json = json.dumps(payload.medications) if payload.medications else None

    profile = PatientProfile(
        user_id=current_user.id,
        age=payload.age,
        sex=payload.sex,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        waist_circumference_cm=payload.waist_circumference_cm,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        fasting_glucose_mg_dl=payload.fasting_glucose_mg_dl,
        triglycerides_mg_dl=payload.triglycerides_mg_dl,
        hdl_cholesterol_mg_dl=payload.hdl_cholesterol_mg_dl,
        hs_crp_mg_l=payload.hs_crp_mg_l,
        medications=medications_json,
        activity_level=payload.activity_level,
        sleep_duration_hours=payload.sleep_duration_hours,
        smoking_status=payload.smoking_status,
    )
    db.add(profile)
    db.flush()  # Get ID

    # Run calculations
    calcs = run_all_anthropometric_calculations(profile)
    profile.bmi = calcs["bmi"]
    profile.waist_height_ratio = calcs["waist_height_ratio"]
    profile.metabolic_syndrome_component_count = calcs["metabolic_syndrome_component_count"]
    profile.estimated_calorie_req = calcs["estimated_calorie_req"]
    profile.calorie_deficit = calcs["calorie_deficit"]
    profile.metabolic_risk_score = calcs["metabolic_risk_score"]
    profile.metabolic_risk_category = calcs["metabolic_risk_category"]

    db.commit()
    db.refresh(profile)

    # Deserialize medications for response
    if profile.medications:
        profile.medications = json.loads(profile.medications)

    return profile


@router.get("/profile", response_model=PatientProfileOut, summary="Get patient profile")
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found. Create it first via POST.")
    if profile.medications:
        profile.medications = json.loads(profile.medications)
    return profile


@router.put("/profile", response_model=PatientProfileOut, summary="Update patient profile")
def update_profile(
    payload: PatientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update clinical profile and recalculate all anthropometric metrics."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "medications" in update_data and update_data["medications"] is not None:
        update_data["medications"] = json.dumps(update_data["medications"])

    for field, value in update_data.items():
        setattr(profile, field, value)

    # Recalculate
    calcs = run_all_anthropometric_calculations(profile)
    profile.bmi = calcs["bmi"]
    profile.waist_height_ratio = calcs["waist_height_ratio"]
    profile.metabolic_syndrome_component_count = calcs["metabolic_syndrome_component_count"]
    profile.estimated_calorie_req = calcs["estimated_calorie_req"]
    profile.calorie_deficit = calcs["calorie_deficit"]
    profile.metabolic_risk_score = calcs["metabolic_risk_score"]
    profile.metabolic_risk_category = calcs["metabolic_risk_category"]

    db.commit()
    db.refresh(profile)

    if profile.medications:
        profile.medications = json.loads(profile.medications)
    return profile


@router.get("/profile/summary", response_model=AnthropometricSummary,
            summary="Get anthropometric & metabolic risk summary")
def get_anthropometric_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns calculated anthropometric metrics and metabolic risk classification."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    from app.services.anthropometric import calculate_bmi
    _, bmi_category = calculate_bmi(profile.weight_kg, profile.height_cm)

    return {
        "bmi": profile.bmi,
        "bmi_category": bmi_category,
        "waist_height_ratio": profile.waist_height_ratio,
        "metabolic_syndrome_components": profile.metabolic_syndrome_component_count,
        "metabolic_syndrome_present": (profile.metabolic_syndrome_component_count or 0) >= 3,
        "estimated_calorie_req": profile.estimated_calorie_req,
        "calorie_deficit": profile.calorie_deficit,
        "metabolic_risk_score": profile.metabolic_risk_score,
        "metabolic_risk_category": profile.metabolic_risk_category or "Not calculated",
    }