# 🏎️ F1 Race Predictions — 2026 Season (v3.0)

A **modular, scalable** machine-learning framework that predicts Formula 1 Grand Prix
race results using historical telemetry from the [FastF1](https://docs.fastf1.dev/) API,
an ensemble regression approach, and an interactive **Next.js website** for visualisation.

> **Current season:** All 24 rounds of the 2026 calendar — prediction scripts ready for every Grand Prix.

---

## 🚀 Project Overview

This project uses **Gradient Boosting** and **XGBoost** regressors trained on
multi-season historical race data to predict finishing orders for upcoming F1 races.
Inspired by
[mar-antaya/2025_f1_predictions](https://github.com/mar-antaya/2025_f1_predictions),
it has been adapted and extended for the **2026 regulation era** with 11 teams and
22 drivers (including the new Cadillac F1 team).

### Architecture (v3)

```
f1_predictions/
├── f1_prediction_utils.py           ← Core ML framework (model, data, viz, reports)
├── advanced_models.py               ← Pit strategy, tyre deg, LSTM, season tracker
├── export_website_data.py           ← Data pipeline: ML → JSON + PNG for website
├── generate_fastf1_viz.py           ← FastF1 historical visualisations (track map, etc.)
├── report_results.py                ← Detailed race report + HTML generator
├── create_season_races.py           ← Script that generates all 24 race files
├── F1PredictionFramework.ipynb      ← Interactive Jupyter notebook
├── requirements.txt
├── .gitignore
├── README.md
│
├── races/                           ← 24 round-specific prediction scripts
│   ├── round_01_australia_gp.py
│   ├── round_02_china_gp.py
│   ├── ... (all 24 rounds)
│   └── round_24_abu_dhabi_gp.py
│
├── website/                         ← Next.js interactive dashboard
│   ├── src/
│   │   ├── app/                     ← App routes (/, /race/[round], /standings, etc.)
│   │   ├── components/              ← React components (HomePage, RaceDetail, etc.)
│   │   ├── lib/                     ← Data fetching utilities
│   │   └── types/                   ← TypeScript interfaces
│   └── public/
│       ├── data/                    ← Generated JSON (season, standings, rounds/)
│       └── visualizations/          ← Generated PNGs (round_01/, round_02/, ...)
│
├── visualizations/                  ← Legacy per-GP plots (gitignored)
├── reports/                         ← Generated HTML race reports (gitignored)
└── f1_cache/                        ← FastF1 data cache (gitignored)
```

---

## ✨ What's New in v3

### Website Dashboard
- **Next.js 16** + React 19 + Tailwind CSS v4 + Recharts
- Dark-themed F1 aesthetic with team colours, flag emojis, responsive layout
- Pages: Home, Calendar (24 races), Race Detail, Standings (Drivers / Constructors / WDC), About
- Visualization gallery with lightbox for all generated plots

### Advanced Models (`advanced_models.py`)
- **Pit Strategy Simulator** — Monte-Carlo simulation of 1/2/3-stop strategies with compound modelling
- **Tyre Degradation Curves** — Circuit-scaled compound degradation rates with cliff modelling
- **LSTM Lap Predictor** — PyTorch sequence model (falls back to analytical if no GPU)
- **Season Tracker** — Compares predictions vs actuals with accuracy metrics

### Data Pipeline (`export_website_data.py`)
- Single command exports JSON + PNG for the entire website
- Flags: `--round N`, `--all`, `--fastf1`, `--advanced`, `--metadata`
- Generates `season.json`, `standings.json`, `round_XX.json`, and all PNG visualisations

### FastF1 Visualisations (`generate_fastf1_viz.py`)
- Circuit track maps (coloured by speed)
- Historical lap-time distributions
- Tyre strategy waterfall charts

---

## 📊 v2.0 → v3.0 Model Improvements

| Feature | v1 | v2 | v3 |
|---------|----|----|-----|
| Feature scaling | None | StandardScaler | StandardScaler |
| Team changes | Not handled | Team-change adjust | Team-change adjust |
| Pit strategy | None | Expected stops × loss | **Monte-Carlo simulation** |
| Tyre degradation | None | Circuit wear factor | **Compound-specific curves + cliff** |
| Driver experience | None | Log-scaled starts | Log-scaled starts |
| Prediction spread | 19.1s ❌ | ~1.7s ✅ | ~1.7s ✅ (calibrated) |
| Season tracking | None | Current-form feature | **Prediction vs actual tracker** |
| Reports | Console only | HTML report | **Interactive website** |
| LSTM | None | None | **Lap-by-lap sequence model** |
| Visualisations | 5 per GP | 5 per GP | **10+ per GP** (ML + FastF1 + advanced) |
| Races covered | 1 | 24 scripts | **24 scripts + website pipeline** |

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

## 📦 Dependencies

### Python (ML pipeline)

| Package | Purpose |
|---------|---------|
| `fastf1` | Historical F1 data retrieval |
| `pandas` / `numpy` | Data manipulation & numerical computing |
| `scikit-learn` | Gradient Boosting, StandardScaler, metrics |
| `xgboost` | XGBoost regression model |
| `matplotlib` / `seaborn` | Plotting & visualisations |
| `tqdm` | Progress bars |
| `torch` *(optional)* | LSTM model (falls back to analytical) |

### Website

| Package | Purpose |
|---------|---------|
| `next` 16.x | React framework + SSR/SSG |
| `react` 19.x | UI components |
| `tailwindcss` v4 | Utility-first CSS |
| `recharts` | Interactive charts |
| `framer-motion` | Animations |
| `@heroicons/react` | Icons |

---

## ⚙️ Environment Setup

```bash
# 1. Create conda environment
conda create -n f1_predictions python=3.11 -y
conda activate f1_predictions

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install website dependencies
cd website && npm install && cd ..

# 4. (Optional) Register Jupyter kernel
pip install ipykernel
python -m ipykernel install --user --name f1_predictions --display-name "Python (F1 Predictions)"
```

---

## ▶️ How to Run

### Full pipeline (ML → Website data)

```bash
conda activate f1_predictions

# Export Round 1 with all visualisations + advanced models
python export_website_data.py --round 1 --fastf1 --advanced

# Export all 24 rounds
python export_website_data.py --all --fastf1 --advanced

# Metadata only (season.json + standings.json)
python export_website_data.py --metadata
```

### Start the website

```bash
cd website
npm run dev          # → http://localhost:3000
npm run build        # Production build
```

### Run a standalone GP prediction

```bash
python races/round_01_australia_gp.py
python races/round_08_monaco_gp.py
```

### Generate FastF1 visualisations separately

```bash
python generate_fastf1_viz.py --circuit Australia --year 2024 --round 1
```

### Generate HTML race report

```bash
python report_results.py
# → reports/Australian_Grand_Prix/race_report.html
```

### After qualifying (Saturday)

1. **Re-run the export** — `get_qualifying_or_estimates()` auto-fetches real qualifying times.
2. Update rain probability and temperature with the latest forecast.

### Season progression

After each real race weekend:
```bash
# 1. Run the export for the completed round
python export_website_data.py --round N --fastf1 --advanced

# 2. The season tracker auto-compares predictions vs actual results
# 3. Later rounds automatically use CurrentForm from earlier results
```

---

## 📈 Model Performance

The ensemble is evaluated on a held-out 20% test split:

| Metric | Round 1 (Australia) |
|--------|---------------------|
| **R²** (Ensemble) | 0.927 |
| **MAE** (Ensemble) | 0.147s |
| **Max Spread** | 1.73s |
| **Training Data** | 2023–2025 (2,699 laps) |

---

## 🖼️ Visualisations Per Round

Each round generates up to **10+ visualisations**:

| Category | Plots |
|----------|-------|
| **ML Predictions** | Predicted lap times, feature importance, team vs pace, pace vs predicted, lap-time distribution |
| **Advanced Models** | Pit strategy comparison, tyre degradation curves |
| **FastF1 Historical** | Track map (speed-coloured), historical lap-time distributions, tyre strategy waterfall |

---

## 📌 Roadmap

- [ ] Live qualifying data integration (auto-fetch on race weekends)
- [ ] Weather API integration for real-time forecasts
- [ ] Sprint race predictions
- [ ] Deploy website to Vercel
- [ ] Add telemetry-based features (speed traps, sector times)
- [ ] Multi-season accuracy tracking dashboard

---

🏎️ **Predict every race of the 2026 season!** 🚀
