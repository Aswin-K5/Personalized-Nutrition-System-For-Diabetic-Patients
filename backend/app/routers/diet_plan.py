from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.dietary_record import DietaryRecord, FFQResponse
from app.models.diet_plan import DietPlan, PlanSource
from app.schemas.diet_plan import DietPlanRequest, DietPlanOut, ModelComparisonOut
from app.utils.auth import get_current_user
from app.services.rule_engine import RuleEngine
from app.services.ml_model import ml_service

router = APIRouter(prefix="/diet-plan", tags=["Diet Plan & Recommendations"])


def _get_verified_profile(user_id: int, db: Session) -> PatientProfile:
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient profile required. Complete your profile at POST /patients/profile first."
        )
    return profile


def _generate_rule_plan(profile: PatientProfile, dietary_record, ffq, db: Session, user_id: int) -> DietPlan:
    """Run rule engine and create diet plan — uses profile, dietary recall, and FFQ."""
    engine = RuleEngine(profile, dietary_record, ffq)
    result = engine.run()

    plan = DietPlan(
        user_id=user_id,
        source=PlanSource.RULE_BASED,
        target_calories=result.get("target_calories"),
        target_carb_percent=result.get("target_carb_percent"),
        target_protein_percent=result.get("target_protein_percent"),
        target_fat_percent=result.get("target_fat_percent"),
        target_fiber_g=result.get("target_fiber_g"),
        target_sodium_mg=result.get("target_sodium_mg"),
        target_added_sugar_g=result.get("target_added_sugar_g"),
        triggered_rules=result.get("triggered_rules", []),
        food_recommendations=result.get("food_recommendations", []),
        lifestyle_reminders=result.get("lifestyle_reminders", []),
        meal_pattern=result.get("meal_pattern", {}),
        low_gi_plan=result.get("low_gi_plan", False),
        calorie_deficit_plan=result.get("calorie_deficit_plan", False),
        anti_inflammatory_diet=result.get("anti_inflammatory_diet", False),
        omega3_emphasis=result.get("omega3_emphasis", False),
        mufa_emphasis=result.get("mufa_emphasis", False),
        soluble_fiber_emphasis=result.get("soluble_fiber_emphasis", False),
        time_restricted_eating=result.get("time_restricted_eating", False),
        portion_control=result.get("portion_control", False),
        carb_distribution=result.get("carb_distribution", False),
        summary=result.get("summary"),
    )
    return plan


def _generate_ml_plan(profile: PatientProfile, dietary_record, db: Session, user_id: int) -> DietPlan:
    """Run ML model and create ML-based diet plan."""
    ml_result = ml_service.predict(profile, dietary_record)

    # Build ML plan (base targets from profile, modified by ML insights)
    base_calories = profile.calorie_deficit or profile.estimated_calorie_req or 2000
    plan_type = ml_result.get("ml_recommended_plan_type", "General_Healthy")
    risk_cat = ml_result.get("ml_risk_category", "Mild")

    # Map plan type to dietary targets
    plan_targets = {
        "Low-GI_Lipid-Control": {
            "carb": 40, "protein": 22, "fat": 38, "fiber": 35, "sodium": 2000, "sugar": 20
        },
        "Caloric-Deficit_TRE": {
            "carb": 45, "protein": 25, "fat": 30, "fiber": 28, "sodium": 2300, "sugar": 25
        },
        "Anti-Inflammatory_Mediterranean": {
            "carb": 48, "protein": 18, "fat": 34, "fiber": 32, "sodium": 1800, "sugar": 15
        },
        "Comprehensive_Metabolic": {
            "carb": 42, "protein": 23, "fat": 35, "fiber": 35, "sodium": 2000, "sugar": 20
        },
        "General_Healthy": {
            "carb": 50, "protein": 20, "fat": 30, "fiber": 25, "sodium": 2300, "sugar": 25
        },
    }
    targets = plan_targets.get(plan_type, plan_targets["General_Healthy"])

    ml_food_recs = _ml_food_recommendations(plan_type)

    plan = DietPlan(
        user_id=user_id,
        source=PlanSource.ML_MODEL,
        target_calories=base_calories * (0.85 if risk_cat in ["Moderate", "Severe"] else 0.95),
        target_carb_percent=targets["carb"],
        target_protein_percent=targets["protein"],
        target_fat_percent=targets["fat"],
        target_fiber_g=targets["fiber"],
        target_sodium_mg=targets["sodium"],
        target_added_sugar_g=targets["sugar"],
        triggered_rules=[{
            "rule_name": "ML_PREDICTION",
            "triggered": True,
            "reason": f"ML model predicted risk: {risk_cat} | Plan type: {plan_type}",
            "recommendations": [f"ML-recommended: {plan_type.replace('_', ' ')} approach"]
        }],
        food_recommendations=ml_food_recs,
        lifestyle_reminders=[
            "🥗 Follow your personalised dietary plan consistently for best results.",
            "🚶 Combine dietary changes with 150+ minutes of moderate activity per week.",
        ],
        meal_pattern={},
        low_gi_plan=plan_type in ["Low-GI_Lipid-Control", "Comprehensive_Metabolic"],
        calorie_deficit_plan=plan_type in ["Caloric-Deficit_TRE", "Comprehensive_Metabolic"],
        anti_inflammatory_diet=plan_type in ["Anti-Inflammatory_Mediterranean", "Comprehensive_Metabolic"],
        omega3_emphasis=plan_type in ["Low-GI_Lipid-Control", "Anti-Inflammatory_Mediterranean"],
        mufa_emphasis=plan_type in ["Anti-Inflammatory_Mediterranean"],
        soluble_fiber_emphasis=plan_type in ["Low-GI_Lipid-Control"],
        time_restricted_eating=plan_type in ["Caloric-Deficit_TRE"],
        portion_control=plan_type in ["Caloric-Deficit_TRE", "Comprehensive_Metabolic"],
        carb_distribution=plan_type in ["Low-GI_Lipid-Control", "Comprehensive_Metabolic"],
        ml_confidence_score=ml_result.get("ml_confidence_score"),
        ml_predicted_risk_reduction=ml_result.get("ml_predicted_risk_reduction"),
        ml_recommended_plan_type=plan_type,
        summary=(
            f"Personalised dietary plan based on {risk_cat} metabolic risk. "
            f"Recommended approach: {plan_type.replace('_', ' ').replace('-', ' ')} dietary pattern."
        )
    )
    return plan


