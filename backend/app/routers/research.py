import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timezone

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.dietary_record import DietaryRecord
from app.models.diet_plan import DietPlan, PlanSource
from app.utils.auth import get_current_user, require_investigator
from app.services.ml_model import ml_service
from app.services.anthropometric import calculate_bmi
from pydantic import BaseModel


router = APIRouter(prefix="/research", tags=["Research Dashboard (Investigator)"])


# ─────────────────────────────────────────────────────────────────────────────
# POPULATION STATS  (flat response the frontend expects)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/stats", summary="Population-level statistics")
def get_population_stats(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    total_patients = db.query(func.count(PatientProfile.id)).scalar() or 0
    total_recalls  = db.query(func.count(DietaryRecord.id)).scalar() or 0
    total_plans    = db.query(func.count(DietPlan.id)).scalar() or 0

    # Risk distribution
    risk_rows = (
        db.query(PatientProfile.metabolic_risk_category, func.count(PatientProfile.id))
        .group_by(PatientProfile.metabolic_risk_category).all()
    )

    # Average clinical markers
    m = db.query(
        func.avg(PatientProfile.bmi).label("bmi"),
        func.avg(PatientProfile.fasting_glucose_mg_dl).label("glucose"),
        func.avg(PatientProfile.triglycerides_mg_dl).label("tg"),
        func.avg(PatientProfile.hdl_cholesterol_mg_dl).label("hdl"),
    ).first()

    # Average dietary
    d = db.query(
        func.avg(DietaryRecord.total_calories).label("calories"),
        func.avg(DietaryRecord.fiber_g).label("fiber"),
        func.avg(DietaryRecord.sodium_mg).label("sodium"),
        func.avg(DietaryRecord.ultra_processed_percent).label("upf"),
        func.avg(DietaryRecord.omega3_g).label("omega3"),
        func.avg(DietaryRecord.glycemic_load).label("gl"),
        func.avg(DietaryRecord.fruit_veg_servings).label("fv"),
        func.avg(DietaryRecord.added_sugar_g).label("sugar"),
        func.avg(DietaryRecord.diet_quality_score).label("dqs"),
    ).first()

    # DIS distribution
    dis_rows = (
        db.query(DietaryRecord.dietary_inflammatory_score, func.count(DietaryRecord.id))
        .group_by(DietaryRecord.dietary_inflammatory_score).all()
    )

    # Plan source distribution
    plan_rows = (
        db.query(DietPlan.source, func.count(DietPlan.id))
        .group_by(DietPlan.source).all()
    )

    ml_status = ml_service.get_model_status()

    return {
        # Counts
        "total_patients":  total_patients,
        "total_recalls":   total_recalls,
        "total_plans":     total_plans,
        "ml_model_ready":  ml_status.get("risk_model_loaded", False) and ml_status.get("plan_model_loaded", False),

        # Clinical averages
        "avg_bmi":               round(m.bmi     or 0, 1),
        "avg_fasting_glucose":   round(m.glucose  or 0, 1),
        "avg_triglycerides":     round(m.tg       or 0, 1),
        "avg_hdl":               round(m.hdl      or 0, 1),

        # Dietary averages
        "avg_total_calories":          round(d.calories or 0, 1),
        "avg_fiber_g":                 round(d.fiber    or 0, 1),
        "avg_sodium_mg":               round(d.sodium   or 0, 1),
        "avg_ultra_processed_percent": round(d.upf      or 0, 1),
        "avg_omega3_g":                round(d.omega3   or 0, 2),
        "avg_glycemic_load":           round(d.gl       or 0, 1),
        "avg_fruit_veg_servings":      round(d.fv       or 0, 1),
        "avg_added_sugar_g":           round(d.sugar    or 0, 1),
        "avg_diet_quality_score":      round(d.dqs      or 0, 1),

        # Distributions
        "risk_distribution":            {r[0]: r[1] for r in risk_rows if r[0]},
        "dis_distribution":             {r[0]: r[1] for r in dis_rows  if r[0]},
        "plan_source_distribution":     {str(r[0]).split(".")[-1]: r[1] for r in plan_rows},
    }


# ─────────────────────────────────────────────────────────────────────────────
# PATIENT REGISTRY  (investigator sees all patients + their data)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/patients", summary="List all enrolled patients")
def list_patients(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    patients = db.query(User).filter(User.role == UserRole.PATIENT).all()
    if not patients:
        return []

    patient_ids = [u.id for u in patients]

    profiles = {
        p.user_id: p
        for p in db.query(PatientProfile)
        .filter(PatientProfile.user_id.in_(patient_ids)).all()
    }

    recall_counts = {
        row.user_id: row.cnt
        for row in db.query(
            DietaryRecord.user_id,
            func.count(DietaryRecord.id).label("cnt")
        )
        .filter(DietaryRecord.user_id.in_(patient_ids))
        .group_by(DietaryRecord.user_id).all()
    }

    result = []
    for u in patients:
        profile = profiles.get(u.id)
        row = {
            "id":            u.id,
            "full_name":     u.full_name,
            "email":         u.email,
            "is_active":     u.is_active,
            "role":          "patient",
            "total_recalls": recall_counts.get(u.id, 0),
            "bmi":                           None,
            "bmi_category":                  None,
            "fasting_glucose":               None,
            "risk_category":                 None,
            "metabolic_syndrome_components": None,
        }
        if profile:
            bmi_cat = None
            if profile.weight_kg and profile.height_cm:
                _, bmi_cat = calculate_bmi(profile.weight_kg, profile.height_cm)
            row.update({
                "bmi":                           profile.bmi,
                "bmi_category":                  bmi_cat,
                "fasting_glucose":               profile.fasting_glucose_mg_dl,
                "risk_category":                 profile.metabolic_risk_category,
                "metabolic_syndrome_components": profile.metabolic_syndrome_component_count,
            })
        result.append(row)
    return result


@router.get("/patients/{user_id}/summary", summary="Get one patient's clinical summary")
def get_patient_summary(
    user_id: int,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Full clinical summary for a single patient — shown in the expanded investigator row."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient has not completed their profile yet.")

    bmi_cat = None
    if profile.weight_kg and profile.height_cm:
        _, bmi_cat = calculate_bmi(profile.weight_kg, profile.height_cm)
    recall_count = db.query(func.count(DietaryRecord.id)).filter(DietaryRecord.user_id == user_id).scalar() or 0
    medications = json.loads(profile.medications) if profile.medications else []

    return {
        "user_id":                         user_id,
        "age":                             profile.age,
        "sex":                             str(profile.sex).split(".")[-1],
        "weight_kg":                       profile.weight_kg,
        "height_cm":                       profile.height_cm,
        "waist_circumference_cm":          profile.waist_circumference_cm,
        "bmi":                             profile.bmi,
        "bmi_category":                    bmi_cat,
        "waist_height_ratio":              profile.waist_height_ratio,
        "bp_systolic":                     profile.bp_systolic,
        "bp_diastolic":                    profile.bp_diastolic,
        "fasting_glucose_mg_dl":           profile.fasting_glucose_mg_dl,
        "triglycerides_mg_dl":             profile.triglycerides_mg_dl,
        "hdl_cholesterol_mg_dl":           profile.hdl_cholesterol_mg_dl,
        "hs_crp_mg_l":                     profile.hs_crp_mg_l,
        "metabolic_syndrome_components":   profile.metabolic_syndrome_component_count,
        "metabolic_syndrome_present":      (profile.metabolic_syndrome_component_count or 0) >= 3,
        "metabolic_risk_score":            profile.metabolic_risk_score,
        "metabolic_risk_category":         profile.metabolic_risk_category,
        "estimated_calorie_req":           profile.estimated_calorie_req,
        "calorie_deficit":                 profile.calorie_deficit,
        "activity_level":                  str(profile.activity_level).split(".")[-1],
        "sleep_duration_hours":            profile.sleep_duration_hours,
        "smoking_status":                  str(profile.smoking_status).split(".")[-1],
        "medications":                     medications,
        "total_recalls":                   recall_count,
    }


@router.get("/patients/{user_id}/recalls", summary="Get one patient's dietary recalls with food items")
def get_patient_recalls(
    user_id: int,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """All dietary recalls with individual food items per meal, newest first."""
    from app.models.dietary_record import DietaryFoodItem

    patient = db.query(User).filter(User.id == user_id, User.role == UserRole.PATIENT).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    recalls = (
        db.query(DietaryRecord)
        .filter(DietaryRecord.user_id == user_id)
        .order_by(DietaryRecord.recall_date.desc())
        .all()
    )

    result = []
    for r in recalls:
        food_items = (
            db.query(DietaryFoodItem)
            .filter(DietaryFoodItem.dietary_record_id == r.id)
            .all()
        )
        result.append({
            "id":                         r.id,
            "recall_date":                str(r.recall_date),
            "total_calories":             r.total_calories,
            "carb_percent":               r.carb_percent,
            "protein_percent":            r.protein_percent,
            "fat_percent":                r.fat_percent,
            "fiber_g":                    r.fiber_g,
            "sodium_mg":                  r.sodium_mg,
            "added_sugar_g":              r.added_sugar_g,
            "omega3_g":                   r.omega3_g,
            "ultra_processed_percent":    r.ultra_processed_percent,
            "glycemic_load":              r.glycemic_load,
            "fruit_veg_servings":         r.fruit_veg_servings,
            "dietary_inflammatory_score": r.dietary_inflammatory_score,
            "chrononutrition_score":      r.chrononutrition_score,
            "diet_quality_score":         r.diet_quality_score,
            "eating_window_hours":        r.eating_window_hours,
            "skipped_breakfast":          r.skipped_breakfast,
            "late_night_eating":          r.late_night_eating,
            "food_items": [
                {
                    "id":                 fi.id,
                    "food_description":   fi.food_description,
                    "quantity_grams":     fi.quantity_grams,
                    "meal_type":          str(fi.meal_type).split(".")[-1],
                    "meal_time":          str(fi.meal_time) if fi.meal_time else None,
                    "calories":           fi.calories,
                    "carbs_g":            fi.carbs_g,
                    "protein_g":          fi.protein_g,
                    "fat_g":              fi.fat_g,
                    "fiber_g":            fi.fiber_g,
                    "is_ultra_processed": fi.is_ultra_processed,
                }
                for fi in food_items
            ],
        })
    return result


@router.get("/patients/{user_id}/plans", summary="Get one patient's diet plans")
def get_patient_plans(
    user_id: int,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """All diet plans for a specific patient, newest first."""
    patient = db.query(User).filter(User.id == user_id, User.role == UserRole.PATIENT).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    plans = (
        db.query(DietPlan)
        .filter(DietPlan.user_id == user_id)
        .order_by(DietPlan.created_at.desc())
        .all()
    )

    result = []
    for p in plans:
        food_recs = p.food_recommendations if p.food_recommendations else []
        lifestyle = p.lifestyle_reminders if p.lifestyle_reminders else []
        result.append({

            "id":                        p.id,
            "created_at":                p.created_at.isoformat(),
            "source":                    str(p.source).split(".")[-1],
            "target_calories":           p.target_calories,
            "target_carb_percent":       p.target_carb_percent,
            "target_protein_percent":    p.target_protein_percent,
            "target_fat_percent":        p.target_fat_percent,
            "target_fiber_g":            p.target_fiber_g,
            "target_sodium_mg":          p.target_sodium_mg,
            "target_added_sugar_g":      p.target_added_sugar_g,
            # Module flags
            "low_gi_plan":               p.low_gi_plan,
            "calorie_deficit_plan":      p.calorie_deficit_plan,
            "anti_inflammatory_diet":    p.anti_inflammatory_diet,
            "omega3_emphasis":           p.omega3_emphasis,
            "mufa_emphasis":             p.mufa_emphasis,
            "soluble_fiber_emphasis":    p.soluble_fiber_emphasis,
            "time_restricted_eating":    p.time_restricted_eating,
            "portion_control":           p.portion_control,
            "carb_distribution":         p.carb_distribution,
            "summary":                   p.summary,
            "food_recommendations":      food_recs,
            "lifestyle_reminders":       lifestyle,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# CSV EXPORTS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/export/patients", summary="Export patient data as CSV (SPSS/R compatible)")
def export_patients_csv(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
    include_dietary: bool = Query(True),
):
    profiles = db.query(PatientProfile).all()
    output   = io.StringIO()

    fieldnames = [
        "patient_id", "age", "sex", "weight_kg", "height_cm", "waist_cm",
        "bmi", "bmi_category", "waist_height_ratio",
        "bp_systolic", "bp_diastolic",
        "fasting_glucose", "triglycerides", "hdl", "hs_crp",
        "metabolic_syndrome_components", "metabolic_syndrome_present",
        "metabolic_risk_score", "metabolic_risk_category",
        "estimated_calorie_req", "calorie_deficit",
        "activity_level", "sleep_hours", "smoking_status",
    ]
    if include_dietary:
        fieldnames += [
            "recall_date", "total_calories", "carb_pct", "protein_pct", "fat_pct",
            "fiber_g", "added_sugar_g", "sodium_mg", "omega3_g",
            "ultra_processed_pct", "glycemic_load", "fruit_veg_servings",
            "dietary_inflammatory_score", "diet_quality_score",
            "eating_window_hours", "skipped_breakfast", "late_night_eating",
        ]

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for p in profiles:
        bmi_cat = None
        if p.weight_kg and p.height_cm:
            _, bmi_cat = calculate_bmi(p.weight_kg, p.height_cm)
        row = {
            "patient_id": p.user_id, "age": p.age,
            "sex": str(p.sex).split(".")[-1],
            "weight_kg": p.weight_kg, "height_cm": p.height_cm,
            "waist_cm": p.waist_circumference_cm,
            "bmi": p.bmi, "bmi_category": bmi_cat,
            "waist_height_ratio": p.waist_height_ratio,
            "bp_systolic": p.bp_systolic, "bp_diastolic": p.bp_diastolic,
            "fasting_glucose": p.fasting_glucose_mg_dl,
            "triglycerides": p.triglycerides_mg_dl,
            "hdl": p.hdl_cholesterol_mg_dl, "hs_crp": p.hs_crp_mg_l,
            "metabolic_syndrome_components": p.metabolic_syndrome_component_count,
            "metabolic_syndrome_present": 1 if (p.metabolic_syndrome_component_count or 0) >= 3 else 0,
            "metabolic_risk_score": p.metabolic_risk_score,
            "metabolic_risk_category": p.metabolic_risk_category,
            "estimated_calorie_req": p.estimated_calorie_req,
            "calorie_deficit": p.calorie_deficit,
            "activity_level": str(p.activity_level).split(".")[-1],
            "sleep_hours": p.sleep_duration_hours,
            "smoking_status": str(p.smoking_status).split(".")[-1],
        }
        if include_dietary:
            rec = (
                db.query(DietaryRecord)
                .filter(DietaryRecord.user_id == p.user_id)
                .order_by(DietaryRecord.recall_date.desc()).first()
            )
            if rec:
                row.update({
                    "recall_date": rec.recall_date,
                    "total_calories": rec.total_calories,
                    "carb_pct": rec.carb_percent,
                    "protein_pct": rec.protein_percent,
                    "fat_pct": rec.fat_percent,
                    "fiber_g": rec.fiber_g,
                    "added_sugar_g": rec.added_sugar_g,
                    "sodium_mg": rec.sodium_mg,
                    "omega3_g": rec.omega3_g,
                    "ultra_processed_pct": rec.ultra_processed_percent,
                    "glycemic_load": rec.glycemic_load,
                    "fruit_veg_servings": rec.fruit_veg_servings,
                    "dietary_inflammatory_score": rec.dietary_inflammatory_score,
                    "diet_quality_score": rec.diet_quality_score,
                    "eating_window_hours": rec.eating_window_hours,
                    "skipped_breakfast": 1 if rec.skipped_breakfast else 0,
                    "late_night_eating":  1 if rec.late_night_eating  else 0,
                })
            else:
                for k in fieldnames[24:]:
                    row[k] = ""
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=patient_data.csv"}
    )


@router.get("/export/dietary-timeseries", summary="Export dietary time-series for R/SPSS")
def export_dietary_timeseries(
    patient_id: Optional[int] = Query(None),
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    query = db.query(DietaryRecord)
    if patient_id:  query = query.filter(DietaryRecord.user_id == patient_id)
    if start_date:  query = query.filter(DietaryRecord.recall_date >= start_date)
    if end_date:    query = query.filter(DietaryRecord.recall_date <= end_date)
    records = query.order_by(DietaryRecord.user_id, DietaryRecord.recall_date).all()

    output = io.StringIO()
    fieldnames = [
        "patient_id", "recall_date", "total_calories", "carb_pct", "protein_pct", "fat_pct",
        "fiber_g", "added_sugar_g", "sodium_mg", "omega3_g", "ultra_processed_pct",
        "glycemic_load", "fruit_veg_servings", "dietary_inflammatory_score",
        "diet_quality_score", "eating_window_hours", "skipped_breakfast", "late_night_eating",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for r in records:
        writer.writerow({
            "patient_id": r.user_id, "recall_date": r.recall_date,
            "total_calories": r.total_calories, "carb_pct": r.carb_percent,
            "protein_pct": r.protein_percent, "fat_pct": r.fat_percent,
            "fiber_g": r.fiber_g, "added_sugar_g": r.added_sugar_g,
            "sodium_mg": r.sodium_mg, "omega3_g": r.omega3_g,
            "ultra_processed_pct": r.ultra_processed_percent,
            "glycemic_load": r.glycemic_load, "fruit_veg_servings": r.fruit_veg_servings,
            "dietary_inflammatory_score": r.dietary_inflammatory_score,
            "diet_quality_score": r.diet_quality_score,
            "eating_window_hours": r.eating_window_hours,
            "skipped_breakfast": 1 if r.skipped_breakfast else 0,
            "late_night_eating":  1 if r.late_night_eating  else 0,
        })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=dietary_timeseries.csv"}
    )


# ─────────────────────────────────────────────────────────────────────────────
# MODEL PERFORMANCE
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/model-performance", summary="Analysis engine status")
def get_model_performance(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    ml_status = ml_service.get_model_status()
    avg_conf  = db.query(func.avg(DietPlan.ml_confidence_score)).filter(
        DietPlan.ml_confidence_score.isnot(None)
    ).scalar()
    ml_count = db.query(func.count(DietPlan.id)).filter(
        DietPlan.source == PlanSource.ML_MODEL
    ).scalar() or 0

    return {
        "risk_model_loaded":   ml_status.get("risk_model_loaded", False),
        "plan_model_loaded":   ml_status.get("plan_model_loaded", False),
        "ml_plans_generated":  ml_count,
        "avg_ml_confidence":   round(avg_conf or 0, 3),
    }
    

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    profile.follow_up_flag = body.flag
    db.commit()
    return {"patient_id": user_id, "flag": profile.follow_up_flag}