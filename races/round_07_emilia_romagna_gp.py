# %% [markdown]
# # 🏁 2026 Emilia Romagna Grand Prix — Prediction
# **Round 7** | Circuit: Imola | Date: 2026-05-31

# %% — Setup
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from f1_prediction_utils import *

enable_cache(os.path.join(os.path.dirname(__file__), "..", "f1_cache"))

# %% — Configuration
GP_NAME     = "Emilia Romagna"
GP_ROUND    = 7
GP_YEARS    = [2024, 2025]
RAIN_PROB   = 0.2
TEMPERATURE = 22

# %% — Qualifying Estimates (auto-generated; update with real data when available)
QUALIFYING_ESTIMATES = {
    "ALB": 76.33,
    "ALO": 76.71,
    "ANT": 76.03,
    "BEA": 76.71,
    "BOR": 77.31,
    "BOT": 77.09,
    "COL": 77.09,
    "GAS": 76.48,
    "HAD": 76.41,
    "HAM": 75.88,
    "HUL": 76.93,
    "LAW": 76.03,
    "LEC": 75.73,
    "LIN": 77.24,
    "NOR": 75.65,
    "OCO": 76.78,
    "PER": 76.1,
    "PIA": 75.58,
    "RUS": 75.8,
    "SAI": 76.18,
    "STR": 77.01,
    "VER": 75.5,
}

# %% — Load historical data
laps = load_multi_year_data(GP_NAME, GP_YEARS)

# %% — Aggregate driver statistics
driver_stats = aggregate_driver_stats(laps)

# %% — Build enriched grid
grid   = build_grid_dataframe()
merged = build_training_dataset(grid, driver_stats,
                                circuit_key=GP_NAME,
                                current_round=GP_ROUND)

# %% — Get qualifying data (auto-fetch or estimates)
qualifying_times = get_qualifying_or_estimates(2026, GP_NAME, QUALIFYING_ESTIMATES)
merged = apply_qualifying_data(merged, qualifying_times,
                               rain_probability=RAIN_PROB,
                               temperature_c=TEMPERATURE)

# %% — Train ensemble model
results = train_ensemble(merged, max_spread_s=3.5)

# %% — Evaluate
metrics = evaluate_models(results)
merged  = results["merged"]

# %% — Classification
classification = predicted_classification(merged, gp_name="Emilia Romagna Grand Prix")

# %% — Visualisations
generate_all_visualisations(results, merged, gp_name="Emilia Romagna Grand Prix")

# %% — HTML Report
generate_html_report(classification, metrics, results, merged,
                     gp_name="Emilia Romagna Grand Prix", circuit_key=GP_NAME,
                     gp_round=GP_ROUND)

print("\n✅ Emilia Romagna Grand Prix prediction complete!")
