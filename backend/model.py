import os
import json
import pickle
import numpy as np
import pandas as pd
import sqlite3
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV

GOAL_MULTIPLIERS = {
    "cutting": {
        "calories": 24,    
        "protein":  2.2,   
        "carbs":    2.0,   
        "fat":      0.7,   
        "meals":    3,
    },
    "lean_bulk": {
        "calories": 30,
        "protein":  2.0,
        "carbs":    3.0,
        "fat":      0.9,
        "meals":    3,
    },
    "bulking": {
        "calories": 36,
        "protein":  1.8,
        "carbs":    4.5,
        "fat":      1.1,
        "meals":    4,
    },
}

FEATURE_COLS = [
    "calorie_diff", "protein_diff", "carb_diff", "fat_diff",
    "protein_ratio", "carb_ratio",  "fat_ratio",
    "goal_cutting",  "goal_bulking", "goal_lean_bulk",
]

class MealRecommender:
    def __init__(self, db_path):
        self.db_path = db_path
        self.scaler = None
        self.model = None
        self.meals_df = None
        self._load_and_train()
    
    def _load_meals(self):
        conn = sqlite3.connect(self.db_path)
        self.meals_df = pd.read_sql_query("SELECT * FROM meals", conn)
        conn.close()
    
    def compute_nutrition_targets(self, weight_kg: float, goal: str) -> dict:
        goal = goal.lower().strip()
        goal_map = {"bulk": "bulking", "cut": "cutting", "lean-bulk": "lean_bulk", "lean_bulk": "lean_bulk", "cutting": "cutting", "bulking": "bulking"}
        goal = goal_map.get(goal, goal)
        if goal not in GOAL_MULTIPLIERS:
            raise ValueError(f"Goal must be one of: {list(GOAL_MULTIPLIERS.keys())}")
        m = GOAL_MULTIPLIERS[goal]
        n = m["meals"]
        return {
            "goal": goal,
            "calories": round(weight_kg * m["calories"] / n, 1),
            "protein": round(weight_kg * m["protein"] / n, 1),
            "carbs": round(weight_kg * m["carbs"] / n, 1),
            "fat": round(weight_kg * m["fat"] / n, 1),
        }
    
    def build_features(self, df_meals: pd.DataFrame, targets: dict) -> pd.DataFrame:
        df = df_meals.copy()
        goal = targets["goal"]
        t_cal, t_pro, t_carb, t_fat = targets["calories"], targets["protein"], targets["carbs"], targets["fat"]
        df["calorie_diff"] = df["calories"] - t_cal
        df["protein_diff"] = df["protein"] - t_pro
        df["carb_diff"] = df["carbs"] - t_carb
        df["fat_diff"] = df["fat"] - t_fat
        df["protein_ratio"] = (df["protein"] / t_pro).clip(0, 2)
        df["carb_ratio"] = (df["carbs"] / t_carb).clip(0, 2)
        df["fat_ratio"] = (df["fat"] / t_fat).clip(0, 2)
        df["goal_cutting"] = int(goal == "cutting")
        df["goal_bulking"] = int(goal == "bulking")
        df["goal_lean_bulk"] = int(goal == "lean_bulk")
        return df
    
    def _train_model(self):
        self._load_meals()
        weight_samples = list(range(50, 105, 5))
        all_rows = []
        for goal in GOAL_MULTIPLIERS:
            for weight in weight_samples:
                targets = self.compute_nutrition_targets(weight, goal)
                df_feat = self.build_features(self.meals_df, targets)
                df_feat["label"] = df_feat.apply(lambda r: self._label_meal(r, goal), axis=1)
                keep = ["food_id", "food_name", "category"] + FEATURE_COLS + ["label"]
                all_rows.append(df_feat[keep])
        df_train = pd.concat(all_rows, ignore_index=True)
        X = df_train[FEATURE_COLS]
        y = df_train["label"]
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        clf = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.8, random_state=42)
        self.model = CalibratedClassifierCV(clf, cv=3, method="sigmoid")
        self.model.fit(X_scaled, y)
        print("Model trained and ready.")
    
    def _label_meal(self, row, goal):
        if goal == "cutting":
            return int(-250 <= row["calorie_diff"] <= 150 and row["protein_diff"] >= -15 and row["fat_diff"] <= 20)
        elif goal == "bulking":
            return int(row["calorie_diff"] >= -200 and row["protein_diff"] >= -20 and row["carb_diff"] >= -25)
        elif goal == "lean_bulk":
            return int(abs(row["calorie_diff"]) <= 250 and row["protein_diff"] >= -20 and abs(row["carb_diff"]) <= 40)
        return 0
    
    def _load_and_train(self):
        if os.path.exists("model.pkl"):
            with open("model.pkl", "rb") as f:
                self.model = pickle.load(f)
            with open("scaler.pkl", "rb") as f:
                self.scaler = pickle.load(f)
            self._load_meals()
            print("Model loaded from pickle.")
        else:
            self._train_model()
            with open("model.pkl", "wb") as f:
                pickle.dump(self.model, f)
            with open("scaler.pkl", "wb") as f:
                pickle.dump(self.scaler, f)
    
    def recommend(self, weight_kg: float, goal: str, top_n: int = 5, category_filter: str = None) -> dict:
        targets = self.compute_nutrition_targets(weight_kg, goal)
        df = self.build_features(self.meals_df, targets)
        if category_filter:
            df = df[df["category"].str.lower() == category_filter.lower()]
            if df.empty:
                return {"error": f"No meals in category '{category_filter}'"}
        X_raw = df[FEATURE_COLS].values
        X_sc = self.scaler.transform(X_raw)
        scores = self.model.predict_proba(X_sc)[:, 1]
        df = df.copy()
        df["match_score"] = scores
        top = df.sort_values("match_score", ascending=False).head(top_n).reset_index(drop=True)
        recs = [{
            "rank": i + 1,
            "food_id": int(row.get("food_id", 0)),
            "meal_name": row["food_name"],
            "category": row["category"],
            "calories": int(row["calories"]),
            "protein_g": float(row["protein"]),
            "carbs_g": float(row["carbs"]),
            "fat_g": float(row["fat"]),
            "match_score": round(float(row["match_score"]), 4),
        } for i, row in top.iterrows()]
        return {
            "user_profile": {"weight_kg": weight_kg, "goal": goal},
            "nutrition_targets_per_meal": targets,
            "recommendations": recs,
        }

