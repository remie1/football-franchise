import { describe, it, expect } from "vitest";
import type { RelationshipView } from "@ff/contracts";
import {
  buildLeague, buildStaff, coordinatorFireChance, runStaffOffseason, seatOf, seatRelationships, standInSeason,
  staffTurnoverCheck, STYLE_MATCH, STAFF_TUNING, type StaffWorld,
} from "../src/index.js";

// ADR-084 L2b (§7.1), as ruled 2026-10-31: Q1 (b) walking out, Q2 (a) the head coach's opinion, Q3 (a) fit.

const league = buildLeague("stay-go");
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });
const played = standInSeason(league, built.world, built.standIn, "stay-go");
const base = seatRelationships(built.world);
const logit = (p: number) => Math.log(p / (1 - p));

const seatOfId = (w: StaffWorld) => new Map(w.staff.map((s) => [String(s.id), seatOf(s)]));
/** Every coordinator's view of his head coach set to `score`; the rest as seated. */
function towardBoss(score: number): RelationshipView[] {
  const seat = seatOfId(built.world);
  return base.map((v) => ("staff" in v.of && seat.get(String(v.of.staff)) === "HEAD_COACH" && seat.get(String(v.from)) !== "HEAD_COACH" ? { ...v, score } : v));
}
const offseason = (views: RelationshipView[], seed: string) =>
  runStaffOffseason({ world: built.world, results: played.summaries, seed, relationships: { views } });

describe("a head coach's opinion when he judges a coordinator (Q2 a)", () => {
  const v = { seat: "OC" as const, unitPct: 0.5, seasonsInJob: 3, politics: 50, scapegoat: false };
  const place = STAFF_TUNING.coordFireUnitRank / 31;

  it("costs a strained (-30) coordinator about 5 places of unit rank, a broken (-60) one about 10", () => {
    const shift = (opinion: number) => logit(coordinatorFireChance({ ...v, opinion })) - logit(coordinatorFireChance(v));
    expect(shift(-30) / place).toBeCloseTo(5, 0);
    expect(shift(-60) / place).toBeCloseTo(10, 0);
  });

  it("protects a man he likes by the same amount, and no opinion is no change", () => {
    const shift = (opinion: number) => logit(coordinatorFireChance({ ...v, opinion })) - logit(coordinatorFireChance(v));
    expect(shift(30)).toBeCloseTo(-shift(-30), 12);
    expect(coordinatorFireChance({ ...v, opinion: 0 })).toBe(coordinatorFireChance(v));
  });
});

describe("a coordinator whose contract is up (Q1 b)", () => {
  const seeds = Array.from({ length: 12 }, (_, i) => `walk-${i}`);
  /** Over many rolls: of the coordinators the team chose to keep, the share who walked instead. */
  function walkShare(score: number) {
    let walked = 0, kept = 0;
    for (const seed of seeds) {
      const r = offseason(towardBoss(score), seed);
      walked += r.moves.filter((m) => m.walked).length;
      kept += r.decisions.filter((d) => d.type === "EXTEND_STAFF" && d.payload.seat !== "HEAD_COACH").length;
    }
    return { walked, share: walked / Math.max(1, walked + kept) };
  }

  it("walks about 4 times in 10 when broken, about 1 in 10 when strained, never otherwise", () => {
    const broken = walkShare(-60), strained = walkShare(-30), fine = walkShare(0);
    expect(broken.walked).toBeGreaterThan(20);
    expect(broken.share).toBeGreaterThan(0.28);
    expect(broken.share).toBeLessThan(0.52);
    expect(strained.share).toBeGreaterThan(0.03);
    expect(strained.share).toBeLessThan(0.2);
    expect(fine.walked).toBe(0);
  });

  it("leaves with his contract run out, by his choice: no team decision, no sting to his friends, a seat to fill", () => {
    const r = offseason(towardBoss(-60), "walk-0");
    const walked = r.moves.filter((m) => m.walked);
    expect(walked.length).toBeGreaterThan(0);
    for (const m of walked) {
      expect(m.reason).toBe("CONTRACT_EXPIRED");
      expect(r.decisions.some((d) => d.payload.staff === m.staff && (d.type === "LET_CONTRACT_EXPIRE" || d.type === "EXTEND_STAFF"))).toBe(false);
      expect(r.moves.some((x) => x.kind === "HIRED" && x.team === m.team && x.seat === m.seat)).toBe(true);
    }
  });

  it("does nothing when the views are carried without being read", () => {
    const plain = runStaffOffseason({ world: built.world, results: played.summaries, seed: "walk-0" });
    const carried = runStaffOffseason({ world: built.world, results: played.summaries, seed: "walk-0", relationships: { views: towardBoss(-60), read: false } });
    expect(carried.world).toEqual(plain.world);
  });
});

describe("a new head coach and the coordinators he inherits (Q3 a)", () => {
  it("is sized so the best and the worst fit move the chance he keeps a man by 10 points", () => {
    const fits = Object.values(STYLE_MATCH).flatMap((row) => Object.values(row));
    expect(Math.max(...fits.map(Math.abs)) * 0.25).toBeCloseTo(0.1, 10);
  });
});

describe("turnover with the views read (ADR-080 §8 bands)", () => {
  const r = staffTurnoverCheck({ seed: "staff-check-test", seasons: 30, views: true });
  const s = r.summary.changesPerYear;

  it("stays inside the NFL ranges", () => {
    expect(s.HEAD_COACH.mean).toBeGreaterThan(5);
    expect(s.HEAD_COACH.mean).toBeLessThan(9);
    expect(s.OC.mean).toBeGreaterThan(10);
    expect(s.OC.mean).toBeLessThan(18);
    expect(s.DC.mean).toBeGreaterThan(8);
    expect(s.DC.mean).toBeLessThan(14);
  });

  it("with only the carousel's own moves, nearly nobody is strained, so nobody walks", () => {
    const walked = r.perSeason.reduce((n, p) => n + (p.walked ?? 0), 0);
    expect(walked).toBeLessThanOrEqual(2);
  });
});
