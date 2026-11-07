/**
 * The 20-season check's reader (ADR-087 D5b): its pure pieces on made-up people and events (the age
 * offset, the week-8 picture, the career ledger, the unsigned waits, the minimum deals by step, the
 * limbo, snap shares, Kaplan-Meier, peak usage, the cap's moves by age, the head coaches), the
 * reader driven by made-up days and seasons, and
 * `runCareerCheck` on made-up seasons (the draft check's rows beside its own, the same rows twice).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, positionOverall,
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type PlayerContract, type PlayerState, type Position, type StaffState, type Team,
} from "@ff/contracts";
import { capForecast, type runSeason, type SeasonRun } from "@ff/franchise";
import {
  addCells, addGame, addUsage, AGE_BINS, ageTally, capMoveAges, CAREER_GROUP, CAREER_GROUPS, CAREER_ROWS_VERSION, careerLedger, careerReader,
  headCoachChanges, headCoachLeanings, kaplanMeier, lifeTable, minimumSignings, modalGroup, MOVING_RATING_GROUPS, pearson, RATING_GROUP_COPY,
  RATING_GROUP_DIGEST, reserveLoss, rosterPicture, runCareerCheck, seasonAge, sittingHeadCoaches, SLOT_POSITIONS, snapShares, starterSlots,
  teamStarters, unsignedWaits, usagePeak, waitClass, type BusiestSnaps, type CareerCheckpoint, type SideSnaps, type UsageCell,
  addAvailability, apyOfDeal, backOnA53, cutFileDeal, EXPIRY_MIN_CAP_SHARE, expiryWindow, followExpiries, leagueYearOf, liveAt, nflCount, nflRosterIds,
  openExpiries, outFourWeeksBand, outFourWeeksLeft, retiredNextYear, retirementsOf, STARTER_SHARE, startersGone, type AgeCounts, type CareerReaderState,
  draftByAge, RETIREMENT_MOMENTS, retiredHow, teamOverallRow, teamOveralls, type RetirementRead, type SeasonRow,
} from "../src/season/careerCheck.js";
import { OTC_SIGNED_AGAIN, STARTER_MIN_SHARE } from "../src/careers/nflCareers.js";
import { careerValues } from "../src/careers/measure.js";
import { deltaCurve, peakAge, snapSeasons } from "../src/careers/usage.js";
import { lastTeams, type CapCheckInput } from "../src/season/capCheck.js";
import { draftReader, runDraftCheck, STARTING } from "../src/season/draftCheck.js";
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
const signed = (player: string, kind: string, team = "T01"): FranchiseEvent => ({ type: "CONTRACT_SIGNED", payload: { player, team, kind, years: 1 } } as FranchiseEvent);
/** A signing whose payload has no kind (contracts written before ADR-085 K2). */
const signedNoKind = (player: string, team: string): FranchiseEvent => ({ type: "CONTRACT_SIGNED", payload: { player, team, years: 1 } } as FranchiseEvent);
const released = (player: string, team = "T01"): FranchiseEvent => ({ type: "PLAYER_RELEASED", payload: { player, team, postJune1: false } } as FranchiseEvent);
/** A deal signed on a day (only the fields `lastTeams` reads). */
const deal = (player: string, team: string, at: CalendarStamp): PlayerContract => ({ player, team, signedAt: at, years: [] } as unknown as PlayerContract);

