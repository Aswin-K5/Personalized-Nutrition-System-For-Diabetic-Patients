"""
Dietary Scoring Services:
1. Dietary Inflammatory Score (DIS)
2. Chrononutrition Score
3. Glycemic Load estimation
4. Diet Quality Score
"""
from typing import Optional, List
from datetime import time, datetime


# ─── Category-based nutrient estimates per 100g ───────────────────────────────
# Approximate nutrient profiles by WWEIA category for estimation
NUTRIENT_ESTIMATES = {
    # Format: wweia_cat_number: {calories, carbs_g, protein_g, fat_g, fiber_g, sodium_mg, gi}
    # Dairy
    1002: {"calories": 61, "carbs": 4.7, "protein": 3.2, "fat": 3.3, "fiber": 0, "sodium": 43, "gi": 27},
    1004: {"calories": 50, "carbs": 4.8, "protein": 3.3, "fat": 1.9, "fiber": 0, "sodium": 47, "gi": 27},
    1006: {"calories": 42, "carbs": 5.0, "protein": 3.4, "fat": 1.0, "fiber": 0, "sodium": 44, "gi": 30},
    1602: {"calories": 403, "carbs": 1.3, "protein": 25, "fat": 33, "fiber": 0, "sodium": 621, "gi": 0},
    # Meat
    2002: {"calories": 250, "carbs": 0, "protein": 26, "fat": 17, "fiber": 0, "sodium": 72, "gi": 0},
    2004: {"calories": 260, "carbs": 0, "protein": 25, "fat": 18, "fiber": 0, "sodium": 76, "gi": 0},
    2006: {"calories": 242, "carbs": 0, "protein": 27, "fat": 14, "fiber": 0, "sodium": 62, "gi": 0},
    2202: {"calories": 165, "carbs": 0, "protein": 31, "fat": 4, "fiber": 0, "sodium": 74, "gi": 0},
    # Fish/Seafood
    2402: {"calories": 206, "carbs": 0, "protein": 22, "fat": 13, "fiber": 0, "sodium": 59, "gi": 0},
    2404: {"calories": 99, "carbs": 0, "protein": 20, "fat": 2, "fiber": 0, "sodium": 294, "gi": 0},
    # Eggs
    2502: {"calories": 155, "carbs": 1.1, "protein": 13, "fat": 11, "fiber": 0, "sodium": 124, "gi": 0},
    # Processed meats
    2602: {"calories": 300, "carbs": 3, "protein": 12, "fat": 27, "fiber": 0, "sodium": 1100, "gi": 0},
    2604: {"calories": 541, "carbs": 1.5, "protein": 37, "fat": 43, "fiber": 0, "sodium": 1717, "gi": 0},
    # Legumes
    2802: {"calories": 130, "carbs": 22, "protein": 9, "fat": 0.5, "fiber": 7, "sodium": 4, "gi": 29},
    2804: {"calories": 607, "carbs": 21, "protein": 21, "fat": 54, "fiber": 8, "sodium": 5, "gi": 15},
    # Rice/Grains
    4002: {"calories": 130, "carbs": 28, "protein": 2.7, "fat": 0.3, "fiber": 0.4, "sodium": 1, "gi": 73},
    4004: {"calories": 158, "carbs": 31, "protein": 5.8, "fat": 0.9, "fiber": 1.8, "sodium": 1, "gi": 50},
    # Bread
    4202: {"calories": 265, "carbs": 51, "protein": 9, "fat": 3, "fiber": 2.4, "sodium": 491, "gi": 70},
    4204: {"calories": 270, "carbs": 50, "protein": 9.3, "fat": 3.1, "fiber": 2.3, "sodium": 474, "gi": 72},
    4208: {"calories": 218, "carbs": 36, "protein": 5.6, "fat": 5, "fiber": 2.4, "sodium": 458, "gi": 68},
    # Cereals
    4602: {"calories": 385, "carbs": 83, "protein": 7, "fat": 3, "fiber": 5, "sodium": 320, "gi": 81},
    4604: {"calories": 370, "carbs": 80, "protein": 9, "fat": 3, "fiber": 10, "sodium": 320, "gi": 55},
    4802: {"calories": 68, "carbs": 12, "protein": 2.4, "fat": 1.4, "fiber": 1.7, "sodium": 49, "gi": 55},
    # Snacks
    5002: {"calories": 536, "carbs": 53, "protein": 7, "fat": 35, "fiber": 3.8, "sodium": 525, "gi": 70},
    5004: {"calories": 489, "carbs": 58, "protein": 7, "fat": 26, "fiber": 4.4, "sodium": 445, "gi": 65},
    5502: {"calories": 389, "carbs": 55, "protein": 4.4, "fat": 18, "fiber": 1, "sodium": 326, "gi": 65},
    5504: {"calories": 480, "carbs": 68, "protein": 5, "fat": 21, "fiber": 2, "sodium": 320, "gi": 70},
    5702: {"calories": 546, "carbs": 59, "protein": 4.7, "fat": 30, "fiber": 3.7, "sodium": 40, "gi": 43},
    # Fruits
    6002: {"calories": 52, "carbs": 14, "protein": 0.3, "fat": 0.2, "fiber": 2.4, "sodium": 1, "gi": 36},
    6004: {"calories": 89, "carbs": 23, "protein": 1.1, "fat": 0.3, "fiber": 2.6, "sodium": 1, "gi": 51},
    6006: {"calories": 69, "carbs": 18, "protein": 0.7, "fat": 0.2, "fiber": 0.9, "sodium": 2, "gi": 53},
    6009: {"calories": 32, "carbs": 7.7, "protein": 0.7, "fat": 0.3, "fiber": 2, "sodium": 1, "gi": 40},
    6011: {"calories": 57, "carbs": 14, "protein": 0.7, "fat": 0.3, "fiber": 2.4, "sodium": 1, "gi": 25},
    6012: {"calories": 47, "carbs": 12, "protein": 0.9, "fat": 0.1, "fiber": 2.3, "sodium": 1, "gi": 42},
    6014: {"calories": 34, "carbs": 8, "protein": 0.8, "fat": 0.2, "fiber": 0.9, "sodium": 1, "gi": 65},
    6018: {"calories": 55, "carbs": 14, "protein": 0.5, "fat": 0.2, "fiber": 2, "sodium": 1, "gi": 45},
    6022: {"calories": 50, "carbs": 13, "protein": 0.5, "fat": 0.1, "fiber": 1.4, "sodium": 1, "gi": 59},
    6024: {"calories": 60, "carbs": 15, "protein": 0.8, "fat": 0.4, "fiber": 1.6, "sodium": 1, "gi": 55},
    # Vegetables
    6402: {"calories": 18, "carbs": 3.9, "protein": 0.9, "fat": 0.2, "fiber": 1.2, "sodium": 5, "gi": 30},
    6404: {"calories": 41, "carbs": 10, "protein": 0.9, "fat": 0.2, "fiber": 2.8, "sodium": 69, "gi": 35},
    6407: {"calories": 34, "carbs": 6.6, "protein": 2.8, "fat": 0.4, "fiber": 2.6, "sodium": 33, "gi": 15},
    6409: {"calories": 23, "carbs": 3.6, "protein": 2.9, "fat": 0.4, "fiber": 2.2, "sodium": 79, "gi": 15},
    6410: {"calories": 15, "carbs": 2.9, "protein": 1.4, "fat": 0.2, "fiber": 1.9, "sodium": 28, "gi": 15},
    6411: {"calories": 35, "carbs": 6.8, "protein": 3.3, "fat": 0.4, "fiber": 3.8, "sodium": 19, "gi": 15},
    6420: {"calories": 65, "carbs": 14, "protein": 3.3, "fat": 0.3, "fiber": 4.5, "sodium": 16, "gi": 20},
    # Potatoes
    6802: {"calories": 77, "carbs": 17, "protein": 2, "fat": 0.1, "fiber": 2.2, "sodium": 6, "gi": 82},
    6804: {"calories": 312, "carbs": 41, "protein": 3.4, "fat": 15, "fiber": 3.8, "sodium": 210, "gi": 76},
    # Juices & Beverages
    7002: {"calories": 45, "carbs": 11, "protein": 0.7, "fat": 0.2, "fiber": 0.2, "sodium": 1, "gi": 50},
    7004: {"calories": 46, "carbs": 11, "protein": 0.1, "fat": 0.1, "fiber": 0.2, "sodium": 4, "gi": 41},
    7202: {"calories": 41, "carbs": 11, "protein": 0.1, "fat": 0, "fiber": 0, "sodium": 10, "gi": 63},
    7204: {"calories": 47, "carbs": 11, "protein": 0, "fat": 0, "fiber": 0, "sodium": 15, "gi": 55},
    7302: {"calories": 1, "carbs": 0, "protein": 0, "fat": 0, "fiber": 0, "sodium": 14, "gi": 0},
    7304: {"calories": 1, "carbs": 0.1, "protein": 0.1, "fat": 0, "fiber": 0, "sodium": 4, "gi": 0},
    # Fats/Oils
    8006: {"calories": 717, "carbs": 0.1, "protein": 0.9, "fat": 81, "fiber": 0, "sodium": 2, "gi": 0},
    8010: {"calories": 680, "carbs": 0.1, "protein": 0.1, "fat": 75, "fiber": 0, "sodium": 94, "gi": 0},
    8012: {"calories": 884, "carbs": 0, "protein": 0, "fat": 100, "fiber": 0, "sodium": 0, "gi": 0},
    # Sugars
    8802: {"calories": 304, "carbs": 82, "protein": 0.3, "fat": 0, "fiber": 0.2, "sodium": 11, "gi": 65},
    # Default fallback
    9999: {"calories": 100, "carbs": 15, "protein": 5, "fat": 3, "fiber": 1, "sodium": 100, "gi": 50},
}

