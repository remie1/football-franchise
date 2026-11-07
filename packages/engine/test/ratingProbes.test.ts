/**
 * ADR-089 step 4: THE PROBES ON THE ENGINE'S OWN PLAYS (AM-7 items 13 and 14; review F9, F10).
 *
 * P6, P7 and P8 are not in contracts, so the wired plays run through the engine's test seam
 * (`simulatePassPlayWith`, the petitions granted, a recorder for what the stream will carry). Over
 * every pass fixture and 30 seeds, one play is played and then replayed on the same seed with one
 * rating changed on one named man, the play-level probe calibration's harness runs on whole games
 * after the lift (`calibration/src/pocket/step4Probes.ts`):
 *  - **the rating probe** (contact alone, shape S, and kind T): the quarterback's strength or agility
 *    raised 30 never moves the first rated contest's margin up nor a shed to a sack; the rusher's
 *    tackling raised 30 never moves it down. A pair is compared only when every event before the
 *    contest is the same (the same die lies under it); speed, read before the contest on the way in,
 *    may move the arrival, and such a pair is counted apart (speed's arrival effect);
 *  - **the release probe** (the motion alone, on shape S and on shape L): release is read by nothing
 *    before the race, so the play up to the race (the first THROWING hit or release) is the same at
 *    40 and at 80, and a THROWING hit at 80 is one at 40 too; over the two corpora release 80 has
 *    fewer THROWING hits than release 40 (more release, fewer hits). Shape S alone races few rushers
 *    inside the release (a handful over its whole corpus), so shape L carries the count.
 */
import { describe, expect, it } from "vitest";
import { getAttr, setAttr } from "@ff/contracts";
import type { AttrId, MatchEventEnvelope } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import type { Tunables } from "../src/tunables.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { L5_TUNABLES, PASS_FIXTURES, stamp } from "./pocketTunables.js";
import { MOTION_FILED, S4C_TUNABLES, S4M_TUNABLES, T_TUNABLES, playStep4, withStep4 } from "./step4Fixtures.js";
import type { Step4Play, Step4Record } from "./step4Fixtures.js";

const SEEDS = 30;
const RAISE = 30;
/** The motion alone on shape L (R 5): no contact block. */
const S4ML_TUNABLES: Tunables = withStep4({ ...L5_TUNABLES, engineRules: stamp("fnv1a:7e000007", "pocket-1.s4") }, { motion: MOTION_FILED });

/** The state with one man's attribute set through the registry's own path (clamped to the scale). */
function withRating(state: MatchGameState, man: string, attr: AttrId, value: (now: number) => number): MatchGameState {
  const p = state.players[man]!;
  return { ...state, players: { ...state.players, [man]: { ...p, attributes: { ...p.attributes, values: setAttr(p.attributes.values, attr, value(getAttr(p.attributes.values, attr))) } } } };
}

const firstContest = (p: Step4Play): Extract<Step4Record, { kind: "CONTEST" }> | undefined =>
  p.records.find((r): r is Extract<Step4Record, { kind: "CONTEST" }> => r.kind === "CONTEST" && r.payload.roll.rngLabel.endsWith(":contest"));
/** The events before stream position `upTo` (a record's `at.seq` is the envelope's seq, not an array index) are the same. */
const same = (a: readonly MatchEventEnvelope[], b: readonly MatchEventEnvelope[], upTo: number): boolean => {
  const before = (xs: readonly MatchEventEnvelope[]): string[] => xs.filter((e) => e.seq < upTo).map((e) => JSON.stringify(e));
  const x = before(a);
  const y = before(b);
  return x.length > 0 && x.length === y.length && x.every((e, i) => e === y[i]);
};

interface Fixture {
  readonly name: string;
  readonly seed: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
}
function fixtures(): Fixture[] {
  const out: Fixture[] = [];
  for (const [name, build] of PASS_FIXTURES) {
    for (let i = 0; i < SEEDS; i++) {
      const { state, calls } = build();
      out.push({ name, seed: `probe-${i}`, state, calls });
    }
  }
  return out;
}

interface PairTally {
  compared: number;
  diverged: number;
  up: number;
  down: number;
  toSack: number;
  toShed: number;
}

