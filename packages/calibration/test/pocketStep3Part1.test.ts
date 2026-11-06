/**
 * ADR-089 STEP 3 — PART 1, THE TOUCHED MEN'S CHECK, THE MONOTONE CHECK AND THE MIRROR (plan §2.8;
 * AM-2's `part1`, `monotone` and `references`; `part1.ts`).
 *
 * Constructed: the published runner's conversion (`freeRunInputOf`), its mirror, the creeper's
 * movement, AM-2's held references, the looper's partner (earned, and carried by a passed-off
 * twist: the hand-off fix), and whole plays folded through `foldPart1Events`: a man on the clock
 * at his published time passes and a tenth off fails; the DELAYED wait (a linebacker, never a down
 * lineman); the card's drop; a creeper, and any other movement refused; an unplaced man; a play
 * with no picture; a looper across his penetrator and a carried record across the man it came
 * from; reading B leaving a touched man at today's time and reading C timing him with his band's
 * delay; an arm that holds inputs; an arm with no free-run block.
 *
 * In the suite: the first 2 golden games of each league under every playable step-3 arm (all
 * sixteen, C14 since P17, E4b), part 1, the touched check, the off-clock check and the mirror with no
 * failure, and the monotone clauses with none on C1 and C2; the NEGATIVE CONTROL, C1 with
 * `getOffSeconds` 0.36, fails part 1 on the same games and nothing else; and real streams with one
 * fact changed (a spot, an entry, the picture, a touched man's time, an off-clock man's time)
 * failing. Under `FF_POCKET_ON=1`: 50 golden games a league. The counts go to stdout.
 */
import { setAttr, type MatchEventEnvelope, type PlayerState, type Position, type RushAlignment } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type GameSnapshot, type Tunables } from "@ff/engine";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FILED_PATH } from "../src/pocket/bands.js";
import { filedDigest, loadFiled, STEP0_FILED_DIGEST } from "../src/pocket/filed.js";
import { armById, armRefusal, AM2_REFERENCES, STEP3_ARM_IDS, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { dropOfCall, freeRunTime, registryAttr, roundEta, type RunnerRatings } from "../src/pocket/freeRun.js";
import { legacyFreeRunSeconds } from "../src/pocket/legacyFreeRun.js";
import {
  CREEPER_MOVING,
  emptyPart1Fold,
  filedM8Of,
  foldPart1Events,
  foldPart1Game,
  freeRunInputOf,
  heldGroupOf,
  heldRunnerOf,
  looperPartnerOf,
  mergePart1Folds,
  mirroredRunner,
  monotoneProblems,
  movingProblemOf,
  part1Problems,
  part1Summary,
  snapRowOf,
  waitsOnDelayed,
  type Part1Fold,
  type PublishedRunner,
  type RawStuntCheck,
} from "../src/pocket/part1.js";
import {
  POCKET_1_S2_DIGEST,
  POCKET_1_S2_FORCING,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_DIGEST,
  POCKET_1_S3_FREE_RUN,
  POCKET_1_S3_LATE_BLOCK,
  POCKET_1_S3_OVERLAY,
  POCKET_1_S3_RULES,
  withOverlay,
} from "../src/pocket/rules.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 2;

const C1 = armById("C1").tunables;
const S3_STAMP = { name: "pocket-1.s3", overlayDigest: POCKET_1_S3_DIGEST } as const;
const S2_STAMP = { name: "pocket-1.s2", overlayDigest: POCKET_1_S2_DIGEST } as const;

/** The negative control (plan §2.8): C1 with the engine's get-off at 0.36 s, built as the bundle is. */
const NEGATIVE_CONTROL = withOverlay(
  POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES),
  POCKET_1_S3_RULES,
  { ...POCKET_1_S3_OVERLAY, blitzPickup: { freeRun: { ...POCKET_1_S3_FREE_RUN, getOffSeconds: 0.36 }, lateBlock: POCKET_1_S3_LATE_BLOCK } },
  POCKET_1_S2_FORCING,
);

// --- the published runner -------------------------------------------------------------------------

const R = (speed: number, acceleration: number): RunnerRatings => ({ speed, acceleration });

