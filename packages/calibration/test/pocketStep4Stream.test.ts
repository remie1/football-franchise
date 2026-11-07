/**
 * ADR-089 step 4 — THE STEP-4 STREAM FOLDS (plan §2.4, §5; AM-7's hitConstruct, s4.tilt.reading and
 * s4.curve.weights), on streams built by hand.
 *
 * No stream of this build carries an `arrival_contest` CHECK, a `QB_HIT` or `THROW.releaseSeconds`
 * (P6, P7 and P8 are not in contracts, and nothing here writes one onto a played stream): every
 * stream below is a golden C1 game whose plays are copied, re-stamped `pocket-1.s4` and given those
 * events by hand, in memory only. The same copy stamped `pocket-1.s3` reads exactly as the original:
 * the folds key on the stamp, never on an event being present.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { armById } from "../src/pocket/arms.js";
import { intGuard, mixPredictedRise, mixPredictedRiseOwnClock, intGuardOwnClock } from "../src/pocket/bands.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { clockKeyOf } from "../src/pocket/freeRunKey.js";
import { emptyM3Fold, foldM3Dropback, s4SackCreditOf, sackCreditsOf } from "../src/pocket/m3SackerMix.js";
import { emptyM6Step4Fold, foldM6Step4Dropback, foldM6Step4Game, m6Step4Summary } from "../src/pocket/m6Contact.js";
import { POCKET_1_S3_DIGEST, POCKET_1_S3_RULES, POCKET_1_S4_CONTACT, POCKET_1_S4_DIGEST, POCKET_1_S4_RULES } from "../src/pocket/rules.js";
import {
  contactClassOf,
  emptyS4Fold,
  foldS4Game,
  foldS4Play,
  hitCurveOf,
  hitCurveSlope,
  mergeS4Folds,
  readS4Play,
  s4Problems,
  sackShareOf,
  secondArrivalRateOf,
  TILT_SOURCES,
  type ContestAt,
  type S4Play,
} from "../src/pocket/s4Stream.js";
import { emptyAffectedFold, foldAffectedGame } from "../src/pocket/s1Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { tiltReading } from "../src/pocket/step4.js";
import { playsOf, readDropback, type PlaySlice } from "../src/pocket/throwClass.js";

type Ev = MatchEventEnvelope;
const C1 = armById("C1").tunables;
const KEY = clockKeyOf(C1);
const S4 = { name: POCKET_1_S4_RULES, overlayDigest: POCKET_1_S4_DIGEST };
const S3 = { name: POCKET_1_S3_RULES, overlayDigest: POCKET_1_S3_DIGEST };

const payloadOf = (e: Ev): Record<string, unknown> => ((e.event as { readonly payload?: unknown }).payload ?? {}) as Record<string, unknown>;
const like = (e: Ev, type: string, payload: Record<string, unknown>): Ev => ({ ...e, event: { ...(e.event as object), type, payload } }) as unknown as Ev;
const restamp = (events: readonly Ev[], rules: { readonly name: string; readonly overlayDigest: string }): Ev[] =>
  events.map((e) => (e.event.type === "PLAY_START" ? like(e, "PLAY_START", { ...payloadOf(e), rules }) : e));
const roll = (label: string, total: number, tilt?: string): Record<string, unknown> => ({ die: "d100", raw: total, modifiers: tilt === undefined ? [] : [{ source: tilt, value: 5 }], total, rngLabel: label });
const contestCheck = (at: Ev, rusher: string, qb: string, tick: number, band: string, second = false, tilt?: string): Ev =>
  like(at, "CHECK", {
    checkKind: "arrival_contest",
    actors: [rusher, qb],
    roll: roll(`rush/t${String(tick)}/${rusher}:${second ? "contest2" : "contest"}`, 60, tilt),
    ...(second ? {} : { opposedRoll: roll(`rush/t${String(tick)}/${rusher}:contest:qb`, 40) }),
    tier: "SUCCESS",
    margin: 20,
    testsAttrs: [],
    target: 50,
    band,
  });
const qbHit = (at: Ev, qb: string, rusher: string, phase: string, extra: Record<string, unknown> = {}): Ev =>
  like(at, "QB_HIT", { qb, rusher, phase, contactSeconds: 2.1, approach: "FREE", from: "FRONT", seen: true, ...extra });

interface Sample {
  readonly events: readonly Ev[];
  readonly slice: PlaySlice;
}

/** The first golden C1 plays of three kinds: a sack with an arrival, a throw after an arrival, a throw with none. */
function samples(): { readonly sack: Sample; readonly arrivedThrow: Sample; readonly cleanThrow: Sample; readonly game: readonly Ev[] } {
  let sack: Sample | undefined;
  let arrivedThrow: Sample | undefined;
  let cleanThrow: Sample | undefined;
  let game: readonly Ev[] | undefined;
  goldenGames("flat", (o) => {
    game ??= o.events;
    for (const slice of playsOf(o.events)) {
      const d = readDropback(slice);
      if (d === undefined) continue;
      const p = readS4Play(slice, KEY)!;
      if (d.sacked && d.threats.some((t) => t.state === "ARRIVED")) sack ??= { events: o.events, slice };
      else if (d.throwTick !== undefined && p.standInHit) arrivedThrow ??= { events: o.events, slice };
      else if (d.throwTick !== undefined && !p.standInHit && !d.scramble) cleanThrow ??= { events: o.events, slice };
    }
  }, { tunables: C1, callerVersion: STEP1_CALLER, first: 6 });
  if (sack === undefined || arrivedThrow === undefined || cleanThrow === undefined || game === undefined) throw new Error("the golden C1 games hold no sample of each kind");
  return { sack, arrivedThrow, cleanThrow, game };
}

