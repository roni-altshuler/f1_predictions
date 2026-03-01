export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-black mb-8" style={{ color: "var(--text)" }}>
        About This Project
      </h1>

      <div className="space-y-8">
        <section className="card card-glow p-6">
          <h2 className="text-xl font-bold text-f1-red mb-3">Overview</h2>
          <p className="leading-relaxed" style={{ color: "var(--text-muted)" }}>
            This website hosts machine learning-powered predictions for the 2026 Formula 1
            season. Every Grand Prix is predicted using an ensemble model trained on
            historical qualifying and race data from 2023-2025 via the FastF1 API. The
            predictions include full race classifications, championship standings, and
            detailed visualizations.
          </p>
        </section>

        <section className="card card-glow p-6">
          <h2 className="text-xl font-bold text-f1-red mb-3">Model Architecture</h2>
          <div className="space-y-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>
              The prediction engine uses an <strong style={{ color: "var(--text)" }}>ensemble approach</strong>{" "}
              combining XGBoost and Gradient Boosting Regressors, weighted 50/50 and
              normalized with StandardScaler.
            </p>
            <p>
              <strong style={{ color: "var(--text)" }}>9 balanced features</strong> model each
              driver&apos;s predicted qualifying time:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>TeamPerformanceScore – 2025 constructor standings normalized</li>
              <li>TeamAdjustedPace – historical qualifying + team change adjustments</li>
              <li>CleanAirPace – race pace without DRS/traffic effects</li>
              <li>CurrentForm – exponentially-weighted recent results</li>
              <li>ExperienceFactor – years in F1 normalized</li>
              <li>PitTimeLoss – circuit-specific pit lane time</li>
              <li>TyreDegFactor – circuit tyre degradation rating</li>
              <li>RainProbability – expected weather conditions</li>
              <li>Temperature – race-day temperature estimate</li>
            </ul>
            <p>
              Predictions are calibrated with a maximum spread of 3.5 seconds
              (P1 to P22) to ensure realistic gaps.
            </p>
          </div>
        </section>

        <section className="card card-glow p-6">
          <h2 className="text-xl font-bold text-f1-red mb-3">Advanced Models</h2>
          <div className="space-y-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>
              Beyond the core ensemble, the system includes an{" "}
              <strong style={{ color: "var(--text)" }}>LSTM neural network</strong> (PyTorch) for
              lap-by-lap pace prediction with 64 hidden units across 2 layers and sequence
              length of 5.
            </p>
            <p>
              A <strong style={{ color: "var(--text)" }}>Monte-Carlo pit strategy simulator</strong>{" "}
              evaluates different compound combinations and stop timings to determine optimal
              race strategies, accounting for compound-specific degradation curves and tyre cliffs.
            </p>
            <p>
              The <strong style={{ color: "var(--text)" }}>Season Tracker</strong> maintains
              cumulative championships, updating driver and constructor standings after each
              predicted round with exponentially-weighted form tracking.
            </p>
          </div>
        </section>

        <section className="card card-glow p-6">
          <h2 className="text-xl font-bold text-f1-red mb-3">Tech Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--text)" }}>Prediction Engine</h3>
              <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
                <li>• Python 3.11 / FastF1 API</li>
                <li>• scikit-learn / XGBoost</li>
                <li>• PyTorch (LSTM)</li>
                <li>• pandas / NumPy</li>
                <li>• matplotlib / seaborn</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--text)" }}>Website</h3>
              <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
                <li>• Next.js 16 / React 19 / TypeScript 5</li>
                <li>• Tailwind CSS v4</li>
                <li>• Recharts for interactive charts</li>
                <li>• GitHub Pages deployment</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="card card-glow p-6">
          <h2 className="text-xl font-bold text-f1-red mb-3">Disclaimer</h2>
          <p className="leading-relaxed" style={{ color: "var(--text-muted)" }}>
            This is a personal project for educational and entertainment purposes.
            Predictions are generated by machine learning models and should not be used
            for betting or any form of gambling. This project is not affiliated with,
            endorsed by, or connected to Formula 1, FIA, or any F1 team.
          </p>
        </section>
      </div>
    </div>
  );
}
