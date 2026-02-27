"""
f1_prediction_utils.py  —  v2.0
================================
Shared utility module for the 2026 Formula 1 Grand Prix prediction project.

**v2.0 improvements over v1:**
  - StandardScaler prevents single-feature dominance
  - Team-change adjustment for drivers who switched constructors
  - Pit-strategy and tyre-degradation features
  - Circuit-specific characteristics (type, pit loss, expected stops)
  - Prediction calibration → realistic F1 gaps (≤ 3-4 s spread)
  - Current-season form tracking (earlier results feed later predictions)
  - Driver experience & qualifying-rank features
  - Complete 2026 calendar (24 rounds)
  - HTML race-report generation

Import in any race-specific script:
    >>> from f1_prediction_utils import *
"""

# ==========================================================================
# 1. IMPORTS
# ==========================================================================
import warnings
warnings.filterwarnings("ignore")

import os, json
import numpy as np
import pandas as pd
import fastf1

from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

import matplotlib
matplotlib.use("Agg")          # non-interactive backend for scripts
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({"figure.dpi": 120, "figure.figsize": (12, 6)})


# ==========================================================================
# 2. 2026 SEASON CONSTANTS
# ==========================================================================

# ---- 2026 Official F1 Grid (11 teams, 22 drivers) -----------------------
DRIVER_TEAM_2026: dict[str, str] = {
    "VER": "Red Bull Racing",  "HAD": "Red Bull Racing",
    "NOR": "McLaren",          "PIA": "McLaren",
    "LEC": "Ferrari",          "HAM": "Ferrari",
    "ANT": "Mercedes",         "RUS": "Mercedes",
    "ALO": "Aston Martin",    "STR": "Aston Martin",
    "GAS": "Alpine",           "COL": "Alpine",
    "ALB": "Williams",         "SAI": "Williams",
    "LAW": "Racing Bulls",     "LIN": "Racing Bulls",
    "OCO": "Haas",             "BEA": "Haas",
    "BOR": "Audi",             "HUL": "Audi",
    "PER": "Cadillac",         "BOT": "Cadillac",
}

DRIVER_NUMBERS_2026: dict[str, int] = {
    "NOR": 1, "VER": 3, "BOR": 5, "HAD": 6, "GAS": 10,
    "PER": 11, "ANT": 12, "ALO": 14, "LEC": 16, "STR": 18,
    "ALB": 23, "HUL": 27, "LAW": 30, "OCO": 31, "LIN": 41,
    "COL": 43, "HAM": 44, "SAI": 55, "RUS": 63, "BOT": 77,
    "PIA": 81, "BEA": 87,
}

DRIVER_FULL_NAMES: dict[str, str] = {
    "VER": "Max Verstappen",    "HAD": "Isack Hadjar",
    "NOR": "Lando Norris",      "PIA": "Oscar Piastri",
    "LEC": "Charles Leclerc",   "HAM": "Lewis Hamilton",
    "ANT": "Kimi Antonelli",    "RUS": "George Russell",
    "ALO": "Fernando Alonso",   "STR": "Lance Stroll",
    "GAS": "Pierre Gasly",      "COL": "Franco Colapinto",
    "ALB": "Alexander Albon",   "SAI": "Carlos Sainz Jr.",
    "LAW": "Liam Lawson",       "LIN": "Arvid Lindblad",
    "OCO": "Esteban Ocon",      "BEA": "Oliver Bearman",
    "BOR": "Gabriel Bortoleto", "HUL": "Nico Hülkenberg",
    "PER": "Sergio Pérez",      "BOT": "Valtteri Bottas",
}

# ---- 2025 Final Constructor Championship Points -------------------------
CONSTRUCTOR_POINTS_2025: dict[str, int] = {
    "McLaren": 666, "Ferrari": 652, "Red Bull Racing": 589,
    "Mercedes": 468, "Aston Martin": 94, "Williams": 72,
    "Racing Bulls": 64, "Haas": 58, "Alpine": 52,
    "Audi": 12, "Cadillac": 0,
}
_max_pts = max(CONSTRUCTOR_POINTS_2025.values())
TEAM_PERFORMANCE_SCORE: dict[str, float] = {
    t: p / _max_pts for t, p in CONSTRUCTOR_POINTS_2025.items()
}

# ---- Wet-weather driver performance factor (lower = faster in wet) -------
WET_PERFORMANCE: dict[str, float] = {
    "VER": 0.975, "HAM": 0.976, "LEC": 0.976, "NOR": 0.978,
    "ALO": 0.973, "RUS": 0.969, "SAI": 0.979, "PIA": 0.978,
    "GAS": 0.979, "STR": 0.980, "ALB": 0.983, "OCO": 0.982,
    "HUL": 0.985, "LAW": 0.990, "ANT": 0.992, "HAD": 0.994,
    "BEA": 0.991, "BOR": 0.995, "COL": 0.993, "LIN": 0.994,
    "PER": 0.977, "BOT": 0.980,
}

# ---- Clean-air race pace estimates (seconds, lower = faster) -------------
CLEAN_AIR_PACE: dict[str, float] = {
    "VER": 92.8, "NOR": 93.0, "LEC": 93.1, "PIA": 93.2,
    "HAM": 93.5, "RUS": 93.4, "SAI": 93.9, "ALO": 94.5,
    "GAS": 94.3, "ALB": 94.2, "LAW": 93.8, "ANT": 94.1,
    "STR": 95.0, "HUL": 95.1, "OCO": 94.6, "HAD": 94.4,
    "BEA": 94.8, "BOR": 95.5, "COL": 94.7, "LIN": 94.9,
    "PER": 93.6, "BOT": 95.2,
}

# ---- Team colours --------------------------------------------------------
TEAM_COLOURS: dict[str, str] = {
    "Red Bull Racing": "#3671C6", "McLaren": "#FF8000",
    "Ferrari": "#E8002D",         "Mercedes": "#27F4D2",
    "Aston Martin": "#229971",    "Alpine": "#FF87BC",
    "Williams": "#64C4FF",        "Racing Bulls": "#6692FF",
    "Haas": "#B6BABD",            "Audi": "#1E1E1E",
    "Cadillac": "#C0C0C0",
}

# ---- F1 points system (top 10) ------------------------------------------
F1_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}

