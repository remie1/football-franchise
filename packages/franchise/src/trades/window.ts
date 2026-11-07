/**
 * ADR-095 §1 and §4b: when trades are allowed, and which drafts' picks can move.
 *
 * - Trades run from the new league year (OFF_RESET_FA) to the trade deadline (`LeagueRules.tradeDeadline`,
 *   the Tuesday after week 9), and stop until the next league year.
 * - Owner's ruling (2026-11-07 15:14Z): until a draft starts, picks in that draft and the two after it
 *   trade; once it starts, it is "current" and the third draft after it opens too, so four drafts
 *   trade on draft day; after it, three remain.
 *
 * The draft held in the offseason of calendar season S is draft S + 1 (`draft/steps.ts`).
 */
import { compareStamps, DEFAULT_LEAGUE_RULES, type CalendarPhase, type CalendarStamp, type LeagueRules } from "@ff/contracts";
import { DRAFT_DAYS } from "../draft/steps.js";

const OFFSEASON_OPEN: ReadonlySet<CalendarPhase> = new Set([
  "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER", "TRAINING_CAMP", "PRESEASON",
]);

/** Can teams trade at `at`? */
export function tradeWindowOpen(at: CalendarStamp, rules: Pick<LeagueRules, "tradeDeadline"> = DEFAULT_LEAGUE_RULES): boolean {
  if (OFFSEASON_OPEN.has(at.phase)) return true;
  const td = rules.tradeDeadline;
  if (at.phase !== "REGULAR_SEASON" || td.phase !== "REGULAR_SEASON") return false;
  return compareStamps(at, { season: at.season, phase: "REGULAR_SEASON", week: td.week, day: td.day }) <= 0;
}

/** The years of the drafts whose picks can be traded at `at`, earliest first. */
export function tradeableDrafts(at: CalendarStamp): number[] {
  const draftDay: CalendarStamp = { ...DRAFT_DAYS.draft, season: at.season };
  const c = compareStamps(at, draftDay);
  const inOffseason = at.phase.startsWith("OFF_");
  if (inOffseason && c === 0) return [0, 1, 2, 3].map((k) => at.season + 1 + k);
  const next = inOffseason && c > 0 ? at.season + 2 : at.season + 1;
  return [next, next + 1, next + 2];
}