describe("the published runner and M8's function on it (part1.ts)", () => {
  it("reads depth and width off his own entry, the drop, the bend, the DELAYED wait and a moving start", () => {
    const r: PublishedRunner = { spot: { x: -4.5, y: 1 }, ballX: 0.5, drop: 7, edge: true, ratings: R(80, 70), delayed: true };
    expect(freeRunInputOf(r)).toEqual({ spot: { depth: 1, width: 5 }, drop: 7, edge: true, ratings: R(80, 70), delayed: true, moving: false });
    const creeper: PublishedRunner = { ...r, spot: { x: 2, y: 3, moving: CREEPER_MOVING }, edge: false, delayed: false };
    expect(freeRunInputOf(creeper)).toMatchObject({ spot: { depth: 3, width: 1.5 }, moving: true });
  });

  it("a looper runs from his partner's spot, crossing |x_partner - x_own| + 0.5", () => {
    const r: PublishedRunner = { spot: { x: -4, y: 1 }, ballX: 0, drop: 5, edge: false, loopPartner: { x: -1, y: 1.5 }, ratings: R(60, 60), delayed: false };
    expect(freeRunInputOf(r)).toEqual({ spot: { depth: 1.5, width: 1 }, drop: 5, edge: false, loopCrossYards: 3.5, ratings: R(60, 60), delayed: false, moving: false });
  });

  it("the mirror turns every x round the ball, and M8's time is the same double", () => {
    const r: PublishedRunner = { spot: { x: -4, y: 1 }, ballX: 1.5, drop: 5, edge: false, loopPartner: { x: 2.5, y: 1 }, ratings: R(77, 64), delayed: false };
    const m = mirroredRunner(r);
    expect(m).toEqual({ ...r, spot: { x: 4, y: 1 }, ballX: -1.5, loopPartner: { x: -2.5, y: 1 } });
    expect(Object.is(freeRunTime(freeRunInputOf(m)).seconds, freeRunTime(freeRunInputOf(r)).seconds)).toBe(true);
  });

  it("only the filed creeper may move: straight at the line at 3 yd/s", () => {
    expect(CREEPER_MOVING).toEqual({ dx: 0, dy: -1, yardsPerSecond: 3 });
    expect(movingProblemOf(CREEPER_MOVING)).toBeUndefined();
    expect(movingProblemOf({ dx: 1, dy: -1, yardsPerSecond: 3 })).toContain("not straight at the line");
    expect(movingProblemOf({ dx: 0, dy: -1, yardsPerSecond: 4 })).toContain("not the filed creeper's 3");
  });

  it("the DELAYED wait is a linebacker's or a defensive back's, never a down lineman's; the held groups are AM-2's", () => {
    expect((["DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS"] as const).map(waitsOnDelayed)).toEqual([false, false, false, true, true, true, true, true, true]);
    expect((["DE", "MLB", "SS", "QB"] as const).map(heldGroupOf)).toEqual(["downLineman", "linebacker", "defensiveBack", undefined]);
  });

  it("the snap row is his group, depth, movement and wait", () => {
    expect(snapRowOf({ y: 1 }, "DE", false)).toBe("DL@1");
    expect(snapRowOf({ y: 4.5, moving: CREEPER_MOVING }, "MLB", true)).toBe("LB@4.5 moving DELAYED");
  });
});

describe("an arm that holds inputs times AM-2's references and nothing else (heldRunnerOf)", () => {
  const r: PublishedRunner = { spot: { x: -6, y: 4, moving: CREEPER_MOVING }, ballX: 1, drop: 7, edge: true, loopPartner: { x: -3, y: 1 }, ratings: R(88, 91), delayed: true };

  it("no hold is the runner itself", () => {
    expect(heldRunnerOf(r, undefined, "OLB")).toBe(r);
  });

  it("a held spot is his group's (depth, width) on his own side of the ball, set; a held looper crosses only the 0.5 yard", () => {
    const held = heldRunnerOf(r, { spot: AM2_REFERENCES.spot }, "OLB") as PublishedRunner;
    expect(held).toEqual({ ...r, spot: { x: 1 - 2.5, y: 2.5 }, loopPartner: { x: 1 - 2.5, y: 2.5 } });
    expect(freeRunInputOf(held).loopCrossYards).toBe(0.5);
    expect(freeRunInputOf(held).moving).toBe(false);
    const right = heldRunnerOf({ ...r, spot: { x: 9, y: 1 } }, { spot: AM2_REFERENCES.spot }, "CB") as PublishedRunner;
    expect(right.spot).toEqual({ x: 1 + 7, y: 5 });
    expect(heldRunnerOf(r, { spot: AM2_REFERENCES.spot }, "QB")).toContain("no reference for a QB");
  });

  it("held ratings are 50/50 and a held drop is 5.0, whatever the arm's hold block says", () => {
    expect(heldRunnerOf(r, { ratings: R(1, 1), drop: 9 }, "OLB")).toEqual({ ...r, ratings: R(50, 50), drop: 5 });
  });
});

