/**
 * ADR-089 step 6: THE READERS, ON CONSTRUCTED STEP-6 STREAMS (step-6 plan §3.2 K2).
 *
 * Each reader step 6 teaches is held here on plays built in the engine's step-6 shape
 * (`s6Fixtures.ts`), read with H0's own tunables (every outs part, the recommended answers; built by
 * `buildStep6Arm` with its own petitions true, as step 4's tests did before step 4's lift, and never
 * played): the shared step-6 reading (`s6Stream.ts`); the OUT_OF_POCKET throwaway named in the forced-act
 * fold and left out as an act after pursuit; the `:deadline` pick taught wherever `:clean` was; the escape
 * roll's outcome by the CHECK band, a catch split into sacked at the roll and shed; the cap and the real
 * throwaway rule in the cross-check and the must-act witness; the failed-scramble marker in the dropback
 * reader, the metrics fold and the sacker mix; the contact at the escape site; `QB_HIT.approach` BLOCKED;
 * M5's step-6 rows; the rows' OUT_OF_POCKET; and step 6's rows. The same readers on played step-6 games
 * are `pocketStep6Lifted.test.ts`, skipped until the lift. Q-2g (`pocketRefoldS6*.test.ts`) holds every
 * reader's fold on every s1 to s5a stream to the old readers'.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type GameSnapshot, type Tunables } from "@ff/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame, mergeAccumulators, type SimGameObservation } from "../src/metrics/collect.js";
import { pocketTables } from "../src/metrics/pocketRows.js";
import { buildStep6Arm, MECHANISMS, step6ArmDef } from "../src/pocket/arms.js";
import { FUTURE_ROWS } from "../src/pocket/bands.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { shedEscapeRollsOf } from "../src/pocket/m2ForcingSource.js";
import { emptyM3Fold, foldM3Dropback, foldM3Game, s6SackCreditOf, SCRAMBLE_TACKLE_ORIGIN } from "../src/pocket/m3SackerMix.js";
import { emptyM5Game, m5Compare, m5GameOf, type M5Game } from "../src/pocket/m5Mirror.js";
import { crossCheckMovement, emptyM6Fold, emptyM6Step4Fold, foldM6Step4Dropback, foldM6Step4Game, playersOfSnapshot, rankedResponsesOf } from "../src/pocket/m6Contact.js";
import { emptyCleanPocketRowsFold, emptyRowsFold, foldCleanPocketRowsGame, foldRowsGame, isThrowawayInPocket, rowPocketOf } from "../src/pocket/rows.js";
import { STEP6_PETITIONS_GRANTED } from "../src/pocket/rules.js";
import { emptyAffectedFold, emptyS1Folds, foldAffectedGame, foldS1Game } from "../src/pocket/s1Stream.js";
import { emptyS2Folds, forcedActsOf, readS2Play, s2Checks, s2ContextOf, s2PlaysOf, s2Problems } from "../src/pocket/s2Stream.js";
import { emptyS3Folds, foldS3Game } from "../src/pocket/s3Stream.js";
import { emptyS4Fold, foldS4Game, s4PlaysOf, s4Problems } from "../src/pocket/s4Stream.js";
import { emptyS5Fold, escapeOfferedAt, foldS5Dropback, foldS5Game, s5DropbacksOf } from "../src/pocket/s5Stream.js";
import { emptyS6RowsFold, foldS6RowsGame, s6Rows, wholePlayPocketOf } from "../src/pocket/s6Rows.js";
import {
  escapeBandOutcomeOf,
  escapeRollSpendsS6,
  isDeadlinePickLabel,
  OUT_OF_POCKET,
  readS6Play,
  spentRollsBefore,
  throwawayAvailableAt,
  throwawayLegalAt,
} from "../src/pocket/s6Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { emptyStep5LeagueFolds, foldStep5Game } from "../src/pocket/step5.js";
import { boxScoreScrambleOf, desperationPocketOf, dropbacksOf, playsOf, readDropback, releaseTickOf, throwClassOf, throwClassOfS5, type Dropback } from "../src/pocket/throwClass.js";
import {
  BLOCKED_CATCH_SACK,
  BLOCKED_SHED_THEN_THROW,
  check,
  constructedGame,
  CONTAINED_THEN_SPENT_HOLD,
  DEADLINE_THROWAWAY,
  FAILED_SCRAMBLE,
  LABEL_RULE_SACK,
  LATE_DEADLINE_THROWAWAY,
  LATE_FAILED_SCRAMBLE,
  NOBODY_CATCH_SACK,
  NOBODY_CATCH_SACK_UNARRIVED,
  onePlay,
  SHED_THEN_SACK,
  throwaway,
  threat,
  tick,
  type PlaySpec,
} from "./s6Fixtures.js";

/** H0's tree: every outs part on F5's, the recommended answers (HOLD, ZERO_GAIN_ONLY, SEEN). Built, never played. */
const H0 = buildStep6Arm(step6ArmDef("H0")!, undefined, STEP6_PETITIONS_GRANTED).tunables;
/** H7: the side-aware catch alone (no caught escape as contact). */
const H7 = buildStep6Arm(step6ArmDef("H7")!, undefined, STEP6_PETITIONS_GRANTED).tunables;
/** H1: the real throwaway rule alone (no cap). */
const H1 = buildStep6Arm(step6ArmDef("H1")!, undefined, STEP6_PETITIONS_GRANTED).tunables;

const s6Of = (spec: PlaySpec, tunables: Tunables = H0) => readS6Play(onePlay(spec), tunables);
const dropbackOf = (spec: PlaySpec): Dropback => {
  const d = dropbacksOf(constructedGame("g", [spec]))[0];
  if (d === undefined) throw new Error("no dropback");
  return d;
};