# ---- Complete 2026 Calendar (24 rounds) ----------------------------------
CALENDAR_2026 = {
    1:  {"name": "Australian Grand Prix",     "gp_key": "Australia",      "circuit": "Albert Park",            "date": "2026-03-08", "laps": 58, "circuit_km": 5.278},
    2:  {"name": "Chinese Grand Prix",        "gp_key": "China",          "circuit": "Shanghai International", "date": "2026-03-22", "laps": 56, "circuit_km": 5.451},
    3:  {"name": "Japanese Grand Prix",       "gp_key": "Japan",          "circuit": "Suzuka",                 "date": "2026-04-05", "laps": 53, "circuit_km": 5.807},
    4:  {"name": "Bahrain Grand Prix",        "gp_key": "Bahrain",        "circuit": "Sakhir",                 "date": "2026-04-19", "laps": 57, "circuit_km": 5.412},
    5:  {"name": "Saudi Arabian Grand Prix",  "gp_key": "Saudi Arabia",   "circuit": "Jeddah Corniche",        "date": "2026-05-03", "laps": 50, "circuit_km": 6.174},
    6:  {"name": "Miami Grand Prix",          "gp_key": "Miami",          "circuit": "Miami International",    "date": "2026-05-17", "laps": 57, "circuit_km": 5.412},
    7:  {"name": "Emilia Romagna Grand Prix", "gp_key": "Emilia Romagna", "circuit": "Imola",                  "date": "2026-05-31", "laps": 63, "circuit_km": 4.909},
    8:  {"name": "Monaco Grand Prix",         "gp_key": "Monaco",         "circuit": "Monaco",                 "date": "2026-06-07", "laps": 78, "circuit_km": 3.337},
    9:  {"name": "Spanish Grand Prix",        "gp_key": "Spain",          "circuit": "Barcelona-Catalunya",    "date": "2026-06-21", "laps": 66, "circuit_km": 4.657},
    10: {"name": "Canadian Grand Prix",       "gp_key": "Canada",         "circuit": "Circuit Gilles Villeneuve", "date": "2026-06-28", "laps": 70, "circuit_km": 4.361},
    11: {"name": "Austrian Grand Prix",       "gp_key": "Austria",        "circuit": "Red Bull Ring",          "date": "2026-07-05", "laps": 71, "circuit_km": 4.318},
    12: {"name": "British Grand Prix",        "gp_key": "Great Britain",  "circuit": "Silverstone",            "date": "2026-07-19", "laps": 52, "circuit_km": 5.891},
    13: {"name": "Belgian Grand Prix",        "gp_key": "Belgium",        "circuit": "Spa-Francorchamps",      "date": "2026-07-26", "laps": 44, "circuit_km": 7.004},
    14: {"name": "Hungarian Grand Prix",      "gp_key": "Hungary",        "circuit": "Hungaroring",            "date": "2026-08-02", "laps": 70, "circuit_km": 4.381},
    15: {"name": "Dutch Grand Prix",          "gp_key": "Netherlands",    "circuit": "Zandvoort",              "date": "2026-08-30", "laps": 72, "circuit_km": 4.259},
    16: {"name": "Italian Grand Prix",        "gp_key": "Italy",          "circuit": "Monza",                  "date": "2026-09-06", "laps": 53, "circuit_km": 5.793},
    17: {"name": "Azerbaijan Grand Prix",     "gp_key": "Azerbaijan",     "circuit": "Baku City Circuit",      "date": "2026-09-20", "laps": 51, "circuit_km": 6.003},
    18: {"name": "Singapore Grand Prix",      "gp_key": "Singapore",      "circuit": "Marina Bay",             "date": "2026-10-04", "laps": 62, "circuit_km": 4.940},
    19: {"name": "United States Grand Prix",  "gp_key": "United States",  "circuit": "COTA",                   "date": "2026-10-18", "laps": 56, "circuit_km": 5.513},
    20: {"name": "Mexico City Grand Prix",    "gp_key": "Mexico",         "circuit": "Autódromo Hermanos Rodríguez", "date": "2026-10-25", "laps": 71, "circuit_km": 4.304},
    21: {"name": "São Paulo Grand Prix",      "gp_key": "Brazil",         "circuit": "Interlagos",             "date": "2026-11-08", "laps": 71, "circuit_km": 4.309},
    22: {"name": "Las Vegas Grand Prix",      "gp_key": "Las Vegas",      "circuit": "Las Vegas Strip",        "date": "2026-11-22", "laps": 50, "circuit_km": 6.201},
    23: {"name": "Qatar Grand Prix",          "gp_key": "Qatar",          "circuit": "Lusail",                 "date": "2026-11-29", "laps": 57, "circuit_km": 5.419},
    24: {"name": "Abu Dhabi Grand Prix",      "gp_key": "Abu Dhabi",      "circuit": "Yas Marina",             "date": "2026-12-06", "laps": 58, "circuit_km": 5.281},
}