describe("the looper's partner (the hand-off fix)", () => {
  const passesOff = (band: string | undefined): boolean => band === "PASSED_OFF" || band === "PASSED_OFF_CLEAN";
  const s = (label: string, penetrator: string, looper: string, band: string): RawStuntCheck => ({ label, penetrator, looper, band });

  it("the looper who earned the record loops across the twist's penetrator", () => {
    const record = s("st1", "dt", "de", "LOOPER_FREE");
    expect(looperPartnerOf("de", record, [record], passesOff)).toBe("dt");
  });

  it("a record a passed-off twist carried loops across the man it was carried from, as often as it is carried", () => {
    const record = s("st1", "dt1", "de1", "LOOPER_FREE");
    const once = [record, s("st2", "de1", "nt", "PASSED_OFF")];
    expect(looperPartnerOf("nt", record, once, passesOff)).toBe("de1");
    const twice = [...once, s("st3", "olb", "nt", "PASSED_OFF_CLEAN")];
    expect(looperPartnerOf("olb", record, twice, passesOff)).toBe("nt");
  });

  it("a twist that is not passed off, or one before the record, carries nothing; a trace that misses him is undefined", () => {
    const record = s("st2", "dt1", "de1", "LOOPER_FREE");
    const stunts = [s("st1", "de1", "nt", "PASSED_OFF"), record, s("st3", "de1", "nt", "LATE_EXCHANGE")];
    expect(looperPartnerOf("nt", record, stunts, passesOff)).toBeUndefined();
    expect(looperPartnerOf("nt", s("zz", "a", "b", "LOOPER_FREE"), stunts, passesOff)).toBeUndefined();
  });
});

// --- constructed plays ----------------------------------------------------------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
type Ev = Record<string, unknown>;
let seq = 0;

function env(playId: string, event: Ev, tick?: number): MatchEventEnvelope {
  seq += 1;
  return { seq, at: AT, event: { gameId: "g", playId, ...(tick === undefined ? {} : { tick }), ...event } as never };
}

interface Man {
  readonly id: string;
  readonly position: Position;
  readonly ratings: RunnerRatings;
  readonly alignment: RushAlignment;
  /** His entry in the picture; absent leaves him unplaced. */
  readonly spot?: { readonly x: number; readonly y: number; readonly moving?: { readonly dx: number; readonly dy: number; readonly yardsPerSecond: number } };
}

interface Threat {
  readonly rusher: string;
  readonly origin: "UNBLOCKED" | "PICKUP_LOST" | "STUNT_LOOPER";
  readonly rollRef?: string;
  readonly etaTick: number;
}

interface PlayOptions {
  readonly men: readonly Man[];
  readonly threats: readonly Threat[];
  readonly call?: string;
  readonly disguise?: string;
  readonly ballX?: number;
  readonly stunts?: readonly { readonly penetrator: string; readonly looper: string }[];
  /** CHECK payloads at the snap, in order. */
  readonly checks?: readonly Ev[];
  readonly rules?: { readonly name: string; readonly overlayDigest: string };
  /** No picture on PLAY_START. */
  readonly noSnap?: boolean;
}

function playerOf(m: Man): PlayerState {
  const values = setAttr(setAttr({}, registryAttr("speed"), m.ratings.speed), registryAttr("acceleration"), m.ratings.acceleration);
  return { bio: { id: m.id, position: m.position }, attributes: { kind: "true", values, traits: new Set<string>() } } as unknown as PlayerState;
}

const d100 = (rngLabel: string, modifiers: readonly Ev[] = []) => ({ die: "d100", raw: 50, modifiers, total: 50, rngLabel });

function pickup(label: string, back: string, rusher: string, band: string): Ev {
  return { type: "CHECK", payload: { checkKind: "blitz_pickup", actors: [back, rusher], roll: d100(label), tier: "FAILURE", margin: -5, testsAttrs: [], band } };
}

function stunt(label: string, penetrator: string, looper: string, band: string, exchange?: string): Ev {
  const mods = exchange === undefined ? [] : [{ source: "LG Awareness (exchange)", value: 1 }];
  return { type: "CHECK", payload: { checkKind: "stunt_communication", actors: [...(exchange === undefined ? [] : [exchange]), penetrator, looper], roll: d100(label, mods), tier: "FAILURE", margin: -30, testsAttrs: [], band } };
}

function play(o: PlayOptions): readonly MatchEventEnvelope[] {
  const playId = "g:p1";
  const ballX = o.ballX ?? 0;
  const start = env(playId, {
    type: "PLAY_START",
    payload: {
      kind: "PASS_PLAY_V1",
      offense: { team: "OFF", call: o.call ?? "Smash", readSystem: "HALF_FIELD", quarterback: "qb" },
      defense: {
        team: "DEF",
        rush: o.men.map((m) => ({ rusher: m.id, move: "SPEED", alignment: m.alignment })),
        stunts: (o.stunts ?? []).map((s) => ({ ...s, complexity: "TWIST" })),
        ...(o.disguise === undefined ? {} : { blitzDisguise: o.disguise }),
      },
      situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      rules: o.rules ?? S3_STAMP,
      ...(o.noSnap === true
        ? {}
        : {
            snap: {
              ballX,
              offense: [],
              defense: o.men.flatMap((m) => (m.spot === undefined ? [] : [{ player: m.id, x: m.spot.x, y: m.spot.y, stance: "DOWN", ...(m.spot.moving === undefined ? {} : { moving: m.spot.moving }) }])),
            },
          }),
    },
  });
  const events: MatchEventEnvelope[] = [start, ...(o.checks ?? []).map((c) => env(playId, c))];
  for (const t of o.threats) {
    const m = o.men.find((x) => x.id === t.rusher)!;
    events.push(env(playId, { type: "RUSH_THREAT", payload: { rusher: t.rusher, alignment: m.alignment, origin: t.origin, rollRef: t.rollRef ?? "", etaTick: t.etaTick, state: "TRAVELLING" } }));
  }
  events.push(env(playId, { type: "TICK", payload: { tick: 0.5 } }, 0.5));
  events.push(env(playId, { type: "PLAY_RESULT", payload: { yards: 0, turnover: false, clockRunoff: 6 } }));
  return events;
}

