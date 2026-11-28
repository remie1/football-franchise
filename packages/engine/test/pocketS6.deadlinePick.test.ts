/**
 * ADR-089 step 6, PART 2.11 (step-6 plan §2.11; ADR-089 §4.6 f, ADR:727; AM-13 `deadlinePick`, its
 * run margin K9's; P9, P10): RUN OR THROW IT AWAY AT THE DEADLINE, behind `pocket.outs.deadlinePick`.
 * Its OUT_OF_POCKET throwaway is P9's, on the stand-in until the lift: the test recorder takes it at
 * the seq the next event takes, with its `outsideTackleBox` (P10).
 *
 * 1. Where: one `:deadline` CHECK at every pursuit deadline he reaches with nobody thrown to, on
 *    `movement/t<tick>:deadline` at the deadline tick, at the seq where today's deadline run starts,
 *    and none elsewhere. The stream before it is step 5a's, and a play with no deadline reached is
 *    step 5a's byte for byte.
 * 2. The pick: today's `pocket_movement` CHECK (his d100 plus Poise and Awareness, each a fifth,
 *    against 50; SOUND, RUSHED, PANICKED) over a two-option ranking of its own at urgency 0. SOUND
 *    takes his first choice, any band below it the second.
 * 3. RUN is today's deadline run, with no direction, and the rest of the play is step 5a's a seq
 *    later. THROWAWAY is the decision THROWAWAY, with no direction, and an OUT_OF_POCKET throwaway
 *    naming the `:deadline` CHECK, outside the tackle box, then the play's result at 0 yards with
 *    today's throwaway runoff.
 * 4. Every throwaway on a play under the pick carries `outsideTackleBox`: false in the pocket, true
 *    out of it, so the flag is the cause (S-15).
 * 5. No desperation throw after a clean break-out (D23 on the run, S-1's second half, kept).
 * 6. The ranking (unit): THROWAWAY today's throwaway appeal, RUN the throwaway's base plus the run
 *    margin plus today's escape terms, each term rounded on its own; a baseline quarterback ranks
 *    RUN first, 26 against 25; a tie ranks THROWAWAY first. The leaf against the filed derivation:
 *    "Δ + 5u > 8u" at the deadline's urgency alone gives 1, and over 0 to 3 the step-0 filing's 10.
 * 7. Same seed, same stream and records.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/targetSelection.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/targetSelection.js")>();
  return { ...real, selectTarget: vi.fn(real.selectTarget) };
});

import { getAttr, setAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerState } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { appealFrom } from "../src/resolve/pocketMovement.js";
import { throwThresholdFor } from "../src/resolve/qbRead.js";
import { selectTarget } from "../src/resolve/targetSelection.js";
import { bandFor } from "../src/rolls.js";
import { DEADLINE_URGENCY, deadlineRanking } from "../src/sim/outs.js";
import type { DeadlineChoice } from "../src/sim/outs.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import type { DeadlinePickTunables, Tunables } from "../src/tunables.js";
import { buildMixedCoverageScenario, buildScramblerScenario, buildStalledPocketScenario, makePlayer } from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import { PASS_FIXTURES, buildBullRushScenario } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, tickOfEvent } from "./step5Fixtures.js";
import { OUTS_FILED, outsParts, playS6, withOuts } from "./step6Fixtures.js";
import type { Step6Play, Step6Record } from "./step6Fixtures.js";

const PICK = outsParts({ deadlinePick: { runMargin: 1 } });
/** The pick with escape direction, which must leave the deadline's decision without one. */
const PICK_DIRECTION = outsParts({ direction: true, deadlinePick: { runMargin: 1 } });
const T = S5S_TUNABLES;
const selectSpy = vi.mocked(selectTarget);
afterEach(() => selectSpy.mockClear());

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];

/** A fixture with its quarterback's ratings changed. */
function withQb(base: Scenario, values: Partial<Readonly<Record<keyof typeof ATTR, number>>>): Scenario {
  const id = String(base.state.quarterback);
  const qb = base.state.players[id];
  if (qb === undefined) throw new Error("no quarterback");
  let map = qb.attributes.values;
  for (const [key, value] of Object.entries(values) as [keyof typeof ATTR, number][]) map = setAttr(map, ATTR[key], value);
  const players: Record<string, PlayerState> = { ...base.state.players, [id]: { ...qb, attributes: { ...qb.attributes, values: map } } };
  return { ...base, state: { ...base.state, players } };
}