const S = samples();
const qbOf = (slice: PlaySlice): string => String((payloadOf(slice.events.find((e) => e.event.type === "PLAY_START")!)["offense"] as Record<string, unknown>)["quarterback"]);
const tickAt = (events: readonly Ev[], i: number): number => {
  let t = 0;
  for (let k = 0; k <= i; k++) if (events[k]!.event.type === "TICK") t = Number(payloadOf(events[k]!)["tick"]);
  return t;
};

/** A play re-stamped and given contact events: after the last ARRIVED threat (a contest and a QB_HIT), before the THROW (a THROWING hit), and `releaseSeconds` on the THROW. */
function built(slice: PlaySlice, rules: { readonly name: string; readonly overlayDigest: string }, opts: { readonly contest?: "RUSHER_SACKS" | "QB_SHEDS"; readonly throwing?: boolean; readonly release?: number; readonly sacker?: string }): { readonly events: Ev[]; readonly rusher: string } {
  const events = restamp(slice.events, rules);
  const qb = qbOf(slice);
  const arrived = events.map((e, i) => [e, i] as const).filter(([e]) => e.event.type === "RUSH_THREAT" && payloadOf(e)["state"] === "ARRIVED").pop();
  const rusher = opts.sacker ?? (arrived === undefined ? "p:none" : String(payloadOf(arrived[0])["rusher"]));
  const out: Ev[] = [];
  events.forEach((e, i) => {
    if (e.event.type === "THROW" && opts.throwing === true) out.push(qbHit(e, qb, "p:t:00:DE0", "THROWING"));
    out.push(e.event.type === "THROW" && opts.release !== undefined ? like(e, "THROW", { ...payloadOf(e), releaseSeconds: opts.release }) : e);
    if (arrived !== undefined && i === arrived[1] && opts.contest !== undefined) {
      const tick = tickAt(events, i);
      const check = contestCheck(e, rusher, qb, tick, opts.contest);
      out.push(check);
      if (opts.contest === "QB_SHEDS") out.push(qbHit(e, qb, rusher, "SHED", { rollRef: `rush/t${String(tick)}/${rusher}:contest` }));
      else out.push(qbHit(e, qb, rusher, "ARRIVAL"));
    }
  });
  return { events: out, rusher };
}

const sliceOf = (events: readonly Ev[]): PlaySlice => playsOf(events)[0]!;