# ---- Circuit characteristics (for pit / tyre / weather modelling) --------
CIRCUIT_CHARACTERISTICS: dict[str, dict] = {
    "Australia":      {"type": "street-park",  "base_quali_s": 74.8,  "expected_stops": 2, "pit_loss_s": 22.5, "tyre_deg": 0.55, "overtaking": 0.6},
    "China":          {"type": "permanent",    "base_quali_s": 93.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.60, "overtaking": 0.7},
    "Japan":          {"type": "permanent",    "base_quali_s": 88.0,  "expected_stops": 2, "pit_loss_s": 22.0, "tyre_deg": 0.65, "overtaking": 0.4},
    "Bahrain":        {"type": "permanent",    "base_quali_s": 87.0,  "expected_stops": 2, "pit_loss_s": 23.5, "tyre_deg": 0.70, "overtaking": 0.8},
    "Saudi Arabia":   {"type": "street",       "base_quali_s": 87.5,  "expected_stops": 2, "pit_loss_s": 22.0, "tyre_deg": 0.45, "overtaking": 0.5},
    "Miami":          {"type": "street-park",  "base_quali_s": 88.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.55, "overtaking": 0.6},
    "Emilia Romagna": {"type": "permanent",    "base_quali_s": 75.5,  "expected_stops": 2, "pit_loss_s": 22.0, "tyre_deg": 0.50, "overtaking": 0.4},
    "Monaco":         {"type": "street",       "base_quali_s": 70.5,  "expected_stops": 1, "pit_loss_s": 21.5, "tyre_deg": 0.30, "overtaking": 0.1},
    "Spain":          {"type": "permanent",    "base_quali_s": 76.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.70, "overtaking": 0.5},
    "Canada":         {"type": "semi-street",  "base_quali_s": 72.0,  "expected_stops": 2, "pit_loss_s": 22.5, "tyre_deg": 0.50, "overtaking": 0.7},
    "Austria":        {"type": "permanent",    "base_quali_s": 64.5,  "expected_stops": 2, "pit_loss_s": 22.0, "tyre_deg": 0.65, "overtaking": 0.7},
    "Great Britain":  {"type": "permanent",    "base_quali_s": 86.5,  "expected_stops": 2, "pit_loss_s": 22.5, "tyre_deg": 0.60, "overtaking": 0.6},
    "Belgium":        {"type": "permanent",    "base_quali_s": 105.0, "expected_stops": 2, "pit_loss_s": 23.5, "tyre_deg": 0.55, "overtaking": 0.7},
    "Hungary":        {"type": "permanent",    "base_quali_s": 76.0,  "expected_stops": 2, "pit_loss_s": 22.0, "tyre_deg": 0.60, "overtaking": 0.3},
    "Netherlands":    {"type": "permanent",    "base_quali_s": 70.0,  "expected_stops": 1, "pit_loss_s": 22.0, "tyre_deg": 0.45, "overtaking": 0.3},
    "Italy":          {"type": "permanent",    "base_quali_s": 79.5,  "expected_stops": 1, "pit_loss_s": 23.0, "tyre_deg": 0.40, "overtaking": 0.8},
    "Azerbaijan":     {"type": "street",       "base_quali_s": 101.0, "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.45, "overtaking": 0.6},
    "Singapore":      {"type": "street",       "base_quali_s": 96.0,  "expected_stops": 2, "pit_loss_s": 23.5, "tyre_deg": 0.50, "overtaking": 0.4},
    "United States":  {"type": "permanent",    "base_quali_s": 94.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.60, "overtaking": 0.6},
    "Mexico":         {"type": "permanent",    "base_quali_s": 77.5,  "expected_stops": 2, "pit_loss_s": 23.5, "tyre_deg": 0.55, "overtaking": 0.5},
    "Brazil":         {"type": "permanent",    "base_quali_s": 70.5,  "expected_stops": 2, "pit_loss_s": 22.5, "tyre_deg": 0.55, "overtaking": 0.7},
    "Las Vegas":      {"type": "street",       "base_quali_s": 93.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.40, "overtaking": 0.7},
    "Qatar":          {"type": "permanent",    "base_quali_s": 82.0,  "expected_stops": 2, "pit_loss_s": 22.5, "tyre_deg": 0.70, "overtaking": 0.5},
    "Abu Dhabi":      {"type": "semi-street",  "base_quali_s": 84.0,  "expected_stops": 2, "pit_loss_s": 23.0, "tyre_deg": 0.55, "overtaking": 0.6},
}

# ---- Team changes 2025 → 2026 (old_team, new_team) ----------------------
# Only drivers whose constructor changed.  old_team=None → rookie / out in 2025
TEAM_CHANGES_2026: dict[str, tuple] = {
    "HAM": ("Mercedes", "Ferrari"),
    "SAI": ("Ferrari",  "Williams"),
    "PER": ("Red Bull Racing", "Cadillac"),
    "OCO": ("Alpine",   "Haas"),
    "HUL": ("Haas",     "Audi"),
    "HAD": ("Racing Bulls", "Red Bull Racing"),
    "BOT": (None,       "Cadillac"),       # not on 2025 grid
    "ANT": (None,       "Mercedes"),       # rookie
    "COL": (None,       "Alpine"),         # limited 2024 experience
    "LIN": (None,       "Racing Bulls"),   # rookie
    "BEA": (None,       "Haas"),           # limited experience
    "BOR": (None,       "Audi"),           # rookie
}

# ---- Driver qualifying offset from pole (fraction, smaller = faster) -----
# Used to auto-generate qualifying estimates for any circuit.
DRIVER_QUALI_OFFSET: dict[str, float] = {
    "VER": 0.000, "NOR": 0.002, "PIA": 0.001, "LEC": 0.003,
    "HAM": 0.005, "RUS": 0.004, "SAI": 0.009, "PER": 0.008,
    "ALO": 0.016, "ALB": 0.011, "LAW": 0.007, "GAS": 0.013,
    "ANT": 0.007, "STR": 0.020, "OCO": 0.017, "HUL": 0.019,
    "HAD": 0.012, "BEA": 0.016, "COL": 0.021, "LIN": 0.023,
    "BOR": 0.024, "BOT": 0.021,
}

# ---- Driver experience (career F1 race starts as of end-2025) -----------
DRIVER_EXPERIENCE: dict[str, int] = {
    "HAM": 353, "ALO": 400, "VER": 210, "BOT": 240, "PER": 280,
    "RUS": 110, "NOR": 130, "LEC": 145, "STR": 170, "GAS": 150,
    "OCO": 140, "ALB": 80,  "HUL": 225, "SAI": 200, "PIA": 50,
    "LAW": 25,  "HAD": 0,   "ANT": 0,   "COL": 10,  "LIN": 0,
    "BEA": 15,  "BOR": 0,
}

# ---- Team pit-stop speed ranking (seconds, lower = faster crew) ---------
TEAM_PIT_SPEED: dict[str, float] = {
    "Red Bull Racing": 2.1, "McLaren": 2.3, "Ferrari": 2.4,
    "Mercedes": 2.3, "Aston Martin": 2.6, "Alpine": 2.7,
    "Williams": 2.5, "Racing Bulls": 2.5, "Haas": 2.8,
    "Audi": 2.9, "Cadillac": 3.0,
}

# ---- Default feature columns (v2 — balanced) ----------------------------
DEFAULT_FEATURE_COLS: list[str] = [
    "TeamAdjustedPace",
    "TeamPerformanceScore",
    "CleanAirPace",
    "PitTimeLoss",
    "TyreDegFactor",
    "ExperienceFactor",
    "RainProbability",
    "Temperature",
    "CurrentForm",
]

# Path for storing actual race results as the season progresses
SEASON_RESULTS_FILE = "season_results_2026.json"


# ==========================================================================
# 3. DATA LOADING
# ==========================================================================

def enable_cache(cache_dir: str = "f1_cache") -> None:
    """Enable the FastF1 local cache directory."""
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)
    print(f"✅ FastF1 cache enabled at ./{cache_dir}")


def load_race_session(year, grand_prix, session_type="R"):
    """Load a single FastF1 session → DataFrame of lap/sector times."""
    print(f"  ⏳ Loading {year} {grand_prix} GP ({session_type}) …")
    session = fastf1.get_session(year, grand_prix, session_type)
    session.load(laps=True, telemetry=False, weather=False, messages=False)
    cols = ["Driver", "LapTime", "Sector1Time", "Sector2Time", "Sector3Time"]
    laps = session.laps[cols].copy()
    laps.dropna(inplace=True)
    for c in ["LapTime", "Sector1Time", "Sector2Time", "Sector3Time"]:
        laps[f"{c} (s)"] = laps[c].dt.total_seconds()
    laps["Year"] = year
    print(f"  ✅ {year} {grand_prix} — {len(laps)} laps loaded.")
    return laps


