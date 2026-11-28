/**
 * ADR-089 step 6, PART 2.8 (step-6 plan §2.8; ADR:772; AM-13 `caughtAsContact`, P20, and
 * `caughtSeen`, the owner's answer, `SEEN` recommended and each bundle's default, the unseen leaf
 * behind P21): THE CAUGHT ESCAPE AS CONTACT, behind `pocket.outs.caughtAsContact`.
 *
 * 1. The facts (`caughtFactsOf`), built at the escape site: a blocked man's approach BLOCKED, from
 *    his alignment (INTERIOR FRONT, EDGE SIDE), never on the free-run clock, seen by the answer
 *    (SEEN always; UNSEEN_IF_UNREGISTERED unseen only when he is unregistered); a live man's from his
 *    threat. The tilt class for each catcher: registered live by his approach and where he came
 *    from, unregistered blocked PUSH_BLOCKED under SEEN and BEHIND_NEVER under the unseen leaf,
 *    registered blocked PUSH_BLOCKED.
 * 2. The contest (`caughtContestForm`, `caughtEscapeContest`) is step 4's by rule: rated before the
 *    play's first shed, the second arrival after it (rated when the second arrival is off).
 * 3. The hit (`caughtHitOf`): P7's keys in order, `contactSeconds` the catch tick. The shed path
 *    (`caughtShedDelaySeconds`): a live man back by his approach, a blocked man not at all.
 * 4. In play, the part alone (H8) against the all-off block: the same stream through the catch's
 *    ARRIVED; then the contest on the catcher's labels and his `QB_HIT` naming it, with
 *    `contactSeconds` the catch tick (the contact book's time for him is his later arrival on most of
 *    these); RUSHER_SACKS his sack, credited to him; QB_SHEDS his threat back by approach, DELAYED,
 *    and the tick held with a HOLD that carries no direction; a catch that names nobody the base's
 *    sack. With the side-aware catch (H7 with H8) a blocked catcher's contest: no ARRIVED, approach
 *    BLOCKED, from by his alignment, the tilt by the leaf, no DELAYED on a shed. BLOCKED is on no
 *    other hit.
 * 5. The label rule, on a shed-heavy contact: a catch whose man's label was drawn on that tick (a
 *    shed at the escape's own tick) draws no die and is his sack, so no label repeats; otherwise the
 *    catch's contest is on step 4's label for its form (`:contest`, or `:contest2` with one face).
 * 6. Both of step 4's throw sites stay unreachable: the contact book's `contactSeconds` is never read
 *    on a play whose only contact is the caught escape's and which throws nothing, and a blocked
 *    catcher (no threat, no entry) plays through.
 * 7. Under the cap one escape roll a play, even after a shed; with the part alone (no cap) a man shed
 *    on a caught escape may escape again (plan §2.8, "those plays are counted apart"), shown on the
 *    shed-heavy contact.
 * 8. The leaves behind their petitions: P20 gates the part, P21 the unseen leaf, before any event.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, sideCatchOf: vi.fn(real.sideCatchOf) };
});

import { playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState, RushApproach } from "@ff/contracts";
import type { CheckPayload, ThreatApproach } from "../src/events.js";
import { simulatePassPlay } from "../src/index.js";
import { fromOf } from "../src/resolve/approach.js";
import { arrivalContest, tiltClassOf, tiltOf } from "../src/resolve/contact.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import { ContactBook } from "../src/sim/contactBook.js";
import { caughtContestForm, caughtEscapeContest, caughtFactsOf, caughtHitOf, caughtShedDelaySeconds, sideCatchOf } from "../src/sim/outs.js";
import type { CaughtCatcher, SideCatchTerms } from "../src/sim/outs.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import { PocketRulesError } from "../src/sim/pocketRules.js";
import { reduceStatlines } from "../src/stats/statline.js";
import type { ContactTunables, OutsTunables, Tunables } from "../src/tunables.js";
import type { MatchGameState, PlayCalls, RushAlignment } from "../src/types.js";
import { makePlayer } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";
import { CONTACT_FILED } from "./step4Fixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, tickOfEvent } from "./step5Fixtures.js";
import { GRANTED_S6, OUTS_FILED, OUTS_OFF, outsParts, playS6, withOuts } from "./step6Fixtures.js";
import type { Step6Record } from "./step6Fixtures.js";

const catchSpy = vi.mocked(sideCatchOf);
afterEach(() => {
  catchSpy.mockClear();
  vi.restoreAllMocks();
});

const SIDE_CATCH = OUTS_FILED.sideCatch ?? { perLiveThreat: 10, perUnregistered: 15 };
const H8 = outsParts({ caughtAsContact: true, caughtSeen: "SEEN" });
const H7 = outsParts({ direction: true, sideCatch: SIDE_CATCH });
const H7H8 = outsParts({ direction: true, sideCatch: SIDE_CATCH, caughtAsContact: true, caughtSeen: "SEEN" });
const H7H8_UNSEEN = outsParts({ direction: true, sideCatch: SIDE_CATCH, caughtAsContact: true, caughtSeen: "UNSEEN_IF_UNREGISTERED" });
const CAPPED = outsParts({ escapeCap: { maxPerPlay: 1, whenSpent: "HOLD" }, caughtAsContact: true, caughtSeen: "SEEN" });
const T = S5S_TUNABLES;
const id = (s: string): PlayerId => playerId(s);
const TILT_PUSH_BLOCKED = "Approach tilt (seen PUSH or BLOCKED)";
const TILT_BEHIND_NEVER = "Approach tilt (BEHIND or never seen)";

/** A live threat as the escape site holds it at the catch (after its ARRIVED). */
function threat(rusher: string, alignment: RushAlignment, approach: ThreatApproach | undefined, origin: RushThreat["origin"] = "WON_REP"): RushThreat {
  return { rusher: id(rusher), alignment, wonAtTick: 1.0, etaTick: 2.0, rollRef: `test/${rusher}`, origin, ...(approach === undefined ? {} : { approach }) };
}
const blocked = (rusher: string, alignment: RushAlignment, unregistered: boolean): CaughtCatcher => ({ kind: "BLOCKED", rusher: id(rusher), alignment, unregistered });
const live = (t: RushThreat, liveAtStepUp = false, onFreeRunClockAtSnap = false): CaughtCatcher => ({ kind: "LIVE", threat: t, liveAtStepUp, onFreeRunClockAtSnap });

