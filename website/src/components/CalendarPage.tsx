"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SeasonData, COUNTRY_FLAGS } from "@/types";
import { fetchSeasonData, formatDate } from "@/lib/data";

export default function CalendarPage() {
  const [season, setSeason] = useState<SeasonData | null>(null);

  useEffect(() => {
    fetchSeasonData().then(setSeason).catch(console.error);
  }, []);

  if (!season) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-f1-text-muted loading-pulse text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-f1-text mb-2">
          2026 Season Calendar
        </h1>
        <p className="text-f1-text-muted text-lg">
          {season.totalRounds} Grand Prix races •{" "}
          {season.completedRounds.length} predictions completed
        </p>
      </div>

      {/* Race Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {season.calendar.map((race) => {
          const hasData = season.completedRounds.includes(race.round);
          const flag = COUNTRY_FLAGS[race.gpKey] || "🏁";

          return (
            <Link
              key={race.round}
              href={hasData ? `/race/${race.round}` : "#"}
              className={`bg-f1-card rounded-2xl border border-f1-border p-6 transition-all card-glow group ${
                hasData
                  ? "hover:border-f1-red/40 cursor-pointer"
                  : "opacity-60 cursor-default"
              }`}
            >
              {/* Round header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-f1-text-muted">
                  Round {race.round}
                </span>
                {hasData ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-f1-green/10 text-f1-green text-xs font-semibold">
                    <span className="w-1.5 h-1.5 bg-f1-green rounded-full" />
                    Predicted
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-f1-text-muted/10 text-f1-text-muted text-xs font-semibold">
                    Upcoming
                  </span>
                )}
              </div>

              {/* Race info */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{flag}</span>
                <div>
                  <h3 className="font-bold text-f1-text text-lg group-hover:text-f1-red transition-colors leading-tight">
                    {race.name}
                  </h3>
                  <p className="text-sm text-f1-text-muted mt-0.5">{race.circuit}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-f1-bg/50 rounded-lg p-2.5">
                  <p className="text-xs text-f1-text-muted">Date</p>
                  <p className="font-semibold text-f1-text text-sm">{formatDate(race.date)}</p>
                </div>
                <div className="bg-f1-bg/50 rounded-lg p-2.5">
                  <p className="text-xs text-f1-text-muted">Type</p>
                  <p className="font-semibold text-f1-text text-sm capitalize">{race.circuitType}</p>
                </div>
                <div className="bg-f1-bg/50 rounded-lg p-2.5">
                  <p className="text-xs text-f1-text-muted">Laps</p>
                  <p className="font-semibold text-f1-text text-sm">{race.laps}</p>
                </div>
                <div className="bg-f1-bg/50 rounded-lg p-2.5">
                  <p className="text-xs text-f1-text-muted">Length</p>
                  <p className="font-semibold text-f1-text text-sm">{race.circuitKm} km</p>
                </div>
              </div>

              {/* Circuit characteristics */}
              <div className="mt-4 pt-4 border-t border-f1-border">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-f1-text-muted">Tyre Deg:</span>
                    <div className="w-16 h-1.5 bg-f1-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-f1-red"
                        style={{ width: `${(race.tyreDeg || 0.5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-f1-text-muted">Overtaking:</span>
                    <div className="w-16 h-1.5 bg-f1-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-f1-green"
                        style={{ width: `${(race.overtaking || 0.5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-f1-text-muted mt-2 text-center">
                  {race.expectedStops} pit stop{race.expectedStops !== 1 ? "s" : ""} expected
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