def load_multi_year_data(grand_prix, years=None, session_type="R"):
    """Load and concatenate race data across multiple seasons."""
    if years is None:
        years = [2023, 2024, 2025]
    frames = []
    for yr in tqdm(years, desc="Loading seasons", unit="season"):
        try:
            frames.append(load_race_session(yr, grand_prix, session_type))
        except Exception as exc:
            print(f"  ⚠️  Could not load {yr} {grand_prix}: {exc}")
    if not frames:
        raise RuntimeError(f"No data for {grand_prix} ({years}).")
    combined = pd.concat(frames, ignore_index=True)
    print(f"\n📊 Combined dataset: {len(combined)} laps across "
          f"{combined['Year'].nunique()} season(s).")
    return combined


# ==========================================================================
# 4. FEATURE ENGINEERING  (v2 — team-adjusted, pit/tyre, experience)
# ==========================================================================

def aggregate_driver_stats(laps):
    """Aggregate raw lap data → per-driver mean stats."""
    drivers = laps["Driver"].unique()
    rows = []
    for drv in tqdm(drivers, desc="Aggregating driver stats", unit="driver"):
        d = laps[laps["Driver"] == drv]
        rows.append({
            "Driver": drv,
            "AvgLapTime": d["LapTime (s)"].mean(),
            "Sector1": d["Sector1Time (s)"].mean(),
            "Sector2": d["Sector2Time (s)"].mean(),
            "Sector3": d["Sector3Time (s)"].mean(),
            "LapCount": len(d),
        })
    stats = pd.DataFrame(rows)
    stats["TotalSectorTime"] = stats["Sector1"] + stats["Sector2"] + stats["Sector3"]
    print(f"✅ Aggregated stats for {len(stats)} unique drivers.")
    return stats


def build_grid_dataframe():
    """Create a 22-row DataFrame of the 2026 grid with enriched features."""
    grid = pd.DataFrame(
        [{"Driver": c, "Team": t} for c, t in DRIVER_TEAM_2026.items()]
    )
    grid["DriverName"]           = grid["Driver"].map(DRIVER_FULL_NAMES)
    grid["DriverNumber"]         = grid["Driver"].map(DRIVER_NUMBERS_2026)
    grid["TeamPerformanceScore"] = grid["Team"].map(TEAM_PERFORMANCE_SCORE)
    grid["CleanAirPace"]         = grid["Driver"].map(CLEAN_AIR_PACE)
    grid["WetPerformance"]       = grid["Driver"].map(WET_PERFORMANCE)
    return grid


def _apply_team_change_adjustment(merged):
    """Adjust historical lap / sector times for drivers who changed teams.

    If a driver moved from a stronger team to a weaker one, their raw
    historical times need to be *increased* (they'll be slower in a worse
    car).  Conversely, a move to a better team → slightly faster.

    Factor: 1 + alpha * (old_score - new_score),  alpha = 0.08
    Rookies (old_team=None) get a +2 % rookie penalty on imputed times.
    """
    ALPHA  = 0.08   # sensitivity to team-strength delta
    ROOKIE = 1.02   # +2 % penalty for no historical data

    factors = {}
    for drv, team_2026 in DRIVER_TEAM_2026.items():
        if drv in TEAM_CHANGES_2026:
            old_team, new_team = TEAM_CHANGES_2026[drv]
            if old_team is None:
                factors[drv] = ROOKIE            # rookie
            else:
                old_s = TEAM_PERFORMANCE_SCORE.get(old_team, 0.0)
                new_s = TEAM_PERFORMANCE_SCORE.get(new_team, 0.0)
                factors[drv] = 1.0 + ALPHA * (old_s - new_s)
        else:
            factors[drv] = 1.0                   # stayed at same team

    merged = merged.copy()
    merged["TeamChangeFactor"] = merged["Driver"].map(factors)

    time_cols = ["AvgLapTime", "Sector1", "Sector2", "Sector3", "TotalSectorTime"]
    for col in time_cols:
        merged[col] = merged[col] * merged["TeamChangeFactor"]

    # Build team-adjusted pace column (key model feature)
    merged["TeamAdjustedPace"] = merged["TotalSectorTime"]

    print("✅ Team-change adjustments applied.")
    return merged


def _add_pit_and_tyre_features(merged, circuit_key="Australia"):
    """Add pit-strategy and tyre-degradation features."""
    char = CIRCUIT_CHARACTERISTICS.get(circuit_key, {})
    expected_stops = char.get("expected_stops", 2)
    pit_loss       = char.get("pit_loss_s", 23.0)
    tyre_deg       = char.get("tyre_deg", 0.55)

    merged = merged.copy()
    # Total time lost to pit stops (pit entry/exit + stationary)
    merged["PitTimeLoss"] = merged["Team"].map(TEAM_PIT_SPEED).fillna(2.8)
    merged["PitTimeLoss"] = (merged["PitTimeLoss"] + pit_loss) * expected_stops

    # Tyre degradation factor — how much the circuit punishes tyre wear
    # Teams with better constructors tend to manage tyres better
    merged["TyreDegFactor"] = tyre_deg * (2.0 - merged["TeamPerformanceScore"])

    # Experience factor (log-scaled)
    merged["ExperienceFactor"] = merged["Driver"].map(DRIVER_EXPERIENCE)
    merged["ExperienceFactor"] = np.log1p(merged["ExperienceFactor"].fillna(0))

    print(f"✅ Pit/tyre/experience features added (circuit: {circuit_key}, "
          f"{expected_stops} stops, tyre deg={tyre_deg:.2f}).")
    return merged


def _add_current_season_form(merged, current_round=1):
    """Incorporate results from earlier 2026 races (if any).

    Reads 'season_results_2026.json' and computes a weighted-average
    finishing position for each driver across completed rounds.
    At round 1 this feature is zero for everyone (no data yet).
    """
    merged = merged.copy()
    form = {}

    if os.path.exists(SEASON_RESULTS_FILE) and current_round > 1:
        with open(SEASON_RESULTS_FILE) as f:
            season = json.load(f)

        for drv in DRIVER_TEAM_2026:
            positions = []
            weights   = []
            for rnd_str, rnd_data in season.items():
                rnd = int(rnd_str)
                if rnd < current_round and drv in rnd_data:
                    positions.append(rnd_data[drv])
                    # More recent races get higher weight
                    weights.append(rnd)
            if positions:
                form[drv] = np.average(positions, weights=weights)
            else:
                form[drv] = 11.0   # neutral default (mid-grid)
    else:
        for drv in DRIVER_TEAM_2026:
            form[drv] = 11.0       # no data for round 1

    merged["CurrentForm"] = merged["Driver"].map(form)
    completed = current_round - 1
    print(f"✅ Current season form added ({completed} race(s) completed).")
    return merged


