"""
advanced_models.py — v1.0
=========================
Advanced prediction features that extend the base f1_prediction_utils.py:

  1. **Pit Stop Strategy Simulator** — Monte-Carlo simulation of different
     pit strategies (1-stop vs 2-stop vs 3-stop) with compound modelling.
  2. **Tyre Degradation Curves** — Lap-by-lap tyre life model per compound.
  3. **LSTM Lap-Time Predictor** — Sequence model trained on historical
     lap-by-lap data to predict race pace evolution.
  4. **Season Tracker** — Compare predicted vs actual results as the season
     progresses.

These modules produce:
  - Additional JSON data appended to round_XX.json
  - Additional PNG visualisations in the website viz directory

Import:
    >>> from advanced_models import (
    ...     simulate_pit_strategy, plot_pit_strategy_comparison,
    ...     model_tyre_degradation, plot_tyre_degradation_curves,
    ...     train_lstm_model, predict_with_lstm, plot_lstm_predictions,
    ...     SeasonTracker,
    ... )
"""

import os, json, warnings
from datetime import datetime
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

warnings.filterwarnings("ignore")

# Import constants from the base utils
from f1_prediction_utils import (
    TEAM_COLOURS, DRIVER_TEAM, DRIVER_FULL_NAMES,
    CALENDAR, CIRCUIT_CHARACTERISTICS, TEAM_PIT_SPEED,
    F1_POINTS,
    WEBSITE_DATA_DIR, SEASON_YEAR,
)


# ═════════════════════════════════════════════════════════════════════════
# 1. PIT STOP STRATEGY SIMULATOR
# ═════════════════════════════════════════════════════════════════════════

# Tyre compound characteristics (relative to Medium baseline = 1.0)
COMPOUND_PROFILES = {
    "SOFT":         {"pace_offset": -0.4, "deg_rate": 0.045, "cliff_lap": 18},
    "MEDIUM":       {"pace_offset":  0.0, "deg_rate": 0.025, "cliff_lap": 28},
    "HARD":         {"pace_offset":  0.3, "deg_rate": 0.015, "cliff_lap": 40},
    "INTERMEDIATE": {"pace_offset":  2.5, "deg_rate": 0.030, "cliff_lap": 25},
    "WET":          {"pace_offset":  5.0, "deg_rate": 0.020, "cliff_lap": 30},
}


def _simulate_stint(base_lap_time, compound, laps, fuel_effect=0.05):
    """Simulate lap times for a single stint on one compound.

    Parameters
    ----------
    base_lap_time : float – driver's baseline avg lap time (seconds)
    compound : str – tyre compound name
    laps : int – number of laps in this stint
    fuel_effect : float – seconds saved per lap as fuel burns off

    Returns
    -------
    list[float] – lap times for each lap of the stint
    """
    profile = COMPOUND_PROFILES.get(compound, COMPOUND_PROFILES["MEDIUM"])
    pace_offset = profile["pace_offset"]
    deg_rate = profile["deg_rate"]
    cliff_lap = profile["cliff_lap"]

    times = []
    for lap in range(1, laps + 1):
        # Base time + compound offset
        t = base_lap_time + pace_offset
        # Tyre degradation (exponential near cliff)
        if lap <= cliff_lap:
            t += deg_rate * lap
        else:
            t += deg_rate * cliff_lap + (deg_rate * 3) * (lap - cliff_lap)
        # Fuel effect (lighter car = faster)
        t -= fuel_effect * lap / laps
        # Small random variation
        t += np.random.normal(0, 0.08)
        times.append(round(t, 3))
    return times


def simulate_pit_strategy(base_lap_time, total_laps, strategies, pit_loss=22.0,
                          n_simulations=100, fuel_effect=0.05):
    """Monte-Carlo simulation of different pit stop strategies.

    Parameters
    ----------
    base_lap_time : float – driver's average lap time
    total_laps : int – total race laps
    strategies : list[dict] – each strategy is:
        {"name": "1-Stop Soft-Hard", "stints": [("SOFT", 20), ("HARD", 38)]}
    pit_loss : float – time lost per pit stop in seconds
    n_simulations : int – Monte-Carlo iterations per strategy
    fuel_effect : float – fuel burn benefit in seconds

    Returns
    -------
    dict – strategy results with mean times, std, and lap-by-lap data
    """
    results = {}
    for strat in strategies:
        name = strat["name"]
        stints = strat["stints"]
        num_stops = len(stints) - 1
        total_times = []
        all_lap_data = []

        for _ in range(n_simulations):
            race_laps = []
            for compound, stint_laps in stints:
                stint = _simulate_stint(base_lap_time, compound, stint_laps,
                                       fuel_effect)
                race_laps.extend(stint)
            # Add pit stop time losses (in-lap penalty)
            pit_laps = []
            cum = 0
            for i, (_, stint_laps) in enumerate(stints[:-1]):
                cum += stint_laps
                pit_laps.append(cum)
            for pl in pit_laps:
                if pl < len(race_laps):
                    race_laps[pl - 1] += pit_loss

            total = sum(race_laps[:total_laps])
            total_times.append(total)
            all_lap_data.append(race_laps[:total_laps])

        mean_total = np.mean(total_times)
        std_total = np.std(total_times)
        avg_laps = np.mean(all_lap_data, axis=0).tolist()

        results[name] = {
            "mean_total_time": round(mean_total, 2),
            "std_total_time": round(std_total, 2),
            "num_stops": num_stops,
            "stints": stints,
            "avg_lap_times": avg_laps,
            "total_sims": n_simulations,
        }

    return results