function folded(o: PlayOptions, tunables: Tunables = C1): Part1Fold {
  const fold = emptyPart1Fold();
  foldPart1Events(fold, play(o), { tunables, players: new Map(o.men.map((m) => [m.id, playerOf(m)])) });
  return fold;
}

/** M8's time for a man as the test states his inputs (the function, on the runner the test builds). */
const timeOf = (r: PublishedRunner) => freeRunTime(freeRunInputOf(r));

const DE: Man = { id: "de", position: "DE", ratings: R(81, 77), alignment: "EDGE", spot: { x: -4, y: 1 } };
const DT: Man = { id: "dt", position: "DT", ratings: R(62, 70), alignment: "INTERIOR", spot: { x: -1, y: 1 } };
const NT: Man = { id: "nt", position: "NT", ratings: R(55, 58), alignment: "INTERIOR", spot: { x: 0.5, y: 1 } };
const MLB: Man = { id: "mlb", position: "MLB", ratings: R(74, 80), alignment: "INTERIOR", spot: { x: 1.5, y: 4.5 } };
const runnerOf = (m: Man, over: Partial<PublishedRunner> = {}): PublishedRunner => ({
  spot: m.spot!,
  ballX: 0,
  drop: 5,
  edge: m.alignment === "EDGE",
  ratings: m.ratings,
  delayed: false,
  ...over,
});