def build_training_dataset(grid, driver_stats, circuit_key="Australia",
                           current_round=1):
    """Merge grid + historical stats + all engineered features.

    v2 improvements:
      - team-change adjustment
      - pit / tyre / experience features
      - current-season form
    """
    merged = grid.merge(driver_stats, on="Driver", how="left")

    # Impute missing historical data (rookies / new drivers)
    hist_cols = ["AvgLapTime", "Sector1", "Sector2", "Sector3",
                 "TotalSectorTime", "LapCount"]
    imputer = SimpleImputer(strategy="median")
    merged[hist_cols] = imputer.fit_transform(merged[hist_cols])

    # Team-change adjustment (modifies time columns)
    merged = _apply_team_change_adjustment(merged)

    # Pit / tyre / experience
    merged = _add_pit_and_tyre_features(merged, circuit_key=circuit_key)

    # Current season form
    merged = _add_current_season_form(merged, current_round=current_round)

    print(f"✅ Training dataset built — {len(merged)} drivers.")
    return merged


# ==========================================================================
# 5. QUALIFYING DATA — AUTOMATIC INGESTION (with date guard + timeout)
# ==========================================================================

def fetch_qualifying_data(year, grand_prix):
    """Try to fetch qualifying data from FastF1 (with date guard + timeout)."""
    from datetime import date as _date
    for info in CALENDAR_2026.values():
        if grand_prix.lower() in info["name"].lower() or \
           grand_prix.lower() == info.get("gp_key", "").lower():
            if _date.today() < _date.fromisoformat(info["date"]):
                print(f"📅 Race date ({info['date']}) is in the future — "
                      "skipping qualifying fetch.")
                return None
            break

    try:
        print(f"🔍 Attempting to fetch {year} {grand_prix} qualifying …")
        import concurrent.futures
        def _load():
            s = fastf1.get_session(year, grand_prix, "Q")
            s.load(laps=True, telemetry=False, weather=False, messages=False)
            return s
        with concurrent.futures.ThreadPoolExecutor(1) as ex:
            session = ex.submit(_load).result(timeout=15)
        laps = session.laps.copy()
        laps["Q (s)"] = laps["LapTime"].dt.total_seconds()
        best = laps.groupby("Driver")["Q (s)"].min().to_dict()
        if best:
            print(f"✅ Qualifying data fetched — {len(best)} drivers.")
            return best
        return None
    except Exception as exc:
        print(f"⚠️  Qualifying unavailable: {type(exc).__name__}")
        return None


def apply_qualifying_data(merged, qualifying_times,
                          rain_probability=0.0, temperature_c=25.0):
    """Add qualifying + weather columns to the dataset."""
    merged = merged.copy()
    merged["QualifyingTime"] = merged["Driver"].map(qualifying_times)
    if rain_probability >= 0.75:
        merged["AdjustedQualiTime"] = (
            merged["QualifyingTime"] * merged["WetPerformance"]
        )
        print("🌧️  Wet qualifying adjustment applied.")
    else:
        merged["AdjustedQualiTime"] = merged["QualifyingTime"]
        print("☀️  Dry conditions — raw qualifying times used.")
    merged["RainProbability"] = rain_probability
    merged["Temperature"]     = temperature_c
    print(f"✅ Qualifying data added for "
          f"{merged['QualifyingTime'].notna().sum()}/{len(merged)} drivers.")
    return merged


def get_qualifying_or_estimates(year, grand_prix, estimates):
    """Auto-fetch qualifying or fall back to estimates."""
    actual = fetch_qualifying_data(year, grand_prix)
    if actual is not None:
        print("🏁 Using ACTUAL qualifying data.")
        return actual
    print("📝 Using ESTIMATED qualifying times.")
    return estimates


def generate_qualifying_estimates(circuit_key):
    """Auto-generate reasonable qualifying estimates for any circuit.

    Uses base_quali_s × (1 + DRIVER_QUALI_OFFSET[driver]).
    """
    char = CIRCUIT_CHARACTERISTICS.get(circuit_key, {})
    base = char.get("base_quali_s", 80.0)
    return {drv: round(base * (1 + off), 2)
            for drv, off in DRIVER_QUALI_OFFSET.items()}


# ==========================================================================
# 6. MODEL TRAINING  (v2 — StandardScaler + calibration)
# ==========================================================================

def train_ensemble(merged, feature_cols=None, target_col="AdjustedQualiTime",
                   test_size=0.2, random_state=42, calibrate=True,
                   max_spread_s=3.5, gb_params=None, xgb_params=None):
    """Train Gradient Boosting + XGBoost ensemble.

    v2 improvements:
      - **StandardScaler** on features → no single feature dominates
      - **Prediction calibration** → compress spread to realistic F1 gaps
    """
    if feature_cols is None:
        feature_cols = DEFAULT_FEATURE_COLS

    # Use only columns that actually exist in merged
    available = [c for c in feature_cols if c in merged.columns]
    if len(available) < len(feature_cols):
        missing = set(feature_cols) - set(available)
        print(f"⚠️  Features not found, skipping: {missing}")
        feature_cols = available

    X = merged[feature_cols].copy()
    y = merged[target_col].copy()

    # Impute
    imp_X = SimpleImputer(strategy="median")
    X_imp = pd.DataFrame(imp_X.fit_transform(X), columns=feature_cols)
    imp_y = SimpleImputer(strategy="median")
    y_imp = imp_y.fit_transform(y.values.reshape(-1, 1)).ravel()

    # **Scale features** (v2 key fix)
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X_imp), columns=feature_cols)

    print(f"Feature matrix : {X_scaled.shape}")
    print(f"Target vector  : {y_imp.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_imp, test_size=test_size, random_state=random_state,
    )

    pbar = tqdm(total=3, desc="Training models", unit="step")

    # Gradient Boosting
    pbar.set_postfix(model="Gradient Boosting")
    _gb = gb_params or dict(n_estimators=200, learning_rate=0.05,
                            max_depth=3, random_state=random_state)
    gb_model = GradientBoostingRegressor(**_gb)
    gb_model.fit(X_train, y_train)
    pbar.update(1)

    # XGBoost
    pbar.set_postfix(model="XGBoost")
    _xgb = xgb_params or dict(n_estimators=250, learning_rate=0.05,
                               max_depth=3, random_state=random_state,
                               verbosity=0)
    xgb_model = XGBRegressor(**_xgb)
    xgb_model.fit(X_train, y_train)
    pbar.update(1)

    # Ensemble predictions
    pbar.set_postfix(model="Ensemble")
    gb_all  = gb_model.predict(X_scaled)
    xgb_all = xgb_model.predict(X_scaled)
    ensemble = (gb_all + xgb_all) / 2

    # **Calibrate** — compress spread to realistic F1 range
    if calibrate:
        raw_spread = ensemble.max() - ensemble.min()
        if raw_spread > max_spread_s and raw_spread > 0:
            min_pred = ensemble.min()
            scale = max_spread_s / raw_spread
            gb_all   = min_pred + (gb_all - min_pred) * scale
            xgb_all  = min_pred + (xgb_all - min_pred) * scale
            ensemble = min_pred + (ensemble - min_pred) * scale
            print(f"📏 Calibrated: {raw_spread:.1f}s → {max_spread_s}s spread.")

    merged = merged.copy()
    merged["PredictedLapTime_GB"]  = gb_all
    merged["PredictedLapTime_XGB"] = xgb_all
    merged["PredictedLapTime"]     = ensemble
    pbar.update(1)
    pbar.close()

    print("✅ Ensemble model trained successfully.")
    return {
        "gb_model": gb_model, "xgb_model": xgb_model,
        "X_imputed": X_imp, "X_scaled": X_scaled,
        "y_imputed": y_imp, "scaler": scaler,
        "X_test": X_test, "y_test": y_test,
        "merged": merged, "feature_cols": feature_cols,
    }


