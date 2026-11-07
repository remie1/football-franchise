/**
 * ADR-094 §8 (step 2): GMs are hired and fired, from a front office every team keeps.
 */
import { describe, it, expect } from "vitest";
import {
  buildLeague, buildStaff, runStaffOffseason, standInSeason, makeGm, seatOf, isRetired, candidateReport,
  gmFireChance, gmVerdict, gmCandidate, gmSourceOf, ladderJob, drawGmSource, LADDER_ROLES, GM_TUNING, seatRelationships,
  type StaffWorld, type GmMove, type StaffMove, type StaffOffseasonResult,
} from "../src/index.js";
import { createRng, type StaffState, type TeamId } from "@ff/contracts";

const SEED = "staff-gm";
const league = buildLeague(SEED);
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });

function withGms(world: StaffWorld): StaffWorld {
  const gms = world.teams.map((t) => {
    const gm = makeGm(t, SEED);
    gm.career = [{ ...gm.career[0]!, firstSeason: world.season }];
    return gm;
  });
  return { ...world, teams: world.teams.map((t, i) => ({ ...t, staff: [...t.staff, gms[i]!.id] })), staff: [...world.staff, ...gms] };
}

/** Play `n` stand-in seasons and offseasons, keeping every offseason's result. */
function run(n: number, extra: Partial<Parameters<typeof runStaffOffseason>[0]> = {}, start = withGms(built.world)) {
  let world = start;
  let standIn = built.standIn;
  const out: StaffOffseasonResult[] = [];
  let views = extra.relationships ? seatRelationships(world, extra.relationships.context) : undefined;
  for (let y = 0; y < n; y++) {
    const played = standInSeason(league, world, standIn, SEED);
    standIn = played.state;
    const r = runStaffOffseason({
      ...extra, world, results: played.summaries, seed: SEED,
      ...(views ? { relationships: { ...extra.relationships!, views } } : {}),
    });
    world = r.world;
    views = r.relationships;
    out.push(r);
  }
  return { world, out };
}

const ten = run(10);

describe("GM verdict and firing chance (ADR-094 §8)", () => {
  const line = (season: number, wins: number) => ({ season, record: { wins, losses: 17 - wins, ties: 0 } });
  const v = (wins: number[], extra = {}) => gmVerdict(wins.map((w, i) => line(2026 + i, w)), {
    played: 2026 + wins.length - 1, teamCount: 32, correction: 0.5, politics: 50, ...extra,
  });

  it("fires a losing GM more readily than a winning one, and never a champion", () => {
    expect(gmFireChance(v([5, 5, 5, 5]))).toBeGreaterThan(gmFireChance(v([12, 12, 12, 12])));
    expect(gmFireChance(v([3, 3, 3, 3], { playoffs: { wins: 4, champion: true } }))).toBe(0);
  });

  it("gives a new GM a honeymoon, longer than a head coach's", () => {
    expect(gmFireChance(v([4]))).toBeLessThan(gmFireChance(v([4, 4, 4, 4, 4])));
    expect(GM_TUNING.honeymoon.length).toBeGreaterThan(3);
  });

  it("weighs his whole tenure, recent seasons most", () => {
    expect(v([12, 12, 12, 4]).perf).toBeGreaterThan(v([4, 4, 4, 4]).perf);
    expect(v([4, 12]).perf).toBeGreaterThan(v([12, 4]).perf);
  });
});

