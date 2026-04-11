import { DEFAULT_SEASON_YEAR } from "@/lib/season";

const ACTIVE_SEASON_YEAR = String(DEFAULT_SEASON_YEAR);

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <p
          className="text-xs font-bold tracking-[0.3em] uppercase mb-2"
          style={{ color: "#E10600" }}
        >
          Behind the Predictions
        </p>
        <h1
          className="text-3xl sm:text-4xl font-black mb-3"
          style={{ color: "var(--text)" }}
        >
          About This Project
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          How we predict every race of the {ACTIVE_SEASON_YEAR} Formula 1 season
        </p>
      </div>

      <div className="space-y-6">
        <section className="card p-6 sm:p-8">
          <h2 className="section-heading">Overview</h2>
          <p className="leading-relaxed" style={{ color: "var(--text-muted)" }}>
            This website hosts machine learning-powered predictions for the {ACTIVE_SEASON_YEAR}
            Formula 1 season. Every Grand Prix is predicted using an ensemble
            model trained on historical qualifying and race data from 2023-2025
            via the FastF1 API. The predictions include full race
            classifications, championship standings, and detailed
            visualizations.
          </p>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="section-heading">Model Architecture</h2>
          <div
            className="space-y-4 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            <p>
              The prediction engine uses a{" "}
              <strong style={{ color: "var(--text)" }}>
                3-model weighted ensemble
              </strong>
              : Gradient Boosting (40%) + XGBoost (40%) + LSTM Neural Network
              (20%), normalized with StandardScaler. When LSTM is unavailable,
              the system falls back gracefully to a 50/50 GBR+XGB ensemble.
            </p>
            <p>
              <strong style={{ color: "var(--text)" }}>
                12 balanced features
              </strong>{" "}
              model each driver&apos;s predicted qualifying time:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
              {[
                "TeamPerformanceScore - 2025 constructor standings normalized",
                "TeamAdjustedPace - historical qualifying + team change adjustments",
                "CleanAirPace - race pace without DRS/traffic effects",
                "CurrentForm - exponentially-weighted recent results",
                "ExperienceFactor - years in F1 normalized",
                "PitTimeLoss - circuit-specific pit lane time",
                "TyreDegFactor - circuit tyre degradation rating",
                "RainProbability - expected weather conditions",
                "Temperature - race-day temperature estimate",
                "PreviousPosition - last predicted/actual finishing position",
                "SeasonMomentum - improvement trend (early vs recent races)",
                "PositionTrend - linear regression slope of recent positions",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-sm py-1"
                >
                  <span className="text-f1-red mt-0.5 shrink-0">&#9654;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p>
              Predictions are calibrated with a maximum spread of 3.5 seconds
              (P1 to P22) to ensure realistic gaps.
            </p>
          </div>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="section-heading">Advanced Models</h2>
          <div
            className="space-y-4 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            <p>
              Beyond the core ensemble, the system includes an{" "}
              <strong style={{ color: "var(--text)" }}>
                LSTM neural network
              </strong>{" "}
              (PyTorch) for lap-by-lap pace prediction with 64 hidden units
              across 2 layers and sequence length of 5.
            </p>
            <p>
              A{" "}
              <strong style={{ color: "var(--text)" }}>
                Monte-Carlo pit strategy simulator
              </strong>{" "}
              evaluates different compound combinations and stop timings to
              determine optimal race strategies, accounting for
              compound-specific degradation curves and tyre cliffs.
            </p>
            <p>
              The{" "}
              <strong style={{ color: "var(--text)" }}>Season Tracker</strong>{" "}
              maintains cumulative championships, updating driver and
              constructor standings after each predicted round with
              exponentially-weighted form tracking.
            </p>
          </div>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="section-heading">Tech Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3
                className="font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#00D2BE" }}
                />
                Prediction Engine
              </h3>
              <ul
                className="text-sm space-y-2"
                style={{ color: "var(--text-muted)" }}
              >
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> Python
                  3.11 / FastF1 API
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span>{" "}
                  scikit-learn / XGBoost
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> PyTorch
                  (LSTM)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> pandas /
                  NumPy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span>{" "}
                  matplotlib / seaborn
                </li>
              </ul>
            </div>
            <div>
              <h3
                className="font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#3B82F6" }}
                />
                Website
              </h3>
              <ul
                className="text-sm space-y-2"
                style={{ color: "var(--text-muted)" }}
              >
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> Next.js
                  16 / React 19 / TypeScript 5
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> Tailwind
                  CSS v4
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> Recharts
                  for interactive charts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-f1-red">&#9654;</span> GitHub
                  Pages deployment
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className="card p-6 sm:p-8"
          style={{ borderColor: "rgba(255, 215, 0, 0.15)" }}
        >
          <h2 className="section-heading">Disclaimer</h2>
          <p
            className="leading-relaxed text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            This is a personal project for educational and entertainment
            purposes. Predictions are generated by machine learning models and
            should not be used for betting or any form of gambling. This project
            is not affiliated with, endorsed by, or connected to Formula 1, FIA,
            or any F1 team.
          </p>
        </section>
      </div>
    </div>
  );
}
