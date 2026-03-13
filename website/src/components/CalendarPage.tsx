"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SeasonData } from "@/types";
import CountryFlag from "@/components/CountryFlag";
import { fetchSeasonData, formatDate } from "@/lib/data";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function CalendarPage() {
  const [season, setSeason] = useState<SeasonData | null>(null);

  useEffect(() => {
    fetchSeasonData().then(setSeason).catch(console.error);
  }, []);

  if (!season) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-f1-red border-t-transparent rounded-full animate-spin" />
          <p style={{ color: "var(--text-muted)" }}>Loading calendar...</p>
        </div>
      </div>
    );
  }

  const completedCount = season.completedRounds.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2" style={{ color: "var(--text)" }}>
          2026 Season Calendar
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {season.totalRounds} Grand Prix • {completedCount} prediction{completedCount !== 1 ? "s" : ""} completed
        </p>
      </div>

      {/* Season Progress */}
      <div className="max-w-md mx-auto mb-12">
        <div className="flex items-center justify-between text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          <span>Round 1</span>
          <span className="text-f1-red">{completedCount}/{season.totalRounds}</span>
          <span>Round {season.totalRounds}</span>
        </div>
        <div className="progress-bar h-2">
          <div className="progress-bar-fill" style={{ width: `${(completedCount / season.totalRounds) * 100}%`, background: "#E10600" }} />
        </div>
      </div>

      {/* Race List */}
      <div className="space-y-3">
        {season.calendar.map((race, index) => {
          const completed = season.completedRounds.includes(race.round);
          const raceDate = new Date(race.date + "T00:00:00");
          const isPast = raceDate < new Date();

          return (
            <motion.div
              key={race.round}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: index * 0.02, duration: 0.35 }}
            >
              <Link
                href={`/race/${race.round}`}
                className="card flex items-center gap-4 sm:gap-6 px-5 py-4 group transition-all hover:border-f1-red/30 cursor-pointer"
              >
                {/* Round number */}
                <div className="text-center shrink-0 w-12">
                  <span className="text-2xl font-black stat-number" style={{ color: completed ? "#E10600" : "var(--text)" }}>{race.round}</span>
                </div>

                {/* Flag + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CountryFlag country={race.country} size={28} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-bold truncate transition-colors ${completed ? "group-hover:text-f1-red" : ""}`}
                        style={{ color: "var(--text)" }}
                      >
                        {race.name}
                      </h3>
                      {race.sprint && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(255, 128, 0, 0.15)", color: "#FF8000", border: "1px solid rgba(255, 128, 0, 0.3)" }}>
                          Sprint
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                      {race.circuit} • {race.expectedStops === 1 ? "1 stop" : `${race.expectedStops} stops`} • {race.drsZones} DRS zone{race.drsZones !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Circuit characteristics */}
                <div className="hidden lg:flex items-center gap-6 shrink-0">
                  <div className="text-center w-16">
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Laps</p>
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{race.laps}</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Length</p>
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{race.circuitKm} km</p>
                  </div>
                  <div className="w-20">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tyre Deg</p>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${race.tyreDeg * 100}%`, background: race.tyreDeg > 0.6 ? "#E10600" : race.tyreDeg > 0.4 ? "#FF8000" : "#00D2BE" }} />
                    </div>
                  </div>
                  <div className="w-20">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Overtaking</p>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${race.overtaking * 100}%`, background: "#3B82F6" }} />
                    </div>
                  </div>
                </div>

                {/* Date + Status */}
                <div className="text-right shrink-0 w-28">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{formatDate(race.date)}</p>
                  {completed ? (
                    <span className="text-xs font-bold" style={{ color: "#00D2BE" }}>✓ Data Ready</span>
                  ) : isPast ? (
                    <span className="text-xs font-medium" style={{ color: "#FF8000" }}>Race complete, results syncing</span>
                  ) : (
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Upcoming (Preview Available)</span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
