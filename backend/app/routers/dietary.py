from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.food import Food
from app.models.dietary_record import DietaryRecord, DietaryFoodItem, FFQResponse
from app.schemas.dietary import (
    DietaryRecallCreate, DietaryRecordOut, FFQCreate, FFQOut, FoodOut
)
from app.utils.auth import get_current_user
from app.services.dietary_scoring import (
    get_nutrient_estimate, calculate_dietary_inflammatory_score,
    calculate_chrononutrition_score, calculate_diet_quality_score
)

router = APIRouter(prefix="/dietary", tags=["Dietary Assessment"])


@router.get("/foods/search", response_model=List[FoodOut],
            summary="Search FNDDS food database")
def search_foods(
    q: str = Query(min_length=2, description="Search term (food name or description)"),
    limit: int = Query(15, ge=1, le=50),
    category: Optional[int] = Query(None, description="Filter by WWEIA category number"),
    low_gi_only: bool = Query(False),
    anti_inflammatory_only: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Search the FNDDS 2021-2023 food database (5,432 foods).
    Use for 24-hour recall food entry.
    """
    query = db.query(Food).filter(
        or_(
            Food.main_description.ilike(f"%{q}%"),
            Food.additional_description.ilike(f"%{q}%"),
            Food.wweia_category_description.ilike(f"%{q}%"),
        )
    )
    if category:
        query = query.filter(Food.wweia_category_number == category)
    if low_gi_only:
        query = query.filter(Food.is_low_gi == True)
    if anti_inflammatory_only:
        query = query.filter(Food.is_anti_inflammatory == True)

    return query.limit(limit).all()


@router.get("/foods/categories", summary="Get all WWEIA food categories")
def get_food_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get all 172 WWEIA food categories from FNDDS 2021-2023."""
    result = db.query(
        Food.wweia_category_number,
        Food.wweia_category_description
    ).distinct().order_by(Food.wweia_category_number).all()

    return [{"number": r[0], "description": r[1]} for r in result]


@router.post("/recall", response_model=DietaryRecordOut, status_code=status.HTTP_201_CREATED,
             summary="Submit 24-hour dietary recall")
def create_dietary_recall(
    payload: DietaryRecallCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a 24-hour dietary recall.
    Automatically calculates all nutritional variables:
    - Macro breakdown (carb/protein/fat %)
    - Quality indicators (fiber, sodium, added sugar, omega-3)
    - Glycemic load
    - Ultra-processed food %
    - Dietary Inflammatory Score
    - Chrononutrition Score
    """
    # Check no duplicate for same date
    existing = db.query(DietaryRecord).filter(
        DietaryRecord.user_id == current_user.id,
        DietaryRecord.recall_date == payload.recall_date
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recall already exists for {payload.recall_date}. Delete or use a different date."
        )

    # Calculate eating window
    eating_window_hours = None
    if payload.eating_window_start and payload.eating_window_end:
        start_dt = datetime.combine(date.today(), payload.eating_window_start)
        end_dt = datetime.combine(date.today(), payload.eating_window_end)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        eating_window_hours = round((end_dt - start_dt).seconds / 3600, 2)

    record = DietaryRecord(
        user_id=current_user.id,
        recall_date=payload.recall_date,
        eating_window_start=payload.eating_window_start,
        eating_window_end=payload.eating_window_end,
        eating_window_hours=eating_window_hours,
        skipped_breakfast=payload.skipped_breakfast,
        late_night_eating=payload.late_night_eating,
    )
    db.add(record)
    db.flush()

    # Process food items
    total_calories = 0
    total_carbs_kcal = 0
    total_protein_kcal = 0
    total_fat_kcal = 0
    total_fiber = 0
    total_sodium = 0
    total_glycemic_load = 0
    total_omega3 = 0
    ultra_processed_cal = 0
    fruit_veg_servings = 0
    added_sugar_g = 0
    saturated_fat_g = 0
    trans_fat_g = 0  # Trans fat from fried/processed foods

    food_items = []
    for item_in in payload.food_items:
        # Lookup food from DB to get category
        food = db.query(Food).filter(Food.food_code == item_in.food_code).first()
        wweia_cat = food.wweia_category_number if food else 9999
        is_ultra = food.is_ultra_processed if food else False
        is_fv = food.is_fruit_vegetable if food else False
        is_omega3 = food.is_omega3_rich if food else False

        nutrients = get_nutrient_estimate(wweia_cat, item_in.quantity_grams)

        item = DietaryFoodItem(
            dietary_record_id=record.id,
            food_code=item_in.food_code,
            food_description=item_in.food_description,
            quantity_grams=item_in.quantity_grams,
            meal_type=item_in.meal_type,
            meal_time=item_in.meal_time,
            calories=nutrients["calories"],
            carbs_g=nutrients["carbs_g"],
            protein_g=nutrients["protein_g"],
            fat_g=nutrients["fat_g"],
            fiber_g=nutrients["fiber_g"],
            sodium_mg=nutrients["sodium_mg"],
            is_ultra_processed=is_ultra,
        )
        food_items.append(item)

        total_calories += nutrients["calories"]
        total_carbs_kcal += nutrients["carbs_g"] * 4
        total_protein_kcal += nutrients["protein_g"] * 4
        total_fat_kcal += nutrients["fat_g"] * 9
        total_fiber += nutrients["fiber_g"]
        total_sodium += nutrients["sodium_mg"]
        total_glycemic_load += nutrients["glycemic_load"]

        if is_ultra:
            ultra_processed_cal += nutrients["calories"]
        if is_fv:
            fruit_veg_servings += item_in.quantity_grams / 80  # ~80g = 1 serving
        if is_omega3:
            total_omega3 += (nutrients["fat_g"] * 0.3)  # ~30% omega-3 of fat for fish

        # Estimate added sugar (from high-GI/dessert categories)
        if wweia_cat in [8802, 8804, 8806, 5702, 5704, 7202, 7204, 5502, 5504, 5506, 5802]:
            added_sugar_g += nutrients["carbs_g"] * 0.7

        # Estimate saturated fat
        if wweia_cat in [2002, 2004, 2006, 1002, 2604, 2606, 8006, 8008, 5802]:
            saturated_fat_g += nutrients["fat_g"] * 0.4

        # Estimate trans fat (fried foods, fast food, packaged baked goods, margarine)
        if wweia_cat in [2702, 2704, 2706, 2802, 2804, 5702, 5704, 5802, 8202]:
            trans_fat_g += nutrients["fat_g"] * 0.15  # ~15% trans fat in these categories

    db.add_all(food_items)

    # Calculate percentages
    total_macros_kcal = total_carbs_kcal + total_protein_kcal + total_fat_kcal
    if total_macros_kcal > 0:
        carb_pct = round(total_carbs_kcal / total_macros_kcal * 100, 1)
        prot_pct = round(total_protein_kcal / total_macros_kcal * 100, 1)
        fat_pct = round(total_fat_kcal / total_macros_kcal * 100, 1)
    else:
        carb_pct = prot_pct = fat_pct = 0

    ultra_pct = round(ultra_processed_cal / max(total_calories, 1) * 100, 1)
    fruit_veg_servings = round(fruit_veg_servings, 1)

    # Scores
    dis = calculate_dietary_inflammatory_score(
        total_fiber, saturated_fat_g, trans_fat_g, added_sugar_g, total_omega3, fruit_veg_servings
    )
    chron_score = calculate_chrononutrition_score(
        eating_window_hours, payload.skipped_breakfast, payload.late_night_eating,
        len(set(item_in.meal_type for item_in in payload.food_items))
    )
    quality_score = calculate_diet_quality_score(
        carb_pct, prot_pct, fat_pct, total_fiber, total_sodium,
        ultra_pct, fruit_veg_servings
    )

    # Update record
    record.total_calories = round(total_calories, 1)
    record.carb_percent = carb_pct
    record.protein_percent = prot_pct
    record.fat_percent = fat_pct
    record.saturated_fat_g = round(saturated_fat_g, 1)
    record.trans_fat_g = round(trans_fat_g, 2)  # Trans fat (grams)
    record.fiber_g = round(total_fiber, 1)
    record.added_sugar_g = round(added_sugar_g, 1)
    record.sodium_mg = round(total_sodium, 1)
    record.omega3_g = round(total_omega3, 2)
    record.ultra_processed_percent = ultra_pct
    record.glycemic_load = round(total_glycemic_load, 1)
    record.fruit_veg_servings = fruit_veg_servings
    record.dietary_inflammatory_score = dis
    record.chrononutrition_score = chron_score
    record.diet_quality_score = quality_score

    db.commit()
    db.refresh(record)
    return record


@router.get("/recall", response_model=List[DietaryRecordOut], summary="List all dietary recalls")
def list_dietary_recalls(
    skip: int = 0,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(DietaryRecord)
        .filter(DietaryRecord.user_id == current_user.id)
        .order_by(DietaryRecord.recall_date.desc())
        .offset(skip).limit(limit).all()
    )


@router.get("/recall/{record_id}", response_model=DietaryRecordOut, summary="Get specific recall")
def get_dietary_recall(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(DietaryRecord).filter(
        DietaryRecord.id == record_id,
        DietaryRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dietary record not found")
    return record


@router.delete("/recall/{record_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a dietary recall")
def delete_dietary_recall(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(DietaryRecord).filter(
        DietaryRecord.id == record_id,
        DietaryRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dietary record not found")
    db.delete(record)
    db.commit()


@router.post("/ffq", response_model=FFQOut, status_code=status.HTTP_201_CREATED,
             summary="Submit Food Frequency Questionnaire")
def submit_ffq(
    payload: FFQCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a Food Frequency Questionnaire (FFQ) structured response."""
    ffq = FFQResponse(user_id=current_user.id, **payload.model_dump())
    db.add(ffq)
    db.commit()
    db.refresh(ffq)
    return ffq


@router.get("/ffq", response_model=List[FFQOut], summary="List FFQ submissions")
def list_ffq(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(FFQResponse)
        .filter(FFQResponse.user_id == current_user.id)
        .order_by(FFQResponse.assessment_date.desc())
        .all()
    )