/**
 * ADR-072 (ADR-068 step 2) — the coach's leash and the quarterback's discipline.
 *
 * Two fixtures from step 1 and ADR-070, one lie each, so every read wants exactly one decision:
 *
 *   - a TRAP (the dig's defender shows a deep zone): seeing through it he wants to WORK AWAY from
 *     the dig (rung 20); fooled, to WORK TO it (rung 40);
 *   - a HIDDEN MAN (the backer shows the cell the cross breaks into): seeing through it he wants to
 *     WORK TO the cross (40); fooled, to WORK AWAY from it (20).
 *
 * What is asserted:
 *
 *   - at a leash that opens the decision he wants (and with no leash at all) nothing is rolled and
 *     the play is the one step 1 played, roll for roll;
 *   - below it, exactly one `leash_discipline` roll, against 100, with his Discipline and half the
 *     breach as its two terms, banded HELD exactly when it reaches 100;
 *   - HELD, the decision is not made and the man keeps his called place — and a fooled read still
 *     skews his reads of the trap: the leash governs what he does, not what he sees;
 *   - BROKE, the progression is the one step 1 would have worked;
 *   - a leash change moves no other roll: every roll the two streams share has the same face;
 *   - a leash off the 0–100 slider is refused.
 *
 * Every branch is required to have been reached, so a fixture that stopped producing a band
 * cannot pass by never testing it.
 */
import { describe, expect, it } from "vitest";
import { setAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState, RollDetail } from "@ff/contracts";
import { resolveAttr } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { TUNABLES } from "../src/tunables.js";
import type { PlayCalls } from "../src/types.js";
import { baseReceivers, buildZoneScenario, type Scenario } from "./fixtures.js";

const SEEDS = Array.from({ length: 300 }, (_, i) => `adr-072-leash-${String(i)}`);

const FOOLED: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.fooled).map((b) => b.label));
const SEES: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.seesThrough).map((b) => b.label));
const RUNGS = TUNABLES.presnap.leash.rungs;
const ROLL = TUNABLES.presnap.leash.discipline;

type Assignments = PlayCalls["defense"]["assignments"];

function payload(e: MatchEventEnvelope): Record<string, unknown> {
  return e.event.payload as Record<string, unknown>;
}

function presnapReads(events: readonly MatchEventEnvelope[], kind: string): Record<string, unknown>[] {
  return events.filter((e) => e.event.type === "PRESNAP_READ" && payload(e)["kind"] === kind).map(payload);
}

function playStartOffense(events: readonly MatchEventEnvelope[]): { readOrder: readonly string[]; leash: unknown } {
  const start = events.find((e) => e.event.type === "PLAY_START");
  const offense = (start === undefined ? {} : payload(start)["offense"]) as { readOrder?: readonly unknown[]; leash?: unknown };
  return { readOrder: (offense.readOrder ?? []).map(String), leash: offense.leash };
}

function skewedReadsOf(events: readonly MatchEventEnvelope[], receiver: PlayerId): number {
  let skewed = 0;
  for (const e of events) {
    if (e.event.type !== "QB_READ") continue;
    const p = payload(e) as { target: unknown; varianceRoll: { modifiers: readonly { source: string }[] } };
    if (String(p.target) !== String(receiver)) continue;
    if (p.varianceRoll.modifiers.some((m) => m.source.startsWith("Coverage misread"))) skewed += 1;
  }
  return skewed;
}

function withShown(base: Scenario, shown: Assignments): Scenario {
  return {
    ...base,
    calls: { ...base.calls, defense: { ...base.calls.defense, shownAssignments: shown, coverageDisguise: "ROTATED" } },
  };
}

/** Step 1's trap: the dig's defender shows a deep zone on the far side, so the dig looks alone. */
function trapScenario(): { readonly s: Scenario; readonly liar: PlayerId } {
  const base = buildZoneScenario();
  const { intermediate } = baseReceivers(base);
  const digDefender = base.calls.defense.assignments[1]?.defender;
  if (digDefender === undefined) throw new Error("bad fixture");
  const shown = base.calls.defense.assignments.map((a) =>
    a.defender === digDefender ? ({ kind: "ZONE", defender: a.defender, zone: { horizontal: "LW", vertical: "DEEP" } } as const) : a,
  );
  return { s: withShown(base, shown), liar: intermediate };
}

/** ADR-070's hidden man: the backer shows LH/SHORT, where the cross breaks and nobody plays. */
function hiddenScenario(): { readonly s: Scenario; readonly liar: PlayerId } {
  const base = buildZoneScenario();
  const { quick } = baseReceivers(base);
  const lb = base.calls.defense.assignments[2]?.defender;
  if (lb === undefined) throw new Error("bad fixture");
  const shown = base.calls.defense.assignments.map((a) =>
    a.defender === lb ? ({ kind: "ZONE", defender: lb, zone: { horizontal: "LH", vertical: "SHORT" } } as const) : a,
  );
  return { s: withShown(base, shown), liar: quick };
}

