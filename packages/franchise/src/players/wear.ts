/**
 * Wear from mileage, the contact a man takes (ADR-087 §12.3.6; step AB6).
 *
 * - **The counter** (`PlayerMemory.contact`, saved through S1's `depthMemory` like the rest of the
 *   steps' memory). Each week with games, the players' steps add each man's contact from the games'
 *   who-played reports (P4's `GameParticipation.contests`): for each roll set (`CONTACT_ROLL_SETS`),
 *   the largest won + lost among its ratings, summed over the sets, game by game (`contactOf`). A
 *   contest is credited once to every rating its roll names, so this is a lower bound on his contact
 *   contests that never counts one twice: a carrier's break-tackle (elusiveness + power, one set)
 *   counts once, as the tackler's tackle (tackling) does. Everyone starts at 0 (real veterans too:
 *   NEW-4, a contact count on the growth record, is not asked). The steps keep it only with
 *   `aging: "ability"`, so a save on the default path is unchanged.
 * - **The effect** (`wearYears`): `perContact × max(0, contact − free)` years, added to the years past
 *   of SPEED, QUICKNESS, SPRING, STRENGTH and DURABILITY on the ability path (`aging.ts`,
 *   `a − start − shift + wear`), so more contact makes him fade as if he were older. It acts only with
 *   the spot path's injury rules (`injuryRisk: "spot"`) and a `perContact` above 0 (AB9-T5); at the
 *   default 0 nothing moves.
 * - **The owner's rule (R1).** Nothing here reads a man's listed position: the count is what he did on
 *   the field, at whatever spot his team played him (R1 allows it, §12.3.6). A test greps this file.
 */
import type { GameParticipation } from "@ff/contracts";

/**
 * The contact ratings (§12.3.6, CHOSEN) in roll sets: two of them share a set when one contact
 * check's roll names both on the same side. A copy of calibration's `CONTACT_ROLL_SETS`
 * (`careerAging.ts`, MEASURED from the engine at AB1, 2026-11-07), key for key and in the same
 * order, so the two give one sha256 (`CONTACT_ROLL_SETS_DIGEST`, `6a0b977a…`): franchise's test pins
 * the literal, and calibration's test reads that literal beside its own table, whose engine walk
 * fails if one side of one check names contact ratings from two sets. `sustain` and `security` count
 * 0 today (no opposed check names them; participation credits opposed checks only).
 */
export const CONTACT_ROLL_SETS: Readonly<Record<string, readonly string[]>> = {
  carry: ["elusiveness", "power", "yac"],
  tackle: ["tackling", "blockShed"],
  rush: ["passRush", "powerMove"],
  protect: ["passBlock", "anchor"],
  runBlock: ["runBlock"],
  runStuff: ["runStuff"],
  sustain: ["sustain"],
  traffic: ["catchInTraffic"],
  security: ["ballSecurity"],
};

/**
 * Wear's two numbers (§12.3.6).
 * - `free`: contests a man takes before any wear. The median career contact at age 27 (§12.3.6),
 *   MEASURED with AB1's reader on the 20-season default baseline of the base AB6 stands on (46e8c44:
 *   career-check rows version 7, the 4 tune seeds d5b-t1 to -t4 × 20 seasons, build e4be89df45616e34,
 *   the `/2` league file e9852a70…, the default rules): of the walk's own entrants aged 27 in 2033-45
 *   with a regular-season snap, the median of each man's contact over every game with a who-played
 *   report through that season, 843 / 752 / 764.5 / 805.5 by seed, 791.25 as the grader reads it (each
 *   seed's median, then the mean; SE 20.7 over the seeds). Pinned at 791 (CHOSEN, the measure to the
 *   whole contest). As first built it was 772, read from the v6 baseline (build 6b118e35f8d06440, the
 *   old `/1` file before the walk played the file's deals: 782.5 / 759 / 791 / 756), which ADR-087
 *   §12.9's rebase note says no longer stands for the new base. The walk's first seasons cannot measure
 *   it (its first entrants reach 27 in 2030), so a short run reads it only truncated, and the ability
 *   path's own playing time may move it: AB9 re-reads it on its arms.
 * - `perContact`: years of wear per contest past `free`. 0 (GUESS) until tuning sets it (AB9-T5: about
 *   1 year ahead for the top tenth of contact takers by age 30); the players' steps take it as
 *   `PlayerStepsConfig.perContact`.
 */
export const WEAR = { free: 791, perContact: 0 } as const;

/**
 * The contact one man took in one game's contests: for each roll set, the largest won + lost among its
 * ratings, summed over the sets. Calibration's `contactOf` (AB1), so the counter is the reader's count.
 */
export function contactOf(contests: GameParticipation["contests"] | undefined): number {
  const by = new Map<string, number>();
  for (const c of contests ?? []) by.set(String(c.attr), (by.get(String(c.attr)) ?? 0) + c.won + c.lost);
  let sum = 0;
  for (const set of Object.values(CONTACT_ROLL_SETS)) sum += Math.max(0, ...set.map((a) => by.get(a) ?? 0));
  return sum;
}

/**
 * The counter after a week's games: `before` (absent: everyone at 0) plus each report's contact, game
 * by game, for the men with any. A new object; the ids keep the order they were first counted in, and
 * a week with no contact for anyone gives back `before`'s entries unchanged.
 */
export function addContact(before: Readonly<Record<string, number>> | undefined, reports: readonly Pick<GameParticipation, "player" | "contests">[]): Record<string, number> {
  const out: Record<string, number> = { ...(before ?? {}) };
  for (const r of reports) {
    const c = contactOf(r.contests);
    if (c > 0) out[String(r.player)] = (out[String(r.player)] ?? 0) + c;
  }
  return out;
}

/** §12.3.6: the years of wear for this much contact, `perContact × max(0, contact − free)`. 0 at `perContact` 0. */
export function wearYears(contact: number, perContact: number, free: number = WEAR.free): number {
  if (!(perContact > 0)) return 0;
  return perContact * Math.max(0, contact - free);
}

/** A `perContact` checked: a finite number, 0 or more (absent is the default, 0). Throws on anything else. */
export function perContactRule(value: number | undefined): number {
  if (value === undefined) return WEAR.perContact;
  if (!(typeof value === "number" && Number.isFinite(value) && value >= 0)) {
    throw new RangeError(`perContact is years of wear per contest, a number 0 or more, not ${JSON.stringify(value)}`);
  }
  return value;
}
