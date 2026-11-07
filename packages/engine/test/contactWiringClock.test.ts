/**
 * ADR-089 step 4: WHAT THE PLAY HANDS THE CONTACT BOOK AND THE REBUILD (`sim/passPlay.ts`; D21;
 * §4.5 item 6; review CT4-3).
 *
 * The book, the beat draw, the rebuild and the move branch are watched through their own modules
 * (each wraps the real function, so every play runs as it would). On corpora of the pass fixtures
 * under the design's shape, shape S and shape L, they hold:
 *  - every DELAYED publication reaches the book with the same wait, a STEP_UP's among them (M14);
 *  - a won rep under shape S starts its contact time at the beat's own breaking time `T` when the
 *    threat is built on the beat's tick (M17);
 *  - a won rep under shape L starts its crossing from the margin on the win's tick and the margin on
 *    the tick before, as the stream's `pass_rush_tick` CHECKs carry them (M16);
 *  - every shed that does not end the play is followed by one rebuild on its tick, and the move
 *    branch on that tick runs only when the rebuild forces him and reads the rebuilt threats (M19,
 *    M19b).
 * Each clause counts the cases that can tell a fault from the truth and requires some.
 */
import { describe, expect, it, vi } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import type { CrossingAtWin } from "../src/sim/contactBook.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES, tickOf } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S4L_TUNABLES, S4S_TUNABLES, S4_TUNABLES, playStep4 } from "./step4Fixtures.js";
import type { Step4Play } from "./step4Fixtures.js";

type Call =
  | { readonly kind: "DELAYED"; readonly rusher: string; readonly before: number; readonly after: number }
  | { readonly kind: "WON_S"; readonly rusher: string; readonly wonAtTick: number; readonly breaking: number }
  | { readonly kind: "WON_L"; readonly rusher: string; readonly wonAtTick: number; readonly margin: number; readonly previousMargin: number | undefined }
  | { readonly kind: "BEAT"; readonly rusher: string; readonly T: number; readonly tick: number | undefined }
  | { readonly kind: "REBUILD"; readonly tick: number; readonly threats: unknown; readonly forced: boolean }
  | { readonly kind: "MOVEMENT"; readonly tick: number; readonly threats: unknown };

const spy = vi.hoisted(() => ({ calls: [] as Call[] }));

vi.mock("../src/sim/contactBook.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/contactBook.js")>();
  class WatchedBook extends real.ContactBook {
    override startWonRepS(threat: ArrivalClock, breakingSeconds: number): void {
      spy.calls.push({ kind: "WON_S", rusher: String(threat.rusher), wonAtTick: threat.wonAtTick, breaking: breakingSeconds });
      super.startWonRepS(threat, breakingSeconds);
    }
    override startWonRepL(threat: ArrivalClock, crossing: CrossingAtWin): void {
      spy.calls.push({
        kind: "WON_L",
        rusher: String(threat.rusher),
        wonAtTick: threat.wonAtTick,
        margin: crossing.margin,
        previousMargin: crossing.previousMargin,
      });
      super.startWonRepL(threat, crossing);
    }
    override delayed(before: ArrivalClock, after: ArrivalClock): void {
      spy.calls.push({ kind: "DELAYED", rusher: String(before.rusher), before: before.etaTick, after: after.etaTick });
      super.delayed(before, after);
    }
  }
  return { ...real, ContactBook: WatchedBook };
});

vi.mock("../src/resolve/beatClock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/beatClock.js")>();
  return {
    ...real,
    drawBeat: (args: Parameters<typeof real.drawBeat>[0]) => {
      const out = real.drawBeat(args);
      spy.calls.push({ kind: "BEAT", rusher: String(args.rusher.bio.id), T: out.T, tick: out.tick });
      return out;
    },
  };
});

vi.mock("../src/sim/contactTick.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/contactTick.js")>();
  return {
    ...real,
    rebuiltTick: (args: Parameters<typeof real.rebuiltTick>[0]) => {
      const out = real.rebuiltTick(args);
      spy.calls.push({ kind: "REBUILD", tick: args.tick, threats: out.threats, forced: out.forced });
      return out;
    },
  };
});

vi.mock("../src/resolve/pocketMovement.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/pocketMovement.js")>();
  return {
    ...real,
    resolvePocketMovement: (args: Parameters<typeof real.resolvePocketMovement>[0]) => {
      spy.calls.push({ kind: "MOVEMENT", tick: args.tick, threats: args.threats });
      return real.resolvePocketMovement(args);
    },
  };
});

type Payload = Record<string, unknown>;
const payloadOf = (e: MatchEventEnvelope): Payload => e.event.payload as unknown as Payload;

interface Watched extends Step4Play {
  readonly label: string;
  readonly calls: readonly Call[];
}

const SEEDS = 40;
const SETS: readonly (readonly [string, Tunables, boolean])[] = [
  ["S4", S4_TUNABLES, true],
  ["S4S", S4S_TUNABLES, false],
  ["S4L", S4L_TUNABLES, false],
];

const corpus: readonly Watched[] = (() => {
  const out: Watched[] = [];
  for (const [set, tunables, pictured] of SETS) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) {
        const { state, calls: raw } = build();
        const calls = pictured ? withPicture(state, raw) : raw;
        spy.calls.length = 0;
        const p = playStep4(state, calls, `cw-${String(i)}`, tunables);
        out.push({ ...p, label: `${set} ${fixture} cw-${String(i)}`, calls: [...spy.calls] });
      }
    }
  }
  return out;
})();

