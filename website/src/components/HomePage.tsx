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
    fetchStandingsData().then((s) => {
      setStandings(s);
      if (s.lastUpdatedRound > 0) {
        fetchRoundData(s.lastUpdatedRound).then(setLatestRace).catch(console.error);
      }
    }).catch(console.error);
  }, []);

  if (!season) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-f1-text-muted loading-pulse text-lg">Loading season data...</div>
      </div>
    );
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-f1-red/10 text-f1-red text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
            2026 Season
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-f1-text mb-4 tracking-tight">
            Formula 1 Predictions
          </h1>
          <p className="text-lg sm:text-xl text-f1-text-muted max-w-2xl mx-auto mb-8">
            Machine learning-powered race predictions for every Grand Prix.
            Built with XGBoost, GradientBoosting, and FastF1 data.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/calendar"
              className="px-6 py-3 bg-f1-red hover:bg-f1-red-dark text-white font-semibold rounded-xl transition-colors"
            >
              View All Races
            </Link>
            <Link
              href="/standings"
              className="px-6 py-3 bg-f1-card hover:bg-f1-card-hover text-f1-text font-semibold rounded-xl border border-f1-border transition-colors"
            >
              Championship Standings
            </Link>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Grand Prix", value: season.totalRounds, suffix: "races" },
            { label: "Drivers", value: season.drivers.length, suffix: "on grid" },
            { label: "Teams", value: season.teams.length, suffix: "constructors" },
            { label: "Predictions", value: season.completedRounds.length, suffix: "completed" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-f1-card rounded-xl p-5 border border-f1-border text-center card-glow"
            >
              <p className="text-3xl font-black text-f1-text">{stat.value}</p>
              <p className="text-xs text-f1-text-muted mt-1 uppercase tracking-wider">
                {stat.suffix}
              </p>
            </div>
          ))}
        </section>

        {/* Latest Race Result */}
        {latestRace && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-f1-text">Latest Prediction</h2>
              <Link
                href={`/race/${latestRace.round}`}
                className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors"
              >
                Full Details →
              </Link>
            </div>
            <div className="bg-f1-card rounded-2xl border border-f1-border overflow-hidden card-glow">
              <div className="p-6 sm:p-8 border-b border-f1-border">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{COUNTRY_FLAGS[latestRace.gpKey] || "🏁"}</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-f1-text">
                    {latestRace.name}
                  </h3>
                </div>
                <p className="text-f1-text-muted">
                  Round {latestRace.round} • {latestRace.circuit} • {formatDate(latestRace.date)}
                </p>
              </div>

              {/* Podium */}
              <div className="grid grid-cols-3 divide-x divide-f1-border">
                {latestRace.classification.slice(0, 3).map((entry, i) => (
                  <div key={entry.driver} className="p-6 text-center">
                    <div className={`text-3xl font-black mb-2 ${i === 0 ? "podium-1" : i === 1 ? "podium-2" : "podium-3"}`}>
                      P{entry.position}
                    </div>
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: entry.teamColor }}
                    />
                    <p className="font-bold text-f1-text text-lg">{entry.driver}</p>
                    <p className="text-sm text-f1-text-muted">{entry.driverFullName}</p>
                    <p className="text-xs text-f1-text-muted mt-1">{entry.team}</p>
                    <p className="text-f1-red font-bold mt-2">+{entry.points} pts</p>
                  </div>
                ))}
              </div>

              {/* Quick Classification */}
              <div className="p-6 border-t border-f1-border">
                <div className="grid gap-2">
                  {latestRace.classification.slice(3, 10).map((entry) => (
                    <div
                      key={entry.driver}
                      className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-f1-card-hover transition-colors"
                    >
                      <span className={`position-badge ${entry.position <= 10 ? "points" : "no-points"}`}>
                        {entry.position}
                      </span>
                      <div
                        className="team-color-bar h-8"
                        style={{ backgroundColor: entry.teamColor }}
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-f1-text">{entry.driver}</span>
                        <span className="text-f1-text-muted ml-2 text-sm">{entry.team}</span>
                      </div>
                      <span className="text-f1-text-muted text-sm">
                        {entry.gap === "LEADER" ? "—" : `+${entry.gap}s`}
                      </span>
                      {entry.points > 0 && (
                        <span className="text-f1-red text-sm font-medium">
                          +{entry.points}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Races */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-f1-text mb-6">Season Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {season.calendar.slice(0, 6).map((race) => {
              const hasData = season.completedRounds.includes(race.round);
              return (
                <Link
                  key={race.round}
                  href={hasData ? `/race/${race.round}` : `/calendar`}
                  className="bg-f1-card rounded-xl p-5 border border-f1-border hover:border-f1-red/30 transition-all card-glow group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-f1-text-muted uppercase tracking-wider">
                      Round {race.round}
                    </span>
                    {hasData ? (
                      <span className="px-2 py-0.5 rounded-full bg-f1-green/10 text-f1-green text-xs font-medium">
                        Predicted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-f1-text-muted/10 text-f1-text-muted text-xs font-medium">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{COUNTRY_FLAGS[race.gpKey] || "🏁"}</span>
                    <h3 className="font-bold text-f1-text group-hover:text-f1-red transition-colors">
                      {race.name}
                    </h3>
                  </div>
                  <p className="text-sm text-f1-text-muted">
                    {race.circuit} • {formatDate(race.date)}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/calendar"
              className="text-f1-red hover:text-f1-accent font-medium transition-colors"
            >
              View all {season.totalRounds} races →
            </Link>
          </div>
        </section>

        {/* Championship Leaders */}
        {standings && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            {/* Driver Championship */}
            <div className="bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-f1-text">Drivers Championship</h2>
                <Link
                  href="/standings"
                  className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors"
                >
                  Full Standings →
                </Link>
              </div>
              <div className="space-y-3">
                {standings.drivers.slice(0, 5).map((d) => (
                  <div key={d.driver} className="flex items-center gap-3">
                    <span className={`position-badge ${
                      d.position === 1 ? "p1" : d.position === 2 ? "p2" : d.position === 3 ? "p3" : "points"
                    }`}>
                      {d.position}
                    </span>
                    <div
                      className="team-color-bar h-10"
                      style={{ backgroundColor: d.teamColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-f1-text truncate">{d.driverFullName}</p>
                      <p className="text-xs text-f1-text-muted">{d.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-f1-text">{d.points}</p>
                      <p className="text-xs text-f1-text-muted">PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Constructor Championship */}
            <div className="bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-f1-text">Constructors Championship</h2>
                <Link
                  href="/standings"
                  className="text-f1-red hover:text-f1-accent text-sm font-medium transition-colors"
                >
                  Full Standings →
                </Link>
              </div>
              <div className="space-y-3">
                {standings.constructors.slice(0, 5).map((c) => (
                  <div key={c.team} className="flex items-center gap-3">
                    <span className={`position-badge ${
                      c.position === 1 ? "p1" : c.position === 2 ? "p2" : c.position === 3 ? "p3" : "points"
                    }`}>
                      {c.position}
                    </span>
                    <div
                      className="team-color-bar h-10"
                      style={{ backgroundColor: c.teamColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-f1-text truncate">{c.team}</p>
                      <p className="text-xs text-f1-text-muted">
                        {c.drivers.join(" • ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-f1-text">{c.points}</p>
                      <p className="text-xs text-f1-text-muted">PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Model Info */}
        <section className="bg-f1-card rounded-2xl border border-f1-border p-8 card-glow">
          <h2 className="text-xl font-bold text-f1-text mb-4">About the Model</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-f1-red mb-2">Ensemble ML</h3>
              <p className="text-f1-text-muted">
                Blends XGBoost and GradientBoosting regressors with StandardScaler 
                normalization and prediction calibration (max 3.5s spread).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-f1-red mb-2">9 Balanced Features</h3>
              <p className="text-f1-text-muted">
                TeamPerformanceScore, TeamAdjustedPace, CleanAirPace, CurrentForm, 
                ExperienceFactor, PitTimeLoss, TyreDegFactor, RainProbability, Temperature.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-f1-red mb-2">FastF1 Data</h3>
              <p className="text-f1-text-muted">
                Trained on 2023-2025 historical qualifying and race data 
                via the FastF1 API. Team-change adjustments for 2026 grid moves.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