describe("the GM carousel (ADR-094 §8)", () => {
  it("leaves a league with no GMs exactly as before: no GM moves, no front office", () => {
    const r = run(2, {}, built.world);
    for (const o of r.out) expect(o.gmMoves).toEqual([]);
    expect(r.world.staff.some((s) => s.role === "GM" || s.role === "SCOUTING_DIRECTOR" || s.role === "CAP_MANAGER")).toBe(false);
  });

  it("gives the same world twice from the same seed", () => {
    const again = run(10);
    expect(again.world).toEqual(ten.world);
    expect(again.out.map((o) => o.gmMoves)).toEqual(ten.out.map((o) => o.gmMoves));
  });

  it("keeps one contracted GM, one scouting director and one cap manager on every team", () => {
    const w = ten.world;
    for (const team of w.teams) {
      const gms = w.staff.filter((s) => s.role === "GM" && s.teamId === team.id);
      expect(gms, String(team.id)).toHaveLength(1);
      expect(team.staff.filter((id) => id === gms[0]!.id)).toHaveLength(1);
      const live = w.contracts.filter((c) => c.staff === gms[0]!.id && c.team === team.id && c.terminated === undefined && c.lastSeason >= w.season);
      expect(live, `${String(team.id)} GM contract`).toHaveLength(1);
      for (const role of LADDER_ROLES) {
        expect(w.staff.filter((s) => !isRetired(s) && ladderJob(s)?.role === role && ladderJob(s)!.team === team.id), `${String(team.id)} ${role}`).toHaveLength(1);
      }
    }
    expect(new Set(w.staff.map((s) => String(s.id))).size).toBe(w.staff.length);
  });

  it("changes GMs, with a reason for every departure and a source for every hire", () => {
    const moves = ten.out.flatMap((o) => o.gmMoves);
    const hires = moves.filter((m) => m.kind === "HIRED");
    expect(hires.length).toBeGreaterThan(10);
    expect(hires.length).toBeLessThan(100);
    for (const m of moves) expect(m.kind === "HIRED" ? m.source : m.reason).toBeDefined();
    expect(hires.length).toBe(moves.filter((m) => m.kind === "DEPARTED").length);
    const sources = new Set(hires.map((m) => m.source));
    expect(sources.has("FRONT_OFFICE")).toBe(true);
  });

  it("never seats a front-office man as a coach, nor a coach as a ladder man", () => {
    for (const s of ten.world.staff) {
      if (seatOf(s)) expect(["SCOUTING_DIRECTOR", "CAP_MANAGER", "GM", "PRESIDENT"]).not.toContain(s.role);
      if (ladderJob(s)) expect(s.teamId).toBeUndefined();
    }
  });

  it("emits a STAFF_HIRED event for every new GM", () => {
    for (const o of ten.out) {
      const hired = o.events.filter((e) => e.event.type === "STAFF_HIRED" && e.event.payload.role === "GM").length;
      expect(hired).toBe(o.gmMoves.filter((m) => m.kind === "HIRED").length);
    }
  });
});

describe("the user's GM (ADR-094 Q10 a)", () => {
  const user = built.world.teams[0]!.id;
  const userGmMoves = (moves: GmMove[]) => moves.filter((m) => m.team === user);

  it("is never fired by the president", () => {
    const r = run(10, { userTeam: user });
    const left = r.out.flatMap((o) => userGmMoves(o.gmMoves)).filter((m) => m.kind === "DEPARTED");
    for (const m of left) expect(m.reason).toBe("RETIRED");
  });

  it("is fired when the user says so, and the user picks his successor", () => {
    let offered: string[] = [];
    const r = run(1, {
      userTeam: user,
      gm: {
        fire: (team) => team === user,
        choose: (_team, shortlist) => { offered = shortlist.map((c) => c.source); return shortlist[shortlist.length - 1]!.staff; },
      },
    });
    const o = r.out[0]!;
    const fired = o.decisions.find((d) => d.type === "FIRE_STAFF" && d.payload.seat === "GM" && d.payload.team === user)!;
    expect(fired.decidedBy).toBe("HUMAN");
    expect(fired.authority).toBe("GM");
    const hired = o.decisions.find((d) => d.type === "HIRE_STAFF" && d.payload.seat === "GM" && d.payload.team === user)!;
    expect(hired.decidedBy).toBe("HUMAN");
    expect(offered).toContain("FRONT_OFFICE");
    expect(r.world.staff.find((s) => s.role === "GM" && s.teamId === user)!.id).toBe(hired.payload.staff);
  });
});

