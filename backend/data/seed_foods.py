"""
FNDDS 2021-2023 Food Database Seeder.
Loads the cleaned food database into PostgreSQL.

Usage:
    python data/seed_foods.py           # skips if already seeded
    python data/seed_foods.py --force   # re-seeds even if records exist
    python data/seed_foods.py --check   # just print record count and exit
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base, SessionLocal
from app.models.food import Food
from app.models import (  # noqa - register all models with Base
    User, PatientProfile, DietaryRecord, DietaryFoodItem, FFQResponse, DietPlan
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "fndds_clean.csv")


def seed_food_database(force: bool = False, check_only: bool = False) -> int:
    """
    Seed the food database.

    Args:
        force:      Delete and re-insert all records even if DB already has data.
        check_only: Print count and return without making changes.

    Returns:
        Number of food records in DB after operation.
    """
    print("🔧 Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        existing_count = db.query(Food).count()

        if check_only:
            print(f"ℹ️  Food records currently in DB: {existing_count}")
            return existing_count

        if existing_count > 0 and not force:
            print(f"✅ Food database already seeded ({existing_count} records). "
                  "Pass --force to re-seed.")
            return existing_count

        if existing_count > 0 and force:
            print(f"🗑️  --force flag set. Clearing {existing_count} existing food records...")
            db.query(Food).delete()
            db.commit()

        if not os.path.exists(CSV_PATH):
            print(f"❌ CSV not found at: {CSV_PATH}")
            sys.exit(1)

        print(f"📂 Loading from: {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)
        print(f"📊 Loaded {len(df)} records from CSV")

        # --- Validate & clean ---
        df = df.dropna(subset=["food_code", "main_description"])
        df["food_code"] = df["food_code"].astype(int)
        df["wweia_category_number"] = df["wweia_category_number"].astype(int)
        df["additional_description"] = df["additional_description"].fillna("").str.strip()
        df["main_description"] = df["main_description"].str.strip()

        bool_cols = [
            "is_anti_inflammatory", "is_pro_inflammatory", "is_low_gi",
            "is_fruit_vegetable", "is_high_fiber", "is_omega3_rich",
            "is_ultra_processed", "is_mufa_rich",
        ]
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].astype(bool)

        # --- Batch insert ---
        BATCH_SIZE = 500
        total = len(df)
        inserted = 0

        print(f"📥 Inserting {total} food records (batch size: {BATCH_SIZE})...")
        for i in range(0, total, BATCH_SIZE):
            batch = df.iloc[i : i + BATCH_SIZE]
            db.add_all([
                Food(
                    food_code=int(row["food_code"]),
                    main_description=row["main_description"],
                    additional_description=row["additional_description"] or None,
                    wweia_category_number=int(row["wweia_category_number"]),
                    wweia_category_description=row["wweia_category_description"],
                    is_anti_inflammatory=bool(row.get("is_anti_inflammatory", False)),
                    is_pro_inflammatory=bool(row.get("is_pro_inflammatory", False)),
                    is_low_gi=bool(row.get("is_low_gi", False)),
                    is_fruit_vegetable=bool(row.get("is_fruit_vegetable", False)),
                    is_high_fiber=bool(row.get("is_high_fiber", False)),
                    is_omega3_rich=bool(row.get("is_omega3_rich", False)),
                    is_ultra_processed=bool(row.get("is_ultra_processed", False)),
                    is_mufa_rich=bool(row.get("is_mufa_rich", False)),
                )
                for _, row in batch.iterrows()
            ])
            db.commit()
            inserted += len(batch)
            pct = int(inserted / total * 100)
            print(f"   [{pct:3d}%] {inserted}/{total} records inserted")

        final_count = db.query(Food).count()
        print(f"\n🎉 Seeding complete — {final_count} food records in database")
        print(f"   Anti-inflammatory : {db.query(Food).filter(Food.is_anti_inflammatory).count()}")
        print(f"   Pro-inflammatory  : {db.query(Food).filter(Food.is_pro_inflammatory).count()}")
        print(f"   Low-GI            : {db.query(Food).filter(Food.is_low_gi).count()}")
        print(f"   High-fiber        : {db.query(Food).filter(Food.is_high_fiber).count()}")
        print(f"   Omega-3 rich      : {db.query(Food).filter(Food.is_omega3_rich).count()}")
        print(f"   Ultra-processed   : {db.query(Food).filter(Food.is_ultra_processed).count()}")
        return final_count

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    check_flag = "--check" in sys.argv
    seed_food_database(force=force_flag, check_only=check_flag)