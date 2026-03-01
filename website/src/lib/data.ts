import { SeasonData, RoundData, StandingsData } from "@/types";

const PREFIX = process.env.NEXT_PUBLIC_BASE_PATH || "";
const BASE_PATH = PREFIX + "/data";

export async function fetchSeasonData(): Promise<SeasonData> {
  const res = await fetch(`${BASE_PATH}/season.json`);
  if (!res.ok) throw new Error("Failed to fetch season data");
  return res.json();
}

export async function fetchRoundData(round: number): Promise<RoundData> {
  const pad = round.toString().padStart(2, "0");
  const res = await fetch(`${BASE_PATH}/rounds/round_${pad}.json`);
  if (!res.ok) throw new Error(`Failed to fetch round ${round} data`);
  return res.json();
}

export async function fetchStandingsData(): Promise<StandingsData> {
  const res = await fetch(`${BASE_PATH}/standings.json`);
  if (!res.ok) throw new Error("Failed to fetch standings data");
  return res.json();
}

export function getVisualizationPath(round: number, filename: string): string {
  const pad = round.toString().padStart(2, "0");
  return `${PREFIX}/visualizations/round_${pad}/${filename}`;
}

/**
 * Check which rounds have data available by trying to fetch each one.
 * Returns an array of available round numbers.
 */
export async function getAvailableRounds(totalRounds: number = 24): Promise<number[]> {
  const checks = Array.from({ length: totalRounds }, (_, i) => i + 1).map(async (r) => {
    try {
      const pad = r.toString().padStart(2, "0");
      const res = await fetch(`${BASE_PATH}/rounds/round_${pad}.json`, { method: "HEAD" });
      return res.ok ? r : null;
    } catch {
      return null;
    }
  });
  const results = await Promise.all(checks);
  return results.filter((r): r is number => r !== null);
}

export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, "0")}`;
}

export function formatGap(gap: string): string {
  if (gap === "LEADER" || gap === "0.000") return "—";
  return `+${gap}s`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getStatusForRound(date: string, completedRounds: number[]): "completed" | "upcoming" | "next" {
  // This is for prediction status - all predictions might be available even for future races
  return "completed";
}
