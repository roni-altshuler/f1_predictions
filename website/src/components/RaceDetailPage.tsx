"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RoundData, SeasonData, COUNTRY_FLAGS } from "@/types";
import { fetchRoundData, fetchSeasonData, getVisualizationPath, formatDate, formatGap } from "@/lib/data";

type Tab = "classification" | "analysis" | "strategy" | "visualizations";

interface Props {
  round: number;
}

const VIZ_CATEGORIES = [
  {
    id: "ml",
    title: "🤖 Model Predictions",
    items: [
      { key: "predicted_laptimes", label: "Predicted Lap Times", desc: "ML-predicted qualifying times for all drivers" },
      { key: "feature_importance", label: "Feature Importance", desc: "Which features most influence the model's predictions" },
      { key: "team_vs_pace", label: "Team vs Pace", desc: "Team performance comparison by predicted pace" },
      { key: "pace_vs_predicted", label: "Pace vs Predicted", desc: "Correlation between raw pace and final prediction" },
      { key: "laptime_distribution", label: "Lap Time Distribution", desc: "Statistical distribution of predicted lap times" },
    ],
  },
  {
    id: "fastf1",
    title: "🏎️ FastF1 Historical Data",
    items: [
      { key: "track_map", label: "Track Map", desc: "Circuit layout colored by speed telemetry" },
      { key: "laptime_distribution_historical", label: "Historical Lap Times", desc: "Lap time distributions from previous seasons" },
      { key: "tyre_strategy", label: "Tyre Strategy", desc: "Historical tyre compound usage waterfall chart" },
    ],
  },
  {
    id: "advanced",
    title: "⛽ Strategy Analysis",
    items: [
      { key: "pit_strategy", label: "Pit Strategy", desc: "Monte-Carlo simulation of optimal pit strategies" },
      { key: "tyre_degradation", label: "Tyre Degradation", desc: "Compound-specific degradation curves with cliff modeling" },
    ],
  },
];

// All known visualization files — discovers images not listed in JSON
const ALL_KNOWN_VIZ_FILENAMES = [
  "predicted_laptimes.png",
  "feature_importance.png",
  "team_vs_pace.png",
  "pace_vs_predicted.png",
  "laptime_distribution.png",
  "track_map.png",
  "laptime_distribution_historical.png",
  "tyre_strategy.png",
  "pit_strategy_comparison.png",
  "tyre_degradation_curves.png",
  "lstm_pace_prediction.png",
];