describe("part 1 on constructed plays (foldPart1Events)", () => {
  it("a man nobody touched, on the clock at his published time, passes; a tenth off fails", () => {
    const eta = timeOf(runnerOf(DE)).eta;
    const ok = folded({ men: [DE], threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: eta }] });
    expect(ok.problems).toEqual([]);
    expect(ok).toMatchObject({ plays: 1, s3Plays: 1, pictures: 1, part1: { checked: 1, failed: 0 }, offClock: { checked: 0, failed: 0 }, mirror: { checked: 1, failed: 0 } });
    expect(ok.byOrigin).toEqual({ UNBLOCKED: { checked: 1, failed: 0 } });
    expect(ok.byRow).toEqual({ "DL@1": { checked: 1, failed: 0 } });
    expect(ok.monotone.men).toBe(1);
    expect(Object.keys(ok.table)).toEqual(["UNBLOCKED|DL@1|DE"]);
    const off = folded({ men: [DE], threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: roundEta(eta + 0.1) }] });
    expect(off.part1).toEqual({ checked: 1, failed: 1 });
    expect(off.problems[0]).toContain(`published ${String(roundEta(eta + 0.1))}, the free-run function gives ${String(eta)}`);
    expect(part1Problems(off)[0]).toContain("part 1: 1 failure");
    // The miss rule's timing trigger at step 3 (AM-2 timingAgainstAtStep3): only an earlier man counts.
    expect(ok.earlier).toBe(0);
    expect(off.earlier).toBe(0);
    const early = folded({ men: [DE], threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: roundEta(eta - 0.1) }] });
    expect(early.part1).toEqual({ checked: 1, failed: 1 });
    expect(early.earlier).toBe(1);
    expect(mergePart1Folds(early, early).earlier).toBe(2);
    expect(part1Summary(early)["earlier"]).toBe(1);
  });

  it("the DELAYED wait: a linebacker waits the filed half second, a down lineman does not", () => {
    const lb = timeOf(runnerOf(MLB, { delayed: true })).eta;
    const dt = timeOf(runnerOf(DT)).eta;
    const threats = (lbEta: number): Threat[] => [
      { rusher: "mlb", origin: "UNBLOCKED", etaTick: lbEta },
      { rusher: "dt", origin: "UNBLOCKED", etaTick: dt },
    ];
    const ok = folded({ men: [MLB, DT], disguise: "DELAYED", threats: threats(lb) });
    expect(ok.problems).toEqual([]);
    expect(Object.keys(ok.byRow).sort()).toEqual(["DL@1", "LB@4.5 DELAYED"]);
    const undelayed = folded({ men: [MLB, DT], disguise: "DELAYED", threats: threats(timeOf(runnerOf(MLB)).eta) });
    expect(undelayed.part1).toEqual({ checked: 2, failed: 1 });
  });

  it("the drop is the card's: a 7-yard call's time, not a 5-yard one", () => {
    expect(dropOfCall("Flood")).toBe(7);
    const seven = timeOf(runnerOf(DE, { drop: 7 })).eta;
    const five = timeOf(runnerOf(DE)).eta;
    expect(seven).toBeGreaterThan(five);
    expect(folded({ men: [DE], call: "Flood", threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: seven }] }).problems).toEqual([]);
    expect(folded({ men: [DE], call: "Flood", threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: five }] }).part1.failed).toBe(1);
  });

  it("the ball's place counts: width is measured from ballX, so the mirror holds off the middle too", () => {
    const eta = timeOf(runnerOf(DE, { ballX: 2 })).eta;
    expect(eta).not.toBe(timeOf(runnerOf(DE)).eta);
    const fold = folded({ men: [DE], ballX: 2, threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: eta }] });
    expect(fold.problems).toEqual([]);
    expect(fold.mirror).toEqual({ checked: 1, failed: 0 });
  });

  it("the creeper starts moving with no get-off; any other movement is a build fault", () => {
    const creeper: Man = { ...MLB, spot: { x: 1.5, y: 4.5, moving: CREEPER_MOVING } };
    const eta = timeOf(runnerOf(creeper)).eta;
    expect(eta).toBeLessThan(timeOf(runnerOf(MLB)).eta);
    const ok = folded({ men: [creeper], threats: [{ rusher: "mlb", origin: "UNBLOCKED", etaTick: eta }] });
    expect(ok.problems).toEqual([]);
    expect(Object.keys(ok.byRow)).toEqual(["LB@4.5 moving"]);
    const sideways: Man = { ...MLB, spot: { x: 1.5, y: 4.5, moving: { dx: 0, dy: -1, yardsPerSecond: 4 } } };
    const bad = folded({ men: [sideways], threats: [{ rusher: "mlb", origin: "UNBLOCKED", etaTick: eta }] });
    expect(bad.problemCount).toBe(1);
    expect(bad.problems[0]).toContain("only the creeper's entry may move");
  });

  it("an unplaced man on the clock is a build fault (no spot is invented); so is an s3 pass play with no picture", () => {
    const { spot: _spot, ...unplaced } = DE;
    const a = folded({ men: [unplaced], threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: 1.5 }] });
    expect(a.problemCount).toBe(1);
    expect(a.problems[0]).toContain("no entry in the snap picture");
    const b = folded({ men: [DE], noSnap: true, threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: 1.5 }] });
    expect(b.pictures).toBe(0);
    expect(b.problems[0]).toContain("no snap picture");
  });

  it("an s2 play is not read: part 1 is step 3's", () => {
    const fold = folded({ men: [DE], rules: S2_STAMP, threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: 9.9 }] });
    expect(fold).toMatchObject({ plays: 1, s3Plays: 0, problemCount: 0, part1: { checked: 0, failed: 0 } });
  });

  it("a looper record that a failed twist made loops from the looper's spot across his penetrator's", () => {
    const eta = timeOf(runnerOf(DE, { edge: false, loopPartner: DT.spot! })).eta;
    const o = (etaTick: number): PlayOptions => ({
      men: [DE, DT],
      stunts: [{ penetrator: "dt", looper: "de" }],
      checks: [stunt("st1", "dt", "de", "LOOPER_FREE")],
      threats: [{ rusher: "de", origin: "STUNT_LOOPER", rollRef: "st1", etaTick }],
    });
    const ok = folded(o(eta));
    expect(ok.problems).toEqual([]);
    expect(ok.byOrigin).toEqual({ "STUNT_LOOPER/LOOPER_FREE": { checked: 1, failed: 0 } });
    expect(ok.carried).toBe(0);
    const straight = timeOf(runnerOf(DE, { edge: false })).eta;
    expect(straight).not.toBe(eta);
    expect(folded(o(straight)).part1.failed).toBe(1);
  });

  it("a carried looper record is timed for its carrier, from his own spot across the man it was carried from (the hand-off fix)", () => {
    // dt/de's twist fails (de loops free); de/nt's twist is passed off, so nt carries de's record.
    const eta = timeOf(runnerOf(NT, { loopPartner: DE.spot! })).eta;
    const o = (etaTick: number): PlayOptions => ({
      men: [DE, DT, NT],
      stunts: [
        { penetrator: "dt", looper: "de" },
        { penetrator: "de", looper: "nt" },
      ],
      checks: [stunt("st1", "dt", "de", "LOOPER_FREE"), stunt("st2", "de", "nt", "PASSED_OFF")],
      threats: [{ rusher: "nt", origin: "STUNT_LOOPER", rollRef: "st1", etaTick }],
    });
    const ok = folded(o(eta));
    expect(ok.problems).toEqual([]);
    expect(ok.carried).toBe(1);
    // Timed for the man who earned it (de across dt), or for nt across the penetrator: both fail.
    for (const wrong of [timeOf(runnerOf(DE, { edge: false, loopPartner: DT.spot! })).eta, timeOf(runnerOf(NT, { loopPartner: DT.spot! })).eta]) {
      if (wrong !== eta) expect(folded(o(wrong)).part1.failed).toBe(1);
    }
  });

  it("reading B leaves a touched man at today's time; reading C times him with his band's delay before the tenth", () => {
    const OLB: Man = { id: "olb", position: "OLB", ratings: R(85, 83), alignment: "EDGE", spot: { x: -6.5, y: 2 } };
    const o = (etaTick: number): PlayOptions => ({ men: [OLB], checks: [pickup("pk1", "rb", "olb", "RAN_THROUGH")], threats: [{ rusher: "olb", origin: "PICKUP_LOST", rollRef: "pk1", etaTick }] });
    // C3 is reading B with no late block: the touched man keeps today's time, the hand-off defect included.
    const C3 = armById("C3").tunables;
    const today = legacyFreeRunSeconds(C3, { origin: "PICKUP_LOST", alignment: "EDGE", position: "OLB", band: "RAN_THROUGH" });
    const b = folded(o(today), C3);
    expect(b.problems).toEqual([]);
    expect(b).toMatchObject({ part1: { checked: 0, failed: 0 }, offClock: { checked: 1, failed: 0 } });
    expect(folded(o(roundEta(today + 0.1)), C3).offClock.failed).toBe(1);
    // C11 is reading C: he is on the clock, 0.5 s added before the tenth.
    const C11 = armById("C11").tunables;
    const t = timeOf(runnerOf(OLB));
    const c = folded(o(roundEta(t.seconds + 0.5)), C11);
    expect(c.problems).toEqual([]);
    expect(c).toMatchObject({ part1: { checked: 0, failed: 0 }, touchedOnClock: { checked: 1, failed: 0 }, monotone: { men: 0 }, mirror: { checked: 0 } });
    expect(folded(o(t.eta), C11).touchedOnClock.failed).toBe(1);
  });

  it("AM-2's untouched exchange (no blocker's hand) is on the clock under reading B, timed as LOOPER_FREE with no delay", () => {
    const eta = timeOf(runnerOf(DE, { edge: false, loopPartner: DT.spot! })).eta;
    const fold = folded({ men: [DE, DT], stunts: [{ penetrator: "dt", looper: "de" }], checks: [stunt("st1", "dt", "de", "LATE_EXCHANGE")], threats: [{ rusher: "de", origin: "STUNT_LOOPER", rollRef: "st1", etaTick: eta }] });
    expect(fold.problems).toEqual([]);
    expect(fold.byOrigin).toEqual({ "STUNT_LOOPER/LATE_EXCHANGE": { checked: 1, failed: 0 } });
  });

  it("an arm that holds inputs is checked on AM-2's references for them (C3: ratings and drop held, his real spot)", () => {
    const C3 = armById("C3").tunables;
    const eta = timeOf(runnerOf(DE, { ratings: R(50, 50), drop: 5 })).eta;
    const real = timeOf(runnerOf(DE, { drop: 7 })).eta;
    expect(real).not.toBe(eta);
    const fold = folded({ men: [DE], call: "Flood", threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: eta }] }, C3);
    expect(fold.problems).toEqual([]);
    expect(fold.held).toBe(1);
    expect(folded({ men: [DE], call: "Flood", threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: real }] }, C3).part1.failed).toBe(1);
  });

  it("an arm with no free-run block puts nobody on the clock (C10); C9's clock is LOOPER_FREE's alone", () => {
    for (const id of ["C10", "C9"] as const) {
      const T = armById(id).tunables;
      const today = legacyFreeRunSeconds(T, { origin: "UNBLOCKED", alignment: "EDGE", position: "DE" });
      const fold = folded({ men: [DE], threats: [{ rusher: "de", origin: "UNBLOCKED", etaTick: today }] }, T);
      expect(fold.problems).toEqual([]);
      expect(fold).toMatchObject({ part1: { checked: 0 }, offClock: { checked: 1, failed: 0 } });
    }
  });

  it("a free record naming no CHECK of its kind is a build fault, never a crash", () => {
    const fold = folded({ men: [DE], checks: [], threats: [{ rusher: "de", origin: "PICKUP_LOST", rollRef: "nothing", etaTick: 1.5 }] });
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toContain("cannot be restated");
  });
});