/** Every fixture's first rated contest under `tunables`, replayed with one man's rating raised. */
function ratingProbe(tunables: Tunables, attr: AttrId, man: "QB" | "RUSHER"): PairTally {
  const t: PairTally = { compared: 0, diverged: 0, up: 0, down: 0, toSack: 0, toShed: 0 };
  for (const f of fixtures()) {
    const base = playStep4(f.state, f.calls, f.seed, tunables);
    const c = firstContest(base);
    if (c === undefined) continue;
    const who = man === "QB" ? String(c.payload.actors[1]) : String(c.payload.actors[0]);
    const raised = playStep4(withRating(f.state, who, attr, (v) => v + RAISE), f.calls, f.seed, tunables);
    const r = firstContest(raised);
    if (r === undefined || r.payload.roll.rngLabel !== c.payload.roll.rngLabel || r.at.seq !== c.at.seq || !same(base.events, raised.events, c.at.seq)) {
      t.diverged += 1;
      continue;
    }
    t.compared += 1;
    if (r.payload.margin > c.payload.margin) t.up += 1;
    if (r.payload.margin < c.payload.margin) t.down += 1;
    if (c.payload.band === "QB_SHEDS" && r.payload.band === "RUSHER_SACKS") t.toSack += 1;
    if (c.payload.band === "RUSHER_SACKS" && r.payload.band === "QB_SHEDS") t.toShed += 1;
  }
  return t;
}

describe("ADR-089 step 4: the play-level rating probe (AM-7 item 14)", () => {
  for (const [label, tunables] of [["contact alone on shape S", S4C_TUNABLES], ["kind T", T_TUNABLES]] as const) {
    it(`${label}: the quarterback's strength or agility never moves a compared contest toward the sack`, () => {
      for (const attr of [ATTR.strength, ATTR.agility]) {
        const t = ratingProbe(tunables, attr, "QB");
        expect(t.compared, `${String(attr)} ${JSON.stringify(t)}`).toBeGreaterThan(0);
        expect(t.up, String(attr)).toBe(0);
        expect(t.toSack, String(attr)).toBe(0);
        expect(t.down, `${String(attr)} moves the margin on every compared contest it reads`).toBeGreaterThan(0);
      }
    });

    it(`${label}: the rusher's tackling never moves a compared contest away from the sack; speed's arrival effect is counted apart`, () => {
      const tackling = ratingProbe(tunables, ATTR.tackling, "RUSHER");
      expect(tackling.compared).toBeGreaterThan(0);
      expect(tackling.down).toBe(0);
      expect(tackling.toShed).toBe(0);
      expect(tackling.up).toBeGreaterThan(0);
      const speed = ratingProbe(tunables, ATTR.speed, "RUSHER");
      expect(speed.down, JSON.stringify(speed)).toBe(0);
      expect(speed.toShed).toBe(0);
      expect(speed.compared + speed.diverged).toBe(tackling.compared + tackling.diverged);
    });
  }
});

describe("ADR-089 step 4: the release probe on the engine's plays (AM-7 item 13)", () => {
  it("the motion alone (shapes S and L): the play to the race is the same at release 40 and 80; a THROWING hit at 80 is one at 40; 80 has fewer", () => {
    let aimed = 0;
    let hits40 = 0;
    let hits80 = 0;
    for (const [tunables, f] of [S4M_TUNABLES, S4ML_TUNABLES].flatMap((t) => fixtures().map((x) => [t, x] as const))) {
      const qb = String(f.state.quarterback);
      const at = (v: number): Step4Play => playStep4(withRating(f.state, qb, ATTR.release, () => v), f.calls, f.seed, tunables);
      const lo = at(40);
      const hi = at(80);
      const releaseOf = (p: Step4Play) => p.records.find((r) => r.kind === "RELEASE");
      const throwingOf = (p: Step4Play) => p.records.some((r) => r.kind === "QB_HIT" && r.payload.phase === "THROWING");
      const rl = releaseOf(lo);
      const rh = releaseOf(hi);
      expect(rl === undefined, `${f.name} ${f.seed}`).toBe(rh === undefined);
      if (rl === undefined || rh === undefined) continue;
      aimed += 1;
      expect(rl.at.seq, `${f.name} ${f.seed}`).toBe(rh.at.seq);
      // The race is the first thing release can touch: a THROWING hit puts the throw on the IMMEDIATE
      // row, which the accuracy roll before the THROW reads; the play before the race is release-free.
      const raceOf = (p: Step4Play): number =>
        Math.min(...p.records.filter((r) => r.kind === "RELEASE" || (r.kind === "QB_HIT" && r.payload.phase === "THROWING")).map((r) => r.at.seq));
      expect(same(lo.events, hi.events, Math.min(raceOf(lo), raceOf(hi))), `${f.name} ${f.seed}: the play before the race`).toBe(true);
      expect((rh.payload as number) < (rl.payload as number), `${f.name} ${f.seed}: a quicker release`).toBe(true);
      if (throwingOf(lo)) hits40 += 1;
      if (throwingOf(hi)) {
        hits80 += 1;
        expect(throwingOf(lo), `${f.name} ${f.seed}: a THROWING hit at 80 is one at 40`).toBe(true);
      }
    }
    expect(aimed).toBeGreaterThan(0);
    expect(hits40, `${String(hits40)} at 40, ${String(hits80)} at 80, of ${String(aimed)} aimed`).toBeGreaterThan(hits80);
  });
});
