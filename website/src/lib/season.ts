import { SeasonData } from "@/types";

export const DEFAULT_SEASON_YEAR = Number(
  process.env.NEXT_PUBLIC_F1_SEASON_YEAR || "2026"
);

export function getSeasonYear(
  season?: Pick<SeasonData, "season"> | null
): number {
  return season?.season ?? DEFAULT_SEASON_YEAR;
}