function at(s: Scenario, leash: number | undefined, discipline?: number): Scenario {
  const offense = { ...s.calls.offense };
  if (leash === undefined) delete (offense as { leash?: number }).leash;
  else (offense as { leash?: number }).leash = leash;
  let players = s.state.players;
  if (discipline !== undefined) {
    const id = s.state.quarterback as unknown as string;
    const qb = players[id];
    if (qb === undefined) throw new Error("bad fixture: no quarterback");
    const updated: PlayerState = {
      ...qb,
      attributes: { ...qb.attributes, values: setAttr(qb.attributes.values, resolveAttr("discipline"), discipline) },
    };
    players = { ...players, [id]: updated };
  }
  return { ...s, state: { ...s.state, players }, calls: { ...s.calls, offense } };
}

/** The rung his read wants: which way the liar moves, in step 1's terms. */
function wantedRung(kind: "trap" | "hidden", band: string): number | undefined {
  if (SEES.has(band)) return kind === "trap" ? RUNGS.WORK_AWAY : RUNGS.WORK_TO;
  if (FOOLED.has(band)) return kind === "trap" ? RUNGS.WORK_TO : RUNGS.WORK_AWAY;
  return undefined;
}

const FIXTURES = [
  ["trap", trapScenario],
  ["hidden", hiddenScenario],
] as const;

describe("ADR-072 — a leash that opens the decision rolls nothing and changes nothing", () => {
  it.each(FIXTURES)("%s: no leash, and every leash at or above the rung he wants, plays step 1's play", (kind, build) => {
    const { s } = build();
    const counts = { checked: 0 };
    for (const seed of SEEDS.slice(0, 120)) {
      const unleashed = simulatePassPlay(at(s, undefined).state, at(s, undefined).calls, seed).events;
      expect(playStartOffense(unleashed).leash, seed).toBe(100);
      expect(presnapReads(unleashed, "leash_discipline"), seed).toEqual([]);
      const band = String(presnapReads(unleashed, "coverage_read")[0]?.["band"]);
      const rung = wantedRung(kind, band);
      for (const leash of [100, 50, RUNGS.WORK_TO, ...(rung === undefined ? [0] : [rung])]) {
        const events = simulatePassPlay(at(s, leash, 0).state, at(s, leash, 0).calls, seed).events;
        expect(presnapReads(events, "leash_discipline"), `${seed} @${String(leash)}`).toEqual([]);
        expect(playStartOffense(events).leash).toBe(leash);
        // The same play: every event but PLAY_START's leash is identical.
        const strip = (es: readonly MatchEventEnvelope[]): string =>
          JSON.stringify(es.map((e) => (e.event.type === "PLAY_START" ? { ...e, event: { ...e.event, payload: { ...payload(e), offense: { ...(payload(e)["offense"] as object), leash: null } } } } : e)));
        expect(strip(events), `${seed} @${String(leash)}`).toBe(strip(unleashed));
        counts.checked += 1;
      }
    }
    expect(counts.checked).toBeGreaterThan(0);
  });
});