def get_default_strategies(total_laps, circuit_key="Australia"):
    """Generate reasonable strategy options for a circuit."""
    char = CIRCUIT_CHARACTERISTICS.get(circuit_key, {})
    expected_stops = char.get("expected_stops", 2)

    # Calculate stint lengths
    if expected_stops == 1:
        s1 = total_laps // 2 + 3
        strategies = [
            {"name": "1-Stop: Soft→Hard",
             "stints": [("SOFT", s1), ("HARD", total_laps - s1)]},
            {"name": "1-Stop: Medium→Hard",
             "stints": [("MEDIUM", s1 + 5), ("HARD", total_laps - s1 - 5)]},
            {"name": "1-Stop: Soft→Medium",
             "stints": [("SOFT", s1 - 5), ("MEDIUM", total_laps - s1 + 5)]},
            {"name": "2-Stop: Soft→Medium→Soft",
             "stints": [("SOFT", total_laps // 3),
                        ("MEDIUM", total_laps // 3),
                        ("SOFT", total_laps - 2 * (total_laps // 3))]},
        ]
    elif expected_stops == 2:
        third = total_laps // 3
        strategies = [
            {"name": "2-Stop: Soft→Medium→Hard",
             "stints": [("SOFT", third - 3), ("MEDIUM", third),
                        ("HARD", total_laps - 2 * third + 3)]},
            {"name": "2-Stop: Medium→Hard→Medium",
             "stints": [("MEDIUM", third + 2), ("HARD", third + 2),
                        ("MEDIUM", total_laps - 2 * third - 4)]},
            {"name": "2-Stop: Soft→Hard→Medium",
             "stints": [("SOFT", third - 5), ("HARD", third + 5),
                        ("MEDIUM", total_laps - 2 * third)]},
            {"name": "1-Stop: Medium→Hard (risky)",
             "stints": [("MEDIUM", total_laps // 2 + 5),
                        ("HARD", total_laps - total_laps // 2 - 5)]},
        ]
    else:  # 3+ stops
        quarter = total_laps // 4
        strategies = [
            {"name": "3-Stop: S→M→M→S",
             "stints": [("SOFT", quarter - 2), ("MEDIUM", quarter),
                        ("MEDIUM", quarter),
                        ("SOFT", total_laps - 3 * quarter + 2)]},
            {"name": "3-Stop: S→H→M→S",
             "stints": [("SOFT", quarter - 3), ("HARD", quarter + 3),
                        ("MEDIUM", quarter),
                        ("SOFT", total_laps - 3 * quarter)]},
            {"name": "2-Stop: M→H→M",
             "stints": [("MEDIUM", total_laps // 3 + 3),
                        ("HARD", total_laps // 3 + 3),
                        ("MEDIUM", total_laps - 2 * (total_laps // 3 + 3))]},
        ]

    return strategies


def plot_pit_strategy_comparison(strategy_results, gp_name, out_dir,
                                  total_laps):
    """Generate a visualization comparing pit strategies."""
    fig, axes = plt.subplots(2, 1, figsize=(16, 12), facecolor="#1a1a2e",
                              gridspec_kw={"height_ratios": [2, 1]})

    # Top: Lap-by-lap times
    ax = axes[0]
    ax.set_facecolor("#1a1a2e")
    colors = ["#FF3333", "#FFC300", "#FFFFFF", "#39B54A", "#0067AD"]
    for i, (name, data) in enumerate(strategy_results.items()):
        color = colors[i % len(colors)]
        laps = list(range(1, len(data["avg_lap_times"]) + 1))
        ax.plot(laps, data["avg_lap_times"], label=name, color=color,
                linewidth=2, alpha=0.9)

    ax.set_xlabel("Lap", fontsize=13, color="white")
    ax.set_ylabel("Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"Pit Strategy Comparison — {SEASON_YEAR} {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.legend(fontsize=10, facecolor="#1a1a2e", edgecolor="white",
              labelcolor="white", loc="upper right")
    ax.tick_params(colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    ax.grid(alpha=0.15, color="white")

    # Bottom: Total time comparison bar chart
    ax2 = axes[1]
    ax2.set_facecolor("#1a1a2e")
    names = list(strategy_results.keys())
    times = [strategy_results[n]["mean_total_time"] for n in names]
    min_time = min(times)
    deltas = [t - min_time for t in times]

    bars = ax2.barh(names, deltas, color=colors[:len(names)], edgecolor="white",
                    linewidth=0.5, height=0.6)
    ax2.set_xlabel("Time Delta from Optimal (s)", fontsize=12, color="white")
    ax2.set_title("Strategy Time Penalty", fontsize=14, fontweight="bold",
                  color="white")
    for bar, delta, total in zip(bars, deltas, times):
        label = f"+{delta:.1f}s" if delta > 0 else "OPTIMAL"
        ax2.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2,
                 label, va="center", fontsize=11, color="white", fontweight="bold")
    ax2.tick_params(colors="white", labelsize=10)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.spines["bottom"].set_color("white")
    ax2.spines["left"].set_color("white")

    plt.tight_layout()
    path = os.path.join(out_dir, "pit_strategy_comparison.png")
    os.makedirs(out_dir, exist_ok=True)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  💾 {path}")
    return "pit_strategy_comparison.png"


# ═════════════════════════════════════════════════════════════════════════
# 2. TYRE DEGRADATION CURVES
# ═════════════════════════════════════════════════════════════════════════

def model_tyre_degradation(circuit_key="Australia", total_laps=58):
    """Model tyre degradation curves for each compound at a given circuit.

    Returns dict of compound -> lap-by-lap delta from fresh-tyre pace.
    """
    char = CIRCUIT_CHARACTERISTICS.get(circuit_key, {})
    tyre_deg_factor = char.get("tyre_deg", 0.5)  # 0-1 scale

    curves = {}
    for compound, profile in COMPOUND_PROFILES.items():
        if compound in ("INTERMEDIATE", "WET"):
            continue  # Skip rain tyres for normal analysis
        deg_rate = profile["deg_rate"] * (0.5 + tyre_deg_factor)  # circuit scaling
        cliff = profile["cliff_lap"]

        deltas = []
        for lap in range(1, total_laps + 1):
            if lap <= cliff:
                delta = deg_rate * lap
            else:
                delta = deg_rate * cliff + (deg_rate * 3.5) * (lap - cliff)
            deltas.append(round(delta, 3))
        curves[compound] = {
            "deltas": deltas,
            "cliff_lap": cliff,
            "deg_rate": round(deg_rate, 4),
            "pace_offset": profile["pace_offset"],
        }
    return curves


def plot_tyre_degradation_curves(curves, gp_name, out_dir, total_laps):
    """Visualize tyre degradation curves for each compound."""
    fig, ax = plt.subplots(figsize=(14, 8), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")

    compound_colors = {
        "SOFT": "#FF3333", "MEDIUM": "#FFC300", "HARD": "#FFFFFF",
    }
    compound_styles = {
        "SOFT": "-", "MEDIUM": "--", "HARD": ":",
    }

    for compound, data in curves.items():
        color = compound_colors.get(compound, "#888")
        style = compound_styles.get(compound, "-")
        laps = list(range(1, len(data["deltas"]) + 1))

        ax.plot(laps, data["deltas"], label=f'{compound} (cliff @ lap {data["cliff_lap"]})',
                color=color, linewidth=2.5, linestyle=style)

        # Mark the cliff point
        cliff = data["cliff_lap"]
        if cliff <= total_laps:
            ax.axvline(x=cliff, color=color, alpha=0.3, linestyle="--", linewidth=1)
            ax.annotate(f"Cliff", xy=(cliff, data["deltas"][cliff - 1]),
                        xytext=(cliff + 2, data["deltas"][cliff - 1] + 0.2),
                        fontsize=9, color=color, fontweight="bold",
                        arrowprops=dict(arrowstyle="->", color=color, lw=1.5))

    ax.set_xlabel("Lap Number", fontsize=13, color="white")
    ax.set_ylabel("Degradation (s slower than fresh tyre)", fontsize=13,
                  color="white")
    ax.set_title(f"Tyre Degradation Model — {SEASON_YEAR} {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.legend(fontsize=11, facecolor="#1a1a2e", edgecolor="white",
              labelcolor="white")
    ax.tick_params(colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    ax.grid(alpha=0.15, color="white")

    plt.tight_layout()
    path = os.path.join(out_dir, "tyre_degradation_curves.png")
    os.makedirs(out_dir, exist_ok=True)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  💾 {path}")
    return "tyre_degradation_curves.png"


# ═════════════════════════════════════════════════════════════════════════
# 3. LSTM LAP-TIME PREDICTOR
# ═════════════════════════════════════════════════════════════════════════

def _try_import_torch():
    """Try to import PyTorch; return (torch, nn, available)."""
    try:
        import torch
        import torch.nn as nn
        return torch, nn, True
    except ImportError:
        return None, None, False


class LSTMLapPredictor:
    """LSTM-based lap time predictor.

    Predicts the next lap time given a sequence of previous lap times
    and features (tyre compound, fuel load, tyre age).

    Falls back gracefully if PyTorch is not installed.
    """

    def __init__(self, input_size=4, hidden_size=64, num_layers=2,
                 seq_length=5):
        self.torch, self.nn, self.available = _try_import_torch()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.seq_length = seq_length
        self.model = None
        self.scaler_x = None
        self.scaler_y = None

        if self.available:
            self._build_model()

    def _build_model(self):
        torch, nn = self.torch, self.nn

        class _LSTM(nn.Module):
            def __init__(self, input_size, hidden_size, num_layers):
                super().__init__()
                self.lstm = nn.LSTM(input_size, hidden_size, num_layers,
                                    batch_first=True, dropout=0.2)
                self.fc = nn.Sequential(
                    nn.Linear(hidden_size, 32),
                    nn.ReLU(),
                    nn.Linear(32, 1),
                )

            def forward(self, x):
                lstm_out, _ = self.lstm(x)
                return self.fc(lstm_out[:, -1, :])

        self.model = _LSTM(self.input_size, self.hidden_size, self.num_layers)

    def prepare_sequences(self, lap_data):
        """Convert lap-by-lap data into LSTM training sequences.

        Parameters
        ----------
        lap_data : pd.DataFrame with columns:
            LapTimeSec, TyreAge, FuelLoad, CompoundIdx
        """
        if not self.available:
            return None, None

        from sklearn.preprocessing import MinMaxScaler
        features = lap_data[["LapTimeSec", "TyreAge", "FuelLoad",
                              "CompoundIdx"]].values

        self.scaler_x = MinMaxScaler()
        self.scaler_y = MinMaxScaler()
        scaled_features = self.scaler_x.fit_transform(features)
        scaled_target = self.scaler_y.fit_transform(
            features[:, 0:1])  # LapTimeSec only

        X, y = [], []
        for i in range(len(scaled_features) - self.seq_length):
            X.append(scaled_features[i:i + self.seq_length])
            y.append(scaled_target[i + self.seq_length])

        X = np.array(X)
        y = np.array(y)
        return X, y

    def train(self, X, y, epochs=50, lr=0.001, batch_size=32):
        """Train the LSTM model."""
        if not self.available or self.model is None:
            print("  ⚠️  PyTorch not available — LSTM training skipped.")
            return {"loss_history": [], "final_loss": None}

        torch = self.torch
        nn = self.nn

        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.FloatTensor(y)
        dataset = torch.utils.data.TensorDataset(X_tensor, y_tensor)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size,
                                              shuffle=True)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        self.model.train()
        loss_history = []
        for epoch in range(epochs):
            epoch_loss = 0.0
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                pred = self.model(batch_X)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            avg_loss = epoch_loss / len(loader)
            loss_history.append(avg_loss)

        print(f"  ✅ LSTM trained — {epochs} epochs, "
              f"final loss: {loss_history[-1]:.6f}")
        return {"loss_history": loss_history, "final_loss": loss_history[-1]}

    def predict_race(self, initial_sequence, total_laps):
        """Predict lap times for an entire race given initial conditions.

        Falls back to a simple analytical model if PyTorch unavailable.
        """
        if not self.available or self.model is None:
            # Analytical fallback
            base = initial_sequence[0][0] if len(initial_sequence) > 0 else 80.0
            preds = []
            for lap in range(total_laps):
                # Simple fuel + tyre model
                fuel_benefit = 0.05 * lap / total_laps
                tyre_deg = 0.02 * lap
                preds.append(round(base - fuel_benefit + tyre_deg, 3))
            return preds

        torch = self.torch
        self.model.eval()

        seq = np.array(initial_sequence[-self.seq_length:]).reshape(
            1, self.seq_length, self.input_size)
        seq_scaled = self.scaler_x.transform(
            seq.reshape(-1, self.input_size)).reshape(
            1, self.seq_length, self.input_size)

        predictions = []
        current = torch.FloatTensor(seq_scaled)

        with torch.no_grad():
            for lap in range(total_laps):
                pred = self.model(current)
                pred_val = self.scaler_y.inverse_transform(
                    pred.numpy())[0, 0]
                predictions.append(round(float(pred_val), 3))

                # Shift sequence
                new_row = current[0, -1, :].clone()
                new_row[0] = pred[0, 0]  # predicted time
                new_seq = torch.cat([current[0, 1:, :],
                                     new_row.unsqueeze(0)], dim=0)
                current = new_seq.unsqueeze(0)

        return predictions


def train_lstm_from_fastf1(gp_key, years=[2023, 2024], cache_dir="f1_cache"):
    """Load historical lap data and train the LSTM model.

    Returns (model, training_info) or (None, None) if data unavailable.
    """
    import fastf1
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    all_laps = []
    for year in years:
        try:
            session = fastf1.get_session(year, gp_key, "R")
            session.load(laps=True, telemetry=False, weather=False,
                         messages=False)
            laps = session.laps.copy()
            laps["LapTimeSec"] = laps["LapTime"].dt.total_seconds()
            laps = laps[laps["LapTimeSec"].notna()].copy()

            # Filter outliers
            q05 = laps["LapTimeSec"].quantile(0.05)
            q95 = laps["LapTimeSec"].quantile(0.95)
            laps = laps[(laps["LapTimeSec"] >= q05) &
                        (laps["LapTimeSec"] <= q95)]

            # Add features
            compound_map = {"SOFT": 0, "MEDIUM": 1, "HARD": 2,
                            "INTERMEDIATE": 3, "WET": 4}
            laps["CompoundIdx"] = laps.get("Compound", pd.Series(
                ["MEDIUM"] * len(laps))).map(compound_map).fillna(1)
            laps["TyreAge"] = laps.get("TyreLife",
                                        laps.groupby("Driver").cumcount() + 1)
            total = laps["LapNumber"].max()
            laps["FuelLoad"] = 1.0 - (laps["LapNumber"] / total)

            all_laps.append(laps[["LapTimeSec", "TyreAge", "FuelLoad",
                                   "CompoundIdx"]])
        except Exception as e:
            print(f"  ⚠️  LSTM data load failed for {year} {gp_key}: {e}")

    if not all_laps:
        print("  ⚠️  No lap data available for LSTM training.")
        return None, None

    combined = pd.concat(all_laps, ignore_index=True)
    print(f"  📊 LSTM training data: {len(combined)} laps")

    model = LSTMLapPredictor(input_size=4, hidden_size=64, num_layers=2)
    X, y = model.prepare_sequences(combined)
    if X is None:
        return None, {"note": "PyTorch not available"}

    info = model.train(X, y, epochs=30)
    return model, info


def plot_lstm_predictions(lstm_predictions, actual_avg, driver_name,
                          gp_name, out_dir, total_laps):
    """Visualize LSTM race pace predictions."""
    fig, ax = plt.subplots(figsize=(14, 7), facecolor="#1a1a2e")
    ax.set_facecolor("#1a1a2e")

    laps = list(range(1, len(lstm_predictions) + 1))
    ax.plot(laps, lstm_predictions, color="#E8002D", linewidth=2,
            label="LSTM Predicted Pace", alpha=0.9)

    # Overlay the ensemble average as horizontal line
    ax.axhline(y=actual_avg, color="#22C55E", linestyle="--", linewidth=2,
               label=f"Ensemble Avg: {actual_avg:.2f}s", alpha=0.8)

    # Rolling average
    window = min(5, len(lstm_predictions) // 3)
    if window > 1:
        rolling = pd.Series(lstm_predictions).rolling(window).mean()
        ax.plot(laps, rolling, color="#FFC300", linewidth=1.5,
                label=f"Rolling Mean ({window}-lap)", alpha=0.7)

    ax.set_xlabel("Lap", fontsize=13, color="white")
    ax.set_ylabel("Predicted Lap Time (s)", fontsize=13, color="white")
    ax.set_title(f"LSTM Race Pace Prediction — {driver_name} — {gp_name}",
                 fontsize=16, fontweight="bold", color="white")
    ax.legend(fontsize=10, facecolor="#1a1a2e", edgecolor="white",
              labelcolor="white")
    ax.tick_params(colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    ax.grid(alpha=0.15, color="white")

    plt.tight_layout()
    path = os.path.join(out_dir, "lstm_pace_prediction.png")
    os.makedirs(out_dir, exist_ok=True)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  💾 {path}")
    return "lstm_pace_prediction.png"


# ═════════════════════════════════════════════════════════════════════════
# 3b. LSTM GRID PREDICTOR — Integrated into ensemble (v3 NEW)
# ═════════════════════════════════════════════════════════════════════════

class LSTMGridPredictor:
    """LSTM that predicts qualifying/race times for ALL 22 drivers.

    Unlike LSTMLapPredictor (which predicts lap-by-lap for one driver),
    this model predicts the same target as GBR+XGBoost — average predicted
    qualifying time per driver — making it a true 3rd ensemble member.

    Architecture:
      - Input: sequence of per-driver feature vectors across historical years
      - LSTM(input=N_features, hidden=128, layers=2, dropout=0.2)
      - FC head: hidden → 64 → ReLU → 1
      - Output: predicted qualifying time (seconds)

    Training data: historical race lap data from FastF1, aggregated per
    driver per year, creating sequences of [year1_features, year2_features,
    year3_features] → predict year4 time.

    Falls back to analytical estimation if PyTorch unavailable.
    """

    def __init__(self, n_features=6, hidden_size=128, num_layers=2):
        self.torch, self.nn, self.available = _try_import_torch()
        self.n_features = n_features
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.model = None
        self.scaler_x = None
        self.scaler_y = None

        if self.available:
            self._build_model()

    def _build_model(self):
        torch, nn = self.torch, self.nn
        n_feat, hidden, n_layers = self.n_features, self.hidden_size, self.num_layers

        class _GridLSTM(nn.Module):
            def __init__(self):
                super().__init__()
                self.lstm = nn.LSTM(n_feat, hidden, n_layers,
                                    batch_first=True, dropout=0.2)
                self.fc = nn.Sequential(
                    nn.Linear(hidden, 64),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(64, 1),
                )

            def forward(self, x):
                lstm_out, _ = self.lstm(x)
                return self.fc(lstm_out[:, -1, :])

        self.model = _GridLSTM()

    def train_on_historical(self, historical_features, historical_targets,
                            epochs=60, lr=0.001):
        """Train the LSTM on historical per-driver data.

        Parameters
        ----------
        historical_features : np.ndarray, shape (n_samples, seq_len, n_features)
            Sequences of feature vectors per driver across years.
        historical_targets : np.ndarray, shape (n_samples, 1)
            Target qualifying/race times.
        """
        if not self.available or self.model is None:
            print("  ⚠️  PyTorch not available — LSTM grid training skipped.")
            return None

        torch, nn = self.torch, self.nn
        from sklearn.preprocessing import StandardScaler

        # Scale features
        n_samples, seq_len, n_feat = historical_features.shape
        flat = historical_features.reshape(-1, n_feat)
        self.scaler_x = StandardScaler()
        flat_scaled = self.scaler_x.fit_transform(flat)
        X = flat_scaled.reshape(n_samples, seq_len, n_feat)

        self.scaler_y = StandardScaler()
        y = self.scaler_y.fit_transform(historical_targets.reshape(-1, 1))

        X_t = torch.FloatTensor(X)
        y_t = torch.FloatTensor(y)
        dataset = torch.utils.data.TensorDataset(X_t, y_t)
        loader = torch.utils.data.DataLoader(dataset, batch_size=16,
                                              shuffle=True)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr,
                                     weight_decay=1e-4)
        criterion = nn.MSELoss()
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, patience=10, factor=0.5)

        self.model.train()
        best_loss = float("inf")
        for epoch in range(epochs):
            epoch_loss = 0.0
            for bx, by in loader:
                optimizer.zero_grad()
                pred = self.model(bx)
                loss = criterion(pred, by)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                epoch_loss += loss.item()
            avg = epoch_loss / max(len(loader), 1)
            scheduler.step(avg)
            best_loss = min(best_loss, avg)

        print(f"  ✅ LSTM Grid Predictor trained — {epochs} epochs, "
              f"best loss: {best_loss:.6f}")
        return {"epochs": epochs, "best_loss": best_loss}

    def predict(self, feature_sequences):
        """Predict qualifying times for all drivers.

        Parameters
        ----------
        feature_sequences : np.ndarray, shape (n_drivers, seq_len, n_features)

        Returns
        -------
        np.ndarray of predicted times, shape (n_drivers,)
        """
        if not self.available or self.model is None or self.scaler_x is None:
            return None

        torch = self.torch
        n, seq_len, n_feat = feature_sequences.shape
        flat = feature_sequences.reshape(-1, n_feat)
        scaled = self.scaler_x.transform(flat).reshape(n, seq_len, n_feat)

        self.model.eval()
        with torch.no_grad():
            X_t = torch.FloatTensor(scaled)
            pred_scaled = self.model(X_t).numpy()

        return self.scaler_y.inverse_transform(pred_scaled).ravel()


def compute_lstm_grid_predictions(merged, gp_key, years=[2023, 2024, 2025],
                                   cache_dir="f1_cache"):
    """Train LSTM Grid Predictor and return predictions for all 22 drivers.

    This function is the bridge that makes LSTM a true ensemble member.
    It loads historical race data from FastF1, builds per-driver feature
    sequences across years, trains the LSTM, and predicts qualifying times
    for the configured season grid.

    Parameters
    ----------
    merged : pd.DataFrame
        The fully-built training dataset with all features.
    gp_key : str
        Grand Prix identifier (e.g., "Australia").
    years : list[int]
        Historical years for training data.

    Returns
    -------
    np.ndarray | None
        Predicted qualifying times for each driver (22 values, aligned
        with merged rows), or None if training fails.
    """
    import fastf1
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    print(f"  🧠 Training LSTM Grid Predictor on {years} data...")

    # Collect per-driver, per-year aggregated stats
    driver_year_data = {}  # {driver_code: {year: feature_dict}}
    for year in years:
        try:
            session = fastf1.get_session(year, gp_key, "R")
            session.load(laps=True, telemetry=False, weather=False,
                         messages=False)
            laps = session.laps.copy()
            laps["LapTimeSec"] = laps["LapTime"].dt.total_seconds()
            laps = laps[laps["LapTimeSec"].notna()].copy()

            # Filter outliers
            q05 = laps["LapTimeSec"].quantile(0.05)
            q95 = laps["LapTimeSec"].quantile(0.95)
            laps = laps[(laps["LapTimeSec"] >= q05) &
                        (laps["LapTimeSec"] <= q95)]

            # Per-driver stats
            for drv, grp in laps.groupby("Driver"):
                if drv not in driver_year_data:
                    driver_year_data[drv] = {}
                n_laps = len(grp)
                driver_year_data[drv][year] = {
                    "avg_laptime": grp["LapTimeSec"].mean(),
                    "std_laptime": grp["LapTimeSec"].std(),
                    "best_laptime": grp["LapTimeSec"].min(),
                    "consistency": grp["LapTimeSec"].std() / grp["LapTimeSec"].mean(),
                    "n_laps": n_laps,
                    "pace_percentile": grp["LapTimeSec"].quantile(0.25),
                }
        except Exception as e:
            print(f"  ⚠️  LSTM grid data for {year} {gp_key}: {e}")

    if not driver_year_data:
        print("  ⚠️  No historical data for LSTM grid prediction.")
        return _analytical_lstm_fallback(merged)

    # Build training sequences: drivers with data in multiple years
    # Sequence: [year1_features, year2_features] → predict year3 avg laptime
    features_list = []
    targets_list = []
    feature_names = ["avg_laptime", "std_laptime", "best_laptime",
                     "consistency", "n_laps", "pace_percentile"]

    for drv, yr_data in driver_year_data.items():
        sorted_years = sorted(yr_data.keys())
        if len(sorted_years) < 2:
            continue
        # Create sequences: use all but last year as input, last year as target
        for i in range(1, len(sorted_years)):
            seq = []
            for y in sorted_years[:i]:
                row = [yr_data[y].get(f, 0.0) for f in feature_names]
                seq.append(row)
            target = yr_data[sorted_years[i]]["avg_laptime"]
            features_list.append(seq)
            targets_list.append(target)

    if len(features_list) < 5:
        print(f"  ⚠️  Only {len(features_list)} training sequences — "
              "using analytical fallback.")
        return _analytical_lstm_fallback(merged)

    # Pad sequences to same length
    max_seq = max(len(s) for s in features_list)
    n_feat = len(feature_names)
    X = np.zeros((len(features_list), max_seq, n_feat))
    for i, seq in enumerate(features_list):
        arr = np.array(seq)
        X[i, max_seq - len(seq):, :] = arr  # right-aligned padding
    y = np.array(targets_list)

    # Train
    lstm = LSTMGridPredictor(n_features=n_feat, hidden_size=128, num_layers=2)
    info = lstm.train_on_historical(X, y, epochs=60)
    if info is None:
        return _analytical_lstm_fallback(merged)

    # Predict for configured season grid: build feature sequences for each driver
    predictions = np.zeros(len(merged))
    for i, row in merged.iterrows():
        drv = row["Driver"]
        if drv in driver_year_data:
            seq = []
            for y_key in sorted(driver_year_data[drv].keys()):
                features = [driver_year_data[drv][y_key].get(f, 0.0)
                            for f in feature_names]
                seq.append(features)
            # Pad to max_seq
            arr = np.zeros((1, max_seq, n_feat))
            s = np.array(seq)
            arr[0, max_seq - len(seq):, :] = s
            pred = lstm.predict(arr)
            if pred is not None:
                predictions[i] = pred[0]
            else:
                predictions[i] = row.get("AdjustedQualiTime",
                                         row.get("QualifyingTime", 80.0))
        else:
            # No historical data for this driver — use ensemble estimate
            predictions[i] = row.get("AdjustedQualiTime",
                                     row.get("QualifyingTime", 80.0))

    print(f"  ✅ LSTM grid predictions: {len(predictions)} drivers, "
          f"range [{predictions.min():.2f}, {predictions.max():.2f}]s")
    return predictions


def _analytical_lstm_fallback(merged):
    """Analytical LSTM fallback when PyTorch unavailable or data insufficient.

    Uses a weighted combination of the driver's features to produce
    a prediction that differs from simple GBR/XGB averaging, providing
    ensemble diversity even without a neural network.

    The analytical model applies:
      - Clean air pace (primary signal)
      - Team performance adjustment
      - Current form adjustment
      - Tyre degradation circuit penalty
      - Small random perturbation for diversity
    """
    print("  📐 Using analytical LSTM fallback for ensemble diversity...")
    predictions = np.zeros(len(merged))
    for i, row in merged.iterrows():
        # Start from clean air pace
        base = row.get("CleanAirPace", 93.0)
        # Team adjustment: better teams = faster
        team_score = row.get("TeamPerformanceScore", 0.5)
        team_adj = -1.5 * (team_score - 0.5)  # range: -0.75 to +0.75
        # Form adjustment (lower form value = better, 1=best, 22=worst)
        form = row.get("CurrentForm", 11.0)
        form_adj = 0.05 * (form - 11.0)  # neutral at mid-grid
        # Tyre circuit factor
        tyre = row.get("TyreDegFactor", 0.5)
        tyre_adj = 0.3 * tyre
        # Experience bonus
        exp = row.get("ExperienceFactor", 3.0)
        exp_adj = -0.05 * (exp - 3.0)  # more experience = slightly faster
        # Diversity perturbation (deterministic per driver)
        diversity = np.sin(hash(row.get("Driver", "")) % 1000) * 0.1

        predictions[i] = base + team_adj + form_adj + tyre_adj + exp_adj + diversity

    print(f"  ✅ Analytical fallback: {len(predictions)} predictions, "
          f"range [{predictions.min():.2f}, {predictions.max():.2f}]s")
    return predictions


# ═════════════════════════════════════════════════════════════════════════
# 4. SEASON TRACKER — Predicted vs Actual
# ═════════════════════════════════════════════════════════════════════════

class SeasonTracker:
    """Track prediction accuracy across the season.

    Stores predicted vs actual results and generates comparison data
    for the website.
    """

    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
    TRACKER_FILE = os.path.join(PROJECT_ROOT, f"season_tracker_{SEASON_YEAR}.json")
    WEBSITE_TRACKER_FILE = os.path.join(WEBSITE_DATA_DIR, "season_tracker.json")

    def __init__(self):
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.TRACKER_FILE):
            with open(self.TRACKER_FILE) as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                loaded.setdefault("rounds", {})
                loaded.setdefault("accuracy", {})
                return loaded
        return {"rounds": {}, "accuracy": {}}

    def save(self):
        os.makedirs(os.path.dirname(self.TRACKER_FILE) or ".", exist_ok=True)
        with open(self.TRACKER_FILE, "w") as f:
            json.dump(self.data, f, indent=2)

    def _normalize_actual_results(self, actual_results):
        normalized = {}
        if not isinstance(actual_results, dict):
            return normalized
        for drv, value in actual_results.items():
            pos = value.get("position") if isinstance(value, dict) else value
            try:
                normalized[str(drv)] = int(pos)
            except (TypeError, ValueError):
                continue
        return normalized

    def _ensure_round_entry(self, rnd):
        if rnd not in self.data["rounds"]:
            self.data["rounds"][rnd] = {"predicted": {}, "actual": {}}

    def sync_from_round_file(self, round_num, round_data):
        """Ingest prediction/actual data from a round JSON payload."""
        rnd = str(round_num)
        self._ensure_round_entry(rnd)

        classification = round_data.get("classification", []) if isinstance(round_data, dict) else []
        if isinstance(classification, list) and classification:
            self.data["rounds"][rnd]["predicted"] = {}
            for entry in classification:
                if not isinstance(entry, dict):
                    continue
                drv = entry.get("driver")
                pos = entry.get("position")
                team = entry.get("team", DRIVER_TEAM.get(drv, "Unknown"))
                try:
                    self.data["rounds"][rnd]["predicted"][str(drv)] = {
                        "position": int(pos),
                        "team": team,
                    }
                except (TypeError, ValueError):
                    continue

        actual = self._normalize_actual_results(round_data.get("actualResults", {})) if isinstance(round_data, dict) else {}
        if actual:
            self.data["rounds"][rnd]["actual"] = {
                drv: {"position": int(pos)} for drv, pos in actual.items()
            }

        self._compute_accuracy(round_num)

    def sync_from_round_directory(self, rounds_dir):
        """Rebuild tracker rows from round JSON files for full consistency."""
        if not os.path.isdir(rounds_dir):
            return

        for fname in sorted(os.listdir(rounds_dir)):
            if not (fname.startswith("round_") and fname.endswith(".json")):
                continue
            path = os.path.join(rounds_dir, fname)
            try:
                with open(path) as f:
                    data = json.load(f)
            except Exception:
                continue

            try:
                round_num = int(str(data.get("round", "")))
            except (TypeError, ValueError):
                continue
            self.sync_from_round_file(round_num, data)

    def add_prediction(self, round_num, classification_data):
        """Record predictions for a round."""
        rnd = str(round_num)
        self._ensure_round_entry(rnd)
        for entry in classification_data:
            if not isinstance(entry, dict):
                continue
            drv = entry.get("driver")
            pos = entry.get("position")
            team = entry.get("team", DRIVER_TEAM.get(drv, "Unknown"))
            try:
                self.data["rounds"][rnd]["predicted"][str(drv)] = {
                    "position": int(pos),
                    "team": team,
                }
            except (TypeError, ValueError):
                continue
        self._compute_accuracy(round_num)
        self.save()

    def add_actual_result(self, round_num, actual_results):
        """Record actual results for comparison.

        actual_results: dict of {driver_code: position}
        """
        rnd = str(round_num)
        self._ensure_round_entry(rnd)
        normalized = self._normalize_actual_results(actual_results)
        for drv, pos in normalized.items():
            self.data["rounds"][rnd]["actual"][drv] = {"position": int(pos)}
        self._compute_accuracy(round_num)
        self.save()

    def _compute_accuracy(self, round_num):
        """Compute accuracy metrics for a round."""
        rnd = str(round_num)
        predicted = self.data["rounds"][rnd].get("predicted", {})
        actual = self.data["rounds"][rnd].get("actual", {})
        if not predicted or not actual:
            self.data["accuracy"].pop(rnd, None)
            return

        common = set(predicted.keys()) & set(actual.keys())
        if not common:
            return

        diffs = []
        exact = 0
        within_3 = 0
        for drv in common:
            p_pos = int(predicted[drv]["position"])
            a_pos = int(actual[drv]["position"])
            diff = abs(p_pos - a_pos)
            diffs.append(diff)
            if diff == 0:
                exact += 1
            if diff <= 3:
                within_3 += 1

        within_5 = int(sum(1 for d in diffs if d <= 5))

        self.data["accuracy"][rnd] = {
            "mean_position_error": round(np.mean(diffs), 2),
            "median_position_error": round(float(np.median(diffs)), 1),
            "exact_matches": exact,
            "within_3_positions": within_3,
            "within_5_positions": within_5,
            "total_drivers": len(common),
            "accuracy_pct": round(within_3 / len(common) * 100, 1),
        }

    def _round_comparison_rows(self, round_num):
        rnd = str(round_num)
        round_data = self.data["rounds"].get(rnd, {})
        predicted = round_data.get("predicted", {})
        actual = round_data.get("actual", {})
        common = sorted(set(predicted.keys()) & set(actual.keys()))
        rows = []
        for drv in common:
            p_pos = int(predicted[drv]["position"])
            a_pos = int(actual[drv]["position"])
            delta = p_pos - a_pos
            team = predicted[drv].get("team") or DRIVER_TEAM.get(drv, "Unknown")
            rows.append({
                "driver": drv,
                "team": team,
                "predicted": p_pos,
                "actual": a_pos,
                "delta": delta,
                "absDelta": abs(delta),
            })
        return rows

    def get_round_report(self, round_num):
        """Return a detailed per-GP prediction-vs-truth report."""
        rows = self._round_comparison_rows(round_num)
        if not rows:
            return None

        diffs = [r["absDelta"] for r in rows]
        exact = sum(1 for r in rows if r["absDelta"] == 0)
        within3 = sum(1 for r in rows if r["absDelta"] <= 3)
        within5 = sum(1 for r in rows if r["absDelta"] <= 5)

        predicted_podium = {r["driver"] for r in sorted(rows, key=lambda x: x["predicted"])[:3]}
        actual_podium = {r["driver"] for r in sorted(rows, key=lambda x: x["actual"])[:3]}
        predicted_winner = min(rows, key=lambda x: x["predicted"])["driver"]
        actual_winner = min(rows, key=lambda x: x["actual"])["driver"]

        team_acc = {}
        for row in rows:
            team = row["team"]
            if team not in team_acc:
                team_acc[team] = {"sum": 0.0, "n": 0}
            team_acc[team]["sum"] += row["absDelta"]
            team_acc[team]["n"] += 1
        team_mean_error = [
            {
                "team": team,
                "meanError": round(values["sum"] / max(values["n"], 1), 2),
                "drivers": values["n"],
            }
            for team, values in team_acc.items()
        ]
        team_mean_error.sort(key=lambda x: x["meanError"])

        biggest_misses = sorted(rows, key=lambda x: x["absDelta"], reverse=True)[:5]

        return {
            "round": int(round_num),
            "name": CALENDAR.get(int(round_num), {}).get("name", f"Round {round_num}"),
            "comparedDrivers": len(rows),
            "meanError": round(float(np.mean(diffs)), 2),
            "medianError": round(float(np.median(diffs)), 2),
            "exactMatches": int(exact),
            "within3": int(within3),
            "within5": int(within5),
            "winnerHit": predicted_winner == actual_winner,
            "podiumHits": len(predicted_podium & actual_podium),
            "biggestMisses": biggest_misses,
            "teamMeanError": team_mean_error,
        }

    def export_for_website(self):
        """Export tracker data in website-compatible format."""
        rounds_data = []
        gp_reports = []

        def _round_sort_key(item):
            try:
                return int(str(item[0]))
            except (TypeError, ValueError):
                return 10**9

        for rnd_str, rnd_data in sorted(self.data["rounds"].items(), key=_round_sort_key):
            rnd_num = int(rnd_str)
            has_actual = bool(rnd_data.get("actual"))
            accuracy = self.data["accuracy"].get(rnd_str, {})
            rounds_data.append({
                "round": rnd_num,
                "hasActual": has_actual,
                "meanError": accuracy.get("mean_position_error"),
                "exactMatches": accuracy.get("exact_matches"),
                "within3": accuracy.get("within_3_positions"),
                "accuracyPct": accuracy.get("accuracy_pct"),
            })
            if has_actual:
                report = self.get_round_report(rnd_num)
                if report:
                    gp_reports.append(report)
        return {
            "rounds": rounds_data,
            "overallAccuracy": self._overall_accuracy(),
            "gpReports": gp_reports,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
        }

    def _overall_accuracy(self):
        """Compute season-wide accuracy metrics."""
        if not self.data["accuracy"]:
            return None
        errors = [v["mean_position_error"]
                  for v in self.data["accuracy"].values()]
        within3 = [v["within_3_positions"]
                   for v in self.data["accuracy"].values()]
        totals = [v["total_drivers"]
                  for v in self.data["accuracy"].values()]
        return {
            "seasonMeanError": round(np.mean(errors), 2),
            "seasonAccuracyPct": round(
                sum(within3) / max(sum(totals), 1) * 100, 1),
            "roundsWithActual": len(self.data["accuracy"]),
        }


def plot_season_accuracy(tracker_data, out_dir):
    """Visualize season prediction accuracy over time."""
    rounds = [r for r in tracker_data["rounds"] if r["hasActual"]]
    if not rounds:
        print("  ⚠️  No actual results to compare — skipping accuracy plot.")
        return None

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7), facecolor="#1a1a2e")

    # Left: Mean position error per round
    ax1.set_facecolor("#1a1a2e")
    rnds = [r["round"] for r in rounds]
    errors = [r["meanError"] for r in rounds]
    ax1.bar(rnds, errors, color="#E8002D", edgecolor="white", linewidth=0.5)
    ax1.set_xlabel("Round", fontsize=12, color="white")
    ax1.set_ylabel("Mean Position Error", fontsize=12, color="white")
    ax1.set_title("Prediction Error by Round", fontsize=14,
                  fontweight="bold", color="white")
    ax1.tick_params(colors="white")
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.spines["bottom"].set_color("white")
    ax1.spines["left"].set_color("white")

    # Right: Accuracy % per round
    ax2.set_facecolor("#1a1a2e")
    accuracy = [r["accuracyPct"] for r in rounds]
    ax2.plot(rnds, accuracy, color="#22C55E", linewidth=2.5, marker="o",
             markersize=8, markerfacecolor="#22C55E", markeredgecolor="white")
    ax2.set_xlabel("Round", fontsize=12, color="white")
    ax2.set_ylabel("Accuracy (within 3 positions) %", fontsize=12,
                    color="white")
    ax2.set_title("Prediction Accuracy Over Season", fontsize=14,
                  fontweight="bold", color="white")
    ax2.set_ylim(0, 100)
    ax2.tick_params(colors="white")
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.spines["bottom"].set_color("white")
    ax2.spines["left"].set_color("white")
    ax2.grid(alpha=0.15, color="white")

    plt.tight_layout()
    path = os.path.join(out_dir, "season_accuracy.png")
    os.makedirs(out_dir, exist_ok=True)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  💾 {path}")
    return "season_accuracy.png"


# ═════════════════════════════════════════════════════════════════════════
# 5. INTEGRATED RUNNER — generates all advanced outputs for a round
# ═════════════════════════════════════════════════════════════════════════

def generate_advanced_features(round_num, classification_data, merged,
                                out_dir=None, gp_name=None,
                                fastf1_years=[2023, 2024]):
    """Run all advanced analyses for a round and return extra viz filenames.

    Parameters
    ----------
    round_num : int
    classification_data : list[dict] – from export (ClassificationEntry format)
    merged : pd.DataFrame – the full merged prediction dataset
    out_dir : str – visualization output directory
    gp_name : str – e.g. "Australian Grand Prix"
    fastf1_years : list[int] – years to use for LSTM training data

    Returns
    -------
    dict with keys: extra_visualizations (list[str]), strategy_data, tyre_data,
                    lstm_data, tracker_data
    """
    info = CALENDAR[round_num]
    gp_key = info["gp_key"]
    total_laps = info["laps"]
    if gp_name is None:
        gp_name = info["name"]
    if out_dir is None:
        out_dir = os.path.join("website", "public", "visualizations",
                               f"round_{round_num:02d}")

    extra_viz = []
    result = {}

    # --- Pit Strategy Simulation ---
    print(f"\n🔧 Generating advanced features for Round {round_num}...")
    print(f"  ⛽ Pit strategy simulation...")
    try:
        p1_driver = classification_data[0]["driver"]
        p1_time = classification_data[0]["predictedTime"]
        pit_loss = TEAM_PIT_SPEED.get(
            DRIVER_TEAM.get(p1_driver, ""), 2.5) + 20.0  # pit lane + stop

        strategies = get_default_strategies(total_laps, gp_key)
        strategy_results = simulate_pit_strategy(
            p1_time, total_laps, strategies, pit_loss=pit_loss)

        fname = plot_pit_strategy_comparison(
            strategy_results, gp_name, out_dir, total_laps)
        extra_viz.append(fname)
        result["strategyData"] = {
            name: {
                "meanTime": d["mean_total_time"],
                "stdTime": d["std_total_time"],
                "numStops": d["num_stops"],
            }
            for name, d in strategy_results.items()
        }
        print(f"  ✅ Pit strategy: {len(strategies)} strategies simulated")
    except Exception as e:
        print(f"  ⚠️  Pit strategy failed: {e}")

    # --- Tyre Degradation Curves ---
    print(f"  🔴 Tyre degradation curves...")
    try:
        curves = model_tyre_degradation(gp_key, total_laps)
        fname = plot_tyre_degradation_curves(curves, gp_name, out_dir,
                                             total_laps)
        extra_viz.append(fname)
        result["tyreDegData"] = {
            compound: {
                "cliffLap": data["cliff_lap"],
                "degRate": data["deg_rate"],
                "paceOffset": data["pace_offset"],
            }
            for compound, data in curves.items()
        }
        print(f"  ✅ Tyre degradation: {len(curves)} compounds modelled")
    except Exception as e:
        print(f"  ⚠️  Tyre degradation failed: {e}")

    # --- LSTM Pace Prediction (visualization) ---
    print(f"  🧠 LSTM lap-time prediction (visualization)...")
    try:
        lstm_model, lstm_info = train_lstm_from_fastf1(
            gp_key, years=fastf1_years)
        if lstm_model is not None:
            # Predict race pace for P1 driver
            p1_time = classification_data[0]["predictedTime"]
            initial = [[p1_time, 1, 1.0, 1]]  # [time, tyre_age, fuel, compound]
            for i in range(1, 5):
                initial.append([p1_time + 0.02 * i, i + 1, 1.0 - i / total_laps, 1])

            preds = lstm_model.predict_race(initial, total_laps)
            p1_name = classification_data[0].get("driverFullName",
                                                  classification_data[0]["driver"])
            fname = plot_lstm_predictions(preds, p1_time, p1_name, gp_name,
                                          out_dir, total_laps)
            extra_viz.append(fname)
            result["lstmData"] = {
                "driver": classification_data[0]["driver"],
                "avgPredicted": round(float(np.mean(preds)), 3),
                "minLap": round(float(min(preds)), 3),
                "maxLap": round(float(max(preds)), 3),
                "available": True,
            }
            print(f"  ✅ LSTM: race pace predicted for {p1_name}")
        else:
            result["lstmData"] = {"available": False,
                                   "note": "Training data unavailable"}
    except Exception as e:
        print(f"  ⚠️  LSTM failed: {e}")
        result["lstmData"] = {"available": False, "note": str(e)}

    # --- LSTM Grid Predictions (ensemble integration, v3 NEW) ---
    print(f"  🧠 LSTM Grid Predictor (ensemble member)...")
    try:
        lstm_grid_preds = compute_lstm_grid_predictions(
            merged, gp_key, years=fastf1_years)
        result["lstmGridPredictions"] = lstm_grid_preds
        if lstm_grid_preds is not None:
            print(f"  ✅ LSTM grid predictions ready for ensemble")
        else:
            print(f"  ⚠️  LSTM grid predictions unavailable — ensemble "
                  "will use GBR+XGB only")
    except Exception as e:
        print(f"  ⚠️  LSTM Grid Predictor failed: {e}")
        result["lstmGridPredictions"] = None

    # --- Season Tracker ---
    print(f"  📊 Season tracker...")
    try:
        tracker = SeasonTracker()
        rounds_dir = os.path.join(WEBSITE_DATA_DIR, "rounds")
        tracker.sync_from_round_directory(rounds_dir)
        tracker.add_prediction(round_num, classification_data)
        tracker_export = tracker.export_for_website()
        result["trackerData"] = tracker_export

        # Save tracker data for website
        tracker_path = SeasonTracker.WEBSITE_TRACKER_FILE
        os.makedirs(os.path.dirname(tracker_path), exist_ok=True)
        with open(tracker_path, "w") as f:
            json.dump(tracker_export, f, indent=2)
        print(f"  ✅ Season tracker updated → {tracker_path}")
    except Exception as e:
        print(f"  ⚠️  Season tracker failed: {e}")

    result["extra_visualizations"] = extra_viz
    print(f"\n✅ Advanced features: {len(extra_viz)} additional visualisations")
    return result
