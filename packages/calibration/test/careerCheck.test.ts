/**
 * The 20-season check's reader (ADR-087 D5b): its pure pieces on made-up people and events (the age
 * offset, the week-8 picture, the career ledger, the unsigned waits, the minimum deals by step, the
 * limbo, snap shares, Kaplan-Meier, peak usage), the reader driven by made-up days and seasons, and
 * `runCareerCheck` on made-up seasons (the draft check's rows beside its own, the same rows twice).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, positionOverall,
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type PlayerState, type Position, type Team,
} from "@ff/contracts";
import type { runSeason, SeasonRun } from "@ff/franchise";
import {
  addGame, addUsage, CAREER_GROUP, CAREER_GROUPS, careerLedger, careerReader, kaplanMeier, lifeTable, minimumSignings, MOVING_RATING_GROUPS,
  pearson, RATING_GROUP_COPY, RATING_GROUP_DIGEST, reserveLoss, rosterPicture, runCareerCheck, seasonAge, snapShares, teamStarters, unsignedWaits,
  usagePeak, waitClass, type SideSnaps, type UsageCell,
} from "../src/season/careerCheck.js";
import type { CapCheckInput } from "../src/season/capCheck.js";
import { runDraftCheck } from "../src/season/draftCheck.js";
import { fieldedStarters } from "../src/season/playerChecks.js";
import type { SeasonPeople } from "../src/season/realSeason.js";
import { readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];

const hook = vi.hoisted(() => ({ runSeason: undefined as undefined | ((input: never) => unknown) }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    runSeason: (input: Parameters<typeof real.runSeason>[0]) =>
      hook.runSeason === undefined ? real.runSeason(input) : (hook.runSeason as (i: typeof input) => SeasonRun)(input),
  };
});

// --- made-up people ------------------------------------------------------------------------------

const RATINGS = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((a) => a.status === "active").map((a) => String(a.id));
/** Every active rating at `v`, so his overall at any position is `v`. */
const values = (v: number) => Object.fromEntries(RATINGS.map((id) => [id, v]));

function man(id: string, o: {
  position?: Position; age?: number; cs?: number; draft?: PlayerState["bio"]["draft"]; team?: string; rating?: number;
} = {}): PlayerState {
  return {
    bio: {
      id, displayName: id, position: o.position ?? "WR", age: o.age ?? 25, heightIn: 72, weightLb: 200,
      draft: o.draft ?? "UDFA", ...(o.cs === undefined ? {} : { creditedSeasons: o.cs }),
    },
    attributes: { kind: "true", values: values(o.rating ?? 60), traits: new Set() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "STEADY" },
    ...(o.team === undefined ? {} : { teamId: o.team }),
  } as unknown as PlayerState;
}

/** The 26 men a team fields (11 on offense; base and nickel defense; kicker, punter, snapper). */
const STARTER_SLOTS: Position[] = [
  "QB", "RB", "WR", "WR", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "DE", "DE", "DT", "DT", "OLB", "OLB", "MLB", "CB", "CB", "CB", "FS", "SS", "K", "P", "LS",
];

/** A team whose starters all rate `starter`, with two backups (a quarterback and a corner) at `backup`. */
function squad(team: string, starter: number, backup: number, age: (i: number) => number = () => 26): { team: Team; players: PlayerState[] } {
  const players = STARTER_SLOTS.map((position, i) => man(`${team}-s${i}`, { position, team, rating: starter, age: age(i), cs: 3, draft: { year: 2020, round: 3, pick: 80 } }));
  players.push(man(`${team}-b0`, { position: "QB", team, rating: backup, age: 22, cs: 0, draft: "UDFA" }));
  players.push(man(`${team}-b1`, { position: "CB", team, rating: backup, age: 34, cs: 11, draft: "UDFA" }));
  const depthChart: Partial<Record<Position, string[]>> = {};
  for (const p of players) (depthChart[p.bio.position] ??= []).push(String(p.bio.id));
  return {
    team: { id: team, displayName: team, city: team, roster: players.map((p) => p.bio.id), staff: [], depthChart } as unknown as Team,
    players,
  };
}

const stamp = (season: number, phase: CalendarStamp["phase"], week: number, day: number): CalendarStamp => ({ season, phase, week, day });
const retired = (player: string, timing: "LATE" | "SEASON_END"): FranchiseEvent => ({ type: "PLAYER_RETIRED", payload: { player, timing, reason: "UNSIGNED" } } as FranchiseEvent);
const signed = (player: string, kind: string): FranchiseEvent => ({ type: "CONTRACT_SIGNED", payload: { player, team: "T01", kind, years: 1 } } as FranchiseEvent);

// --- the pure pieces -----------------------------------------------------------------------------