describe("the s4 stream on hand-built plays (s4Stream.ts)", () => {
  it("a sack at contact: one rated contest, credited, an ARRIVAL hit, C-1 agrees", () => {
    const { events } = built(S.sack.slice, S4, { contest: "RUSHER_SACKS" });
    const play = readS4Play(sliceOf(events), KEY)!;
    expect(play.s4).toBe(true);
    expect(play.contests).toHaveLength(1);
    expect(play.contests[0]).toMatchObject({ band: "RUSHER_SACKS", second: false, tilt: "NONE", tilts: 0 });
    const f = emptyS4Fold();
    foldS4Play(f, play, C1);
    expect(f).toMatchObject({ plays: 1, s4Plays: 1, sacks: 1, creditedSacks: 1, uncreditedSacks: 0, hitOrSack: 1, standIn: 1, arrivalShedOrSack: 1, c1Mismatch: 0, problemCount: 0 });
    expect(f.contest).toEqual({ contacts: 1, sacks: 1 });
    expect(f.first).toEqual({ contacts: 1, sacks: 1 });
    expect(f.hitsByPhase).toEqual({ ARRIVAL: 1, THROWING: 0, SHED: 0 });
    expect(sackShareOf(f.contest)).toBe(1);
    expect(s4Problems(f)).toEqual([]);
  });

  it("a shed then a throw hit inside the motion: the SHED's roll reference, a THROWING hit, releaseSeconds on the curve", () => {
    const { events } = built(S.arrivedThrow.slice, S4, { contest: "QB_SHEDS", throwing: true, release: 2.7 });
    const play = readS4Play(sliceOf(events), KEY)!;
    expect(play.releaseSeconds).toBe(2.7);
    const f = emptyS4Fold();
    foldS4Play(f, play, C1);
    expect(f.problemCount).toBe(0);
    expect(f).toMatchObject({ shedPlays: 1, hitOrSack: 1, hitOnAttempt: 1, hitOnAimed: 1, standIn: 1, arrivalShedOrSack: 1, throwingOnly: 0, c1Mismatch: 0, qbHits: 2 });
    expect(f.hitsByPhase).toEqual({ ARRIVAL: 0, SHED: 1, THROWING: 1 });
    expect(f.curve["2.5-3.0"]).toEqual({ attempts: 1, aimed: 1, hit: 1 });
    expect(f.tttAimed).toEqual({ n: 1, sum: 2.7 });
  });

  it("s4.sackCredit: a sack with no RUSHER_SACKS contact fails only in the pocket under the contact block; the motion alone and an escape run down keep today's rule, counted apart", () => {
    const play = readS4Play(sliceOf(built(S.sack.slice, S4, {}).events), KEY)!;
    expect(play.contests).toHaveLength(0);
    const withContact = { ...C1, pocket: { ...C1.pocket, contact: POCKET_1_S4_CONTACT } } as typeof C1;
    const motionAlone = emptyS4Fold();
    foldS4Play(motionAlone, play, C1);
    expect(motionAlone).toMatchObject({ sacks: 1, creditedSacks: 0, legacySacks: 1, escapeSacks: 0, uncreditedSacks: 0 });
    expect(s4Problems(motionAlone)).toEqual([]);
    const escape = emptyS4Fold();
    foldS4Play(escape, { ...play, dropback: { ...play.dropback, pursuitTick: play.dropback.endTick } }, withContact);
    expect(escape).toMatchObject({ sacks: 1, legacySacks: 0, escapeSacks: 1, uncreditedSacks: 0 });
    const inPocket = emptyS4Fold();
    foldS4Play(inPocket, { ...play, dropback: { ...play.dropback, pursuitTick: undefined } }, withContact);
    expect(inPocket).toMatchObject({ sacks: 1, uncreditedSacks: 1 });
    expect(s4Problems(inPocket)).toEqual(["s4.sackCredit: 1 of 1 sack(s) in the pocket under the contact block hold no RUSHER_SACKS contact"]);
    expect(mergeS4Folds(motionAlone, escape)).toMatchObject({ sacks: 2, legacySacks: 1, escapeSacks: 1, uncreditedSacks: 0 });
  });

  it("s4.sackCredit on engine-shaped plays: a caught escape (a scramble CHECK sacked, no QB_PURSUIT) and the coverage sack at the horizon (nobody ARRIVED) keep today's rule; an ARRIVED man with no contest fails", () => {
    const withContact = { ...C1, pocket: { ...C1.pocket, contact: POCKET_1_S4_CONTACT } } as typeof C1;
    const restamped = restamp(S.sack.slice.events, S4);
    const qb = qbOf(S.sack.slice);
    const arrivedAt = restamped.findIndex((e) => e.event.type === "RUSH_THREAT" && payloadOf(e)["state"] === "ARRIVED");
    expect(arrivedAt).toBeGreaterThan(0);
    // The engine's caught escape (passPlay.ts, ESCAPE then escape.sacked): the scramble CHECK, then the catcher ARRIVED, then the sack; no QB_PURSUIT.
    const caughtBand = C1.scramble.bands.find((b) => b.sacked)!.label;
    const escapeCheck = like(restamped[arrivedAt]!, "CHECK", {
      checkKind: "scramble",
      actors: [qb, String(payloadOf(restamped[arrivedAt]!)["rusher"])],
      roll: roll("pocket/t2.0:scramble", 10),
      target: 50,
      tier: "FAILURE",
      band: caughtBand,
      margin: -40,
      testsAttrs: [],
    });
    const caught = [...restamped.slice(0, arrivedAt), escapeCheck, ...restamped.slice(arrivedAt)];
    const escapePlay = readS4Play(sliceOf(caught), KEY)!;
    expect(escapePlay.dropback.pursuitTick).toBeUndefined();
    expect(escapePlay.dropback.sacked).toBe(true);
    const escape = emptyS4Fold();
    foldS4Play(escape, escapePlay, withContact);
    expect(escape).toMatchObject({ sacks: 1, escapeSacks: 1, coverageSacks: 0, uncreditedSacks: 0 });
    expect(s4Problems(escape)).toEqual([]);
    // A scramble CHECK that was not a catch (CONTAINED) earlier on the play does not excuse a sack.
    const contained = [...restamped.slice(0, arrivedAt), like(escapeCheck, "CHECK", { ...payloadOf(escapeCheck), band: "CONTAINED", margin: -10 }), ...restamped.slice(arrivedAt)];
    const notEscape = emptyS4Fold();
    foldS4Play(notEscape, readS4Play(sliceOf(contained), KEY)!, withContact);
    expect(notEscape).toMatchObject({ sacks: 1, escapeSacks: 0, uncreditedSacks: 1 });
    // The coverage sack at the horizon: no contest and no man standing ARRIVED at the end.
    const play = readS4Play(sliceOf(restamped), KEY)!;
    const horizon = emptyS4Fold();
    foldS4Play(horizon, { ...play, dropback: { ...play.dropback, threats: play.dropback.threats.filter((t) => t.state !== "ARRIVED") } }, withContact);
    expect(horizon).toMatchObject({ sacks: 1, coverageSacks: 1, uncreditedSacks: 0 });
    // A man shed (DELAYED after his ARRIVED) and the horizon reached is a coverage sack too.
    const shed = emptyS4Fold();
    const last = play.dropback.threats.filter((t) => t.state === "ARRIVED").pop()!;
    foldS4Play(shed, { ...play, dropback: { ...play.dropback, threats: [...play.dropback.threats, { ...last, state: "DELAYED", etaTick: last.etaTick + 0.5 }] } }, withContact);
    expect(shed).toMatchObject({ sacks: 1, coverageSacks: 1, uncreditedSacks: 0 });
    expect(mergeS4Folds(escape, horizon)).toMatchObject({ sacks: 2, escapeSacks: 1, coverageSacks: 1 });
  });

  it("a THROWING hit on a play with no arrival: V1-42 counts it, the stand-in does not, and C-1 still agrees (it compares ARRIVAL or SHED)", () => {
    const { events } = built(S.cleanThrow.slice, S4, { throwing: true });
    const f = emptyS4Fold();
    foldS4Game(f, events, C1);
    expect(f).toMatchObject({ hitOrSack: 1, hitOnAimed: 1, throwingOnly: 1, standIn: 0, arrivalShedOrSack: 0, c1Mismatch: 0, problemCount: 0 });
  });

  it("the very same events stamped pocket-1.s3 read nothing past the stamp", () => {
    const { events } = built(S.sack.slice, S3, { contest: "RUSHER_SACKS", throwing: true });
    const f = emptyS4Fold();
    foldS4Game(f, events, C1);
    expect(f.plays).toBe(1);
    expect(f.s4Plays).toBe(0);
    expect(f.contest).toEqual({ contacts: 0, sacks: 0 });
    expect(f.qbHits).toBe(0);
  });

  it("each build fault is a problem: a stray band, two tilts, a tilt off its class, a :contest2 before a shed, an unknown phase, a SHED naming no shed, C-1", () => {
    const base = readS4Play(sliceOf(built(S.arrivedThrow.slice, S4, {}).events), KEY)!;
    const c = (over: Partial<ContestAt>): ContestAt => ({ tick: 1, rusher: "r", quarterback: "q", band: "QB_SHEDS", margin: 1, second: false, rngLabel: "rush/t1/r:contest", tilt: "NONE", tilts: 0, cls: "NONE", labelFree: false, ...over });
    const hit = { tick: 1, rusher: "r", contactSeconds: 1, rollRef: undefined, approach: "FREE", from: "FRONT", seen: true };
    const cases: readonly [string, S4Play][] = [
      ["band", { ...base, contests: [c({ band: "MISSED" })], hits: [{ ...hit, phase: "ARRIVAL" }] }],
      ["tilts", { ...base, contests: [c({ tilts: 2, tilt: "FREE_RUN", cls: "FREE_RUN" })], hits: [{ ...hit, phase: "ARRIVAL" }] }],
      ["class", { ...base, contests: [c({ tilt: "PUSH_BLOCKED", cls: "FREE_RUN" })], hits: [{ ...hit, phase: "ARRIVAL" }] }],
      ["contest2", { ...base, contests: [c({ second: true, rngLabel: "rush/t1/r:contest2", band: "RUSHER_SACKS" }), c({})], hits: [{ ...hit, phase: "ARRIVAL" }] }],
      ["phase", { ...base, contests: [], hits: [{ ...hit, phase: "LATE" }, { ...hit, phase: "ARRIVAL" }] }],
      ["rollRef", { ...base, contests: [c({})], hits: [{ ...hit, phase: "SHED", rollRef: "rush/t9/x:contest" }] }],
      ["C-1", { ...base, contests: [], hits: [{ ...hit, phase: "THROWING" }] }],
    ];
    for (const [name, play] of cases) {
      const f = emptyS4Fold();
      foldS4Play(f, play, C1);
      expect(f.problemCount, name).toBeGreaterThan(0);
    }
    const missing = emptyS4Fold();
    foldS4Play(missing, { ...base, contests: [c({})], hits: [{ ...hit, phase: "SHED", rollRef: "rush/t1/r:contest", seen: undefined }] }, C1);
    expect(missing.qbHitsMissingFields).toBe(1);
    expect(s4Problems(missing).some((p) => p.startsWith("s4.qbHitFields"))).toBe(true);
  });

  it("the second arrival: a :contest2 after a shed is counted apart and gives the second-arrival rate", () => {
    const base = readS4Play(sliceOf(built(S.arrivedThrow.slice, S4, {}).events), KEY)!;
    const c = (over: Partial<ContestAt>): ContestAt => ({ tick: 1, rusher: "r", quarterback: "q", band: "QB_SHEDS", margin: 1, second: false, rngLabel: "rush/t1/r:contest", tilt: "NONE", tilts: 0, cls: "NONE", labelFree: false, ...over });
    const f = emptyS4Fold();
    foldS4Play(f, { ...base, contests: [c({}), c({ tick: 1.5, second: true, band: "RUSHER_SACKS", rngLabel: "rush/t1.5/r:contest2" })], hits: [{ tick: 1, rusher: "r", phase: "SHED", contactSeconds: 1, rollRef: "rush/t1/r:contest", approach: "FREE", from: "FRONT", seen: true }] }, C1);
    expect(f.problemCount).toBe(0);
    expect(f).toMatchObject({ shedPlays: 1, laterContactPlays: 1 });
    expect(f.contest2).toEqual({ contacts: 1, sacks: 1 });
    expect(f.first).toEqual({ contacts: 1, sacks: 0 });
    expect(secondArrivalRateOf(f)).toBe(1);
  });

  it("the class rule: BEHIND or NEVER over a seen PUSH or BLOCKED over the free-run clock", () => {
    expect(contactClassOf({ approach: "ARC", liveAtStepUp: true, seen: true, onFreeRunClock: true })).toBe("BEHIND_NEVER");
    expect(contactClassOf({ approach: "PUSH", liveAtStepUp: false, seen: false, onFreeRunClock: false })).toBe("BEHIND_NEVER");
    expect(contactClassOf({ approach: "PUSH", liveAtStepUp: false, seen: true, onFreeRunClock: true })).toBe("PUSH_BLOCKED");
    expect(contactClassOf({ approach: "BLOCKED", liveAtStepUp: false, seen: true, onFreeRunClock: false })).toBe("PUSH_BLOCKED");
    expect(contactClassOf({ approach: "FREE", liveAtStepUp: false, seen: true, onFreeRunClock: true })).toBe("FREE_RUN");
    expect(contactClassOf({ approach: "ARC", liveAtStepUp: false, seen: true, onFreeRunClock: false })).toBe("NONE");
    // A tilt read off its roll's modifier source; one on the class's own source is no problem.
    const { events } = built(S.sack.slice, S4, { contest: "RUSHER_SACKS" });
    const tilted = events.map((e) => (e.event.type === "CHECK" && payloadOf(e)["checkKind"] === "arrival_contest" ? like(e, "CHECK", { ...payloadOf(e), roll: roll(String((payloadOf(e)["roll"] as Record<string, unknown>)["rngLabel"]), 60, TILT_SOURCES.FREE_RUN) }) : e));
    expect(readS4Play(sliceOf(tilted), KEY)!.contests[0]!.tilt).toBe("FREE_RUN");
  });

  it("merging two folds sums them; the curve's slope weights by aimed throws, attempts beside", () => {
    const a = emptyS4Fold();
    const b = emptyS4Fold();
    a.curve["2.0-2.5"] = { attempts: 12, aimed: 10, hit: 1 };
    b.curve["3.5-4.0"] = { attempts: 10, aimed: 10, hit: 4 };
    a.byClass.FREE_RUN = { contacts: 3, sacks: 1 };
    b.byClass.FREE_RUN = { contacts: 2, sacks: 2 };
    const m = mergeS4Folds(a, b);
    expect(m.byClass.FREE_RUN).toEqual({ contacts: 5, sacks: 3 });
    expect(hitCurveOf(m).aimed).toEqual([0, 10, 0, 0, 10, 0, 0]);
    expect(hitCurveSlope(m, "AIMED")).toBeGreaterThan(0);
    expect(hitCurveSlope(m, "ATTEMPTS")).toBeGreaterThan(0);
    expect(hitCurveSlope(m, "AIMED")).not.toBe(hitCurveSlope(m, "ATTEMPTS"));
  });
});

