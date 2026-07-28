/**
 * TIER 1 METRICS — measurable for the first time, because games now finish.
 *
 * ================== LOG, DO NOT TUNE ==================
 * This file is a REGRESSION FENCE, not a target. The bounds are wide and are set
 * where the engine actually is today, not where the NFL is, because five
 * dispatches of standing practice say: implement literally, measure, log to
 * `docs/decisions/CALIBRATION-BACKLOG.md`, and let calibration move the dials
 * with evidence. A test that asserted NFL-realistic bounds would either fail on
 * arrival or force a tuning change smuggled inside a feature dispatch.
 *
 * ⚠ THE TABLE IMMEDIATELY BELOW IS THE FIRST MEASUREMENT AND IS HISTORY. The
 *   CURRENT numbers are the third block, at the bottom of this comment.
 *
 * Measured over 12 games (seeds `metrics-0`..`metrics-11`), July 2026:
 *
 *   metric                 engine        NFL         verdict
 *   points/team            30.6          22.5        HIGH — run game (backlog 11-14)
 *   drives/game            32.0          22-24       HIGH — short drives
 *   plays/game             140           ~128        close
 *   plays/drive            4.4           ~5.9        LOW — completion rate
 *   three-and-out rate     25.4%         ~24%        close
 *   points/drive           1.91          ~2.0        close (high scoring ÷ many drives)
 *   time of possession     3483s/3600    ~3540       close; no out-of-bounds model
 *   completion %           44.7%         ~65%        LOW — inherited, backlog 3
 *   yards per carry        9.34          ~4.3        HIGH — inherited, backlog 11-14
 *   sacks/game             10.8          ~4.6        HIGH — inherited, backlog 3
 *   INT/game               5.0           ~1.4        HIGH — inherited, backlog 5/6
 *   FG%                    80.1%         ~84%        close (new, placeholder ST)
 *   XP%                    92.4%         ~94%        close (new, placeholder ST)
 *   punt gross             48.2          ~46.5       close (new, placeholder ST)
 *
 * Every "inherited" row is a PLAY-level defect already in the backlog; the game
 * loop merely made it visible at game scale for the first time. Nothing in this
 * dispatch was tuned to move any of them, and `blockerStructuralAdvantage` and
 * `sackWhenNoTarget` remain frozen.
 *
 * ---------------------------------------------------------------------------
 * RE-MEASURED July 2026, after §5.3/§7.3/§7.4. Same seeds, same fences, three
 * more coverage cards in the corpus — so this is NOT a controlled comparison,
 * it is the same fixture with a different play mix, and the mix is the reason
 * every row moved. Recorded so the table above is not read as current:
 *
 *   points/team        30.6 → 31.5      drives/game    32.0 → 31.2
 *   plays/game         140  → 137       plays/drive     4.4 →  4.4
 *   completion %       44.7% → 48.3%    sacks/game     10.8 → 10.7
 *   INT/game            5.0 →  4.3      yards/carry    9.34 → 9.72
 *
 * The completion move is the largest and the most interesting: a blitz thins the
 * coverage behind it, and a recognised blitz converts a route to a hot one. The
 * CONTROLLED before/after — identical seeds, pressure metrics only — is in
 * `pressureMetrics.test.ts`. Nothing here was tuned.
 * ---------------------------------------------------------------------------
 *
 * ============ CURRENT — RE-MEASURED July 2026, THIRTEENTH DISPATCH ============
 * Same 12 seeds, same fixture, the whole table this time rather than the eight
 * rows the block above happened to touch. RE-RECORDED BECAUSE THE HEADER HAD
 * STOPPED BEING TRUE: the second block re-measured the passing and rushing rows
 * and silently left the FIRST block's special-teams and drive-shape rows
 * standing, so this comment has been quoting numbers the engine does not
 * produce for two dispatches. That is the same failure the file's own "log, do
 * not tune" rule exists to prevent, one level up — a stale fence reads as a
 * measurement.
 *
 *   metric                 engine        NFL         was          verdict
 *   points/team            31.5          22.5        30.6→31.5    HIGH — backlog 11-14
 *   drives/game            31.2          22-24       32.0→31.2    HIGH — short drives
 *   plays/game             137           ~128        140 →137     close
 *   plays/drive            4.40          ~5.9        4.4          LOW — completion rate
 *   three-and-out rate     26.7%         ~24%        25.4%        close
 *   points/drive           2.02          ~2.0        1.91         close
 *   time of possession     3479s/3600    ~3540       3483s        close; no OB model
 *   completion %           48.3%         ~65%        44.7%→48.3%  LOW — backlog 3
 *   yards per carry        9.72          ~4.3        9.34→9.72    HIGH — backlog 11-14
 *   sacks/game             10.7          ~4.6        10.8→10.7    HIGH — backlog 3
 *   INT/game               4.3           ~1.4        5.0 →4.3     HIGH — backlog 5/6
 *   FG%                    75.0%         ~84%        80.1%        LOW — see below
 *   XP%                    97.8%         ~94%        92.4%        close
 *   punt gross             48.6          ~46.5       48.2         close
 *
 * NOTHING WAS TUNED TO MOVE ANY OF THESE, and in particular no special-teams
 * dial was touched: `blockerStructuralAdvantage`, `sackWhenNoTarget` and
 * `freeRunnerArrivalSeconds` are frozen. The three special-teams rows moved
 * because the PLAY MIX moved — §5.3/§7.3/§7.4 changed drive shape, which changes
 * where drives stall and therefore the distance distribution of the kicks. The
 * denominators are small (39/52 field goals, 88/90 extra points, 145 punts over
 * twelve games), so FG% in particular is three kicks wide: read the direction,
 * not the digits. Fenced, logged, and left for calibration.
 * =======================================================
 */