describe("s6Stream: one play's step-6 facts", () => {
  it("the parts are on H0 and absent on every earlier tree", () => {
    expect(H0.pocket.outs?.escapeCap).toEqual({ maxPerPlay: 1, whenSpent: "HOLD" });
    expect(H0.pocket.outs?.caughtAsContact).toBe(true);
    expect(H0.pocket.outs?.throwawayRule).toBe(true);
    expect(DEFAULT_TUNABLES.pocket.outs).toBeUndefined();
  });

  it("reads nothing on a play stamped before step 6, or on a legacy play", () => {
    expect(s6Of({ ...FAILED_SCRAMBLE, rules: "pocket-1.s5a" })).toBeUndefined();
    expect(s6Of({ ...FAILED_SCRAMBLE, rules: "legacy" })).toBeUndefined();
    expect(s6Of(FAILED_SCRAMBLE)).toBeDefined();
  });

  it("a won escape: ESCAPED by its band, the drill's die, the direction, the run's tackler and the marker's sack", () => {
    const p = s6Of(FAILED_SCRAMBLE)!;
    expect(p.marker).toBe(true);
    expect(p.escapes).toHaveLength(1);
    expect(p.escapes[0]).toMatchObject({ tick: 1.5, band: "ESCAPED", outcome: "ESCAPED", eventOutcome: "ESCAPED", clean: false, offeredBy: "SOUND", spends: true, catcher: undefined, labelRuleSack: false });
    expect(p.drills).toEqual([{ tick: 1.5, receiver: "wr1", defender: "cb1", band: "EVEN" }]);
    expect(p.directions).toEqual([{ tick: 1.5, choice: "SCRAMBLE", direction: "LEFT" }]);
    expect(p.scramble).toEqual({ yards: -2, tackler: "lb1" });
    expect(p.failedScrambleSack).toBe(true);
    expect(p.sacked).toBe(true);
  });

  it("without the marker the same run is a scramble, not a sack", () => {
    const p = s6Of({ ...FAILED_SCRAMBLE, marker: false })!;
    expect(p.failedScrambleSack).toBe(false);
    expect(p.sacked).toBe(false);
  });

  it("the deadline pick: its tick, band and choice, and the OUT_OF_POCKET throwaway with P10's flag", () => {
    const p = s6Of(DEADLINE_THROWAWAY)!;
    expect(p.deadlinePicks).toEqual([{ tick: 6, band: "SOUND", rollRef: "g:play:1/movement/t6:deadline", choice: "THROWAWAY" }]);
    expect(p.throwaway).toEqual({ tick: 6, cause: OUT_OF_POCKET, outsideTackleBox: true });
    expect(p.escapes[0]?.outcome).toBe("ESCAPED");
    expect(p.sacked).toBe(false);
    expect(isDeadlinePickLabel("g:play:1/movement/t6:deadline")).toBe(true);
    expect(isDeadlinePickLabel("g:play:1/movement/t6:clean")).toBe(false);
  });

  it("a catch he sheds is CAUGHT_SHED by the band, CONTAINED by 5a's event reading; the catcher is the contest's rusher", () => {
    const p = s6Of(SHED_THEN_SACK)!;
    expect(p.escapes[0]).toMatchObject({ outcome: "CAUGHT_SHED", eventOutcome: "CONTAINED", catcher: "de1", contestBand: "QB_SHEDS", labelRuleSack: false });
    expect(p.sacked).toBe(true);
    expect(p.endTick).toBe(2);
  });

  it("a blocked catcher's catch: CAUGHT_SACKED, named by its contest with no ARRIVED", () => {
    const p = s6Of(BLOCKED_CATCH_SACK)!;
    expect(p.escapes[0]).toMatchObject({ outcome: "CAUGHT_SACKED", eventOutcome: "CAUGHT", catcher: "de1", contestBand: "RUSHER_SACKS", labelRuleSack: false });
  });

  it("a catch that names nobody: no catcher, even with an earlier ARRIVED on the play", () => {
    const p = s6Of(NOBODY_CATCH_SACK, H7)!;
    expect(p.escapes[0]).toMatchObject({ outcome: "CAUGHT_SACKED", catcher: undefined, contestBand: undefined, labelRuleSack: false });
  });

  it("the label rule's sack: a live catcher ARRIVED with no contest, under the caught escape as contact only", () => {
    expect(s6Of(LABEL_RULE_SACK)!.escapes[0]).toMatchObject({ outcome: "CAUGHT_SACKED", catcher: "de1", labelRuleSack: true });
    expect(s6Of(LABEL_RULE_SACK, H7)!.escapes[0]).toMatchObject({ outcome: "CAUGHT_SACKED", catcher: "de1", labelRuleSack: false });
  });

  it("a contained roll keeps its direction on the HOLD and spends the escape under HOLD", () => {
    const p = s6Of(CONTAINED_THEN_SPENT_HOLD)!;
    expect(p.escapes[0]).toMatchObject({ outcome: "CONTAINED", eventOutcome: "CONTAINED", spends: true });
    expect(p.directions).toEqual([{ tick: 1.5, choice: "HOLD", direction: "LEFT" }]);
  });

  it("the band table is the arm's; every band spends but CONTAINED under CONTAINED_DOES_NOT_SPEND; none spends with no cap", () => {
    expect(escapeBandOutcomeOf(H0, "CLEAN_ESCAPE")).toBe("ESCAPED");
    expect(escapeBandOutcomeOf(H0, "CONTAINED")).toBe("CONTAINED");
    expect(escapeBandOutcomeOf(H0, "CAUGHT_FROM_BEHIND")).toBe("CAUGHT");
    expect(() => escapeBandOutcomeOf(H0, "NOT_A_BAND")).toThrow("NOT_A_BAND");
    const outs = H0.pocket.outs!;
    expect(escapeRollSpendsS6(outs, "CONTAINED")).toBe(true);
    expect(escapeRollSpendsS6({ ...outs, escapeCap: { maxPerPlay: 1, whenSpent: "CONTAINED_DOES_NOT_SPEND" } }, "CONTAINED")).toBe(false);
    expect(escapeRollSpendsS6({ ...outs, escapeCap: { maxPerPlay: 1, whenSpent: "CONTAINED_DOES_NOT_SPEND" } }, "CAUGHT_FROM_BEHIND")).toBe(true);
    expect(escapeRollSpendsS6(H1.pocket.outs, "ESCAPED")).toBe(false);
    expect(escapeRollSpendsS6(undefined, "ESCAPED")).toBe(false);
  });

  it("the spent case's count: rolls on earlier ticks that spent the escape", () => {
    const d = dropbackOf(CONTAINED_THEN_SPENT_HOLD);
    expect(spentRollsBefore(d.checks, 1.5, H0.pocket.outs)).toBe(0);
    expect(spentRollsBefore(d.checks, 3, H0.pocket.outs)).toBe(1);
    expect(spentRollsBefore(d.checks, 3, { ...H0.pocket.outs!, escapeCap: { maxPerPlay: 1, whenSpent: "CONTAINED_DOES_NOT_SPEND" } })).toBe(0);
    expect(spentRollsBefore(d.checks, 3, H1.pocket.outs)).toBe(0);
  });
});