DEFAULT_NUTRIENTS = {"calories": 100, "carbs": 15, "protein": 5, "fat": 3, "fiber": 1, "sodium": 100, "gi": 50}


def get_nutrient_estimate(wweia_category: int, quantity_grams: float) -> dict:
    """Get nutrient estimate for a food item based on WWEIA category."""
    profile = NUTRIENT_ESTIMATES.get(wweia_category, DEFAULT_NUTRIENTS)
    factor = quantity_grams / 100.0
    return {
        "calories": round(profile["calories"] * factor, 1),
        "carbs_g": round(profile["carbs"] * factor, 1),
        "protein_g": round(profile["protein"] * factor, 1),
        "fat_g": round(profile["fat"] * factor, 1),
        "fiber_g": round(profile["fiber"] * factor, 2),
        "sodium_mg": round(profile["sodium"] * factor, 1),
        "glycemic_index": profile["gi"],
        "glycemic_load": round((profile["gi"] * profile["carbs"] * factor) / 100, 2),
    }


def calculate_dietary_inflammatory_score(
    fiber_g: float,
    saturated_fat_g: float,
    trans_fat_g: float,
    added_sugar_g: float,
    omega3_g: float,
    fruit_veg_servings: float,
) -> str:
    """
    Dietary Inflammatory Score.
    Returns: 'Anti-inflammatory', 'Neutral', or 'Pro-inflammatory'
    """
    score = 0

    # Fiber: >25g/day anti-inflammatory (+2), 15-25 neutral (0), <15 pro (+score)
    if fiber_g >= 25:
        score -= 2
    elif fiber_g >= 15:
        score -= 1
    else:
        score += 2

    # Saturated fat: <7% of calories (assume 2000 kcal = 15g) is ok
    if saturated_fat_g <= 10:
        score -= 1
    elif saturated_fat_g <= 20:
        score += 0
    else:
        score += 2

    # Trans fat: HIGHLY pro-inflammatory (should be ~0g)
    if trans_fat_g < 0.5:
        score -= 1  # Negligible trans fat
    elif trans_fat_g < 2:
        score += 1  # Some trans fat
    else:
        score += 3  # High trans fat - very pro-inflammatory

    # Added sugar: <25g (WHO) anti-inflammatory, >50g highly pro
    if added_sugar_g <= 25:
        score -= 1
    elif added_sugar_g <= 50:
        score += 1
    else:
        score += 2

    # Omega-3: >1.6g/day (men) / >1.1g (women) good
    if omega3_g >= 1.5:
        score -= 2
    elif omega3_g >= 0.5:
        score -= 1
    else:
        score += 1

    # Fruits & Vegetables: ≥5 servings/day is protective
    if fruit_veg_servings >= 5:
        score -= 2
    elif fruit_veg_servings >= 3:
        score -= 1
    else:
        score += 1

    if score <= -2:
        return "Anti-inflammatory"
    elif score <= 2:
        return "Neutral"
    else:
        return "Pro-inflammatory"


