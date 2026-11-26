import { RulebookInputError } from "./errors.js";
import type { Administration, RulebookDown, RulebookOption, Team } from "./types.js";

/** Rung 1: points from the chooser's side (11-1: a touchdown 6, a safety 2). */
function points(o: RulebookOption, me: Team): number {
  const r = o.result;
  if (r.kind !== "SCORE") return 0;
  const v = r.score === "TOUCHDOWN" ? 6 : 2;
  return r.by === me ? v : -v;
}

/** A's frame: where the ball stands after the option. */
function aFrameSpot(o: RulebookOption): number | null {
  const r = o.result;
  if (r.kind !== "NEXT_SNAP") return null;
  return r.next.team === "A" ? r.next.ballOn : 100 - r.next.ballOn;
}

/**
 * The chooser wants another play (rung 2's test), judged on an option. With the ball, it wants
 * another play unless it leads in period 4 or 5; without it, when it trails in period 4 or 5. After
 * an option that scores, the team with the ball is the one that receives the next free kick: the
 * scoring team after a safety (11-5-2: "the team scored upon must put the ball in play by a free
 * kick"), the team scored upon after a touchdown (11-3-4: "the team on defense during the Try shall
 * receive the succeeding free kick"); the lead is the chooser's lead before the down plus the
 * option's own points (the try is not counted).
 */
function wantsMore(down: RulebookDown, me: Team, o: RulebookOption): boolean {
  const c = down.clock;
  if (c === undefined) return true;
  const late = c.period === 4 || c.period === 5;
  let lead = me === "A" ? c.scoreDifferenceA : -c.scoreDifferenceA;
  const r = o.result;
  let has = false;
  if (r.kind === "NEXT_SNAP") has = r.next.team === me;
  else if (r.kind === "SCORE") {
    lead += points(o, me);
    const receiver: Team = r.score === "SAFETY" ? r.by : r.by === "A" ? "B" : "A";
    has = receiver === me;
  }
  if (has) return !(late && lead > 0);
  return late && lead < 0;
}

/**
 * The last tie-break's key: the option's id with its `ref=CHOICE` pairs sorted by ref in code-unit
 * order. Built from the flag records, not by splitting the id, so a ref holding a comma is safe; an
 * id that is not the records' pairs joined (a hand-made option) is its own key.
 */
function tieKey(o: RulebookOption): string {
  const pairs = o.flags.map((r) => `${r.ref}=${r.decision?.choice}`);
  if (pairs.join(",") !== o.id) return o.id;
  return [...o.flags]
    .sort((p, q) => (p.ref < q.ref ? -1 : p.ref > q.ref ? 1 : 0))
    .map((r) => `${r.ref}=${r.decision?.choice}`)
    .join(",");
}

/**
 * The computer's choice among an administration's options: a design choice, not the rulebook.
 *
 * Compares two options' results from the chooser's side, rung by rung: points (its touchdown, its
 * safety, no score, the other's safety, the other's touchdown); the half's end (periods 2, 4, 5,
 * when the options differ on `periodOver`); the ball at the next snap; a new series for the team
 * with the ball; the down (the chooser with the ball wants the lower down number; the chooser
 * without it wants the other team facing fourth down, and only that: when both options or neither
 * leave the other team on fourth down, the down does not decide and the yards do); the yards toward the chooser's scoring end;
 * the clock (a chooser who wants another play prefers no runoff and the clock on the snap, one who
 * does not prefers the runoff and the ready signal); then ties go to the option that accepts over
 * the decline, then to the lower id by code units, each id taken with its
 * `ref=CHOICE` pairs sorted by ref, so the pick does not depend on the order of the flags (an id
 * that is not its flags' pairs, as in a hand-made option, is compared as it stands). `down.clock` supplies the period, the score and
 * the clock to the rungs that read them; without it those rungs are skipped.
 *
 * Stable under reordering of `admin.options`. Pure; never mutates its inputs.
 *
 * @throws RulebookInputError when `admin.options` is empty.
 * @returns the only option when `admin.chooser` is null; otherwise the chosen one, which is always
 *   one of `admin.options` (the same object).
 */
export function chooseOption(down: RulebookDown, admin: Administration): RulebookOption {
  if (admin.options.length === 0) throw new RulebookInputError("chooseOption needs at least one option");
  if (admin.chooser === null) return admin.options[0]!;
  const me = admin.chooser;
  const clock = down.clock;
  const period2 = clock !== undefined && (clock.period === 2 || clock.period === 4 || clock.period === 5);
  /** Positive when x is better for the chooser than y. */
  const cmp = (x: RulebookOption, y: RulebookOption): number => {
    const pts = points(x, me) - points(y, me);
    if (pts !== 0) return pts;
    if (period2) {
      const xo = x.result.clock?.periodOver ?? false;
      const yo = y.result.clock?.periodOver ?? false;
      if (xo !== yo) {
        const cont = xo ? y : x;
        const more = wantsMore(down, me, cont);
        const xBetter = more ? !xo : xo;
        return xBetter ? 1 : -1;
      }
    }
    const xr = x.result;
    const yr = y.result;
    if (xr.kind === "NEXT_SNAP" && yr.kind === "NEXT_SNAP") {
      const xHas = xr.next.team === me;
      const yHas = yr.next.team === me;
      if (xHas !== yHas) return xHas ? 1 : -1;
      const sign = xHas ? 1 : -1;
      const xNew = xr.end.kind !== "SAME_SERIES" ? 1 : 0;
      const yNew = yr.end.kind !== "SAME_SERIES" ? 1 : 0;
      if (xNew !== yNew) return sign * (xNew - yNew);
      if (xHas) {
        if (xr.next.down !== yr.next.down) return yr.next.down - xr.next.down;
      } else {
        const x4 = xr.next.down === 4;
        const y4 = yr.next.down === 4;
        if (x4 !== y4) return x4 ? 1 : -1;
      }
      const xs = aFrameSpot(x)!;
      const ys = aFrameSpot(y)!;
      if (xs !== ys) return me === "A" ? xs - ys : ys - xs;
    }
    if (clock !== undefined && xr.kind === yr.kind) {
      const more = wantsMore(down, me, x);
      const score = (o: RulebookOption): number => {
        const k = o.result.clock;
        if (k === undefined) return 0;
        return (k.runoff === 0 ? 1 : 0) + (k.gameClockStarts === "ON_SNAP" ? 1 : 0);
      };
      const d = score(x) - score(y);
      if (d !== 0) return more ? d : -d;
    }
    const xa = x.id !== "decline" && x.id !== "rule";
    const ya = y.id !== "decline" && y.id !== "rule";
    if (xa !== ya) return xa ? 1 : -1;
    const kx = tieKey(x);
    const ky = tieKey(y);
    return kx < ky ? 1 : kx > ky ? -1 : 0;
  };
  let best = admin.options[0]!;
  for (const o of admin.options) if (cmp(o, best) > 0) best = o;
  return best;
}