describe("who may be offered a GM job", () => {
  const played = 2030;
  const man = (over: Partial<StaffState>): StaffState => ({
    id: "X" as StaffState["id"], displayName: "X", role: "GM", age: 50, attributes: {}, lineage: [], personalityType: "quiet", career: [], ...over,
  });
  const job = (role: StaffState["role"], last?: number) => ({
    level: "NFL" as const, role, team: "T01" as TeamId, employer: "T", firstSeason: 2020, seasons: [],
    ...(last !== undefined ? { lastSeason: last, ended: "FIRED" as const } : {}),
  });

  it("names a ladder man, a recently fired GM and a recently fired head coach, and no one else", () => {
    expect(gmCandidate(man({ role: "SCOUTING_DIRECTOR", career: [job("SCOUTING_DIRECTOR")] }), played)).toBe("FRONT_OFFICE");
    expect(gmCandidate(man({ career: [job("GM", 2029)] }), played)).toBe("RETREAD");
    expect(gmCandidate(man({ career: [job("GM", 2020)] }), played)).toBeUndefined();
    expect(gmCandidate(man({ role: "HEAD_COACH", career: [job("HEAD_COACH", 2029)] }), played)).toBe("COACH");
    expect(gmCandidate(man({ role: "OC", career: [job("OC")] }), played)).toBeUndefined();
    expect(gmCandidate(man({ role: "GM", teamId: "T01" as TeamId, career: [job("GM")] }), played)).toBeUndefined();
    expect(gmSourceOf(man({ career: [job("HEAD_COACH", 2025), job("GM", 2029)] }))).toBe("RETREAD");
  });

  it("draws the counted mix, falling back to the kinds a team has", () => {
    const n = 4000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const s = drawGmSource(createRng("mix", String(i)), new Set(["FRONT_OFFICE", "RETREAD", "COACH"] as const));
      counts[s] = (counts[s] ?? 0) + 1;
    }
    expect(counts.FRONT_OFFICE! / n).toBeCloseTo(28 / 36, 1);
    expect(counts.RETREAD! / n).toBeCloseTo(5 / 36, 1);
    for (let i = 0; i < 50; i++) expect(["FRONT_OFFICE", "OUTSIDE"]).toContain(drawGmSource(createRng("fo", String(i)), new Set(["FRONT_OFFICE"] as const)));
  });
});

describe("the GM's half of the head coach call (ADR-094 Q8 a)", () => {
  it("moves the head coach hires against a league with no GMs, and the new head coach's view of the GM starts warm", () => {
    const r = run(3, { relationships: { views: [] } });
    const hcHires = (out: StaffOffseasonResult[]) => out.flatMap((o) => o.moves).filter((m: StaffMove) => m.seat === "HEAD_COACH" && m.kind === "HIRED");
    expect(hcHires(r.out).length).toBeGreaterThan(0);
    const gmIds = new Set(r.world.staff.filter((s) => s.role === "GM").map((s) => String(s.id)));
    const changed = r.out.flatMap((o) => o.events).flatMap((e) => (e.event.type === "RELATIONSHIP_CHANGED" ? [e.event.payload] : []))
      .filter((p) => "staff" in p.of && gmIds.has(String(p.of.staff)) && p.cause === "HIRED");
    expect(changed.length).toBeGreaterThan(0);
  });

  it("keeps the GM's interview dice apart from the president's", () => {
    const w = ten.world;
    const team = w.teams[0]!;
    const evaluator = { staff: w.staff.find((s) => s.role === "GM" && s.teamId === team.id)!, team };
    const candidate = w.staff.find((s) => seatOf(s) === "OC")!;
    const base = { candidate, seat: "HEAD_COACH" as const, evaluator, played: 2030, teamCount: 32, players: new Map(), seed: SEED };
    expect(candidateReport({ ...base, diceKey: "gm" }).read).not.toEqual(candidateReport(base).read);
    expect(candidateReport({ ...base, diceKey: "gm" })).toEqual(candidateReport({ ...base, diceKey: "gm" }));
  });
});