describe("the filed M8 block, printed unchanged beside part 1 (critique 1 N5)", () => {
  it("is the step-0 filing's M.M8, read from the committed filing, which this leaves as filed", () => {
    const filing = loadFiled(join(import.meta.dirname, "..", FILED_PATH));
    expect(filedDigest(filing)).toBe(STEP0_FILED_DIGEST);
    expect(filedM8Of(filing)).toBe(filing.M.M8);
    expect(() => filedM8Of({ M: {} })).toThrow(/no M.M8 block/);
  });
});

// --- the corpus -----------------------------------------------------------------------------------

interface Game {
  readonly events: readonly MatchEventEnvelope[];
  readonly snapshot: GameSnapshot;
}

function gamesUnder(tunables: Tunables, first = FIRST): readonly Game[] {
  const out: Game[] = [];
  for (const league of ["flat", "gen"] as const) goldenGames(league, (obs, snapshot) => out.push({ events: obs.events, snapshot }), { tunables, first });
  return out;
}

function foldGames(games: readonly Game[], tunables: Tunables): Part1Fold {
  return games.reduce((acc, g) => {
    const f = emptyPart1Fold();
    foldPart1Game(f, g.events, g.snapshot, tunables);
    return mergePart1Folds(acc, f);
  }, emptyPart1Fold());
}