def evaluate_models(results):
    """Evaluate GB, XGB, and ensemble on the held-out test set."""
    X_test, y_test = results["X_test"], results["y_test"]
    rows = []
    for name, model in [("Gradient Boosting", results["gb_model"]),
                         ("XGBoost", results["xgb_model"])]:
        yp  = model.predict(X_test)
        rows.append({"Model": name,
                      "MAE (s)": mean_absolute_error(y_test, yp),
                      "RMSE (s)": np.sqrt(mean_squared_error(y_test, yp)),
                      "R²": r2_score(y_test, yp)})
    ens = (results["gb_model"].predict(X_test) +
           results["xgb_model"].predict(X_test)) / 2
    rows.append({"Model": "Ensemble (GB + XGB)",
                  "MAE (s)": mean_absolute_error(y_test, ens),
                  "RMSE (s)": np.sqrt(mean_squared_error(y_test, ens)),
                  "R²": r2_score(y_test, ens)})
    metrics = pd.DataFrame(rows)
    print("📊 Model Evaluation (Test Set)")
    print("=" * 65)
    for _, r in metrics.iterrows():
        print(f"  {r['Model']:30s}  MAE: {r['MAE (s)']:.3f}s | "
              f"RMSE: {r['RMSE (s)']:.3f}s | R²: {r['R²']:.3f}")
    print("=" * 65)
    return metrics


# ==========================================================================
# 7. RESULTS & DISPLAY
# ==========================================================================

def predicted_classification(merged, gp_name="Grand Prix"):
    """Sort by predicted lap time → finishing order with points."""
    results = (
        merged[["Driver", "DriverName", "Team", "QualifyingTime",
                "PredictedLapTime_GB", "PredictedLapTime_XGB",
                "PredictedLapTime"]]
        .sort_values("PredictedLapTime")
        .reset_index(drop=True)
    )
    results.index += 1
    results.index.name = "Pos"
    results["Points"] = results.index.map(lambda p: F1_POINTS.get(p, 0))
    results["Gap"]    = (results["PredictedLapTime"] -
                         results["PredictedLapTime"].iloc[0]).round(3)

    print("\n" + "=" * 80)
    print(f"  🏁  PREDICTED {gp_name.upper()} FINISHING ORDER  🏁")
    print("=" * 80)
    for pos, row in results.iterrows():
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(pos, "  ")
        gap   = "LEADER" if pos == 1 else f"+{row['Gap']:.3f}s"
        print(f"  {medal}{pos:>2}  {row['Driver']:<5} {row['DriverName']:<22} "
              f"{row['Team']:<18} {row['PredictedLapTime']:.3f}s  "
              f"{gap:>10}  {row['Points']:>2} pts")
    print("=" * 80)
    return results


# ==========================================================================
# 8. SEASON TRACKING
# ==========================================================================

def save_race_result(round_num, classification):
    """Persist actual race results so later rounds can use them as features.

    Call this AFTER a race with the actual finishing order.
    """
    data = {}
    if os.path.exists(SEASON_RESULTS_FILE):
        with open(SEASON_RESULTS_FILE) as f:
            data = json.load(f)

    rnd = {row["Driver"]: int(pos) for pos, row in classification.iterrows()}
    data[str(round_num)] = rnd

    with open(SEASON_RESULTS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"💾 Round {round_num} results saved to {SEASON_RESULTS_FILE}.")


# ==========================================================================
# 9. VISUALISATIONS
# ==========================================================================

def _safe_name(name):
    return name.replace(" ", "_").replace("—", "-").replace("/", "-")

def _viz_dir(gp_name, team=None):
    base = os.path.join("visualizations", _safe_name(gp_name))
    return os.path.join(base, _safe_name(team)) if team else base

def _save(fig, path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    fig.savefig(path, bbox_inches="tight")
    print(f"  💾 {path}")


def plot_feature_importance(results, gp_name="Grand Prix", save=True):
    feature_cols = results["feature_cols"]
    fig, axes = plt.subplots(1, 2, figsize=(16, 5))
    for ax, model, title in zip(
        axes, [results["gb_model"], results["xgb_model"]],
        ["Gradient Boosting", "XGBoost"],
    ):
        imp = model.feature_importances_
        idx = np.argsort(imp)
        ax.barh(np.array(feature_cols)[idx], imp[idx], color="steelblue")
        ax.set_xlabel("Feature Importance")
        ax.set_title(f"{title} — Feature Importance")
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name), "feature_importance.png"))
    plt.close(fig)


def plot_predicted_laptimes(merged, gp_name="Grand Prix", save=True):
    fig, ax = plt.subplots(figsize=(12, 9))
    data = merged.sort_values("PredictedLapTime", ascending=True).copy()
    colours = data["Team"].map(TEAM_COLOURS).fillna("#888888")
    bars = ax.barh(data["Driver"], data["PredictedLapTime"],
                   color=colours, edgecolor="white")
    ax.set_xlabel("Predicted Avg Lap Time (s)")
    ax.set_title(f"🏁 2026 {gp_name} — Predicted Race Performance")
    ax.invert_yaxis()
    for bar, val in zip(bars, data["PredictedLapTime"]):
        ax.text(bar.get_width() + 0.02, bar.get_y() + bar.get_height()/2,
                f"{val:.2f}s", va="center", fontsize=8)
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name), "predicted_laptimes.png"))
    plt.close(fig)