/** Every pass fixture, and the ones that reach the deadline with a panicky quarterback (so PANICKED comes) and a mobile one. */
const FIXTURES: readonly (readonly [string, () => Scenario])[] = [
  ...PASS_FIXTURES,
  ["stalled pocket, panicky", () => withQb(buildStalledPocketScenario(), { poise: 10, awareness: 10 })],
  ["bull rush, panicky", () => withQb(buildBullRushScenario(), { poise: 10, awareness: 10 })],
  ["stalled pocket, mobile", () => withQb(buildStalledPocketScenario(), { mobility: 95, improvisation: 95 })],
  ["mixed coverage, scrambler", () => {
    const s = buildMixedCoverageScenario();
    const r = buildScramblerScenario();
    return {
      state: { ...s.state, players: { ...r.state.players, ...s.state.players }, quarterback: r.state.quarterback },
      calls: { offense: { ...s.calls.offense, protection: r.calls.offense.protection }, defense: { ...s.calls.defense, rush: r.calls.defense.rush, shownRush: r.calls.defense.rush } },
      names: s.names,
    };
  }],
];

interface Play {
  readonly name: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly seed: string;
  readonly base: Tunables;
  readonly arm: Step6Play;
  /** Step 5a's stream. */
  readonly s5a: readonly MatchEventEnvelope[];
}

function corpus(block = PICK, seeds = 25, tag = "c"): Play[] {
  const out: Play[] = [];
  for (const shape of SHAPES) {
    for (const [fixture, build] of FIXTURES) {
      for (let i = 0; i < seeds; i++) {
        const { state, calls: raw } = build();
        const calls = shape.picture ? withPicture(state, raw) : raw;
        const seed = `deadline-${tag}-${fixture}-${i}`;
        out.push({
          name: `${shape.name} ${fixture} ${i}`,
          state,
          calls,
          seed,
          base: shape.base,
          arm: playS6(state, calls, seed, withOuts(shape.base, block)),
          s5a: simulatePassPlay(state, calls, seed, shape.base).events,
        });
      }
    }
  }
  return out;
}

