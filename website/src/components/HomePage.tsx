"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SeasonData, StandingsData, RoundData } from "@/types";
import CountryFlag from "@/components/CountryFlag";
import { fetchSeasonData, fetchStandingsData, fetchRoundData, formatDate } from "@/lib/data";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-f1-red border-t-transparent rounded-full animate-spin" />
          <div className="text-lg" style={{ color: "var(--text-muted)" }}>
            Loading season data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ── Hero ── */}
        <motion.section
          className="text-center mb-20"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-8" style={{ background: "rgba(232, 0, 45, 0.1)", color: "#E8002D", border: "1px solid rgba(232, 0, 45, 0.2)" }}>
            <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
            2026 Season
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-none">
            <span style={{ color: "var(--text)" }}>Formula 1</span>
            <br />
            <span className="gradient-text">Predictions</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Machine learning-powered race predictions for every Grand Prix.
            Built with ensemble models, LSTM forecasting, and FastF1 telemetry.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <Link href="/calendar" className="group relative px-8 py-3.5 bg-f1-red hover:bg-f1-red-dark text-white font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-f1-red/20 hover:shadow-xl hover:shadow-f1-red/30">
              View All Races
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/standings"
              className="px-8 py-3.5 font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
              style={{ background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--glass-border)" }}
            >
              Championship Standings
            </Link>
          </motion.div>
        </motion.section>

        {/* ── Stats ── */}
        <motion.section
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-20"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {[
            { value: season.totalRounds, label: "Grand Prix", icon: "🏁" },
            { value: season.drivers.length, label: "Drivers", icon: "👤" },
            { value: season.teams.length, label: "Constructors", icon: "🏎️" },
            { value: season.completedRounds.length, label: "Predicted", icon: "📊" },
          ].map((s) => (
            <motion.div key={s.label} variants={scaleIn} className="card p-6 text-center group">
              <span className="text-2xl mb-3 block opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</span>
              <p className="text-4xl font-black tracking-tight stat-number" style={{ color: "var(--text)" }}>{s.value}</p>
              <p className="text-xs mt-2 uppercase tracking-widest font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Latest Race ── */}
        {latestRace && (
          <motion.section
            className="mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>Latest Prediction</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Most recently predicted race result</p>
              </div>
              <Link href={`/race/${latestRace.round}`} className="group text-f1-red hover:text-f1-accent text-sm font-medium transition-colors inline-flex items-center gap-1">
                Full Details
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="card overflow-hidden card-glow">
              <div className="p-6 sm:p-8 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 mb-1">
                  <CountryFlag country={latestRace.gpKey} size={36} />
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black" style={{ color: "var(--text)" }}>
                      {latestRace.name}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Round {latestRace.round} • {latestRace.circuit} • {formatDate(latestRace.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Podium */}
              <div className="grid grid-cols-3">
                {latestRace.classification.slice(0, 3).map((entry, i) => (
                  <div
                    key={entry.driver}
                    className="p-6 sm:p-8 text-center border-r last:border-r-0 relative group"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 50% 100%, ${entry.teamColor}10, transparent 70%)` }} />
                    <div className="relative">
                      <div className={`text-4xl font-black mb-3 ${i === 0 ? "podium-1" : i === 1 ? "podium-2" : "podium-3"}`}>
                        P{entry.position}
                      </div>
                      <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ backgroundColor: entry.teamColor }} />
                      <p className="font-black text-lg" style={{ color: "var(--text)" }}>{entry.driver}</p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.driverFullName}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.team}</p>
                      <p className="text-f1-red font-bold mt-3 text-sm">+{entry.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* P4-P10 */}
              <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="grid gap-1">
                  {latestRace.classification.slice(3, 10).map((entry) => (
                    <div
                      key={entry.driver}
                      className="flex items-center gap-4 py-2.5 px-4 rounded-xl transition-all cursor-default"
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
                      <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                        {entry.gap === "LEADER" ? "—" : `+${entry.gap}s`}
                      </span>
                      {entry.points > 0 && (
                        <span className="text-f1-red text-sm font-bold">+{entry.points}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* ── Calendar Preview ── */}
        <motion.section
          className="mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>Season Calendar</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>All {season.totalRounds} races in the 2026 season</p>
            </div>
            <Link href="/calendar" className="group text-f1-red hover:text-f1-accent text-sm font-medium transition-colors inline-flex items-center gap-1">
              View all
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {season.calendar.slice(0, 6).map((race) => {
              const hasData = season.completedRounds.includes(race.round);
              return (
                <motion.div key={race.round} variants={fadeUp}>
                  <Link href={hasData ? `/race/${race.round}` : "/calendar"} className="card p-5 group block">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Round {race.round}</span>
                      {hasData ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22C55E", border: "1px solid rgba(34, 197, 94, 0.2)" }}>Predicted</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>Upcoming</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <CountryFlag country={race.country} size={24} />
                      <h3 className="font-bold group-hover:text-f1-red transition-colors" style={{ color: "var(--text)" }}>{race.name}</h3>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{race.circuit} • {formatDate(race.date)}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Championships ── */}
        {standings && (
          <motion.section
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="card p-6 card-glow">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                  <span className="mr-2">🏆</span>Drivers Championship
                </h2>
                <Link href="/standings?tab=drivers" className="group text-f1-red hover:text-f1-accent text-sm font-medium transition-colors inline-flex items-center gap-1">
                  Full Standings
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
              <div className="space-y-3">
                {standings.drivers.slice(0, 5).map((d) => (
                  <div key={d.driver} className="flex items-center gap-3 py-1 px-2 rounded-lg transition-colors" onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <span className={`position-badge ${d.position === 1 ? "p1" : d.position === 2 ? "p2" : d.position === 3 ? "p3" : "points"}`}>{d.position}</span>
                    <div className="team-color-bar h-10" style={{ backgroundColor: d.teamColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{d.driverFullName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{d.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: "var(--text)" }}>{d.points}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="card p-6 card-glow">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                  <span className="mr-2">🏭</span>Constructors Championship
                </h2>
                <Link href="/standings?tab=constructors" className="group text-f1-red hover:text-f1-accent text-sm font-medium transition-colors inline-flex items-center gap-1">
                  Full Standings
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
              <div className="space-y-3">
                {standings.constructors.slice(0, 5).map((c) => (
                  <div key={c.team} className="flex items-center gap-3 py-1 px-2 rounded-lg transition-colors" onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <span className={`position-badge ${c.position === 1 ? "p1" : c.position === 2 ? "p2" : c.position === 3 ? "p3" : "points"}`}>{c.position}</span>
                    <div className="team-color-bar h-10" style={{ backgroundColor: c.teamColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{c.team}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{c.drivers.join(" • ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: "var(--text)" }}>{c.points}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* ── Model Overview ── */}
        <motion.section
          className="mb-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>Powered by Machine Learning</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Advanced ensemble models trained on real F1 telemetry data</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: "🤖", title: "Ensemble ML + LSTM", desc: "Blends XGBoost, GradientBoosting, and LSTM neural network with StandardScaler normalization and prediction calibration (max 3.5s spread).", color: "rgba(232, 0, 45, 0.1)" },
              { icon: "📊", title: "12 Balanced Features", desc: "TeamPerformance, AdjustedPace, CleanAirPace, PitTimeLoss, TyreDeg, Experience, CurrentForm, Rain, Temperature, PreviousPosition, SeasonMomentum, PositionTrend.", color: "rgba(59, 130, 246, 0.1)" },
              { icon: "🏎️", title: "FastF1 Telemetry", desc: "Trained on 2023–2025 historical race data. Monte-Carlo pit strategy simulation, compound-specific degradation curves, and team-change adjustments.", color: "rgba(34, 197, 94, 0.1)" },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="card p-6 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110" style={{ background: item.color }}>
                  {item.icon}
                </div>
                <h3 className="font-bold mb-2 text-lg" style={{ color: "var(--text)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