const PLAYABLE = STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined);
const OFF_CLOCK_ARMS: readonly ArmId[] = ["C3", "C4", "C5", "C7", "C8", "C9", "C10", "C16"];
const LATE_ARMS: readonly ArmId[] = ["C1", "C2", "C6", "C10", "C12", "C14", "C15"];

describe(`part 1 on the first ${String(FIRST)} golden games of each league under every playable step-3 arm`, () => {
  it("no arm is refused: C14 plays (P17 in contracts, E4b)", () => {
    expect(STEP3_ARM_IDS.filter((id) => armRefusal(id) !== undefined)).toEqual([]);
    expect(PLAYABLE).toEqual([...STEP3_ARM_IDS]);
  });

  it.each(PLAYABLE)("%s: part 1, the touched check, today's times and the mirror hold", (id) => {
    const T = armById(id).tunables;
    const fold = foldGames(gamesUnder(T), T);
    const s = part1Summary(fold);
    console.log(`part1 ${id}: ${JSON.stringify({ plays: s["plays"], s3Plays: s["s3Plays"], pictures: s["pictures"], part1: s["part1"], touchedOnClock: s["touchedOnClock"], offClock: s["offClock"], touched: s["touched"], held: s["heldReferences"], carried: s["carried"], mirror: s["mirror"], monotone: s["monotone"] })}`);
    expect(part1Problems(fold)).toEqual([]);
    expect(fold.plays).toBeGreaterThan(0);
    if (id === "C13") {
      // Stamped pocket-1.s2: no s3 play.
      expect(fold.s3Plays).toBe(0);
      return;
    }
    expect(fold.s3Plays).toBe(fold.plays);
    expect(fold.pictures).toBe(fold.s3Plays);
    if (T.blitzPickup.freeRun !== undefined) {
      expect(fold.part1.checked).toBeGreaterThan(0);
      expect(fold.mirror).toEqual({ checked: fold.part1.checked, failed: 0 });
      expect(fold.monotone.men).toBe(fold.part1.checked);
    } else {
      expect(fold.part1.checked).toBe(0);
    }
    if (id === "C1" || id === "C2") expect(monotoneProblems(fold)).toEqual([]);
    if (LATE_ARMS.includes(id)) expect(fold.touched.checked).toBeGreaterThan(0);
    if (OFF_CLOCK_ARMS.includes(id)) expect(fold.offClock.checked).toBeGreaterThan(0);
    if (id === "C11") expect(fold.touchedOnClock.checked).toBeGreaterThan(0);
    if (id === "C3" || id === "C4" || id === "C5") expect(fold.held).toBe(fold.part1.checked);
    else expect(fold.held).toBe(0);
  });
});

describe("the negative control: C1 with getOffSeconds 0.36 fails part 1 (plan §2.8)", () => {
  it("is C1 but for the get-off, stamped pocket-1.s3 at a digest of its own", () => {
    expect(NEGATIVE_CONTROL.blitzPickup.freeRun).toEqual({ ...C1.blitzPickup.freeRun, getOffSeconds: 0.36 });
    expect(NEGATIVE_CONTROL.engineRules?.name).toBe(POCKET_1_S3_RULES);
    expect(NEGATIVE_CONTROL.engineRules?.overlayDigest).not.toBe(POCKET_1_S3_DIGEST);
  });

  it("fails part 1 on the same games, later than the filed function, and nothing else", () => {
    const fold = foldGames(gamesUnder(NEGATIVE_CONTROL), NEGATIVE_CONTROL);
    console.log(`part1 negative control: ${JSON.stringify({ part1: fold.part1, touched: fold.touched, mirror: fold.mirror, problems: fold.problems.slice(0, 3) })}`);
    expect(fold.part1.failed).toBeGreaterThan(0);
    expect(part1Problems(fold)).not.toEqual([]);
    // Only part 1's men fail: the touched check, today's times and the mirror read nothing of the get-off.
    expect(fold.problemCount).toBe(fold.part1.failed);
    expect(fold.touched.failed).toBe(0);
    expect(fold.mirror.failed).toBe(0);
    for (const p of fold.problems) {
      const m = /published ([\d.]+), the free-run function gives ([\d.]+)/.exec(p);
      expect(m).not.toBeNull();
      expect(Number(m![1])).toBeGreaterThan(Number(m![2]));
    }
  });
});

