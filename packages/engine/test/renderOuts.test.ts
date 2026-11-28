/**
 * ADR-089 step 6 (step-6 plan §2.13): THE RENDERER READS THE OUTS (`debug/renderPlay.ts`).
 *
 * P9 to P12 are in contracts, so the stream carries their facts (the OUT_OF_POCKET throwaway, the
 * throwaway's `outsideTackleBox`, the decision's `direction` and the `scramble_drill` CHECK) and these
 * tests render the play's own events. Before the lift they rendered the events with a test
 * recorder's records put where the stream now carries them, as `renderContact.test.ts` rendered
 * step 4's facts before P6 and P7 were in contracts. The plays are the full tree (every part on, the
 * recommended answers, `OUTS_FILED`) on the three s5a shapes, every pass fixture and a few that
 * escape often.
 *
 * 1. The drill reps: one row per `scramble_drill` CHECK, with its roll, target and band, after the
 *    pocket movement section.
 * 2. The deadline pick: its `pocket_movement` row says so; a throwaway after it prints the
 *    OUT_OF_POCKET line, outside the tackle box, and a run prints none.
 * 3. The direction, on each decision that carries it, and on no other.
 * 4. A caught escape's contact: the contest right after a CAUGHT_FROM_BEHIND escape roll on its tick
 *    says so, and no other contest does.
 * 5. A scramble at or behind the line: below 0 yards (the scramble start `ZERO_GAIN_ONLY` puts a run
 *    that gains nothing behind the line by his drop) "tackled behind the line", a sack on a marked
 *    play and a run for a loss without the marker; at 0 on a marked play (the failed scramble scored
 *    as a sack, alone) "tackled at the line", a sack; at 0 without the marker, and above 0, no row.
 *    The full tree is not used here: it runs so seldom on these fixtures (2 scramble runs in 468
 *    plays, MEASURED by a probe on these seeds; the deadline pick throws most of them away) that it
 *    would show none of the cases.
 * 6. Nothing new without the outs: the printout of 312 s5a plays is pinned to its digest MEASURED
 *    with the renderer as at `564e2a3` (before this section's lines; legacy has its own pin in
 *    `renderPlay.test.ts`), and none of the new words is in it. On the stream each RollDetail is
 *    printed at most once (ADR-004, rendered).
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, RollDetail } from "@ff/contracts";
import { setAttr } from "@ff/contracts";
import type { PlayerState } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { renderPlay } from "../src/debug/renderPlay.js";
import { simulatePassPlay } from "../src/index.js";
import type { Tunables } from "../src/tunables.js";
import { buildStalledPocketScenario } from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import { PASS_FIXTURES, buildBullRushScenario } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, tickOfEvent } from "./step5Fixtures.js";
import { OUTS_FILED, outsParts, playS6, withOuts } from "./step6Fixtures.js";

const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
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

/** Every pass fixture, and two that reach the deadline often (a panicky quarterback throws it away there more). */
const FIXTURES: readonly (readonly [string, () => Scenario])[] = [
  ...PASS_FIXTURES,
  ["stalled pocket, panicky", () => withQb(buildStalledPocketScenario(), { poise: 10, awareness: 10 })],
  ["bull rush, panicky", () => withQb(buildBullRushScenario(), { poise: 10, awareness: 10 })],
];

interface Rendered {
  readonly where: string;
  readonly events: readonly MatchEventEnvelope[];
  readonly text: string;
}

/** Each play of the corpus under `block`, printed. */
function corpus(block = OUTS_FILED, seeds = 12, tag = "full"): Rendered[] {
  const out: Rendered[] = [];
  for (const { name, base, picture } of SHAPES) {
    for (const [fixture, build] of FIXTURES) {
      for (let i = 0; i < seeds; i++) {
        const { state, calls, names } = build();
        const { events } = playS6(state, picture ? withPicture(state, calls) : calls, `render-s6-${tag}-${fixture}-${i}`, withOuts(base, block));
        out.push({ where: `${name} ${fixture} ${i}`, events, text: renderPlay(events, names) });
      }
    }
  }
  return out;
}

const count = (text: string, word: string): number => text.split(word).length - 1;
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const tick = (e: MatchEventEnvelope): string => {
  const t = tickOfEvent(e);
  return t === undefined ? "-" : t.toFixed(1);
};
const isDeadline = (e: MatchEventEnvelope): boolean => checkOf(e)?.checkKind === "pocket_movement" && (checkOf(e)?.roll?.rngLabel ?? "").endsWith(":deadline");
const payloadOf = (e: MatchEventEnvelope): Record<string, unknown> => e.event.payload as Record<string, unknown>;
const isDrill = (e: MatchEventEnvelope): boolean => e.event.type === "CHECK" && e.event.payload.checkKind === "scramble_drill";
const isOutOfPocket = (e: MatchEventEnvelope): boolean => e.event.type === "THROWAWAY" && e.event.payload.cause === "OUT_OF_POCKET";