describe("s6Stream: the real throwaway rule's restatement (2.1), held where the 2.0 s gate was restated", () => {
  const facts = {
    routes: [
      { tick: 0.5, receiver: "wr1", phase: "DEVELOPING" },
      { tick: 1.5, receiver: "wr1", phase: "OPEN" },
      { tick: 2.5, receiver: "wr1", phase: "DECAYING" },
    ],
    checks: [{ tick: 2, checkKind: "arrival_contest" }],
  };
  it("needs a route at its break, the floor, and no arrival contest on the tick", () => {
    expect(throwawayLegalAt(facts, 1, 0)).toBe(false);
    expect(throwawayLegalAt(facts, 1.5, 0)).toBe(true);
    expect(throwawayLegalAt(facts, 1.5, 1.8)).toBe(false);
    expect(throwawayLegalAt(facts, 2, 0)).toBe(false);
    expect(throwawayLegalAt(facts, 3, 0)).toBe(true);
    expect(throwawayLegalAt({ routes: [], checks: [] }, 5, 0)).toBe(false);
  });
  it("reads the rule under throwawayRule and the 2.0 s gate on every other tree", () => {
    expect(throwawayAvailableAt(H0, facts, 1.5, 0)).toBe(true);
    expect(throwawayAvailableAt(H7, facts, 1.5, 0)).toBe(false);
    expect(throwawayAvailableAt(DEFAULT_TUNABLES, facts, 2, 0)).toBe(DEFAULT_TUNABLES.qb.throwawayEarliestSeconds <= 2);
    expect(throwawayAvailableAt(DEFAULT_TUNABLES, { routes: [], checks: [] }, 2.5, 0)).toBe(true);
  });
});

describe("s2Stream: the :deadline pick and the OUT_OF_POCKET throwaway", () => {
  it("the deadline pick is flagged and left out of the forced acts; the throwaway after pursuit is left out by name", () => {
    const events = constructedGame("g", [DEADLINE_THROWAWAY]);
    const play = s2PlaysOf(events)[0]!;
    expect(play.movements.map((m) => ({ tick: m.tick, clean: m.clean, deadline: m.deadline === true, afterPursuit: m.afterPursuit }))).toEqual([
      { tick: 1.5, clean: false, deadline: false, afterPursuit: false },
      { tick: 6, clean: false, deadline: true, afterPursuit: true },
    ]);
    const acts = forcedActsOf(play, H0);
    expect(acts.map((a) => [a.kind, a.tick])).toEqual([["MOVEMENT", 1.5]]);
  });
  it("names today's two causes as acts; any other cause is no act, as before step 6 (step 2's fixtures carry one)", () => {
    const duress: PlaySpec = { body: [tick(2.5), check("pocket_movement", "g:play:1/movement/t2.5", { band: "SOUND" }), throwaway("POCKET_DURESS")] };
    expect(forcedActsOf(s2PlaysOf(constructedGame("g", [duress]))[0]!, H0).map((a) => a.kind)).toEqual(["MOVEMENT", "POCKET_DURESS"]);
    const clock: PlaySpec = { body: [tick(2.5), throwaway("CLOCK_EXPIRED")] };
    expect(forcedActsOf(s2PlaysOf(constructedGame("g", [clock]))[0]!, H0).map((a) => a.kind)).toEqual(["CLOCK_EXPIRED"]);
    const odd: PlaySpec = { body: [tick(2.5), throwaway("SOMETHING_ELSE")] };
    expect(forcedActsOf(s2PlaysOf(constructedGame("g", [odd]))[0]!, H0)).toEqual([]);
  });
  it("on a play without the deadline label nothing is flagged (the key stays off every earlier stream)", () => {
    const play = readS2Play("g:play:1", onePlay(SHED_THEN_SACK));
    expect(play?.movements.every((m) => m.deadline === undefined)).toBe(true);
  });
});

