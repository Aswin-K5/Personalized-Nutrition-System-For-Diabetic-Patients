"""
Evidence-Based Clinical Rule Engine for Diabetes & Metabolic Syndrome Dietary Recommendations.

References:
- ADA Standards of Medical Care in Diabetes 2024
- ACC/AHA Lifestyle Management Guidelines
- Mediterranean / DASH / Low-GI diet evidence
"""
from typing import Dict, Any, List, Optional
from app.models.patient import SexEnum


# Sex-specific HDL thresholds (ATP III)
HDL_LOW_THRESHOLD = {SexEnum.MALE: 40.0, SexEnum.FEMALE: 50.0, SexEnum.OTHER: 45.0}
WAIST_CUTOFF = {SexEnum.MALE: 90.0, SexEnum.FEMALE: 80.0, SexEnum.OTHER: 85.0}  # Asian IDF


class RuleEngine:
    """
    Clinical Decision Rule Engine.
    Evaluates patient profile, dietary recall, and FFQ data to generate
    personalised dietary recommendations.
    """

    def __init__(self, patient_profile, dietary_record=None, ffq=None):
        self.profile = patient_profile
        self.dietary = dietary_record
        self.ffq     = ffq
        self.triggered_rules: List[Dict[str, Any]] = []
        self.modules: Dict[str, bool] = {
            "low_gi_plan":            False,
            "calorie_deficit_plan":   False,
            "anti_inflammatory_diet": False,
            "omega3_emphasis":        False,
            "mufa_emphasis":          False,
            "soluble_fiber_emphasis": False,
            "time_restricted_eating": False,
            "portion_control":        False,
            "carb_distribution":      False,
        }
        self.food_recommendations: List[Dict[str, Any]] = []
        self.lifestyle_reminders:  List[str]            = []
        self.meal_pattern:         Dict[str, Any]       = {}

    def _add_rule(self, name: str, reason: str, recs: List[str]):
        self.triggered_rules.append({
            "rule_name": name,
            "triggered": True,
            "reason":    reason,
            "recommendations": recs,
        })

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 1 — LIPIDS
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_lipid_rules(self):
        p = self.profile

        # High Triglycerides
        if p.triglycerides_mg_dl and p.triglycerides_mg_dl > 150:
            self.modules["omega3_emphasis"]        = True
            self.modules["soluble_fiber_emphasis"] = True
            self.food_recommendations.append({
                "category": "Omega-3 Rich Foods", "action": "increase",
                "foods": ["Salmon", "Mackerel", "Sardines", "Flaxseed", "Walnuts", "Chia seeds"],
                "reason": f"TG {p.triglycerides_mg_dl} mg/dL > 150 threshold. Omega-3 reduces TG by 20-30%."
            })
            self.food_recommendations.append({
                "category": "Refined Carbohydrates", "action": "decrease",
                "foods": ["White bread", "White rice", "Sugary drinks", "Pastries", "Candy"],
                "reason": "Refined carbs directly raise triglycerides. Target <50g added sugar/day."
            })
            self.food_recommendations.append({
                "category": "Soluble Fibre Sources", "action": "increase",
                "foods": ["Oats", "Barley", "Black beans", "Lentils", "Apples", "Psyllium"],
                "reason": "Soluble fibre reduces TG absorption and improves lipid profile."
            })
            self._add_rule(
                "HIGH_TRIGLYCERIDES",
                f"TG = {p.triglycerides_mg_dl} mg/dL (target <150 mg/dL)",
                ["Reduce refined carbs and added sugar", "Increase omega-3 rich foods 2-3x/week",
                 "Add 10g soluble fibre daily", "Limit alcohol completely"]
            )

        # Low HDL
        hdl_threshold = HDL_LOW_THRESHOLD.get(p.sex, 45.0)
        if p.hdl_cholesterol_mg_dl and p.hdl_cholesterol_mg_dl < hdl_threshold:
            self.modules["mufa_emphasis"] = True
            self.food_recommendations.append({
                "category": "Healthy Fats (MUFA)", "action": "increase",
                "foods": ["Olive oil", "Avocado", "Almonds", "Pistachios", "Olives", "Peanuts"],
                "reason": f"HDL {p.hdl_cholesterol_mg_dl} mg/dL < {hdl_threshold} threshold. MUFA raises HDL."
            })
            self.food_recommendations.append({
                "category": "Trans Fats", "action": "avoid",
                "foods": ["Margarine", "Fried fast food", "Commercial baked goods", "Partially hydrogenated oils"],
                "reason": "Trans fats lower HDL and raise LDL — avoid completely."
            })
            self.lifestyle_reminders.append("🏃 Aim for 150+ min/week of moderate exercise — this raises HDL by 5-10%")
            self.lifestyle_reminders.append("🚭 Smoking cessation is the most powerful single intervention to raise HDL")
            self._add_rule(
                "LOW_HDL",
                f"HDL = {p.hdl_cholesterol_mg_dl} mg/dL (target ≥{hdl_threshold} mg/dL)",
                ["Increase healthy fat intake (olive oil, avocado, nuts)",
                 "Eliminate trans fats completely",
                 "150 min/week aerobic exercise"]
            )

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 2 — GLUCOSE
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_glucose_rules(self):
        p = self.profile
        if p.fasting_glucose_mg_dl and p.fasting_glucose_mg_dl > 100:
            self.modules["low_gi_plan"]      = True
            self.modules["carb_distribution"] = True

            glucose_label = (
                f"Diabetes (FG={p.fasting_glucose_mg_dl} ≥126 mg/dL)" if p.fasting_glucose_mg_dl >= 126
                else f"Prediabetes (FG={p.fasting_glucose_mg_dl} 100-125 mg/dL)"
            )
            self.food_recommendations.append({
                "category": "Low Glycaemic Foods", "action": "increase",
                "foods": ["Lentils", "Chickpeas", "Steel-cut oats", "Barley",
                          "Non-starchy vegetables", "Berries", "Nuts", "Whole grain bread (GI<55)"],
                "reason": f"{glucose_label}. Low-GI diet reduces HbA1c by 0.5-1.0%."
            })
            self.food_recommendations.append({
                "category": "High Glycaemic Foods", "action": "decrease",
                "foods": ["White rice", "White bread", "Potatoes", "Corn flakes", "Sugary drinks"],
                "reason": "High-GI foods cause rapid glucose spikes — switch to low-GI alternatives."
            })
            self.lifestyle_reminders.append("🚶 Walk 10-15 min after each meal — reduces post-meal glucose by 20-30%")
            self.lifestyle_reminders.append("⏰ Spread carbs across 3 meals — avoid carb-heavy dinners")
            self.meal_pattern = {
                "strategy": "Carbohydrate Distribution",
                "breakfast_carbs_percent": 25,
                "lunch_carbs_percent":     35,
                "dinner_carbs_percent":    30,
                "snacks_carbs_percent":    10,
                "recommended_meal_times": {
                    "breakfast":         "7:00–8:00 AM",
                    "mid_morning_snack": "10:00–10:30 AM (optional)",
                    "lunch":             "12:30–1:30 PM",
                    "afternoon_snack":   "3:30–4:00 PM (optional)",
                    "dinner":            "6:30–7:30 PM (before 8 PM)"
                }
            }
            self._add_rule(
                "ELEVATED_FASTING_GLUCOSE", glucose_label,
                ["Follow low-GI meal plan (target glycaemic load <20 per meal)",
                 "Distribute carbohydrates: 25% breakfast, 35% lunch, 30% dinner",
                 "Include protein at every meal to blunt glucose response",
                 "Post-meal 10-15 min walk after each meal"]
            )

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 3 — OBESITY
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_obesity_rules(self):
        p = self.profile
        waist_cutoff   = WAIST_CUTOFF.get(p.sex, 85.0)
        waist_elevated = p.waist_circumference_cm and p.waist_circumference_cm >= waist_cutoff
        bmi_elevated   = p.bmi and p.bmi >= 25.0

        if waist_elevated or bmi_elevated:
            self.modules["calorie_deficit_plan"] = True
            self.modules["portion_control"]      = True

            reasons = []
            if waist_elevated: reasons.append(f"Waist {p.waist_circumference_cm}cm ≥ {waist_cutoff}cm cutoff")
            if bmi_elevated:   reasons.append(f"BMI {p.bmi:.1f} ≥ 25 (Overweight/Obese)")

            tdee           = p.estimated_calorie_req or 2000
            deficit_target = p.calorie_deficit or (tdee - 500)

            self.food_recommendations.append({
                "category": "Portion Control", "action": "strategy",
                "foods": [],
                "reason": " | ".join(reasons),
                "details": {
                    "plate_method":     "½ plate non-starchy vegetables, ¼ plate lean protein, ¼ plate whole grains",
                    "target_calories":  deficit_target,
                    "calorie_reduction": f"{int(tdee - deficit_target)} kcal/day deficit",
                }
            })
            if waist_elevated:
                self.modules["time_restricted_eating"] = True
                self.lifestyle_reminders.append(
                    f"⏱️ Limit your eating window to 8-10 hours per day (e.g. 8 AM–6 PM). "
                    f"Time-restricted eating reduces waist circumference in clinical studies."
                )
            self._add_rule(
                "ABDOMINAL_OBESITY", " | ".join(reasons),
                [f"Calorie target: {int(deficit_target)} kcal/day",
                 "Plate method: ½ vegetables, ¼ protein, ¼ complex carbs",
                 "10-hour eating window",
                 "Reduce liquid calories (juices, sodas, alcohol)"]
            )

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 4 — INFLAMMATION
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_inflammation_rules(self):
        p = self.profile
        hs_crp_elevated = p.hs_crp_mg_l and p.hs_crp_mg_l > 3.0
        dis_elevated    = (self.dietary and
                           self.dietary.dietary_inflammatory_score == "Pro-inflammatory")

        if hs_crp_elevated or dis_elevated:
            self.modules["anti_inflammatory_diet"] = True
            reasons = []
            if hs_crp_elevated: reasons.append(f"hs-CRP {p.hs_crp_mg_l} mg/L > 3.0 (high cardiovascular risk)")
            if dis_elevated:    reasons.append("Current dietary pattern is Pro-inflammatory")

            self.food_recommendations.append({
                "category": "Anti-Inflammatory Foods", "action": "increase",
                "foods": ["Berries", "Leafy greens (spinach, kale)", "Olive oil",
                          "Fatty fish (salmon, mackerel)", "Turmeric", "Green tea",
                          "Broccoli", "Walnuts", "Tomatoes"],
                "reason": " | ".join(reasons)
            })
            self.food_recommendations.append({
                "category": "Processed Foods", "action": "decrease",
                "foods": ["Fast food", "Chips", "Packaged snacks", "Processed meats",
                          "Margarine", "Sugary drinks"],
                "reason": "Ultra-processed foods increase CRP and systemic inflammation markers."
            })
            self.food_recommendations.append({
                "category": "Fruits & Vegetables", "action": "increase",
                "foods": ["All colourful vegetables", "Cruciferous vegetables", "Citrus fruits"],
                "reason": "Target ≥5 servings/day. Each additional serving reduces CRP by ~4%."
            })
            self.lifestyle_reminders.append("🥗 Mediterranean-style eating strongly recommended for inflammation reduction")
            self.lifestyle_reminders.append("🫐 Aim for 5+ different coloured vegetables and fruits daily")
            self._add_rule(
                "ELEVATED_INFLAMMATION", " | ".join(reasons),
                ["Switch to anti-inflammatory dietary pattern",
                 "Increase fruit & vegetable intake: ≥7 servings/day",
                 "Reduce ultra-processed food to <10% of total calories",
                 "Include anti-inflammatory spices: turmeric, ginger, garlic daily"]
            )

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 5 — CHRONONUTRITION
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_chrononutrition_rules(self):
        if not self.dietary:
            return
        d = self.dietary
        if d.eating_window_hours and d.eating_window_hours > 12:
            self.lifestyle_reminders.append(
                f"⏰ Your eating window ({d.eating_window_hours:.1f}h) is too long. "
                "Aim for an 8-10 hour eating window."
            )
            self.modules["time_restricted_eating"] = True
        if d.skipped_breakfast:
            self.lifestyle_reminders.append(
                "🍳 Breakfast skipping detected. Eating breakfast improves insulin sensitivity "
                "and reduces glucose variability throughout the day."
            )
        if d.late_night_eating:
            self.lifestyle_reminders.append(
                "🌙 Late-night eating detected. Stop eating by 8 PM to align with your body clock. "
                "Evening calories increase triglycerides and glucose levels."
            )

    # ─────────────────────────────────────────────────────────────────────────
    # RULE GROUP 6 — FFQ (Food Frequency Questionnaire)
    # ─────────────────────────────────────────────────────────────────────────
    def evaluate_ffq_rules(self):
        """
        Use long-term dietary pattern data from the FFQ to refine and supplement
        the clinical rules. These rules reinforce or add to the 24-hour recall findings.
        """
        if not self.ffq:
            return

        f   = self.ffq
        triggered_reasons = []

        # ── Fish intake < 2 servings/week → Omega-3 emphasis ──
        fish_intake = f.fish_servings_week or 0
        if fish_intake < 2:
            self.modules["omega3_emphasis"] = True
            shortfall = round(2 - fish_intake, 1)
            self.food_recommendations.append({
                "category": "Fish & Seafood", "action": "increase",
                "foods": ["Salmon", "Sardines", "Mackerel", "Tuna", "Trout"],
                "reason": (
                    f"You're eating {fish_intake} fish servings/week — below the recommended ≥2. "
                    f"Increase by {shortfall} servings/week for omega-3 and heart benefits."
                )
            })
            triggered_reasons.append(f"Low fish intake ({fish_intake}/week)")

        # ── High red meat (>4/week) or processed meat (>2/week) → Anti-inflammatory ──
        red_meat       = f.red_meat_servings_week or 0
        processed_meat = f.processed_meat_servings_week or 0
        if red_meat > 4 or processed_meat > 2:
            self.modules["anti_inflammatory_diet"] = True
            details = []
            if red_meat > 4:       details.append(f"red meat {red_meat}/week (limit <4)")
            if processed_meat > 2: details.append(f"processed meat {processed_meat}/week (limit ≤2)")
            self.food_recommendations.append({
                "category": "Red & Processed Meat", "action": "reduce",
                "foods": ["Bacon", "Sausages", "Deli meats", "Beef (fatty cuts)", "Pork belly"],
                "reason": (
                    f"High intake of {' and '.join(details)} increases inflammation and "
                    "cardiovascular risk. Replace with fish, legumes or poultry."
                )
            })
            triggered_reasons.append(f"High meat intake ({' | '.join(details)})")

        # ── Low vegetables (<3 servings/day) → Anti-inflammatory + soluble fibre ──
        veg_intake = f.vegetables_servings_day or 0
        if veg_intake < 3:
            self.modules["anti_inflammatory_diet"]   = True
            self.modules["soluble_fiber_emphasis"]   = True
            shortfall = round(5 - veg_intake, 1)
            self.food_recommendations.append({
                "category": "Vegetables", "action": "increase",
                "foods": ["Broccoli", "Spinach", "Kale", "Capsicum", "Cucumber",
                          "Tomatoes", "Carrots", "Cauliflower"],
                "reason": (
                    f"You're eating {veg_intake} vegetable servings/day — well below the target of 5. "
                    f"Add {shortfall} more servings daily to reduce inflammation and improve fibre intake."
                )
            })
            triggered_reasons.append(f"Low vegetable intake ({veg_intake} servings/day)")

        # ── Low fruit (<2 servings/day) → Anti-inflammatory ──
        fruit_intake = f.fruits_servings_day or 0
        if fruit_intake < 2:
            self.modules["anti_inflammatory_diet"] = True
            self.food_recommendations.append({
                "category": "Whole Fruits", "action": "increase",
                "foods": ["Berries", "Apples", "Oranges", "Papaya", "Guava", "Pear"],
                "reason": (
                    f"Current fruit intake is {fruit_intake} servings/day. "
                    "Target ≥2 servings/day for antioxidants and soluble fibre."
                )
            })
            triggered_reasons.append(f"Low fruit intake ({fruit_intake} servings/day)")

        # ── High refined grains + low whole grains → Low-GI + soluble fibre ──
        refined_grains = f.refined_grains_servings_week or 0
        whole_grains   = f.whole_grains_servings_week   or 0
        if refined_grains > 7 and whole_grains < 3:
            self.modules["low_gi_plan"]            = True
            self.modules["soluble_fiber_emphasis"] = True
            self.food_recommendations.append({
                "category": "Whole Grains", "action": "increase",
                "foods": ["Oats", "Brown rice", "Quinoa", "Whole wheat bread", "Barley", "Millet"],
                "reason": (
                    f"You're eating {refined_grains} refined grain servings/week but only "
                    f"{whole_grains} whole grain servings. Replace refined with whole grains "
                    "to improve blood glucose and fibre intake."
                )
            })
            triggered_reasons.append(f"High refined grain intake ({refined_grains}/week, whole grains only {whole_grains}/week)")

        # ── High sugary beverages (>1/day) → Low-GI ──
        sugary_bev = f.sugary_beverages_servings_day or 0
        if sugary_bev >= 1:
            self.modules["low_gi_plan"] = True
            self.food_recommendations.append({
                "category": "Sugary Beverages", "action": "avoid",
                "foods": ["Soda", "Fruit juice", "Energy drinks", "Sweetened tea/coffee", "Sports drinks"],
                "reason": (
                    f"You're drinking {sugary_bev} sugary beverage(s)/day. "
                    "Each serving adds ~150 kcal of pure sugar with zero nutritional value. "
                    "Replace with water, plain tea, or sparkling water."
                )
            })
            triggered_reasons.append(f"High sugary beverage intake ({sugary_bev}/day)")

        # ── High fried food (>3/week) → Anti-inflammatory ──
        fried_foods = f.fried_foods_servings_week or 0
        if fried_foods > 3:
            self.modules["anti_inflammatory_diet"] = True
            self.food_recommendations.append({
                "category": "Fried Foods", "action": "avoid",
                "foods": ["Deep-fried snacks", "French fries", "Fried chicken", "Samosas", "Pakoras"],
                "reason": (
                    f"Fried food intake of {fried_foods} servings/week is above the safe limit. "
                    "Deep frying produces trans fats and advanced glycation end-products (AGEs) "
                    "that drive inflammation."
                )
            })
            triggered_reasons.append(f"High fried food intake ({fried_foods}/week)")

        # ── Low legumes (<2/week) → Soluble fibre ──
        legumes = f.legumes_servings_week or 0
        if legumes < 2:
            self.modules["soluble_fiber_emphasis"] = True
            self.food_recommendations.append({
                "category": "Legumes", "action": "increase",
                "foods": ["Lentils", "Chickpeas", "Black beans", "Kidney beans",
                          "Moong dal", "Rajma", "Edamame"],
                "reason": (
                    f"You're eating {legumes} legume servings/week. "
                    "Target ≥3-4 servings/week — legumes are the best source of soluble fibre "
                    "and plant protein for blood sugar and cholesterol control."
                )
            })
            triggered_reasons.append(f"Low legume intake ({legumes}/week)")

        # ── Low olive oil (mufa_emphasis already triggered, reinforce) ──
        olive_oil = f.olive_oil_tbsp_day or 0
        if olive_oil < 1 and self.modules["mufa_emphasis"]:
            self.lifestyle_reminders.append(
                f"🫒 You're using {olive_oil} tbsp olive oil/day. "
                "Add 1-2 tbsp extra virgin olive oil daily for HDL improvement."
            )

        # Log FFQ as a triggered rule if any findings
        if triggered_reasons:
            self._add_rule(
                "FFQ_DIETARY_PATTERN",
                "Long-term dietary pattern analysis from Food Frequency Questionnaire",
                triggered_reasons
            )
            if len(triggered_reasons) >= 3:
                self.lifestyle_reminders.append(
                    "📋 Your food frequency data shows several areas for improvement. "
                    "Focus on increasing vegetables, legumes, and fish while reducing "
                    "processed and fried foods for the greatest health benefit."
                )

    # ─────────────────────────────────────────────────────────────────────────
    # NUTRIENT TARGETS
    # ─────────────────────────────────────────────────────────────────────────
    def generate_nutrient_targets(self) -> Dict[str, float]:
        p = self.profile
        base_calories = p.calorie_deficit or p.estimated_calorie_req or 2000

        # ADA 2024 + DASH defaults
        targets = {
            "target_calories":       base_calories,
            "target_carb_percent":   45.0,
            "target_protein_percent": 20.0,
            "target_fat_percent":    35.0,
            "target_fiber_g":        28.0,
            "target_sodium_mg":      2300.0,
            "target_added_sugar_g":  25.0,
        }

        if self.modules["low_gi_plan"]:
            targets["target_carb_percent"] = 40.0
            targets["target_fiber_g"]      = 35.0

        if self.modules["calorie_deficit_plan"] and p.calorie_deficit:
            targets["target_calories"] = p.calorie_deficit

        if self.modules["omega3_emphasis"]:
            targets["target_omega3_g"] = 2.0

        if self.modules["anti_inflammatory_diet"]:
            targets["target_sodium_mg"]     = 1500.0
            targets["target_added_sugar_g"] = 15.0

        # Tighten fibre target further if both soluble fibre and low-GI are active
        if self.modules["soluble_fiber_emphasis"] and self.modules["low_gi_plan"]:
            targets["target_fiber_g"] = 38.0

        return targets

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    def generate_summary(self) -> str:
        active_modules = [k.replace("_", " ").title() for k, v in self.modules.items() if v]
        risk_category  = self.profile.metabolic_risk_category or "Unknown"
        n_rules        = len(self.triggered_rules)
        ffq_used       = self.ffq is not None

        summary = (
            f"Personalised dietary plan for {risk_category} metabolic risk. "
            f"{n_rules} clinical finding{'s' if n_rules != 1 else ''} identified"
            f"{' (includes long-term dietary pattern from questionnaire)' if ffq_used else ''}. "
        )

        if self.modules["low_gi_plan"]:
            summary += "Low glycaemic index eating pattern recommended. "
        if self.modules["anti_inflammatory_diet"]:
            summary += "Anti-inflammatory dietary approach emphasised. "
        if self.modules["time_restricted_eating"]:
            summary += "Time-restricted eating (8-10 hour window) recommended. "
        if self.modules["calorie_deficit_plan"] and self.profile.calorie_deficit:
            summary += f"Calorie target set to {self.profile.calorie_deficit:.0f} kcal/day. "
        if self.modules["omega3_emphasis"]:
            summary += "Omega-3 rich foods (fish, flaxseed, walnuts) should be increased. "

        return summary.strip()

    # ─────────────────────────────────────────────────────────────────────────
    # RUN — executes all rule groups in order
    # ─────────────────────────────────────────────────────────────────────────
    def run(self) -> Dict[str, Any]:
        self.evaluate_lipid_rules()
        self.evaluate_glucose_rules()
        self.evaluate_obesity_rules()
        self.evaluate_inflammation_rules()
        self.evaluate_chrononutrition_rules()
        self.evaluate_ffq_rules()          # ← NEW: FFQ rules run last, reinforce/add to above

        nutrient_targets = self.generate_nutrient_targets()
        summary          = self.generate_summary()

        return {
            **nutrient_targets,
            **self.modules,
            "triggered_rules":      self.triggered_rules,
            "food_recommendations": self.food_recommendations,
            "lifestyle_reminders":  self.lifestyle_reminders,
            "meal_pattern":         self.meal_pattern,
            "summary":              summary,
        }