/** Step 5a's deadline run: the SCRAMBLE decision at or past the pursuit clock's deadline. */
function deadlineOf(events: readonly MatchEventEnvelope[]): MatchEventEnvelope | undefined {
  const k = events.findIndex((e) => e.event.type === "QB_PURSUIT");
  const pursuit = events[k];
  if (pursuit?.event.type !== "QB_PURSUIT") return undefined;
  const deadline = pursuit.event.payload.deadlineTick;
  return events.slice(k + 1).find((e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE" && (tickOfEvent(e) ?? -1) >= deadline);
}
const isDeadlinePick = (e: MatchEventEnvelope): boolean => checkOf(e)?.checkKind === "pocket_movement" && (checkOf(e)?.roll?.rngLabel ?? "").endsWith(":deadline");
const qbOf = (play: Play): PlayerState => {
  const p = play.state.players[String(play.state.quarterback)];
  if (p === undefined) throw new Error("no quarterback");
  return p;
};
const choiceOf = (response: DeadlineChoice): string => (response === "RUN" ? "SCRAMBLE" : "THROWAWAY");
const strip = (events: readonly MatchEventEnvelope[], shift: number) => events.map((e) => JSON.stringify({ ...e, seq: e.seq - shift }));
const records = (r: readonly Step6Record[], kind: Step6Record["kind"]) => r.filter((x) => x.kind === kind);

let CORPUS: Play[] | undefined;
const theCorpus = (): Play[] => (CORPUS ??= corpus());

describe("ADR-089 step 6, 2.11: run or throw it away at the deadline (pocket.outs.deadlinePick)", () => {
  it("one :deadline CHECK at every pursuit deadline he reaches, where today's run starts, and none elsewhere", () => {
    let reached = 0;
    let untouched = 0;
    for (const play of theCorpus()) {
      const picks = play.arm.events.filter(isDeadlinePick);
      const today = deadlineOf(play.s5a);
      if (today === undefined) {
        expect(picks, play.name).toEqual([]);
        expect(JSON.stringify(play.arm.events), play.name).toBe(JSON.stringify(play.s5a));
        untouched += 1;
        continue;
      }
      reached += 1;
      expect(picks.length, play.name).toBe(1);
      const [pick] = picks;
      if (pick === undefined) continue;
      expect(pick.seq, play.name).toBe(today.seq);
      expect(tickOfEvent(pick), play.name).toBe(tickOfEvent(today));
      // Step 5a's stream up to it.
      expect(JSON.stringify(play.arm.events.filter((e) => e.seq < pick.seq)), play.name).toBe(JSON.stringify(play.s5a.filter((e) => e.seq < pick.seq)));
      // The play's movement family, at the deadline tick.
      const escape = play.arm.events.map(checkOf).find((c) => c?.checkKind === "scramble");
      const tick = tickOfEvent(pick) ?? Number.NaN;
      expect(checkOf(pick)?.roll?.rngLabel, play.name).toBe(escape?.roll?.rngLabel.replace(/\/movement\/t[\d.]+:scramble$/, `/movement/t${tick.toFixed(1)}:deadline`));
    }
    expect(reached).toBeGreaterThan(80);
    expect(untouched).toBeGreaterThan(1000);
  });

  it("today's pocket_movement CHECK over a ranking of its own: SOUND takes his first choice, any band below it the second", () => {
    const bands = new Map<string, number>();
    const chosen = new Map<string, number>();
    let second = 0;
    for (const play of theCorpus()) {
      const k = play.arm.events.findIndex(isDeadlinePick);
      if (k < 0) continue;
      const c = checkOf(play.arm.events[k] as MatchEventEnvelope);
      if (c?.roll === undefined) throw new Error("a deadline pick with no roll");
      const qb = qbOf(play);
      const pm = play.base.pocketMovement;
      expect(c.actors, play.name).toEqual([qb.bio.id]);
      expect(c.target, play.name).toBe(pm.target);
      expect(c.testsAttrs, play.name).toEqual([ATTR.poise, ATTR.awareness]);
      const terms = Math.round(getAttr(qb.attributes.values, ATTR.poise) / 5) + Math.round(getAttr(qb.attributes.values, ATTR.awareness) / 5);
      expect(c.roll.total - c.roll.raw, play.name).toBe(terms);
      expect(c.margin, play.name).toBe(c.roll.total - pm.target);
      const band = bandFor(pm.bands, c.margin);
      expect(c.band, play.name).toBe(band.label);
      expect("rollRef" in c, play.name).toBe(false);
      const ranked = deadlineRanking(play.base, { runMargin: 1 }, qb);
      const take = ranked[Math.min(band.takeRank, ranked.length - 1)];
      const decision = play.arm.events[k + 1];
      expect(decision?.event.type === "QB_DECISION" && decision.event.payload.choice, play.name).toBe(take === undefined ? undefined : choiceOf(take.response));
      bands.set(band.label, (bands.get(band.label) ?? 0) + 1);
      if (take !== undefined) chosen.set(take.response, (chosen.get(take.response) ?? 0) + 1);
      if (band.takeRank > 0) second += 1;
    }
    expect([...bands.keys()].sort()).toEqual(["PANICKED", "RUSHED", "SOUND"]);
    expect([...chosen.keys()].sort()).toEqual(["RUN", "THROWAWAY"]);
    for (const n of [...bands.values(), ...chosen.values()]) expect(n).toBeGreaterThan(3);
    expect(second).toBeGreaterThan(10);
  });

  it("RUN is today's run, a seq later; THROWAWAY is an OUT_OF_POCKET throwaway naming the CHECK, outside the tackle box, at 0 yards with today's runoff", () => {
    let runs = 0;
    let throwaways = 0;
    for (const play of theCorpus()) {
      const k = play.arm.events.findIndex(isDeadlinePick);
      if (k < 0) continue;
      const pick = play.arm.events[k] as MatchEventEnvelope;
      const label = checkOf(pick)?.roll?.rngLabel;
      const decision = play.arm.events[k + 1];
      if (decision?.event.type !== "QB_DECISION") throw new Error(`${play.name}: no decision after the pick`);
      expect("direction" in decision.event.payload, play.name).toBe(false);
      const after = play.arm.events.slice(k + 1);
      if (decision.event.payload.choice === "SCRAMBLE") {
        expect(strip(after, 1), play.name).toEqual(strip(play.s5a.filter((e) => e.seq >= pick.seq), 0));
        expect(play.arm.records, play.name).toEqual([]);
        runs += 1;
        continue;
      }
      expect(decision.event.payload.choice, play.name).toBe("THROWAWAY");
      expect(after.map((e) => e.event.type), play.name).toEqual(["QB_DECISION", "PLAY_RESULT"]);
      const result = after[1];
      if (result?.event.type !== "PLAY_RESULT") throw new Error("no result");
      const tick = tickOfEvent(pick) ?? Number.NaN;
      expect(result.event.payload, play.name).toEqual({ yards: 0, turnover: false, clockRunoff: tick + play.base.result.clockRunoff.throwaway });
      expect(play.arm.records, play.name).toEqual([
        { kind: "outOfPocketThrowaway", payload: { cause: "OUT_OF_POCKET", rollRef: label, outsideTackleBox: true }, at: { seq: decision.seq + 1, tick } },
      ]);
      throwaways += 1;
    }
    expect(runs).toBeGreaterThan(20);
    expect(throwaways).toBeGreaterThan(20);
  });

  it("with escape direction on, the deadline's decision still carries none, either way", () => {
    let checked = 0;
    for (const play of corpus(PICK_DIRECTION, 12, "dir")) {
      const k = play.arm.events.findIndex(isDeadlinePick);
      if (k < 0) continue;
      const decision = play.arm.events[k + 1];
      expect(decision?.event.type, play.name).toBe("QB_DECISION");
      expect(records(play.arm.records, "direction").filter((r) => r.at.seq === decision?.seq), play.name).toEqual([]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(30);
  });

  it("every throwaway on a play under the pick carries outsideTackleBox: false in the pocket, true out of it (S-15)", () => {
    let inPocket = 0;
    let outOfPocket = 0;
    for (const play of theCorpus()) {
      const onStream = play.arm.events.filter((e) => e.event.type === "THROWAWAY");
      const flags = records(play.arm.records, "outsideTackleBox");
      expect(flags.map((r) => r.at.seq), play.name).toEqual(onStream.map((e) => e.seq));
      for (const r of flags) if (r.kind === "outsideTackleBox") expect(r.value, play.name).toBe(false);
      for (const e of onStream) if (e.event.type === "THROWAWAY") expect(e.event.payload.cause, play.name).not.toBe("OUT_OF_POCKET");
      inPocket += onStream.length;
      for (const r of records(play.arm.records, "outOfPocketThrowaway")) {
        if (r.kind !== "outOfPocketThrowaway") continue;
        expect(r.payload.outsideTackleBox, play.name).toBe(r.payload.cause === "OUT_OF_POCKET");
        outOfPocket += 1;
      }
      // Nothing else is recorded under the pick alone.
      for (const r of play.arm.records) expect(["outsideTackleBox", "outOfPocketThrowaway"], play.name).toContain(r.kind);
    }
    expect(inPocket).toBeGreaterThan(20);
    expect(outOfPocket).toBeGreaterThan(20);
  });

  it("no desperation throw after a clean break-out (D23 on the run, kept): every throw on the run is at the normal bar", () => {
    let cleanOuts = 0;
    let cleanThrows = 0;
    let cleanPicks = 0;
    for (const shape of SHAPES) {
      for (const [fixture, build] of FIXTURES) {
        for (let i = 0; i < 25; i++) {
          selectSpy.mockClear();
          const { state, calls: raw } = build();
          const calls = shape.picture ? withPicture(state, raw) : raw;
          const { events } = playS6(state, calls, `deadline-d23-${fixture}-${i}`, withOuts(shape.base, PICK));
          const pursuit = events.findIndex((e) => e.event.type === "QB_PURSUIT");
          if (pursuit < 0) continue;
          const picks = events.slice(0, pursuit).filter((e) => checkOf(e)?.checkKind === "pocket_movement");
          const last = picks[picks.length - 1];
          if (!(checkOf(last as MatchEventEnvelope)?.roll?.rngLabel ?? "").endsWith(":clean")) continue;
          cleanOuts += 1;
          if (events.some(isDeadlinePick)) cleanPicks += 1;
          const pool = selectSpy.mock.calls[0]?.[2];
          if (pool === undefined) continue;
          cleanThrows += 1;
          expect(Math.max(...pool.map((c) => c.effectiveOpenness)), `${shape.name} ${fixture} ${i}`).toBeGreaterThanOrEqual(throwThresholdFor(shape.base, calls.offense.readSystem));
        }
      }
    }
    expect(cleanOuts).toBeGreaterThan(20);
    expect(cleanThrows).toBeGreaterThan(5);
    expect(cleanPicks).toBeGreaterThan(0);
  });

  it("same seed, same stream and records", () => {
    for (const play of theCorpus().slice(0, 150)) {
      expect(JSON.stringify(playS6(play.state, play.calls, play.seed, withOuts(play.base, PICK))), play.name).toBe(JSON.stringify(play.arm));
    }
  });
});

describe("ADR-089 step 6, 2.11: the deadline's ranking", () => {
  const baseline = makePlayer("qb-b", "Baseline", "QB", { mobility: 70, improvisation: 70, decisionMaking: 70, awareness: 70, poise: 70 });
  const filed = OUTS_FILED.deadlinePick;
  if (filed === undefined) throw new Error("the filed block has no deadline pick");

  it("at urgency 0: THROWAWAY is today's throwaway appeal, RUN its base plus the margin plus today's escape terms; a baseline quarterback ranks RUN first, 26 against 25", () => {
    expect(DEADLINE_URGENCY).toBe(0);
    expect(deadlineRanking(T, filed, baseline)).toEqual([
      { response: "RUN", appeal: 26 },
      { response: "THROWAWAY", appeal: 25 },
    ]);
    const appeal = T.pocketMovement.appeal;
    expect(deadlineRanking(T, filed, baseline).find((r) => r.response === "THROWAWAY")?.appeal).toBe(appealFrom(T, baseline, appeal.throwaway, 0));
    // Each term rounded on its own, as every appeal is.
    const quick = makePlayer("qb-q", "Quick", "QB", { mobility: 85, improvisation: 86, decisionMaking: 70, awareness: 70 });
    expect(deadlineRanking(T, filed, quick)).toEqual([
      { response: "RUN", appeal: 26 + Math.round(15 / 1.5) + Math.round(16 / 1.5) },
      { response: "THROWAWAY", appeal: 25 },
    ]);
    const careful = makePlayer("qb-c", "Careful", "QB", { mobility: 70, improvisation: 70, decisionMaking: 94, awareness: 92 });
    expect(deadlineRanking(T, filed, careful)).toEqual([
      { response: "THROWAWAY", appeal: 25 + Math.round(24 / 3) + Math.round(22 / 4) },
      { response: "RUN", appeal: 26 },
    ]);
    // A statue: below the baseline both ways, by how much each of his ratings is below it.
    const statue = makePlayer("qb-s", "Statue", "QB", { mobility: 40, improvisation: 55, decisionMaking: 70, awareness: 70 });
    expect(deadlineRanking(T, filed, statue)).toEqual([
      { response: "THROWAWAY", appeal: 25 },
      { response: "RUN", appeal: 26 + Math.round(-30 / 1.5) + Math.round(-15 / 1.5) },
    ]);
  });

  it("a tie ranks THROWAWAY first (strict: a tie is not RUN first)", () => {
    const even = { runMargin: 0 } as unknown as DeadlinePickTunables;
    expect(deadlineRanking(T, even, baseline)).toEqual([
      { response: "THROWAWAY", appeal: 25 },
      { response: "RUN", appeal: 25 },
    ]);
    // And a quarterback whose terms make the two equal at the filed margin.
    const level = makePlayer("qb-l", "Level", "QB", { mobility: 70, improvisation: 70, decisionMaking: 73, awareness: 70 });
    expect(deadlineRanking(T, filed, level)).toEqual([
      { response: "THROWAWAY", appeal: 26 },
      { response: "RUN", appeal: 26 },
    ]);
  });

  it("the leaf is K9's margin: the filed inequality (Δ + 5u > 8u) at the deadline's urgency alone gives 1, and over 0 to 3 the step-0 filing's 10", () => {
    const run = T.pocketMovement.appeal.escape.perUrgencyStep;
    const away = T.pocketMovement.appeal.throwaway.perUrgencyStep;
    expect([run, away]).toEqual([5, 8]);
    const smallest = (urgencies: readonly number[]): number => {
      for (let delta = -100; delta <= 200; delta++) if (urgencies.every((u) => delta + run * u > away * u)) return delta;
      throw new Error("no margin");
    };
    expect(smallest([DEADLINE_URGENCY])).toBe(filed.runMargin);
    expect(filed).toEqual({ runMargin: 1 });
    const top = Math.round(T.pocketMovement.urgencyHorizonSeconds / T.clock.tickStepSeconds);
    expect(top).toBe(3);
    expect(smallest(Array.from({ length: top + 1 }, (_, u) => u))).toBe(10);
    // At the leaf a baseline quarterback leads by exactly the margin; one less and THROWAWAY leads.
    const [first, next] = deadlineRanking(T, filed, baseline);
    expect([first?.response, (first?.appeal ?? 0) - (next?.appeal ?? 0)]).toEqual(["RUN", filed.runMargin]);
  });
});