describe("s1Stream: CLIMB_FRONT reads the movement gate's picks only (the :deadline label taught where :clean was)", () => {
  it("under the outs block the deadline pick is not the gate's; on a tree without the block the same CHECK reads as before", () => {
    // An INTERIOR threat live at the deadline pick closes the climb lane under one rule and not the
    // other, so the CHECK is a CLIMB_FRONT hit wherever it is read as a movement-gate pick.
    const isDeadline = (b: (typeof DEADLINE_THROWAWAY.body)[number]): boolean => b.type === "CHECK" && isDeadlinePickLabel((b.payload as { readonly roll: { readonly rngLabel: string } }).roll.rngLabel);
    const spec: PlaySpec = { ...DEADLINE_THROWAWAY, body: DEADLINE_THROWAWAY.body.flatMap((b) => (isDeadline(b) ? [threat("dt1", "TRAVELLING", { alignment: "INTERIOR" }), b] : [b])) };
    expect(spec.body.length).toBe(DEADLINE_THROWAWAY.body.length + 1);
    const events = constructedGame("g", [spec]);
    const s6 = emptyAffectedFold(["CLIMB_FRONT"]);
    foldAffectedGame(s6, events, H0, ["CLIMB_FRONT"]);
    expect(s6.byMechanism.CLIMB_FRONT).toBe(0);
    const noOuts = { ...H0, pocket: { ...H0.pocket, outs: undefined } } as unknown as Tunables;
    const old = emptyAffectedFold(["CLIMB_FRONT"]);
    foldAffectedGame(old, events, noOuts, ["CLIMB_FRONT"]);
    expect(old.byMechanism.CLIMB_FRONT).toBe(1);
    // Without the late INTERIOR threat neither tree has a hit: the escape cleared the live set.
    const plain = emptyAffectedFold(["CLIMB_FRONT"]);
    foldAffectedGame(plain, constructedGame("g", [DEADLINE_THROWAWAY]), noOuts, ["CLIMB_FRONT"]);
    expect(plain.byMechanism.CLIMB_FRONT).toBe(0);
  });
});

describe("the dropback reader: the marker, both scramble counters, P10's flag and the direction", () => {
  it("a failed scramble with the marker is a sack and keeps the registered scramble; the box-score count leaves it out", () => {
    const d = dropbackOf(FAILED_SCRAMBLE);
    expect(d.start.scoring).toEqual({ failedScramble: "SACK" });
    expect(d.scramble).toBe(true);
    expect(d.scrambleYards).toBe(-2);
    expect(d.failedScrambleSack).toBe(true);
    expect(d.sacked).toBe(true);
    expect(boxScoreScrambleOf(d)).toBe(false);
    expect(d.decisions.find((x) => x.choice === "SCRAMBLE")?.direction).toBe("LEFT");
  });
  it("without the marker the dropback is a scramble in both counts, and no new key is written", () => {
    const d = dropbackOf({ ...FAILED_SCRAMBLE, marker: false });
    expect(d.sacked).toBe(false);
    expect(boxScoreScrambleOf(d)).toBe(true);
    expect("failedScrambleSack" in d).toBe(false);
    expect("scoring" in d.start).toBe(false);
    expect("throwawayOutsideTackleBox" in d).toBe(false);
  });
  it("a gain with the marker is a scramble", () => {
    const spec: PlaySpec = { ...FAILED_SCRAMBLE, yards: 4, body: FAILED_SCRAMBLE.body.map((b) => (b.type === "RUN_RESOLUTION" ? { ...b, payload: { ...(b.payload as object), yards: 4 } } : b)) };
    const d = dropbackOf(spec);
    expect(d.sacked).toBe(false);
    expect(boxScoreScrambleOf(d)).toBe(true);
  });
  it("P10's flag is read where the stream carries it; OUT_OF_POCKET is out of the pocket by its cause", () => {
    const d = dropbackOf(DEADLINE_THROWAWAY);
    expect(d.throwawayOutsideTackleBox).toBe(true);
    expect(d.throwawayCause).toBe(OUT_OF_POCKET);
    expect(isThrowawayInPocket(d)).toBe(false);
    // The flag decides where the stream carries it, the escape's tick otherwise.
    expect(isThrowawayInPocket({ ...d, throwawayCause: "CLOCK_EXPIRED", throwawayOutsideTackleBox: false })).toBe(true);
    const { throwawayOutsideTackleBox: _f, ...noFlag } = d;
    expect(isThrowawayInPocket({ ...noFlag, throwawayCause: "CLOCK_EXPIRED" })).toBe(false);
  });
});

describe("collect.ts: the failed-scramble sack, both counters, and the catch counted once", () => {
  const observe = (id: string, plays: readonly PlaySpec[]): SimGameObservation => ({ seed: id, summary: { gameId: id, home: "H", away: "A", score: { home: 0, away: 0 } } as never, events: constructedGame(id, plays), statlines: [] });

  it("a failed scramble with the marker: a sack (pressured), a registered scramble, no box-score scramble, a contact out", () => {
    const acc = foldGame(emptyAccumulator(), observe("g", [FAILED_SCRAMBLE]), H0);
    expect(acc.play.sacks).toBe(1);
    expect(acc.play.pressuredSacks).toBe(1);
    expect(acc.play.scrambles).toBe(1);
    expect(acc.play.failedScrambleSacks).toBe(1);
    expect(acc.play.boxScoreScrambles).toBe(0);
    expect(acc.play.passAttempts).toBe(0);
    expect(acc.play.pocket.contactsOut).toBe(1);
    expect(acc.play.pocket.sacksOut).toBe(1);
    expect(acc.play.pocket.sacksIn).toBe(0);
  });

  it("the same run without the marker: a scramble in both counts, no sack", () => {
    const acc = foldGame(emptyAccumulator(), observe("g", [{ ...FAILED_SCRAMBLE, marker: false }]), H0);
    expect(acc.play.sacks).toBe(0);
    expect(acc.play.scrambles).toBe(1);
    expect(acc.play.failedScrambleSacks).toBe(0);
    expect(acc.play.boxScoreScrambles).toBe(1);
  });

  it("a catch with its ARRIVED, contest and QB_HIT is one contact in, then the sack on the same side once", () => {
    const acc = foldGame(emptyAccumulator(), observe("g", [SHED_THEN_SACK, BLOCKED_CATCH_SACK, LABEL_RULE_SACK]), H0);
    expect(acc.play.sacks).toBe(3);
    expect(acc.play.pocket.contactsIn).toBe(3);
    expect(acc.play.pocket.sacksIn).toBe(3);
    expect(acc.play.pocket.contactsOut).toBe(0);
  });

  it("an OUT_OF_POCKET throwaway is keyed by its cause, and the step-6 keys stay off a fold of no s6 play", () => {
    const acc = foldGame(emptyAccumulator(), observe("g", [DEADLINE_THROWAWAY]), H0);
    expect(acc.play.throwawaysByCause).toEqual({ OUT_OF_POCKET: 1 });
    const old = foldGame(emptyAccumulator(), observe("o", [{ ...SHED_THEN_SACK, rules: "pocket-1.s5a" }]), DEFAULT_TUNABLES);
    expect("failedScrambleSacks" in old.play).toBe(false);
    expect("boxScoreScrambles" in old.play).toBe(false);
    const merged = mergeAccumulators(acc, old);
    expect(merged.play.failedScrambleSacks).toBe(0);
    expect(merged.play.boxScoreScrambles).toBe(0);
    expect("failedScrambleSacks" in mergeAccumulators(old, old).play).toBe(false);
  });
});

