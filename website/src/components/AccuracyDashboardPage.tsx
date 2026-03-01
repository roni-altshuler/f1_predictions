"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SeasonTrackerData, SeasonData } from "@/types";
import { fetchSeasonTrackerData, fetchSeasonData } from "@/lib/data";

export default function AccuracyDashboardPage() {
  const [tracker, setTracker] = useState<SeasonTrackerData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchSeasonTrackerData()
      .then((d) => {
        if (!d) setError(true);
        else setTracker(d);
      })
      .catch(() => setError(true));
    fetchSeasonData().then(setSeason).catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">📊</div>
        <h1 className="text-3xl font-black mb-4" style={{ color: "var(--text)" }}>
          Accuracy Data Not Available
        </h1>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>
          Run the pipeline with <code className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>--advanced</code> to generate prediction accuracy tracking data.
        </p>
        <Link href="/" className="text-f1-red hover:text-f1-accent font-medium transition-colors">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-f1-red border-t-transparent rounded-full animate-spin" />
          <div className="text-lg" style={{ color: "var(--text-muted)" }}>Loading accuracy data...</div>
        </div>
      </div>
    );
  }

  const roundsWithActual = tracker.rounds.filter((r) => r.hasActual);
  const roundsWithoutActual = tracker.rounds.filter((r) => !r.hasActual);
  const hasActualResults = roundsWithActual.length > 0;

  // Get round names from season data
  const getRoundName = (round: number) => {
    if (!season) return `Round ${round}`;
    const race = season.calendar.find((r) => r.round === round);
    return race ? race.name : `Round ${round}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: "var(--text)" }}>
          📊 Prediction Accuracy Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Track how our ML model predictions compare to actual race results across the 2026 season
        </p>
      </motion.div>

      {/* Overall Season Metrics */}
      {tracker.overallAccuracy && (
        <motion.div
          className="card p-6 sm:p-8 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="section-heading">🏆 Season Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="metric-card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Season Accuracy
              </p>
              <p
                className="text-4xl font-black"
                style={{
                  color:
                    tracker.overallAccuracy.seasonAccuracyPct >= 70
                      ? "#22C55E"
                      : tracker.overallAccuracy.seasonAccuracyPct >= 50
                      ? "#FF8000"
                      : "#E8002D",
                }}
              >
                {tracker.overallAccuracy.seasonAccuracyPct}%
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                predictions within 3 positions
              </p>
            </div>
            <div className="metric-card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Mean Position Error
              </p>
              <p
                className="text-4xl font-black"
                style={{
                  color:
                    tracker.overallAccuracy.seasonMeanError <= 2
                      ? "#22C55E"
                      : tracker.overallAccuracy.seasonMeanError <= 4
                      ? "#FF8000"
                      : "#E8002D",
                }}
              >
                {tracker.overallAccuracy.seasonMeanError.toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                positions average off
              </p>
            </div>
            <div className="metric-card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Rounds Compared
              </p>
              <p className="text-4xl font-black" style={{ color: "var(--text)" }}>
                {tracker.overallAccuracy.roundsWithActual}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                of {tracker.rounds.length} total rounds
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Per-Round Accuracy Chart (bar-style) */}
      {hasActualResults && (
        <motion.div
          className="card p-6 sm:p-8 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="section-heading">📈 Accuracy Per Round</h2>
          <div className="space-y-3">
            {roundsWithActual.map((r, i) => {
              const pct = r.accuracyPct ?? 0;
              const color =
                pct >= 70 ? "#22C55E" : pct >= 50 ? "#FF8000" : "#E8002D";
              return (
                <motion.div
                  key={r.round}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/race/${r.round}`}
                    className="flex items-center gap-4 group"
                  >
                    <div
                      className="w-36 sm:w-44 text-sm font-medium truncate group-hover:text-f1-red transition-colors"
                      style={{ color: "var(--text)" }}
                    >
                      R{r.round}: {getRoundName(r.round).replace(" Grand Prix", "")}
                    </div>
                    <div className="flex-1 progress-bar h-4">
                      <div
                        className="progress-bar-fill h-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span
                      className="text-sm font-mono w-14 text-right font-bold"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </Link>
                  <div className="flex gap-4 ml-36 sm:ml-44 pl-4 mt-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Mean error: {r.meanError?.toFixed(1) ?? "–"} pos
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Exact: {r.exactMatches ?? 0}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Within 3: {r.within3 ?? 0}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Detailed Round Table */}
      <motion.div
        className="card overflow-hidden mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="p-6 sm:p-8">
          <h2 className="section-heading">📋 All Rounds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Round", "Grand Prix", "Status", "Accuracy", "Mean Error", "Exact", "Within 3"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {tracker.rounds.map((r) => {
                const statusColor = r.hasActual ? "#22C55E" : "var(--text-muted)";
                const statusText = r.hasActual ? "Compared" : "Predicted Only";
                return (
                  <tr
                    key={r.round}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-card-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => (window.location.href = `/race/${r.round}`)}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--text)" }}>
                      {r.round}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                      {getRoundName(r.round)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: r.hasActual
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(136, 136, 136, 0.1)",
                          color: statusColor,
                          border: `1px solid ${r.hasActual ? "rgba(34, 197, 94, 0.2)" : "rgba(136, 136, 136, 0.2)"}`,
                        }}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: r.accuracyPct != null ? (r.accuracyPct >= 70 ? "#22C55E" : r.accuracyPct >= 50 ? "#FF8000" : "#E8002D") : "var(--text-muted)" }}>
                      {r.accuracyPct != null ? `${r.accuracyPct}%` : "–"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>
                      {r.meanError != null ? r.meanError.toFixed(1) : "–"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>
                      {r.exactMatches ?? "–"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>
                      {r.within3 ?? "–"}
                    </td>
                  </tr>
                );
              })}
              {/* Prediction-only rounds (not in tracker yet) */}
              {roundsWithoutActual.length === 0 && tracker.rounds.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                    No prediction data available yet. Run the pipeline with --advanced to generate tracking data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info Card */}
      {!hasActualResults && (
        <motion.div
          className="card p-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="text-5xl mb-4">🔮</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
            Awaiting Actual Results
          </h3>
          <p className="text-sm max-w-lg mx-auto mb-4" style={{ color: "var(--text-muted)" }}>
            Predictions have been recorded for {tracker.rounds.length} round
            {tracker.rounds.length !== 1 ? "s" : ""}. Once actual race results are
            available, this dashboard will show detailed accuracy comparisons
            including position error charts, exact match counts, and trend analysis.
          </p>
          <div
            className="inline-block px-4 py-2 rounded-lg text-sm font-mono"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            python advanced_models.py --add-actual --round N
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      <motion.div
        className="card p-6 sm:p-8 mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2 className="section-heading">ℹ️ How Accuracy Is Measured</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-bold mb-2" style={{ color: "var(--text)" }}>
              📏 Mean Position Error
            </h4>
            <p style={{ color: "var(--text-muted)" }}>
              Average absolute difference between predicted and actual finishing
              positions across all drivers. Lower is better.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-2" style={{ color: "var(--text)" }}>
              🎯 Exact Matches
            </h4>
            <p style={{ color: "var(--text-muted)" }}>
              Number of drivers whose predicted position exactly matches their
              actual finishing position.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-2" style={{ color: "var(--text)" }}>
              ✅ Within 3 Positions
            </h4>
            <p style={{ color: "var(--text-muted)" }}>
              Percentage of drivers predicted within 3 positions of their actual
              result. This is our primary accuracy metric.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