describe("the 20-season check's pure pieces", () => {
  it("the age offset: an age read after the year turn is next season's", () => {
    expect(seasonAge(27, false)).toBe(27);
    expect(seasonAge(28, true)).toBe(27);
  });

  it("every position has a group, and the rating groups' copy matches its pinned digest", () => {
    for (const p of Object.keys(CAREER_GROUP) as Position[]) expect(CAREER_GROUPS).toContain(CAREER_GROUP[p]);
    expect(CAREER_GROUP.FB).toBe("RB");
    expect(CAREER_GROUP.OLB).toBe("EDGE");
    expect(CAREER_GROUP.ILB).toBe("LB");
    expect(CAREER_GROUP.NT).toBe("IDL");
    expect(createHash("sha256").update(JSON.stringify(RATING_GROUP_COPY)).digest("hex")).toBe(RATING_GROUP_DIGEST);
    expect(Object.keys(RATING_GROUP_COPY)).toEqual(["BODY", "BODY_PRACTICE", "OWN_CURVE", "SKILL", "SMARTS", "FIXED"]);
  });

  it("Pearson's r", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
    expect(pearson([1], [1])).toBeNull();
  });

  it("the week-8 picture of the 53s: overall, groups, the starter-backup gap, team strength, ages, rookies and undrafted men", () => {
    const a = squad("T01", 70, 60, (i) => (i < 13 ? 24 : 30));
    const b = squad("T02", 66, 60);
    const outsider = man("x", { team: "T02", rating: 99, age: 40 }); // a practice-squad or reserve man: not on a 53
    const pic = rosterPicture({ teams: [a.team, b.team], players: [...a.players, ...b.players, outsider] });
    expect(pic.players).toBe(56);
    expect(positionOverall("QB", values(70))).toBeCloseTo(70, 9);
    expect(pic.gap.starters).toBe(52);
    expect(pic.gap.backups).toBe(4);
    expect(pic.gap.starterMean).toBeCloseTo(68, 9);
    expect(pic.gap.backupMean).toBeCloseTo(60, 9);
    expect(pic.gap.gap).toBeCloseTo(8, 9);
    expect(pic.teamStrength.mean).toBeCloseTo(68, 9);
    expect(pic.teamStrength.sd).toBeCloseTo(2, 9);
    expect(pic.overall.mean).toBeCloseTo((26 * 70 + 26 * 66 + 4 * 60) / 56, 9);
    expect(pic.overall.max).toBeCloseTo(70, 9);
    // Quarterbacks: two starters (70, 66) and two backups at 60.
    expect(pic.groups.QB.n).toBe(4);
    expect(pic.groups.QB.mean).toBeCloseTo(64, 9);
    expect(pic.groups.QB.top5).toBeCloseTo(64, 9);
    expect(pic.groups.CB.n).toBe(8);
    expect(pic.groups.K.n).toBe(2);
    // Pooled within-group sd by hand.
    let ss = 0, groups = 0;
    for (const g of CAREER_GROUPS) {
      const xs = [...a.players, ...b.players].filter((p) => CAREER_GROUP[p.bio.position] === g).map((p) => positionOverall(p.bio.position, p.attributes.values));
      if (xs.length === 0) continue;
      groups++;
      const m = xs.reduce((s, x) => s + x, 0) / xs.length;
      ss += xs.reduce((s, x) => s + (x - m) ** 2, 0);
    }
    expect(pic.overall.pooledSd).toBeCloseTo(Math.sqrt(ss / (56 - groups)), 9);
    // Ages: T01's first 13 starters are 24, the rest 30; T02's are 26; every team has a 22- and a 34-year-old backup.
    expect(pic.age.upTo22).toBeCloseTo(2 / 56, 12);
    expect(pic.age.from31).toBeCloseTo(2 / 56, 12);
    expect(pic.age.from34).toBeCloseTo(2 / 56, 12);
    expect(pic.age.mean).toBeCloseTo((13 * 24 + 13 * 30 + 26 * 26 + 2 * 22 + 2 * 34) / 56, 9);
    expect(pic.age.histogram).toEqual({ "22": 2, "24": 13, "26": 26, "30": 13, "34": 2 });
    expect(pic.rookieShare).toBeCloseTo(2 / 56, 12);
    expect(pic.undraftedShare).toBeCloseTo(4 / 56, 12);
    // Ratings: every moving rating the registry has, of every man on the 53s; none at 95.
    const moving = MOVING_RATING_GROUPS.flatMap((g) => RATING_GROUP_COPY[g]!).filter((id) => RATINGS.includes(id));
    expect(pic.ratings).toEqual({ total: 56 * moving.length, at95: 0, at99: 0 });
    expect(pic.ratingGroups.BODY).toBeCloseTo(pic.overall.mean, 9);
  });

  it("a team a man short at a position (out, so off the chart) is read with him put back; one that cannot field a side counts no starter", () => {
    const whole = squad("T01", 70, 60);
    const byId = new Map(whole.players.map((p) => [String(p.bio.id), p]));
    expect(teamStarters(whole.team, byId)).toEqual({ ids: fieldedStarters([whole.team]), padded: false, short: false });
    // The right tackle is out: the chart leaves him off, and no other lineman is listed to cover.
    const rt = String(whole.team.depthChart.RT![0]);
    const shortChart = { ...whole.team, depthChart: { ...whole.team.depthChart, RT: [] } } as Team;
    expect(() => fieldedStarters([shortChart])).toThrow();
    const padded = teamStarters(shortChart, byId);
    expect(padded.padded).toBe(true);
    expect(padded.short).toBe(false);
    expect(padded.ids.has(rt)).toBe(true);
    // No tackles or guards on the roster at all: nobody to put back.
    const noLine = { ...shortChart, roster: shortChart.roster.filter((id) => !["LT", "RT", "LG", "RG", "C"].includes(byId.get(String(id))!.bio.position)) } as Team;
    const noLineChart = { ...noLine, depthChart: { ...noLine.depthChart, LT: [], LG: [], C: [], RG: [] } } as Team;
    expect(teamStarters(noLineChart, byId)).toEqual({ ids: new Set(), padded: true, short: true });
    const pic = rosterPicture({ teams: [shortChart, squad("T02", 66, 60).team, noLineChart], players: [...whole.players, ...squad("T02", 66, 60).players] });
    expect(pic.gap.paddedTeams).toBe(1);
    expect(pic.gap.shortTeams).toBe(1);
    // The short team is left out of the teams' strength: T01 (70) and T02 (66) alone.
    expect(pic.teamStrength.sd).toBeCloseTo(2, 9);
  });

  it("ratings at 95 and at 99 count the moving ratings only", () => {
    const s = squad("T01", 60, 60);
    const star = s.players[0]!;
    star.attributes.values = { ...star.attributes.values, speed: 99, accuracy: 96, volatility: 99 };
    const pic = rosterPicture({ teams: [s.team], players: s.players });
    expect(pic.ratings.at95).toBe(2);
    expect(pic.ratings.at99).toBe(1);
  });

  it("the unsigned wait: under a league year, one to two, two or more", () => {
    expect(waitClass(0, 364)).toBe("under1");
    expect(waitClass(363, 364)).toBe("under1");
    expect(waitClass(364, 364)).toBe("1to2");
    expect(waitClass(727, 364)).toBe("1to2");
    expect(waitClass(728, 364)).toBe("2plus");
    expect(waitClass(undefined, 364)).toBe("unknown");
    expect(waitClass(10, 0)).toBe("unknown");
    const remembered = stamp(2026, "OFF_RESET_FA", 1, 1);
    const lost = stamp(2020, "OFF_RESET_FA", 1, 1);
    const people = {
      players: [man("a"), man("b"), man("c", { draft: "PROSPECT" }), man("e")],
      freeAgents: ["a", "b", "c", "d", "e", "a"],
      playerMemory: { injuries: {}, grades: {}, battles: [], injuredStarters: [], weeksInJob: {}, unsignedSince: { a: remembered, e: lost } },
    } as unknown as SeasonPeople;
    const days = new Map([[JSON.stringify(remembered), 10]]);
    const waits = unsignedWaits(people, 400, (s) => days.get(JSON.stringify(s)));
    // a waited 390 days; b is new today; the prospect and the man not in the league are left out; e's date was never seen.
    expect([...waits]).toEqual([["a", 390], ["b", 0], ["e", undefined]]);
  });

  it("minimum deals by the step that signed them: emergency, the league year's bargains, the year turn's", () => {
    const envelopes: FranchiseEventEnvelope[] = [
      signed("p1", "MINIMUM"), signed("p2", "MINIMUM"), signed("p3", "MINIMUM"), signed("p4", "MINIMUM"), signed("p5", "ROOKIE"), retired("p6", "LATE"),
    ].map((event, seq) => ({ seq, at: stamp(2026, "REGULAR_SEASON", 3, 7), event }));
    const run = {
      events: envelopes,
      stepEvents: [
        { step: "players:week", envelope: envelopes[0]! }, { step: "players:week", envelope: envelopes[1]! },
        { step: "free-agency", envelope: envelopes[2]! }, { step: "draft-day", envelope: envelopes[4]! }, { step: "players:unsigned", envelope: envelopes[5]! },
      ],
    };
    expect(minimumSignings(run)).toEqual({ emergency: 2, bargain: 1, yearTurn: 1, byStep: { "players:week": 2, "free-agency": 1, turn: 1, "draft-day": 1 } });
    expect(minimumSignings({ events: envelopes })).toEqual({ emergency: 0, bargain: 0, yearTurn: 4, byStep: { turn: 5 } });
  });

  it("the limbo count, and what each team lost to it", () => {
    const before = { players: [man("a", { team: "T01" }), man("b", { team: "T02" }), man("c", { team: "T02" }), man("d"), man("e", { team: "T01" }), man("f", { team: "T01" })] };
    const after = {
      players: [man("a"), man("b"), man("c"), man("d"), man("e", { team: "T01" }), man("f"), man("g", { draft: "PROSPECT" }), man("h")],
      freeAgents: ["f"],
    };
    const teams = [{ id: "T01" }, { id: "T02" }, { id: "T03" }] as unknown as Team[];
    // a (T01), b and c (T02) lost; d had no team; h is new and teamless (elsewhere); f is a free agent; g a prospect.
    expect(reserveLoss(before as SeasonPeople, after as unknown as SeasonPeople, teams)).toEqual({ limbo: 5, byTeam: [1, 2, 0], elsewhere: 2 });
  });

  it("snap share by side: his side, his team, the busiest man on that side in each of his team's games", () => {
    const snaps = new Map<string, Map<string, SideSnaps>>();
    const busiest = new Map<string, SideSnaps>();
    const r = (player: string, team: string, offense: number, defense: number) => ({ player, team, snaps: { offense, defense, special: 3 } }) as never;
    // Game 1: T01 at T02. Game 2: T01 at T03 (b sat it out, c had moved to T03).
    addGame({ home: "T02", away: "T01" } as never, [r("a", "T01", 60, 0), r("q", "T01", 65, 0), r("b", "T01", 0, 30), r("z", "T01", 0, 70), r("c", "T02", 40, 0), r("d", "T02", 5, 20), r("y", "T02", 0, 0)], snaps, busiest);
    addGame({ home: "T03", away: "T01" } as never, [r("a", "T01", 50, 0), r("z", "T01", 0, 60), r("c", "T03", 50, 0)], snaps, busiest);
    expect(busiest.get("T01")).toEqual({ offense: 115, defense: 130 });
    expect(busiest.get("T02")).toEqual({ offense: 40, defense: 20 });
    expect(busiest.get("T03")).toEqual({ offense: 50, defense: 0 });
    expect(snaps.has("y")).toBe(false);
    const shares = snapShares(snaps, busiest);
    expect(shares.get("a")).toEqual({ team: "T01", side: "offense", share: 110 / 115 });
    expect(shares.get("b")).toEqual({ team: "T01", side: "defense", share: 30 / 130 });
    // c: 40 with T02, 50 with T03: T03 is his team, its game his only one there.
    expect(shares.get("c")).toEqual({ team: "T03", side: "offense", share: 1 });
    expect(shares.get("d")).toEqual({ team: "T02", side: "defense", share: 1 });
    expect(shares.has("y")).toBe(false);
  });

  it("usage cells: a change counts at his age in the first season, and a leaver counts at 0 in the exit variant", () => {
    const cells: Record<string, Record<string, UsageCell>> = {};
    addUsage(cells, new Map([["a", { share: 0.5, group: "RB", age: 24 }], ["b", { share: 0.3, group: "RB", age: 24 }], ["c", { share: 0.9, group: "QB", age: 31 }]]),
      new Map([["a", { share: 0.7 }], ["c", { share: 0.8 }], ["n", { share: 0.4 }]]));
    expect(cells.RB!["24"]!.n).toBe(1);
    expect(cells.RB!["24"]!.sum).toBeCloseTo(0.2, 12);
    expect(cells.RB!["24"]!.nExit).toBe(2);
    expect(cells.RB!["24"]!.sumExit).toBeCloseTo(-0.1, 12);
    expect(cells.QB!["31"]!.sum).toBeCloseTo(-0.1, 12);
  });

  it("peak usage age: the first age the 3-age smoothed mean change is 0 or less after rising, both variants", () => {
    const cell = (mean: number, exitMean: number, n = 10): UsageCell => ({ n, sum: mean * n, nExit: n, sumExit: exitMean * n });
    const cells: Record<string, UsageCell> = {
      "21": cell(-0.05, -0.2), "22": cell(0.1, 0.0), "23": cell(0.08, -0.01), "24": cell(0.02, -0.05),
      "25": cell(-0.02, -0.08), "26": cell(-0.05, -0.1), "28": cell(-0.1, -0.2),
    };
    const plain = usagePeak(cells);
    expect(plain.smoothed["21"]).toBeCloseTo((-0.05 + 0.1) / 2, 12);
    expect(plain.smoothed["24"]).toBeCloseTo((0.08 + 0.02 - 0.02) / 3, 12);
    expect(plain.smoothed["25"]).toBeCloseTo((0.02 - 0.02 - 0.05) / 3, 12);
    // 26's neighbours are 25 alone (27 has nobody); 28's are none.
    expect(plain.smoothed["26"]).toBeCloseTo((-0.02 - 0.05) / 2, 12);
    expect(plain.smoothed["28"]).toBeCloseTo(-0.1, 12);
    expect(plain.peak).toBe(25);
    // Counting leavers at 0, the change never rises: no peak.
    expect(usagePeak(cells, true).peak).toBeNull();
    expect(usagePeak({ "22": cell(0.1, 0.1), "23": cell(0.1, 0.1) }).peak).toBeNull();
    expect(usagePeak({ "22": { n: 0, sum: 0, nExit: 0, sumExit: 0 } }).means).toEqual({});
  });

  it("Kaplan-Meier on careers in whole seasons: expected career to 15, reaching 5 and 10", () => {
    const entrants = [{ n: 1, c: 0 }, { n: 1, c: 0 }, { n: 2, c: 1 }, { n: 3, c: 0 }, { n: 5, c: 0 }] as const;
    const table = lifeTable(entrants);
    expect(table).toEqual({ exits: [0, 2, 0, 1, 0, 1], censored: [0, 0, 1, 0, 0, 0] });
    const km = kaplanMeier(table);
    expect(km.n).toBe(5);
    expect(km.exits).toBe(4);
    expect(km.survival.slice(0, 7)).toEqual([1, 0.6, 0.6, 0.3, 0.3, 0, 0]);
    expect(km.expected).toBeCloseTo(2.8, 12);
    expect(km.reach5).toBeCloseTo(0.3, 12);
    expect(km.reach10).toBe(0);
    // Everyone still going at 3: the curve stays at 1 past them.
    const going = kaplanMeier(lifeTable([{ n: 3, c: 1 }, { n: 3, c: 1 }]));
    expect(going.expected).toBe(15);
    expect(going.reach10).toBe(1);
    expect(kaplanMeier(lifeTable([]))).toEqual({ n: 0, exits: 0, survival: [], expected: null, reach5: null, reach10: null });
  });

  it("the career ledger: entry route and group, a rewritten position, exits, censoring, comebacks", () => {
    const ledger = careerLedger();
    const f1 = man("F1", { cs: 3, team: "T01" }), f0 = man("F0", { cs: 0, team: "T01" }), f2 = man("F2", { cs: 5, team: "T02" });
    ledger.start([f1, f0, f2]);
    ledger.start([man("late")]); // only the first call counts
    ledger.present(2026, [f1, f0, f2]);
    // 2026: F1 and F2 credited; the draft brings D1 (round 2, a corner) and U1 (undrafted); a prospect nobody took.
    const d1 = man("D1", { cs: 0, position: "CB", draft: { year: 2027, round: 2, pick: 50 }, team: "T01" });
    const u1 = man("U1", { cs: 0, position: "WR", draft: "UDFA", team: "T02" });
    const after26 = [man("F1", { cs: 4 }), man("F0", { cs: 0, team: "T01" }), man("F2", { cs: 6 }), d1, u1, man("P", { draft: "PROSPECT" })];
    const s26 = ledger.season(2026, [f1, f0, f2], after26, [{ type: "DRAFT_PICK_MADE", payload: { team: "T01", player: "D1", round: 2, pick: 50 } } as FranchiseEvent]);
    expect(s26).toEqual({ credited: ["F1", "F2"], relabeled: [] });
    expect(ledger.route("D1")).toBe("DRAFT");
    expect(ledger.route("U1")).toBe("UDFA");
    expect(ledger.route("P")).toBeUndefined();
    expect(ledger.draftOf("D1")).toEqual({ year: 2027, round: 2 });
    expect(ledger.draftOf("F1")).toBeUndefined();
    // 2027: an emergency call-up makes D1 a kicker; D1 and U1 credited; F1 retires unsigned at camp; F2 sits out.
    ledger.present(2027, [man("D1", { team: "T01" }), man("U1", { team: "T02" }), man("F0", { team: "T01" }), man("F2")]);
    const after27 = [man("F0", { cs: 0, team: "T01" }), man("F2", { cs: 6 }), man("D1", { cs: 1, position: "K", team: "T01" }), man("U1", { cs: 1, position: "WR" })];
    const s27 = ledger.season(2027, after26, after27, [retired("F1", "LATE")]);
    expect(s27).toEqual({ credited: ["D1", "U1"], relabeled: ["D1"] });
    // 2028: D1 credited again and on a team in the last season; U1 retires at the season's end; F2 is back and credited.
    ledger.present(2028, [man("D1", { team: "T01" }), man("F2", { team: "T03" })]);
    const after28 = [man("F2", { cs: 7, team: "T03" }), man("D1", { cs: 2, position: "K", team: "T01" })];
    expect(ledger.season(2028, after27, after28, [retired("U1", "SEASON_END")])).toEqual({ credited: ["F2", "D1"], relabeled: [] });
    const entrants = ledger.entrants(2028);
    expect(entrants).toEqual([
      { e: 2027, g: "K", o: "CB", r: "DRAFT", n: 2, c: 1, x: 1, t: null },
      { e: 2027, g: "WR", o: "WR", r: "UDFA", n: 1, c: 0, x: 0, t: "SEASON_END" },
    ]);
    // Credited in 2026 and on no team in 2027: F1 and F2; F2 is credited again in 2028.
    expect(ledger.comebacks(2026, 2028)).toEqual([{ season: 2026, out: 2, back: 1 }]);
    expect(ledger.counts()).toEqual({ FILE: 3, DRAFT: 1, UDFA: 1, relabeled: 1, fileRookies: 1 });
  });
});

