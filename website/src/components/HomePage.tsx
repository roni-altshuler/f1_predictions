"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SeasonData, StandingsData, RoundData, COUNTRY_FLAGS } from "@/types";
import { fetchSeasonData, fetchStandingsData, fetchRoundData, formatDate } from "@/lib/data";

export default function HomePage() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [standings, setStandings] = useState<StandingsData | null>(null);
  const [latestRace, setLatestRace] = useState<RoundData | null>(null);

  useEffect(() => {
    fetchSeasonData().then(setSeason).catch(console.error);
    fetchStandingsData()
      .then((s) => {
        setStandings(s);
        if (s.lastUpdatedRound > 0) {
          fetchRoundData(s.lastUpdatedRound).then(setLatestRace).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  if (!season) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="loading-pulse text-lg" style={{ color: "var(--text-muted)" }}>
          Loading season data...
        </div>
      </div>
    );
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ── Hero ── */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-f1-red/10 text-f1-red text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
            2026 Season
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 tracking-tight" style={{ color: "var(--text)" }}>
            Formula 1 Predictions
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8" style={{ color: "var(--text-muted)" }}>
            Machine learning-powered race predictions for every Grand Prix.
            Built with ensemble models, LSTM forecasting, and FastF1 telemetry.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/calendar" className="px-6 py-3 bg-f1-red hover:bg-f1-red-dark text-white font-semibold rounded-xl transition-colors">
              View All Races
            </Link>
            <Link
              href="/standings"
              className="px-6 py-3 font-semibold rounded-xl border transition-colors"
              style={{ background: "var(--bg-card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Championship Standings
            </Link>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { value: season.totalRounds, label: "Grand Prix" },
            { value: season.drivers.length, label: "Drivers" },
            { value: season.teams.length, label: "Constructors" },
            { value: season.completedRounds.length, label: "Predicted" },
          ].map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-3xl font-black" style={{ color: "var(--text)" }}>{s.value}</p>
              <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── Latest Race ── */}
        {latestRace && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Latest Prediction</h2>
              <Link href={`/race/${latestRace.round}`} className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors">
                Full Details →
              </Link>
            </div>
            <div className="card overflow-hidden card-glow">
              <div className="p-6 sm:p-8 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{COUNTRY_FLAGS[latestRace.gpKey] || "🏁"}</span>
                  <h3 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
                    {latestRace.name}
                  </h3>
                </div>
                <p style={{ color: "var(--text-muted)" }}>
                  Round {latestRace.round} • {latestRace.circuit} • {formatDate(latestRace.date)}
                </p>
              </div>

              {/* Podium */}
              <div className="grid grid-cols-3">
                {latestRace.classification.slice(0, 3).map((entry, i) => (
                  <div key={entry.driver} className="p-6 text-center border-r last:border-r-0" style={{ borderColor: "var(--border)" }}>
                    <div className={`text-3xl font-black mb-2 ${i === 0 ? "podium-1" : i === 1 ? "podium-2" : "podium-3"}`}>
                      P{entry.position}
                    </div>
                    <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: entry.teamColor }} />
                    <p className="font-bold text-lg" style={{ color: "var(--text)" }}>{entry.driver}</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.driverFullName}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.team}</p>
                    <p className="text-f1-red font-bold mt-2">+{entry.points} pts</p>
                  </div>
                ))}
              </div>

              {/* P4-P10 */}
              <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="grid gap-2">
                  {latestRace.classification.slice(3, 10).map((entry) => (
                    <div
                      key={entry.driver}
                      className="flex items-center gap-4 py-2 px-3 rounded-lg transition-colors cursor-default"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className={`position-badge ${entry.position <= 10 ? "points" : "no-points"}`}>
                        {entry.position}
                      </span>
                      <div className="team-color-bar h-8" style={{ backgroundColor: entry.teamColor }} />
                      <div className="flex-1">
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{entry.driver}</span>
                        <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>{entry.team}</span>
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {entry.gap === "LEADER" ? "—" : `+${entry.gap}s`}
                      </span>
                      {entry.points > 0 && (
                        <span className="text-f1-red text-sm font-medium">+{entry.points}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Calendar Preview ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Season Calendar</h2>
            <Link href="/calendar" className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors">
              All {season.totalRounds} races →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {season.calendar.slice(0, 6).map((race) => {
              const hasData = season.completedRounds.includes(race.round);
              return (
                <Link key={race.round} href={hasData ? `/race/${race.round}` : "/calendar"} className="card p-5 group transition-all hover:border-f1-red/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Round {race.round}</span>
                    {hasData ? (
                      <span className="px-2 py-0.5 rounded-full bg-f1-green/10 text-f1-green text-xs font-medium">Predicted</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>Upcoming</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{COUNTRY_FLAGS[race.country] || "🏁"}</span>
                    <h3 className="font-bold group-hover:text-f1-red transition-colors" style={{ color: "var(--text)" }}>{race.name}</h3>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{race.circuit} • {formatDate(race.date)}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Championships ── */}
        {standings && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            <div className="card p-6 card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Drivers Championship</h2>
                <Link href="/standings?tab=drivers" className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors">Full Standings →</Link>
              </div>
              <div className="space-y-3">
                {standings.drivers.slice(0, 5).map((d) => (
                  <div key={d.driver} className="flex items-center gap-3">
                    <span className={`position-badge ${d.position === 1 ? "p1" : d.position === 2 ? "p2" : d.position === 3 ? "p3" : "points"}`}>{d.position}</span>
                    <div className="team-color-bar h-10" style={{ backgroundColor: d.teamColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{d.driverFullName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{d.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: "var(--text)" }}>{d.points}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6 card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Constructors Championship</h2>
                <Link href="/standings?tab=constructors" className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors">Full Standings →</Link>
              </div>
              <div className="space-y-3">
                {standings.constructors.slice(0, 5).map((c) => (
                  <div key={c.team} className="flex items-center gap-3">
                    <span className={`position-badge ${c.position === 1 ? "p1" : c.position === 2 ? "p2" : c.position === 3 ? "p3" : "points"}`}>{c.position}</span>
                    <div className="team-color-bar h-10" style={{ backgroundColor: c.teamColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{c.team}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{c.drivers.join(" • ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: "var(--text)" }}>{c.points}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Model Overview ── */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>About the Model</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🤖", title: "Ensemble ML + LSTM", desc: "Blends XGBoost, GradientBoosting, and LSTM neural network with StandardScaler normalization and prediction calibration (max 3.5s spread)." },
              { icon: "📊", title: "9 Balanced Features", desc: "TeamPerformance, AdjustedPace, CleanAirPace, PitTimeLoss, TyreDegFactor, Experience, CurrentForm, Rain, Temperature." },
              { icon: "🏎️", title: "FastF1 Telemetry", desc: "Trained on 2023–2025 historical race data. Monte-Carlo pit strategy simulation, compound-specific degradation curves, and team-change adjustments." },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="font-bold mb-2" style={{ color: "var(--text)" }}>{item.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