describe("ADR-089 step 6, 2.8: the facts (caughtFactsOf) and the tilt class for each catcher", () => {
  it("a blocked man: BLOCKED, from his alignment, never on the free-run clock, seen by the answer", () => {
    for (const caughtSeen of ["SEEN", "UNSEEN_IF_UNREGISTERED"] as const) {
      for (const alignment of ["EDGE", "INTERIOR"] as const) {
        const from = alignment === "EDGE" ? "SIDE" : "FRONT";
        // Unregistered: seen under SEEN, unseen under the unseen leaf.
        const u = caughtFactsOf(caughtSeen, blocked("a", alignment, true));
        expect(u).toEqual({ approach: "BLOCKED", from, seen: caughtSeen === "SEEN", onFreeRunClock: false });
        expect(Object.keys(u)).toEqual(["approach", "from", "seen", "onFreeRunClock"]);
        expect(tiltClassOf(u)).toBe(caughtSeen === "SEEN" ? "PUSH_BLOCKED" : "BEHIND_NEVER");
        // Registered (he had checked him): seen under either answer.
        const r = caughtFactsOf(caughtSeen, blocked("a", alignment, false));
        expect(r).toEqual({ approach: "BLOCKED", from, seen: true, onFreeRunClock: false });
        expect(tiltClassOf(r)).toBe("PUSH_BLOCKED");
      }
    }
  });

  it("a live man: his approach, contactFrom's from, seen under either answer, his clock by AM-2's key", () => {
    for (const caughtSeen of ["SEEN", "UNSEEN_IF_UNREGISTERED"] as const) {
      // Registered live, by approach: THROUGH from the FRONT and no class; PUSH is PUSH_BLOCKED.
      expect(caughtFactsOf(caughtSeen, live(threat("d", "INTERIOR", "THROUGH")))).toEqual({ approach: "THROUGH", from: "FRONT", seen: true, onFreeRunClock: false });
      expect(tiltClassOf(caughtFactsOf(caughtSeen, live(threat("d", "INTERIOR", "THROUGH"))))).toBe("NONE");
      expect(tiltClassOf(caughtFactsOf(caughtSeen, live(threat("d", "EDGE", "PUSH"))))).toBe("PUSH_BLOCKED");
      expect(caughtFactsOf(caughtSeen, live(threat("d", "EDGE", "PUSH"))).from).toBe("SIDE");
      // An ARC man live at a STEP_UP comes from BEHIND; otherwise from the SIDE.
      expect(caughtFactsOf(caughtSeen, live(threat("e", "EDGE", "ARC"), true)).from).toBe("BEHIND");
      expect(tiltClassOf(caughtFactsOf(caughtSeen, live(threat("e", "EDGE", "ARC"), true)))).toBe("BEHIND_NEVER");
      expect(caughtFactsOf(caughtSeen, live(threat("e", "EDGE", "ARC"), false)).from).toBe("SIDE");
      // A free runner on the free-run clock at the snap is FREE_RUN; a won rep never is.
      expect(tiltClassOf(caughtFactsOf(caughtSeen, live(threat("f", "EDGE", "FREE", "UNBLOCKED"), false, true)))).toBe("FREE_RUN");
      expect(caughtFactsOf(caughtSeen, live(threat("f", "EDGE", "THROUGH", "WON_REP"), false, true)).onFreeRunClock).toBe(false);
      expect(tiltClassOf(caughtFactsOf(caughtSeen, live(threat("f", "EDGE", "FREE", "UNBLOCKED"), false, false)))).toBe("NONE");
    }
  });

  it("a live man whose threat carries no approach is an engine fault, named", () => {
    expect(() => caughtFactsOf("SEEN", live(threat("g", "EDGE", undefined)))).toThrow(/a caught escape by g whose threat carries no approach/);
  });
});