def _ml_food_recommendations(plan_type: str) -> list:
    rec_map = {
        "Low-GI_Lipid-Control": [
            {"category": "Low-GI Staples", "action": "increase",
             "foods": ["Lentils", "Chickpeas", "Barley", "Steel-cut oats", "Sweet potato"],
             "reason": "ML-identified primary risk: hyperglycemia + dyslipidemia"},
            {"category": "Omega-3 Sources", "action": "increase",
             "foods": ["Atlantic salmon", "Sardines", "Mackerel", "Flaxseed", "Walnuts"],
             "reason": "TG-lowering EPA/DHA omega-3 fatty acids"},
        ],
        "Caloric-Deficit_TRE": [
            {"category": "High-Volume Low-Calorie", "action": "increase",
             "foods": ["Leafy greens", "Cucumber", "Zucchini", "Broth-based soups", "Berries"],
             "reason": "ML-identified primary risk: abdominal obesity — maximize satiety per calorie"},
            {"category": "Calorie-Dense Foods", "action": "decrease",
             "foods": ["Fried foods", "Pastries", "Nuts (excess)", "Avocado (excess)", "Cheese"],
             "reason": "Reduce energy density while maintaining nutrient adequacy"},
        ],
        "Anti-Inflammatory_Mediterranean": [
            {"category": "Mediterranean Staples", "action": "increase",
             "foods": ["Extra virgin olive oil", "Tomatoes", "Eggplant", "Lentils", "Fresh herbs"],
             "reason": "ML-identified primary risk: systemic inflammation"},
            {"category": "Refined/Processed", "action": "avoid",
             "foods": ["Ultra-processed snacks", "Processed meats", "Refined grains", "Trans fats"],
             "reason": "Key drivers of CRP elevation in ML feature importance"},
        ],
        "Comprehensive_Metabolic": [
            {"category": "Metabolic-Protective Foods", "action": "increase",
             "foods": ["Non-starchy vegetables", "Fatty fish", "Legumes", "Whole grains", "Nuts"],
             "reason": "ML: multiple concurrent metabolic risk factors detected"},
        ],
        "General_Healthy": [
            {"category": "General Healthy Pattern", "action": "increase",
             "foods": ["Vegetables (5+ servings)", "Whole fruits", "Lean proteins", "Whole grains"],
             "reason": "ML: low metabolic risk — maintain preventive healthy diet"},
        ],
    }
    return rec_map.get(plan_type, rec_map["General_Healthy"])


@router.post("/generate", response_model=DietPlanOut, status_code=status.HTTP_201_CREATED,
             summary="Generate personalized diet plan")