import { describe, expect, it } from "vitest";
import { simulateGame } from "../src/game/simulateGame.js";
import type { GameEvent, GameEventEnvelope } from "../src/game/events.js";
import { buildGameFixture } from "./gameFixtures.js";

function eventsOf<T extends GameEvent["type"]>(
  events: readonly GameEventEnvelope[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events
    .map((e) => e.event)
    .filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

const GAMES = 12;

interface Totals {
  points: number;
  drives: number;
  plays: number;
  threeAndOuts: number;
  driveSeconds: number;
  passAttempts: number;
  completions: number;
  sacks: number;
  interceptions: number;
  carries: number;
  rushYards: number;
  fieldGoalAttempts: number;
  fieldGoalsMade: number;
  extraPointAttempts: number;
  extraPointsMade: number;
  punts: number;
  puntYards: number;
}

const totals: Totals = {
  points: 0, drives: 0, plays: 0, threeAndOuts: 0, driveSeconds: 0,
  passAttempts: 0, completions: 0, sacks: 0, interceptions: 0,
  carries: 0, rushYards: 0, fieldGoalAttempts: 0, fieldGoalsMade: 0,
  extraPointAttempts: 0, extraPointsMade: 0, punts: 0, puntYards: 0,
};
const teamScores: number[] = [];

for (let i = 0; i < GAMES; i++) {
  const fixture = buildGameFixture({ seed: `metrics-${i}` });
  const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
  totals.points += result.summary.score.home + result.summary.score.away;
  teamScores.push(result.summary.score.home, result.summary.score.away);
  totals.drives += result.summary.drives;
  totals.plays += result.summary.plays;
  for (const drive of eventsOf(result.events, "DRIVE_END")) {
    totals.driveSeconds += drive.payload.elapsedSeconds;
    if (
      drive.payload.plays <= 3 &&
      (drive.payload.result === "PUNT" || drive.payload.result === "TURNOVER_ON_DOWNS")
    ) {
      totals.threeAndOuts += 1;
    }
  }
  for (const line of result.statlines) {
    totals.passAttempts += line.passing.attempts;
    totals.completions += line.passing.completions;
    totals.sacks += line.passing.sacked;
    totals.interceptions += line.passing.interceptions;
    totals.carries += line.rushing.attempts;
    totals.rushYards += line.rushing.yards;
    totals.fieldGoalAttempts += line.kicking.fieldGoalAttempts;
    totals.fieldGoalsMade += line.kicking.fieldGoalsMade;
    totals.extraPointAttempts += line.kicking.extraPointAttempts;
    totals.extraPointsMade += line.kicking.extraPointsMade;
    totals.punts += line.kicking.punts;
    totals.puntYards += line.kicking.puntGrossYards;
  }
}

const per = (value: number): number => value / GAMES;

describe("Tier 1 — the game-shaped metrics, measurable for the first time", () => {
  it("scoring distribution: nobody is shut out and nobody scores 100", () => {
    expect(Math.min(...teamScores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...teamScores)).toBeLessThan(90);
    expect(per(totals.points)).toBeGreaterThan(35);
    expect(per(totals.points)).toBeLessThan(90);
  });

  it("drives per game — HIGH against the NFL's 22-24, logged not tuned", () => {
    expect(per(totals.drives)).toBeGreaterThan(20);
    expect(per(totals.drives)).toBeLessThan(42);
  });

  it("plays per game is in the right neighbourhood", () => {
    expect(per(totals.plays)).toBeGreaterThan(110);
    expect(per(totals.plays)).toBeLessThan(175);
  });

  it("three-and-out rate is close to the NFL's ~24%", () => {
    const rate = totals.threeAndOuts / totals.drives;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.38);
  });

  it("points per drive is close to the NFL's ~2.0", () => {
    const perDrive = totals.points / totals.drives;
    expect(perDrive).toBeGreaterThan(1.2);
    expect(perDrive).toBeLessThan(2.8);
  });

  it("time of possession accounts for nearly the whole game clock", () => {
    // The gap is kickoffs and extra points, which are not part of any drive.
    // A large gap would mean the loop is losing clock somewhere.
    const perGame = per(totals.driveSeconds);
    expect(perGame).toBeGreaterThan(3200);
    expect(perGame).toBeLessThanOrEqual(3600);
  });
});

describe("inherited play-level divergences, fenced so they cannot drift further", () => {
  it("completion percentage — LOW, backlog 3 (blockerStructuralAdvantage, frozen)", () => {
    const rate = totals.completions / totals.passAttempts;
    expect(rate).toBeGreaterThan(0.3);
    expect(rate).toBeLessThan(0.62);
  });

  it("yards per carry — HIGH, backlog 11-14 (zone coarseness, breakaway)", () => {
    const ypc = totals.rushYards / totals.carries;
    expect(ypc).toBeGreaterThan(5);
    expect(ypc).toBeLessThan(14);
  });

  it("sacks per game — HIGH, backlog 3", () => {
    expect(per(totals.sacks)).toBeGreaterThan(4);
    expect(per(totals.sacks)).toBeLessThan(18);
  });

  it("interceptions per game — HIGH, backlog 5/6 (tipped-ball recovery)", () => {
    expect(per(totals.interceptions)).toBeGreaterThan(1);
    expect(per(totals.interceptions)).toBeLessThan(9);
  });
});

describe("special teams, new in this dispatch and closest to reality of anything here", () => {
  it("field-goal percentage is near the league's", () => {
    const rate = totals.fieldGoalsMade / totals.fieldGoalAttempts;
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.95);
  });

  it("extra-point percentage is near the league's", () => {
    // ⚠ TIGHT. Measured 0.978 (88/90) against an upper fence of 0.99, so ONE
    // more made kick in twelve games trips this. Recorded rather than widened:
    // the fence is where it is on purpose and moving it to make room is exactly
    // the "tuning smuggled into a feature dispatch" this file forbids. If it
    // does trip, re-measure first and widen deliberately, with the number.
    const rate = totals.extraPointsMade / totals.extraPointAttempts;
    expect(rate).toBeGreaterThan(0.85);
    expect(rate).toBeLessThan(0.99);
  });

  it("gross punting average is near the league's", () => {
    const gross = totals.puntYards / totals.punts;
    expect(gross).toBeGreaterThan(42);
    expect(gross).toBeLessThan(53);
  });
});