describe("ADR-089 step 6, 2.8: the contest (caughtContestForm, caughtEscapeContest) and the hit (caughtHitOf)", () => {
  const rusher: PlayerState = makePlayer("rusher-c", "Test Rusher", "DE", { tackling: 70, speed: 80, strength: 60 });
  const qb: PlayerState = makePlayer("qb-c", "Test Passer", "QB", { strength: 60, agility: 70, mobility: 70 });
  const rated: ContactTunables = { ...CONTACT_FILED, secondArrival: "RATED" };

  it("step 4's form by rule: rated before the play's first shed, the second arrival after it, rated when the second arrival is off", () => {
    expect(caughtContestForm(CONTACT_FILED, false)).toBe("RATED");
    expect(caughtContestForm(CONTACT_FILED, true)).toBe("SECOND");
    expect(caughtContestForm(rated, false)).toBe("RATED");
    expect(caughtContestForm(rated, true)).toBe("RATED");
  });

  it("the rated contest is step 4's arrivalContest with the catch's tilt and the boundary, actors the rusher then the quarterback", () => {
    for (const facts of [caughtFactsOf("SEEN", blocked("rusher-c", "EDGE", true)), caughtFactsOf("UNSEEN_IF_UNREGISTERED", blocked("rusher-c", "INTERIOR", true))]) {
      for (const [r, q] of [[1, 100], [50, 50], [97, 3], [70, 40]] as const) {
        const faces = { form: "RATED", rusher: r, quarterback: q, rngLabel: "p/rush/t2.0/rusher-c:contest", quarterbackRngLabel: "p/rush/t2.0/qb-c:contest:rusher-c" } as const;
        const check = caughtEscapeContest({ tunables: T, contact: CONTACT_FILED, rusher, qb, facts, faces });
        const step4 = arrivalContest(rusher, qb, tiltOf(facts, CONTACT_FILED.tilts), faces, CONTACT_FILED.boundary);
        expect(check.checkKind).toBe("arrival_contest");
        expect(check.actors).toEqual([rusher.bio.id, qb.bio.id]);
        expect(check.roll).toEqual(step4.rusherRoll);
        expect(check.opposedRoll).toEqual(step4.quarterbackRoll);
        expect(check.target).toBe(CONTACT_FILED.boundary);
        expect(check.margin).toBe(step4.margin);
        expect(check.band).toBe(step4.band);
        expect(check.testsAttrs).toEqual(step4.testsAttrs);
      }
    }
    // The tilt follows the leaf: the quarterback's +20 when seen, the rusher's +10 when unseen.
    const faces = { form: "RATED", rusher: 50, quarterback: 50, rngLabel: "a", quarterbackRngLabel: "b" } as const;
    const seen = caughtEscapeContest({ tunables: T, contact: CONTACT_FILED, rusher, qb, facts: caughtFactsOf("SEEN", blocked("rusher-c", "EDGE", true)), faces });
    expect(seen.opposedRoll?.modifiers.map((m) => m.source)).toContain(TILT_PUSH_BLOCKED);
    expect(seen.roll.modifiers.map((m) => m.source)).not.toContain("Speed");
    const unseen = caughtEscapeContest({ tunables: T, contact: CONTACT_FILED, rusher, qb, facts: caughtFactsOf("UNSEEN_IF_UNREGISTERED", blocked("rusher-c", "EDGE", true)), faces });
    expect(unseen.roll.modifiers.map((m) => m.source)).toContain(TILT_BEHIND_NEVER);
    expect(unseen.opposedRoll?.modifiers.map((m) => m.source)).not.toContain("Agility");
  });

  it("the second arrival is one d100 against its target, no rating read, no opposed roll; refused under a rated second arrival", () => {
    const facts = caughtFactsOf("SEEN", blocked("rusher-c", "EDGE", true));
    for (const face of [1, 15, 16, 100]) {
      const check = caughtEscapeContest({ tunables: T, contact: CONTACT_FILED, rusher, qb, facts, faces: { form: "SECOND", rusher: face, rngLabel: "p/rush/t2.0/rusher-c:contest2" } });
      expect(check.actors).toEqual([rusher.bio.id, qb.bio.id]);
      expect(check.roll).toEqual({ die: "d100", raw: face, modifiers: [], total: face, rngLabel: "p/rush/t2.0/rusher-c:contest2" });
      expect(check.opposedRoll).toBeUndefined();
      expect(check.target).toBe(15);
      expect(check.margin).toBe(face - 15);
      expect(check.band).toBe(face > 15 ? "RUSHER_SACKS" : "QB_SHEDS");
      expect(check.testsAttrs).toEqual([]);
    }
    expect(() => caughtEscapeContest({ tunables: T, contact: rated, rusher, qb, facts, faces: { form: "SECOND", rusher: 50, rngLabel: "x" } })).toThrow(/a second arrival's face under a rated second arrival/);
  });

  it("the shed path: a live man back by his approach (PUSH the longer delay), a blocked man not at all", () => {
    const pushy: ContactTunables = { ...CONTACT_FILED, shedDelaySeconds: 0.5, pushShedDelaySeconds: 1.0 };
    for (const approach of ["FREE", "ARC", "THROUGH"] as const) expect(caughtShedDelaySeconds(live(threat("d", "EDGE", approach)), pushy)).toBe(0.5);
    expect(caughtShedDelaySeconds(live(threat("d", "INTERIOR", "PUSH")), pushy)).toBe(1.0);
    expect(caughtShedDelaySeconds(live(threat("d", "EDGE", "THROUGH")), { ...pushy, shedDelaySeconds: 1.5 })).toBe(1.5);
    for (const unregistered of [true, false]) expect(caughtShedDelaySeconds(blocked("a", "EDGE", unregistered), pushy)).toBeUndefined();
    expect(() => caughtShedDelaySeconds(live(threat("g", "EDGE", undefined)), pushy)).toThrow(/a caught escape by g whose threat carries no approach/);
  });

  it("the QB_HIT: P7's keys in order, contactSeconds the catch tick, the facts' approach, from and seen", () => {
    const facts = caughtFactsOf("UNSEEN_IF_UNREGISTERED", blocked("b", "INTERIOR", true));
    for (const tick of [1.5, 2.0, 4.5, 6.0]) {
      for (const phase of ["SACK", "SHED"] as const) {
        const hit = caughtHitOf({ qb: id("q"), rusher: id("b"), phase, tick, rollRef: "r", facts });
        expect(hit).toEqual({ qb: id("q"), rusher: id("b"), phase, contactSeconds: tick, rollRef: "r", approach: "BLOCKED", from: "FRONT", seen: false });
        expect(Object.keys(hit)).toEqual(["qb", "rusher", "phase", "contactSeconds", "rollRef", "approach", "from", "seen"]);
      }
    }
  });
});

// ---- in play ------------------------------------------------------------------------------------

/** The s5a shapes (every play here carries the picture the design's shape needs). */
const SHAPES: readonly { readonly name: string; readonly base: Tunables }[] = [
  { name: "s5a", base: S5_TUNABLES },
  { name: "s5a shape S", base: S5S_TUNABLES },
  { name: "s5a shape L", base: S5L_TUNABLES },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES) },
];
const dt1 = playerId("dt1");
const de1 = playerId("de1");
const blz0 = playerId("blz0");
const FRONTS: readonly (readonly [string, Step3FrontOptions])[] = [
  ["front, one a side", {}],
  ["front +2, three to one", { extras: 2 }],
  ["front +2, mixed", { extras: 2, extraSides: ["LEFT", "UNSIDED"] }],
  ["front +2, the tackle's TRIPLE twist", { extras: 2, stunts: [{ penetrator: dt1, looper: de1, complexity: "TRIPLE" }] }],
  ["front +2, the blitzer's T_E twist", { extras: 2, stunts: [{ penetrator: blz0, looper: de1, complexity: "T_E" }] }],
];
type Build = () => { readonly state: MatchGameState; readonly calls: PlayCalls };
const PLAYS: readonly (readonly [string, number, Build])[] = [
  ...FRONTS.map(([fixture, options]) => [fixture, 50, () => { const f = frontWithPicture(options); return { state: f.scenario.state, calls: f.calls }; }] as const),
  ...PASS_FIXTURES.map(([fixture, build]) => [fixture, 15, () => { const f = build(); return { state: f.state, calls: withPicture(f.state, f.calls) }; }] as const),
];

