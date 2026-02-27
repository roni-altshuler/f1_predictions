"use client";

import { useEffect, useState } from "react";
import { StandingsData, SeasonData } from "@/types";
import { fetchStandingsData, fetchSeasonData } from "@/lib/data";
import StandingsChart from "@/components/charts/StandingsChart";

type Tab = "drivers" | "constructors" | "wdc";

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingsData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [tab, setTab] = useState<Tab>("drivers");

  useEffect(() => {
    fetchStandingsData().then(setStandings).catch(console.error);
    fetchSeasonData().then(setSeason).catch(console.error);
  }, []);

  if (!standings || !season) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-f1-text-muted loading-pulse text-lg">Loading standings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-f1-text mb-2">
          Championship Standings
        </h1>
        <p className="text-f1-text-muted text-lg">
          After Round {standings.lastUpdatedRound} of {season.totalRounds}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-f1-card rounded-xl p-1 border border-f1-border w-fit">
        {([
          { key: "drivers" as Tab, label: "Drivers" },
          { key: "constructors" as Tab, label: "Constructors" },
          { key: "wdc" as Tab, label: "Who Can Still Win?" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-f1-red text-white"
                : "text-f1-text-muted hover:text-f1-text hover:bg-f1-card-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Driver Standings */}
      {tab === "drivers" && (
        <div>
          {/* Chart */}
          {standings.drivers.some((d) => d.pointsHistory.length > 1) && (
            <div className="mb-8 bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
              <h2 className="text-lg font-bold text-f1-text mb-4">Points Progression</h2>
              <StandingsChart
                data={standings.drivers.slice(0, 10)}
                rounds={season.completedRounds}
              />
            </div>
          )}

          {/* Table */}
          <div className="bg-f1-card rounded-2xl border border-f1-border overflow-hidden card-glow">
            <div className="grid grid-cols-[3rem_4px_1fr_5rem_4rem_4rem] gap-3 px-5 py-3 border-b border-f1-border text-xs font-bold text-f1-text-muted uppercase tracking-wider">
              <div>Pos</div>
              <div />
              <div>Driver</div>
              <div className="text-right">Points</div>
              <div className="text-right">Wins</div>
              <div className="text-right">Podiums</div>
            </div>

            {standings.drivers.map((d) => (
              <div
                key={d.driver}
                className={`grid grid-cols-[3rem_4px_1fr_5rem_4rem_4rem] gap-3 px-5 py-3.5 items-center border-b border-f1-border/50 hover:bg-f1-card-hover transition-colors ${
                  d.position <= 3 ? "bg-f1-bg/30" : ""
                }`}
              >
                <span
                  className={`position-badge ${
                    d.position === 1
                      ? "p1"
                      : d.position === 2
                      ? "p2"
                      : d.position === 3
                      ? "p3"
                      : d.points > 0
                      ? "points"
                      : "no-points"
                  }`}
                >
                  {d.position}
                </span>
                <div
                  className="team-color-bar"
                  style={{ backgroundColor: d.teamColor }}
                />
                <div>
                  <span className="font-bold text-f1-text">{d.driver}</span>
                  <span className="text-f1-text-muted ml-2 text-sm hidden sm:inline">
                    {d.driverFullName}
                  </span>
                  <span className="text-f1-text-muted ml-2 text-xs hidden sm:inline">
                    · {d.team}
                  </span>
                  <p className="text-xs text-f1-text-muted sm:hidden">{d.team}</p>
                </div>
                <div className="text-right font-bold text-f1-text">{d.points}</div>
                <div className="text-right text-f1-text-muted">{d.wins}</div>
                <div className="text-right text-f1-text-muted">{d.podiums}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constructor Standings */}
      {tab === "constructors" && (
        <div>
          <div className="bg-f1-card rounded-2xl border border-f1-border overflow-hidden card-glow">
            <div className="grid grid-cols-[3rem_4px_1fr_5rem_4rem] gap-3 px-5 py-3 border-b border-f1-border text-xs font-bold text-f1-text-muted uppercase tracking-wider">
              <div>Pos</div>
              <div />
              <div>Constructor</div>
              <div className="text-right">Points</div>
              <div className="text-right">Wins</div>
            </div>

            {standings.constructors.map((c) => (
              <div
                key={c.team}
                className={`grid grid-cols-[3rem_4px_1fr_5rem_4rem] gap-3 px-5 py-4 items-center border-b border-f1-border/50 hover:bg-f1-card-hover transition-colors ${
                  c.position <= 3 ? "bg-f1-bg/30" : ""
                }`}
              >
                <span
                  className={`position-badge ${
                    c.position === 1
                      ? "p1"
                      : c.position === 2
                      ? "p2"
                      : c.position === 3
                      ? "p3"
                      : c.points > 0
                      ? "points"
                      : "no-points"
                  }`}
                >
                  {c.position}
                </span>
                <div
                  className="team-color-bar"
                  style={{ backgroundColor: c.teamColor }}
                />
                <div>
                  <span className="font-bold text-f1-text">{c.team}</span>
                  <p className="text-xs text-f1-text-muted">{c.drivers.join(" • ")}</p>
                </div>
                <div className="text-right font-bold text-f1-text">{c.points}</div>
                <div className="text-right text-f1-text-muted">{c.wins}</div>
              </div>
            ))}
          </div>

          {/* Constructor Points Bar Chart */}
          <div className="mt-8 bg-f1-card rounded-2xl border border-f1-border p-6 card-glow">
            <h2 className="text-lg font-bold text-f1-text mb-4">Points Distribution</h2>
            <div className="space-y-3">
              {standings.constructors.map((c) => {
                const maxPts = standings.constructors[0]?.points || 1;
                return (
                  <div key={c.team} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-f1-text w-28 text-right truncate">
                      {c.team}
                    </span>
                    <div className="flex-1 h-8 bg-f1-bg rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center pl-3"
                        style={{
                          width: `${Math.max((c.points / maxPts) * 100, 2)}%`,
                          backgroundColor: c.teamColor,
                        }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-md">
                          {c.points}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WDC Possibility */}
      {tab === "wdc" && (
        <div>
          <div className="bg-f1-card rounded-2xl border border-f1-border p-6 mb-6 card-glow">
            <h2 className="text-xl font-bold text-f1-text mb-2">
              Who Can Still Win the Drivers Championship?
            </h2>
            <p className="text-f1-text-muted text-sm">
              With {24 - standings.lastUpdatedRound} races remaining, the maximum
              points still available is {(24 - standings.lastUpdatedRound) * 25}.
              Drivers whose maximum possible points exceed the leader&apos;s current
              total can still mathematically win.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {standings.wdcPossibility.map((w) => (
              <div
                key={w.driver}
                className={`bg-f1-card rounded-2xl border p-5 card-glow ${
                  w.canStillWin
                    ? "border-f1-green/30"
                    : "border-f1-border opacity-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: w.teamColor }}
                    />
                    <span className="font-bold text-f1-text text-lg">{w.driver}</span>
                  </div>
                  {w.canStillWin ? (
                    <span className="px-2.5 py-1 rounded-full bg-f1-green/10 text-f1-green text-xs font-bold">
                      IN CONTENTION
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-f1-text-muted/10 text-f1-text-muted text-xs font-bold">
                      ELIMINATED
                    </span>
                  )}
                </div>
                <p className="text-sm text-f1-text-muted mb-3">{w.driverFullName} • {w.team}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-f1-bg/50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black text-f1-text">{w.currentPoints}</p>
                    <p className="text-xs text-f1-text-muted">Current</p>
                  </div>
                  <div className="bg-f1-bg/50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black text-f1-green">{w.maxPossiblePoints}</p>
                    <p className="text-xs text-f1-text-muted">Max Possible</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full h-2 bg-f1-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-f1-red to-f1-accent"
                      style={{
                        width: `${(w.currentPoints / w.maxPossiblePoints) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-f1-text-muted mt-1 text-right">
                    {((w.currentPoints / w.maxPossiblePoints) * 100).toFixed(1)}% of max
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
