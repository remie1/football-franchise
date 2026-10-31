/**
 * THE COUNT READ (ADR-092 §4 and §5, built with ADR-091's step S-a).
 *
 * Each assertion is a number ADR-092 printed before anything was built: §4.1's ceiling table,
 * §4.2's film reads, §5.1's "about half by the end of the first quarter, about four-fifths by
 * halftime", §5.2's quarter of the gap, §5.3's 15 points at Poise 20, and §5.4's fix.
 */
import { describe, expect, it } from "vitest";
import { playerId } from "@ff/contracts";
import {
  COUNT_READ_DIALS,
  afterHabitDropped,
  afterNewWord,
  afterSnap,
  atHalftime,
  ceilingFor,
  ceilingUnderStress,
  countReadAtKickoff,
  filmShareFor,
  forNewQuarterback,
} from "../src/game/countRead.js";

const QB = playerId("qb");

describe("before the game (ADR-092 §4)", () => {
  it("§4.1's ceiling table: Football IQ 35, 50, 65, 85 give 77, 68, 59, 47; kept between 20 and 95", () => {
    expect([35, 50, 65, 85].map(ceilingFor)).toEqual([77, 68, 59, 47]);
    expect(ceilingFor(0)).toBe(95);
    expect(ceilingFor(100)).toBe(38);
  });

  it("§4.2's film reads: an average staff 34, a DC at 90 about 44 (share 0.64), a DC at 20 about 27 (share 0.395)", () => {
    expect(filmShareFor(50, 50)).toBe(0.5);
    expect(countReadAtKickoff(QB, 50, filmShareFor(50, 50)).filmRead).toBe(34);
    expect(filmShareFor(90, 50)).toBeCloseTo(0.64, 12);
    expect(Math.round(countReadAtKickoff(QB, 50, filmShareFor(90, 50)).filmRead)).toBe(44);
    expect(filmShareFor(20, 50)).toBeCloseTo(0.395, 12);
    expect(Math.round(countReadAtKickoff(QB, 50, filmShareFor(20, 50)).filmRead)).toBe(27);
  });

  it("§4.4: with no weekly packet the share is one half, and the read starts at the film read", () => {
    const read = countReadAtKickoff(QB, 50, COUNT_READ_DIALS.film.absent);
    expect(read).toEqual({ quarterback: QB, ceiling: 68, filmRead: 34, read: 34, share: 0.5, habitDropped: false });
  });
});

describe("during the game (ADR-092 §5)", () => {
  const kickoff = countReadAtKickoff(QB, 50, 0.5);
  const snaps = (n: number) => Array.from({ length: n }).reduce<typeof kickoff>((r) => afterSnap(r), kickoff);
  const closed = (r: typeof kickoff) => (r.read - kickoff.read) / (kickoff.ceiling - kickoff.read);

  it("§5.1: about half the gap closed by the end of the first quarter (14 snaps), about four-fifths by halftime (31)", () => {
    expect(closed(snaps(14))).toBeCloseTo(0.51, 2);
    expect(closed(snaps(31))).toBeCloseTo(0.8, 2);
  });

  it("§5.2: halftime closes a quarter of the remaining gap with the DC at 50", () => {
    const before = snaps(31);
    const after = atHalftime(before, COUNT_READ_DIALS.absentAdjustment);
    expect((after.read - before.read) / (before.ceiling - before.read)).toBeCloseTo(0.25, 12);
  });

  it("§5.3: a quarterback at Poise 20 gives away 15 more in a close fourth quarter, and nobody else does", () => {
    const close4th = { period: 4, scoreMargin: -8 };
    expect(ceilingUnderStress(kickoff, 20, close4th)).toBe(83);
    expect(ceilingUnderStress(kickoff, 50, close4th)).toBe(68);
    expect(ceilingUnderStress(kickoff, 20, { period: 3, scoreMargin: 0 })).toBe(68);
    expect(ceilingUnderStress(kickoff, 20, { period: 4, scoreMargin: 9 })).toBe(68);
    expect(ceilingUnderStress({ ...kickoff, ceiling: 95 }, 0, close4th)).toBe(100);
  });

  it("§5.4's new live word: the read keeps a quarter of its live gain, three-quarters if the DC read the change", () => {
    const before = snaps(20);
    const gain = before.read - before.filmRead;
    expect(afterNewWord(before, false).read).toBeCloseTo(before.filmRead + gain / 4, 12);
    expect(afterNewWord(before, true).read).toBeCloseTo(before.filmRead + (3 * gain) / 4, 12);
  });

  it("§5.4's dropped habit: a third of the film read off both, once a game", () => {
    const before = snaps(20);
    const after = afterHabitDropped(before);
    expect(after.filmRead).toBeCloseTo((before.filmRead * 2) / 3, 12);
    expect(before.read - after.read).toBeCloseTo(before.filmRead / 3, 12);
    expect(after.habitDropped).toBe(true);
    expect(() => afterHabitDropped(after)).toThrow(/once a game/);
  });

  it("§5.5: a new quarterback brings his ceiling and a film read at half the share", () => {
    const backup = playerId("backup");
    const after = forNewQuarterback(snaps(25), backup, 65);
    expect(after).toEqual({ quarterback: backup, ceiling: 59, filmRead: 14.75, read: 14.75, share: 0.5, habitDropped: false });
  });
});
