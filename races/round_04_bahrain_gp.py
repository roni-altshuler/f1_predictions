# %% [markdown]
# # 🏁 2026 Bahrain Grand Prix — Prediction
# **Round 4** | Circuit: Sakhir | Date: 2026-04-19

# %% — Setup
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from f1_prediction_utils import *

enable_cache(os.path.join(os.path.dirname(__file__), "..", "f1_cache"))

# %% — Configuration
GP_NAME     = "Bahrain"
GP_ROUND    = 4
GP_YEARS    = [2023, 2024, 2025]
RAIN_PROB   = 0.02
TEMPERATURE = 32

# %% — Qualifying Estimates (auto-generated; update with real data when available)
QUALIFYING_ESTIMATES = {
    "ALB": 87.96,
    "ALO": 88.39,
    "ANT": 87.61,
    "BEA": 88.39,
    "BOR": 89.09,
    "BOT": 88.83,
    "COL": 88.83,
    "GAS": 88.13,
    "HAD": 88.04,
    "HAM": 87.43,
    "HUL": 88.65,
    "LAW": 87.61,
    "LEC": 87.26,
    "LIN": 89.0,
    "NOR": 87.17,
    "OCO": 88.48,
    "PER": 87.7,
    "PIA": 87.09,
    "RUS": 87.35,
    "SAI": 87.78,
    "STR": 88.74,
    "VER": 87.0,
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
classification = predicted_classification(merged, gp_name="Bahrain Grand Prix")

# %% — Visualisations
generate_all_visualisations(results, merged, gp_name="Bahrain Grand Prix")

# %% — HTML Report
generate_html_report(classification, metrics, results, merged,
                     gp_name="Bahrain Grand Prix", circuit_key=GP_NAME,
                     gp_round=GP_ROUND)

print("\n✅ Bahrain Grand Prix prediction complete!")
