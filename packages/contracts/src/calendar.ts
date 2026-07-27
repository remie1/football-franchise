/** Calendar vocabulary. Phase semantics and deadlines are franchise logic (Spec #5). */
export type CalendarPhase =
  | "TRAINING_CAMP" | "PRESEASON" | "REGULAR_SEASON" | "PLAYOFFS"
  | "OFF_EVAL" | "OFF_RESET_FA" | "OFF_DRAFT" | "OFF_ROOKIES_OTAS" | "OFF_SUMMER";

export const CALENDAR_PHASE_ORDER: readonly CalendarPhase[] = [
  "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS",
  "OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER",
] as const;

export interface CalendarStamp {
  season: number;
  phase: CalendarPhase;
  week: number;
  day: number; // 1..7
}

export function stampToString(s: CalendarStamp): string {
  return `${s.season}/${s.phase}/W${s.week}D${s.day}`;
}

export function compareStamps(a: CalendarStamp, b: CalendarStamp): number {
  if (a.season !== b.season) return a.season - b.season;
  const pa = CALENDAR_PHASE_ORDER.indexOf(a.phase);
  const pb = CALENDAR_PHASE_ORDER.indexOf(b.phase);
  if (pa !== pb) return pa - pb;
  if (a.week !== b.week) return a.week - b.week;
  return a.day - b.day;
}

/** Authority tags. The owner is narrative-only and never appears here. */
export type Authority = "COACH" | "GM" | "PRESIDENT";

export interface Decision<T extends string = string, P = unknown> {
  type: T;
  authority: Authority;
  payload: P;
  decidedBy: "HUMAN" | "NPC";
  at: CalendarStamp;
}