def plot_team_vs_pace(merged, gp_name="Grand Prix", save=True):
    fig, ax = plt.subplots(figsize=(12, 7))
    sc = ax.scatter(merged["TeamPerformanceScore"], merged["PredictedLapTime"],
                    c=merged["QualifyingTime"], cmap="RdYlGn_r",
                    s=120, edgecolors="black", linewidths=0.5)
    for _, r in merged.iterrows():
        ax.annotate(r["Driver"],
                    (r["TeamPerformanceScore"], r["PredictedLapTime"]),
                    xytext=(6, 4), textcoords="offset points", fontsize=8)
    plt.colorbar(sc, ax=ax, label="Qualifying Time (s)")
    ax.set_xlabel("Team Performance Score")
    ax.set_ylabel("Predicted Avg Lap Time (s)")
    ax.set_title(f"Team Strength vs. Pace — 2026 {gp_name}")
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name), "team_vs_pace.png"))
    plt.close(fig)


def plot_pace_vs_predicted(merged, gp_name="Grand Prix", save=True):
    fig, ax = plt.subplots(figsize=(12, 7))
    sc = ax.scatter(merged["CleanAirPace"], merged["PredictedLapTime"],
                    c=merged["TeamPerformanceScore"], cmap="coolwarm",
                    s=120, edgecolors="black", linewidths=0.5)
    for _, r in merged.iterrows():
        ax.annotate(r["Driver"],
                    (r["CleanAirPace"], r["PredictedLapTime"]),
                    xytext=(6, 4), textcoords="offset points", fontsize=8)
    plt.colorbar(sc, ax=ax, label="Team Perf. Score")
    ax.set_xlabel("Clean Air Race Pace (s)")
    ax.set_ylabel("Predicted Avg Lap Time (s)")
    ax.set_title(f"Clean Air Pace vs. Predicted — 2026 {gp_name}")
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name), "pace_vs_predicted.png"))
    plt.close(fig)


def _plot_team_driver_comparison(team_data, team, gp_name, save=True):
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    colour = TEAM_COLOURS.get(team, "#888888")
    axes[0].bar(team_data["Driver"], team_data["PredictedLapTime"],
                color=colour, edgecolor="white")
    axes[0].set_ylabel("Predicted Avg Lap Time (s)"); axes[0].set_title("Predicted")
    for i, (_, r) in enumerate(team_data.iterrows()):
        axes[0].text(i, r["PredictedLapTime"]+0.01, f"{r['PredictedLapTime']:.2f}s",
                     ha="center", fontsize=9)
    axes[1].bar(team_data["Driver"], team_data["QualifyingTime"],
                color=colour, edgecolor="white")
    axes[1].set_ylabel("Qualifying Time (s)"); axes[1].set_title("Qualifying")
    for i, (_, r) in enumerate(team_data.iterrows()):
        axes[1].text(i, r["QualifyingTime"]+0.01, f"{r['QualifyingTime']:.2f}s",
                     ha="center", fontsize=9)
    x = np.arange(len(team_data)); w = 0.35
    axes[2].bar(x-w/2, team_data["PredictedLapTime_GB"], w, label="GB", color="#3671C6")
    axes[2].bar(x+w/2, team_data["PredictedLapTime_XGB"], w, label="XGB", color="#E8002D")
    axes[2].set_xticks(x); axes[2].set_xticklabels(team_data["Driver"])
    axes[2].set_ylabel("Pred. Time (s)"); axes[2].set_title("GB vs XGB"); axes[2].legend()
    fig.suptitle(f"{team} — 2026 {gp_name}", fontsize=14, fontweight="bold")
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name, team), "driver_comparison.png"))
    plt.close(fig)


def _plot_team_summary_card(team_data, team, gp_name, all_merged, save=True):
    fig, ax = plt.subplots(figsize=(10, 6))
    colour = TEAM_COLOURS.get(team, "#888888")
    all_s = all_merged.sort_values("PredictedLapTime")
    bars = ax.barh(all_s["Driver"], all_s["PredictedLapTime"],
                   color="#DDDDDD", edgecolor="white")
    ax.invert_yaxis()
    team_drivers = set(team_data["Driver"])
    for bar, drv in zip(bars, all_s["Driver"]):
        if drv in team_drivers:
            bar.set_color(colour); bar.set_edgecolor("black"); bar.set_linewidth(1.5)
    ax.set_xlabel("Predicted Avg Lap Time (s)")
    ax.set_title(f"{team} highlighted — 2026 {gp_name}")
    plt.tight_layout()
    if save: _save(fig, os.path.join(_viz_dir(gp_name, team), "grid_position.png"))
    plt.close(fig)


def generate_all_visualisations(results, merged, gp_name="Grand Prix", save=True):
    """Master function: generate all hierarchical visualisations."""
    root = _viz_dir(gp_name)
    teams = sorted(merged["Team"].unique())
    total = 4 + 2 * len(teams)
    pbar = tqdm(total=total, desc=f"Generating {gp_name} plots", unit="plot")

    plot_feature_importance(results, gp_name, save); pbar.update(1)
    plot_predicted_laptimes(merged, gp_name, save);  pbar.update(1)
    plot_team_vs_pace(merged, gp_name, save);        pbar.update(1)
    plot_pace_vs_predicted(merged, gp_name, save);   pbar.update(1)

    for team in teams:
        td = merged[merged["Team"] == team].copy()
        _plot_team_driver_comparison(td, team, gp_name, save); pbar.update(1)
        _plot_team_summary_card(td, team, gp_name, merged, save); pbar.update(1)

    pbar.close()
    print(f"\n✅ All visualisations saved under ./{root}/")
    return root


# ==========================================================================
# 10. HTML REPORT GENERATION
# ==========================================================================

