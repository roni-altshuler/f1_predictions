#!/usr/bin/env python3
"""
telemetry_features.py
=====================
Extract telemetry-based features from FastF1:
  - Speed trap data (max speeds per sector per driver)
  - Sector times (best S1/S2/S3 and ideal lap times)

These are exported as JSON fields inside each round file
for the website to display.

Usage:
    python telemetry_features.py --round 1 --year 2025
    python telemetry_features.py --all --year 2025
"""

import argparse
import json
import os
import sys
import warnings

import numpy as np

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(__file__))
from f1_prediction_utils import (
    CALENDAR_2026,
    TEAM_COLOURS,
    DRIVER_TEAM_2026,
    DRIVER_FULL_NAMES,
)

try:
    import fastf1
except ImportError:
    print("⚠️  FastF1 not installed. Install with: pip install fastf1")
    sys.exit(1)


def enable_cache():
    os.makedirs("f1_cache", exist_ok=True)
    fastf1.Cache.enable_cache("f1_cache")


# ═══════════════════════════════════════════════════════════════════════════
# Speed Trap Extraction
# ═══════════════════════════════════════════════════════════════════════════

def extract_speed_traps(year: int, gp_key: str, session_type: str = "Q") -> list[dict]:
    """
    Extract max speed per driver per sector from telemetry data.

    Returns list of SpeedTrapEntry dicts sorted by speed descending:
      { driver, team, teamColor, speedKmh, sector }
    """
    print(f"  ⚡ Speed traps: {year} {gp_key} ({session_type})")
    try:
        session = fastf1.get_session(year, gp_key, session_type)
        session.load(laps=True, telemetry=True, weather=False, messages=False)
    except Exception as e:
        print(f"    ⚠️  Could not load session: {e}")
        return []

    speed_traps = []
    drivers = session.laps["Driver"].unique()

    for driver in drivers:
        driver_laps = session.laps.pick_drivers(driver)
        fastest = driver_laps.pick_fastest()
        if fastest is None or fastest.empty if hasattr(fastest, 'empty') else fastest is None:
            continue

        try:
            tel = fastest.get_telemetry()
            if tel is None or tel.empty:
                continue
        except Exception:
            continue

        team = DRIVER_TEAM_2026.get(driver, "Unknown")
        team_color = TEAM_COLOURS.get(team, "#888888")

        # Divide telemetry into approximate thirds for sectors
        n = len(tel)
        sector_boundaries = [0, n // 3, 2 * n // 3, n]

        for s_idx in range(3):
            start = sector_boundaries[s_idx]
            end = sector_boundaries[s_idx + 1]
            sector_tel = tel.iloc[start:end]

            if len(sector_tel) > 0:
                max_speed = float(sector_tel["Speed"].max())
                speed_traps.append({
                    "driver": driver,
                    "team": team,
                    "teamColor": team_color,
                    "speedKmh": round(max_speed, 1),
                    "sector": s_idx + 1,
                })

    # Sort by speed descending
    speed_traps.sort(key=lambda x: x["speedKmh"], reverse=True)
    return speed_traps


# ═══════════════════════════════════════════════════════════════════════════
# Sector Times Extraction
# ═══════════════════════════════════════════════════════════════════════════

def extract_sector_times(year: int, gp_key: str, session_type: str = "Q") -> list[dict]:
    """
    Extract best sector times for each driver and compute ideal lap.

    Returns list of SectorTimeEntry dicts sorted by ideal lap ascending:
      { driver, team, teamColor, sector1, sector2, sector3, idealLap }
    """
    print(f"  ⏱️  Sector times: {year} {gp_key} ({session_type})")
    try:
        session = fastf1.get_session(year, gp_key, session_type)
        session.load(laps=True, telemetry=False, weather=False, messages=False)
    except Exception as e:
        print(f"    ⚠️  Could not load session: {e}")
        return []

    sector_times = []
    drivers = session.laps["Driver"].unique()

    for driver in drivers:
        driver_laps = session.laps.pick_drivers(driver)

        # Get best sector times across all laps
        s1_times = driver_laps["Sector1Time"].dropna()
        s2_times = driver_laps["Sector2Time"].dropna()
        s3_times = driver_laps["Sector3Time"].dropna()

        if s1_times.empty or s2_times.empty or s3_times.empty:
            continue

        # Convert timedelta to seconds
        best_s1 = s1_times.min().total_seconds()
        best_s2 = s2_times.min().total_seconds()
        best_s3 = s3_times.min().total_seconds()
        ideal_lap = best_s1 + best_s2 + best_s3

        team = DRIVER_TEAM_2026.get(driver, "Unknown")
        team_color = TEAM_COLOURS.get(team, "#888888")

        sector_times.append({
            "driver": driver,
            "team": team,
            "teamColor": team_color,
            "sector1": round(best_s1, 3),
            "sector2": round(best_s2, 3),
            "sector3": round(best_s3, 3),
            "idealLap": round(ideal_lap, 3),
        })

    # Sort by ideal lap ascending
    sector_times.sort(key=lambda x: x["idealLap"])
    return sector_times


# ═══════════════════════════════════════════════════════════════════════════
# Combined Telemetry Export
# ═══════════════════════════════════════════════════════════════════════════

def extract_telemetry_for_round(
    round_num: int,
    year: int = 2025,
    session_type: str = "Q",
) -> dict | None:
    """
    Extract all telemetry features for a given round.

    Returns dict ready for inclusion in round JSON:
      { speedTraps: [...], sectorTimes: [...] }
    """
    if round_num not in CALENDAR_2026:
        print(f"  ⚠️  Round {round_num} not in calendar")
        return None

    gp_key = CALENDAR_2026[round_num]["gp_key"]
    print(f"\n📡 Extracting telemetry for Round {round_num}: {CALENDAR_2026[round_num]['name']}")

    speed_traps = extract_speed_traps(year, gp_key, session_type)
    sector_times = extract_sector_times(year, gp_key, session_type)

    if not speed_traps and not sector_times:
        print(f"  ⚠️  No telemetry data available")
        return None

    telemetry = {
        "speedTraps": speed_traps,
        "sectorTimes": sector_times,
    }

    print(f"  ✅ {len(speed_traps)} speed trap entries, {len(sector_times)} sector time entries")
    return telemetry


def inject_telemetry_into_round_json(round_num: int, telemetry: dict) -> bool:
    """
    Inject telemetry data into an existing round JSON file.
    """
    round_path = os.path.join("website", "public", "data", "rounds", f"round_{round_num:02d}.json")
    if not os.path.exists(round_path):
        print(f"  ⚠️  {round_path} doesn't exist — run export_website_data.py first")
        return False

    with open(round_path, "r") as f:
        data = json.load(f)

    data["telemetryData"] = telemetry

    with open(round_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"  💾 Telemetry injected → {round_path}")
    return True


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Extract telemetry features from FastF1")
    parser.add_argument("--round", type=int, help="Round number")
    parser.add_argument("--all", action="store_true", help="Process all rounds")
    parser.add_argument("--year", type=int, default=2025, help="Year for historical data (default: 2025)")
    parser.add_argument("--session", default="Q", choices=["Q", "R", "FP1", "FP2", "FP3"],
                        help="Session type (default: Q for qualifying)")
    parser.add_argument("--inject", action="store_true",
                        help="Inject telemetry into existing round JSON files")
    args = parser.parse_args()

    enable_cache()

    rounds = list(CALENDAR_2026.keys()) if args.all else [args.round] if args.round else []

    if not rounds:
        parser.print_help()
        return

    for rnd in rounds:
        telemetry = extract_telemetry_for_round(rnd, args.year, args.session)
        if telemetry and args.inject:
            inject_telemetry_into_round_json(rnd, telemetry)

    print("\n✅ Telemetry extraction complete!")


if __name__ == "__main__":
    main()
