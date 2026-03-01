"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RoundData, SeasonData, COUNTRY_FLAGS } from "@/types";
import { fetchRoundData, fetchSeasonData, getVisualizationPath, formatDate, formatGap } from "@/lib/data";

type Tab = "classification" | "analysis" | "strategy" | "visualizations";

interface Props {
  round: number;
}

export default function RaceDetailPage({ round }: Props) {
  const [data, setData] = useState<RoundData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("classification");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchRoundData(round).then(setData).catch(() => setError(true));
    fetchSeasonData().then(setSeason).catch(() => {});
  }, [round]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black mb-4" style={{ color: "var(--text)" }}>Prediction Not Available</h1>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>Round {round} has not been predicted yet.</p>
        <Link href="/calendar" className="text-f1-red hover:text-f1-accent font-medium">← Back to Calendar</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-f1-red border-t-transparent rounded-full animate-spin" />
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

  // Separate viz categories
  const mlViz = (data.visualizations || []).filter(f =>
    ["predicted_laptimes", "feature_importance", "team_vs_pace", "pace_vs_predicted", "laptime_distribution"].some(k => f.includes(k))
  );
  const advancedViz = (data.visualizations || []).filter(f =>
    ["pit_strategy", "tyre_degradation", "lstm"].some(k => f.includes(k))
  );
  const fastf1Viz = (data.visualizations || []).filter(f =>
    ["track_map", "laptime_distribution_historical", "tyre_strategy"].some(k => f.includes(k))
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strategyData = (data as any).strategyData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tyreDegData = (data as any).tyreDegData;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Visualization" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <motion.div
        className="flex items-center gap-3 mb-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-3xl">{COUNTRY_FLAGS[data.gpKey] || "🏁"}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-f1-red/10 text-f1-red">
              Round {data.round}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text)" }}>{data.name}</h1>
        </div>
      </motion.div>
      <p className="mb-6" style={{ color: "var(--text-muted)" }}>
        {data.circuit} • {formatDate(data.date)}
      </p>

      {/* Podium */}
      <motion.div
        className="card overflow-hidden mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="grid grid-cols-3">
          {data.classification.slice(0, 3).map((entry, i) => (
            <div key={entry.driver} className="p-5 sm:p-8 text-center border-r last:border-r-0" style={{ borderColor: "var(--border)" }}>
              <div className={`text-4xl font-black mb-1 ${i === 0 ? "podium-1" : i === 1 ? "podium-2" : "podium-3"}`}>
                P{entry.position}
              </div>
              <div className="w-12 h-1 rounded mx-auto mb-3" style={{ backgroundColor: entry.teamColor }} />
              <p className="font-black text-lg" style={{ color: "var(--text)" }}>{entry.driver}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.driverFullName}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.team}</p>
              <p className="text-sm font-bold mt-2" style={{ color: "var(--text)" }}>{entry.predictedTime}s</p>
              <p className="text-f1-red font-bold text-sm">+{entry.points} pts</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
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
        <div className="card overflow-hidden">
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
        </div>
      )}

      {/* ═══ Analysis Tab ═══ */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Circuit Info */}
          <div className="card p-6">
            <h3 className="section-heading">🏟️ Circuit Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Circuit Type", value: data.circuitInfo.type },
                { label: "Laps", value: data.circuitInfo.laps },
                { label: "Length", value: `${data.circuitInfo.circuitKm} km` },
                { label: "Pit Stops", value: data.circuitInfo.expectedStops },
                { label: "Tyre Deg", value: `${Math.round(data.circuitInfo.tyreDeg * 100)}%`, bar: data.circuitInfo.tyreDeg, barColor: data.circuitInfo.tyreDeg > 0.5 ? "#E8002D" : "#22C55E" },
                { label: "Overtaking", value: `${Math.round(data.circuitInfo.overtaking * 100)}%`, bar: data.circuitInfo.overtaking, barColor: "#3B82F6" },
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
              {data.featureImportance.slice(0, 9).map((f) => {
                const pct = Math.round(f.importance * 100 * 10) / 10;
                return (
                  <div key={f.feature} className="flex items-center gap-4">
                    <div className="w-40 sm:w-52 text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {f.feature}
                    </div>
                    <div className="flex-1 progress-bar h-3">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 50 ? "#E8002D" : pct > 10 ? "#FF8000" : "#3B82F6" }} />
                    </div>
                    <span className="text-sm font-mono w-14 text-right" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Strategy Tab ═══ */}
      {activeTab === "strategy" && (
        <div className="space-y-6">
          {/* Pit Strategy */}
          {strategyData ? (
            <div className="card p-6">
              <h3 className="section-heading">⛽ Pit Strategy Comparison</h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                Monte-Carlo simulation of {data.circuitInfo.laps} laps with different pit strategies
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(strategyData).map(([name, d]: [string, any]) => {
                  const isOptimal = Object.values(strategyData).every(
                    (o: any) => d.meanTime <= o.meanTime
                  );
                  return (
                    <div
                      key={name}
                      className="metric-card relative"
                      style={isOptimal ? { border: "1px solid #22C55E" } : {}}
                    >
                      {isOptimal && (
                        <span className="absolute -top-2 left-3 px-2 py-0.5 text-xs font-bold rounded-full bg-f1-green/20 text-f1-green">
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
            <div className="card p-8 text-center">
              <p style={{ color: "var(--text-muted)" }}>
                Run the pipeline with <code className="px-2 py-0.5 rounded text-sm" style={{ background: "var(--bg-surface)" }}>--advanced</code> to generate strategy data
              </p>
            </div>
          )}

          {/* Tyre Degradation */}
          {tyreDegData ? (
            <div className="card p-6">
              <h3 className="section-heading">🔴 Tyre Degradation Analysis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="card p-8 text-center">
              <p style={{ color: "var(--text-muted)" }}>
                Tyre degradation data not yet generated
              </p>
            </div>
          )}

          {/* Strategy Visualizations */}
          {advancedViz.length > 0 && (
            <div className="card p-6">
              <h3 className="section-heading">📈 Strategy Visualizations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advancedViz.map((filename) => {
                  const src = getVisualizationPath(round, filename);
                  const title = filename.replace(/_/g, " ").replace(".png", "");
                  return (
                    <div key={filename} className="cursor-pointer" onClick={() => setLightboxImg(src)}>
                      <img src={src} alt={title} className="viz-image w-full" />
                      <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>{title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Visualizations Tab ═══ */}
      {activeTab === "visualizations" && (
        <div className="space-y-8">
          {/* ML Predictions */}
          {mlViz.length > 0 && (
            <div>
              <h3 className="section-heading">🤖 Model Predictions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mlViz.map((filename) => {
                  const src = getVisualizationPath(round, filename);
                  const title = filename.replace(/_/g, " ").replace(".png", "");
                  return (
                    <div key={filename} className="card p-3 cursor-pointer" onClick={() => setLightboxImg(src)}>
                      <img src={src} alt={title} className="viz-image w-full" />
                      <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                        {title}
                        <span className="ml-2 text-f1-red">Click to enlarge</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FastF1 Historical */}
          {fastf1Viz.length > 0 && (
            <div>
              <h3 className="section-heading">🏎️ FastF1 Historical Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fastf1Viz.map((filename) => {
                  const src = getVisualizationPath(round, filename);
                  const title = filename.replace(/_/g, " ").replace(".png", "");
                  return (
                    <div key={filename} className="card p-3 cursor-pointer" onClick={() => setLightboxImg(src)}>
                      <img src={src} alt={title} className="viz-image w-full" />
                      <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                        {title}
                        <span className="ml-2 text-f1-red">Click to enlarge</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced Strategy */}
          {advancedViz.length > 0 && (
            <div>
              <h3 className="section-heading">⛽ Strategy Analysis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advancedViz.map((filename) => {
                  const src = getVisualizationPath(round, filename);
                  const title = filename.replace(/_/g, " ").replace(".png", "");
                  return (
                    <div key={filename} className="card p-3 cursor-pointer" onClick={() => setLightboxImg(src)}>
                      <img src={src} alt={title} className="viz-image w-full" />
                      <p className="text-xs text-center mt-2 capitalize" style={{ color: "var(--text-muted)" }}>
                        {title}
                        <span className="ml-2 text-f1-red">Click to enlarge</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(data.visualizations || []).length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-lg" style={{ color: "var(--text-muted)" }}>No visualizations generated for this round yet</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
        {round > 1 ? (
          <Link href={`/race/${round - 1}`} className="text-f1-red hover:text-f1-accent font-medium transition-colors">← Previous Round</Link>
        ) : (
          <Link href="/calendar" className="font-medium transition-colors" style={{ color: "var(--text-muted)" }}>← Calendar</Link>
        )}
        {round < 24 && (
          <Link href={`/race/${round + 1}`} className="text-f1-red hover:text-f1-accent font-medium transition-colors">Next Round →</Link>
        )}
      </div>
    </div>
  );
}