const roundTick = (x: number): number => Number(x.toFixed(1));

describe("ADR-089 step 4: every DELAYED wait joins the contact book (CT4-3 M14)", () => {
  it("each DELAYED publication has its book entry, in order, with the same wait; a STEP_UP's among them", () => {
    let stepUpDelays = 0;
    for (const p of corpus) {
      const published = p.events
        .filter((e) => e.event.type === "RUSH_THREAT" && payloadOf(e)["state"] === "DELAYED")
        .map((e) => `${String(payloadOf(e)["rusher"])}@${String(payloadOf(e)["etaTick"])}`);
      const booked = p.calls.flatMap((c) => (c.kind === "DELAYED" ? [`${c.rusher}@${String(c.after)}`] : []));
      expect(booked, p.label).toEqual(published);
      // DELAYED publications that a STEP_UP made: those right after the decision, before any other event.
      for (let i = 0; i < p.events.length; i++) {
        const e = p.events[i]!;
        if (e.event.type !== "QB_DECISION" || payloadOf(e)["choice"] !== "STEP_UP") continue;
        for (let j = i + 1; j < p.events.length; j++) {
          const f = p.events[j]!;
          if (f.event.type !== "RUSH_THREAT") break;
          if (payloadOf(f)["state"] === "DELAYED") stepUpDelays++;
        }
      }
    }
    expect(stepUpDelays).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 4: a won rep's contact time starts where the win was made (CT4-3 M17, M16)", () => {
  it("shape S: a threat built on the beat's tick starts at the beat's own breaking time T", () => {
    let onBeat = 0;
    let offGrid = 0;
    for (const p of corpus) {
      const lastBeat = new Map<string, Extract<Call, { kind: "BEAT" }>>();
      for (const c of p.calls) {
        if (c.kind === "BEAT") lastBeat.set(c.rusher, c);
        if (c.kind !== "WON_S") continue;
        const beat = lastBeat.get(c.rusher);
        if (beat === undefined || beat.tick !== c.wonAtTick) continue;
        onBeat++;
        expect(c.breaking, p.label).toBe(beat.T);
        if (beat.T !== c.wonAtTick) offGrid++;
      }
    }
    expect(onBeat).toBeGreaterThan(0);
    expect(offGrid).toBeGreaterThan(0);
  });

  it("shape L: the crossing reads the win's margin and the margin on the tick before, as the stream carries them", () => {
    const step = S4L_TUNABLES.clock.tickStepSeconds;
    let read = 0;
    let previousNonZero = 0;
    for (const p of corpus) {
      if (!p.label.startsWith("S4L ")) continue;
      const marginAt = (rusher: string, tick: number): number[] =>
        p.events
          .filter((e) => {
            const d = payloadOf(e);
            return e.event.type === "CHECK" && d["checkKind"] === "pass_rush_tick" && String((d["actors"] as unknown[])[0]) === rusher && tickOf(e) === tick;
          })
          .map((e) => payloadOf(e)["margin"] as number);
      for (const c of p.calls) {
        if (c.kind !== "WON_L") continue;
        const now = marginAt(c.rusher, c.wonAtTick);
        expect(now, p.label).toEqual([c.margin]);
        const before = marginAt(c.rusher, roundTick(c.wonAtTick - step));
        if (before.length === 0) continue;
        read++;
        expect(before.length, p.label).toBe(1);
        expect(c.previousMargin, p.label).toBe(before[0]);
        if (before[0] !== 0) previousNonZero++;
      }
    }
    expect(read).toBeGreaterThan(0);
    expect(previousNonZero).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 4: the rebuild after a shed, and what the move branch reads (CT4-3 M19, M19b)", () => {
  it("one rebuild on each shed's tick the play outlives; the move branch runs only when it forces him, on its threats", () => {
    let sheds = 0;
    let moved = 0;
    for (const p of corpus) {
      const sackTicks = new Set(p.records.flatMap((r) => (r.kind === "QB_HIT" && r.payload.phase === "SACK" ? [r.at.tick] : [])));
      const shedTicks = new Set(
        p.records.flatMap((r) => (r.kind === "QB_HIT" && r.payload.phase === "SHED" && !sackTicks.has(r.at.tick) ? [r.at.tick] : [])),
      );
      for (const tick of shedTicks) {
        sheds++;
        const rebuilds = p.calls.filter((c): c is Extract<Call, { kind: "REBUILD" }> => c.kind === "REBUILD" && c.tick === tick);
        expect(rebuilds.length, `${p.label} t${String(tick)}`).toBe(1);
        const rebuilt = rebuilds[0]!;
        const movements = p.calls.filter((c): c is Extract<Call, { kind: "MOVEMENT" }> => c.kind === "MOVEMENT" && c.tick === tick);
        if (!rebuilt.forced) {
          expect(movements, `${p.label} t${String(tick)}`).toEqual([]);
          continue;
        }
        expect(movements.length, `${p.label} t${String(tick)}`).toBe(1);
        expect(movements[0]!.threats, `${p.label} t${String(tick)}`).toBe(rebuilt.threats);
        moved++;
      }
    }
    expect(sheds).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(0);
  });
});