describe("M3 and M6 at step 4, and the affected count", () => {
  it("M3 credits the man at contact on an s4 sack, the last arrival otherwise", () => {
    const { events } = built(S.sack.slice, S4, { contest: "RUSHER_SACKS", sacker: "p:t:00:DT9" });
    const d = readDropback(sliceOf(events))!;
    expect(s4SackCreditOf(d)?.last).toBe("p:t:00:DT9");
    expect(sackCreditsOf(d)?.last).not.toBe("p:t:00:DT9");
    const positionOf = (id: string): string => (id === "p:t:00:DT9" ? "DT" : "DE");
    const s4 = emptyM3Fold();
    foldM3Dropback(s4, d, positionOf, true);
    const legacy = emptyM3Fold();
    foldM3Dropback(legacy, d, positionOf, false);
    expect(s4.unsplit).toEqual({ interior: 1 });
    expect(legacy.unsplit).toEqual({ edge: 1 });
  });

  it("M3 on an s4 sack with no RUSHER_SACKS contest falls back to today's rule, as the engine's statline does", () => {
    const d = readDropback(sliceOf(built(S.sack.slice, S4, {}).events))!;
    expect(s4SackCreditOf(d)).toBeUndefined();
    const positionOf = (id: string): string => (id.includes("DT") ? "DT" : "DE");
    const s4 = emptyM3Fold();
    foldM3Dropback(s4, d, positionOf, true);
    const legacy = emptyM3Fold();
    foldM3Dropback(legacy, d, positionOf, false);
    expect(s4).toEqual(legacy);
    expect(s4.noArrival).toBe(0);
  });

  it("M6 at step 4: every contact FIGHT, by band; an earlier stamp is counted and read no further", () => {
    const { events } = built(S.sack.slice, S4, { contest: "RUSHER_SACKS" });
    const f = emptyM6Step4Fold();
    foldM6Step4Game(f, events);
    expect(f).toMatchObject({ dropbacks: 1, s4Dropbacks: 1, contacts: 1, fight: 1, byBand: { RUSHER_SACKS: 1 }, throwawayAfterShed: 0, throwawayWithArrived: 0 });
    expect(m6Step4Summary(f)["fightPctOfContacts"]).toBe(100);
    const g = emptyM6Step4Fold();
    foldM6Step4Dropback(g, readDropback(sliceOf(built(S.sack.slice, S3, { contest: "RUSHER_SACKS" }).events))!, false);
    expect(g).toMatchObject({ dropbacks: 1, s4Dropbacks: 0, contacts: 0 });
  });

  it("M6 at step 4: a throwaway after a shed on the contact's tick is the move branch, reported, never a fault; a throwaway with a man still ARRIVED is the contact choice step 7 adds, a fault", () => {
    const d = readDropback(sliceOf(built(S.arrivedThrow.slice, S4, { contest: "QB_SHEDS" }).events))!;
    const c = d.checks.find((x) => x.checkKind === "arrival_contest")!;
    const arrived = d.threats.filter((t) => t.state === "ARRIVED").pop()!;
    const asThrowaway = (threats: typeof d.threats): typeof d => ({
      ...d,
      threats,
      decisions: [...d.decisions.filter((x) => x.tick < c.tick), { tick: c.tick, choice: "THROWAWAY" }],
      throwTick: undefined,
      throwawayTick: c.tick,
    });
    // §4.5 item 4: the shed puts his threat back (DELAYED), the move branch runs and throws it away.
    const afterShed = emptyM6Step4Fold();
    foldM6Step4Dropback(afterShed, asThrowaway([...d.threats, { ...arrived, tick: c.tick, state: "DELAYED", etaTick: c.tick + 0.5 }]), true);
    expect(afterShed).toMatchObject({ contacts: 1, throwawayAfterShed: 1, throwawayWithArrived: 0 });
    expect(m6Step4Summary(afterShed)["throwawayAfterShed"]).toBe(1);
    // A throwaway while a man stands ARRIVED (no contest took him): a contact choice, none before step 7.
    const choice = emptyM6Step4Fold();
    foldM6Step4Dropback(choice, { ...asThrowaway(d.threats), checks: d.checks.filter((x) => x.checkKind !== "arrival_contest") }, true);
    expect(choice).toMatchObject({ contacts: 0, throwawayWithArrived: 1 });
  });

  it("CONTACT and MOTION touch the plays with a contest and a THROWING hit", () => {
    const events = [...built(S.sack.slice, S4, { contest: "RUSHER_SACKS" }).events, ...built(S.cleanThrow.slice, S4, { throwing: true }).events];
    const f = emptyAffectedFold(["CONTACT", "MOTION"]);
    foldAffectedGame(f, events, C1, ["CONTACT", "MOTION"]);
    expect(f.byMechanism).toEqual({ CONTACT: 1, MOTION: 1 });
    expect(f.union).toBe(2);
  });
});

