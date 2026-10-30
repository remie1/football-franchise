/**
 * ADR-089 step 2 — CALIBRATION'S OWN B3 PARTS FROM B7 WHERE, AND ONLY WHERE, THE RULE SAYS (review
 * CT-F2; plan §1.7; the §4.3 forcing rule).
 *
 * B3 and B7 are the same bundle on the same clock but for the forcing block: B3 is must act per
 * rusher (PER_RUSHER), B7 step 1's rule. On step 1's clock a threat inside C floors the status at
 * COLLAPSING, so the two decide alike on every tick but one kind: the status forces and no threat
 * is inside C (a "chance", `MustActFold.chances`). There B7 opens the movement gate and B3 does not.
 * On the golden games such ticks are rare (the stream proof's power is low there, CT-F1), so this
 * test does not wait for a corpus to supply one: it plays calibration's own arms (`armById`, the
 * graded bundles) on the golden games' real plays, each re-played on ten seeds of its own through
 * `simulatePlay`, over at least ten games and until it has found partings, and checks each one:
 *
 *  - B3's stream differs from B7's (the `PLAY_START` rules stamp aside) only on a play where B7's
 *    stream holds a chance, and the first tick on which they differ is one: B7's status forces
 *    there with no threat inside C, and B7 makes a forced act on it;
 *  - at least one parting is a hold: B3 makes the closing HOLD on that tick and plays on;
 *  - every play B3 made, scanned or parted, passes the falsifier (`mustActCheck`, 0 failures);
 *  - B4 (the narrower counter) differs from B7 on at least one play.
 *
 * The plays are captured once a game under B7 with the frozen caller, as the corpora call them.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { createMatchState, simulateGame, simulatePlay, type PlayCalls } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { capturePlays } from "../src/harness/playScope.js";
import { buildFixture } from "../src/harness/schedule.js";
import { armById } from "../src/pocket/arms.js";
import { goldenFixtures } from "../src/pocket/corpus.js";
import { forcingRuleOf } from "../src/pocket/m2ForcingSource.js";
import { closingHoldsOf, emptyMustActFold, forcedActsOf, mustActCheck, readS2Play, s2ContextOf, threatPartAt, type S2Play } from "../src/pocket/s2Stream.js";

/** The search: golden games of the flat league, in order, at least `MIN_GAMES` of them and at most `MAX_GAMES`. */
const MIN_GAMES = 10;
const MAX_GAMES = 50;
const SEEDS_A_PLAY = 10;
const TOLERANCE = 1e-9;

const B3 = armById("B3").tunables;
const B4 = armById("B4").tunables;
const B7 = armById("B7").tunables;

/** The stream with `PLAY_START`'s rules stamp blanked, one JSON line an event. */
const lines = (events: readonly MatchEventEnvelope[]): string[] =>
  events.map((e) => JSON.stringify(e.event.type === "PLAY_START" ? { ...e, event: { ...e.event, payload: { ...(e.event.payload as object), rules: null } } } : e));

/** The tick of the event at `index`: the latest TICK at or before it, 0 before the first. */
function tickAt(events: readonly MatchEventEnvelope[], index: number): number {
  let t = 0;
  for (let i = 0; i <= index; i += 1) {
    const ev = events[i]!.event;
    if (ev.type === "TICK") t = ev.payload.tick;
  }
  return t;
}

function passPlay(events: readonly MatchEventEnvelope[]): S2Play | undefined {
  const first = events[0]?.event as { readonly playId?: unknown } | undefined;
  return readS2Play(String(first?.playId ?? ""), events);
}

interface Parting {
  readonly where: string;
  readonly tick: number;
  /** B7's status on that tick forces and no threat is inside C. */
  readonly b7Chance: boolean;
  /** B7 makes a forced act on that tick. */
  readonly b7Acts: boolean;
  /** B3 makes the closing HOLD on that tick, and its play ends later. */
  readonly b3HoldsThenPlays: boolean;
}

