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
 *    M19b), on the design's order and on `contact.order` CONTEST_BEFORE_THROW (D13);
 *  - a throw on a shed's tick (CONTEST_BEFORE_THROW) reads the rebuilt pocket's accuracy row
 *    (review 2 B1).
 * Each clause counts the cases that can tell a fault from the truth and requires some: a rebuild
 * that no longer forces him is rare, so kind T's plays that reach one are pinned by seed.
 */
import { describe, expect, it, vi } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import type { CrossingAtWin } from "../src/sim/contactBook.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES, tickOf } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S4L_TUNABLES, S4S_TUNABLES, S4_TUNABLES, T_TUNABLES, playStep4 } from "./step4Fixtures.js";
import type { Step4Play } from "./step4Fixtures.js";

type Call =
  | { readonly kind: "DELAYED"; readonly rusher: string; readonly before: number; readonly after: number }
  | { readonly kind: "WON_S"; readonly rusher: string; readonly wonAtTick: number; readonly breaking: number }
  | { readonly kind: "WON_L"; readonly rusher: string; readonly wonAtTick: number; readonly margin: number; readonly previousMargin: number | undefined }
  | { readonly kind: "BEAT"; readonly rusher: string; readonly T: number; readonly tick: number | undefined }
  | { readonly kind: "REBUILD"; readonly tick: number; readonly threats: unknown; readonly forced: boolean; readonly pocket: string }
  | { readonly kind: "MOVEMENT"; readonly tick: number; readonly threats: unknown }
  | { readonly kind: "ACCURACY"; readonly label: string };

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
      spy.calls.push({ kind: "REBUILD", tick: args.tick, threats: out.threats, forced: out.forced, pocket: String(out.pocket) });
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

vi.mock("../src/resolve/throwExecution.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/throwExecution.js")>();
  return {
    ...real,
    resolveAccuracy: (args: Parameters<typeof real.resolveAccuracy>[0]) => {
      spy.calls.push({ kind: "ACCURACY", label: args.accuracyPenalty.label });
      return real.resolveAccuracy(args);
    },
  };
});

type Payload = Record<string, unknown>;
const payloadOf = (e: MatchEventEnvelope): Payload => e.event.payload as unknown as Payload;

interface Watched extends Step4Play {
  readonly label: string;
  readonly calls: readonly Call[];
}

/** `t` with the contest before the throw checks (D13's order, information only). */
const contestFirst = (t: Tunables): Tunables => {
  const contact = t.pocket.contact;
  if (contact === undefined) throw new Error("contestFirst: no contact block");
  return { ...t, pocket: { ...t.pocket, contact: { ...contact, order: "CONTEST_BEFORE_THROW" } } };
};

const SEEDS = 40;
const SETS: readonly (readonly [string, Tunables, boolean])[] = [
  ["S4", S4_TUNABLES, true],
  ["S4S", S4S_TUNABLES, false],
  ["S4L", S4L_TUNABLES, false],
  ["T", T_TUNABLES, false],
  ["S4S-CBT", contestFirst(S4S_TUNABLES), false],
  ["T-CBT", contestFirst(T_TUNABLES), false],
];
/**
 * Kind T plays (the base fixture) whose shed is followed by a rebuild that no longer forces him:
 * 16 such sheds in 13,000 kind-T plays, none in the first 40 seeds of any fixture, so these are named.
 */
const UNFORCED_SEEDS: readonly number[] = [167, 579, 801, 979];

const corpus: readonly Watched[] = (() => {
  const out: Watched[] = [];
  const play = (set: string, tunables: Tunables, pictured: boolean, fixture: string, build: (typeof PASS_FIXTURES)[number][1], i: number): void => {
    const { state, calls: raw } = build();
    const calls = pictured ? withPicture(state, raw) : raw;
    spy.calls.length = 0;
    const p = playStep4(state, calls, `cw-${String(i)}`, tunables);
    out.push({ ...p, label: `${set} ${fixture} cw-${String(i)}`, calls: [...spy.calls] });
  };
  for (const [set, tunables, pictured] of SETS) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) play(set, tunables, pictured, fixture, build, i);
    }
  }
  const base = PASS_FIXTURES.find(([fixture]) => fixture === "base");
  if (base === undefined) throw new Error("no base fixture");
  for (const i of UNFORCED_SEEDS) {
    play("T", T_TUNABLES, false, "base", base[1], i);
    play("T-CBT", contestFirst(T_TUNABLES), false, "base", base[1], i);
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
    let unforced = 0;
    let contestFirstSheds = 0;
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
        if (p.label.includes("-CBT ")) contestFirstSheds++;
        // Contest before the throw: a throw on the shed's tick ends the tick before the move branch.
        if (p.events.some((e) => e.event.type === "THROW" && tickOf(e) === tick)) {
          expect(movements, `${p.label} t${String(tick)}`).toEqual([]);
          continue;
        }
        if (!rebuilt.forced) {
          unforced++;
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
    expect(unforced).toBeGreaterThan(0);
    expect(contestFirstSheds).toBeGreaterThan(0);
  });

  it("a throw on a shed's tick (contest before the throw) reads the rebuilt pocket's accuracy row", () => {
    let thrown = 0;
    let moved = 0;
    for (const p of corpus) {
      if (!p.label.includes("-CBT ")) continue;
      const sackTicks = new Set(p.records.flatMap((r) => (r.kind === "QB_HIT" && r.payload.phase === "SACK" ? [r.at.tick] : [])));
      const throwingTicks = new Set(p.records.flatMap((r) => (r.kind === "QB_HIT" && r.payload.phase === "THROWING" ? [r.at.tick] : [])));
      const accuracy = p.calls.filter((c): c is Extract<Call, { kind: "ACCURACY" }> => c.kind === "ACCURACY");
      for (const r of p.records) {
        if (r.kind !== "QB_HIT" || r.payload.phase !== "SHED" || sackTicks.has(r.at.tick)) continue;
        const tick = r.at.tick;
        const thrownNow = p.events.some((e) => e.event.type === "THROW" && tickOf(e) === tick);
        if (!thrownNow || throwingTicks.has(tick)) continue;
        thrown++;
        const rebuilt = p.calls.find((c): c is Extract<Call, { kind: "REBUILD" }> => c.kind === "REBUILD" && c.tick === tick);
        expect(rebuilt, `${p.label} t${String(tick)}`).toBeDefined();
        expect(accuracy.map((c) => c.label), `${p.label} t${String(tick)}`).toEqual([`Pocket: ${rebuilt?.pocket ?? ""}`]);
        // The status published on the tick is the one before the shed: a case that tells the two apart.
        const published = p.events.find((e) => e.event.type === "POCKET_STATUS" && tickOf(e) === tick);
        if (published !== undefined && payloadOf(published)["status"] !== rebuilt?.pocket) moved++;
      }
    }
    expect(thrown).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(0);
  });
});