describe("collect.ts: V1-42 keyed on the stamp; releaseSeconds read on s4 only", () => {
  const withInjected = (rules: { readonly name: string; readonly overlayDigest: string }): Ev[] => {
    const target = S.cleanThrow.slice.playId;
    const out: Ev[] = [];
    const replaced = built(S.cleanThrow.slice, rules, { throwing: true, release: 3.3 }).events;
    let done = false;
    for (const e of S.cleanThrow.events) {
      if ((e.event as { readonly playId?: unknown }).playId === target) {
        if (!done) out.push(...replaced);
        done = true;
      } else out.push(e);
    }
    return out;
  };

  it("a THROWING hit on a pass attempt counts under pocket-1.s4 and not under pocket-1.s3; the s4 THROW's releaseSeconds is the time to throw", () => {
    let base: Parameters<typeof foldGame>[1] | undefined;
    goldenGames("flat", (o) => {
      if (base === undefined && o.events.some((e) => (e.event as { readonly playId?: unknown }).playId === S.cleanThrow.slice.playId)) base = o;
    }, { tunables: C1, callerVersion: STEP1_CALLER, first: 6 });
    expect(base).toBeDefined();
    const run = (events: readonly Ev[]) => foldGame(emptyAccumulator(), { ...base!, events: events as Ev[] }, C1);
    const original = run(base!.events);
    const s3 = run(withInjected(S3));
    const s4 = run(withInjected(S4));
    // Under pocket-1.s3 the QB_HIT and releaseSeconds are not read: every figure is the original's.
    expect(s3.play.pocket.hitOnAttemptDropbacks).toBe(original.play.pocket.hitOnAttemptDropbacks);
    expect(s3.play.throwTicks).toEqual(original.play.throwTicks);
    // Under pocket-1.s4 a hit is a QB_HIT: this play's THROWING hit adds one dropback, and its release is 3.3 s.
    expect(s4.play.throwTicks).toContain(3.3);
    expect(s4.play.throwTicks).toHaveLength(original.play.throwTicks.length);
    expect(s4.play.pocket.hitOrSackDropbacks).toBeGreaterThanOrEqual(1);
    // Every other play is still stamped pocket-1.s3, and the re-stamped play had no stand-in hit: one more.
    expect(s4.play.pocket.hitOnAttemptDropbacks).toBe(original.play.pocket.hitOnAttemptDropbacks + 1);
  });
});

