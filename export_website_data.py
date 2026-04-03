#!/usr/bin/env python3
"""
export_website_data.py
======================
Run the full prediction pipeline for a given round (or all completed rounds)
and export structured JSON + visualization PNGs for the Next.js website.

All JSON output strictly matches the TypeScript interfaces defined in
  website/src/types/index.ts

Usage:
    python export_website_data.py --round 1
    python export_website_data.py --all
    python export_website_data.py --metadata

Outputs:
    website/public/data/
        season.json              ← SeasonData
        standings.json           ← StandingsData
        rounds/round_01.json     ← RoundData
    website/public/visualizations/
        round_01/*.png           ← prediction + FastF1 visualisations
"""

import argparse, json, os, sys, math
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from f1_prediction_utils import *

# ── Paths ────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
WEBSITE_DIR = os.path.join(PROJECT_ROOT, "website")
DATA_DIR   = os.path.join(WEBSITE_DIR, "public", "data")
VIZ_DIR    = os.path.join(WEBSITE_DIR, "public", "visualizations")
ROUNDS_DIR = os.path.join(DATA_DIR, "rounds")
TRACKER_FILE = os.path.join(PROJECT_ROOT, "season_tracker_2026.json")
TRACKER_EXPORT_FILE = os.path.join(DATA_DIR, "season_tracker.json")

VIZ_METADATA = {
    "predicted_laptimes.png": {
        "title": "Predicted Race Pace",
        "category": "ml",
        "description": "Model-projected race pace and finishing spread across the full grid.",
        "source": "model",
    },
    "feature_importance.png": {
        "title": "Feature Importance",
        "category": "ml",
        "description": "Relative impact of each input feature for Gradient Boosting and XGBoost.",
        "source": "model",
    },
    "team_vs_pace.png": {
        "title": "Team Strength vs Pace",
        "category": "ml",
        "description": "Relationship between constructor strength and projected race pace.",
        "source": "model",
    },
    "pace_vs_predicted.png": {
        "title": "Clean-Air Pace vs Prediction",
        "category": "ml",
        "description": "How baseline clean-air pace translates to projected race performance.",
        "source": "model",
    },
    "laptime_distribution.png": {
        "title": "Predicted Lap-Time Distribution",
        "category": "ml",
        "description": "Team-level distribution of projected race lap times.",
        "source": "model",
    },
    "prediction_confidence.png": {
        "title": "Prediction Confidence",
        "category": "ml",
        "description": "Confidence bands by driver based on model uncertainty and volatility signals.",
        "source": "model",
    },
    "track_map.png": {
        "title": "Circuit Speed Map",
        "category": "fastf1",
        "description": "FastF1-derived circuit map with corner labels and speed profile.",
        "source": "fastf1",
    },
    "laptime_distribution_historical.png": {
        "title": "Historical Lap-Time Distribution",
        "category": "fastf1",
        "description": "Historical lap-time spread from prior seasons at this circuit.",
        "source": "fastf1",
    },
    "tyre_strategy.png": {
        "title": "Historical Tyre Strategy",
        "category": "fastf1",
        "description": "Compound usage and stint tendencies from historical race data.",
        "source": "fastf1",
    },
    "pit_strategy_comparison.png": {
        "title": "Pit Strategy Comparison",
        "category": "advanced",
        "description": "Monte-Carlo race-time simulation across strategic pit-stop options.",
        "source": "advanced",
    },
    "tyre_degradation_curves.png": {
        "title": "Tyre Degradation Curves",
        "category": "advanced",
        "description": "Projected soft/medium/hard degradation behavior and cliff laps.",
        "source": "advanced",
    },
    "lstm_pace_prediction.png": {
        "title": "LSTM Pace Projection",
        "category": "advanced",
        "description": "Neural-network pace projection for race evolution over stint length.",
        "source": "advanced",
    },
}


def _ensure_dirs():
    for d in [DATA_DIR, VIZ_DIR, ROUNDS_DIR]:
        os.makedirs(d, exist_ok=True)


def ensure_track_map_asset(round_num, gp_key, fallback_year=2025):
    """Ensure a labeled-corner circuit map exists when FastF1 data is available."""
    round_viz_dir = os.path.join(VIZ_DIR, f"round_{round_num:02d}")
    os.makedirs(round_viz_dir, exist_ok=True)
    target = os.path.join(round_viz_dir, "track_map.png")

    if os.path.exists(target):
        return True

    try:
        from generate_fastf1_viz import plot_track_map, enable_cache
        enable_cache()
        return bool(plot_track_map(fallback_year, gp_key, round_viz_dir))
    except Exception as e:
        print(f"  ℹ️  Track map generation skipped for {gp_key}: {e}")
        return False