describe("the sacker mix: the run's tackler, the catcher, and nobody", () => {
  const credit = (spec: PlaySpec, tunables: Tunables = H0) => s6SackCreditOf(dropbackOf(spec), s6Of(spec, tunables)!);
  it("a failed scramble goes to the run's tackler", () => {
    expect(credit(FAILED_SCRAMBLE)).toMatchObject({ last: "lb1", split: [{ rusher: "lb1", share: 1 }], lastOrigin: SCRAMBLE_TACKLE_ORIGIN });
  });
  it("a catch at the roll goes to its catcher; a catch that names nobody as the statline credits it (the last man ARRIVED, else nobody)", () => {
    expect(credit(BLOCKED_CATCH_SACK)).toMatchObject({ last: "de1" });
    expect(credit(BLOCKED_CATCH_SACK)?.statlineFallback).toBeUndefined();
    expect(credit(LABEL_RULE_SACK)).toMatchObject({ last: "de1" });
    // de1 ARRIVED at 1.0 s and was put back: the statline's lastArrivedRusher, which the mix counts as it is.
    expect(credit(NOBODY_CATCH_SACK, H7)).toMatchObject({ last: "de1", split: [{ rusher: "de1", share: 1 }], statlineFallback: true });
    expect(credit(NOBODY_CATCH_SACK_UNARRIVED, H7)).toBeNull();
  });
  it("any other s6 sack reads step 4's rule: the shed catch's later contest", () => {
    expect(credit(SHED_THEN_SACK)).toBeUndefined();
    const fold = emptyM3Fold();
    const positions = new Map([["dt1", "DT"], ["de1", "DE"], ["lb1", "MLB"]]);
    for (const spec of [SHED_THEN_SACK, FAILED_SCRAMBLE, NOBODY_CATCH_SACK, NOBODY_CATCH_SACK_UNARRIVED]) foldM3Dropback(fold, dropbackOf(spec), (id) => positions.get(id), true, s6Of(spec, H7));
    expect(fold.sacks).toBe(4);
    expect(fold.noSacker).toBe(1);
    expect(fold.statlineFallbacks).toBe(1);
    expect(fold.unsplit).toEqual({ interior: 1, offball: 1, edge: 1 });
    expect(fold.byPocket).toEqual({ in: { interior: 1, edge: 1 }, out: { offball: 1 } });
  });
  it("foldM3Game refuses an s6 play without the arm's tunables, and keeps the step-6 keys off every earlier play", () => {
    expect(() => foldM3Game(emptyM3Fold(), constructedGame("g", [FAILED_SCRAMBLE]), new Map())).toThrow("read with the arm's own tunables");
    const old = emptyM3Fold();
    foldM3Game(old, constructedGame("g", [{ ...SHED_THEN_SACK, rules: "pocket-1.s5a" }]), new Map());
    expect("noSacker" in old).toBe(false);
    expect("statlineFallbacks" in old).toBe(false);
    expect("byPocket" in old).toBe(false);
  });
});

describe("the step-4 contact fold, s4Stream and M2: the contact at the escape site, the BLOCKED approach, the shed", () => {
  it("a contest after the escape roll on its tick is counted at the escape site, on an s6 play only", () => {
    const fold = emptyM6Step4Fold();
    foldM6Step4Dropback(fold, dropbackOf(SHED_THEN_SACK), true, true);
    expect(fold.contacts).toBe(2);
    expect(fold.atEscape).toBe(1);
    const old = emptyM6Step4Fold();
    foldM6Step4Dropback(old, dropbackOf(SHED_THEN_SACK), true);
    expect("atEscape" in old).toBe(false);
  });
  it("s4Stream: a shed catch is no escape sack; a BLOCKED catcher's from comes from his card; the catches and the label rule apart", () => {
    const events = constructedGame("g", [SHED_THEN_SACK, BLOCKED_CATCH_SACK, LABEL_RULE_SACK, FAILED_SCRAMBLE]);
    const plays = s4PlaysOf(events, H0);
    const blocked = plays[1]!.contests[0]!;
    expect(blocked.hit?.approach).toBe("BLOCKED");
    expect(blocked.derivedFrom).toBe("SIDE");
    const fold = emptyS4Fold();
    foldS4Game(fold, events, H0);
    expect(fold.s6).toEqual({ catchesSacked: 2, catchesShed: 1, labelRuleSacks: 1, atEscape: 2, failedScrambleSacks: 1, standInByCatch: 0 });
    const old = emptyS4Fold();
    foldS4Game(old, constructedGame("o", [{ ...SHED_THEN_SACK, rules: "pocket-1.s5a" }]), DEFAULT_TUNABLES);
    expect("s6" in old).toBe(false);
  });
  it("s4Stream C-1: a catch he sheds from a man in his block (no ARRIVED) is the stand-in's too, counted apart; no problem", () => {
    const fold = emptyS4Fold();
    foldS4Game(fold, constructedGame("g", [BLOCKED_SHED_THEN_THROW]), H0);
    expect(s4Problems(fold)).toEqual([]);
    expect([fold.standIn, fold.arrivalShedOrSack, fold.c1Mismatch]).toEqual([1, 1, 0]);
    expect(fold.s6?.standInByCatch).toBe(1);
    expect(fold.s6?.catchesShed).toBe(1);
    // Read as before step 6 (no step-6 facts), the same play is C-1's mismatch: the reason for the reading.
    const old = emptyS4Fold();
    foldS4Game(old, constructedGame("o", [{ ...BLOCKED_SHED_THEN_THROW, rules: "pocket-1.s5a" }]), DEFAULT_TUNABLES);
    expect(old.c1Mismatch).toBe(1);
    expect("s6" in old).toBe(false);
  });
  it("M2: the replay goes on past a shed roll only", () => {
    expect([...shedEscapeRollsOf(onePlay(SHED_THEN_SACK), H0)]).toEqual(["g:play:1/scramble/t1.5"]);
    expect(shedEscapeRollsOf(onePlay(BLOCKED_CATCH_SACK), H0).size).toBe(0);
    expect(shedEscapeRollsOf(onePlay({ ...SHED_THEN_SACK, rules: "pocket-1.s5a" }), DEFAULT_TUNABLES).size).toBe(0);
  });
});

