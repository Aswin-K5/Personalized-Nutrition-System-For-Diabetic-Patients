"""
ML Model Training Script for Metabolic Risk Prediction.
Compares with rule-based algorithm for research dashboard.

Run: python ml/train_model.py

Uses Random Forest + Gradient Boosting for comparison.
Features: Clinical + dietary parameters.
Targets: Metabolic risk category + recommended diet plan type.
"""
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_synthetic_training_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate realistic synthetic clinical data for training.
    In production: replace with real anonymized patient data.
    """
    np.random.seed(42)

    # Demographics
    age = np.random.randint(25, 80, n_samples)
    sex = np.random.choice([0, 1], n_samples)  # 0=female, 1=male
    bmi = np.random.normal(27.5, 5, n_samples).clip(16, 55)
    waist = np.where(sex == 1, np.random.normal(95, 12, n_samples), np.random.normal(85, 10, n_samples))

    # Lab values (correlated with BMI)
    fasting_glucose = 70 + (bmi - 18.5) * 2.5 + np.random.normal(0, 15, n_samples)
    fasting_glucose = fasting_glucose.clip(60, 400)

    triglycerides = 80 + (bmi - 18.5) * 4 + np.random.normal(0, 40, n_samples)
    triglycerides = triglycerides.clip(40, 800)

    hdl = np.where(
        sex == 1,
        55 - (bmi - 25) * 0.8 + np.random.normal(0, 8, n_samples),
        65 - (bmi - 25) * 0.8 + np.random.normal(0, 8, n_samples)
    ).clip(20, 100)

    bp_systolic = 100 + (bmi - 18.5) * 1.5 + age * 0.3 + np.random.normal(0, 12, n_samples)
    bp_systolic = bp_systolic.clip(80, 220)
    bp_diastolic = (bp_systolic * 0.65 + np.random.normal(0, 8, n_samples)).clip(50, 130)

    hs_crp = np.exp(np.random.normal(0.5, 0.8, n_samples)).clip(0.1, 50)

    # Dietary features
    fiber_g = np.random.normal(18, 7, n_samples).clip(3, 50)
    added_sugar_g = np.random.normal(35, 15, n_samples).clip(0, 150)
    sodium_mg = np.random.normal(2800, 700, n_samples).clip(500, 6000)
    omega3_g = np.random.normal(1.0, 0.5, n_samples).clip(0, 5)
    ultra_processed_pct = np.random.normal(35, 15, n_samples).clip(0, 100)
    fruit_veg_servings = np.random.normal(3, 1.5, n_samples).clip(0, 12)
    glycemic_load = np.random.normal(130, 40, n_samples).clip(30, 300)
    eating_window = np.random.normal(12, 2, n_samples).clip(6, 18)

    # Lifestyle
    activity_level = np.random.choice([0, 1, 2, 3, 4], n_samples, p=[0.3, 0.3, 0.2, 0.15, 0.05])
    sleep_hours = np.random.normal(6.5, 1.2, n_samples).clip(3, 10)
    smoking = np.random.choice([0, 1, 2], n_samples, p=[0.6, 0.2, 0.2])  # 0=never,1=former,2=current

    # Calculate metabolic syndrome components (labels)
    ms_components = np.zeros(n_samples)
    ms_components += (waist >= np.where(sex == 1, 90, 80)).astype(int)  # Abdominal obesity
    ms_components += (triglycerides >= 150).astype(int)
    ms_components += (hdl < np.where(sex == 1, 40, 50)).astype(int)
    ms_components += ((bp_systolic >= 130) | (bp_diastolic >= 85)).astype(int)
    ms_components += (fasting_glucose >= 100).astype(int)

    # Risk categories (target labels)
    risk_category = np.select(
        [ms_components <= 1, ms_components == 2, ms_components == 3, ms_components >= 4],
        ["Low Risk", "Mild", "Moderate", "Severe"],
        default="Mild"
    ).astype(str)

    # Recommended diet plan type (derived from dominant risk factors)
    plan_type = []
    for i in range(n_samples):
        if fasting_glucose[i] >= 126 or triglycerides[i] > 200:
            plan_type.append("Low-GI_Lipid-Control")
        elif bmi[i] >= 30 or (waist[i] >= (90 if sex[i] == 1 else 80)):
            plan_type.append("Caloric-Deficit_TRE")
        elif hs_crp[i] > 3:
            plan_type.append("Anti-Inflammatory_Mediterranean")
        elif ms_components[i] >= 3:
            plan_type.append("Comprehensive_Metabolic")
        else:
            plan_type.append("General_Healthy")

    df = pd.DataFrame({
        "age": age, "sex": sex, "bmi": bmi, "waist": waist,
        "fasting_glucose": fasting_glucose, "triglycerides": triglycerides,
        "hdl": hdl, "bp_systolic": bp_systolic, "bp_diastolic": bp_diastolic,
        "hs_crp": hs_crp, "fiber_g": fiber_g, "added_sugar_g": added_sugar_g,
        "sodium_mg": sodium_mg, "omega3_g": omega3_g,
        "ultra_processed_pct": ultra_processed_pct,
        "fruit_veg_servings": fruit_veg_servings,
        "glycemic_load": glycemic_load, "eating_window": eating_window,
        "activity_level": activity_level, "sleep_hours": sleep_hours,
        "smoking": smoking, "ms_components": ms_components,
        "risk_category": risk_category, "plan_type": plan_type,
    })
    return df


FEATURE_COLUMNS = [
    "age", "sex", "bmi", "waist", "fasting_glucose", "triglycerides",
    "hdl", "bp_systolic", "bp_diastolic", "hs_crp", "fiber_g",
    "added_sugar_g", "sodium_mg", "omega3_g", "ultra_processed_pct",
    "fruit_veg_servings", "glycemic_load", "eating_window",
    "activity_level", "sleep_hours", "smoking", "ms_components",
]


def train_and_save_models():
    print("📊 Generating synthetic training data...")
    df = generate_synthetic_training_data(5000)
    print(f"   Dataset: {df.shape[0]} patients")
    print(f"   Risk distribution:\n{df['risk_category'].value_counts()}")

    X = df[FEATURE_COLUMNS]
    y_risk = df["risk_category"]
    y_plan = df["plan_type"]

    # Encoders
    risk_encoder = LabelEncoder()
    plan_encoder = LabelEncoder()
    y_risk_enc = risk_encoder.fit_transform(y_risk)
    y_plan_enc = plan_encoder.fit_transform(y_plan)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, yr_train, yr_test, yp_train, yp_test = train_test_split(
        X_scaled, y_risk_enc, y_plan_enc, test_size=0.2, random_state=42, stratify=y_risk_enc
    )

    print("\n🤖 Training Risk Category Classifier (Random Forest)...")
    rf_risk = RandomForestClassifier(n_estimators=200, max_depth=12, min_samples_leaf=5, random_state=42, n_jobs=-1)
    rf_risk.fit(X_train, yr_train)
    risk_preds = rf_risk.predict(X_test)
    risk_acc = accuracy_score(yr_test, risk_preds)
    print(f"   Risk Category Accuracy: {risk_acc:.3f}")
    print(classification_report(yr_test, risk_preds, target_names=risk_encoder.classes_))

    cv_risk = cross_val_score(rf_risk, X_scaled, y_risk_enc, cv=5, scoring="accuracy")
    print(f"   5-fold CV Accuracy: {cv_risk.mean():.3f} ± {cv_risk.std():.3f}")

    print("\n🤖 Training Diet Plan Classifier (Gradient Boosting)...")
    gb_plan = GradientBoostingClassifier(n_estimators=150, max_depth=5, learning_rate=0.1, random_state=42)
    gb_plan.fit(X_train, yp_train)
    plan_preds = gb_plan.predict(X_test)
    plan_acc = accuracy_score(yp_test, plan_preds)
    print(f"   Plan Type Accuracy: {plan_acc:.3f}")
    print(classification_report(yp_test, plan_preds, target_names=plan_encoder.classes_))

    # Feature importance
    feature_importance = pd.DataFrame({
        "feature": FEATURE_COLUMNS,
        "importance": rf_risk.feature_importances_
    }).sort_values("importance", ascending=False)
    print("\n📈 Top 10 Feature Importances (Risk Model):")
    print(feature_importance.head(10).to_string(index=False))

    # Save models
    os.makedirs(SCRIPT_DIR, exist_ok=True)
    joblib.dump(rf_risk, os.path.join(SCRIPT_DIR, "diet_risk_model.pkl"))
    joblib.dump(gb_plan, os.path.join(SCRIPT_DIR, "diet_plan_model.pkl"))
    joblib.dump(scaler, os.path.join(SCRIPT_DIR, "scaler.pkl"))
    joblib.dump(risk_encoder, os.path.join(SCRIPT_DIR, "risk_label_encoder.pkl"))
    joblib.dump(plan_encoder, os.path.join(SCRIPT_DIR, "plan_label_encoder.pkl"))
    joblib.dump(FEATURE_COLUMNS, os.path.join(SCRIPT_DIR, "feature_columns.pkl"))

    print(f"\n✅ Models saved to {SCRIPT_DIR}/")
    return {
        "risk_accuracy": float(risk_acc),
        "plan_accuracy": float(plan_acc),
        "cv_mean": float(cv_risk.mean()),
        "cv_std": float(cv_risk.std()),
    }


if __name__ == "__main__":
    metrics = train_and_save_models()
    print(f"\n🎯 Final Metrics: {metrics}")