def _safe_load_json(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def _json_safe(value):
    """Recursively replace non-finite floats with None for valid JSON output."""
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _dedupe_preserve_order(values):
    seen = set()
    out = []
    for v in values:
        if v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def _build_visualization_details(filenames):
    details = []
    for fname in _dedupe_preserve_order(filenames):
        meta = VIZ_METADATA.get(fname, {})
        details.append({
            "filename": fname,
            "title": meta.get("title", fname.replace("_", " ").replace(".png", "").title()),
            "category": meta.get("category", "other"),
            "description": meta.get("description", "Generated race analysis visualization."),
            "source": meta.get("source", "model"),
        })
    return details


def _compute_round_accuracy(classification_rows, actual_results):
    if not classification_rows or not actual_results:
        return None

    predicted = {}
    for entry in classification_rows:
        try:
            predicted[str(entry["driver"])] = int(entry["position"])
        except Exception:
            continue

    if not predicted:
        return None

    common = sorted(set(predicted.keys()) & set(actual_results.keys()))
    if not common:
        return None

    diffs = [abs(predicted[d] - int(actual_results[d])) for d in common]
    exact = int(sum(1 for d in diffs if d == 0))
    within_3 = int(sum(1 for d in diffs if d <= 3))
    within_5 = int(sum(1 for d in diffs if d <= 5))

    return {
        "mean_position_error": round(float(np.mean(diffs)), 2),
        "median_position_error": round(float(np.median(diffs)), 1),
        "exact_matches": exact,
        "within_3_positions": within_3,
        "within_5_positions": within_5,
        "total_drivers": len(common),
        "accuracy_pct": round(within_3 / len(common) * 100, 1),
    }


def _sanitize_telemetry_payload(telemetry):
    """Drop telemetry rows for drivers outside the 2026 grid."""
    if not isinstance(telemetry, dict):
        return telemetry
    valid = set(DRIVER_TEAM_2026.keys())

    def _filter_rows(rows):
        if not isinstance(rows, list):
            return rows
        return [r for r in rows if isinstance(r, dict) and r.get("driver") in valid]

    out = dict(telemetry)
    for key in ("speedTraps", "sectorTimes", "stintTimeline", "pitStopImpact", "sectorDominance"):
        out[key] = _filter_rows(out.get(key, []))
    return out


def _write_gp_accuracy_report(tracker_export):
    """Write detailed per-GP accuracy report for website + markdown archive."""
    gp_reports = tracker_export.get("gpReports", []) if isinstance(tracker_export, dict) else []

    json_payload = {
        "generatedAt": tracker_export.get("generatedAt") if isinstance(tracker_export, dict) else None,
        "overallAccuracy": tracker_export.get("overallAccuracy") if isinstance(tracker_export, dict) else None,
        "gpReports": gp_reports,
    }
    _write_json(os.path.join(DATA_DIR, "gp_accuracy_report.json"), json_payload)

    reports_dir = os.path.join(PROJECT_ROOT, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    md_path = os.path.join(reports_dir, "season_accuracy_report.md")

    lines = [
        "# F1 Model Accuracy Report (Per Grand Prix)",
        "",
        f"Generated: {json_payload.get('generatedAt') or 'unknown'}",
        "",
    ]

    overall = json_payload.get("overallAccuracy") or {}
    if overall:
        lines.extend([
            "## Season Summary",
            "",
            f"- Mean position error: **{overall.get('seasonMeanError', 'n/a')}**",
            f"- Within 3 positions accuracy: **{overall.get('seasonAccuracyPct', 'n/a')}%**",
            f"- Rounds with official results: **{overall.get('roundsWithActual', 'n/a')}**",
            "",
        ])

    if gp_reports:
        lines.extend([
            "## Per-GP Breakdown",
            "",
            "| Round | Grand Prix | Mean Error | Exact | Within 3 | Podium Hits | Winner Called | Biggest Miss |",
            "|---|---|---:|---:|---:|---:|---|---|",
        ])
        for report in sorted(gp_reports, key=lambda r: r.get("round", 0)):
            misses = report.get("biggestMisses") or []
            if misses:
                top = misses[0]
                miss_label = (
                    f"{top.get('driver')} P{top.get('predicted')}→P{top.get('actual')}"
                )
            else:
                miss_label = "-"
            lines.append(
                f"| {report.get('round')} | {report.get('name')} | {report.get('meanError')} | "
                f"{report.get('exactMatches')} | {report.get('within3')} | {report.get('podiumHits')} | "
                f"{'Yes' if report.get('winnerHit') else 'No'} | {miss_label} |"
            )
        lines.append("")
    else:
        lines.extend([
            "## Per-GP Breakdown",
            "",
            "No rounds with official results are available yet.",
            "",
        ])

    with open(md_path, "w") as f:
        f.write("\n".join(lines))


def _write_json(path, data):
    with open(path, "w") as f:
        json.dump(_json_safe(data), f, indent=2)


def _normalize_actual_results(actual):
    """Normalize tracker actual results into {DRIVER: position} mapping."""
    if not isinstance(actual, dict):
        return None

    normalized = {}
    for drv, value in actual.items():
        pos = value
        if isinstance(value, dict):
            pos = value.get("position")
        try:
            normalized[str(drv)] = int(pos)
        except (TypeError, ValueError):
            continue

    return normalized or None


def _get_round_preserved_fields(round_num, existing_round):
    """Preserve already-known post-race/enriched fields from existing files.

    If actual results or accuracy are missing, rehydrate from season tracker.
    """
    preserved = {}

    # Keep previously generated fields unless the current run repopulates them.
    if isinstance(existing_round, dict):
        for key in (
            "actualResults",
            "accuracy",
            "gpReport",
            "telemetryData",
            "strategyData",
            "tyreDegData",
            "lstmData",
            "trackerData",
        ):
            value = existing_round.get(key)
            if value:
                preserved[key] = value

    # Fill missing post-race fields from tracker source-of-truth.
    tracker = _safe_load_json(TRACKER_FILE) or _safe_load_json(TRACKER_EXPORT_FILE)
    if isinstance(tracker, dict):
        rk = str(round_num)

        if "actualResults" not in preserved:
            rounds = tracker.get("rounds", {})
            round_entry = rounds.get(rk) or rounds.get(round_num)
            if isinstance(round_entry, dict):
                normalized_actuals = _normalize_actual_results(round_entry.get("actual"))
                if normalized_actuals:
                    preserved["actualResults"] = normalized_actuals

        if "accuracy" not in preserved:
            accuracy_map = tracker.get("accuracy", {})
            round_accuracy = accuracy_map.get(rk) or accuracy_map.get(round_num)
            if isinstance(round_accuracy, dict) and round_accuracy:
                preserved["accuracy"] = round_accuracy

    return preserved


def _sync_tracker_data(round_num, round_data):
    """Synchronize tracker + per-round accuracy against current round payload."""
    try:
        from advanced_models import SeasonTracker

        tracker = SeasonTracker()
        tracker.sync_from_round_directory(ROUNDS_DIR)
        tracker.sync_from_round_file(round_num, round_data)
        tracker.save()

        tracker_export = tracker.export_for_website()
        round_data["trackerData"] = tracker_export

        round_accuracy = tracker.data.get("accuracy", {}).get(str(round_num))
        if round_accuracy:
            round_data["accuracy"] = round_accuracy

        round_report = tracker.get_round_report(round_num)
        if round_report:
            round_data["gpReport"] = round_report

        os.makedirs(os.path.dirname(TRACKER_EXPORT_FILE), exist_ok=True)
        with open(TRACKER_EXPORT_FILE, "w") as f:
            json.dump(tracker_export, f, indent=2)

        _write_gp_accuracy_report(tracker_export)
    except Exception as e:
        print(f"  ⚠️  Tracker sync failed: {e}")

    # Fallback when tracker sync fails: compute per-round accuracy locally.
    actual_results = round_data.get("actualResults")
    if isinstance(actual_results, dict) and actual_results and "accuracy" not in round_data:
        local_accuracy = _compute_round_accuracy(round_data.get("classification", []), actual_results)
        if local_accuracy:
            round_data["accuracy"] = local_accuracy


# ── Weather estimates per GP ─────────────────────────────────────────────
GP_WEATHER = {
    "Australia":      {"rain": 0.10, "temp": 24},
    "China":          {"rain": 0.15, "temp": 18},
    "Japan":          {"rain": 0.20, "temp": 16},
    "Bahrain":        {"rain": 0.02, "temp": 32},
    "Saudi Arabia":   {"rain": 0.02, "temp": 28},
    "Miami":          {"rain": 0.15, "temp": 30},
    "Emilia Romagna": {"rain": 0.20, "temp": 22},
    "Monaco":         {"rain": 0.10, "temp": 22},
    "Spain":          {"rain": 0.05, "temp": 28},
    "Canada":         {"rain": 0.25, "temp": 20},
    "Austria":        {"rain": 0.30, "temp": 22},
    "Great Britain":  {"rain": 0.35, "temp": 18},
    "Belgium":        {"rain": 0.40, "temp": 17},
    "Hungary":        {"rain": 0.15, "temp": 30},
    "Netherlands":    {"rain": 0.30, "temp": 18},
    "Italy":          {"rain": 0.10, "temp": 26},
    "Azerbaijan":     {"rain": 0.05, "temp": 22},
    "Singapore":      {"rain": 0.20, "temp": 30},
    "United States":  {"rain": 0.10, "temp": 24},
    "Mexico":         {"rain": 0.15, "temp": 20},
    "Brazil":         {"rain": 0.30, "temp": 24},
    "Las Vegas":      {"rain": 0.02, "temp": 14},
    "Qatar":          {"rain": 0.02, "temp": 28},
    "Abu Dhabi":      {"rain": 0.02, "temp": 28},
}

GP_DATA_YEARS = {k: [2023, 2024, 2025] for k in GP_WEATHER}
GP_DATA_YEARS["China"] = [2024, 2025]
GP_DATA_YEARS["Emilia Romagna"] = [2024, 2025]


# ═════════════════════════════════════════════════════════════════════════
# season.json  →  SeasonData
# ═════════════════════════════════════════════════════════════════════════

def export_season_metadata():
    """Export season.json matching the SeasonData TS interface."""
    _ensure_dirs()

    # ── Calendar (RaceCalendarEntry[]) ──
    calendar = []
    for rnd, info in sorted(CALENDAR_2026.items()):
        char = CIRCUIT_CHARACTERISTICS.get(info["gp_key"], {})
        calendar.append({
            "round":        rnd,
            "name":         info["name"],
            "gpKey":        info["gp_key"],
            "circuit":      info["circuit"],
            "date":         info["date"],
            "laps":         info["laps"],
            "circuitKm":    info["circuit_km"],
            "circuitType":  char.get("type", "permanent"),
            "expectedStops": char.get("expected_stops", 2),
            "tyreDeg":      char.get("tyre_deg", 0.5),
            "overtaking":   char.get("overtaking", 0.5),
            "country":      info["gp_key"],
            "sprint":       info.get("sprint", False),
            "sprintLaps":   info.get("sprint_laps", 0),
            "drsZones":     char.get("drs_zones", 2),
            "safetyCarLikelihood": char.get("safety_car_likelihood", 0.4),
            "altitudeM":    char.get("altitude_m", 0),
        })

    # ── Drivers (DriverInfo[]) ──
    drivers = []
    for code, team in DRIVER_TEAM_2026.items():
        drivers.append({
            "code":      code,
            "fullName":  DRIVER_FULL_NAMES.get(code, code),
            "number":    DRIVER_NUMBERS_2026.get(code, 0),
            "team":      team,
            "teamColor": TEAM_COLOURS.get(team, "#888888"),
        })

    # ── Teams (TeamInfo[]) ──
    teams = []
    for team, color in TEAM_COLOURS.items():
        team_drivers = [d["code"] for d in drivers if d["team"] == team]
        teams.append({
            "name":                 team,
            "color":                color,
            "drivers":              team_drivers,
            "constructorPoints2025": CONSTRUCTOR_POINTS_2025.get(team, 0),
            "performanceScore":     round(TEAM_PERFORMANCE_SCORE.get(team, 0.0), 4),
        })

    # ── Completed rounds (detect from existing round files) ──
    completed = []
    for rnd in range(1, 25):
        path = os.path.join(ROUNDS_DIR, f"round_{rnd:02d}.json")
        if os.path.exists(path):
            completed.append(rnd)

    season = {
        "season":          2026,
        "totalRounds":     24,
        "calendar":        calendar,
        "drivers":         drivers,
        "teams":           teams,
        "completedRounds": completed,
    }

    path = os.path.join(DATA_DIR, "season.json")
    _write_json(path, season)
    print(f"✅ Season metadata → {path}")
    return season


# ═════════════════════════════════════════════════════════════════════════
# round_XX.json  →  RoundData
# ═════════════════════════════════════════════════════════════════════════

def export_round_data(round_num, return_merged=False, use_lstm=False,
                      use_weather_api=False, use_telemetry=False):
    """Run prediction pipeline for one round; export JSON + visualisations.
    If return_merged=True, returns (round_data, merged_df) for advanced models.
    If use_lstm=True, computes LSTM grid predictions and feeds them into
    the ensemble as a true 3rd model (v3 architecture).
    If use_weather_api=True, fetches real-time weather from Open-Meteo API.
    If use_telemetry=True, extracts speed trap and sector time data from FastF1."""
    _ensure_dirs()
    info    = CALENDAR_2026[round_num]
    gp_key  = info["gp_key"]
    gp_name = info["name"]
    weather = GP_WEATHER.get(gp_key, {"rain": 0.10, "temp": 22})
    weather_full = None  # extended weather data for website
    years   = GP_DATA_YEARS.get(gp_key, [2023, 2024, 2025])

    # ── Weather: real-time API or static fallback ──
    if use_weather_api:
        try:
            from weather_api import WeatherService
            ws = WeatherService()
            forecast = ws.get_race_forecast(gp_key, info["date"])
            weather = {"rain": forecast["rain_probability"],
                       "temp": forecast["temperature_c"]}
            weather_full = forecast  # keep all fields for the website
            print(f"  🌤️  Weather ({forecast.get('source', 'api')}): "
                  f"Rain {weather['rain']:.0%}, Temp {weather['temp']:.0f}°C"
                  f" — {forecast.get('weather_description', '')}")
        except Exception as e:
            print(f"  ⚠️  Weather API failed, using static: {e}")

    print(f"\n{'='*70}")
    print(f"  Round {round_num}: {gp_name}")
    print(f"{'='*70}")

    enable_cache()

    # ── ML pipeline ──
    laps            = load_multi_year_data(gp_key, years=years)
    driver_stats    = aggregate_driver_stats(laps)
    grid            = build_grid_dataframe()
    merged          = build_training_dataset(grid, driver_stats,
                                             circuit_key=gp_key,
                                             current_round=round_num,
                                             sprint=info.get("sprint", False))
    quali_estimates = generate_qualifying_estimates(gp_key)
    quali           = get_qualifying_or_estimates(2026, gp_key, quali_estimates)
    merged          = apply_qualifying_data(merged, quali,
                                            rain_probability=weather["rain"],
                                            temperature_c=weather["temp"],
                                            fallback_times=quali_estimates)

    # ── LSTM Grid Predictions (v3: true ensemble member) ──
    lstm_preds = None
    if use_lstm:
        try:
            from advanced_models import compute_lstm_grid_predictions
            lstm_preds = compute_lstm_grid_predictions(
                merged, gp_key, years=years)
        except Exception as e:
            print(f"  ⚠️  LSTM grid predictions failed: {e}")
            lstm_preds = None

    results         = train_ensemble(merged, max_spread_s=3.5,
                                     lstm_predictions=lstm_preds)
    merged          = results["merged"]
    merged          = apply_race_postprocessing(
        merged, circuit_key=gp_key, rain_probability=weather["rain"]
    )
    results["merged"] = merged
    metrics_df      = evaluate_models(results)
    classification  = predicted_classification(merged, gp_name)

    # ── Auto-save predicted result for race-to-race scaling (v3 NEW) ──
    try:
        save_predicted_result(round_num, classification)
    except Exception as e:
        print(f"  ⚠️  Could not save predicted result: {e}")

    # ── Generate visualisations ──
    round_viz_dir = os.path.join(VIZ_DIR, f"round_{round_num:02d}")
    os.makedirs(round_viz_dir, exist_ok=True)
    viz_filenames = _export_visualizations(results, merged, classification,
                                           round_viz_dir, gp_name)

    # ── Import any existing local visualisations ──
    local_viz = _import_local_visualizations(round_num, gp_name)
    for fname in local_viz:
        if fname not in viz_filenames:
            viz_filenames.append(fname)

    if ensure_track_map_asset(round_num, gp_key) and "track_map.png" not in viz_filenames:
        viz_filenames.append("track_map.png")

    viz_filenames = _dedupe_preserve_order(viz_filenames)
    viz_details = _build_visualization_details(viz_filenames)

    # ── Classification → ClassificationEntry[] ──
    classification_data = []
    for pos, row in classification.iterrows():
        gap_val = float(row["Gap"])
        gap_str = "LEADER" if pos == 1 else f"{gap_val:.3f}"
        classification_data.append({
            "position":      int(pos),
            "driver":        row["Driver"],
            "driverFullName": row["DriverName"],
            "team":          row["Team"],
            "teamColor":     TEAM_COLOURS.get(row["Team"], "#888"),
            "predictedTime": round(float(row["PredictedLapTime"]), 3),
            "gap":           gap_str,
            "points":        int(row["Points"]),
            "confidence":    row.get("PredictionConfidence", "Medium"),
            "finishRangeLow": int(row.get("FinishRangeLow", pos)),
            "finishRangeHigh": int(row.get("FinishRangeHigh", pos)),
            "winProbability": round(float(row.get("WinProbability", 0.0)), 1),
        })

    # ── Metrics → ModelMetrics ──
    mae_vals = metrics_df["MAE (s)"].values
    r2_vals  = metrics_df["R²"].values
    pred     = merged["PredictedLapTime"]
    metrics_obj = {
        "r2Score":       round(float(r2_vals.mean()), 4),
        "mae":           round(float(mae_vals.mean()), 4),
        "maxSpread":     round(float(pred.max() - pred.min()), 3),
        "trainingYears": years,
        "avgUncertainty": round(float(merged["PredictionUncertainty"].mean()), 3),
    }

    # ── Feature importance → FeatureImportance[] ──
    feat_cols = results["feature_cols"]
    gb_imp    = results["gb_model"].feature_importances_
    xgb_imp   = results["xgb_model"].feature_importances_
    avg_imp   = (gb_imp + xgb_imp) / 2
    feature_importance = [
        {"feature": feat_cols[i], "importance": round(float(avg_imp[i]), 4)}
        for i in np.argsort(avg_imp)[::-1]
    ]

    # ── Derived helpers ──
    fastest_time = f"{classification_data[0]['predictedTime']:.3f}s"
    podium = [
        classification_data[0]["driver"],
        classification_data[1]["driver"],
        classification_data[2]["driver"],
    ]
    confidence_counts = merged["PredictionConfidence"].value_counts().to_dict()
    quali_rank = (
        merged["AdjustedQualiTime"]
        .fillna(float(merged["AdjustedQualiTime"].dropna().median()))
        .rank(method="min")
    )
    race_rank = (
        merged["RaceProjectionTime"]
        .fillna(float(merged["RaceProjectionTime"].dropna().median()))
        .rank(method="min")
    )

    prediction_insights = {
        "poleToWinBias": round(float(quali_rank.eq(race_rank).mean() * 100), 1),
        "highConfidenceCount": int(confidence_counts.get("High", 0)),
        "mediumConfidenceCount": int(confidence_counts.get("Medium", 0)),
        "lowConfidenceCount": int(confidence_counts.get("Low", 0)),
        "mostLikelyWinner": classification_data[0]["driver"],
        "winnerProbability": classification_data[0].get("winProbability", 0.0),
        "closestBattle": {
            "drivers": [classification_data[1]["driver"], classification_data[2]["driver"]],
            "gap": round(float(classification_data[2]["predictedTime"] - classification_data[1]["predictedTime"]), 3),
        },
    }

    char = CIRCUIT_CHARACTERISTICS.get(gp_key, {})

    path = os.path.join(ROUNDS_DIR, f"round_{round_num:02d}.json")
    existing_round = _safe_load_json(path)

    round_data = {
        "round":              round_num,
        "name":               gp_name,
        "gpKey":              gp_key,
        "circuit":            info["circuit"],
        "date":               info["date"],
        "sprint":             info.get("sprint", False),
        "sprintLaps":         info.get("sprint_laps", 0),
        "classification":     classification_data,
        "metrics":            metrics_obj,
        "featureImportance":  feature_importance,
        "fastestLap":         fastest_time,
        "podium":             podium,
        "visualizations":     viz_filenames,
        "visualizationDetails": viz_details,
        "circuitInfo": {
            "type":           char.get("type", "permanent"),
            "laps":           info["laps"],
            "circuitKm":      info["circuit_km"],
            "expectedStops":  char.get("expected_stops", 2),
            "tyreDeg":        char.get("tyre_deg", 0.5),
            "overtaking":     char.get("overtaking", 0.5),
            "drsZones":       char.get("drs_zones", 2),
            "safetyCarLikelihood": char.get("safety_car_likelihood", 0.4),
            "altitudeM":      char.get("altitude_m", 0),
        },
        "weatherData": {
            "rainProbability": weather["rain"],
            "temperatureC":    weather["temp"],
            "humidity":         weather_full.get("humidity", None) if weather_full else None,
            "windSpeedKmh":     weather_full.get("wind_speed_kmh", None) if weather_full else None,
            "windDirection":    weather_full.get("wind_direction", None) if weather_full else None,
            "cloudCover":       weather_full.get("cloud_cover", None) if weather_full else None,
            "precipitationMm":  weather_full.get("precipitation_mm", None) if weather_full else None,
            "weatherDescription": weather_full.get("weather_description", None) if weather_full else None,
            "source":           weather_full.get("source", "static") if weather_full else "static",
        },
        "predictionInsights": prediction_insights,
    }

    round_data.update(_get_round_preserved_fields(round_num, existing_round))

    # ── Telemetry: speed traps & sector times from FastF1 ──
    if use_telemetry:
        try:
            from telemetry_features import extract_telemetry_for_round
            telemetry = extract_telemetry_for_round(round_num, year=years[-1] if years else 2025)
            if telemetry:
                round_data["telemetryData"] = _sanitize_telemetry_payload(telemetry)
        except Exception as e:
            print(f"  ⚠️  Telemetry extraction failed: {e}")

    _sync_tracker_data(round_num, round_data)

    # Ensure accuracy is refreshed for rounds with actual results even without tracker writes.
    if isinstance(round_data.get("actualResults"), dict) and round_data["actualResults"]:
        local_accuracy = _compute_round_accuracy(
            round_data.get("classification", []),
            round_data.get("actualResults", {}),
        )
        if local_accuracy:
            round_data["accuracy"] = local_accuracy

    _write_json(path, round_data)
    print(f"✅ Round {round_num} data → {path}")
    if return_merged:
        return round_data, merged
    return round_data


# ═════════════════════════════════════════════════════════════════════════
# Visualisations → returns list of PNG filenames (string[])
# ═════════════════════════════════════════════════════════════════════════

def _export_visualizations(results, merged, classification, out_dir, gp_name):
    """Generate publication-quality PNGs; return list of filenames."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    filenames = []

    # 1. Predicted Lap Times (horizontal bar)
    fig, ax = plt.subplots(figsize=(14, 10), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")
    data = merged.sort_values("PredictedLapTime", ascending=True).copy()
    colours = data["Team"].map(TEAM_COLOURS).fillna("#888")
    bars = ax.barh(data["Driver"], data["PredictedLapTime"],
                   color=colours, edgecolor="white", height=0.7, linewidth=0.5)
    ax.set_xlabel("Predicted Avg Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"2026 {gp_name} — Predicted Race Performance",
                 fontsize=16, fontweight="bold", color="white")
    ax.invert_yaxis()
    for bar, val in zip(bars, data["PredictedLapTime"]):
        ax.text(bar.get_width() + 0.02, bar.get_y() + bar.get_height() / 2,
                f"{val:.2f}s", va="center", fontsize=10, color="white")
    ax.tick_params(labelsize=11, colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    plt.tight_layout()
    fname = "predicted_laptimes.png"
    fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    filenames.append(fname)

    # 2. Feature Importance (side-by-side)
    feat_cols = results["feature_cols"]
    fig, axes = plt.subplots(1, 2, figsize=(16, 6), facecolor="#1a1a2e")
    for ax, model, title in zip(
        axes, [results["gb_model"], results["xgb_model"]],
        ["Gradient Boosting", "XGBoost"],
    ):
        ax.set_facecolor("#1a1a2e")
        imp = model.feature_importances_
        idx = np.argsort(imp)
        ax.barh(np.array(feat_cols)[idx], imp[idx], color="#E8002D")
        ax.set_xlabel("Importance", fontsize=12, color="white")
        ax.set_title(title, fontsize=14, fontweight="bold", color="white")
        ax.tick_params(labelsize=10, colors="white")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color("white")
        ax.spines["left"].set_color("white")
    plt.tight_layout()
    fname = "feature_importance.png"
    fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    filenames.append(fname)

    # 3. Team vs Pace scatter
    fig, ax = plt.subplots(figsize=(14, 9), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")
    sc = ax.scatter(merged["TeamPerformanceScore"], merged["PredictedLapTime"],
                    c=merged["QualifyingTime"], cmap="RdYlGn_r",
                    s=160, edgecolors="white", linewidths=0.5)
    for _, r in merged.iterrows():
        ax.annotate(r["Driver"],
                    (r["TeamPerformanceScore"], r["PredictedLapTime"]),
                    xytext=(8, 5), textcoords="offset points", fontsize=10,
                    color="white")
    cbar = plt.colorbar(sc, ax=ax, label="Qualifying Time (s)")
    cbar.ax.yaxis.label.set_color("white")
    cbar.ax.tick_params(colors="white")
    ax.set_xlabel("Team Performance Score", fontsize=13, color="white")
    ax.set_ylabel("Predicted Avg Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"Team Strength vs Pace — 2026 {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.tick_params(colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    plt.tight_layout()
    fname = "team_vs_pace.png"
    fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    filenames.append(fname)

    # 4. Pace vs Predicted scatter
    fig, ax = plt.subplots(figsize=(14, 9), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")
    sc = ax.scatter(merged["CleanAirPace"], merged["PredictedLapTime"],
                    c=merged["TeamPerformanceScore"], cmap="coolwarm",
                    s=160, edgecolors="white", linewidths=0.5)
    for _, r in merged.iterrows():
        ax.annotate(r["Driver"],
                    (r["CleanAirPace"], r["PredictedLapTime"]),
                    xytext=(8, 5), textcoords="offset points", fontsize=10,
                    color="white")
    cbar = plt.colorbar(sc, ax=ax, label="Team Perf. Score")
    cbar.ax.yaxis.label.set_color("white")
    cbar.ax.tick_params(colors="white")
    ax.set_xlabel("Clean Air Race Pace (s)", fontsize=13, color="white")
    ax.set_ylabel("Predicted Avg Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"Clean Air Pace vs Predicted — 2026 {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.tick_params(colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    plt.tight_layout()
    fname = "pace_vs_predicted.png"
    fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    filenames.append(fname)

    # 5. Lap-time distribution (box plot by team)
    fig, ax = plt.subplots(figsize=(14, 8), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")
    team_order = (merged.groupby("Team")["PredictedLapTime"].mean()
                  .sort_values().index.tolist())
    team_data = []
    team_labels = []
    team_colors_list = []
    for team in team_order:
        td = merged[merged["Team"] == team]
        team_data.append(td["PredictedLapTime"].values)
        team_labels.append(team)
        team_colors_list.append(TEAM_COLOURS.get(team, "#888"))

    bp = ax.boxplot(team_data, labels=team_labels, patch_artist=True, vert=True)
    for patch, color in zip(bp["boxes"], team_colors_list):
        patch.set_facecolor(color + "80")
        patch.set_edgecolor(color)
    for element in ["whiskers", "caps"]:
        for line in bp[element]:
            line.set_color("white")
    for median in bp["medians"]:
        median.set_color("white")
    ax.set_ylabel("Predicted Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"Lap Time Distribution by Team — 2026 {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.tick_params(axis="x", rotation=45, labelsize=10, colors="white")
    ax.tick_params(axis="y", colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    plt.tight_layout()
    fname = "laptime_distribution.png"
    fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    filenames.append(fname)

    # 6. Prediction confidence / expected finish range
    if {"PredictionUncertainty", "PredictionConfidence"}.issubset(merged.columns):
        fig, ax = plt.subplots(figsize=(14, 9), facecolor="#1a1a2e")
        ax.set_facecolor("#1a1a2e")
        conf_colors = {"High": "#00D2BE", "Medium": "#FF8000", "Low": "#E10600"}
        conf_df = classification.copy().reset_index()
        conf_df["Confidence"] = conf_df["Driver"].map(
            merged.set_index("Driver")["PredictionConfidence"].to_dict()
        )
        conf_df["RangeLow"] = conf_df["Driver"].map(
            merged.set_index("Driver")["PredictionUncertainty"].to_dict()
        )
        colors = [conf_colors.get(c, "#9CA3AF") for c in conf_df["Confidence"]]
        bars = ax.barh(conf_df["Driver"], conf_df["Gap"], color=colors, edgecolor="white", linewidth=0.5)
        ax.invert_yaxis()
        ax.set_xlabel("Projected Gap to Winner (s)", fontsize=13, color="white")
        ax.set_title(f"Prediction Confidence — 2026 {gp_name}",
                     fontsize=16, fontweight="bold", color="white")
        for bar, confidence in zip(bars, conf_df["Confidence"]):
            ax.text(
                bar.get_width() + 0.03,
                bar.get_y() + bar.get_height() / 2,
                str(confidence).upper(),
                va="center",
                fontsize=9,
                color="white",
                fontweight="bold",
            )
        ax.tick_params(colors="white")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color("white")
        ax.spines["left"].set_color("white")
        legend_patches = [
            plt.Rectangle((0, 0), 1, 1, color=color, label=label)
            for label, color in conf_colors.items()
        ]
        ax.legend(handles=legend_patches, loc="lower right", facecolor="#1a1a2e",
                  edgecolor="white", labelcolor="white", fontsize=10)
        plt.tight_layout()
        fname = "prediction_confidence.png"
        fig.savefig(os.path.join(out_dir, fname), dpi=150, bbox_inches="tight",
                    facecolor=fig.get_facecolor())
        plt.close(fig)
        filenames.append(fname)

    print(f"  📊 {len(filenames)} visualisations → {out_dir}/")
    return filenames


def _import_local_visualizations(round_num, gp_name):
    """Copy any existing visualizations from the local visualizations/ directory
    (generated by standalone race scripts or report_results.py) into the website
    public directory. Returns list of additional filenames imported."""
    import shutil
    # Map GP name to directory name (e.g. "Australian Grand Prix" → "Australian_Grand_Prix")
    dir_name = gp_name.replace(" ", "_")
    local_dir = os.path.join(PROJECT_ROOT, "visualizations", dir_name)
    if not os.path.isdir(local_dir):
        return []

    round_viz_dir = os.path.join(VIZ_DIR, f"round_{round_num:02d}")
    os.makedirs(round_viz_dir, exist_ok=True)

    imported = []
    for fname in os.listdir(local_dir):
        if fname.lower().endswith(".png"):
            src = os.path.join(local_dir, fname)
            dst = os.path.join(round_viz_dir, fname)
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
                imported.append(fname)
    if imported:
        print(f"  📂 Imported {len(imported)} local visualisation(s) from {local_dir}/")
    return imported


# ═════════════════════════════════════════════════════════════════════════
# standings.json  →  StandingsData
# ═════════════════════════════════════════════════════════════════════════

def export_standings():
    """Export cumulative standings matching the StandingsData TS interface."""
    _ensure_dirs()

    def _ensure_team(team_name):
        if team_name not in constructor_pts:
            constructor_pts[team_name] = 0
            constructor_wins[team_name] = 0
            constructor_pts_per_rnd[team_name] = []

    # Accumulators
    driver_pts         = {code: 0 for code in DRIVER_TEAM_2026}
    driver_wins        = {code: 0 for code in DRIVER_TEAM_2026}
    driver_podiums     = {code: 0 for code in DRIVER_TEAM_2026}
    driver_pts_per_rnd = {code: [] for code in DRIVER_TEAM_2026}
    constructor_pts    = {team: 0 for team in TEAM_COLOURS}
    constructor_wins   = {team: 0 for team in TEAM_COLOURS}
    constructor_pts_per_rnd = {team: [] for team in TEAM_COLOURS}
    last_round = 0

    # Iterate over completed round files
    for rnd in range(1, 25):
        path = os.path.join(ROUNDS_DIR, f"round_{rnd:02d}.json")
        if not os.path.exists(path):
            continue
        with open(path) as f:
            data = json.load(f)
        last_round = rnd

        # Completed rounds should use actual race outcomes when available.
        if isinstance(data.get("actualResults"), dict) and data["actualResults"]:
            actual_rows = sorted(data["actualResults"].items(), key=lambda x: x[1])
            for drv, pos in actual_rows:
                team = DRIVER_TEAM_2026.get(drv, "Unknown")
                pts = F1_POINTS.get(int(pos), 0)
                _ensure_team(team)
                driver_pts[drv] = driver_pts.get(drv, 0) + pts
                constructor_pts[team] = constructor_pts.get(team, 0) + pts
                if int(pos) == 1:
                    driver_wins[drv] = driver_wins.get(drv, 0) + 1
                    constructor_wins[team] = constructor_wins.get(team, 0) + 1
                if int(pos) <= 3:
                    driver_podiums[drv] = driver_podiums.get(drv, 0) + 1
        else:
            for entry in data["classification"]:
                pts  = entry["points"]
                drv  = entry["driver"]
                team = entry["team"]
                pos  = entry["position"]
                _ensure_team(team)
                driver_pts[drv]       = driver_pts.get(drv, 0) + pts
                constructor_pts[team] = constructor_pts.get(team, 0) + pts
                if pos == 1:
                    driver_wins[drv]       = driver_wins.get(drv, 0) + 1
                    constructor_wins[team] = constructor_wins.get(team, 0) + 1
                if pos <= 3:
                    driver_podiums[drv] = driver_podiums.get(drv, 0) + 1

        # Record cumulative snapshot after this round
        for code in DRIVER_TEAM_2026:
            driver_pts_per_rnd[code].append(driver_pts[code])
        for team in constructor_pts:
            constructor_pts_per_rnd[team].append(constructor_pts[team])

    # ── DriverStanding[] ──
    driver_list = []
    sorted_drivers = sorted(DRIVER_TEAM_2026.keys(),
                            key=lambda d: (-driver_pts[d], -driver_wins[d]))
    for i, code in enumerate(sorted_drivers, start=1):
        team = DRIVER_TEAM_2026[code]
        driver_list.append({
            "position":       i,
            "driver":         code,
            "driverFullName": DRIVER_FULL_NAMES.get(code, code),
            "team":           team,
            "teamColor":      TEAM_COLOURS.get(team, "#888"),
            "points":         driver_pts[code],
            "wins":           driver_wins[code],
            "podiums":        driver_podiums[code],
            "pointsHistory":  driver_pts_per_rnd[code],
        })

    # ── ConstructorStanding[] ──
    constructor_list = []
    sorted_constructors = sorted(constructor_pts.keys(),
                                 key=lambda t: (-constructor_pts[t],
                                                -constructor_wins[t]))
    for i, team in enumerate(sorted_constructors, start=1):
        team_drivers = [d for d in sorted_drivers
                        if DRIVER_TEAM_2026[d] == team]
        constructor_list.append({
            "position":      i,
            "team":          team,
            "teamColor":     TEAM_COLOURS.get(team, "#888"),
            "points":        constructor_pts[team],
            "wins":          constructor_wins[team],
            "drivers":       team_drivers,
            "pointsHistory": constructor_pts_per_rnd[team],
        })

    # ── WDCPossibility[] ──
    remaining_rounds  = 24 - last_round
    max_remaining_pts = remaining_rounds * 26  # 25 (win) + 1 (fastest lap)
    leader_pts_val    = driver_list[0]["points"] if driver_list else 0
    wdc_possibility   = []
    for d in driver_list:
        max_possible = d["points"] + max_remaining_pts
        wdc_possibility.append({
            "driver":            d["driver"],
            "driverFullName":    d["driverFullName"],
            "team":              d["team"],
            "teamColor":         d["teamColor"],
            "currentPoints":     d["points"],
            "maxPossiblePoints": max_possible,
            "canStillWin":       max_possible >= leader_pts_val,
        })

    standings = {
        "lastUpdatedRound": last_round,
        "drivers":          driver_list,
        "constructors":     constructor_list,
        "wdcPossibility":   wdc_possibility,
    }

    path = os.path.join(DATA_DIR, "standings.json")
    _write_json(path, standings)
    print(f"✅ Standings → {path}")
    return standings


# ═════════════════════════════════════════════════════════════════════════
# FastF1 bonus visualisations (optional – may fail without current data)
# ═════════════════════════════════════════════════════════════════════════

def _generate_fastf1_viz(round_num, gp_key, year=2024):
    """Try to generate FastF1-based historical visualisations.
    Returns list of additional filenames (empty if data unavailable).
    """
    extra = []
    try:
        from generate_fastf1_viz import generate_all_for_circuit
        results = generate_all_for_circuit(gp_key, year, round_num)
        if results.get("track_map"):
            extra.append("track_map.png")
        if results.get("laptime_dist"):
            extra.append("laptime_distribution_historical.png")
        if results.get("tyre_strategy"):
            extra.append("tyre_strategy.png")
    except Exception as e:
        print(f"  ℹ️  FastF1 viz skipped: {e}")
    return extra


# ═════════════════════════════════════════════════════════════════════════
# CLI
# ═════════════════════════════════════════════════════════════════════════

def _run_advanced(round_data, merged):
    """Run advanced models (pit strategy, tyre deg, LSTM, season tracker)
    and append extra viz filenames to round_data."""
    try:
        from advanced_models import generate_advanced_features
        round_num = round_data["round"]
        out_dir = os.path.join(VIZ_DIR, f"round_{round_num:02d}")
        adv = generate_advanced_features(
            round_num,
            round_data["classification"],
            merged,
            out_dir=out_dir,
            gp_name=round_data["name"],
        )
        extra = adv.get("extra_visualizations", [])
        if extra:
            round_data["visualizations"].extend(extra)
        round_data["visualizations"] = _dedupe_preserve_order(round_data.get("visualizations", []))
        round_data["visualizationDetails"] = _build_visualization_details(
            round_data.get("visualizations", [])
        )
        # Attach advanced data sections
        for key in ("strategyData", "tyreDegData", "lstmData", "trackerData"):
            if key in adv:
                round_data[key] = adv[key]

        _sync_tracker_data(round_num, round_data)

        # Re-save round file with additions
        path = os.path.join(ROUNDS_DIR, f"round_{round_num:02d}.json")
        _write_json(path, round_data)
        print(f"  ✅ Advanced features appended → {path}")
    except Exception as e:
        print(f"  ⚠️  Advanced features failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="Export F1 prediction data for website")
    parser.add_argument("--round",    type=int, help="Export specific round (1-24)")
    parser.add_argument("--all",      action="store_true", help="Export all rounds")
    parser.add_argument("--metadata", action="store_true", help="Export season metadata only")
    parser.add_argument("--fastf1",   action="store_true",
                        help="Also generate FastF1 historical visualisations")
    parser.add_argument("--advanced", action="store_true",
                        help="Run advanced models (pit strategy, tyre deg, LSTM, tracker)")
    parser.add_argument("--weather",  action="store_true",
                        help="Use real-time weather API (Open-Meteo) instead of static estimates")
    parser.add_argument("--telemetry", action="store_true",
                        help="Extract speed trap and sector time data from FastF1")
    parser.add_argument("--fastf1-year", type=int, default=2024,
                        help="Year for FastF1 historical data (default 2024)")
    args = parser.parse_args()

    if args.round:
        round_data, merged = export_round_data(args.round,
                                                return_merged=True,
                                                use_lstm=args.advanced,
                                                use_weather_api=args.weather,
                                                use_telemetry=args.telemetry)
        if args.fastf1:
            gp_key = CALENDAR_2026[args.round]["gp_key"]
            extra = _generate_fastf1_viz(args.round, gp_key, args.fastf1_year)
            if extra:
                round_data["visualizations"].extend(extra)
                round_data["visualizations"] = _dedupe_preserve_order(round_data.get("visualizations", []))
                round_data["visualizationDetails"] = _build_visualization_details(
                    round_data.get("visualizations", [])
                )
                path = os.path.join(ROUNDS_DIR, f"round_{args.round:02d}.json")
                _write_json(path, round_data)
        if args.advanced:
            _run_advanced(round_data, merged)
        if args.weather:
            try:
                from weather_api import export_weather_for_website
                export_weather_for_website(CALENDAR_2026)
            except Exception as e:
                print(f"  ⚠️  Weather export failed: {e}")
        export_standings()
        export_season_metadata()
    elif args.all:
        # Process rounds SEQUENTIALLY — each round's prediction feeds the
        # next round's race-to-race features (v3 architecture).
        for rnd in range(1, 25):
            try:
                rd, merged = export_round_data(rnd, return_merged=True,
                                                use_lstm=args.advanced,
                                                use_weather_api=args.weather,
                                                use_telemetry=args.telemetry)
                if args.fastf1:
                    gp_key = CALENDAR_2026[rnd]["gp_key"]
                    extra = _generate_fastf1_viz(rnd, gp_key, args.fastf1_year)
                    if extra:
                        rd["visualizations"].extend(extra)
                        rd["visualizations"] = _dedupe_preserve_order(rd.get("visualizations", []))
                        rd["visualizationDetails"] = _build_visualization_details(
                            rd.get("visualizations", [])
                        )
                        path = os.path.join(ROUNDS_DIR, f"round_{rnd:02d}.json")
                        _write_json(path, rd)
                if args.advanced:
                    _run_advanced(rd, merged)
            except Exception as e:
                print(f"⚠️  Round {rnd} failed: {e}")
        if args.weather:
            try:
                from weather_api import export_weather_for_website
                export_weather_for_website(CALENDAR_2026)
            except Exception as e:
                print(f"  ⚠️  Weather export failed: {e}")
        export_standings()
        export_season_metadata()
    elif args.metadata:
        export_season_metadata()
        export_standings()
    else:
        # Default: metadata + round 1
        export_round_data(1)
        export_standings()
        export_season_metadata()

    print("\n🏁 Website data export complete!")


if __name__ == "__main__":
    main()
