# 🍱 Macro-Cloud: AI Meal Recommender

## Tech Stack
- **Frontend**: React
- **Backend**: Python (Flask) + ML (scikit-learn)
- **Database**: SQLite

## Setup & Run

### 1. Backend (ML + API)
```bat
# Run backend/run_backend.bat
# OR manually:
cd backend
pip install -r requirements.txt
python app.py
```
✅ Backend runs on `http://localhost:5000`

### 2. Frontend (React App)
```bat
# Run frontend/run_frontend.bat
# OR manually:
cd frontend
npm install
npm start
```
✅ Frontend runs on `http://localhost:3000` (proxies to backend)

### 3. Test API Directly
```bash
curl -X POST http://localhost:5000/recommend \
  -H "Content-Type: application/json" \
  -d '{"weight":75,"goal":"bulking","top_n":3}'
```

## Features
- Enter weight + gym goal (Bulk/Cut/Lean Bulk)
- Get AI-ranked meal recommendations matching nutrition targets
- Filter by category, adjust # of recommendations
- View per-meal macro targets vs meal nutrition
- Match confidence scores from trained ML model

## ML Model
Trained GradientBoostingClassifier on 300+ cloud kitchen meals.
Features: macro diffs/ ratios + goal encoding.
Labels: nutritionist-style rules for fitness goals.

Enjoy your optimized meals! 💪🍲