/** The contests right after a CAUGHT_FROM_BEHIND escape roll on its tick, only an ARRIVED between (2.8's stream). */
function caughtContests(events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] {
  const out: MatchEventEnvelope[] = [];
  for (const [k, e] of events.entries()) {
    const c = checkOf(e);
    if (c?.checkKind !== "scramble" || c.band !== "CAUGHT_FROM_BEHIND") continue;
    let j = k + 1;
    if (events[j]?.event.type === "RUSH_THREAT") j += 1;
    const next = events[j];
    if (next !== undefined && checkOf(next)?.checkKind === "arrival_contest" && tickOfEvent(next) === tickOfEvent(e)) out.push(next);
  }
  return out;
}

const FULL = corpus();

describe("ADR-089 step 6: the renderer prints the outs from the stream", () => {
  it("the drill reps: one row per scramble_drill CHECK, with its roll, target and band, after the pocket movement", () => {
    let drills = 0;
    for (const { where, events, text } of FULL) {
      const rows = events.filter(isDrill);
      if (rows.length === 0) {
        expect(text, where).not.toContain("SCRAMBLE DRILL (");
        continue;
      }
      const section = text.slice(text.indexOf("SCRAMBLE DRILL ("));
      expect(text.indexOf("SCRAMBLE DRILL ("), where).toBeGreaterThan(text.indexOf("POCKET MOVEMENT ("));
      for (const e of rows) {
        const c = checkOf(e);
        if (c?.roll === undefined) throw new Error("a drill CHECK without its roll");
        expect(count(text, `[${c.roll.rngLabel}]`), where).toBe(1);
        expect(section, where).toContain(`[${c.roll.rngLabel}] vs. target ${c.target ?? "-"}`);
        expect(section, where).toContain(`Result: ${c.band ?? "-"} (${signed(c.margin)})`);
      }
      expect(count(section.slice(0, section.indexOf("\n\n")), "  ├─ Tick "), where).toBe(rows.length);
      drills += rows.length;
    }
    expect(drills).toBeGreaterThan(50);
  });

  it("the deadline pick: its row says so; a throwaway after it prints OUT_OF_POCKET, outside the tackle box; a run prints none", () => {
    let picks = 0;
    let away = 0;
    let runs = 0;
    for (const { where, events, text } of FULL) {
      const pickRows = events.filter(isDeadline);
      expect(count(text, "pocket movement (deadline: run or throw it away)"), where).toBe(pickRows.length);
      picks += pickRows.length;
      const thrown = events.filter(isOutOfPocket);
      for (const e of thrown) {
        expect(payloadOf(e)["outsideTackleBox"], where).toBe(true);
        expect(text, where).toContain(`Tick ${tick(e)}: throws it away out of the pocket (OUT_OF_POCKET, outside the tackle box; the deadline pick)`);
      }
      expect(count(text, "OUT_OF_POCKET"), where).toBe(thrown.length);
      away += thrown.length;
      if (pickRows.length > 0 && thrown.length === 0) runs += 1;
    }
    expect(picks).toBeGreaterThan(20);
    expect(away).toBeGreaterThan(5);
    expect(runs).toBeGreaterThan(5);
  });

  it("the direction: on each decision that carries it, and on no other", () => {
    let sides = 0;
    for (const { where, events, text } of FULL) {
      const withSide = events.filter((e) => e.event.type === "QB_DECISION" && "direction" in e.event.payload);
      for (const e of withSide) {
        if (e.event.type !== "QB_DECISION") continue;
        const p = payloadOf(e);
        const tier = e.event.payload.tier === undefined ? "" : ` [${e.event.payload.tier}]`;
        expect(text, where).toContain(`Tick ${tick(e)}: ${e.event.payload.choice}${tier} (direction ${String(p["direction"])})`);
      }
      expect(count(text, " (direction "), where).toBe(withSide.length);
      sides += withSide.length;
    }
    expect(sides).toBeGreaterThan(50);
  });

  it("a caught escape's contact: the contest right after the CAUGHT_FROM_BEHIND roll says so, and no other contest does", () => {
    let caught = 0;
    for (const { where, events, text } of FULL) {
      const contests = caughtContests(events);
      expect(count(text, " at the caught escape"), where).toBe(contests.length);
      for (const e of contests) {
        const second = checkOf(e)?.opposedRoll === undefined;
        expect(text, where).toContain(`Tick ${tick(e)}: ${second ? "second arrival" : "arrival contest"} at the caught escape`);
      }
      caught += contests.length;
    }
    expect(caught).toBeGreaterThan(5);
  });

  it("a scramble at or behind the line: behind it a sack with the marker and a run for a loss without; at it a sack with the marker only", () => {
    const rowFor = (yards: number, marked: boolean): string | undefined =>
      yards < 0
        ? marked
          ? `Failed scramble: tackled behind the line, a sack for a loss of ${-yards} (§8.8)`
          : `Tackled behind the line: a run for a loss of ${-yards}, from his drop (§8.8)`
        : marked && yards === 0
          ? "Failed scramble: tackled at the line, a sack for no loss (§8.8)"
          : undefined;
    const unmarked = (events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] =>
      events.map((e) => {
        if (e.event.type !== "PLAY_START") return e;
        const { scoring: _dropped, ...payload } = e.event.payload as Record<string, unknown>;
        return { ...e, event: { ...e.event, payload } } as MatchEventEnvelope;
      });
    const seen: Record<string, number> = {};
    const plays = [
      ...corpus(outsParts({ scrambleStart: "ZERO_GAIN_ONLY", failedScrambleSack: true }), 12, "start"),
      ...corpus(outsParts({ scrambleStart: "ZERO_GAIN_ONLY" }), 12, "start"),
      ...corpus(outsParts({ failedScrambleSack: true }), 12, "alone"),
    ];
    for (const { where, events, text } of plays) {
      const start = events.find((e) => e.event.type === "PLAY_START");
      const marked = (start?.event.payload as { readonly scoring?: unknown } | undefined)?.scoring !== undefined;
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      if (run?.event.type !== "RUN_RESOLUTION" || run.event.payload.carryType !== "SCRAMBLE") {
        expect(text, where).not.toContain("tackled behind the line");
        expect(text, where).not.toContain("Tackled behind the line");
        expect(text, where).not.toContain("Failed scramble");
        continue;
      }
      const yards = run.event.payload.yards;
      // The stream as played, then the same stream without the marker.
      for (const [rendered, isMarked] of [[text, marked], [renderPlay(unmarked(events), () => "?"), false]] as const) {
        const row = rowFor(yards, isMarked);
        if (row === undefined) {
          expect(rendered, where).not.toContain("ackled behind the line");
          expect(rendered, where).not.toContain("Failed scramble");
          expect(rendered, where).toContain(` tucks it and runs: ${yards} yards (SCRAMBLE \u2014 no designed gap)\n`);
        } else {
          expect(rendered, where).toContain(` tucks it and runs: ${yards} yards (SCRAMBLE \u2014 no designed gap)\n  └─ ${row}\n`);
        }
      }
      const key = yards > 0 ? "gained" : `${yards < 0 ? "behind" : "at"}, ${marked ? "marked" : "unmarked"}`;
      seen[key] = (seen[key] ?? 0) + 1;
    }
    expect(seen["behind, marked"]).toBeGreaterThan(10);
    expect(seen["behind, unmarked"]).toBeGreaterThan(10);
    expect(seen["at, marked"]).toBeGreaterThan(10);
    expect(seen["gained"]).toBeGreaterThan(10);
    expect(seen["at, unmarked"]).toBeUndefined();
  });

  it("each RollDetail on the stream is printed at most once (ADR-004, rendered)", () => {
    for (const { where, events, text } of FULL) {
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        const rolls: (RollDetail | undefined)[] = [event.payload.roll, event.payload.opposedRoll];
        for (const roll of rolls) {
          if (roll === undefined) continue;
          expect(count(text, `[${roll.rngLabel}]`), `${where} ${roll.rngLabel}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe("ADR-089 step 6: a stream without the outs prints as before", () => {
  /**
   * MEASURED: the printout of 312 s5a plays (the three shapes, the 13 pass fixtures, 8 seeds each)
   * with the renderer as at `564e2a3`, on the tree of `8009ee4` with part 2.11, before this
   * section's lines: 1820928 characters, FNV-1a `1e1eff7d`.
   */
  it("312 s5a plays print exactly as before the step-6 lines, and carry none of their words", () => {
    const fnv = (s: string): string => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16).padStart(8, "0");
    };
    let text = "";
    for (const { base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 8; i++) {
          const { state, calls, names } = build();
          const { events } = simulatePassPlay(state, picture ? withPicture(state, calls) : calls, `render-s5a-pin-${fixture}-${i}`, base);
          text += renderPlay(events, names);
        }
      }
    }
    for (const word of ["SCRAMBLE DRILL (", "(deadline: run or throw it away)", "OUT_OF_POCKET", " (direction ", " at the caught escape", "Failed scramble"]) {
      expect(text, word).not.toContain(word);
    }
    expect(text.length).toBe(1820928);
    expect(fnv(text)).toBe("1e1eff7d");
  });
});