/** A coach whose résumé ends in `job` (an NFL job at `team` held now, unless `ended`), with these leanings. */
function coach(id: string, o: { role?: StaffState["role"]; team?: string; level?: "NFL" | "COLLEGE"; ended?: boolean; lineup?: StaffState["lineup"] } = {}): StaffState {
  const role = o.role ?? "HEAD_COACH";
  return {
    id, displayName: id, role, age: 50, attributes: {}, lineage: [], personalityType: "quiet",
    ...(o.team !== undefined && !o.ended ? { teamId: o.team } : {}),
    career: [
      { level: "NFL", role: "OC", team: "T99", employer: "T99", firstSeason: 2010, lastSeason: 2015, seasons: [], ended: "PROMOTED" },
      {
        level: o.level ?? "NFL", role, ...(o.team !== undefined ? { team: o.team } : {}), employer: o.team ?? "college", firstSeason: 2016, seasons: [],
        ...(o.ended ? { lastSeason: 2026, ended: "FIRED" } : {}),
      },
    ],
    ...(o.lineup ? { lineup: o.lineup } : {}),
  } as unknown as StaffState;
}

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
    // No ledger reading (the league file as loaded): a rookie has no credited season, the file's years_exp 0.
    expect(pic.rookieShare).toBeCloseTo(2 / 56, 12);
    expect(pic.noCreditShare).toBeCloseTo(2 / 56, 12);
    expect(pic.undraftedShare).toBeCloseTo(4 / 56, 12);
    // Ratings: every moving rating the registry has, of every man on the 53s; none at 95.
    const moving = MOVING_RATING_GROUPS.flatMap((g) => RATING_GROUP_COPY[g]!).filter((id) => RATINGS.includes(id));
    expect(pic.ratings).toEqual({ total: 56 * moving.length, at95: 0, at99: 0 });
    expect(pic.ratingGroups.BODY).toBeCloseTo(pic.overall.mean, 9);
  });

  it("rookies are men in their first season in the league, as years_exp 0 reads; no credited season is the earlier reading", () => {
    const a = squad("T01", 70, 60);
    const b = squad("T02", 66, 60);
    const players = [...a.players, ...b.players];
    // In 2027: T01's backup quarterback (no credited season) came in in 2026, so he is in his second
    // season; T02's came in this season. A starter the ledger never saw falls back to his credited seasons (3).
    const first: Record<string, number> = { "T01-b0": 2026, "T02-b0": 2027, "T01-b1": 2016, "T02-b1": 2016 };
    const pic = rosterPicture({ teams: [a.team, b.team], players }, { season: 2027, firstSeasonOf: (id) => first[id] ?? (id.endsWith("-s0") ? undefined : 2020) });
    expect(pic.rookieShare).toBeCloseTo(1 / 56, 12);
    expect(pic.noCreditShare).toBeCloseTo(2 / 56, 12);
    // A man with no first season and no credited season reads as a rookie.
    const noCount = man("T01-s0", { position: "QB", team: "T01", rating: 70, draft: { year: 2020, round: 3, pick: 80 } });
    const pic2 = rosterPicture({ teams: [a.team, b.team], players: [noCount, ...players.slice(1)] }, { season: 2027, firstSeasonOf: (id) => first[id] ?? (id === "T01-s0" ? undefined : 2020) });
    expect(pic2.rookieShare).toBeCloseTo(2 / 56, 12);
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
    const busiest = new Map<string, BusiestSnaps>();
    const r = (player: string, team: string, offense: number, defense: number) => ({ player, team, snaps: { offense, defense, special: 3 } }) as never;
    // Game 1: T01 at T02. Game 2: T01 at T03 (b sat it out, c had moved to T03).
    addGame({ home: "T02", away: "T01" } as never, [r("a", "T01", 60, 0), r("q", "T01", 65, 0), r("b", "T01", 0, 30), r("z", "T01", 0, 70), r("c", "T02", 40, 0), r("d", "T02", 5, 20), r("y", "T02", 0, 0)], snaps, busiest);
    addGame({ home: "T03", away: "T01" } as never, [r("a", "T01", 50, 0), r("z", "T01", 0, 60), r("c", "T03", 50, 0)], snaps, busiest);
    expect(busiest.get("T01")).toEqual({ offense: 115, defense: 130 });
    expect(busiest.get("T02")).toEqual({ offense: 40, defense: 20 });
    expect(busiest.get("T03")).toEqual({ offense: 50, defense: 0 });
    // y played special teams alone: he has a season of snaps (a snap of any kind counts), share 0.
    expect(snaps.get("y")?.get("T02")).toEqual({ offense: 0, defense: 0, special: 3 });
    const shares = snapShares(snaps, busiest);
    expect(shares.get("a")).toEqual({ team: "T01", side: "offense", share: 110 / 115 });
    expect(shares.get("b")).toEqual({ team: "T01", side: "defense", share: 30 / 130 });
    // c: 40 with T02, 50 with T03: T03 is his team, its game his only one there.
    expect(shares.get("c")).toEqual({ team: "T03", side: "offense", share: 1 });
    expect(shares.get("d")).toEqual({ team: "T02", side: "defense", share: 1 });
    expect(shares.get("y")).toEqual({ team: "T02", side: null, share: 0 });
  });

  it("snap share reads the way the real side reads it: special teams count toward his team, a tie on side goes to offense", () => {
    const snaps = new Map<string, Map<string, SideSnaps>>();
    const busiest = new Map<string, BusiestSnaps>();
    const r = (player: string, team: string, offense: number, defense: number, special: number) => ({ player, team, snaps: { offense, defense, special } }) as never;
    // k: 30 offense with T01 and 10 offense plus 25 special with T02 (35 snaps): T02 is his team though T01 had more offense.
    addGame({ home: "T02", away: "T01" } as never, [r("k", "T01", 30, 0, 0), r("o1", "T01", 60, 0, 0), r("t", "T01", 20, 20, 0)], snaps, busiest);
    addGame({ home: "T02", away: "T03" } as never, [r("k", "T02", 10, 0, 25), r("o2", "T02", 50, 0, 0), r("d2", "T02", 0, 40, 0)], snaps, busiest);
    const shares = snapShares(snaps, busiest);
    expect(shares.get("k")).toEqual({ team: "T02", side: "offense", share: 10 / 50 });
    expect(shares.get("t")).toEqual({ team: "T01", side: "offense", share: 20 / 60 });
    // The same games as the real side's rows (one row per man, game and team): the same shares.
    const rows = [
      ["g1", "T01", "k", 30, 0, 0], ["g1", "T01", "o1", 60, 0, 0], ["g1", "T01", "t", 20, 20, 0],
      ["g2", "T02", "k", 10, 0, 25], ["g2", "T02", "o2", 50, 0, 0], ["g2", "T02", "d2", 0, 40, 0],
    ].map(([gameId, team, pfrId, offense, defense, special]) => ({ season: 2030, gameId, team, pfrId, position: null, offense, defense, special }));
    const real = snapSeasons(rows as never, 2030);
    for (const [id, s] of shares) expect({ team: real.get(id)!.team, side: real.get(id)!.side, share: real.get(id)!.share }).toEqual(s);
  });

  it("his group in a season: the most common over his reads, ties to the latest read", () => {
    expect(modalGroup([])).toBeUndefined();
    expect(modalGroup(["WR", "WR", "TE"])).toBe("WR");
    expect(modalGroup(["WR", "TE"])).toBe("TE");
    expect(modalGroup(["K", "WR", "WR", "K"])).toBe("K");
    expect(modalGroup(["CB", "S", "S", "CB", "LB"])).toBe("CB");
  });

  it("usage cells: a change counts at his age in the first season, and a leaver counts at 0 in the exit variant", () => {
    const cells: Record<string, Record<string, UsageCell>> = {};
    addUsage(cells, new Map([["a", { share: 0.5, group: "RB", age: 24 }], ["b", { share: 0.3, group: "RB", age: 24 }], ["c", { share: 0.9, group: "QB", age: 31 }], ["k", { share: 0, group: "K", age: 30 }]]),
      new Map([["a", { share: 0.7 }], ["c", { share: 0.8 }], ["n", { share: 0.4 }]]));
    expect(cells.K).toBeUndefined();
    const pooled: Record<string, UsageCell> = {};
    addCells(pooled, cells.RB!);
    addCells(pooled, cells.RB!);
    expect(pooled["24"]).toEqual({ n: 2, sum: 2 * cells.RB!["24"]!.sum, nExit: 4, sumExit: 2 * cells.RB!["24"]!.sumExit });
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
    const plain = usagePeak(cells, false, 1);
    expect(plain.smoothed["21"]).toBeCloseTo((-0.05 + 0.1) / 2, 12);
    expect(plain.smoothed["24"]).toBeCloseTo((0.08 + 0.02 - 0.02) / 3, 12);
    expect(plain.smoothed["25"]).toBeCloseTo((0.02 - 0.02 - 0.05) / 3, 12);
    // 26's neighbors are 25 alone (27 has nobody); 28's are none.
    expect(plain.smoothed["26"]).toBeCloseTo((-0.02 - 0.05) / 2, 12);
    expect(plain.smoothed["28"]).toBeCloseTo(-0.1, 12);
    expect(plain.peak).toBe(25);
    // Counting leavers at 0, the change never rises: no peak.
    expect(usagePeak(cells, true, 1).peak).toBeNull();
    expect(usagePeak({ "22": cell(0.1, 0.1), "23": cell(0.1, 0.1) }, false, 1).peak).toBeNull();
    expect(usagePeak({ "22": { n: 0, sum: 0, nExit: 0, sumExit: 0 } }, false, 1).means).toEqual({});
    // The real side's floor by default: ages with fewer than 20 pairs are left out (all of these).
    expect(usagePeak(cells).means).toEqual({});
  });

  it("peak usage age reads as the real side's curve does, the 20-pair floor and its smoothing included", () => {
    // Made-up pairs: mean change by age rising to 24 then falling; age 27 has too few pairs.
    const pairs: { age: number; delta: number }[] = [];
    const add = (age: number, n: number, delta: number) => { for (let i = 0; i < n; i++) pairs.push({ age, delta: delta + (i % 2 === 0 ? 0.01 : -0.01) }); };
    add(22, 25, 0.12); add(23, 30, 0.05); add(24, 40, 0.01); add(25, 40, -0.03); add(26, 22, -0.06); add(27, 5, 0.3); add(28, 21, -0.08);
    const cells: Record<string, UsageCell> = {};
    for (const p of pairs) {
      const c = (cells[String(p.age)] ??= { n: 0, sum: 0, nExit: 0, sumExit: 0 });
      c.n++; c.sum += p.delta; c.nExit++; c.sumExit += p.delta;
    }
    const curve = deltaCurve(pairs);
    const ours = usagePeak(cells);
    expect(ours.peak).toBe(peakAge(curve));
    expect(Object.keys(ours.means).map(Number)).toEqual(curve.map((c) => c.age));
    for (const c of curve) expect(ours.smoothed[String(c.age)]).toBeCloseTo(c.smoothed, 12);
    expect(ours.peak).toBe(25);
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
    // A man still going at 2 says only "2 or more": he leaves the risk set before 2's exits.
    const tie = kaplanMeier(lifeTable([{ n: 2, c: 1 }, { n: 2, c: 0 }]));
    expect(tie.survival.slice(0, 4)).toEqual([1, 1, 0, 0]);
  });

  it("Kaplan-Meier gives the real side's numbers on the same careers (careers/measure.ts careerValues)", () => {
    const careers: { n: number; c: 0 | 1 }[] = [];
    // A made-up cohort: every length 1..14, some still going, ties of exits and censoring at the same length.
    for (let n = 1; n <= 14; n++) for (let k = 0; k < (n * 7) % 5 + 1; k++) careers.push({ n, c: (n + k) % 3 === 0 ? 1 : 0 });
    const ours = kaplanMeier(lifeTable(careers));
    const theirs = careerValues(careers.map((e) => ({ group: "QB", entry: 2015, length: e.n, censored: e.c === 1 })));
    expect(ours.expected).toBeCloseTo(theirs.expected, 12);
    expect(ours.reach5).toBeCloseTo(theirs.reach5, 12);
    expect(ours.reach10).toBeCloseTo(theirs.reach10, 12);
    for (let k = 1; k <= 15; k++) expect(ours.survival[k - 1]).toBeCloseTo(theirs.curve[k - 1]!, 12);
  });

  it("the career ledger: entry route and group, a rewritten position, exits, censoring, comebacks", () => {
    const ledger = careerLedger();
    const f1 = man("F1", { cs: 3, team: "T01" }), f0 = man("F0", { cs: 0, team: "T01" }), f2 = man("F2", { cs: 5, team: "T02" });
    ledger.start([f1, f0, f2], 2026);
    ledger.start([man("late")], 2026); // only the first call counts
    // First seasons in the league: the file's years_exp (creditedSeasons) back from 2026.
    expect(["F1", "F0", "F2", "late"].map((id) => ledger.firstSeasonOf(id))).toEqual([2023, 2026, 2021, undefined]);
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
    // On a team after the year turn: 2027 is their first season; a file man keeps his.
    expect(["D1", "U1", "P", "F0"].map((id) => ledger.firstSeasonOf(id))).toEqual([2027, 2027, undefined, 2026]);
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
      { e: 2027, g: "K", o: "CB", r: "DRAFT", n: 2, c: 1, x: 1, t: null, w: null },
      { e: 2027, g: "WR", o: "WR", r: "UDFA", n: 1, c: 0, x: 0, t: "SEASON_END", w: "UNSIGNED" },
    ]);
    // Credited in 2026 and on no team in 2027: F1 and F2; F2 is credited again in 2028.
    expect(ledger.comebacks(2026, 2028)).toEqual([{ season: 2026, out: 2, back: 1 }]);
    expect(ledger.counts()).toEqual({ FILE: 3, DRAFT: 1, UDFA: 1, relabeled: 1, fileRookies: 1 });
    // Saved and restored, the ledger gives the same answers.
    const again = careerLedger();
    again.restore(JSON.parse(JSON.stringify(ledger.save())));
    expect(again.entrants(2028)).toEqual(entrants);
    expect(again.comebacks(2026, 2028)).toEqual(ledger.comebacks(2026, 2028));
    expect(again.counts()).toEqual(ledger.counts());
    expect(again.save()).toEqual(ledger.save());
  });

  it("first season in the league: an undrafted man signed later counts from the season he is first on a team", () => {
    const ledger = careerLedger();
    ledger.start([man("F1", { cs: 3, team: "T01" })], 2026);
    // U2 is on no team after the 2026 draft; he signs during 2028 (read on a week's day 1).
    ledger.season(2026, [man("F1", { cs: 3, team: "T01" })], [man("F1", { cs: 4, team: "T01" }), man("U2", { cs: 0, draft: "UDFA" })], []);
    expect(ledger.firstSeasonOf("U2")).toBeUndefined();
    ledger.present(2027, [man("U2", { cs: 0, draft: "UDFA" })]);
    expect(ledger.firstSeasonOf("U2")).toBeUndefined();
    ledger.present(2028, [man("U2", { cs: 0, draft: "UDFA", team: "T02" })]);
    expect(ledger.firstSeasonOf("U2")).toBe(2028);
    // A league-file man's first season comes from the file, never from where he is read.
    ledger.present(2028, [man("F1", { cs: 5, team: "T03" })]);
    expect(ledger.firstSeasonOf("F1")).toBe(2023);
    const again = careerLedger();
    again.restore(JSON.parse(JSON.stringify(ledger.save())));
    expect(again.firstSeasonOf("U2")).toBe(2028);
  });

  it("the entry group is his position on the 53 on the regular season's last day, as the real final-week row reads it", () => {
    const ledger = careerLedger();
    ledger.start([man("F1", { cs: 3, team: "T01" })]);
    const d1 = man("D1", { cs: 0, position: "OLB", draft: { year: 2027, round: 3, pick: 80 }, team: "T01" });
    ledger.season(2026, [man("F1", { cs: 3, team: "T01" })], [man("F1", { cs: 4, team: "T01" }), d1], []);
    // 2027: on the 53 at week 18 as a linebacker (MLB); an emergency move after it lists him as a DE.
    ledger.present(2027, [d1]);
    ledger.season(2027, [d1], [man("D1", { cs: 1, position: "DE", team: "T01" })], [], new Map([["D1", "MLB" as Position]]));
    expect(ledger.entrants(2027)).toEqual([{ e: 2027, g: "LB", o: "EDGE", r: "DRAFT", n: 1, c: 1, x: 1, t: null, w: null }]);
  });

  it("ages in a histogram: one bin a year from 21 to 40, the ends open; unknown ages counted apart", () => {
    expect(AGE_BINS).toEqual({ from: 21, to: 40 });
    const t = ageTally([20, 21, 22, 22, 30, 40, 44, undefined]);
    expect(t.histogram).toHaveLength(20);
    expect(t.histogram[0]).toBe(2); // 20 and 21
    expect(t.histogram[1]).toBe(2); // 22
    expect(t.histogram[9]).toBe(1); // 30
    expect(t.histogram[19]).toBe(2); // 40 and 44
    expect(t.histogram.reduce((a, b) => a + b, 0)).toBe(7);
    expect(t.n).toBe(7);
    expect(t.unknown).toBe(1);
    expect(t.mean).toBeCloseTo((20 + 21 + 22 + 22 + 30 + 40 + 44) / 7, 12);
    expect(ageTally([])).toEqual({ n: 0, mean: 0, histogram: Array.from({ length: 20 }, () => 0), unknown: 0 });
  });

  it("each man's team on his latest deal, by signing day (the later listed of two on one day)", () => {
    const contracts = [
      deal("a", "T02", stamp(2027, "OFF_RESET_FA", 1, 1)), deal("a", "T01", stamp(2024, "OFF_RESET_FA", 1, 1)),
      deal("b", "T01", stamp(2025, "OFF_DRAFT", 3, 4)), deal("b", "T03", stamp(2025, "OFF_DRAFT", 3, 4)),
      deal("c", "T04", stamp(2020, "OFF_DRAFT", 3, 4)),
    ];
    expect([...lastTeams(contracts)].sort()).toEqual([["a", "T02"], ["b", "T03"], ["c", "T04"]]);
    expect(contracts[0]!.team).toBe("T02"); // the list handed in is not sorted in place
  });

  it("the cap's moves by age: releases, veterans re-signed by their own team, veterans signed by a new team", () => {
    const lastTeam = new Map([["own1", "T01"], ["own2", "T02"], ["own3", "T01"], ["own4", "T03"], ["new1", "T02"], ["new2", "T05"], ["rook", "T01"], ["tend", "T01"], ["ps", "T01"]]);
    const age: Record<string, number> = { own1: 33, own2: 29, own3: 35, own4: 27, new1: 31, new2: 38, rook: 22, tend: 24, ps: 23, cut1: 34, cut2: 22, none: 30 };
    const events: FranchiseEvent[] = [
      released("cut1"), released("cut2"), released("cut1", "T02"), released("ghost"),
      signed("own1", "VETERAN"), signed("own2", "EXTENSION", "T02"), signed("own3", "MINIMUM"), signedNoKind("own4", "T03"),
      signed("new1", "VETERAN"), signed("new2", "MINIMUM", "T07"),
      // Not veteran deals: a rookie deal, a tender, a practice-squad deal; and a veteran deal with no deal before it.
      signed("rook", "ROOKIE"), signed("tend", "ERFA_TENDER"), signed("ps", "PRACTICE_SQUAD"), signed("none", "VETERAN"),
      retired("own1", "LATE"),
    ];
    const envelopes = events.map((event, seq) => ({ seq, at: stamp(2026, "OFF_RESET_FA", 1, 1), event }));
    // Cut-down day made the first two releases, the league year's re-signing step the third; the fourth no step made.
    const stepEvents = [
      { step: "cutdown", envelope: envelopes[0]! }, { step: "cutdown", envelope: envelopes[1]! }, { step: "re-sign", envelope: envelopes[2]! },
      { step: "re-sign", envelope: envelopes[4]! }, { step: "players:week", envelope: envelopes[9]! },
    ];
    const moves = capMoveAges({ events: envelopes, stepEvents }, lastTeam, (id) => age[id]);
    // A man released twice counts twice; one with no age known counts apart.
    expect(moves.released.n).toBe(3);
    expect(moves.released.unknown).toBe(1);
    expect(moves.released.mean).toBeCloseTo((34 + 22 + 34) / 3, 12);
    expect(moves.released.histogram[34 - 21]).toBe(2);
    expect(moves.released.histogram[22 - 21]).toBe(1);
    expect(moves.reSigned.n).toBe(4);
    expect(moves.reSigned.mean).toBeCloseTo((33 + 29 + 35 + 27) / 4, 12);
    expect(moves.reSigned.histogram[35 - 21]).toBe(1);
    expect(moves.newTeam.n).toBe(2);
    expect(moves.newTeam.mean).toBeCloseTo((31 + 38) / 2, 12);
    expect(moves.newTeam.histogram[38 - 21]).toBe(1);
    expect(moves.newTeam.histogram.reduce((a, b) => a + b, 0)).toBe(2);
    // By step and by kind, keys sorted; the splits add up to the whole.
    expect(Object.keys(moves.releasedByStep)).toEqual(["cutdown", "re-sign", "turn"]);
    expect(moves.releasedByStep.cutdown).toEqual(ageTally([34, 22]));
    expect(moves.releasedByStep["re-sign"]).toEqual(ageTally([34]));
    expect(moves.releasedByStep.turn).toEqual(ageTally([undefined]));
    expect(Object.keys(moves.reSignedByKind)).toEqual(["EXTENSION", "MINIMUM", "NONE", "VETERAN"]);
    expect(moves.reSignedByKind.MINIMUM).toEqual(ageTally([35]));
    expect(moves.reSignedByKind.NONE).toEqual(ageTally([27]));
    expect(moves.newTeamByKind).toEqual({ MINIMUM: ageTally([38]), VETERAN: ageTally([31]) });
    // With no step events at all, every release is the year turn's.
    expect(Object.keys(capMoveAges({ events: envelopes }, lastTeam, (id) => age[id]).releasedByStep)).toEqual(["turn"]);
  });

  it("the head coaches: who sits where, how many teams changed, their stored leanings", () => {
    const teams = [{ id: "T01" }, { id: "T02" }, { id: "T03" }, { id: "T04" }] as unknown as Team[];
    const lean = (incumbent: number, form: number) => ({ incumbent, veteran: 50, form });
    const before = [
      coach("H1", { team: "T01", lineup: lean(80, 20) }), coach("H2", { team: "T02", lineup: lean(40, 60) }), coach("H3", { team: "T03" }),
      coach("O1", { role: "OC", team: "T01" }), coach("C1", { team: "Tulane", level: "COLLEGE" }),
    ];
    // After: T02's man fired and a pool coach seated there; T03's as he was; T04 had none and still has none; T01 the same man.
    const after = [
      before[0]!, coach("H2", { team: "T02", ended: true, lineup: lean(40, 60) }), before[2]!, before[3]!, before[4]!,
      coach("H9", { team: "T02", lineup: lean(100, 0) }),
    ];
    const sitting = sittingHeadCoaches(after);
    expect([...sitting.keys()].sort()).toEqual(["T01", "T02", "T03"]);
    expect(sitting.get("T02")!.id).toBe("H9");
    expect(headCoachChanges(before, after, teams)).toBe(1);
    expect(headCoachChanges(before, before, teams)).toBe(0);
    // A team that loses its head coach and has none counts; so does one that gains one.
    expect(headCoachChanges(before, before.slice(1), teams)).toBe(1);
    expect(headCoachChanges([], before, teams)).toBe(3);
    expect(headCoachChanges(undefined, undefined, teams)).toBe(0);
    // Two head coaches listed at one team: the first in staff order sits (as franchise's headCoachOf reads him).
    expect(sittingHeadCoaches([coach("X1", { team: "T01" }), coach("X2", { team: "T01" })]).get("T01")!.id).toBe("X1");
    expect(headCoachLeanings(before, teams)).toEqual({ n: 3, unset: 1, incumbent: 60, veteran: 50, form: 40 });
    expect(headCoachLeanings(after, teams)).toEqual({ n: 3, unset: 1, incumbent: 90, veteran: 50, form: 10 });
    expect(headCoachLeanings(undefined, teams)).toEqual({ n: 0, unset: 0, incumbent: 0, veteran: 0, form: 0 });
  });

  it("starting slots: each team's first STARTING men at each position, in a fixed order", () => {
    const a = squad("T01", 70, 60);
    const slots = starterSlots([a.team, { depthChart: {} } as Team]);
    const perTeam = SLOT_POSITIONS.reduce((n, p) => n + STARTING[p], 0);
    expect(perTeam).toBe(25);
    expect(slots).toHaveLength(2 * perTeam);
    expect(slots[0]).toBe("T01-s0");
    expect(slots.slice(perTeam).every((s) => s === "")).toBe(true);
  });
});