type Envelope = MatchEventEnvelope;
const typeOf = (e: Envelope | undefined): string | undefined => e?.event.type;
const isCaught = (e: Envelope | undefined): boolean => e !== undefined && checkOf(e)?.checkKind === "scramble" && checkOf(e)?.band === "CAUGHT_FROM_BEHIND";
const isContest = (e: Envelope | undefined): boolean => e !== undefined && checkOf(e)?.checkKind === "arrival_contest";
const arrivedOf = (e: Envelope | undefined): { readonly rusher: PlayerId; readonly alignment: RushAlignment; readonly approach: ThreatApproach | undefined } | undefined =>
  e?.event.type === "RUSH_THREAT" && e.event.payload.state === "ARRIVED" ? { rusher: e.event.payload.rusher, alignment: e.event.payload.alignment, approach: e.event.payload.approach } : undefined;
type Hit = { readonly qb: PlayerId; readonly rusher: PlayerId; readonly phase: string; readonly contactSeconds: number; readonly rollRef?: string; readonly approach?: RushApproach; readonly from?: string; readonly seen?: boolean };
const hitOf = (e: Envelope | undefined): Hit | undefined => (e?.event.type === "QB_HIT" ? (e.event.payload as Hit) : undefined);
const firstDiff = (a: readonly Envelope[], b: readonly Envelope[]): number | undefined => {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i;
  return undefined;
};
/** Each card rusher's alignment, from `PLAY_START`'s rush card. */
const alignmentsOf = (events: readonly Envelope[]): ReadonlyMap<string, RushAlignment> => {
  const start = events.find((e) => e.event.type === "PLAY_START");
  const rush = (start?.event.payload as { readonly defense?: { readonly rush?: readonly { readonly rusher: PlayerId; readonly alignment: RushAlignment }[] } } | undefined)?.defense?.rush ?? [];
  return new Map(rush.map((r) => [String(r.rusher), r.alignment] as const));
};
const sacksOf = (events: readonly Envelope[], rusher: PlayerId): number => reduceStatlines(events).filter((l) => String(l.player) === String(rusher)).reduce((a, l) => a + l.defense.sacks, 0);
const allSacks = (events: readonly Envelope[]): number => reduceStatlines(events).reduce((a, l) => a + l.defense.sacks, 0);
const labelsOf = (events: readonly Envelope[]): string[] =>
  events.flatMap((e) => {
    const c = checkOf(e);
    return c?.roll === undefined ? [] : [c.roll.rngLabel, ...(c.opposedRoll === undefined ? [] : [c.opposedRoll.rngLabel])];
  });
const shedBefore = (events: readonly Envelope[], k: number): boolean => events.slice(0, k).some((e) => hitOf(e)?.phase === "SHED");

/** One play under an arm and its base, with the contact book's reads and the side-aware catch's terms of the arm's play. */
interface Paired {
  readonly where: string;
  readonly base: readonly Envelope[];
  readonly arm: readonly Envelope[];
  readonly records: readonly Step6Record[];
  readonly bookReads: number;
  readonly terms: readonly SideCatchTerms[];
}
function paired(armBlock: OutsTunables, baseBlock: OutsTunables, tag: string, shapes = SHAPES, plays = PLAYS): Paired[] {
  const out: Paired[] = [];
  const reads = vi.spyOn(ContactBook.prototype, "contactSeconds");
  for (const { name, base } of shapes) {
    for (const [fixture, seeds, build] of plays) {
      for (let i = 0; i < seeds; i++) {
        const seed = `s6-caught-${tag}-${fixture}-${i}`;
        const a = build();
        const b = build();
        const before = playS6(b.state, b.calls, seed, withOuts(base, baseBlock)).events;
        catchSpy.mockClear();
        const readsBefore = reads.mock.calls.length;
        const arm = playS6(a.state, a.calls, seed, withOuts(base, armBlock));
        out.push({
          where: `${name} ${fixture} ${i}`,
          base: before,
          arm: arm.events,
          records: arm.records,
          bookReads: reads.mock.calls.length - readsBefore,
          terms: catchSpy.mock.results.map((r) => r.value as SideCatchTerms),
        });
      }
    }
  }
  reads.mockRestore();
  return out;
}

