"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RoundData, COUNTRY_FLAGS } from "@/types";
import { fetchRoundData, formatDate, getVisualizationPath } from "@/lib/data";

interface Props {
  round: number;
}

export default function RaceDetailPage({ round }: Props) {
  const [data, setData] = useState<RoundData | null>(null);
  const [error, setError] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    fetchRoundData(round)
      .then(setData)
      .catch(() => setError(true));
  }, [round]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-f1-text-muted text-lg">
          No prediction data available for Round {round} yet.
        </p>
        <Link
          href="/calendar"
          className="text-f1-red hover:text-f1-accent font-medium transition-colors"
        >
          ← Back to Calendar
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-f1-text-muted loading-pulse text-lg">Loading race data...</div>
      </div>
    );
  }

  const flag = COUNTRY_FLAGS[data.gpKey] || "🏁";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Visualization"
            className="max-w-full max-h-[90vh] rounded-xl"
          />
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl"
            onClick={() => setLightboxImg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Back navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/calendar"
          className="text-f1-text-muted hover:text-f1-text transition-colors text-sm"
        >
          ← Calendar
        </Link>
        {round > 1 && (
          <Link
            href={`/race/${round - 1}`}
            className="text-f1-text-muted hover:text-f1-text transition-colors text-sm"
          >
            ← Previous
          </Link>
        )}
        {round < 24 && (
          <Link
            href={`/race/${round + 1}`}
            className="text-f1-text-muted hover:text-f1-text transition-colors text-sm ml-auto"
          >
            Next →
          </Link>
        )}
      </div>

      {/* Race Header */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl">{flag}</span>
          <div>
            <p className="text-sm text-f1-text-muted font-medium uppercase tracking-wider">
              Round {data.round}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-f1-text">
              {data.name}
            </h1>
          </div>
        </div>
        <p className="text-f1-text-muted mt-2">
          {data.circuit} • {formatDate(data.date)}
        </p>
      </section>

      {/* Podium */}
      <section className="mb-10">
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {/* P2 */}
          <div className="flex flex-col items-center mt-8">
            <div className="bg-f1-card rounded-2xl border border-f1-border p-5 w-full text-center card-glow">
              <div className="text-3xl font-black podium-2 mb-1">P2</div>
              <div
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: data.classification[1]?.teamColor }}
              />
              <p className="font-bold text-f1-text text-lg">{data.classification[1]?.driver}</p>
              <p className="text-xs text-f1-text-muted">{data.classification[1]?.driverFullName}</p>
              <p className="text-xs text-f1-text-muted mt-1">{data.classification[1]?.team}</p>
              <p className="text-f1-silver font-bold text-sm mt-2">+{data.classification[1]?.points} pts</p>
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-f1-card to-f1-card/50 rounded-b-xl border-x border-b border-f1-border" />
          </div>

          {/* P1 */}
          <div className="flex flex-col items-center">
            <div className="bg-f1-card rounded-2xl border border-f1-red/30 p-5 w-full text-center card-glow relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-f1-red/5 to-transparent" />
              <div className="relative">
                <div className="text-4xl font-black podium-1 mb-1">P1</div>
                <div
                  className="w-4 h-4 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: data.classification[0]?.teamColor }}
                />
                <p className="font-bold text-f1-text text-xl">{data.classification[0]?.driver}</p>
                <p className="text-xs text-f1-text-muted">{data.classification[0]?.driverFullName}</p>
                <p className="text-xs text-f1-text-muted mt-1">{data.classification[0]?.team}</p>
                <p className="text-f1-gold font-bold mt-2">+{data.classification[0]?.points} pts</p>
              </div>
            </div>
            <div className="w-full h-32 bg-gradient-to-t from-f1-card to-f1-card/50 rounded-b-xl border-x border-b border-f1-border" />
          </div>

          {/* P3 */}
          <div className="flex flex-col items-center mt-12">
            <div className="bg-f1-card rounded-2xl border border-f1-border p-5 w-full text-center card-glow">
              <div className="text-3xl font-black podium-3 mb-1">P3</div>
              <div
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: data.classification[2]?.teamColor }}
              />
              <p className="font-bold text-f1-text text-lg">{data.classification[2]?.driver}</p>
              <p className="text-xs text-f1-text-muted">{data.classification[2]?.driverFullName}</p>
              <p className="text-xs text-f1-text-muted mt-1">{data.classification[2]?.team}</p>
              <p className="text-f1-bronze font-bold text-sm mt-2">+{data.classification[2]?.points} pts</p>
            </div>
            <div className="w-full h-16 bg-gradient-to-t from-f1-card to-f1-card/50 rounded-b-xl border-x border-b border-f1-border" />
          </div>
        </div>
      </section>

      {/* Full Classification */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-f1-text mb-4">Predicted Classification</h2>
        <div className="bg-f1-card rounded-2xl border border-f1-border overflow-hidden card-glow">
          {/* Header */}
          <div className="grid grid-cols-[3rem_4px_1fr_8rem_6rem_5rem] gap-3 px-5 py-3 border-b border-f1-border text-xs font-bold text-f1-text-muted uppercase tracking-wider">
            <div>Pos</div>
            <div />
            <div>Driver</div>
            <div className="text-right">Predicted Time</div>
            <div className="text-right">Gap</div>
            <div className="text-right">Points</div>
          </div>

          {/* Rows */}
          {data.classification.map((entry) => (
            <div
              key={entry.driver}
              className={`grid grid-cols-[3rem_4px_1fr_8rem_6rem_5rem] gap-3 px-5 py-3.5 items-center border-b border-f1-border/50 hover:bg-f1-card-hover transition-colors ${
                entry.position <= 3 ? "bg-f1-bg/30" : ""
              }`}
            >
              <span
                className={`position-badge ${
                  entry.position === 1
                    ? "p1"
                    : entry.position === 2
                    ? "p2"
                    : entry.position === 3
                    ? "p3"
                    : entry.points > 0
                    ? "points"
                    : "no-points"
                }`}
              >
                {entry.position}
              </span>
              <div
                className="team-color-bar"
                style={{ backgroundColor: entry.teamColor }}
              />
              <div>
                <span className="font-bold text-f1-text">{entry.driver}</span>
                <span className="text-f1-text-muted ml-2 text-sm hidden sm:inline">
                  {entry.driverFullName}
                </span>
                <p className="text-xs text-f1-text-muted sm:hidden">{entry.team}</p>
                <span className="text-f1-text-muted ml-2 text-xs hidden sm:inline">
                  · {entry.team}
                </span>
              </div>
              <div className="text-right font-mono text-sm text-f1-text">
                {entry.predictedTime.toFixed(3)}s
              </div>
              <div className="text-right text-sm text-f1-text-muted">
                {entry.gap === "LEADER" ? "—" : `+${entry.gap}s`}
              </div>
              <div className="text-right">
                {entry.points > 0 ? (
                  <span className="text-f1-red font-bold">{entry.points}</span>
                ) : (
                  <span className="text-f1-text-muted">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Circuit Info + Model Metrics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Circuit Info */}
        <div className="bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
          <h2 className="text-lg font-bold text-f1-text mb-4">Circuit Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Circuit Type", value: data.circuitInfo.type, capitalize: true },
              { label: "Laps", value: data.circuitInfo.laps },
              { label: "Circuit Length", value: `${data.circuitInfo.circuitKm} km` },
              { label: "Expected Pit Stops", value: data.circuitInfo.expectedStops },
            ].map((item) => (
              <div key={item.label} className="bg-f1-bg/50 rounded-lg p-3">
                <p className="text-xs text-f1-text-muted">{item.label}</p>
                <p className={`font-bold text-f1-text ${item.capitalize ? "capitalize" : ""}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-f1-text-muted mb-1">
                <span>Tyre Degradation</span>
                <span>{(data.circuitInfo.tyreDeg * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-f1-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-f1-red/70 to-f1-red"
                  style={{ width: `${data.circuitInfo.tyreDeg * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-f1-text-muted mb-1">
                <span>Overtaking Opportunity</span>
                <span>{(data.circuitInfo.overtaking * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-f1-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-f1-green/70 to-f1-green"
                  style={{ width: `${data.circuitInfo.overtaking * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Model Metrics */}
        <div className="bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
          <h2 className="text-lg font-bold text-f1-text mb-4">Model Performance</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-f1-bg/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-f1-green">{data.metrics.r2Score.toFixed(3)}</p>
              <p className="text-xs text-f1-text-muted">R² Score</p>
            </div>
            <div className="bg-f1-bg/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-f1-text">{data.metrics.mae.toFixed(3)}s</p>
              <p className="text-xs text-f1-text-muted">Mean Abs. Error</p>
            </div>
            <div className="bg-f1-bg/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-f1-text">{data.metrics.maxSpread.toFixed(2)}s</p>
              <p className="text-xs text-f1-text-muted">Max Spread</p>
            </div>
            <div className="bg-f1-bg/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-f1-text">{data.metrics.trainingYears.join(", ")}</p>
              <p className="text-xs text-f1-text-muted">Training Data</p>
            </div>
          </div>

          {/* Feature Importance */}
          <h3 className="text-sm font-bold text-f1-text mb-3">Feature Importance</h3>
          <div className="space-y-2">
            {data.featureImportance.slice(0, 6).map((f) => (
              <div key={f.feature}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-f1-text-muted">{f.feature}</span>
                  <span className="text-f1-text font-medium">
                    {(f.importance * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-f1-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-f1-red"
                    style={{ width: `${f.importance * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visualizations */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-f1-text mb-6">Visualizations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.visualizations.map((viz) => {
            const src = getVisualizationPath(data.round, viz);
            const title = viz
              .replace(".png", "")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
            return (
              <div key={viz} className="relative group">
                <h3 className="text-sm font-semibold text-f1-text-muted mb-2">{title}</h3>
                <img
                  src={src}
                  alt={title}
                  className="viz-image w-full"
                  onClick={() => setLightboxImg(src)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 mt-6 rounded-xl bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    Click to enlarge
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Navigation */}
      <section className="flex items-center justify-between pt-6 border-t border-f1-border">
        {round > 1 ? (
          <Link
            href={`/race/${round - 1}`}
            className="px-5 py-2.5 bg-f1-card hover:bg-f1-card-hover border border-f1-border rounded-xl text-f1-text font-medium transition-colors"
          >
            ← Previous Round
          </Link>
        ) : (
          <div />
        )}
        <Link
          href="/calendar"
          className="text-f1-text-muted hover:text-f1-text text-sm font-medium transition-colors"
        >
          Calendar
        </Link>
        {round < 24 ? (
          <Link
            href={`/race/${round + 1}`}
            className="px-5 py-2.5 bg-f1-card hover:bg-f1-card-hover border border-f1-border rounded-xl text-f1-text font-medium transition-colors"
          >
            Next Round →
          </Link>
        ) : (
          <div />
        )}
      </section>
    </div>
  );
}