def generate_html_report(classification, metrics, results, merged,
                         gp_name="Grand Prix", circuit_key="Australia",
                         gp_round=1, save=True):
    """Generate a self-contained HTML race report.

    Saved to  reports/<GP>/race_report.html
    """
    char = CIRCUIT_CHARACTERISTICS.get(circuit_key, {})
    cal  = CALENDAR_2026.get(gp_round, {})
    viz  = _viz_dir(gp_name)

    # Build table rows
    rows_html = ""
    for pos, row in classification.iterrows():
        medal = {1:"🥇", 2:"🥈", 3:"🥉"}.get(pos, "")
        gap   = "—" if pos == 1 else f"+{row['Gap']:.3f}s"
        bg    = TEAM_COLOURS.get(row["Team"], "#888") + "20"
        rows_html += (
            f"<tr style='background:{bg}'>"
            f"<td>{medal} {pos}</td>"
            f"<td><b>{row['Driver']}</b></td>"
            f"<td>{row['DriverName']}</td>"
            f"<td>{row['Team']}</td>"
            f"<td>{row['PredictedLapTime']:.3f}s</td>"
            f"<td>{gap}</td>"
            f"<td><b>{row['Points']}</b></td></tr>\n"
        )

    # Metrics rows
    met_html = ""
    for _, r in metrics.iterrows():
        met_html += (f"<tr><td>{r['Model']}</td><td>{r['MAE (s)']:.4f}</td>"
                     f"<td>{r['RMSE (s)']:.4f}</td><td>{r['R²']:.4f}</td></tr>\n")

    # Constructor points
    cons = (classification.groupby("Team")["Points"].sum()
            .sort_values(ascending=False).reset_index())
    cons_html = ""
    for i, (_, r) in enumerate(cons.iterrows(), 1):
        cons_html += f"<tr><td>{i}</td><td>{r['Team']}</td><td>{r['Points']}</td></tr>\n"

    # Feature importance
    feat_cols = results["feature_cols"]
    gb_imp  = results["gb_model"].feature_importances_
    xgb_imp = results["xgb_model"].feature_importances_
    avg_imp = (gb_imp + xgb_imp) / 2
    fi_html = ""
    for idx in np.argsort(avg_imp)[::-1]:
        bar_w = int(avg_imp[idx] * 300)
        fi_html += (f"<tr><td>{feat_cols[idx]}</td>"
                    f"<td>{avg_imp[idx]:.4f}</td>"
                    f"<td><div style='background:#3671C6;width:{bar_w}px;"
                    f"height:16px;border-radius:3px'></div></td></tr>\n")

    # Spread stats
    pred = merged["PredictedLapTime"]
    spread = pred.max() - pred.min()

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>{gp_name} — 2026 Prediction Report</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         max-width: 1100px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }}
  h1 {{ color: #E8002D; border-bottom: 3px solid #E8002D; padding-bottom: 10px; }}
  h2 {{ color: #16213e; margin-top: 40px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }}
  th {{ background: #16213e; color: white; }}
  tr:hover {{ background: #f5f5f5; }}
  .podium {{ display: flex; gap: 20px; margin: 20px 0; }}
  .podium-card {{ flex: 1; padding: 20px; border-radius: 12px; text-align: center;
                  color: white; font-size: 1.1em; }}
  .p1 {{ background: linear-gradient(135deg, #FFD700, #FFA500); }}
  .p2 {{ background: linear-gradient(135deg, #C0C0C0, #A0A0A0); }}
  .p3 {{ background: linear-gradient(135deg, #CD7F32, #A0522D); }}
  .stat-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }}
  .stat-card {{ background: #f0f4f8; padding: 15px; border-radius: 8px; text-align: center; }}
  .stat-card .value {{ font-size: 1.8em; font-weight: bold; color: #E8002D; }}
  .stat-card .label {{ color: #666; font-size: 0.9em; }}
  .meta {{ color: #666; font-size: 0.95em; }}
  .img-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }}
  .img-grid img {{ width: 100%; border-radius: 8px; border: 1px solid #ddd; }}
</style></head><body>
<h1>🏁 {gp_name} — 2026 Prediction Report</h1>
<p class="meta">Circuit: {cal.get('circuit', char.get('type',''))} |
   Laps: {cal.get('laps', '—')} | Date: {cal.get('date', '—')} |
   Expected pit stops: {char.get('expected_stops','—')} |
   Tyre degradation: {char.get('tyre_deg','—')}</p>

<h2>🏆 Podium</h2>
<div class="podium">
  <div class="podium-card p1">🥇 WINNER<br><b>{classification.iloc[0]['DriverName']}</b><br>{classification.iloc[0]['Team']}<br>{classification.iloc[0]['Points']} pts</div>
  <div class="podium-card p2">🥈 2nd<br><b>{classification.iloc[1]['DriverName']}</b><br>{classification.iloc[1]['Team']}<br>{classification.iloc[1]['Points']} pts</div>
  <div class="podium-card p3">🥉 3rd<br><b>{classification.iloc[2]['DriverName']}</b><br>{classification.iloc[2]['Team']}<br>{classification.iloc[2]['Points']} pts</div>
</div>

<h2>📊 Full Classification</h2>
<table><tr><th>Pos</th><th>Code</th><th>Driver</th><th>Team</th><th>Pred. Time</th><th>Gap</th><th>Pts</th></tr>
{rows_html}</table>

<h2>🏗️ Constructor Points</h2>
<table><tr><th>Pos</th><th>Team</th><th>Points</th></tr>
{cons_html}</table>

<h2>🤖 Model Evaluation</h2>
<table><tr><th>Model</th><th>MAE (s)</th><th>RMSE (s)</th><th>R²</th></tr>
{met_html}</table>

<div class="stat-grid">
  <div class="stat-card"><div class="value">{len(results['X_imputed'])}</div><div class="label">Training Samples</div></div>
  <div class="stat-card"><div class="value">{len(results['feature_cols'])}</div><div class="label">Features</div></div>
  <div class="stat-card"><div class="value">{spread:.2f}s</div><div class="label">Pred. Spread</div></div>
</div>

<h2>📈 Feature Importance (Ensemble Avg)</h2>
<table><tr><th>Feature</th><th>Importance</th><th>Bar</th></tr>
{fi_html}</table>

<h2>📷 Visualisations</h2>
<div class="img-grid">
  <img src="../../{viz}/predicted_laptimes.png" alt="Lap Times">
  <img src="../../{viz}/feature_importance.png" alt="Feature Importance">
  <img src="../../{viz}/team_vs_pace.png" alt="Team vs Pace">
  <img src="../../{viz}/pace_vs_predicted.png" alt="Pace vs Predicted">
</div>

<p class="meta" style="margin-top:40px;text-align:center">
  Generated by F1 Prediction Framework v2.0 — {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}</p>
</body></html>"""

    if save:
        report_dir = os.path.join("reports", _safe_name(gp_name))
        os.makedirs(report_dir, exist_ok=True)
        path = os.path.join(report_dir, "race_report.html")
        with open(path, "w") as f:
            f.write(html)
        print(f"📄 Report saved to {path}")
        return path
    return html