// --- the reader, driven by made-up days ----------------------------------------------------------

describe("the reader on made-up days and seasons", () => {
  /** Two teams; a draftee starting at corner for T01; free agents a (unsigned a while) and b. */
  function world() {
    const a = squad("T01", 70, 60);
    const b = squad("T02", 66, 60);
    const rookie = man("R1", { position: "CB", team: "T01", rating: 75, cs: 0, draft: { year: 2027, round: 1, pick: 5 }, age: 22 });
    return { a, b, rookie };
  }
  const people = (teams: Team[], players: PlayerState[], freeAgents: string[] = [], unsignedSince: Record<string, CalendarStamp> = {}) => ({
    teams, players, picks: [], classes: [], freeAgents,
    playerMemory: { injuries: {}, grades: {}, battles: [], injuredStarters: [], weeksInJob: {}, unsignedSince },
  }) as unknown as SeasonPeople;
  const standings = (w1: number, w2: number) => [
    { team: "T01", overall: { wins: w1, losses: 17 - w1, ties: 0 } }, { team: "T02", overall: { wins: w2, losses: 17 - w2, ties: 0 } },
  ];
  const report = (team: string, ids: readonly string[], offense: number) => ids.map((player) => ({ player, team, snaps: { offense, defense: 0, special: 0 }, contests: [] }));

  function drive() {
    const { a, b, rookie } = world();
    const reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 2, switches: { development: true, injuries: true } });
    const startTeams = [a.team, b.team];
    const start = people(startTeams, [...a.players, ...b.players, man("FA1"), man("FA2")], ["FA1", "FA2"]);
    const camp26 = stamp(2026, "TRAINING_CAMP", 1, 1);
    // 2026: camp opens (FA1 and FA2 new), week 1, a game, week 8, week 18's last day, then the season ends.
    reader.onDay(2026, camp26, start, []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 1), start, []);
    const qb1 = String(a.players[0]!.bio.id), qb2 = String(b.players[0]!.bio.id), wr1 = String(a.players[2]!.bio.id);
    const game = { game: { home: "T01", away: "T02", kind: "REGULAR" }, result: {}, extras: { participation: [...report("T01", [qb1, wr1], 60), ...report("T02", [qb2], 50)] } };
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 7), start, [game] as never);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 8, 1), start, []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 18, 7), start, []);
    // After 2026: everyone on a 53 credited; the draft brings the rookie; FA1 retired at the season's end; one emergency deal.
    const credit = (p: PlayerState) => (p.teamId === undefined ? p : { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1, age: p.bio.age + 1 } });
    const t01 = { ...a.team, roster: [...a.team.roster, rookie.bio.id], depthChart: { ...a.team.depthChart, CB: [rookie.bio.id, ...(a.team.depthChart.CB ?? [])] } };
    const end26 = people([t01, b.team], [...a.players.map(credit), ...b.players.map(credit), { ...rookie, bio: { ...rookie.bio, age: 23 } }, man("FA2", { age: 26 })], ["FA2"], { FA2: camp26 });
    const envelopes: FranchiseEventEnvelope[] = [
      { seq: 0, at: stamp(2026, "REGULAR_SEASON", 18, 7), event: retired("FA1", "SEASON_END") },
      { seq: 1, at: stamp(2026, "REGULAR_SEASON", 5, 7), event: signed("FA9", "MINIMUM") },
      { seq: 2, at: stamp(2026, "OFF_DRAFT", 3, 4), event: { type: "DRAFT_PICK_MADE", payload: { team: "T01", player: "R1", round: 1, pick: 5 } } as FranchiseEvent },
    ];
    const run26 = { state: { standings: standings(12, 5) }, events: envelopes, stepEvents: [{ step: "players:unsigned", envelope: envelopes[0]! }, { step: "players:week", envelope: envelopes[1]! }] } as unknown as SeasonRun;
    reader.onRun(2026, envelopes.map((e) => e.event), end26, { run: run26, before: start });
    // 2027: FA2 still unsigned at camp (a full league year by then); the rookie starts at corner by week 8.
    reader.onDay(2027, stamp(2027, "TRAINING_CAMP", 1, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 1, 1), end26, []);
    const game27 = { game: { home: "T02", away: "T01", kind: "REGULAR" }, result: {}, extras: { participation: [...report("T01", [qb1], 70), ...report("T02", [qb2], 70)] } };
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 1, 7), end26, [game27] as never);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 8, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 18, 7), end26, []);
    const end27 = people(end26.teams, end26.players.map((p) => credit(p)), [], {});
    const run27 = {
      state: { standings: standings(9, 8) },
      events: [{ seq: 0, at: stamp(2027, "TRAINING_CAMP", 1, 1), event: retired("FA2", "LATE") }],
      stepEvents: [],
    } as unknown as SeasonRun;
    reader.onRun(2027, [retired("FA2", "LATE")], end27, { run: run27, before: end26 });
    const draft = { drafts: 2, roundOneShare: {}, starterRate: {}, everStarter: {}, perYear: [] };
    return { rows: reader.rows(draft), draft, qb1, wr1 };
  }

  it("adds the days and seasons up to the rows", () => {
    const { rows, draft, qb1 } = drive();
    expect(rows.perSeason.map((r) => r.season)).toEqual([2026, 2027]);
    expect(rows.file?.players).toBe(56);
    const [y0, y1] = rows.perSeason as [typeof rows.perSeason[0], typeof rows.perSeason[0]];
    // Year 0's week-8 picture is the file's people here (nothing moved between).
    expect(y0.week8).toEqual(rows.file);
    expect(y0.fileOn53).toBe(56);
    expect(y0.wins).toEqual([12, 5]);
    expect(y0.winSpread).toBeCloseTo(3.5, 12);
    expect(y0.winR).toBeNull();
    expect(y1.winR).toBeCloseTo(1, 12);
    // Camp 2026: two free agents, both new; 2027's camp: FA2, a league year on (5 of the walk's days here).
    expect(y0.freeAgents.camp).toBe(2);
    expect(y0.unsigned.pool.camp).toEqual({ under1: 2, "1to2": 0, "2plus": 0, unknown: 0 });
    expect(y0.unsigned.retired).toEqual({ SEASON_END: { under1: 1, "1to2": 0, "2plus": 0, unknown: 0 } });
    expect(y1.unsigned.pool.camp).toEqual({ under1: 0, "1to2": 1, "2plus": 0, unknown: 0 });
    expect(y1.unsigned.retired).toEqual({ LATE: { under1: 0, "1to2": 1, "2plus": 0, unknown: 0 } });
    expect(y0.signings).toEqual({ emergency: 1, bargain: 0, yearTurn: 0, byStep: { "players:week": 1 } });
    // Every man on a 53 credited, all of them on a 53 at week 18.
    expect(y0.credited).toEqual({ credited: 56, week18: 56, both: 56 });
    expect(y0.rookies).toEqual({ drafted: 1, undrafted: 0 });
    // The rookie starts at corner in 2027's week 8: a round-1 starter season.
    expect(y0.draftWeek8["1"]).toEqual([0, 0]);
    expect(y1.draftWeek8["1"]).toEqual([1, 1]);
    expect(rows.draftWeek8.starterSeasons["1"]).toEqual([1, 1]);
    // Drafted for 2027 and the walk ends in 2027: too few seasons for "ever a starter".
    expect(rows.draftWeek8.everStarter["1"]).toEqual([0, 0]);
    // Usage: both quarterbacks had every snap in both seasons (no change); the receiver played 2026 alone.
    expect(rows.usage.cells.QB!["26"]).toEqual({ n: 2, sum: 0, nExit: 2, sumExit: 0 });
    expect(rows.usage.cells.WR!["26"]).toEqual({ n: 0, sum: 0, nExit: 1, sumExit: -1 });
    expect(Object.keys(rows.usage.cells)).not.toContain("K");
    expect(rows.careers.routes).toEqual({ FILE: 58, DRAFT: 1, UDFA: 0 });
    expect(rows.careers.entrants).toEqual([{ e: 2027, g: "CB", o: "CB", r: "DRAFT", n: 1, c: 1, x: 0, t: null }]);
    expect(rows.draft).toBe(draft);
    expect(qb1).toBe("T01-s0");
  });

  it("the same days and seasons give the same rows", () => {
    expect(JSON.stringify(drive().rows)).toBe(JSON.stringify(drive().rows));
  });
});