describe("ADR-072 — below the rung he wants, discipline decides", () => {
  it.each(FIXTURES)("%s: one roll, against 100, Discipline plus half the breach; HELD keeps the called order", (kind, build) => {
    const { s, liar } = build();
    const called = playStartOffense(simulatePassPlay(buildZoneScenario().state, buildZoneScenario().calls, SEEDS[0] ?? "x").events).readOrder;
    const counts = { held: 0, broke: 0, noRoll: 0, heldFooledSkews: 0, heldFooled: 0 };
    for (const discipline of [0, 50, 99]) {
      for (const leash of [0, RUNGS.WORK_AWAY]) {
        for (const seed of SEEDS) {
          const events = simulatePassPlay(at(s, leash, discipline).state, at(s, leash, discipline).calls, seed).events;
          const read = presnapReads(events, "coverage_read")[0];
          expect(read, seed).toBeDefined();
          const band = String(read?.["band"]);
          const rung = wantedRung(kind, band);
          const rolls = presnapReads(events, "leash_discipline");
          if (rung === undefined || rung <= leash) {
            expect(rolls, `${seed}: nothing above the leash, nothing to roll`).toEqual([]);
            counts.noRoll += 1;
            continue;
          }
          expect(rolls, seed).toHaveLength(1);
          const roll = rolls[0] as { target: number; band: string; roll: RollDetail };
          expect(roll.target).toBe(ROLL.target);
          const breach = rung - leash;
          expect(roll.roll.modifiers.map((m) => m.value).reduce((a, b) => a + b, 0), seed).toBe(
            Math.round(discipline / ROLL.attrDivisor) + Math.round(breach / ROLL.breachDivisor),
          );
          expect(roll.band, seed).toBe(roll.roll.total >= ROLL.target ? "HELD" : "BROKE");

          // What step 1 would have worked, from the same seed with no leash.
          const unleashed = playStartOffense(simulatePassPlay(at(s, undefined).state, at(s, undefined).calls, seed).events).readOrder;
          const order = playStartOffense(events).readOrder;
          if (roll.band === "HELD") {
            counts.held += 1;
            expect(order, `${seed}: held, the liar keeps his called place`).toEqual(called);
            if (FOOLED.has(band)) {
              counts.heldFooled += 1;
              counts.heldFooledSkews += skewedReadsOf(events, liar);
            }
          } else {
            counts.broke += 1;
            expect(order, `${seed}: broke, he works the order step 1 would have`).toEqual(unleashed);
          }
        }
      }
    }
    expect(counts.held, "nobody held the leash").toBeGreaterThan(0);
    expect(counts.broke, "nobody broke the leash").toBeGreaterThan(0);
    expect(counts.noRoll, "every read wanted a decision above the leash").toBeGreaterThan(0);
    expect(counts.heldFooled, "no fooled quarterback held the leash").toBeGreaterThan(0);
    // The leash keeps him from acting on the lie, not from believing it.
    expect(counts.heldFooledSkews, "held and fooled, but no read of the liar was skewed").toBeGreaterThan(0);
  });

  it("Discipline 99 never breaks; on the same face, a smaller breach is committed whenever a larger one is", () => {
    const { s } = trapScenario();
    let disciplinedRolls = 0;
    let fooledSeeds = 0;
    let onlyTheSmaller = 0;
    for (const seed of SEEDS) {
      for (const r of presnapReads(simulatePassPlay(at(s, 0, 99).state, at(s, 0, 99).calls, seed).events, "leash_discipline")) {
        disciplinedRolls += 1;
        expect(r["band"], seed).toBe("HELD");
      }
      // Fooled on the trap he wants WORK_TO (rung 40): a breach of 40 at leash 0, of 20 at leash 20.
      // The coverage read and the discipline die are on their own addresses, so both leashes see the
      // same read and the same face, and only the breach differs.
      const wide = simulatePassPlay(at(s, 0, 0).state, at(s, 0, 0).calls, seed).events;
      if (!FOOLED.has(String(presnapReads(wide, "coverage_read")[0]?.["band"]))) continue;
      fooledSeeds += 1;
      const narrow = simulatePassPlay(at(s, RUNGS.WORK_AWAY, 0).state, at(s, RUNGS.WORK_AWAY, 0).calls, seed).events;
      const [w] = presnapReads(wide, "leash_discipline") as { band: string; roll: RollDetail }[];
      const [n] = presnapReads(narrow, "leash_discipline") as { band: string; roll: RollDetail }[];
      expect(w?.roll.raw, seed).toBe(n?.roll.raw);
      if (w?.band === "BROKE") expect(n?.band, `${seed}: committed the larger breach, not the smaller`).toBe("BROKE");
      if (w?.band === "HELD" && n?.band === "BROKE") onlyTheSmaller += 1;
    }
    expect(disciplinedRolls).toBeGreaterThan(0);
    expect(fooledSeeds, "no seed fooled him").toBeGreaterThan(0);
    expect(onlyTheSmaller, "no face separated a 20-point breach from a 40-point one").toBeGreaterThan(0);
  });

  it("a leash change moves no other roll: every roll both streams make has the same face", () => {
    const { s } = trapScenario();
    let compared = 0;
    for (const seed of SEEDS.slice(0, 100)) {
      const faces = (leash: number): Map<string, number> => {
        const out = new Map<string, number>();
        for (const e of simulatePassPlay(at(s, leash, 0).state, at(s, leash, 0).calls, seed).events) {
          const p = payload(e) as { roll?: RollDetail };
          if ((e.event.type === "CHECK" || e.event.type === "PRESNAP_READ") && p.roll !== undefined) out.set(p.roll.rngLabel, p.roll.raw);
        }
        return out;
      };
      const open = faces(100);
      const closed = faces(0);
      for (const [label, raw] of closed) {
        const other = open.get(label);
        if (other === undefined) continue;
        expect(raw, `${seed}: ${label}`).toBe(other);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });

  it("is reproducible: the same seed gives the same stream under a closed leash", () => {
    const { s } = hiddenScenario();
    const a = at(s, 0, 30);
    const b = at(s, 0, 30);
    expect(JSON.stringify(simulatePassPlay(b.state, b.calls, "adr-072-det").events)).toBe(
      JSON.stringify(simulatePassPlay(a.state, a.calls, "adr-072-det").events),
    );
  });
});

describe("ADR-072 — the leash is a point on a 0–100 slider", () => {
  it.each([-1, 101, 2.5, Number.NaN])("refuses a leash of %s", (leash) => {
    const { s } = trapScenario();
    const bad = at(s, leash);
    expect(() => simulatePassPlay(bad.state, bad.calls, "adr-072-bad")).toThrow(/leash/);
  });
});
