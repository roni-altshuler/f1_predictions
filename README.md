# 🏎️ F1 Race Predictions — 2026 Season (v2.0)

A **modular, scalable** machine-learning framework that predicts Formula 1 Grand Prix
race results using historical telemetry from the [FastF1](https://docs.fastf1.dev/) API
and an ensemble regression approach.

> **Current season:** All 24 rounds of the 2026 calendar — prediction scripts ready for every Grand Prix.

---

## 🚀 Project Overview

This project uses **Gradient Boosting** and **XGBoost** regressors trained on
multi-season historical race data to predict finishing orders for upcoming F1 races.
Inspired by
[mar-antaya/2025_f1_predictions](https://github.com/mar-antaya/2025_f1_predictions),
it has been adapted and extended for the **2026 regulation era** with 11 teams and
22 drivers (including the new Cadillac F1 team).

### Architecture (v2)

```
f1_predictions/
├── f1_prediction_utils.py           ← Shared framework (model, data, viz, reports)
├── report_results.py                ← Detailed race report + HTML generator
├── create_season_races.py           ← Script that generates all 24 race files
├── F1PredictionFramework.py         ← Framework documentation & usage guide
├── requirements.txt
├── .gitignore
├── README.md
├── races/                           ← 24 round-specific prediction scripts
│   ├── round_01_australia_gp.py
│   ├── round_02_china_gp.py
│   ├── ... (all 24 rounds)
│   └── round_24_abu_dhabi_gp.py
├── visualizations/                  ← Generated plots (per-GP, per-team hierarchy)
│   └── Australian_Grand_Prix/
│       ├── feature_importance.png
│       ├── predicted_laptimes.png
│       ├── team_vs_pace.png
│       ├── pace_vs_predicted.png
│       └── <Team>/driver_comparison.png, grid_position.png
├── reports/                         ← Generated HTML race reports
│   └── Australian_Grand_Prix/race_report.html
└── f1_cache/                        ← FastF1 data cache
```

### v2.0 Model Improvements

| Feature | v1 | v2 |
|---------|----|----|
| Feature scaling | None | **StandardScaler** — no single feature dominates |
| Team changes | Not handled | **Team-change adjustment** — PER penalised for Cadillac, HAM boosted for Ferrari |
| Pit strategy | None | **Expected stops × pit loss × crew speed** per circuit |
| Tyre degradation | None | **Circuit-specific wear factor** |
| Driver experience | None | **Log-scaled career starts** |
| Prediction spread | 19.1s ❌ | **~1.7s** ✅ (calibrated to realistic F1 gaps) |
| Season tracking | None | **Current-season form** — earlier race results feed into later predictions |
| Reports | Console only | **HTML race report** with podium, classification, standings, charts |
| Races covered | 1 | **All 24 rounds** with auto-generated prediction scripts |

### How It Works

1. **Data Collection** — Pull lap/sector times from FastF1 for past editions (2023–2025).
2. **Feature Engineering** — Team-adjusted pace, pit strategy, tyre degradation,
   driver experience, weather, and current-season form.
3. **Qualifying Ingestion** — Auto-fetches real qualifying data from FastF1 (falls back
   to estimates if the session hasn't happened yet).
4. **Model Training** — Gradient Boosting + XGBoost ensemble with StandardScaler and
   prediction calibration for realistic spreads.
5. **Prediction** — Full classification with F1 points, constructor standings, and
   gap-to-leader calculations.
6. **Visualisation** — Hierarchical plots (GP-level + per-team) and self-contained HTML report.

---

## 🏁 2026 Grid

| Team | Driver 1 | Driver 2 |
|------|----------|----------|
| Red Bull Racing | Max Verstappen (VER) | Isack Hadjar (HAD) |
| McLaren | Lando Norris (NOR) | Oscar Piastri (PIA) |
| Ferrari | Charles Leclerc (LEC) | Lewis Hamilton (HAM) |
| Mercedes | Kimi Antonelli (ANT) | George Russell (RUS) |
| Aston Martin | Fernando Alonso (ALO) | Lance Stroll (STR) |
| Alpine | Pierre Gasly (GAS) | Franco Colapinto (COL) |
| Williams | Alexander Albon (ALB) | Carlos Sainz (SAI) |
| Racing Bulls | Liam Lawson (LAW) | Arvid Lindblad (LIN) |
| Haas | Esteban Ocon (OCO) | Oliver Bearman (BEA) |
| Audi | Nico Hülkenberg (HUL) | Gabriel Bortoleto (BOR) |
| Cadillac | Sergio Pérez (PER) | Valtteri Bottas (BOT) |

---

## 📊 Data Sources

| Source | Description |
|--------|-------------|
| [FastF1 API](https://docs.fastf1.dev/) | Lap times, sector times, session results, telemetry (2018+) |
| 2025 Constructor Standings | Team performance scores |
| Weather Forecasts | Rain probability + temperature for qualifying adjustment |
| Circuit Characteristics | Pit loss, tyre degradation, expected stops per circuit |

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `fastf1` | Historical F1 data retrieval |
| `pandas` | DataFrames & data manipulation |
| `numpy` | Numerical computing |
| `scikit-learn` | Gradient Boosting, train/test split, metrics, StandardScaler |
| `xgboost` | XGBoost regression model |
| `matplotlib` | Plotting |
| `seaborn` | Enhanced plot styling |
| `tqdm` | Progress bars |
| `jupytext` | Notebook ↔ Python script conversion |

---

## ⚙️ Environment Setup

```bash
# 1. Create conda environment
conda create -n f1_predictions python=3.11 -y
conda activate f1_predictions

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Register Jupyter kernel
pip install ipykernel
python -m ipykernel install --user --name f1_predictions --display-name "Python (F1 Predictions)"
```

---

## ▶️ How to Run

### Run a single GP prediction

```bash
conda activate f1_predictions

# Australian GP (Round 1)
python races/round_01_australia_gp.py

# Any other round
python races/round_02_china_gp.py
python races/round_08_monaco_gp.py
```

### Generate full race report (console + HTML)

```bash
python report_results.py
# → Reports saved to reports/Australian_Grand_Prix/race_report.html
```

### Generate all 24 race scripts

```bash
python create_season_races.py
# → Creates races/round_01_australia_gp.py through round_24_abu_dhabi_gp.py
```

### After qualifying (Saturday)

1. **Re-run the race script** — `get_qualifying_or_estimates()` auto-fetches real qualifying times.
2. Update `RAIN_PROBABILITY` and `TEMPERATURE_C` with the latest forecast.

### Season scalability

After each real race, record the results:
```python
from f1_prediction_utils import save_race_result
save_race_result(round_num=1, classification=classification)
```
Later rounds will automatically use earlier results for the **CurrentForm** feature.

---

## 📈 Model Performance

The ensemble is evaluated on a held-out 20% test split:

| Metric | Description |
|--------|-------------|
| **MAE** | Mean Absolute Error — average prediction error |
| **RMSE** | Root Mean Squared Error — penalises large errors |
| **R²** | Coefficient of Determination — variance explained |

---

## 📌 Future Improvements

- Incorporate **pit stop strategy** modelling (undercut / overcut)
- Add **tyre compound degradation** curves from free practice
- Use **speed-trap telemetry** for straight-line speed features
- Explore **LSTM / neural networks** for sequential lap-time prediction
- Build a **season-long tracker** comparing predictions vs actual results

---

🏎️ **Predict every race of the 2026 season — one notebook at a time!** 🚀