/**
 * Checks the caught escape's contact at `arm[k]` (a CAUGHT_FROM_BEHIND escape roll), with the
 * catcher `man` and whether he is a live (ARRIVED) catcher; returns the contest's band.
 */
function checkContact(p: Paired, k: number, man: PlayerId, isLive: boolean, approach: RushApproach, from: string | undefined, seen: boolean): "SACK" | "SHED" {
  const { arm, where } = p;
  const tick = tickOfEvent(arm[k] as Envelope) ?? Number.NaN;
  const at = isLive ? k + 2 : k + 1;
  const contest = checkOf(arm[at] as Envelope) as CheckPayload;
  expect(contest.checkKind, where).toBe("arrival_contest");
  const qb = contest.actors[1] as PlayerId;
  expect(contest.actors, where).toEqual([man, qb]);
  // Step 4's form by rule: the second arrival after the play's first shed, else the rated contest.
  const second = shedBefore(arm, k);
  const label = contest.roll?.rngLabel ?? "";
  expect(label.endsWith(`/rush/t${tick.toFixed(1)}/${String(man)}:${second ? "contest2" : "contest"}`), `${where}: ${label}`).toBe(true);
  if (second) expect(contest.opposedRoll, where).toBeUndefined();
  else expect(contest.opposedRoll?.rngLabel, where).toBe(label.replace(/\/[^/]+:contest$/, `/${String(qb)}:contest:${String(man)}`));
  const hit = hitOf(arm[at + 1]);
  expect(hit, where).toBeDefined();
  const phase = contest.band === "RUSHER_SACKS" ? "SACK" : "SHED";
  expect(hit, where).toEqual({ qb, rusher: man, phase, contactSeconds: tick, rollRef: label, approach, from, seen });
  expect(Object.keys(hit ?? {}), where).toEqual(["qb", "rusher", "phase", "contactSeconds", "rollRef", "approach", "from", "seen"]);
  if (phase === "SACK") {
    expect(typeOf(arm[at + 2]), where).toBe("PLAY_RESULT");
    expect(sacksOf(arm, man), where).toBe(1);
    expect(allSacks(arm), where).toBe(1);
    return "SACK";
  }
  // A shed: a live man's threat back by approach (DELAYED), a blocked man's nothing; then the held tick.
  let j = at + 2;
  if (isLive) {
    const delayed = arm[j];
    expect(delayed?.event.type === "RUSH_THREAT" && delayed.event.payload.state === "DELAYED" && String(delayed.event.payload.rusher) === String(man), where).toBe(true);
    const eta = delayed?.event.type === "RUSH_THREAT" ? delayed.event.payload.etaTick : Number.NaN;
    expect(eta, where).toBe(Number((tick + (approach === "PUSH" ? CONTACT_FILED.pushShedDelaySeconds : CONTACT_FILED.shedDelaySeconds)).toFixed(1)));
    j += 1;
    while (arm[j]?.event.type === "RUSH_THREAT") j += 1;
  }
  const hold = arm[j];
  expect(hold?.event.type === "QB_DECISION" && hold.event.payload.choice === "HOLD", `${where}: ${typeOf(hold)}`).toBe(true);
  expect(tickOfEvent(hold as Envelope), where).toBe(tick);
  // The held tick publishes no direction (a caught escape publishes no decision of its own, 2.6).
  expect(p.records.some((r) => r.kind === "direction" && r.at.seq === hold?.seq), where).toBe(false);
  expect(Object.keys(hold?.event.payload ?? {}), where).toEqual(["choice"]);
  return "SHED";
}

