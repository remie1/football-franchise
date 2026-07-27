/**
 * ADR-008 — the engine's read path for QB↔receiver chemistry.
 *
 * Chemistry is franchise-owned PAIR state, delivered to the engine resolved (a
 * `ChemistryTable` snapshot on the game-state input) exactly as attribute maps
 * are. This module is the only place the engine touches it, and it is read-only:
 * there is no accrual model here and there must never be one, because accrual
 * runs on the franchise calendar and the engine is calendar-blind.
 *
 * Everything degrades to neutral. Absent table, absent passer, absent pair, or a
 * non-numeric entry all read `TUNABLES.chemistry.neutralLevel` — which produces
 * a zero modifier, which `compact()` drops, which is the engine's pre-ADR-008
 * behaviour exactly. That is what makes the migration a genuine no-op.
 */
import type { ChemistryTable, PlayerId, RollModifier } from "@ff/contracts";
import { TUNABLES } from "./tunables.js";

/** The pair's 0-100 level, or neutral when the table cannot answer. */
export function chemistryLevel(
  table: ChemistryTable | undefined,
  quarterback: PlayerId,
  receiver: PlayerId,
): number {
  const neutral = TUNABLES.chemistry.neutralLevel;
  if (table === undefined) return neutral;
  const row = table[quarterback as unknown as string];
  if (row === undefined) return neutral;
  const level = row[receiver as unknown as string];
  return typeof level === "number" ? level : neutral;
}

/** True when the pairing is ESTABLISHED for §10.4's "+5 chemistry with receiver". */
export function chemistryEstablished(level: number): boolean {
  return level >= TUNABLES.chemistry.establishedThreshold;
}

/** True when §10.2's back-shoulder throw has the chemistry it "requires". */
export function chemistrySupportsBackShoulder(level: number): boolean {
  return level >= TUNABLES.chemistry.backShoulderThreshold;
}

/**
 * §8.1's anticipation term: `(level − neutral) ÷ divisor`, as a named modifier
 * so the §17 printout states it and calibration can count it. Returns a
 * zero-valued modifier at neutral, which `compact()` then drops — the printout
 * gains the line only when the pairing actually means something.
 */
export function anticipationChemistryModifier(level: number): RollModifier {
  const t = TUNABLES.chemistry;
  return {
    source: `QB/receiver chemistry (${level})`,
    value: Math.round((level - t.neutralLevel) / t.anticipationDivisor),
  };
}