describe("M5: the catches by band and the direction, on an s6 game only", () => {
  it("an s6 game carries its catches and directions; an earlier game carries no s6 key", () => {
    const g = m5GameOf(constructedGame("g", [FAILED_SCRAMBLE, DEADLINE_THROWAWAY, SHED_THEN_SACK, BLOCKED_CATCH_SACK, CONTAINED_THEN_SPENT_HOLD]), H0);
    expect(g.s6).toEqual({ catchesSacked: 1, catchesShed: 1, directions: { LEFT: 2, RIGHT: 1 } });
    expect(g.escapes).toBe(5);
    expect("s6" in m5GameOf(constructedGame("o", [{ ...SHED_THEN_SACK, rules: "pocket-1.s5a" }]), DEFAULT_TUNABLES)).toBe(false);
  });
  it("m5Compare adds the step-6 rows only with an s6 game, the direction read LEFT unmirrored and RIGHT mirrored", () => {
    const game = (left: number, right: number): M5Game => ({ ...emptyM5Game(), dropbacks: 10, escapes: left + right, s6: { catchesSacked: 1, catchesShed: 0, directions: { LEFT: left, RIGHT: right } } });
    const runs = [
      { league: "flat", set: 1, mirrored: false, games: [game(3, 1), game(2, 2)] },
      { league: "flat", set: 1, mirrored: true, games: [game(1, 3), game(2, 2)] },
    ];
    const t = m5Compare("flat", runs) as { readonly rows: Readonly<Record<string, { readonly sets: readonly { readonly unmirrored: number; readonly mirrored: number }[] }>>; readonly escapeDirection: string };
    expect(Object.keys(t.rows)).toContain("escape_direction_share");
    expect(t.rows["escape_direction_share"]!.sets[0]!.unmirrored).toBeCloseTo(5 / 8);
    expect(t.rows["escape_direction_share"]!.sets[0]!.mirrored).toBeCloseTo(5 / 8);
    expect(t.escapeDirection).toContain("QB_DECISION.direction");
    const plain = m5Compare("flat", runs.map((r) => ({ ...r, games: r.games.map(({ s6: _s, ...rest }) => rest) }))) as { readonly rows: Readonly<Record<string, unknown>>; readonly escapeDirection: string };
    expect(Object.keys(plain.rows)).not.toContain("escape_direction_share");
    expect(plain.escapeDirection).toBe("not on today's stream (QB_DECISION.direction is P11, step 7)");
  });
});

describe("step 6's rows", () => {
  const positions = new Map([["dt1", "DT"], ["de1", "DE"], ["lb1", "MLB"]]) as never;
  it("are FUTURE_ROWS' step-6 ids, with the box-score count, the variants and the real figures beside", () => {
    const fold = emptyS6RowsFold();
    foldS6RowsGame(fold, constructedGame("g", [FAILED_SCRAMBLE, DEADLINE_THROWAWAY, SHED_THEN_SACK, BLOCKED_CATCH_SACK, CONTAINED_THEN_SPENT_HOLD]), H0, positions);
    const rows = s6Rows(fold);
    for (const [id, r] of Object.entries(FUTURE_ROWS)) if (r.mustExistBy === "6") expect(Object.keys(rows), id).toContain(id);
    expect(rows["row:failed_scramble_share_of_sacks"]).toMatchObject({ n: 1, sacks: 3 });
    expect(rows["row:failed_escape_rate"]).toMatchObject({ failed: 3, rolls: 5, byOutcome: { ESCAPED: 2, CONTAINED: 1, CAUGHT_SACKED: 1, CAUGHT_SHED: 1 } });
    expect((rows["row:failed_escape_rate"] as { byOfferBand: unknown }).byOfferBand).toEqual({ SOUND: { pct: 60, failed: 3, rolls: 5 } });
    expect(rows["boxScoreScrambles"]).toMatchObject({ boxScore: { n: 0 }, registered: { n: 1 } });
    const v = rows["pressureVariants"] as { readonly wholePlayPocketDisagreements: number; readonly cleanSacks: { readonly real: { readonly per100: number } } };
    expect(v.wholePlayPocketDisagreements).toBe(0);
    expect(v.cleanSacks.real.per100).toBe(0.007);
    expect(fold.drill).toEqual({ escapesWon: 2, escapesWithDrill: 1, dice: 1, cleanBreakoutAimed: 0, cleanBreakoutAimedWithDrill: 0 });
    expect(fold.thirds["ALL"]).toMatchObject({ dropbacks: 5, deadlineThrowaways: 1 });
  });
  it("on a play before step 6 a catch is the sack at the roll", () => {
    const fold = emptyS6RowsFold();
    foldS6RowsGame(fold, constructedGame("o", [{ ...BLOCKED_CATCH_SACK, rules: "pocket-1.s5a" }]), DEFAULT_TUNABLES, positions);
    expect(fold.rollsByOutcome).toEqual({ ESCAPED: 0, CONTAINED: 0, CAUGHT_SACKED: 1, CAUGHT_SHED: 0 });
    expect(fold.s6Dropbacks).toBe(0);
  });
  it("the whole-play pocket and the rows' pocket agree when he stays in the pocket after a roll", () => {
    for (const spec of [SHED_THEN_SACK, CONTAINED_THEN_SPENT_HOLD, FAILED_SCRAMBLE]) {
      const d = dropbackOf(spec);
      expect(wholePlayPocketOf(d), d.playId).toBe(rowPocketOf(d));
    }
  });
});

