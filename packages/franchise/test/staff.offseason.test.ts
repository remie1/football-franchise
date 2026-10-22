import { describe, it, expect } from "vitest";
import type { GameResolver } from "../src/index.js";
import {
  buildLeague, buildStaff, runStaffOffseason, standInSeason, summariseSeason, runSeason,
  headCoachFireChance, coordinatorFireChance, retireChance, seatOf, currentJob, isRetired, inTree,
  SEATS, type StaffWorld, type TeamSeasonSummary,
} from "../src/index.js";

const league = buildLeague("staff-2");
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });

function season(world: StaffWorld, standIn = built.standIn) {
  return standInSeason(league, world, standIn, "staff-2");
}

/** Every seat filled once, team.staff and teamId agree, every seated coach has one live contract. */
function assertConsistent(w: StaffWorld) {
  const ids = new Set<string>();
  for (const s of w.staff) {
    expect(ids.has(String(s.id))).toBe(false);
    ids.add(String(s.id));
  }
  for (const team of w.teams) {
    for (const seat of SEATS) {
      const holders = w.staff.filter((s) => seatOf(s) === seat && s.teamId === team.id);
      expect(holders, `${String(team.id)} ${seat}`).toHaveLength(1);
      const live = w.contracts.filter((c) => c.staff === holders[0]!.id && c.team === team.id
        && c.terminated === undefined && c.firstSeason <= w.season && c.lastSeason >= w.season);
      expect(live, `${String(team.id)} ${seat} contract`).toHaveLength(1);
    }
    expect(team.staff).toHaveLength(5);
  }
  for (const s of w.staff) {
    if (isRetired(s)) expect(s.teamId).toBeUndefined();
    const seat = seatOf(s);
    if (seat) expect(s.teamId).toBe(currentJob(s)!.team);
  }
}