describe("bands.ts: the own-clock print beside the unchanged mixPredictedRise", () => {
  it("equals mixPredictedRise when both sides read one clock, and adds the tables' difference on an unchanged mix across clocks", () => {
    const base = [10, 30, 40, 20, 10, 5, 2];
    const arm = [8, 28, 44, 22, 9, 6, 1];
    for (const clock of ["TICK", "RAW"] as const) expect(mixPredictedRiseOwnClock(base, arm, clock, clock)).toBeCloseTo(mixPredictedRise(base, arm, clock), 12);
    const same = mixPredictedRiseOwnClock(base, base, "TICK", "RAW");
    expect(mixPredictedRise(base, base, "RAW")).toBeCloseTo(0, 12);
    expect(same).toBeGreaterThan(0.1);
    const v = intGuardOwnClock({ aimedByBin: base, interceptions: 3 }, { aimedByBin: base, interceptions: 3 }, "TICK", "RAW");
    expect(v.rise).toBeCloseTo(0, 12);
    expect(v.allowed).toBeCloseTo(same, 12);
    expect(intGuard({ aimedByBin: base, interceptions: 3 }, { aimedByBin: base, interceptions: 3 }, "RAW").allowed).toBeCloseTo(0, 12);
    expect(() => mixPredictedRiseOwnClock([1], base, "TICK", "RAW")).toThrow(/one count per release bin/);
  });
});