def calculate_chrononutrition_score(
    eating_window_hours: Optional[float],
    skipped_breakfast: bool,
    late_night_eating: bool,
    meal_count: int,
) -> float:
    """
    Chrononutrition Score (0-10, higher = better).
    Penalizes extended eating windows, skipped breakfast, late-night eating.
    """
    score = 10.0

    # Eating window
    if eating_window_hours is not None:
        if eating_window_hours > 14:
            score -= 3
        elif eating_window_hours > 12:
            score -= 2
        elif eating_window_hours > 10:
            score -= 1
        # <10 hours (TRE): no penalty

    # Breakfast skipping
    if skipped_breakfast:
        score -= 2

    # Late-night eating (after 9 PM)
    if late_night_eating:
        score -= 2

    # Meal regularity: ideal 3-5 meals
    if meal_count < 2 or meal_count > 6:
        score -= 1

    return max(0.0, round(score, 1))


def calculate_diet_quality_score(
    carb_percent: float,
    protein_percent: float,
    fat_percent: float,
    fiber_g: float,
    sodium_mg: float,
    ultra_processed_percent: float,
    fruit_veg_servings: float,
) -> float:
    """
    Overall diet quality score (0-100).
    Based on alignment with evidence-based targets for diabetes/metabolic syndrome.
    """
    score = 100.0

    # Carbohydrates: 40-55% of calories is optimal for T2DM
    if carb_percent < 35 or carb_percent > 65:
        score -= 15
    elif carb_percent < 40 or carb_percent > 60:
        score -= 5

    # Protein: 15-25%
    if protein_percent < 10 or protein_percent > 35:
        score -= 10
    elif protein_percent < 15 or protein_percent > 30:
        score -= 5

    # Fiber: ≥25g/day
    if fiber_g < 10:
        score -= 20
    elif fiber_g < 20:
        score -= 10
    elif fiber_g >= 30:
        score += 5

    # Sodium: <2300 mg/day
    if sodium_mg > 3500:
        score -= 20
    elif sodium_mg > 2300:
        score -= 10

    # Ultra-processed: <10% ideal
    if ultra_processed_percent > 50:
        score -= 20
    elif ultra_processed_percent > 30:
        score -= 10
    elif ultra_processed_percent > 15:
        score -= 5

    # Fruit & vegetables: ≥5 servings/day
    if fruit_veg_servings >= 5:
        score += 5
    elif fruit_veg_servings < 3:
        score -= 10

    return max(0.0, min(100.0, round(score, 1)))