// --- the owner's aging rulings of 2026-11-06 (rows version 5) ------------------------------------

/** An injury on a made-up man (only what the readers look at). */
const hurt = (p: PlayerState, band: "DAY_TO_DAY" | "SHORT" | "LONG" | "MAJOR", weeksRemaining: number, playable = false): PlayerState => ({
  ...p, condition: { ...p.condition, injury: { kind: "knee", weeksRemaining, playable, setting: "GAME", band, since: stamp(2026, "REGULAR_SEASON", 6, 7) } },
} as PlayerState);
/** A made-up deal: its player, team, years at a cap hit each, signing day, kind and end. */
const dealOf = (player: string, team: string, o: { seasons: number[]; hit: number; at: CalendarStamp; kind?: string; ended?: { at: CalendarStamp; reason: string }; voidYears?: number[] }): PlayerContract => ({
  player, team, signedAt: o.at, ...(o.kind ? { kind: o.kind } : {}), ...(o.ended ? { ended: o.ended } : {}),
  years: [
    ...o.seasons.map((season) => ({ season, baseSalary: o.hit, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: o.hit })),
    ...(o.voidYears ?? []).map((season) => ({ season, baseSalary: 0, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 0, voidYear: true })),
  ],
} as unknown as PlayerContract);
const env = (seq: number, at: CalendarStamp, event: FranchiseEvent): FranchiseEventEnvelope => ({ seq, at, event });
const expired = (player: string, team: string): FranchiseEvent => ({ type: "CONTRACT_EXPIRED", payload: { player, team } } as FranchiseEvent);