describe("real streams with one fact changed fail (C1 and C10, the first golden flat games)", () => {
  const clone = (events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] => JSON.parse(JSON.stringify(events)) as MatchEventEnvelope[];
  type Payload = Record<string, unknown>;
  const payloadOf = (e: MatchEventEnvelope): Payload => e.event.payload as Payload;
  const games = gamesUnder(C1, 2).slice(0, 2);

  /** The first play with an UNBLOCKED man published at the snap: his threat's index, and his play's PLAY_START index. */
  function firstUnblocked(events: readonly MatchEventEnvelope[]): { readonly start: number; readonly threat: number; readonly rusher: string } {
    let start = -1;
    let ticked = false;
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i]!.event;
      if (e.type === "PLAY_START") {
        start = i;
        ticked = false;
      } else if (e.type === "TICK") ticked = true;
      else if (e.type === "RUSH_THREAT" && !ticked && e.payload.origin === "UNBLOCKED") return { start, threat: i, rusher: String(e.payload.rusher) };
    }
    throw new Error("no UNBLOCKED man published at a snap");
  }

  const run = (g: Game, events: readonly MatchEventEnvelope[], T: Tunables = C1): Part1Fold => {
    const f = emptyPart1Fold();
    foldPart1Game(f, events, g.snapshot, T);
    return f;
  };

  it("the unchanged games pass", () => {
    for (const g of games) expect(run(g, g.events).problems).toEqual([]);
  });

  it("his spot three yards deeper, his entry gone, the picture gone: each fails", () => {
    const g = games.find((x) => {
      try {
        firstUnblocked(x.events);
        return true;
      } catch {
        return false;
      }
    })!;
    const at = firstUnblocked(g.events);
    const deeper = clone(g.events);
    const snap = payloadOf(deeper[at.start]!)["snap"] as { defense: { player: string; y: number }[] };
    snap.defense.find((d) => String(d.player) === at.rusher)!.y += 3;
    expect(run(g, deeper).part1.failed).toBe(1);

    const gone = clone(g.events);
    const snap2 = payloadOf(gone[at.start]!)["snap"] as { defense: { player: string }[] };
    snap2.defense = snap2.defense.filter((d) => String(d.player) !== at.rusher);
    expect(run(g, gone).problems.join("\n")).toContain("no entry in the snap picture");

    const none = clone(g.events);
    delete payloadOf(none[at.start]!)["snap"];
    expect(run(g, none).problems.join("\n")).toContain("no snap picture");
  });

  it("a beaten late block's threat a tenth later fails the touched men's check", () => {
    let done = false;
    for (const g of games) {
      const events = clone(g.events);
      // A late beat: it names a pickup or stunt CHECK of its play (a rep's beat names a rep), and its man was published.
      const touching = (e: MatchEventEnvelope): boolean =>
        events.some(
          (x) =>
            x.event.playId === e.event.playId &&
            x.event.type === "CHECK" &&
            (x.event.payload.checkKind === "blitz_pickup" || x.event.payload.checkKind === "stunt_communication") &&
            x.event.payload.roll?.rngLabel === payloadOf(e)["rollRef"],
        );
      const published = (e: MatchEventEnvelope): boolean =>
        events.some((x) => x.event.playId === e.event.playId && x.event.type === "RUSH_THREAT" && String(x.event.payload.rusher) === String((payloadOf(e)["actors"] as unknown[])[0]));
      const beat = events.findIndex((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "pass_rush_beat" && touching(e) && published(e));
      if (beat < 0) continue;
      const man = String((payloadOf(events[beat]!)["actors"] as unknown[])[0]);
      const threat = events.findIndex((x) => x.event.playId === events[beat]!.event.playId && x.event.type === "RUSH_THREAT" && String(x.event.payload.rusher) === man);
      const p = payloadOf(events[threat]!);
      p["etaTick"] = roundEta((p["etaTick"] as number) + 0.1);
      const f = run(g, events);
      expect(f.touched.failed).toBe(1);
      expect(f.problemCount).toBe(1);
      done = true;
      break;
    }
    expect(done).toBe(true);
  });

  it("an off-clock man (C10: no free-run block) a tenth later fails today's time", () => {
    const C10 = armById("C10").tunables;
    const g = gamesUnder(C10, 1)[0]!;
    expect(run(g, g.events, C10).problems).toEqual([]);
    const at = firstUnblocked(g.events);
    const events = clone(g.events);
    const p = payloadOf(events[at.threat]!);
    p["etaTick"] = roundEta((p["etaTick"] as number) + 0.1);
    const f = run(g, events, C10);
    expect(f.offClock.failed).toBe(1);
    expect(f.problemCount).toBe(1);
  });
});