describe("AM-7's tilt reading (step4.ts tiltReading)", () => {
  const fold = (contacts: number, sacks: number) => {
    const f = emptyS4Fold();
    f.byClass.PUSH_BLOCKED = { contacts, sacks };
    return f;
  };
  it("passes in its direction, fails only beyond 2 SE the wrong way, and is unreadable under 30 contacts on a side", () => {
    expect(tiltReading([fold(200, 40)], [fold(200, 60)], "PUSH_BLOCKED", "DOWN").verdict).toBe("PASS");
    expect(tiltReading([fold(200, 62)], [fold(200, 60)], "PUSH_BLOCKED", "DOWN").verdict).toBe("PASS");
    expect(tiltReading([fold(400, 160)], [fold(400, 80)], "PUSH_BLOCKED", "DOWN").verdict).toBe("FAIL");
    expect(tiltReading([fold(400, 80)], [fold(400, 160)], "PUSH_BLOCKED", "UP").verdict).toBe("FAIL");
    expect(tiltReading([fold(29, 10)], [fold(400, 80)], "PUSH_BLOCKED", "DOWN").verdict).toBe("UNREADABLE");
    expect(tiltReading([fold(0, 0)], [fold(400, 80)], "PUSH_BLOCKED", "DOWN")).toMatchObject({ verdict: "UNREADABLE", diff: null });
    // Summed over leagues and sets.
    const r = tiltReading([fold(20, 4), fold(20, 4)], [fold(20, 8), fold(20, 8)], "PUSH_BLOCKED", "DOWN");
    expect(r.tilted).toEqual({ contacts: 40, sacks: 8 });
    expect(r.diff).toBeCloseTo(-20, 12);
  });
});