// --- runCareerCheck on made-up seasons -----------------------------------------------------------

describe("runCareerCheck: one walk, both readers", () => {
  const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
  const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];
  /** Each season answered with no games and the people handed back unchanged. */
  const madeUp = (i: SeasonInput): SeasonRun => ({
    state: { season: i.season, standings: [] } as unknown as SeasonRun["state"],
    calendar: { season: i.season, phase: "OFF_SUMMER", week: 6, day: 7 }, events: [], complete: true, people: i.people!,
  });
  function withMadeUpSeasons<T>(body: () => T): T {
    hook.runSeason = madeUp as never;
    try { return body(); } finally { hook.runSeason = undefined; }
  }

  it("gives the draft check's rows beside its own, the same rows twice", () => {
    const input = { seed: "career-check-test", file, seasons: 2, players: { development: true, injuries: true } } as const;
    const first = withMadeUpSeasons(() => runCareerCheck(input));
    const second = withMadeUpSeasons(() => runCareerCheck(input));
    const draftAlone = withMadeUpSeasons(() => runDraftCheck(input));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.draft).toEqual(draftAlone);
    expect(first.seed).toBe("career-check-test");
    expect(first.switches).toEqual({ development: true, injuries: true });
    expect(first.perSeason.map((r) => r.season)).toEqual([2026, 2027]);
    expect(first.careers.lastSeason).toBe(2027);
    // No days were walked: nothing read at week 8, and nobody credited.
    expect(first.file).toBeNull();
    expect(first.perSeason[0]!.week8).toBeNull();
    expect(first.careers.entrants).toEqual([]);
    // Nobody's team was taken away (no league year ran): no limbo, nothing lost.
    expect(first.perSeason.map((r) => r.limbo)).toEqual([0, 0]);
    expect(first.perSeason[0]!.reserveLoss).toHaveLength(32);
    expect(first.perSeason[0]!.reserveLoss.every((n) => n === 0)).toBe(true);
    expect(first.perSeason[0]!.wins).toEqual(Array.from({ length: 32 }, () => 0));
  }, 300_000);
});