describe("the owner's aging rulings: the reader's new pieces", () => {
  it("each group's 22-or-under, 31+ and 34+ shares, and the rookies' ages, read as the league's", () => {
    const a = squad("T01", 70, 60, (i) => (i < 13 ? 24 : 30));
    const b = squad("T02", 66, 60);
    const pic = rosterPicture({ teams: [a.team, b.team], players: [...a.players, ...b.players] });
    // Quarterbacks: T01's starter 24, T02's 26, and each team's 22-year-old backup.
    expect(pic.groups.QB).toMatchObject({ n: 4, upTo22: 0.5, from31: 0, from34: 0 });
    // Corners: T01's three starters 30, T02's 26, and each team's 34-year-old backup.
    expect(pic.groups.CB).toMatchObject({ n: 8, upTo22: 0, from31: 0.25, from34: 0.25 });
    expect(pic.groups.K).toMatchObject({ n: 2, upTo22: 0, from31: 0, from34: 0 });
    // The rookies (no ledger: no credited season) are the two 22-year-old backups.
    expect(pic.rookieAge).toEqual({ n: 2, mean: 22, histogram: { "22": 2 } });
    // No men: every share 0.
    expect(rosterPicture({ teams: [], players: [] }).groups.QB).toMatchObject({ n: 0, upTo22: 0, from31: 0, from34: 0 });
    expect(rosterPicture({ teams: [], players: [] }).rookieAge).toEqual({ n: 0, mean: 0, histogram: {} });
  });

  it("the 53 counted like the NFL: an unhealed LONG or MAJOR injury leaves a man out; the variant reads the weeks still to go", () => {
    const a = squad("T01", 70, 60);
    const b = squad("T02", 66, 60);
    // T01's back is 2 weeks from the end of a long injury, a receiver 6 weeks into a major one's last weeks, another out short.
    const players = [...a.players, ...b.players].map((p) =>
      p.bio.id === "T01-s1" ? hurt(p, "LONG", 2) : p.bio.id === "T01-s2" ? hurt(p, "MAJOR", 6) : p.bio.id === "T01-s3" ? hurt(p, "SHORT", 3) : p);
    expect(outFourWeeksBand(players.find((p) => p.bio.id === "T01-s1")!)).toBe(true);
    expect(outFourWeeksLeft(players.find((p) => p.bio.id === "T01-s1")!)).toBe(false);
    expect(outFourWeeksBand(players.find((p) => p.bio.id === "T01-s3")!)).toBe(false);
    expect(outFourWeeksBand(a.players[0]!)).toBe(false);
    const people = { teams: [a.team, b.team], players };
    expect(nflCount(people)).toEqual({ onRosters: 56, leftOut: 2, leftOutWeeksLeft: 1, sizes: { before: [28, 28], after: [26, 28], afterWeeksLeft: [27, 28] } });
    const nfl = rosterPicture(people, undefined, outFourWeeksBand);
    expect(nfl.players).toBe(54);
    expect(nfl.groups.RB.n).toBe(1);
    expect(nfl.groups.WR.n).toBe(5);
    expect(rosterPicture(people, undefined, outFourWeeksLeft).players).toBe(55);
    // Without a predicate nobody is left out.
    expect(rosterPicture(people).players).toBe(56);
    // The roster way's 53s: the band reading's men, in team then roster order; a man the people do not know is left out.
    const ids = nflRosterIds(people);
    expect(ids).toHaveLength(54);
    expect(ids).not.toContain("T01-s1");
    expect(ids).not.toContain("T01-s2");
    expect(ids.slice(0, 2)).toEqual(["T01-s0", "T01-s3"]);
    expect(ids[26]).toBe("T02-s0");
    expect(nflRosterIds({ teams: [{ ...a.team, roster: ["nobody" as never, ...a.team.roster] }], players })).toHaveLength(26);
  });

  it("the league year a day falls in, and a deal's APY over its real years", () => {
    expect(leagueYearOf(stamp(2025, "OFF_RESET_FA", 1, 1))).toBe(2026);
    expect(leagueYearOf(stamp(2026, "OFF_EVAL", 3, 1))).toBe(2026);
    expect(leagueYearOf(stamp(2026, "REGULAR_SEASON", 5, 1))).toBe(2026);
    expect(leagueYearOf(stamp(2026, "OFF_DRAFT", 3, 4))).toBe(2027);
    expect(leagueYearOf(stamp(2026, "OFF_SUMMER", 2, 1))).toBe(2027);
    expect(apyOfDeal(dealOf("p", "T01", { seasons: [2025, 2026], hit: 10e6, at: stamp(2024, "OFF_RESET_FA", 1, 1), voidYears: [2027, 2028] }))).toBe(10e6);
    expect(apyOfDeal({ years: [] })).toBe(0);
    // The line is the real rates' (OverTheCap's 1.5%), and a starter is the real side's 50%.
    expect(EXPIRY_MIN_CAP_SHARE).toBe(OTC_SIGNED_AGAIN.minCapShare);
    expect(STARTER_SHARE).toBe(STARTER_MIN_SHARE);
  });

  it("signed again within two years: the window from the last season's OFF_EVAL, one league year and two, retirements, early extensions", () => {
    const cap = () => 200e6;
    const ranOut = stamp(2026, "OFF_RESET_FA", 1, 1);
    const end = (reason = "EXPIRED") => ({ at: ranOut, reason });
    const at24 = stamp(2024, "OFF_RESET_FA", 1, 1);
    const after = [
      // A: 5% of the cap, re-signed by his own team before the expiry (OFF_EVAL week 3).
      dealOf("A", "T01", { seasons: [2025, 2026], hit: 10e6, at: at24, kind: "VETERAN", ended: end() }),
      dealOf("A", "T01", { seasons: [2027, 2028], hit: 12e6, at: stamp(2026, "OFF_EVAL", 3, 1), kind: "EXTENSION" }),
      // B: 3%, a practice-squad deal first (not a signing), then another team's deal in the second league year.
      dealOf("B", "T01", { seasons: [2026], hit: 6e6, at: stamp(2025, "OFF_RESET_FA", 1, 2), ended: end("VOIDED") }),
      // C: 2%, retires unsigned at the next camp. D: 1%, under the line.
      dealOf("C", "T02", { seasons: [2026], hit: 4e6, at: stamp(2025, "OFF_RESET_FA", 1, 2), ended: end() }),
      dealOf("D", "T02", { seasons: [2026], hit: 2e6, at: stamp(2025, "OFF_RESET_FA", 1, 2), ended: end() }),
      // F: 4%, extended a year early (signed before the window, running past 2026).
      dealOf("F", "T01", { seasons: [2024, 2025, 2026], hit: 8e6, at: stamp(2023, "OFF_RESET_FA", 1, 1), ended: end() }),
      dealOf("F", "T01", { seasons: [2027, 2028, 2029], hit: 9e6, at: stamp(2025, "OFF_EVAL", 3, 1), kind: "EXTENSION" }),
      // G: 2.5%, a signing before the window opens and one on the day two league years on: neither counts.
      dealOf("G", "T02", { seasons: [2026], hit: 5e6, at: stamp(2025, "OFF_RESET_FA", 1, 2), ended: end() }),
      // H: a league-file deal signed for 2024 whose years from 2026 on alone were kept (its early years cut): flagged.
      dealOf("H", "T02", { seasons: [2026], hit: 6e6, at: stamp(2023, "OFF_RESET_FA", 1, 1), ended: end() }),
    ];
    const events26 = [
      env(0, stamp(2026, "REGULAR_SEASON", 5, 1), signed("G", "MINIMUM", "T02")),
      env(1, stamp(2026, "OFF_EVAL", 3, 1), signed("A", "EXTENSION", "T01")),
      ...["A", "B", "C", "D", "F", "G", "H"].map((p, i) => env(2 + i, ranOut, expired(p, p === "C" || p === "D" || p === "G" || p === "H" ? "T02" : "T01"))),
      env(9, ranOut, expired("E", "T03")), // no such deal: unmatched
      env(10, stamp(2026, "OFF_SUMMER", 1, 1), signed("B", "PRACTICE_SQUAD", "T02")),
    ];
    const ages: Record<string, number> = { A: 27, B: 30, C: 33, F: 25, G: 29, H: 31 };
    const opened = openExpiries(2026, events26, after, (id) => ages[id], cap, 2026);
    expect(opened.unmatched).toBe(1);
    expect(opened.below).toBe(1);
    expect(opened.open.map((x) => x.player)).toEqual(["A", "B", "C", "F", "G", "H"]);
    expect(opened.open.find((x) => x.player === "F")).toMatchObject({ settled: true, record: { e: 1, w1: 1, w2: 1, o: 1 } });
    expect(opened.open.find((x) => x.player === "B")!.record).toMatchObject({ s: 0.03, k: "NONE", a: 30, y: 2026, c: 0, t: 0 });
    // Only H's years were cut: F's deal (signed for 2024, its 2024 year kept) and every deal the walk signs are whole.
    expect(opened.open.filter((x) => x.record.t === 1).map((x) => x.player)).toEqual(["H"]);
    // Read with the walk starting in 2023, H's deal is one the walk signed: not flagged.
    expect(openExpiries(2026, events26, after, (id) => ages[id], cap, 2023).open.find((x) => x.player === "H")!.record.t).toBe(0);
    const f26 = followExpiries(opened.open, 2026, events26);
    expect(f26.find((x) => x.player === "A")).toMatchObject({ settled: true, record: { w1: 1, w2: 1, o: 1, r: 0, c: 0 } });
    expect(f26.find((x) => x.player === "B")!.settled).toBe(false);
    const events27 = [
      env(0, stamp(2027, "TRAINING_CAMP", 1, 1), retired("C", "LATE")),
      env(1, stamp(2027, "OFF_RESET_FA", 1, 3), signed("B", "VETERAN", "T03")),
      env(2, stamp(2027, "OFF_RESET_FA", 1, 4), signed("C", "VETERAN", "T02")), // after he retired: settled already
    ];
    const f27 = followExpiries(f26, 2027, events27);
    expect(f27.find((x) => x.player === "B")!.record).toMatchObject({ w1: 0, w2: 1, o: 0, c: 1 });
    expect(f27.find((x) => x.player === "C")!.record).toMatchObject({ w1: 0, w2: 0, o: null, r: 1, c: 1 });
    const f28 = followExpiries(f27, 2028, [env(0, stamp(2028, "OFF_RESET_FA", 1, 1), signed("G", "VETERAN", "T02"))]);
    expect(f28.find((x) => x.player === "G")).toMatchObject({ settled: false, record: { w1: 0, w2: 0, o: null, c: 2 } });
    expect(f28.every((x) => x.record.c === 2)).toBe(true);
    expect(expiryWindow(2026)).toEqual({ from: stamp(2026, "OFF_EVAL", 1, 1), oneYear: stamp(2027, "OFF_RESET_FA", 1, 1), twoYears: stamp(2028, "OFF_RESET_FA", 1, 1) });
  });

  it("retirements each way: the unsigned rule, his own choice while signed, his own choice while unsigned", () => {
    const before = { players: [
      man("U", { age: 30, cs: 5, position: "WR" }), man("S", { age: 33, cs: 10, position: "QB", team: "T01" }),
      man("O", { age: 28, cs: 3, position: "CB" }), man("Q", { age: 35, cs: 12, position: "K" }),
      man("E", { age: 31, cs: 8, position: "RB", team: "T01" }), man("L", { age: 29, cs: 6, position: "TE" }),
    ] };
    const ownChoice = (player: string): FranchiseEvent => ({ type: "PLAYER_RETIRED", payload: { player, timing: "SEASON_END" } } as FranchiseEvent);
    const at = stamp(2026, "REGULAR_SEASON", 18, 7);
    const draftDay = stamp(2026, "OFF_DRAFT", 1, 1);
    const events = [
      env(0, at, retired("U", "SEASON_END")), env(1, at, ownChoice("S")), env(2, at, ownChoice("O")), env(3, at, ownChoice("Q")), env(4, at, retired("X", "SEASON_END")),
      env(5, draftDay, ownChoice("E")), env(6, draftDay, ownChoice("L")),
    ];
    const after = { contracts: [
      // Q's deal ended RETIRED this season: he was signed though on no team's list.
      dealOf("Q", "T02", { seasons: [2026], hit: 1e6, at: stamp(2025, "OFF_RESET_FA", 1, 1), ended: { at, reason: "RETIRED" } }),
      // E was on T01 when the season began, but his deal ran out at the new league year, before he retired at the draft: unsigned.
      dealOf("E", "T01", { seasons: [2026], hit: 1e6, at: stamp(2025, "OFF_RESET_FA", 1, 1), ended: { at: stamp(2026, "OFF_RESET_FA", 1, 1), reason: "EXPIRED" } }),
      // L was on no team when the season began, then signed in free agency: signed when he retired.
      dealOf("L", "T02", { seasons: [2027], hit: 1e6, at: stamp(2026, "OFF_RESET_FA", 1, 2) }),
    ] };
    const { tally, reads } = retirementsOf(2026, events, before, after);
    expect(tally.unsigned).toEqual({ n: 2, byAge: { "30": 1, "?": 1 }, byCredited: { "5": 1, "?": 1 }, byGroup: { WR: 1, "?": 1 } });
    // S has no deal in the book: read by his team when the season began.
    expect(tally.ownSigned).toEqual({ n: 3, byAge: { "29": 1, "33": 1, "35": 1 }, byCredited: { "10": 1, "12": 1, "6": 1 }, byGroup: { K: 1, QB: 1, TE: 1 } });
    expect(tally.ownUnsigned).toEqual({ n: 2, byAge: { "28": 1, "31": 1 }, byCredited: { "3": 1, "8": 1 }, byGroup: { CB: 1, RB: 1 } });
    expect(reads.map((r) => `${r.player}:${r.way}`)).toEqual(["U:unsigned", "S:ownSigned", "O:ownUnsigned", "Q:ownSigned", "X:unsigned", "E:ownUnsigned", "L:ownSigned"]);
  });

  it("a deal live at a moment: signed by then and not ended before it; one ended that moment only if it ended RETIRED", () => {
    const at = stamp(2027, "OFF_DRAFT", 1, 1);
    const d = (signedOn: CalendarStamp, ended?: { at: CalendarStamp; reason: string }) => dealOf("p", "T01", { seasons: [2027], hit: 1, at: signedOn, ...(ended ? { ended } : {}) });
    const before = stamp(2026, "OFF_RESET_FA", 1, 1);
    expect(liveAt([d(before)], at)).toBe(true);
    expect(liveAt([d(stamp(2027, "OFF_DRAFT", 1, 2))], at)).toBe(false); // signed after
    expect(liveAt([d(at)], at)).toBe(true); // signed that moment
    expect(liveAt([d(before, { at: stamp(2027, "OFF_SUMMER", 1, 1), reason: "RELEASED" })], at)).toBe(true); // ended after
    expect(liveAt([d(before, { at: stamp(2026, "OFF_RESET_FA", 1, 1), reason: "EXPIRED" })], at)).toBe(false); // ended before
    expect(liveAt([d(before, { at, reason: "EXPIRED" })], at)).toBe(false);
    expect(liveAt([d(before, { at, reason: "RELEASED" })], at)).toBe(false);
    expect(liveAt([d(before, { at, reason: "RETIRED" })], at)).toBe(true);
    expect(liveAt([d(before, { at, reason: "EXPIRED" }), d(before)], at)).toBe(true);
    expect(liveAt([], at)).toBe(false);
  });

  it("a league-file deal with its early years cut: signed before the walk, its first real year after the league year signed", () => {
    const fileDeal = (signed: number, seasons: number[], voidYears: number[] = []) => dealOf("p", "T01", { seasons, hit: 1, at: stamp(signed - 1, "OFF_RESET_FA", 1, 1), voidYears });
    expect(cutFileDeal(fileDeal(2023, [2026, 2027]), 2026)).toBe(true);
    expect(cutFileDeal(fileDeal(2025, [2026]), 2026)).toBe(true);
    expect(cutFileDeal(fileDeal(2026, [2026, 2027]), 2026)).toBe(false); // signed for the file's season: every year kept
    expect(cutFileDeal(fileDeal(2023, [], [2026]), 2026)).toBe(false); // no real year: nothing to read
    // A deal the walk signed is whole even when its years start a year on (an extension signed in season).
    expect(cutFileDeal(dealOf("p", "T01", { seasons: [2028, 2029], hit: 1, at: stamp(2027, "REGULAR_SEASON", 5, 1) }), 2026)).toBe(false);
    expect(cutFileDeal(dealOf("p", "T01", { seasons: [2028, 2029], hit: 1, at: stamp(2027, "REGULAR_SEASON", 5, 1) }), 2028)).toBe(true);
  });

  it("the roster way: back on a 53 in either of the next two seasons, starters gone two seasons, retired within the next year", () => {
    const men = [{ id: "a", age: 25, starter: true }, { id: "b", age: 25, starter: false }, { id: "c", age: 33, starter: true }, { id: "d", age: null, starter: true }];
    expect(backOnA53(men, new Set(["a"]), new Set(["c"]))).toEqual({ "25": [2, 1], "33": [1, 1], "?": [1, 0] });
    const present = new Map([["a", [2027]], ["d", [2028]]]);
    expect(startersGone(men, (id, y) => present.get(id)?.includes(y) === true, 2026)).toEqual({ "25": [1, 0], "33": [1, 1], "?": [1, 0] });
    const retiredAt = new Map([
      ["c", { player: "c", at: stamp(2027, "TRAINING_CAMP", 1, 1), way: "ownSigned" as const }],
      // The cohort's own day: read before the day's players' steps, so a retirement at the season's end is in the window.
      ["b", { player: "b", at: stamp(2026, "REGULAR_SEASON", 18, 7), way: "ownSigned" as const }],
      // The next season's end: the next cohort's, not this one's.
      ["a", { player: "a", at: stamp(2027, "REGULAR_SEASON", 18, 7), way: "unsigned" as const }],
      ["d", { player: "d", at: stamp(2026, "REGULAR_SEASON", 18, 6), way: "unsigned" as const }], // before the cohort was read
    ]);
    expect(retiredNextYear(men, retiredAt, 2026)).toEqual({
      "25": { n: 2, unsigned: 0, ownSigned: 1, ownUnsigned: 0 }, "33": { n: 1, unsigned: 0, ownSigned: 1, ownUnsigned: 0 }, "?": { n: 1, unsigned: 0, ownSigned: 0, ownUnsigned: 0 },
    });
    // The next cohort (2027) reads a's retirement at its own season's end.
    expect(retiredNextYear([{ id: "a", age: 26, starter: true }], retiredAt, 2027)).toEqual({ "26": { n: 1, unsigned: 1, ownSigned: 0, ownUnsigned: 0 } });
  });

  it("availability: man-weeks on a 53, and of them out with an injury he cannot play on", () => {
    const players = [man("h", { age: 25, team: "T01" }), hurt(man("o", { age: 25, team: "T01" }), "SHORT", 2), hurt(man("p", { age: 30, team: "T01" }), "DAY_TO_DAY", 0, true), man("x", { age: 40 })];
    const team = { id: "T01", roster: ["h", "o", "p"], depthChart: {} } as unknown as Team;
    const into: AgeCounts = {};
    addAvailability(into, { teams: [team], players });
    addAvailability(into, { teams: [team], players });
    expect(into).toEqual({ "25": [4, 2], "30": [2, 0] });
  });
});