export default function RaceDetailPage({ round }: Props) {
  const [data, setData] = useState<RoundData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("classification");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((filename: string) => {
    setFailedImages(prev => new Set(prev).add(filename));
  }, []);

  useEffect(() => {
    fetchRoundData(round).then(setData).catch(() => setError(true));
    fetchSeasonData().then(setSeason).catch(() => {});
  }, [round]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">🏁</div>
        <h1 className="text-3xl font-black mb-4" style={{ color: "var(--text)" }}>Prediction Not Available</h1>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>Round {round} has not been predicted yet.</p>
        <Link href="/calendar" className="text-f1-red hover:text-f1-accent font-medium transition-colors">← Back to Calendar</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-f1-red border-t-transparent rounded-full animate-spin" />
          <div className="text-lg" style={{ color: "var(--text-muted)" }}>Loading race data...</div>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "classification", label: "Classification", icon: "🏁" },
    { key: "analysis", label: "Circuit & Model", icon: "📊" },
    { key: "strategy", label: "Strategy", icon: "⛽" },
    { key: "visualizations", label: "Visualizations", icon: "📈" },
  ];

  // Merge JSON-listed viz with known filenames to discover all available images
  const vizFiles = [...new Set([...(data.visualizations || []), ...ALL_KNOWN_VIZ_FILENAMES])];

  // Categorize by exact filename match (avoids substring collisions)
  const mlViz = vizFiles.filter(f =>
    ["predicted_laptimes.png", "feature_importance.png", "team_vs_pace.png", "pace_vs_predicted.png", "laptime_distribution.png"].includes(f)
  );
  const fastf1Viz = vizFiles.filter(f =>
    ["track_map.png", "laptime_distribution_historical.png", "tyre_strategy.png"].includes(f)
  );
  const advancedViz = vizFiles.filter(f =>
    ["pit_strategy_comparison.png", "tyre_degradation_curves.png", "lstm_pace_prediction.png"].includes(f)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strategyData = (data as any).strategyData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tyreDegData = (data as any).tyreDegData;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors text-2xl font-light z-10"
            onClick={() => setLightboxImg(null)}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          <img src={lightboxImg} alt="Visualization" className="lightbox-image" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <span className="text-4xl">{COUNTRY_FLAGS[data.gpKey] || "🏁"}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: "rgba(232, 0, 45, 0.1)", color: "#E8002D", border: "1px solid rgba(232, 0, 45, 0.2)" }}>
              Round {data.round}
            </span>
            {data.sprint && (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: "rgba(255, 128, 0, 0.1)", color: "#FF8000", border: "1px solid rgba(255, 128, 0, 0.2)" }}>
                Sprint Weekend
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text)" }}>{data.name}</h1>
        </div>
      </motion.div>
      <p className="mb-10 text-sm" style={{ color: "var(--text-muted)" }}>
        {data.circuit} • {formatDate(data.date)}
      </p>

      {/* Podium */}
      <motion.div
        className="card overflow-hidden mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="grid grid-cols-3">
          {data.classification.slice(0, 3).map((entry, i) => (
            <div
              key={entry.driver}
              className="p-5 sm:p-8 text-center border-r last:border-r-0 relative group"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 100%, ${entry.teamColor}15, transparent 70%)` }} />
              <div className="relative">
                <div className={`text-4xl sm:text-5xl font-black mb-2 ${i === 0 ? "podium-1" : i === 1 ? "podium-2" : "podium-3"}`}>
                  P{entry.position}
                </div>
                <div className="w-12 h-1 rounded-full mx-auto mb-3" style={{ backgroundColor: entry.teamColor }} />
                <p className="font-black text-lg" style={{ color: "var(--text)" }}>{entry.driver}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.driverFullName}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.team}</p>
                <p className="text-sm font-bold mt-2" style={{ color: "var(--text)" }}>{entry.predictedTime}s</p>
                <p className="text-f1-red font-bold text-sm">+{entry.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-button inline-flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.key ? "active" : ""}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Classification Tab ═══ */}
      {activeTab === "classification" && (
        <motion.div
          className="card overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["POS", "DRIVER", "", "TEAM", "TIME", "GAP", "PTS"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.classification.map((entry) => (
                  <tr
                    key={entry.driver}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3">
                      <span className={`position-badge ${
                        entry.position === 1 ? "p1" : entry.position === 2 ? "p2" : entry.position === 3 ? "p3" : entry.position <= 10 ? "points" : "no-points"
                      }`}>
                        {entry.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: "var(--text)" }}>{entry.driver}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>{entry.driverFullName}</span>
                    </td>
                    <td className="px-1 py-3">
                      <div className="w-1 h-6 rounded" style={{ backgroundColor: entry.teamColor }} />
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{entry.team}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--text)" }}>{entry.predictedTime}s</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--text-muted)" }}>{formatGap(entry.gap)}</td>
                    <td className="px-4 py-3">
                      {entry.points > 0 ? (
                        <span className="font-bold text-f1-red">{entry.points}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ═══ Analysis Tab ═══ */}
      {activeTab === "analysis" && (
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Circuit Info */}
          <div className="card p-6 sm:p-8">
            <h3 className="section-heading">🏟️ Circuit Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
              {[
                { label: "Circuit Type", value: data.circuitInfo.type },
                { label: "Laps", value: data.circuitInfo.laps },
                { label: "Length", value: `${data.circuitInfo.circuitKm} km` },
                { label: "Pit Stops", value: data.circuitInfo.expectedStops },
                { label: "DRS Zones", value: data.circuitInfo.drsZones || 2 },
                { label: "Tyre Deg", value: `${Math.round(data.circuitInfo.tyreDeg * 100)}%`, bar: data.circuitInfo.tyreDeg, barColor: data.circuitInfo.tyreDeg > 0.5 ? "#E8002D" : "#22C55E" },
                { label: "Overtaking", value: `${Math.round(data.circuitInfo.overtaking * 100)}%`, bar: data.circuitInfo.overtaking, barColor: "#3B82F6" },
                { label: "Safety Car", value: `${Math.round((data.circuitInfo.safetyCarLikelihood || 0.4) * 100)}%`, bar: data.circuitInfo.safetyCarLikelihood || 0.4, barColor: (data.circuitInfo.safetyCarLikelihood || 0.4) > 0.6 ? "#FF8000" : "#22C55E" },
                { label: "Altitude", value: `${data.circuitInfo.altitudeM || 0} m` },
                ...(data.sprint ? [{ label: "Sprint Laps", value: data.sprintLaps || 0 }] : []),
              ].map((item) => (
                <div key={item.label} className="metric-card">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                  <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{item.value}</p>
                  {"bar" in item && item.bar !== undefined && (
                    <div className="progress-bar mt-2">
                      <div className="progress-bar-fill" style={{ width: `${item.bar * 100}%`, background: item.barColor }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Model Metrics */}
          <div className="card p-6">
            <h3 className="section-heading">🤖 Model Performance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="metric-card">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>R² Score</p>
                <p className="text-2xl font-black" style={{ color: data.metrics.r2Score > 0.9 ? "#22C55E" : "var(--text)" }}>
                  {data.metrics.r2Score.toFixed(3)}
                </p>
              </div>
              <div className="metric-card">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Mean Abs. Error</p>
                <p className="text-2xl font-black" style={{ color: "var(--text)" }}>{data.metrics.mae.toFixed(3)}s</p>
              </div>
              <div className="metric-card">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Max Spread</p>
                <p className="text-2xl font-black" style={{ color: "var(--text)" }}>{data.metrics.maxSpread.toFixed(2)}s</p>
              </div>
              <div className="metric-card">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Training Data</p>
                <p className="text-2xl font-black" style={{ color: "var(--text)" }}>{data.metrics.trainingYears.join(", ")}</p>
              </div>
            </div>
          </div>

          {/* Feature Importance */}
          <div className="card p-6">
            <h3 className="section-heading">📊 Feature Importance</h3>
            <div className="space-y-3">
              {data.featureImportance.slice(0, 9).map((f, i) => {
                const pct = Math.round(f.importance * 100 * 10) / 10;
                return (
                  <motion.div
                    key={f.feature}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="w-40 sm:w-52 text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {f.feature}
                    </div>
                    <div className="flex-1 progress-bar h-3">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 50 ? "#E8002D" : pct > 10 ? "#FF8000" : "#3B82F6" }} />
                    </div>
                    <span className="text-sm font-mono w-14 text-right" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ Strategy Tab ═══ */}
      {activeTab === "strategy" && (
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Pit Strategy */}
          {strategyData ? (
            <div className="card p-6 sm:p-8">
              <h3 className="section-heading">⛽ Pit Strategy Comparison</h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                Monte-Carlo simulation of {data.circuitInfo.laps} laps with different pit strategies
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {Object.entries(strategyData).map(([name, d]: [string, any]) => {
                  const isOptimal = Object.values(strategyData).every(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (o: any) => d.meanTime <= o.meanTime
                  );
                  return (
                    <div
                      key={name}
                      className="metric-card relative"
                      style={isOptimal ? { border: "1px solid rgba(34, 197, 94, 0.3)" } : {}}
                    >
                      {isOptimal && (
                        <span className="absolute -top-2 left-3 px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22C55E" }}>
                          OPTIMAL
                        </span>
                      )}
                      <p className="font-bold text-sm mb-2" style={{ color: "var(--text)" }}>{name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.numStops} stop{d.numStops !== 1 ? "s" : ""}
                      </p>
                      <p className="text-lg font-black mt-2" style={{ color: "var(--text)" }}>
                        {(d.meanTime / 60).toFixed(1)} min
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ±{d.stdTime.toFixed(1)}s variance
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-4">⛽</div>
              <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>Pit Strategy Data</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Run the pipeline with <code className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>--advanced</code> to generate Monte-Carlo strategy simulation data
              </p>
            </div>
          )}

          {/* Tyre Degradation */}
          {tyreDegData ? (
            <div className="card p-6">
              <h3 className="section-heading">🔴 Tyre Degradation Analysis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {Object.entries(tyreDegData).map(([compound, d]: [string, any]) => {
                  const compoundColors: Record<string, string> = {
                    SOFT: "#E8002D", MEDIUM: "#FFD700", HARD: "#FFFFFF",
                  };
                  return (
                    <div key={compound} className="metric-card">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: compoundColors[compound] || "#888" }} />
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{compound}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-muted)" }}>Deg Rate</span>
                          <span className="font-mono" style={{ color: "var(--text)" }}>{d.degRate.toFixed(3)}s/lap</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-muted)" }}>Cliff Lap</span>
                          <span className="font-mono" style={{ color: "var(--text)" }}>Lap {d.cliffLap}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-muted)" }}>Pace Offset</span>
                          <span className="font-mono" style={{ color: d.paceOffset < 0 ? "#22C55E" : "#E8002D" }}>
                            {d.paceOffset > 0 ? "+" : ""}{d.paceOffset.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-4">🔴</div>
              <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>Tyre Degradation Data</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Tyre degradation curves will be available after running the pipeline with advanced models
              </p>
            </div>
          )}

          {/* Strategy Visualizations */}
          {advancedViz.filter(f => !failedImages.has(f)).length > 0 && (
            <div className="card p-6">
              <h3 className="section-heading">📈 Strategy Visualizations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advancedViz.filter(f => !failedImages.has(f)).map((filename) => {
                  const src = getVisualizationPath(round, filename);
                  const title = filename.replace(/_/g, " ").replace(".png", "");
                  return (
                    <div key={filename} className="cursor-pointer" onClick={() => setLightboxImg(src)}>
                      <img src={src} alt={title} className="viz-image w-full" onError={() => handleImageError(filename)} />
                      <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>{title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ Visualizations Tab ═══ */}
      {activeTab === "visualizations" && (() => {
        const loadableViz = vizFiles.filter(f => !failedImages.has(f));
        const allFailed = vizFiles.length > 0 && loadableViz.length === 0;
        const hasViz = loadableViz.length > 0;
        const loadableMl = mlViz.filter(f => !failedImages.has(f));
        const loadableFastf1 = fastf1Viz.filter(f => !failedImages.has(f));
        const loadableAdvanced = advancedViz.filter(f => !failedImages.has(f));

        return (
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {hasViz ? (
            <>
              {/* ML Predictions */}
              {loadableMl.length > 0 && (
                <div>
                  <h3 className="section-heading">🤖 Model Predictions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {loadableMl.map((filename) => {
                      const src = getVisualizationPath(round, filename);
                      const title = filename.replace(/_/g, " ").replace(".png", "");
                      return (
                        <div key={filename} className="card p-3 cursor-pointer group" onClick={() => setLightboxImg(src)}>
                          <img src={src} alt={title} className="viz-image w-full" onError={() => handleImageError(filename)} />
                          <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                            {title}
                            <span className="ml-2 text-f1-red opacity-0 group-hover:opacity-100 transition-opacity">Click to enlarge</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FastF1 Historical */}
              {loadableFastf1.length > 0 && (
                <div>
                  <h3 className="section-heading">🏎️ FastF1 Historical Data</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {loadableFastf1.map((filename) => {
                      const src = getVisualizationPath(round, filename);
                      const title = filename.replace(/_/g, " ").replace(".png", "");
                      return (
                        <div key={filename} className="card p-3 cursor-pointer group" onClick={() => setLightboxImg(src)}>
                          <img src={src} alt={title} className="viz-image w-full" onError={() => handleImageError(filename)} />
                          <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                            {title}
                            <span className="ml-2 text-f1-red opacity-0 group-hover:opacity-100 transition-opacity">Click to enlarge</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Strategy */}
              {loadableAdvanced.length > 0 && (
                <div>
                  <h3 className="section-heading">⛽ Strategy Analysis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {loadableAdvanced.map((filename) => {
                      const src = getVisualizationPath(round, filename);
                      const title = filename.replace(/_/g, " ").replace(".png", "");
                      return (
                        <div key={filename} className="card p-3 cursor-pointer group" onClick={() => setLightboxImg(src)}>
                          <img src={src} alt={title} className="viz-image w-full" onError={() => handleImageError(filename)} />
                          <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                            {title}
                            <span className="ml-2 text-f1-red opacity-0 group-hover:opacity-100 transition-opacity">Click to enlarge</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state - either no viz defined or all images failed to load */
            <div>
              <div className="card p-8 text-center mb-8">
                <div className="text-5xl mb-4">📈</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
                  {allFailed ? "Visualization Images Not Found" : "Visualizations Not Yet Generated"}
                </h3>
                <p className="text-sm max-w-lg mx-auto mb-4" style={{ color: "var(--text-muted)" }}>
                  {allFailed
                    ? "The visualization images referenced by this round haven't been generated yet. Run the data pipeline to create them."
                    : "Run the data pipeline to generate up to 10+ visualizations for this round including ML predictions, FastF1 telemetry, and strategy analysis."
                  }
                </p>
                <div className="inline-block px-4 py-2 rounded-lg text-sm font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  python export_website_data.py --round {round} --fastf1 --advanced
                </div>
              </div>

              {/* Show what visualizations would be available */}
              {VIZ_CATEGORIES.map((cat) => (
                <div key={cat.id} className="mb-8">
                  <h3 className="section-heading">{cat.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.items.map((item) => (
                      <div key={item.key} className="viz-placeholder">
                        <div className="w-full h-32 rounded-lg mb-3 flex items-center justify-center" style={{ background: "var(--bg-surface)" }}>
                          <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>{item.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
        );
      })()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-16 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
        {round > 1 ? (
          <Link href={`/race/${round - 1}`} className="group text-f1-red hover:text-f1-accent font-medium transition-colors inline-flex items-center gap-1">
            <span className="inline-block transition-transform group-hover:-translate-x-1">←</span>
            Previous Round
          </Link>
        ) : (
          <Link href="/calendar" className="group font-medium transition-colors inline-flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <span className="inline-block transition-transform group-hover:-translate-x-1">←</span>
            Calendar
          </Link>
        )}
        {round < 24 && (
          <Link href={`/race/${round + 1}`} className="group text-f1-red hover:text-f1-accent font-medium transition-colors inline-flex items-center gap-1">
            Next Round
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