describe("B3 parts from B7 only where the rule says (review CT-F2)", () => {
  it("on the golden games' plays re-played on their own seeds: partings on B7's chances only, one of them a hold, B3 never failing the falsifier, B4 differing too", () => {
    expect(forcingRuleOf(B3)).toBe("PER_RUSHER");
    expect(forcingRuleOf(B7)).toBe("STEP_1");
    expect(forcingRuleOf(B4)).toBe("COUNTER_LESS_SEEN");
    const { index, fixtures, seeds } = goldenFixtures("flat");
    const b3Fold = emptyMustActFold();
    const partings: Parting[] = [];
    let plays = 0;
    let equalWithoutChance = 0;
    let partedWithoutChance = 0;
    let b4Differs = 0;
    let games = 0;
    for (let i = 0; i < Math.min(MAX_GAMES, fixtures.length); i += 1) {
      games += 1;
      const built = buildFixture(index, fixtures[i]!);
      const coordinates = { season: built.fixture.season, week: built.fixture.week, home: built.fixture.home, away: built.fixture.away };
      const pair = frozenCallerPair({ tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, homeDepthChart: built.homeDepthChart, awayDepthChart: built.awayDepthChart });
      const capture = capturePlays(pair, { coordinates, at: built.at });
      const result = simulateGame(createMatchState(coordinates, built.snapshot, B7), { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } }, seeds[i]!, B7);
      const ctx3 = s2ContextOf(B3, built.snapshot);
      const ctx7 = s2ContextOf(B7, built.snapshot);
      for (const captured of capture.finish(result.events)) {
        if (captured.calls.offense.kind === "RUN") continue;
        for (let k = 0; k < SEEDS_A_PLAY; k += 1) {
          const seed = `${seeds[i]!}:s2part${String(k)}`;
          const e7 = simulatePlay(captured.state, captured.calls as PlayCalls, seed, B7).events;
          const e3 = simulatePlay(captured.state, captured.calls as PlayCalls, seed, B3).events;
          const e4 = simulatePlay(captured.state, captured.calls as PlayCalls, seed, B4).events;
          const p3 = passPlay(e3);
          const p7 = passPlay(e7);
          if (p3 === undefined || p7 === undefined) continue;
          plays += 1;
          mustActCheck(b3Fold, p3, ctx3);
          const f7 = emptyMustActFold();
          mustActCheck(f7, p7, ctx7);
          const l3 = lines(e3);
          const l7 = lines(e7);
          if (lines(e4).join("\n") !== l7.join("\n")) b4Differs += 1;
          const first = l7.findIndex((line, j) => l3[j] !== line);
          const parted = first >= 0 || l3.length !== l7.length;
          if (!parted) {
            if (f7.chances === 0) equalWithoutChance += 1;
            continue;
          }
          if (f7.chances === 0) {
            partedWithoutChance += 1;
            continue;
          }
          const T = tickAt(e7, first >= 0 ? first : l7.length - 1);
          const s7 = p7.statuses.find((s) => Math.abs(s.tick - T) < TOLERANCE);
          const b7Chance = s7 !== undefined && ctx7.forcing.has(s7.status) && !threatPartAt(s7, ctx7.C);
          const b7Acts = forcedActsOf(p7, B7).some((a) => !a.afterPursuit && Math.abs(a.tick - T) < TOLERANCE);
          const b3HoldsThenPlays = closingHoldsOf(p3).some((h) => Math.abs(h.tick - T) < TOLERANCE) && p3.dropback.endTick > T + TOLERANCE;
          partings.push({ where: `game ${String(i)} play ${String(captured.ordinal)} seed ${seed}`, tick: T, b7Chance, b7Acts, b3HoldsThenPlays });
        }
      }
      if (games >= MIN_GAMES && partings.some((p) => p.b3HoldsThenPlays) && b4Differs > 0) break;
    }
    console.log(
      `CT-F2: ${String(games)} golden flat games, ${String(plays)} PASS plays x seeds; B3 parts from B7 on ${String(partings.length)} ` +
        `(${String(partings.filter((p) => p.b3HoldsThenPlays).length)} a hold), ${String(partedWithoutChance)} without a B7 chance; ` +
        `${String(equalWithoutChance)} equal with no chance; B4 differs on ${String(b4Differs)}; B3's falsifier ${String(b3Fold.problemCount)} failures in ${String(b3Fold.acts)} forced acts; ` +
        `first: ${JSON.stringify(partings[0] ?? null)}`,
    );
    expect(partedWithoutChance, "B3 parts from B7 only on a play where B7 had a chance").toBe(0);
    expect(partings.length, "a parting found within the bound").toBeGreaterThan(0);
    for (const p of partings) {
      expect(p.b7Chance, `${p.where}: B7's status forces at ${String(p.tick)} s with no threat inside C`).toBe(true);
      expect(p.b7Acts, `${p.where}: B7 makes a forced act at ${String(p.tick)} s`).toBe(true);
    }
    expect(partings.some((p) => p.b3HoldsThenPlays), "B3 holds on a tick B7 acts on, and plays on").toBe(true);
    expect(b3Fold.problemCount, `B3's falsifier: ${b3Fold.problems[0] ?? ""}`).toBe(0);
    expect(b3Fold.witness.problemCount, `B3's witnesses: ${b3Fold.witness.problems[0] ?? ""}`).toBe(0);
    expect(b3Fold.acts).toBeGreaterThan(0);
    expect(equalWithoutChance).toBeGreaterThan(0);
    expect(b4Differs, "B4 differs from B7 on at least one play").toBeGreaterThan(0);
  }, 600_000);
});