describe("runStaffOffseason (ADR-080 C2-C4)", () => {
  const played = season(built.world);
  const result = runStaffOffseason({ world: built.world, results: played.summaries, seed: "staff-2" });

  it("moves the world to the next season and keeps every seat filled and contracted", () => {
    expect(result.world.season).toBe(built.world.season + 1);
    assertConsistent(result.world);
  });

  it("does not touch its input, and gives the same answer twice", () => {
    const again = runStaffOffseason({ world: built.world, results: played.summaries, seed: "staff-2" });
    expect(again).toEqual(result);
    expect(built.world.season).toBe(2026);
    expect(built.world.staff.every((s) => s.career.every((j) => j.seasons.every((l) => l.season < 2026)))).toBe(true);
  });

  it("writes the season on every résumé: record, unit rank for coordinators, playoffs", () => {
    const rows = new Map(played.summaries.map((r) => [String(r.team), r]));
    for (const before of built.world.staff) {
      const seat = seatOf(before);
      if (!seat) continue;
      const after = result.world.staff.find((s) => s.id === before.id)!;
      const job = after.career.find((j) => j.team === before.teamId && j.role === seat && j.firstSeason === currentJob(before)!.firstSeason)!;
      const line = job.seasons[job.seasons.length - 1]!;
      const r = rows.get(String(before.teamId))!;
      expect(line.season).toBe(2026);
      expect(line.record).toEqual(r.record);
      expect(line.rosterRank).toBe(r.rosterRank);
      if (seat === "OC") expect(line.unitRank).toBe(r.offenseRank);
      if (seat === "DC") expect(line.unitRank).toBe(r.defenseRank);
      if (seat === "HEAD_COACH" || seat === "STC") expect(line.unitRank).toBeUndefined();
      expect(line.playoffs).toEqual(r.playoffs);
    }
  });

  it("tags every decision with its authority: the president for head coaches, the coach for coordinators", () => {
    expect(result.decisions.length).toBeGreaterThan(0);
    for (const d of result.decisions) {
      expect(d.authority).toBe(d.payload.seat === "HEAD_COACH" ? "PRESIDENT" : "COACH");
      expect(d.decidedBy).toBe("NPC");
      expect(d.at.phase).toBe("OFF_EVAL");
    }
  });

  it("emits one event per move, in order, with the typed reasons", () => {
    expect(result.events.map((e) => e.seq)).toEqual(result.events.map((_, i) => i));
    const departed = result.events.filter((e) => e.event.type === "STAFF_DEPARTED");
    const hired = result.events.filter((e) => e.event.type === "STAFF_HIRED");
    expect(departed).toHaveLength(result.moves.filter((m) => m.kind === "DEPARTED").length);
    expect(hired).toHaveLength(result.moves.filter((m) => m.kind === "HIRED").length);
    for (const e of departed) {
      if (e.event.type !== "STAFF_DEPARTED") continue;
      expect(["FIRED", "HIRED_AWAY", "RETIRED", "CONTRACT_EXPIRED"]).toContain(e.event.payload.reason);
    }
  });

  it("keeps a fired coach's salary on the books and stops it for a coach hired away or retired", () => {
    let checked = 0;
    let w = built.world;
    let st = built.standIn;
    for (let y = 0; y < 6; y++) {
      const p = season(w, st);
      st = p.state;
      const r = runStaffOffseason({ world: w, results: p.summaries, seed: "staff-2" });
      for (const c of r.world.contracts) {
        if (!c.terminated || c.lastSeason < r.world.season) continue;
        const team = r.world.teams.find((t) => t.id === c.team)!;
        const counted = r.world.contracts
          .filter((x) => x.team === team.id && x.firstSeason <= r.world.season && x.lastSeason >= r.world.season
            && (x.terminated === undefined || x.terminated.reason === "FIRED"))
          .reduce((sum, x) => sum + x.salary, 0);
        expect(team.staffBudget.committed).toBe(counted);
        checked++;
      }
      assertConsistent(r.world);
      w = r.world;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("adds the head coach to a new coordinator's tree", () => {
    const hires = result.moves.filter((m) => m.kind === "HIRED" && m.seat !== "HEAD_COACH");
    expect(hires.length).toBeGreaterThan(0);
    for (const m of hires) {
      const team = result.world.teams.find((t) => t.id === m.team)!;
      const hc = result.world.staff.find((s) => seatOf(s) === "HEAD_COACH" && s.teamId === team.id)!;
      const c = result.world.staff.find((s) => s.id === m.staff)!;
      expect(c.lineage).toContain(hc.id);
      expect(inTree(c, hc)).toBe(true);
    }
  });

  it("lets a human pick his own coordinator from the shortlist (ADR-080 §7.6)", () => {
    const seen: string[] = [];
    const human = runStaffOffseason({
      world: built.world, results: played.summaries, seed: "staff-2",
      choose: (team, seat, shortlist) => {
        seen.push(`${String(team)}/${seat}`);
        expect(shortlist.length).toBeGreaterThan(1);
        // Pick the computer's least favourite, to see the pick stick.
        return [...shortlist].sort((a, b) => a.judgement - b.judgement)[0]!.staff;
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    const humanHires = human.decisions.filter((d) => d.decidedBy === "HUMAN");
    expect(humanHires).toHaveLength(seen.length);
    for (const d of humanHires) expect(d.type).toBe("HIRE_STAFF");
    expect(human.world).not.toEqual(result.world);
  });

  it("runs on a real season's summary (the season shell's results)", () => {
    const resolve: GameResolver = (game, seed) => {
      const h = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
      const home = 10 + (h % 25), away = 10 + ((h >>> 8) % 25);
      return { gameId: game.gameId, home: game.home, away: game.away, homeScore: home, awayScore: home === away ? away + 3 : away, reason: "REGULATION", seed };
    };
    const run = runSeason({ league: { ...league, teams: built.world.teams }, season: 2026, seed: "staff-2", resolve });
    const rows = summariseSeason(run.state);
    expect(rows).toHaveLength(32);
    expect(new Set(rows.map((r) => r.offenseRank)).size).toBe(32);
    expect(new Set(rows.map((r) => r.defenseRank)).size).toBe(32);
    expect(rows.filter((r) => r.playoffs)).toHaveLength(14);
    expect(rows.filter((r) => r.playoffs?.champion)).toHaveLength(1);
    expect(rows.every((r) => r.rosterRank === undefined)).toBe(true);
    const champ = rows.find((r) => r.playoffs?.champion)!;
    expect(champ.playoffs!.wins).toBeGreaterThanOrEqual(3);
    const r = runStaffOffseason({ world: built.world, results: rows, seed: "staff-2" });
    assertConsistent(r.world);
    // A champion's head coach is never fired.
    expect(r.moves.some((m) => m.team === champ.team && m.seat === "HEAD_COACH" && m.reason === "FIRED")).toBe(false);
  });

  it("refuses results for the wrong season or a missing team", () => {
    const wrong: TeamSeasonSummary[] = played.summaries.map((r) => ({ ...r, season: 2030 }));
    expect(() => runStaffOffseason({ world: built.world, results: wrong, seed: "s" })).toThrow(/season 2030/);
    expect(() => runStaffOffseason({ world: built.world, results: played.summaries.slice(1), seed: "s" })).toThrow(/no result/);
  });
});

describe("the firing and retirement rules (ADR-080 §6)", () => {
  const base = { perf: 0, credit: 0, seasonsInJob: 4, politics: 50 };

  it("never fires a champion", () => {
    expect(headCoachFireChance({ ...base, perf: -0.4, playoffs: { wins: 4, champion: true } })).toBe(0);
  });

  it("fires more for a worse season and a worse trend, less with credit, playoffs and politics", () => {
    const p = headCoachFireChance(base);
    expect(headCoachFireChance({ ...base, perf: -0.2 })).toBeGreaterThan(p);
    expect(headCoachFireChance({ ...base, prevPerf: -0.2 })).toBeGreaterThan(p);
    expect(headCoachFireChance({ ...base, credit: 0.2 })).toBeLessThan(p);
    expect(headCoachFireChance({ ...base, playoffs: { wins: 0, champion: false } })).toBeLessThan(p);
    expect(headCoachFireChance({ ...base, playoffs: { wins: 2, champion: false } }))
      .toBeLessThan(headCoachFireChance({ ...base, playoffs: { wins: 0, champion: false } }));
    expect(headCoachFireChance({ ...base, politics: 80 })).toBeLessThan(p);
    expect(headCoachFireChance({ ...base, politics: 20 })).toBeGreaterThan(p);
  });

  it("gives a new head coach a honeymoon, strongest in year one", () => {
    const y1 = headCoachFireChance({ ...base, perf: -0.2, seasonsInJob: 1 });
    const y2 = headCoachFireChance({ ...base, perf: -0.2, seasonsInJob: 2 });
    const y4 = headCoachFireChance({ ...base, perf: -0.2, seasonsInJob: 4 });
    expect(y1).toBeLessThan(y2);
    expect(y2).toBeLessThan(y4);
  });

  it("fires coordinators of bad units more, scapegoats under a shaky head coach, spares a first-year man", () => {
    const c = { seat: "OC" as const, unitPct: 0.5, seasonsInJob: 3, politics: 50, scapegoat: false };
    const p = coordinatorFireChance(c);
    expect(coordinatorFireChance({ ...c, unitPct: 1 })).toBeGreaterThan(p);
    expect(coordinatorFireChance({ ...c, unitPct: 0 })).toBeLessThan(p);
    expect(coordinatorFireChance({ ...c, scapegoat: true })).toBeGreaterThan(p);
    expect(coordinatorFireChance({ ...c, seasonsInJob: 1 })).toBeLessThan(p);
  });

  it("retires the old far more than the young", () => {
    expect(retireChance(40)).toBeLessThan(0.01);
    expect(retireChance(67)).toBeGreaterThan(0.1);
    expect(retireChance(76)).toBeGreaterThan(retireChance(71));
  });
});