// --- one real season -----------------------------------------------------------------------------

describe("runCareerCheck on the real walk: one switched-on season of the stand-in league", () => {
  const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
  const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];

  it("reads year 0 at week 8, the season's games, credits and retirements", () => {
    const rows = runCareerCheck({ seed: "career-check-real", file, seasons: 1, players: { development: true, injuries: true } });
    const [y0] = rows.perSeason;
    expect(rows.perSeason).toHaveLength(1);
    // The file as loaded and the walk's own week 8: 32 teams' 53s, the same men's ages.
    expect(rows.file!.players).toBeGreaterThan(1600);
    expect(y0!.week8!.players).toBeGreaterThan(1600);
    expect(y0!.week8!.players).toBeLessThanOrEqual(32 * 53 + 64);
    expect(y0!.week8!.age.mean).toBeGreaterThan(25);
    expect(y0!.week8!.age.mean).toBeLessThan(28);
    expect(y0!.week8!.gap.gap).toBeGreaterThan(0);
    expect(y0!.week8!.gap.starters).toBeGreaterThan(32 * 24);
    expect(y0!.fileOn53).toBe(y0!.week8!.players);
    // 272 regular-season games: 544 team results.
    expect(y0!.wins.reduce((s, w) => s + w, 0)).toBe(272);
    expect(y0!.winSpread).toBeGreaterThan(1);
    // Credited seasons for the 53s at the season's end, nearly all of them on a 53 at week 18.
    expect(y0!.credited.credited).toBeGreaterThan(1500);
    expect(y0!.credited.both / y0!.credited.credited).toBeGreaterThan(0.95);
    expect(y0!.rookies.drafted).toBeGreaterThan(200);
    expect(y0!.signings.emergency).toBeGreaterThan(0);
    expect(y0!.injuries.total).toBeGreaterThan(1000);
    // The reserve-list men lose their teams at the league year: in limbo before the sweep.
    expect(y0!.limbo).toBeGreaterThan(100);
    expect(y0!.reserveLoss.reduce((s, n) => s + n, 0)).toBeLessThanOrEqual(y0!.limbo);
    expect(y0!.reserveLoss.reduce((s, n) => s + n, 0)).toBeGreaterThan(100);
    // One season of shares, no pairs of seasons yet; no entrant has played a season.
    expect(Object.values(rows.usage.cells).every((c) => Object.keys(c).length === 0)).toBe(true);
    expect(rows.careers.entrants).toEqual([]);
    expect(rows.draft.drafts).toBe(1);
    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  }, 900_000);
});