// --- the reader, driven by made-up days ----------------------------------------------------------

describe("the aging redesign's reader pieces (rows version 6, AB1)", () => {
  it("retirements by moment and way, and by years in the league ('?' not known); a read with no moment is left out of byMoment", () => {
    const at = stamp(2030, "REGULAR_SEASON", 18, 7);
    const reads: RetirementRead[] = [
      { player: "a", at, way: "unsigned", timing: "SEASON_END" }, { player: "b", at, way: "ownSigned", timing: "IMMEDIATE" },
      { player: "c", at, way: "ownSigned", timing: "IMMEDIATE" }, { player: "d", at, way: "unsigned" },
    ] as RetirementRead[];
    const first: Record<string, number> = { a: 2028, b: 2018, c: 2021 };
    const how = retiredHow(reads, (id) => (first[id] === undefined ? undefined : 2030 - first[id]!));
    expect(Object.keys(how.byMoment)).toEqual([...RETIREMENT_MOMENTS]);
    expect(how.byMoment.SEASON_END).toEqual({ unsigned: 1, ownSigned: 0, ownUnsigned: 0 });
    expect(how.byMoment.IMMEDIATE).toEqual({ unsigned: 0, ownSigned: 2, ownUnsigned: 0 });
    expect(how.byMoment.LATE).toEqual({ unsigned: 0, ownSigned: 0, ownUnsigned: 0 });
    expect(how.byYears).toEqual({ unsigned: { "2": 1, "?": 1 }, ownSigned: { "9": 1, "12": 1 }, ownUnsigned: {} });
    expect(Object.keys(how.byYears.ownSigned)).toEqual(["9", "12"]);
  });

  it("the roster way's retirements read by years in the league as well as by age", () => {
    const men = [{ id: "a", age: 30, starter: true, years: 8 }, { id: "b", age: 24, starter: false, years: 2 }, { id: "c", age: 33, starter: false, years: null }];
    const r = new Map<string, RetirementRead>([["a", { player: "a", at: stamp(2030, "OFF_EVAL", 1, 1), way: "ownSigned" } as RetirementRead]]);
    expect(retiredNextYear(men, r, 2030, (m) => m.years ?? null)).toEqual({
      "2": { n: 1, unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, "8": { n: 1, unsigned: 0, ownSigned: 1, ownUnsigned: 0 }, "?": { n: 1, unsigned: 0, ownSigned: 0, ownUnsigned: 0 },
    });
  });

  it("the teams' overall: starters' mean at their own positions, a short team null; its spread and the r against last season's", () => {
    const a = squad("T01", 70, 60), b = squad("T02", 66, 60), c = squad("T03", 62, 60);
    const short = { ...c.team, roster: c.team.roster.filter((id) => !String(id).startsWith("T03-s0")), depthChart: { ...c.team.depthChart, QB: [] } } as Team;
    const shortPlayers = c.players.filter((p) => p.bio.id !== "T03-s0" && p.bio.id !== "T03-b0");
    const now = teamOveralls({ teams: [a.team, b.team, { ...short, roster: short.roster.filter((id) => id !== "T03-b0") } as Team], players: [...a.players, ...b.players, ...shortPlayers] });
    expect(now.get("T01")).toBe(70);
    expect(now.get("T02")).toBe(66);
    expect(now.get("T03")).toBeNull();
    const teams = [{ id: "T01" }, { id: "T02" }, { id: "T03" }] as Team[];
    const first = teamOverallRow(now, teams, undefined);
    expect(first).toEqual({ byTeam: [70, 66, null], spread: 2, r: null });
    const last = new Map<string, number | null>([["T01", 64], ["T02", 60], ["T03", 50]]);
    expect(teamOverallRow(now, teams, last).r).toBeCloseTo(1, 12);
    expect(teamOverallRow(now, teams, new Map([["T01", 60]])).r).toBeNull();
  });

  it("the walk's draftees on a 53 at the season's end by round band and age in the season: [on a 53, started]", () => {
    const a = squad("T01", 70, 60);
    const r1 = man("R1", { position: "CB", team: "T01", age: 24, draft: { year: 2027, round: 1, pick: 5 } });
    const r2 = man("R2", { position: "CB", team: "T01", age: 23, draft: { year: 2028, round: 5, pick: 150 } });
    const r3 = man("R3", { position: "WR", team: "T01", age: 26, draft: { year: 2027, round: 2, pick: 40 } });
    const team = { ...a.team, roster: [...a.team.roster, "R1", "R2", "R3"], depthChart: { ...a.team.depthChart, CB: ["R1", ...(a.team.depthChart.CB ?? []), "R2"], WR: [...(a.team.depthChart.WR ?? []), "R3"] } } as Team;
    const draft: Record<string, { year: number; round: number }> = { R1: { year: 2027, round: 1 }, R2: { year: 2028, round: 5 }, R3: { year: 2027, round: 2 } };
    // At 2027's end (people past the year turn): R1 starts at 23, R3 is a backup at 25, R2's draft comes after 2027.
    expect(draftByAge(2027, { teams: [team], players: [...a.players, r1, r2, r3] }, (id) => draft[id])).toEqual({ "1": { "23": [1, 1] }, "2": { "25": [1, 0] }, "3": {}, "4-7": {} });
    expect(draftByAge(2028, { teams: [team], players: [...a.players, r1, r2, r3] }, (id) => draft[id])["4-7"]).toEqual({ "22": [1, 0] });
  });
});

describe("the reader on made-up days and seasons", () => {
  /** Two teams; a draftee starting at corner for T01; free agents a (unsigned a while) and b. */
  function world() {
    const a = squad("T01", 70, 60);
    const b = squad("T02", 66, 60);
    const rookie = man("R1", { position: "CB", team: "T01", rating: 75, cs: 0, draft: { year: 2027, round: 1, pick: 5 }, age: 22 });
    return { a, b, rookie };
  }
  const people = (teams: Team[], players: PlayerState[], freeAgents: string[] = [], unsignedSince: Record<string, CalendarStamp> = {}, more: Partial<SeasonPeople> = {}) => ({
    teams, players, picks: [], classes: [], freeAgents,
    playerMemory: { injuries: {}, grades: {}, battles: [], injuredStarters: [], weeksInJob: {}, unsignedSince },
    ...more,
  }) as unknown as SeasonPeople;
  /** The coaches: T01's head coach stays; T02's is fired after 2026 and a pool coach seated (one hire). */
  const lean = { incumbent: 100, veteran: 50, form: 0 };
  const staff26 = [coach("H1", { team: "T01", lineup: lean }), coach("H2", { team: "T02" }), coach("P1", { role: "OC" })];
  const staff27 = [staff26[0]!, coach("H2", { team: "T02", ended: true }), coach("P1", { team: "T02", lineup: lean })];
  /** The deals before 2026: T01's quarterback and receiver, and T02's quarterback. */
  const deals = (qb1: string, wr1: string, qb2: string) => [
    deal(qb1, "T01", stamp(2024, "OFF_RESET_FA", 1, 1)), deal(wr1, "T01", stamp(2023, "OFF_RESET_FA", 1, 1)), deal(qb2, "T02", stamp(2025, "OFF_RESET_FA", 1, 1)),
  ];
  const standings = (w1: number, w2: number) => [
    { team: "T01", overall: { wins: w1, losses: 17 - w1, ties: 0 } }, { team: "T02", overall: { wins: w2, losses: 17 - w2, ties: 0 } },
  ];
  const report = (team: string, ids: readonly string[], offense: number) => ids.map((player) => ({ player, team, snaps: { offense, defense: 0, special: 0 }, contests: [] }));

  /** `split`: save the reader after 2026 and carry on in a fresh one restored from the save (a checkpoint). */
  function drive(split = false) {
    const { a, b, rookie } = world();
    let reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 2, switches: { development: true, injuries: true } });
    const startTeams = [a.team, b.team];
    const qb1 = String(a.players[0]!.bio.id), qb2 = String(b.players[0]!.bio.id), wr1 = String(a.players[2]!.bio.id);
    const start = people(startTeams, [...a.players, ...b.players, man("FA1"), man("FA2")], ["FA1", "FA2"], {}, { staff: staff26, contracts: deals(qb1, wr1, qb2) });
    const camp26 = stamp(2026, "TRAINING_CAMP", 1, 1);
    // 2026: camp opens (FA1 and FA2 new), week 1, a game, week 8, week 18's last day, then the season ends.
    reader.onDay(2026, camp26, start, []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 1), start, []);
    const game = { game: { home: "T01", away: "T02", kind: "REGULAR" }, result: {}, extras: { participation: [...report("T01", [qb1, wr1], 60), ...report("T02", [qb2], 50)] } };
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 7), start, [game] as never);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 8, 1), start, []);
    // On the regular season's last day T01's tight end is out with a long injury: on the 53, but not on the NFL's count of it.
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 18, 7), { ...start, players: start.players.map((p) => (p.bio.id === "T01-s5" ? hurt(p, "LONG", 3) : p)) }, []);
    // After 2026: everyone on a 53 credited; the draft brings the rookie; FA1 retired at the season's end; one emergency deal.
    const credit = (p: PlayerState) => (p.teamId === undefined ? p : { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1, age: p.bio.age + 1 } });
    const t01 = { ...a.team, roster: [...a.team.roster, rookie.bio.id], depthChart: { ...a.team.depthChart, CB: [rookie.bio.id, ...(a.team.depthChart.CB ?? [])] } };
    // T02's quarterback's deal ran out at the league year (20 million a year): an expiry, signed again by T01 the next day.
    const ranOut = stamp(2026, "OFF_RESET_FA", 1, 1);
    const qb2Deal = dealOf(qb2, "T02", { seasons: [2026], hit: 20e6, at: stamp(2025, "OFF_RESET_FA", 1, 1), ended: { at: ranOut, reason: "EXPIRED" } });
    const end26 = people([t01, b.team], [...a.players.map(credit), ...b.players.map(credit), { ...rookie, bio: { ...rookie.bio, age: 23 } }, man("FA2", { age: 26 })], ["FA2"], { FA2: camp26 }, { staff: staff27, contracts: [qb2Deal] });
    // The league year: T01 re-signs its quarterback (26 in 2026) and releases its receiver (26), T02's quarterback goes to T01; the rookie's deal is no veteran's.
    const envelopes: FranchiseEventEnvelope[] = [
      { seq: 0, at: stamp(2026, "REGULAR_SEASON", 18, 7), event: retired("FA1", "SEASON_END") },
      { seq: 1, at: stamp(2026, "REGULAR_SEASON", 5, 7), event: signed("FA9", "MINIMUM") },
      { seq: 2, at: stamp(2026, "OFF_DRAFT", 3, 4), event: { type: "DRAFT_PICK_MADE", payload: { team: "T01", player: "R1", round: 1, pick: 5 } } as FranchiseEvent },
      { seq: 3, at: stamp(2026, "OFF_EVAL", 1, 1), event: { type: "STAFF_DEPARTED", payload: { staff: "H2", team: "T02", reason: "FIRED" } } as FranchiseEvent },
      { seq: 4, at: stamp(2026, "OFF_EVAL", 1, 1), event: { type: "STAFF_HIRED", payload: { staff: "P1", team: "T02", role: "HEAD_COACH" } } as FranchiseEvent },
      { seq: 5, at: stamp(2026, "OFF_EVAL", 1, 1), event: { type: "STAFF_HIRED", payload: { staff: "P7", team: "T02", role: "OC" } } as FranchiseEvent },
      { seq: 6, at: stamp(2026, "OFF_RESET_FA", 1, 1), event: signed(qb1, "EXTENSION") },
      { seq: 7, at: stamp(2026, "OFF_RESET_FA", 1, 1), event: released(wr1) },
      { seq: 8, at: stamp(2026, "OFF_RESET_FA", 1, 2), event: signed(qb2, "VETERAN", "T01") },
      { seq: 9, at: stamp(2026, "OFF_DRAFT", 3, 4), event: signed("R1", "ROOKIE") },
      { seq: 10, at: ranOut, event: expired(qb2, "T02") },
    ];
    const run26 = { state: { standings: standings(12, 5) }, events: envelopes, stepEvents: [{ step: "players:unsigned", envelope: envelopes[0]! }, { step: "players:week", envelope: envelopes[1]! }] } as unknown as SeasonRun;
    reader.onRun(2026, envelopes.map((e) => e.event), end26, { run: run26, before: start });
    expect(end26.staff).toBe(staff27);
    if (split) {
      const saved = JSON.parse(JSON.stringify(reader.save()));
      reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 2, switches: { development: true, injuries: true } });
      reader.restore(saved);
    }
    // 2027: FA2 still unsigned at camp (a full league year by then); the rookie starts at corner by week 8.
    reader.onDay(2027, stamp(2027, "TRAINING_CAMP", 1, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 1, 1), end26, []);
    const game27 = { game: { home: "T02", away: "T01", kind: "REGULAR" }, result: {}, extras: { participation: [...report("T01", [qb1], 70), ...report("T02", [qb2], 70)] } };
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 1, 7), end26, [game27] as never);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 8, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 18, 7), end26, []);
    const end27 = people(end26.teams, end26.players.map((p) => credit(p)), [], {}, { staff: staff27 });
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
    // The league year's three deals carry no step here, so they count as the year turn's (none is a minimum deal).
    expect(y0.signings).toEqual({ emergency: 1, bargain: 0, yearTurn: 0, byStep: { "players:week": 1, turn: 3 } });
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
    expect(Object.keys(rows.usage.bySeason)).toEqual(["2026"]);
    expect(rows.usage.bySeason["2026"]).toEqual(rows.usage.cells);
    // Each team's 25 starting slots at week 8; the rookie heads 2027's corners.
    expect(y0.slots).toHaveLength(50);
    expect(y1.slots[SLOT_POSITIONS.slice(0, SLOT_POSITIONS.indexOf("CB")).reduce((n, p) => n + STARTING[p], 0)]).toBe("R1");
    expect(rows.careers.routes).toEqual({ FILE: 58, DRAFT: 1, UDFA: 0 });
    expect(rows.careers.entrants).toEqual([{ e: 2027, g: "CB", o: "CB", r: "DRAFT", n: 1, c: 1, x: 0, t: null, w: null }]);
    expect(rows.draft).toBe(draft);
    expect(qb1).toBe("T01-s0");
    // The cap's moves by age in 2026 (everyone 26 here); FA9's emergency deal has no deal before it, so it is neither.
    expect(rows.version).toBe(CAREER_ROWS_VERSION);
    const at26 = (n: number) => ({ n, mean: n === 0 ? 0 : 26, histogram: Array.from({ length: 20 }, (_, i) => (i === 26 - 21 ? n : 0)), unknown: 0 });
    expect(y0.moves).toEqual({
      released: at26(1), releasedByStep: { turn: at26(1) }, reSigned: at26(1), newTeam: at26(1),
      reSignedByKind: { EXTENSION: at26(1) }, newTeamByKind: { VETERAN: at26(1) },
    });
    expect(y1.moves).toEqual({ released: at26(0), releasedByStep: {}, reSigned: at26(0), newTeam: at26(0), reSignedByKind: {}, newTeamByKind: {} });
    // The coaches: T02 changed head coach after 2026 (one head coach hired); at 2027's week 8 the new man has the leanings stored.
    expect(y0.coaches).toEqual({ headCoachChanges: 1, headCoachHires: 1, week8: { n: 2, unset: 1, incumbent: 100, veteran: 50, form: 0 } });
    expect(y1.coaches).toEqual({ headCoachChanges: 0, headCoachHires: 0, week8: { n: 2, unset: 0, incumbent: 100, veteran: 50, form: 0 } });
    // Rows version 5. Nobody hurt: the NFL's count of the 53 is the plain one.
    expect(y0.week8Nfl).toEqual(y0.week8);
    expect(y0.week8NflWeeksLeft).toEqual(y0.week8);
    expect(y0.nflCount).toEqual({ onRosters: 56, leftOut: 0, leftOutWeeksLeft: 0, sizes: { before: [28, 28], after: [28, 28], afterWeeksLeft: [28, 28] } });
    expect(y1.nflCount?.onRosters).toBe(57);
    // Availability: two regular-season day-1s in each season (week 1 and week 8), nobody out.
    expect(y0.availability).toEqual({ "22": [4, 0], "26": [104, 0], "34": [4, 0] });
    expect(y1.availability).toEqual({ "23": [6, 0], "27": [104, 0], "35": [4, 0] });
    // Retirements each way: FA1 by the unsigned rule at the end of 2026, FA2 at 2027's camp.
    expect(y0.retirements.unsigned).toEqual({ n: 1, byAge: { "25": 1 }, byCredited: { "0": 1 }, byGroup: { WR: 1 } });
    expect(y0.retirements.ownSigned.n + y0.retirements.ownUnsigned.n).toBe(0);
    expect(y1.retirements.unsigned).toMatchObject({ n: 1, byAge: { "26": 1 } });
    // The roster way: 2026's final-week 53s counted like the NFL (the tight end out 4+ weeks left out, though he
    // counts on the 53 at week 18 above), closed for retirements at 2027 (nobody on them retired);
    // a two-season cohort needs a third season.
    expect(rows.exits.retiredNextYear).toEqual([{ y: 2026, byAge: {
      "22": { n: 2, unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, "26": { n: 51, unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, "34": { n: 2, unsigned: 0, ownSigned: 0, ownUnsigned: 0 },
    } }]);
    expect(rows.exits.backOnA53).toEqual([]);
    expect(rows.exits.startersGone).toEqual([]);
    // Signed again: T02's quarterback (26 in 2026), his deal's share of the 2026 cap, a new team inside one league year,
    // carried through the checkpoint and still open (one season of two) at the walk's end.
    const share = 20e6 / capForecast("s")(2026);
    expect(share).toBeGreaterThan(EXPIRY_MIN_CAP_SHARE);
    expect(rows.market).toEqual({
      minCapShare: EXPIRY_MIN_CAP_SHARE, unmatched: 0, below: 0,
      expiries: [{ y: 2026, a: 26, s: share, k: "NONE", w1: 1, w2: 1, o: 0, r: 0, e: 0, c: 1, t: 0 }],
    });
  });

  it("the same days and seasons give the same rows", () => {
    expect(JSON.stringify(drive().rows)).toBe(JSON.stringify(drive().rows));
  });

  it("a reader saved between seasons and restored into a fresh one gives the unbroken reader's rows", () => {
    expect(JSON.stringify(drive(true).rows)).toBe(JSON.stringify(drive().rows));
  });

  it("the roster way's 53s by season and its final-week cohort are counted like the NFL; the credited cross-check keeps the whole 53", () => {
    const { a, b } = world();
    const reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 1, switches: { development: true, injuries: true } });
    const all = [...a.players, ...b.players];
    const start = people([a.team, b.team], all);
    const hurtOn = (id: string, band: "SHORT" | "LONG" | "MAJOR") => people([a.team, b.team], all.map((p) => (p.bio.id === id ? hurt(p, band, 5) : p)));
    reader.onDay(2026, stamp(2026, "TRAINING_CAMP", 1, 1), start, []);
    // Week 1: T01's back is out for a major injury, T02's out short; week 2 the back is still out. Week 18: T01's receiver out long.
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 1), people([a.team, b.team], all.map((p) => (p.bio.id === "T01-s1" ? hurt(p, "MAJOR", 9) : p.bio.id === "T02-s1" ? hurt(p, "SHORT", 2) : p))), []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 2, 1), hurtOn("T01-s1", "MAJOR"), []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 18, 7), hurtOn("T01-s2", "LONG"), []);
    const run = { state: { standings: [] }, events: [], stepEvents: [] } as unknown as SeasonRun;
    reader.onRun(2026, [], start, { run, before: start });
    const state: CareerReaderState = reader.save();
    const on53 = new Map(state.on53);
    expect(on53.get(2026)).toHaveLength(55);
    expect(on53.get(2026)).not.toContain("T01-s1");
    expect(on53.get(2026)).toContain("T02-s1");
    const cohort = state.finalWeeks.find((c) => c.season === 2026)!.men.map((m) => m.id);
    expect(cohort).toHaveLength(55);
    expect(cohort).not.toContain("T01-s2");
    expect(cohort).toContain("T01-s1");
    expect(state.rows[0]!.credited.week18).toBe(56);
  });

  /**
   * Rows version 6 (ADR-087 §12, AB1) on made-up days: one game a season with contests, a reserve list,
   * injuries of every setting and band, a concussion and a later one across the season split.
   */
  function drive6(split = false) {
    const a = squad("T01", 70, 60, (i) => (i === 1 ? 27 : 26));
    const b = squad("T02", 66, 60);
    const hurtR0 = hurt(man("T01-r0", { position: "WR", team: "T01", age: 30, cs: 8 }), "SHORT", 2);
    const healthyR1 = man("T01-r1", { position: "WR", team: "T01", age: 29, cs: 7 });
    const t01: Team = { ...a.team, reserve: ["T01-r0", "T01-r1"] } as Team;
    const rookie = man("R1", { position: "CB", team: "T01", rating: 75, cs: 0, draft: { year: 2027, round: 1, pick: 5 }, age: 23 });
    const start = people([t01, b.team], [...a.players, ...b.players, hurtR0, healthyR1, man("FA1", { cs: 3 })], ["FA1"]);
    let reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 2, switches: { development: true, injuries: true } });
    const c = (attr: string, won: number, lost: number) => ({ attr, won, lost });
    const played = (player: string, team: string, snaps: { offense?: number; defense?: number; special?: number }, contests: ReturnType<typeof c>[] = []) =>
      ({ player, team, snaps: { offense: snaps.offense ?? 0, defense: snaps.defense ?? 0, special: snaps.special ?? 0 }, contests });
    const injury = (player: string, at: CalendarStamp, setting: string, band: string, weeks: number, kind = "hamstring"): FranchiseEventEnvelope =>
      ({ seq: 0, at, event: { type: "INJURY_OCCURRED", payload: { player, kind, weeks, setting, band } } as FranchiseEvent });
    const game = (home: string, away: string, participation: ReturnType<typeof played>[]) => ({ game: { home, away, kind: "REGULAR" }, result: {}, extras: { participation } });
    const wk1 = (y: number) => stamp(y, "REGULAR_SEASON", 1, 7);
    reader.onDay(2026, stamp(2026, "TRAINING_CAMP", 1, 1), start, []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 1, 1), start, []);
    reader.onDay(2026, wk1(2026), start, [game("T01", "T02", [
      played("T01-s0", "T01", { offense: 60 }),
      // The back: carry {elusiveness 3, power 2, yac 1} counts 3; security 0.
      played("T01-s1", "T01", { offense: 30, special: 5 }, [c("elusiveness", 2, 1), c("power", 1, 1), c("yac", 0, 1), c("ballSecurity", 0, 0)]),
      // The left tackle: protect {passBlock 6, anchor 4} counts 6, runBlock 4.
      played("T01-s6", "T01", { offense: 60 }, [c("passBlock", 4, 2), c("anchor", 3, 1), c("runBlock", 2, 2)]),
      played("T01-s23", "T01", { special: 5 }),
      played("T02-s0", "T02", { offense: 50 }),
      // The outside linebacker: tackle {tackling 3, blockShed 1} counts 3, rush {passRush 6, powerMove 2} counts 6.
      played("T02-s15", "T02", { defense: 55 }, [c("tackling", 2, 1), c("blockShed", 1, 0), c("passRush", 3, 3), c("powerMove", 1, 1)]),
    ])] as never);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 8, 1), start, []);
    reader.onDay(2026, stamp(2026, "REGULAR_SEASON", 18, 7), start, []);
    const credit = (p: PlayerState) => (p.teamId === undefined ? p : { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1, age: p.bio.age + 1 } });
    const t01next = { ...t01, roster: [...t01.roster, rookie.bio.id], depthChart: { ...t01.depthChart, CB: [rookie.bio.id, ...(t01.depthChart.CB ?? [])] } } as Team;
    const end26 = people([t01next, b.team], [...a.players.map(credit), ...b.players.map(credit), credit(hurtR0), credit(healthyR1), rookie], []);
    const events26: FranchiseEventEnvelope[] = [
      injury("T01-s1", wk1(2026), "GAME", "SHORT", 2),
      injury("T02-s15", wk1(2026), "PRACTICE", "LONG", 5, "concussion"),
      injury("T01-s2", wk1(2026), "GAME", "SHORT", 1), // he did not play: not after a game played
      injury("T01-s6", wk1(2026), "AWAY", "SHORT", 1), // away from football: left out
      injury("T01-s0", wk1(2026), "GAME", "DAY_TO_DAY", 0), // no time lost: left out
      { seq: 0, at: stamp(2026, "REGULAR_SEASON", 18, 7), event: retired("FA1", "SEASON_END") },
    ].map((e, i) => ({ ...e, seq: i }));
    const run26 = { state: { standings: standings(12, 5) }, events: events26, stepEvents: [] } as unknown as SeasonRun;
    reader.onRun(2026, events26.map((e) => e.event), end26, { run: run26, before: start });
    if (split) {
      const saved = JSON.parse(JSON.stringify(reader.save()));
      reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 2, switches: { development: true, injuries: true } });
      reader.restore(saved);
    }
    reader.onDay(2027, stamp(2027, "TRAINING_CAMP", 1, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 1, 1), end26, []);
    reader.onDay(2027, wk1(2027), end26, [game("T02", "T01", [
      played("T01-s0", "T01", { offense: 70 }),
      played("T01-s1", "T01", { offense: 40 }, [c("elusiveness", 1, 1)]),
      played("R1", "T01", { defense: 50 }),
      played("T02-s15", "T02", { defense: 50 }, [c("tackling", 1, 0)]),
    ])] as never);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 8, 1), end26, []);
    reader.onDay(2027, stamp(2027, "REGULAR_SEASON", 18, 7), end26, []);
    const end27 = people(end26.teams, end26.players.map(credit), []);
    const events27 = [{ ...injury("T02-s15", wk1(2027), "GAME", "SHORT", 2, "concussion"), seq: 0 }];
    const run27 = { state: { standings: standings(9, 8) }, events: events27, stepEvents: [] } as unknown as SeasonRun;
    reader.onRun(2027, events27.map((e) => e.event), end27, { run: run27, before: end26 });
    return reader.rows({ drafts: 2, roundOneShare: {}, starterRate: {}, everStarter: {}, perYear: [] });
  }

  it("rows version 6: spots, snaps and contact by roll sets, injuries per snap, game weeks, concussions, retirements, team overall, draftees by age", () => {
    const rows = drive6();
    const [y0, y1] = rows.perSeason as [SeasonRow, SeasonRow];
    // Snaps at the spot played (the chart key), the injuries after a game he played, the one that was not.
    expect(y0.exposure).toEqual({
      cells: { "26": { QB: [110, 0, 0], LT: [60, 0, 0], OLB: [55, 1, 0], K: [5, 0, 0] }, "27": { RB: [35, 1, 1] } },
      notAfterPlayed: 1,
    });
    expect(y0.contact.bySpot).toEqual({ QB: [110, 0], RB: [35, 3], LT: [60, 10], OLB: [55, 9], K: [5, 0] });
    // Career contact at 27: the back in 2026 (a league-file man, so not an entrant); in 2027 the quarterback and the linebacker, carried over the split.
    expect(y0.contact.at27).toEqual({ entrants: [], all: [3] });
    expect(y1.contact.at27).toEqual({ entrants: [], all: [0, 10] });
    expect(y1.contact.bySpot).toEqual({ QB: [70, 0], RB: [40, 2], OLB: [50, 1], CB: [50, 0] });
    // Game weeks: every man on the 53s (K, P, LS left out), the man hurt on T01's reserve list missed, the healthy one there not counted.
    expect(y0.gameWeeks).toEqual({ "22": [2, 0], "26": [45, 0], "27": [1, 0], "30": [1, 1], "34": [2, 0] });
    // Concussions: the linebacker's first (out 5 weeks) in 2026, his later one in 2027 (the count carried between seasons).
    expect(y0.concussions).toEqual({ first: [1, 1], repeat: [0, 0], byAge: { "26": [1, 1, 0] } });
    expect(y1.concussions).toEqual({ first: [0, 0], repeat: [1, 0], byAge: { "27": [1, 0, 1] } });
    // FA1 (three credited seasons at the start) retired unsigned at 2026's end.
    expect(y0.retiredHow.byMoment.SEASON_END).toEqual({ unsigned: 1, ownSigned: 0, ownUnsigned: 0 });
    expect(y0.retiredHow.byMoment.LATE).toEqual({ unsigned: 0, ownSigned: 0, ownUnsigned: 0 });
    expect(y0.retiredHow.byYears).toEqual({ unsigned: { "3": 1 }, ownSigned: {}, ownUnsigned: {} });
    // The final-week cohort of 2026 by years in the league, closed at 2027.
    expect(rows.exits.retiredNextYearByYears).toEqual([{ y: 2026, byYears: {
      "0": { n: 2, unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, "3": { n: 52, unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, "11": { n: 2, unsigned: 0, ownSigned: 0, ownUnsigned: 0 },
    } }]);
    // The teams' overall at week 8: every starter rates his team's number; 2027's rookie corner lifts T01.
    expect(y0.teamOverall).toEqual({ byTeam: [70, 66], spread: 2, r: null });
    expect(y1.teamOverall!.byTeam[0]).toBeGreaterThan(70);
    expect(y1.teamOverall!.r).toBeCloseTo(1, 12);
    // The draftee on a 53 at 2027's end, round 1, started, 23 in the season; 2026 had none.
    expect(y0.draftEnd).toEqual({ "1": {}, "2": {}, "3": {}, "4-7": {} });
    expect(y1.draftEnd).toEqual({ "1": { "23": [1, 1] }, "2": {}, "3": {}, "4-7": {} });
    // Week 8: the ability picture and durability by concussions had (nobody's memory holds one here).
    expect(y0.ability!.byAge["27"]!.SPEED).toEqual([1, 70]);
    expect(y0.ability!.at99.total).toBe(0);
    expect(y0.durabilityByConcussions!["0"]![0]).toBe(56);
    expect(y0.durabilityByConcussions!["1"]).toEqual([0, 0, 0]);
  });

  it("rows version 6: the same days give the same rows, and a reader saved between seasons gives the unbroken reader's", () => {
    expect(JSON.stringify(drive6())).toBe(JSON.stringify(drive6()));
    expect(JSON.stringify(drive6(true))).toBe(JSON.stringify(drive6()));
  });

  it("refuses a save in the middle of a season, and a restore into a reader that has read a day", () => {
    const reader = careerReader({ seed: "s", firstSeason: 2026, seasons: 1, switches: { development: true, injuries: true } });
    const saved = reader.save();
    const { a } = world();
    reader.onDay(2026, stamp(2026, "TRAINING_CAMP", 1, 1), people([a.team], a.players), []);
    expect(() => reader.save()).toThrow(/half read/);
    expect(() => reader.restore(saved)).toThrow(/fresh/);
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
  it("a walk stopped at a season's checkpoint and resumed from it gives the unbroken walk's rows", () => {
    const input = { seed: "career-check-resume", file, seasons: 3, players: { development: true, injuries: true } } as const;
    const straight = withMadeUpSeasons(() => runCareerCheck(input));
    let saved: CareerCheckpoint | undefined;
    const seen: number[] = [];
    expect(() => withMadeUpSeasons(() => runCareerCheck(input, {
      onCheckpoint: (cp) => { seen.push(cp.seasonsDone); if (cp.seasonsDone === 2) { saved = cp; throw new Error("stopped"); } },
    }))).toThrow("stopped");
    expect(seen).toEqual([1, 2]);
    expect(saved!.reader.rows.map((r) => r.season)).toEqual([2026, 2027]);
    const resumed = withMadeUpSeasons(() => runCareerCheck(input, { resume: saved! }));
    expect(JSON.stringify(resumed)).toBe(JSON.stringify(straight));
    // The draft reader carried on too: one draft a season, three in all.
    expect(resumed.draft.drafts).toBe(3);
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
    // Year 0's 53s are all league-file men, whose first season is the file's years_exp back from
    // 2026: the first-season reading and the no-credit reading agree there.
    expect(y0!.week8!.rookieShare).toBeGreaterThan(0.1);
    expect(y0!.week8!.rookieShare).toBe(y0!.week8!.noCreditShare);
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
    // Rows version 5: the 53s counted like the NFL leave out the men hurt 4+ weeks (some, never most);
    // the deals that ran out are opened, followed one season of two; availability on each week's day 1.
    const count = y0!.nflCount!;
    expect(count.onRosters).toBe(y0!.week8!.players);
    expect(count.leftOut).toBeGreaterThan(0);
    expect(count.leftOut).toBeLessThan(count.onRosters / 5);
    expect(count.leftOutWeeksLeft).toBeLessThanOrEqual(count.leftOut);
    expect(y0!.week8Nfl!.players).toBe(count.onRosters - count.leftOut);
    expect(y0!.week8NflWeeksLeft!.players).toBe(count.onRosters - count.leftOutWeeksLeft);
    expect(y0!.week8Nfl!.rookieAge.n).toBeGreaterThan(150);
    expect(rows.market.expiries.length).toBeGreaterThan(100);
    expect(rows.market.expiries.every((x) => x.y === 2026 && x.c === 0 && x.s >= rows.market.minCapShare)).toBe(true);
    const manWeeks = Object.values(y0!.availability).reduce((s, [n]) => s + n, 0);
    expect(manWeeks).toBeGreaterThan(18 * 32 * 50);
    expect(y0!.retirements.unsigned.n).toBe(Object.values(y0!.unsigned.retired).reduce((s, w) => s + w.under1 + w["1to2"] + w["2plus"] + w.unknown, 0));
    // Rows version 6 (AB1), measure-only: every regular-season snap at a spot (17 games a team, both sides and special teams),
    // injuries after a game played, contact at the contact spots, a game week for every man on a 53 each game.
    const cells = Object.values(y0!.exposure.cells).flatMap((spots) => Object.values(spots));
    const snaps = cells.reduce((n, c) => n + c[0], 0);
    expect(snaps).toBeGreaterThan(272 * 2 * 120);
    expect(cells.reduce((n, c) => n + c[1], 0)).toBeGreaterThan(272);
    expect(Object.values(y0!.contact.bySpot).reduce((n, c) => n + c[0], 0)).toBe(snaps);
    expect(y0!.contact.bySpot.LT![1]).toBeGreaterThan(0);
    expect(y0!.contact.bySpot.RB![1] / y0!.contact.bySpot.RB![0]).toBeGreaterThan(y0!.contact.bySpot.QB![1] / y0!.contact.bySpot.QB![0]);
    expect(y0!.contact.at27.all.length).toBeGreaterThan(50);
    const gameWeeks = Object.values(y0!.gameWeeks).reduce((n, [w]) => n + w, 0);
    expect(gameWeeks).toBeGreaterThan(272 * 2 * 45);
    expect(y0!.ability!.at99.total).toBe(y0!.week8!.ratings.at99);
    expect(y0!.teamOverall!.byTeam).toHaveLength(32);
    expect(y0!.teamOverall!.r).toBeNull();
    expect(Object.values(y0!.retiredHow.byMoment).reduce((n, w) => n + w.unsigned, 0)).toBe(y0!.retirements.unsigned.n);
    expect(y0!.concussions.first[0]).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  }, 900_000);
});