describe("ADR-089 step 6, 2.8: in play, the part alone (H8) against the all-off block", () => {
  let corpus: Paired[] | undefined;
  const h8 = (): Paired[] => (corpus ??= paired(H8, OUTS_OFF, "h8"));

  it("the base's stream through the catch's ARRIVED; then his contest on his labels, his QB_HIT, his sack or his shed", () => {
    const n = { sack: 0, shed: 0, nobody: 0, laterEta: 0, same: 0 };
    for (const p of h8()) {
      const { base, arm, where } = p;
      const d = firstDiff(base, arm);
      // A catch that names nobody is the base's sack with no sacker.
      for (let k = 0; k < (d ?? arm.length); k++) {
        if (isCaught(arm[k]) && arrivedOf(arm[k + 1]) === undefined) {
          n.nobody += 1;
          expect(isContest(arm[k + 1]), where).toBe(false);
        }
      }
      if (d === undefined) {
        n.same += 1;
        continue;
      }
      // The first difference is the contest right after a caught escape's ARRIVED.
      const k = d - 2;
      expect(isCaught(arm[k]), `${where} at ${d}`).toBe(true);
      const arrived = arrivedOf(arm[k + 1]);
      if (arrived === undefined || arrived.approach === undefined) throw new Error(`${where}: no ARRIVED with an approach at the catch`);
      expect(typeOf(base[d]), where).toBe("PLAY_RESULT");
      const from = arm[d + 1]?.event.type === "QB_HIT" ? hitOf(arm[d + 1])?.from : undefined;
      expect(from === "BEHIND" ? arrived.approach === "ARC" : from === fromOf(arrived.approach, arrived.alignment), `${where}: ${String(from)}`).toBe(true);
      const band = checkContact(p, k, arrived.rusher, true, arrived.approach, from, true);
      n[band === "SACK" ? "sack" : "shed"] += 1;
      // The contact book's time for him is his D21 arrival: his last eta before the catch is later than the catch.
      const tick = tickOfEvent(arm[k] as Envelope) ?? Number.NaN;
      const lastEta = [...arm.slice(0, k)].reverse().find((e) => e.event.type === "RUSH_THREAT" && String(e.event.payload.rusher) === String(arrived.rusher));
      if (lastEta?.event.type === "RUSH_THREAT" && lastEta.event.payload.etaTick > tick) n.laterEta += 1;
    }
    // MEASURED here (this corpus): 58 sacks and 23 sheds; 6 catches naming nobody; his last eta after
    // the catch on 81 of the 81 contacts (plan §2.8, MEASURED on F5 set 1: 567 of 589 on flat); 1,699
    // plays with no caught escape that named a man. The second arrival is held on a shed-heavy
    // contact below, where it comes in number.
    expect(n.sack).toBeGreaterThan(30);
    expect(n.shed).toBeGreaterThan(10);
    expect(n.nobody).toBeGreaterThan(3);
    expect(n.laterEta).toBeGreaterThan(0.9 * (n.sack + n.shed));
    expect(n.same).toBeGreaterThan(1000);
  });

  it("no hit is BLOCKED, every label is drawn once, and the contact book is never read for a play whose only contact is the caught escape's and which throws nothing", () => {
    let only = 0;
    for (const p of h8()) {
      const { arm, where } = p;
      expect(arm.filter((e) => hitOf(e)?.approach === "BLOCKED"), where).toEqual([]);
      const labels = labelsOf(arm);
      expect(new Set(labels).size, where).toBe(labels.length);
      const hits = arm.flatMap((e, j) => (hitOf(e) === undefined ? [] : [j]));
      const caughtHits = hits.filter((j) => isContest(arm[j - 1]) && isCaught(arm[j - 3]) && arrivedOf(arm[j - 2]) !== undefined);
      const threw = arm.some((e) => e.event.type === "QB_DECISION" && (e.event.payload.choice === "THROW" || e.event.payload.choice === "CHECKDOWN"));
      if (caughtHits.length > 0 && caughtHits.length === hits.length && !threw) {
        only += 1;
        expect(p.bookReads, where).toBe(0);
      }
    }
    expect(only).toBeGreaterThan(30);
  });
});

describe("ADR-089 step 6, 2.8: with the side-aware catch (H7 with H8), a blocked catcher's contest", () => {
  let corpus: Paired[] | undefined;
  const h7h8 = (): Paired[] => (corpus ??= paired(H7H8, H7, "h7h8"));

  it("H7's stream through the catch; a blocked man's contest with no ARRIVED, approach BLOCKED, from his alignment, the seen tilt, no DELAYED", () => {
    const n = { blocked: 0, live: 0, blockedSack: 0, blockedShed: 0, ratedBlocked: 0 };
    for (const p of h7h8()) {
      const { base, arm, where } = p;
      const d = firstDiff(base, arm);
      if (d === undefined) continue;
      const arrived = arrivedOf(arm[d - 1]);
      if (arrived !== undefined) {
        // A live catcher, as under H8 alone.
        const k = d - 2;
        expect(isCaught(arm[k]), where).toBe(true);
        if (arrived.approach === undefined) throw new Error(`${where}: an ARRIVED with no approach`);
        const from = hitOf(arm[d + 1])?.from;
        checkContact(p, k, arrived.rusher, true, arrived.approach, from, true);
        n.live += 1;
        continue;
      }
      const k = d - 1;
      expect(isCaught(arm[k]), `${where} at ${d}`).toBe(true);
      // H7's catch by a blocked man: a sack with no sacker, no ARRIVED.
      expect(typeOf(base[d]), where).toBe("PLAY_RESULT");
      expect(allSacks(base), where).toBe(base.some((e) => arrivedOf(e) !== undefined) ? 1 : 0);
      const contest = checkOf(arm[d] as Envelope) as CheckPayload;
      const man = contest.actors[0] as PlayerId;
      // He is a blocked man on his side whom he had not checked: the escape roll's actor, unregistered
      // by its terms (sideCatchOf is read once an escape roll, so this roll's terms are the k-th's).
      expect(checkOf(arm[k] as Envelope)?.actors.map(String), where).toContain(String(man));
      const rollsBefore = arm.slice(0, k).filter((e) => checkOf(e)?.checkKind === "scramble").length;
      expect(p.terms[rollsBefore]?.unregistered.map(String), where).toContain(String(man));
      const alignment = alignmentsOf(arm).get(String(man));
      const from = alignment === "EDGE" ? "SIDE" : "FRONT";
      const band = checkContact(p, k, man, false, "BLOCKED", from, true);
      n.blocked += 1;
      n[band === "SACK" ? "blockedSack" : "blockedShed"] += 1;
      if (contest.opposedRoll !== undefined) {
        n.ratedBlocked += 1;
        // The seen tilt: the quarterback's +20, and the rusher's Speed not read.
        const tilt = contest.opposedRoll.modifiers.find((m) => m.source === TILT_PUSH_BLOCKED);
        expect(tilt?.value, where).toBe(CONTACT_FILED.tilts.pushBlocked.quarterbackBonus);
        expect(contest.roll?.modifiers.map((m) => m.source), where).not.toContain("Speed");
      }
    }
    // MEASURED here (this corpus): 47 blocked catchers (12 sacks, 35 sheds: the quarterback's +20),
    // 44 of them on the rated contest, and 58 live ones.
    expect(n.blocked).toBeGreaterThan(25);
    expect(n.blockedSack).toBeGreaterThan(6);
    expect(n.blockedShed).toBeGreaterThan(20);
    expect(n.ratedBlocked).toBeGreaterThan(20);
    expect(n.live).toBeGreaterThan(10);
  });

  it("BLOCKED is on a blocked catcher's hit only, labels are drawn once, and the contact book is never read for a play whose only contact is the caught escape's and which throws nothing", () => {
    let blockedHits = 0;
    let only = 0;
    let onlyBlocked = 0;
    for (const p of h7h8()) {
      const { arm, where } = p;
      arm.forEach((e, j) => {
        if (hitOf(e)?.approach !== "BLOCKED") return;
        blockedHits += 1;
        expect(isContest(arm[j - 1]) && isCaught(arm[j - 2]), where).toBe(true);
      });
      const labels = labelsOf(arm);
      expect(new Set(labels).size, where).toBe(labels.length);
      const hits = arm.flatMap((e, j) => (hitOf(e) === undefined ? [] : [j]));
      const caughtHits = hits.filter((j) => isContest(arm[j - 1]) && (isCaught(arm[j - 2]) || (isCaught(arm[j - 3]) && arrivedOf(arm[j - 2]) !== undefined)));
      const threw = arm.some((e) => e.event.type === "QB_DECISION" && (e.event.payload.choice === "THROW" || e.event.payload.choice === "CHECKDOWN"));
      if (caughtHits.length > 0 && caughtHits.length === hits.length && !threw) {
        only += 1;
        if (caughtHits.some((j) => hitOf(arm[j])?.approach === "BLOCKED")) onlyBlocked += 1;
        expect(p.bookReads, where).toBe(0);
      }
    }
    // MEASURED here: 47 BLOCKED hits; 42 plays whose only contact is a caught escape's, 9 of them a
    // blocked man's (a blocked man is mostly shed, and the play goes on to a throw).
    expect(blockedHits).toBeGreaterThan(25);
    expect(only).toBeGreaterThan(30);
    expect(onlyBlocked).toBeGreaterThan(5);
  });

  it("the same seed gives the same stream and the same records", () => {
    for (const [fixture, , build] of PLAYS.slice(0, 3)) {
      for (let i = 0; i < 10; i++) {
        const a = build();
        const b = build();
        const one = playS6(a.state, a.calls, `s6-caught-det-${fixture}-${i}`, withOuts(S5S_TUNABLES, H7H8));
        const two = playS6(b.state, b.calls, `s6-caught-det-${fixture}-${i}`, withOuts(S5S_TUNABLES, H7H8));
        expect(JSON.stringify(two)).toBe(JSON.stringify(one));
      }
    }
  });
});