def generate_diet_plan(
    payload: DietPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a personalized diet plan based on the clinical rule engine and/or ML model.

    - **source**: `rule_based` | `ml_model` | `combined`
    - Requires completed patient profile
    - Optionally uses most recent dietary recall for dietary scoring rules
    """
    profile = _get_verified_profile(current_user.id, db)

    # Get most recent dietary recall
    dietary_record = None
    if payload.dietary_record_id:
        dietary_record = db.query(DietaryRecord).filter(
            DietaryRecord.id == payload.dietary_record_id,
            DietaryRecord.user_id == current_user.id
        ).first()
    else:
        dietary_record = (
            db.query(DietaryRecord)
            .filter(DietaryRecord.user_id == current_user.id)
            .order_by(DietaryRecord.recall_date.desc())
            .first()
        )

    # Get most recent FFQ — used to refine recommendations with long-term dietary patterns
    ffq = (
        db.query(FFQResponse)
        .filter(FFQResponse.user_id == current_user.id)
        .order_by(FFQResponse.assessment_date.desc())
        .first()
    )

    if payload.source == PlanSource.RULE_BASED:
        plan = _generate_rule_plan(profile, dietary_record, ffq, db, current_user.id)
    elif payload.source == PlanSource.ML_MODEL:
        plan = _generate_ml_plan(profile, dietary_record, db, current_user.id)
    else:  # COMBINED
        rule_result    = _generate_rule_plan(profile, dietary_record, ffq, db, current_user.id)
        ml_result_data = ml_service.predict(profile, dietary_record)

        rule_result.ml_confidence_score        = ml_result_data.get("ml_confidence_score")
        rule_result.ml_predicted_risk_reduction = ml_result_data.get("ml_predicted_risk_reduction")
        rule_result.ml_recommended_plan_type   = ml_result_data.get("ml_recommended_plan_type")
        rule_result.source = PlanSource.COMBINED

        ffq_note = " Dietary questionnaire data also included in recommendations." if ffq else ""
        rule_result.summary = (rule_result.summary or "") + ffq_note
        plan = rule_result

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/compare", response_model=ModelComparisonOut,
            summary="Compare rule-based vs ML diet plan")
def compare_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Research endpoint: Generate BOTH a rule-based AND ML plan for the same patient.
    Compares outputs and calculates agreement score for the research dashboard.
    """
    profile = _get_verified_profile(current_user.id, db)
    dietary_record = (
        db.query(DietaryRecord)
        .filter(DietaryRecord.user_id == current_user.id)
        .order_by(DietaryRecord.recall_date.desc())
        .first()
    )
    ffq = (
        db.query(FFQResponse)
        .filter(FFQResponse.user_id == current_user.id)
        .order_by(FFQResponse.assessment_date.desc())
        .first()
    )

    rule_plan = _generate_rule_plan(profile, dietary_record, ffq, db, current_user.id)
    ml_plan   = _generate_ml_plan(profile, dietary_record, db, current_user.id)

    db.add(rule_plan)
    db.add(ml_plan)
    db.commit()
    db.refresh(rule_plan)
    db.refresh(ml_plan)

    # Agreement score calculation
    agreement_checks = [
        rule_plan.low_gi_plan == ml_plan.low_gi_plan,
        rule_plan.calorie_deficit_plan == ml_plan.calorie_deficit_plan,
        rule_plan.anti_inflammatory_diet == ml_plan.anti_inflammatory_diet,
        rule_plan.omega3_emphasis == ml_plan.omega3_emphasis,
        rule_plan.time_restricted_eating == ml_plan.time_restricted_eating,
        abs((rule_plan.target_carb_percent or 45) - (ml_plan.target_carb_percent or 45)) <= 10,
        abs((rule_plan.target_calories or 2000) - (ml_plan.target_calories or 2000)) <= 300,
    ]
    agreement_score = round(sum(agreement_checks) / len(agreement_checks), 2)

    key_differences = []
    if rule_plan.low_gi_plan != ml_plan.low_gi_plan:
        key_differences.append("Low-GI plan: Disagreement between rule engine and ML model")
    if rule_plan.calorie_deficit_plan != ml_plan.calorie_deficit_plan:
        key_differences.append("Caloric deficit: Rule engine and ML differ on obesity treatment priority")
    if abs((rule_plan.target_carb_percent or 45) - (ml_plan.target_carb_percent or 45)) > 10:
        key_differences.append(
            f"Carb target: Rule={rule_plan.target_carb_percent}% vs ML={ml_plan.target_carb_percent}%"
        )

    risk_profile = {
        "bmi": profile.bmi,
        "metabolic_risk_category": profile.metabolic_risk_category,
        "metabolic_syndrome_components": profile.metabolic_syndrome_component_count,
        "fasting_glucose": profile.fasting_glucose_mg_dl,
        "triglycerides": profile.triglycerides_mg_dl,
        "hdl": profile.hdl_cholesterol_mg_dl,
        "has_dietary_data": dietary_record is not None,
    }

    return {
        "patient_risk_profile": risk_profile,
        "rule_based_plan": rule_plan,
        "ml_plan": ml_plan,
        "agreement_score": agreement_score,
        "key_differences": key_differences or ["Both models are in full agreement"],
    }


@router.get("/history", response_model=List[DietPlanOut], summary="Get diet plan history")
def get_plan_history(
    skip: int = 0, limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(DietPlan)
        .filter(DietPlan.user_id == current_user.id)
        .order_by(DietPlan.created_at.desc())
        .offset(skip).limit(limit)
        .all()
    )


@router.get("/{plan_id}", response_model=DietPlanOut, summary="Get specific diet plan")
def get_diet_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id,
        DietPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    return plan