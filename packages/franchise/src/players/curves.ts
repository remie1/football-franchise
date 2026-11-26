/**
 * The development tables' readers, shared by both aging paths (ADR-087 §2, §4, §12.2): a curve's
 * value at an age, one week's part of a yearly share table, and the share of a year's workouts a
 * week holds. Moved here word for word from `development.ts` at AB3, so the position path
 * (`development.ts`) and the ability path (`aging.ts`) read the very same helpers without importing
 * each other; `development.ts` still exports `curveAt` and `weeklyShare`.
 */
import type { CalendarPhase, LeagueRules } from "@ff/contracts";
import { phaseWeeks } from "../calendar/clock.js";
import { ON_OWN_WORKOUT_SHARES, WORKOUT_SHARES, type AgeCurve } from "./developmentTables.js";

/** A curve's value at `age`: straight lines between its points, flat beyond its ends. */
export function curveAt(curve: AgeCurve, age: number): number {
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) return 0;
  if (age <= first[0]) return first[1];
  if (age >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const [a1, v1] = curve[i]!;
    const [a0, v0] = curve[i - 1]!;
    if (age <= a1) return v0 + ((age - a0) / (a1 - a0)) * (v1 - v0);
  }
  return last[1];
}

/** One week's part of a yearly share table: the phase's share over its length (§4.1). */
export function weeklyShare(shares: Readonly<Partial<Record<CalendarPhase, number>>>, phase: CalendarPhase, rules: LeagueRules): number {
  const weeks = phaseWeeks(phase, rules);
  return weeks > 0 ? (shares[phase] ?? 0) / weeks : 0;
}

/** The share of a year's workouts this week holds: the offseason's for everyone, maintenance for a player on his own in season. */
export function workoutShare(phase: CalendarPhase, withTeam: boolean, rules: LeagueRules): number {
  if (WORKOUT_SHARES[phase] !== undefined) return weeklyShare(WORKOUT_SHARES, phase, rules);
  return withTeam ? 0 : weeklyShare(ON_OWN_WORKOUT_SHARES, phase, rules);
}