// --- readers that need the game's players (a golden snapshot; the plays are still constructed) -------

describe("readers with a snapshot: the cross-check, the must-act witness and the step-5a escapes", () => {
  let snapshot: GameSnapshot;
  let qb = "";
  beforeAll(() => {
    goldenGames(
      "flat",
      (o, snap) => {
        snapshot = snap;
        const start = (o.events as readonly MatchEventEnvelope[]).find((e) => e.event.type === "PLAY_START" && (e.event.payload as { kind?: string }).kind === "PASS_PLAY_V1");
        qb = String((start?.event.payload as { offense: { quarterback: string } }).offense.quarterback);
      },
      { callerVersion: STEP1_CALLER, first: 1 },
    );
  }, 120_000);
  const withQb = (spec: PlaySpec): PlaySpec => ({ ...spec, quarterback: qb });

  it("crossCheckMovement skips the deadline pick and counts it apart, under the outs block only", () => {
    const d = dropbacksOf(constructedGame("g", [withQb(DEADLINE_THROWAWAY)]))[0]!;
    const fold = { ...emptyM6Fold(), deadlinePicks: 0 };
    crossCheckMovement(fold, d, [], playersOfSnapshot(snapshot), H0);
    expect(fold.deadlinePicks).toBe(1);
    expect(fold.movementChecks).toBe(1);
    const old = emptyM6Fold();
    crossCheckMovement(old, d, [], playersOfSnapshot(snapshot), DEFAULT_TUNABLES);
    expect(old.movementChecks).toBe(2);
    expect("deadlinePicks" in old).toBe(false);
  });

  it("the pick's pool leaves ESCAPE out once the cap is spent", () => {
    const facts = { ratingOf: () => 60, minTta: 0.5, threatAlignments: ["EDGE"], stepUpsUsed: 0, throwawayAvailable: true } as const;
    const open = rankedResponsesOf(H0, facts).ranked.map((r) => r.response);
    const spent = rankedResponsesOf(H0, { ...facts, escapeAvailable: false }).ranked.map((r) => r.response);
    expect(open).toContain("ESCAPE");
    expect(spent).not.toContain("ESCAPE");
    expect(spent.length).toBe(open.length - 1);
  });

  it("step 5a's escapes: offered under the cap only while unspent, the outcome by the band with the catch split", () => {
    const ctx = s2ContextOf(H0, snapshot);
    const events = constructedGame("g", [withQb(SHED_THEN_SACK), withQb(CONTAINED_THEN_SPENT_HOLD), withQb(BLOCKED_CATCH_SACK)]);
    const xs = s5DropbacksOf(events, ctx);
    expect(xs.map((x) => x.escapes.map((e) => e.s6?.outcome))).toEqual([["CAUGHT_SHED"], ["CONTAINED"], ["CAUGHT_SACKED"]]);
    expect(xs[0]!.escapes[0]!.s6).toMatchObject({ eventOutcome: "CONTAINED", catcher: "de1" });
    const fold = emptyS5Fold();
    for (const x of xs) foldS5Dropback(fold, x);
    expect(fold.s6Escapes?.forced).toMatchObject({ CAUGHT_SHED: 1, CONTAINED: 1, CAUGHT_SACKED: 1 });
    const play = readS6Play(onePlay(CONTAINED_THEN_SPENT_HOLD), H0)!;
    const after = play.escapes[0]!.index + 1;
    expect(escapeOfferedAt(H0, play, after, false)).toBe(false);
    expect(escapeOfferedAt(H0, play, 0, false)).toBe(true);
    expect(escapeOfferedAt(DEFAULT_TUNABLES, undefined, after, false)).toBe(true);
  });

  it("the must-act witness counts the spent case's HOLD apart, and its step-6 keys only under the outs block", async () => {
    const { emptyMustActFold, mustActCheck } = await import("../src/pocket/s2Stream.js");
    const ctx = s2ContextOf(H0, snapshot);
    const fold = emptyMustActFold();
    for (const play of s2PlaysOf(constructedGame("g", [withQb(CONTAINED_THEN_SPENT_HOLD), withQb(DEADLINE_THROWAWAY)]))) mustActCheck(fold, play, ctx);
    // The contained roll at 1.5 s spent his escape (HOLD); the clean expiry at 3.0 s is the spent case's
    // HOLD, counted apart, and the witness finds nothing.
    expect(fold.witness).toMatchObject({ spentHolds: 1, ruleThrowaways: 0, holds: 1, countHolds: 0, problemCount: 0 });
    // Under TODAYS_PATH the spent case takes today's path, so the same HOLD is a closing HOLD on a tick
    // the real rule allows (wr1 OPEN since 1.0 s), with the count part holding: the witness flags it.
    const todays = { ...H0, pocket: { ...H0.pocket, outs: { ...H0.pocket.outs!, escapeCap: { maxPerPlay: 1, whenSpent: "TODAYS_PATH" } } } } as Tunables;
    const t = emptyMustActFold();
    for (const play of s2PlaysOf(constructedGame("g", [withQb(CONTAINED_THEN_SPENT_HOLD)]))) mustActCheck(t, play, s2ContextOf(todays, snapshot));
    expect(t.witness).toMatchObject({ spentHolds: 0, countHolds: 1, problemCount: 1 });
    expect(t.witness.problems[0]).toContain("the real throwaway rule's restatement allows");
    const old = emptyMustActFold();
    for (const play of s2PlaysOf(constructedGame("o", [withQb({ ...CONTAINED_THEN_SPENT_HOLD, rules: "pocket-1.s5a" })]))) mustActCheck(old, play, s2ContextOf(DEFAULT_TUNABLES, snapshot));
    expect("spentHolds" in old.witness).toBe(false);
    expect("ruleThrowaways" in old.witness).toBe(false);
  });

  it("every fold, row and time reader takes a TICK past clock.maxTick on a live scramble (engine-1's item 8)", () => {
    // An escape at 6.0 s, the clock's last tick, plays on to a TICK at 6.5 s (2.5), where the deadline
    // pick throws it away out of the pocket, or runs and is tackled for a loss (a sack under the marker).
    expect(H0.clock.maxTick).toBe(6);
    const events = constructedGame("g", [withQb(LATE_DEADLINE_THROWAWAY), withQb(LATE_FAILED_SCRAMBLE)]);
    const positions = positionsFromSnapshot(snapshot);
    // The step-6 reading and the dropback reader, with the throw classes and the release.
    const s6 = playsOf(events).map((p) => readS6Play(p.events, H0)!);
    expect(s6.map((p) => p.endTick)).toEqual([6.5, 6.5]);
    expect(s6.map((p) => p.deadlinePicks.map((x) => [x.tick, x.choice]))).toEqual([[[6.5, "THROWAWAY"]], [[6.5, "RUN"]]]);
    expect(s6.map((p) => [p.throwaway?.cause, p.failedScrambleSack])).toEqual([[OUT_OF_POCKET, false], [undefined, true]]);
    const ds = dropbacksOf(events);
    expect(ds.map((d) => [d.endTick, d.throwawayTick, d.sacked])).toEqual([[6.5, 6.5, false], [6.5, undefined, true]]);
    expect(releaseTickOf(ds[0]!)).toBe(6.5);
    for (const d of ds) {
      throwClassOf(d, H0);
      throwClassOfS5(d, H0);
      if (releaseTickOf(d) !== undefined) desperationPocketOf(d);
    }
    // The metrics fold and its pocket tables: the sack at 6.5 s, the throwaway by its cause.
    const acc = foldGame(emptyAccumulator(), { seed: "g", summary: { gameId: "g", home: "H", away: "A", score: { home: 0, away: 0 } } as never, events, statlines: [] }, H0);
    expect([acc.play.sacks, acc.play.failedScrambleSacks, acc.play.throwawaysByCause]).toEqual([1, 1, { OUT_OF_POCKET: 1 }]);
    expect(acc.play.pocket.sackSeconds).toEqual([6.5]);
    pocketTables(acc.play.pocket);
    // Every stream fold Q-2g runs, the cross-check and the step-6 rows.
    const ctx = s2ContextOf(H0, snapshot);
    const s2 = emptyS2Folds();
    for (const play of s2PlaysOf(events)) {
      s2Checks.liveSet(s2.liveSet, play, ctx);
      s2Checks.mustAct(s2.mustAct, play, ctx);
      s2Checks.arrival(s2.arrival, play, ctx);
      s2Checks.warning(s2.warning, play, ctx);
      s2Checks.share(s2.share, play, ctx);
      s2Checks.desperation(s2.desperation, play, ctx);
      s2Checks.checkdown(s2.checkdown, play, ctx);
    }
    s2Checks.guardGame(s2.guardGames, events, ctx);
    expect(s2Problems(s2)).toEqual([]);
    const s4 = emptyS4Fold();
    foldS4Game(s4, events, H0);
    expect(s4Problems(s4)).toEqual([]);
    expect(s4.s6?.failedScrambleSacks).toBe(1);
    const s5 = emptyS5Fold();
    foldS5Game(s5, events, H0, snapshot);
    expect(s5.escapes.attempts).toBe(2);
    foldS1Game(emptyS1Folds(), events, H0);
    foldS3Game(emptyS3Folds(), events, H0);
    foldStep5Game(emptyStep5LeagueFolds(), events, H0, snapshot, throwClassOfS5);
    foldAffectedGame(emptyAffectedFold(MECHANISMS), events, H0, MECHANISMS);
    const m3 = emptyM3Fold();
    foldM3Game(m3, events, positions, H0);
    expect(m3.sacks).toBe(1);
    foldRowsGame(emptyRowsFold(), events, H0, positions);
    foldCleanPocketRowsGame(emptyCleanPocketRowsFold(), events, H0);
    expect(m5GameOf(events, H0).s6?.directions).toEqual({ LEFT: 1, RIGHT: 1 });
    foldM6Step4Game(emptyM6Step4Fold(), events);
    const m6 = { ...emptyM6Fold(), deadlinePicks: 0 };
    for (const d of ds) crossCheckMovement(m6, d, [], playersOfSnapshot(snapshot), H0);
    expect(m6.deadlinePicks).toBe(2);
    const rows = emptyS6RowsFold();
    foldS6RowsGame(rows, events, H0, positions);
    expect(s6Rows(rows)["row:failed_scramble_share_of_sacks"]).toMatchObject({ n: 1, sacks: 1 });
    expect(rows.byPocket.PRESSURED.outOfPocketThrowaways).toBe(1);
    expect(rows.wholePlayPocketDisagreements).toBe(0);
  });
});

describe("the rows on the dropback list (no play left out)", () => {
  it("readDropback and playsOf give the same plays the step-6 reading reads", () => {
    const events = constructedGame("g", [FAILED_SCRAMBLE, DEADLINE_THROWAWAY]);
    const ids = playsOf(events).map((p) => readDropback(p)?.playId);
    expect(ids).toEqual(["g:play:1", "g:play:2"]);
    expect(playsOf(events).map((p) => readS6Play(p.events, H0)?.rules)).toEqual(["pocket-1.s6", "pocket-1.s6"]);
  });
});
