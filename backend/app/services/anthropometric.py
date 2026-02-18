"""
Clinical anthropometric and metabolic risk calculations.
Based on: WHO, IDF, AHA/NHLBI criteria for Metabolic Syndrome.
Mifflin-St Jeor Equation for BMR.
"""
from typing import Optional, Tuple
from app.models.patient import SexEnum, ActivityLevel


# Activity multipliers for TDEE
ACTIVITY_MULTIPLIERS = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHT: 1.375,
    ActivityLevel.MODERATE: 1.55,
    ActivityLevel.ACTIVE: 1.725,
    ActivityLevel.VERY_ACTIVE: 1.9,
}

# Waist cutoffs (IDF, ethnicity-based defaults — can be extended)
WAIST_CUTOFF_MALE_CM = 102.0        # ATP III (Western)
WAIST_CUTOFF_FEMALE_CM = 88.0       # ATP III

# Asian ethnicity cutoffs (IDF):
WAIST_CUTOFF_ASIAN_MALE_CM = 90.0
WAIST_CUTOFF_ASIAN_FEMALE_CM = 80.0


def calculate_bmi(weight_kg: Optional[float], height_cm: Optional[float]) -> Tuple[Optional[float], Optional[str]]:
    if not weight_kg or not height_cm:
        return None, None
    bmi = weight_kg / ((height_cm / 100) ** 2)
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25.0:
        category = "Normal"
    elif bmi < 30.0:
        category = "Overweight"
    elif bmi < 35.0:
        category = "Class I Obesity"
    elif bmi < 40.0:
        category = "Class II Obesity"
    else:
        category = "Class III Obesity"
    return round(bmi, 2), category


def calculate_waist_height_ratio(waist_cm: float, height_cm: float) -> float:
    """Waist-to-Height Ratio. Healthy threshold: < 0.5"""
    return round(waist_cm / height_cm, 3)


def mifflin_st_jeor_bmr(weight_kg: float, height_cm: float, age: int, sex: SexEnum) -> float:
    """
    Mifflin-St Jeor Equation for Basal Metabolic Rate (kcal/day).
    Men:   10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
    Women: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
    """
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if sex == SexEnum.MALE:
        bmr += 5
    else:
        bmr -= 161
    return round(bmr, 1)


def estimated_daily_calories(weight_kg: float, height_cm: float, age: int,
                              sex: SexEnum, activity_level: ActivityLevel) -> float:
    """TDEE = BMR × Activity Multiplier"""
    bmr = mifflin_st_jeor_bmr(weight_kg, height_cm, age, sex)
    tdee = bmr * ACTIVITY_MULTIPLIERS[activity_level]
    return round(tdee, 0)


def calorie_deficit_for_weight_loss(tdee: float, bmi: float) -> Optional[float]:
    """
    For overweight/obese: recommend 500-750 kcal/day deficit.
    Returns None if not indicated.
    """
    if bmi >= 25.0:
        deficit = 500 if bmi < 30 else 750
        return max(tdee - deficit, 1200)  # Never below 1200 kcal/day
    return None


def count_metabolic_syndrome_components(
    waist_cm: Optional[float],
    triglycerides: Optional[float],
    hdl: Optional[float],
    fasting_glucose: Optional[float],
    bp_systolic: Optional[int],
    bp_diastolic: Optional[int],
    sex: SexEnum,
    asian: bool = True,  # default to stricter Asian cutoffs
) -> Tuple[int, bool]:
    """
    ATP III / IDF criteria. Returns (component_count, metabolic_syndrome_present).
    Metabolic syndrome = 3 or more of 5 components.

    Components:
      1. Abdominal obesity
      2. High TG (≥150 mg/dL) or on TG medication
      3. Low HDL (<40 men / <50 women) or on HDL medication
      4. High BP (≥130/85 or on antihypertensive)
      5. High fasting glucose (≥100 mg/dL) or on diabetes medication
    """
    count = 0

    # 1. Abdominal obesity
    if waist_cm is not None:
        if asian:
            cutoff = WAIST_CUTOFF_ASIAN_MALE_CM if sex == SexEnum.MALE else WAIST_CUTOFF_ASIAN_FEMALE_CM
        else:
            cutoff = WAIST_CUTOFF_MALE_CM if sex == SexEnum.MALE else WAIST_CUTOFF_FEMALE_CM
        if waist_cm >= cutoff:
            count += 1

    # 2. High TG
    if triglycerides is not None and triglycerides >= 150:
        count += 1

    # 3. Low HDL
    if hdl is not None:
        hdl_cutoff = 40 if sex == SexEnum.MALE else 50
        if hdl < hdl_cutoff:
            count += 1

    # 4. High BP
    if bp_systolic is not None and bp_diastolic is not None:
        if bp_systolic >= 130 or bp_diastolic >= 85:
            count += 1

    # 5. High fasting glucose
    if fasting_glucose is not None and fasting_glucose >= 100:
        count += 1

    return count, count >= 3


def calculate_metabolic_risk_score(
    waist_cm: Optional[float],
    triglycerides: Optional[float],
    hdl: Optional[float],
    fasting_glucose: Optional[float],
    bp_systolic: Optional[int],
    bp_diastolic: Optional[int],
    sex: SexEnum,
) -> Tuple[int, str]:
    """
    Score 0-5 based on number of metabolic syndrome components.
    Returns (score, category).
    """
    count, _ = count_metabolic_syndrome_components(
        waist_cm, triglycerides, hdl, fasting_glucose, bp_systolic, bp_diastolic, sex
    )

    if count <= 1:
        category = "Low Risk"
    elif count == 2:
        category = "Mild"
    elif count == 3:
        category = "Moderate"
    else:
        category = "Severe"

    return count, category


def run_all_anthropometric_calculations(profile) -> dict:
    """Run all calculations and return as dict to update patient profile."""
    bmi, bmi_category = calculate_bmi(profile.weight_kg, profile.height_cm)
    tdee = estimated_daily_calories(profile.weight_kg, profile.height_cm, profile.age,
                                    profile.sex, profile.activity_level)

    waist_height_ratio = None
    if profile.waist_circumference_cm:
        waist_height_ratio = calculate_waist_height_ratio(profile.waist_circumference_cm, profile.height_cm)

    ms_count, ms_present = count_metabolic_syndrome_components(
        profile.waist_circumference_cm, profile.triglycerides_mg_dl,
        profile.hdl_cholesterol_mg_dl, profile.fasting_glucose_mg_dl,
        profile.bp_systolic, profile.bp_diastolic, profile.sex
    )

    risk_score, risk_category = calculate_metabolic_risk_score(
        profile.waist_circumference_cm, profile.triglycerides_mg_dl,
        profile.hdl_cholesterol_mg_dl, profile.fasting_glucose_mg_dl,
        profile.bp_systolic, profile.bp_diastolic, profile.sex
    )

    calorie_deficit_target = calorie_deficit_for_weight_loss(tdee, bmi)

    return {
        "bmi": bmi,
        "bmi_category": bmi_category,
        "waist_height_ratio": waist_height_ratio,
        "metabolic_syndrome_component_count": ms_count,
        "metabolic_syndrome_present": ms_present,
        "estimated_calorie_req": tdee,
        "calorie_deficit": calorie_deficit_target,
        "metabolic_risk_score": risk_score,
        "metabolic_risk_category": risk_category,
    }