describe("ADR-089 step 6, 2.8: the unseen leaf (UNSEEN_IF_UNREGISTERED, behind P21)", () => {
  it("against SEEN: the same stream up to a blocked catcher's contest, which keeps its faces and labels, takes the rusher's +10 for the quarterback's +20, and is unseen", () => {
    let parted = 0;
    let unseenHits = 0;
    for (const p of paired(H7H8_UNSEEN, H7H8, "unseen")) {
      const { base, arm, where } = p;
      for (const e of arm) {
        const hit = hitOf(e);
        if (hit === undefined) continue;
        // Only an unregistered blocked man's catch is unseen.
        expect(hit.seen, where).toBe(hit.approach !== "BLOCKED");
        if (hit.seen === false) unseenHits += 1;
      }
      const d = firstDiff(base, arm);
      if (d === undefined) continue;
      parted += 1;
      // The rated contest parts at its CHECK (the tilt); the second arrival, which reads no rating and
      // no tilt, parts at its QB_HIT's seen.
      const c = isContest(arm[d]) ? d : d - 1;
      expect(isCaught(arm[c - 1]) && isContest(arm[c]) && hitOf(arm[c + 1])?.approach === "BLOCKED", `${where} at ${d}`).toBe(true);
      const seen = checkOf(base[c] as Envelope) as CheckPayload;
      const unseen = checkOf(arm[c] as Envelope) as CheckPayload;
      expect([unseen.roll?.rngLabel, unseen.roll?.raw, unseen.opposedRoll?.rngLabel, unseen.opposedRoll?.raw], where).toEqual([seen.roll?.rngLabel, seen.roll?.raw, seen.opposedRoll?.rngLabel, seen.opposedRoll?.raw]);
      expect(hitOf(arm[c + 1])?.seen, where).toBe(false);
      expect(hitOf(base[c + 1])?.seen, where).toBe(true);
      if (unseen.opposedRoll !== undefined) {
        expect(c, where).toBe(d);
        expect(unseen.roll?.modifiers.find((m) => m.source === TILT_BEHIND_NEVER)?.value, where).toBe(CONTACT_FILED.tilts.behindNever.rusherBonus);
        expect(unseen.opposedRoll.modifiers.map((m) => m.source), where).not.toContain("Agility");
        expect(seen.opposedRoll?.modifiers.find((m) => m.source === TILT_PUSH_BLOCKED)?.value, where).toBe(CONTACT_FILED.tilts.pushBlocked.quarterbackBonus);
      } else {
        expect(c, where).toBe(d - 1);
        expect(unseen, where).toEqual(seen);
      }
    }
    expect(parted).toBeGreaterThan(20);
    expect(unseenHits).toBeGreaterThan(20);
  });
});

