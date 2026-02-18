"""
ML Model Inference Service.
Loads trained models and provides predictions for diet plan comparison.
"""
import os
import numpy as np
import joblib
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")


class MLModelService:
    _instance = None
    _loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._loaded:
            self._load_models()

    def _load_models(self):
        try:
            self.risk_model = joblib.load(os.path.join(ML_DIR, "diet_risk_model.pkl"))
            self.plan_model = joblib.load(os.path.join(ML_DIR, "diet_plan_model.pkl"))
            self.scaler = joblib.load(os.path.join(ML_DIR, "scaler.pkl"))
            self.risk_encoder = joblib.load(os.path.join(ML_DIR, "risk_label_encoder.pkl"))
            self.plan_encoder = joblib.load(os.path.join(ML_DIR, "plan_label_encoder.pkl"))
            self.feature_columns = joblib.load(os.path.join(ML_DIR, "feature_columns.pkl"))
            self._loaded = True
            logger.info("✅ ML models loaded successfully")
        except FileNotFoundError as e:
            logger.warning(f"⚠️  ML models not found: {e}. Run ml/train_model.py first.")
            self._loaded = False
        except Exception as e:
            logger.error(f"❌ Error loading ML models: {e}")
            self._loaded = False

    def _build_feature_vector(self, patient_profile, dietary_record=None) -> np.ndarray:
        """Build feature vector from patient profile and dietary record."""
        p = patient_profile

        # Sex encoding
        sex_map = {"male": 1, "female": 0, "other": 0}
        sex_enc = sex_map.get(str(p.sex).split(".")[-1].lower(), 0)

        # Activity level encoding
        activity_map = {"sedentary": 0, "light": 1, "moderate": 2, "active": 3, "very_active": 4}
        activity_enc = activity_map.get(str(p.activity_level).split(".")[-1].lower(), 0)

        # Smoking encoding
        smoking_map = {"never": 0, "former": 1, "current": 2}
        smoking_enc = smoking_map.get(str(p.smoking_status).split(".")[-1].lower(), 0)

        # MS components
        ms_components = p.metabolic_syndrome_component_count or 0

        # Dietary features (defaults if no record)
        fiber_g = dietary_record.fiber_g if dietary_record and dietary_record.fiber_g else 18.0
        added_sugar_g = dietary_record.added_sugar_g if dietary_record and dietary_record.added_sugar_g else 35.0
        sodium_mg = dietary_record.sodium_mg if dietary_record and dietary_record.sodium_mg else 2800.0
        omega3_g = dietary_record.omega3_g if dietary_record and dietary_record.omega3_g else 1.0
        ultra_pct = dietary_record.ultra_processed_percent if dietary_record and dietary_record.ultra_processed_percent else 35.0
        fv_servings = dietary_record.fruit_veg_servings if dietary_record and dietary_record.fruit_veg_servings else 3.0
        gl = dietary_record.glycemic_load if dietary_record and dietary_record.glycemic_load else 130.0
        eating_window = dietary_record.eating_window_hours if dietary_record and dietary_record.eating_window_hours else 12.0

        features = [
            p.age or 45,
            sex_enc,
            p.bmi or 27.5,
            p.waist_circumference_cm or (90 if sex_enc == 1 else 82),
            p.fasting_glucose_mg_dl or 95,
            p.triglycerides_mg_dl or 140,
            p.hdl_cholesterol_mg_dl or (45 if sex_enc == 1 else 55),
            p.bp_systolic or 120,
            p.bp_diastolic or 80,
            p.hs_crp_mg_l or 1.5,
            fiber_g,
            added_sugar_g,
            sodium_mg,
            omega3_g,
            ultra_pct,
            fv_servings,
            gl,
            eating_window,
            activity_enc,
            p.sleep_duration_hours or 6.5,
            smoking_enc,
            ms_components,
        ]
        return np.array(features).reshape(1, -1)

    def predict(self, patient_profile, dietary_record=None) -> Dict[str, Any]:
        """
        Run ML prediction and return results.
        Returns empty dict if models not loaded.
        """
        if not self._loaded:
            return {
                "ml_confidence_score": None,
                "ml_predicted_risk_reduction": None,
                "ml_recommended_plan_type": None,
                "ml_risk_category": None,
                "ml_available": False,
            }

        try:
            X = self._build_feature_vector(patient_profile, dietary_record)
            X_scaled = self.scaler.transform(X)

            # Risk prediction
            risk_pred_enc = self.risk_model.predict(X_scaled)[0]
            risk_proba = self.risk_model.predict_proba(X_scaled)[0]
            risk_category = self.risk_encoder.inverse_transform([risk_pred_enc])[0]
            confidence = float(np.max(risk_proba))

            # Plan type prediction
            plan_pred_enc = self.plan_model.predict(X_scaled)[0]
            plan_proba = self.plan_model.predict_proba(X_scaled)[0]
            plan_type = self.plan_encoder.inverse_transform([plan_pred_enc])[0]

            # Estimated risk reduction (heuristic from plan quality)
            ms_score = patient_profile.metabolic_syndrome_component_count or 0
            base_reduction_map = {
                "Low Risk": 5.0, "Mild": 12.0, "Moderate": 20.0, "Severe": 28.0
            }
            predicted_reduction = base_reduction_map.get(risk_category, 15.0)

            return {
                "ml_confidence_score": round(confidence, 3),
                "ml_predicted_risk_reduction": round(predicted_reduction, 1),
                "ml_recommended_plan_type": plan_type,
                "ml_risk_category": risk_category,
                "ml_risk_probabilities": {
                    cls: round(float(prob), 3)
                    for cls, prob in zip(self.risk_encoder.classes_, risk_proba)
                },
                "ml_available": True,
            }

        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return {
                "ml_confidence_score": None,
                "ml_predicted_risk_reduction": None,
                "ml_recommended_plan_type": None,
                "ml_risk_category": None,
                "ml_available": False,
                "error": str(e),
            }

    def get_model_status(self) -> Dict[str, Any]:
        return {
            "models_loaded": self._loaded,
            "model_path": ML_DIR,
            "features": self.feature_columns if self._loaded else [],
        }


# Singleton
ml_service = MLModelService()