describe("ADR-089 step 6, 2.8: the label rule, on a shed-heavy contact", () => {
  /**
   * A shed-heavy contact (b 60, so nearly every rated contest is a shed), with the second arrival on
   * (15) or off (every contact rated): a man shed on the escape's own tick is then often caught on
   * the label he was shed on, and many catches come after the play's first shed.
   */
  const shedHeavy = (t: Tunables, secondArrival: ContactTunables["secondArrival"]): Tunables => {
    const c = t.pocket.contact;
    if (c === undefined) throw new Error("no contact block");
    return { ...t, pocket: { ...t.pocket, contact: { ...c, boundary: 60, secondArrival } } };
  };

  it("a catch whose man's label was drawn on that tick draws no die and is his sack; otherwise step 4's form; no label repeats", () => {
    const n = { rule: 0, rated: 0, second: 0, again: 0 };
    for (const secondArrival of ["RATED", { target: 15 }] as const) {
      for (const { name, base } of SHAPES.slice(0, 3)) {
        for (const [fixture, seeds, build] of PLAYS) {
          for (let i = 0; i < seeds * 2; i++) {
            const { state, calls } = build();
            const { events } = playS6(state, calls, `s6-caught-label-${fixture}-${i}`, withOuts(shedHeavy(base, secondArrival), H8));
            const where = `${name} ${fixture} ${i} ${JSON.stringify(secondArrival)}`;
            const labels = labelsOf(events);
            expect(new Set(labels).size, where).toBe(labels.length);
            events.forEach((e, k) => {
              if (!isCaught(e)) return;
              const arrived = arrivedOf(events[k + 1]);
              if (arrived === undefined) return;
              const tick = tickOfEvent(e) ?? Number.NaN;
              const second = secondArrival !== "RATED" && shedBefore(events, k);
              const label = `/rush/t${tick.toFixed(1)}/${String(arrived.rusher)}:${second ? "contest2" : "contest"}`;
              const drawn = events.slice(0, k).some((x) => tickOfEvent(x) === tick && isContest(x) && (checkOf(x)?.roll?.rngLabel ?? "").endsWith(label));
              if (drawn) {
                n.rule += 1;
                // No die: the ARRIVED is followed by the play's result, his sack, credited to him.
                expect(typeOf(events[k + 2]), where).toBe("PLAY_RESULT");
                expect(sacksOf(events, arrived.rusher), where).toBe(1);
                expect(allSacks(events), where).toBe(1);
                return;
              }
              const contest = checkOf(events[k + 2] as Envelope);
              expect(contest?.checkKind, where).toBe("arrival_contest");
              expect((contest?.roll?.rngLabel ?? "").endsWith(label), where).toBe(true);
              expect(contest?.opposedRoll === undefined, where).toBe(second);
              n[second ? "second" : "rated"] += 1;
              // Without the cap a man shed on a caught escape may escape again (plan §2.8: counted apart).
              if (contest?.band === "QB_SHEDS" && events.slice(k + 3).some((x) => checkOf(x)?.checkKind === "scramble")) n.again += 1;
            });
          }
        }
      }
    }
    // MEASURED here: 21 catches under the rule (all with every contact rated), 218 rated contests and
    // 25 second arrivals at a catch, and 6 sheds after which he escaped again.
    expect(n.rule).toBeGreaterThan(5);
    expect(n.rated).toBeGreaterThan(100);
    expect(n.second).toBeGreaterThan(15);
    expect(n.again).toBeGreaterThan(2);
  });
});

describe("ADR-089 step 6, 2.8: under the cap", () => {
  it("one escape roll a play, even after a caught escape's shed, which spends it", () => {
    let shed = 0;
    for (const { name, base } of SHAPES) {
      for (const [fixture, seeds, build] of PLAYS) {
        for (let i = 0; i < seeds; i++) {
          const { state, calls } = build();
          const { events } = playS6(state, calls, `s6-caught-cap-${fixture}-${i}`, withOuts(base, CAPPED));
          const where = `${name} ${fixture} ${i}`;
          expect(events.filter((e) => checkOf(e)?.checkKind === "scramble").length, where).toBeLessThanOrEqual(1);
          if (events.some((e, j) => hitOf(e)?.phase === "SHED" && isContest(events[j - 1]) && isCaught(events[j - 3]))) shed += 1;
        }
      }
    }
    expect(shed).toBeGreaterThan(8);
  });
});

describe("ADR-089 step 6, 2.8: the leaves behind their petitions", () => {
  it("P20 gates the part and P21 the unseen leaf, before any event; SEEN needs no P21", () => {
    const f = frontWithPicture({});
    const play = (block: OutsTunables, petitions: typeof GRANTED_S6) => () => simulatePassPlayWith(f.scenario.state, f.calls, "s6-caught-gate", withOuts(S5S_TUNABLES, block), { petitions });
    expect(play(H8, { ...GRANTED_S6, P20: false })).toThrow(PocketRulesError);
    expect(play(H7H8_UNSEEN, { ...GRANTED_S6, P21: false })).toThrow(PocketRulesError);
    expect(play(H7H8_UNSEEN, { ...GRANTED_S6, P20: false })).toThrow(PocketRulesError);
    // SEEN with P21 withheld plays.
    expect(play(H8, { ...GRANTED_S6, P21: false })().events.length).toBeGreaterThan(0);
    // The build's own petitions: P20 is in, so SEEN plays; P21 is out, so the unseen leaf is refused by name.
    expect(simulatePassPlay(f.scenario.state, f.calls, "s6-caught-gate", withOuts(S5S_TUNABLES, H8)).events.length).toBeGreaterThan(0);
    expect(() => simulatePassPlay(f.scenario.state, f.calls, "s6-caught-gate", withOuts(S5S_TUNABLES, H7H8_UNSEEN))).toThrow(
      "pocket.outs.caughtSeen UNSEEN_IF_UNREGISTERED is refused until petition P21 is in contracts",
    );
  });
});
