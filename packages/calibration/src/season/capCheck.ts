/**
 * THE CAP OVER SEVERAL YEARS (ADR-085 §7, the multi-season check).
 *
 * Plays the stand-in league (ADR-088) through the real sim for several seasons in a row. Each
 * season runs through its offseason (`through: "YEAR"`) with the league year (ADR-085) and the
 * draft (ADR-086) in the walk. The league year sets the cap, re-signs and tags, lets deals run out,
 * runs free agency and keeps every team under the cap. The draft makes the picks, signs the
 * rookies and turns the year. After each year it measures the money the way OverTheCap counts it,
 * so the numbers can be set against the real league's, and each season it splits the cap at week 1
 * by kind and size of deal (ADR-085 step 14: the middle class).
 *
 * Reaches franchise through `runSeason`, `buildLeague`, `buildStaff`, `capForecast` and `teamCapTotal`
 * (ADR-078 R1 amendment 3, ADR-085 Q10), and attributes through `generateDraftClass` (ADR-086 R1).
 *
 * The players' switches (ADR-087 §9; the 20-season check, D5b): the league file carries every
 * player's growth record and today's injuries (ADR-087 §2.5), and with `players` switched on the walk
 * plays them, as the season command's stand-in run does (`runRealSeason`): the file's records are read
 * for the switch that uses them, the teams carry their practice squads, the head coaches keep their
 * depth-chart leanings, each draft class comes with growth records when development is on, and
 * franchise's players' steps (growth and aging, injuries, the weekly depth chart, emergency signings,
 * unsigned retirements) run in the walk. The coaches live in the walk too, as they do in the season
 * command's: the whole coaching world rides in the people (`people.coaching`), each team meets the day
 * after its season ends (ADR-081) and the coaching carousel changes the staffs after the playoffs
 * (ADR-084). Absent, or both off, the walk is exactly what it was: the staff never changes.
 *
 * Watchers for the checks built on this walk: `onDay` sees every day's people, `onEvent` every event
 * as it happens, and `onRun` the whole season's run. They only watch: the walk is the same with or
 * without them.
 */
import {
  compareStamps, positionOverall,
  type CalendarStamp, type FranchiseEvent, type PlayerContract, type PlayerId, type PlayerState, type Position, type StaffState,
} from "@ff/contracts";
import { buildLeague, buildStaff, capForecast, runSeason, teamCapTotal, type League, type SeasonRun } from "@ff/franchise";
import { generateDraftClass } from "@ff/attributes";
import type { CallerVersion } from "../caller/anticipate.js";
import { unfilledPosition } from "./lineup.js";
import { peopleResolver, type PlayerSwitches, type SeasonPeople } from "./realSeason.js";
import { buildStandInLeague, type readStandInFile } from "./standInLeague.js";

type StandInFile = ReturnType<typeof readStandInFile> & {
  readonly contracts?: PlayerContract[];
  readonly deadMoney?: NonNullable<SeasonPeople["deadMoney"]>;
  readonly picks?: SeasonPeople["picks"];
};

/** What `runSeason` takes, read off its own type (calibration may name `runSeason` alone, ADR-078 R1). */
type SeasonInput = Parameters<typeof runSeason>[0];
/** One of `runSeason`'s day steps, typed off its input: franchise's `DayStep` is not on R1's list. */
type SeasonDayStep = NonNullable<SeasonInput["daySteps"]>[number];
/** The games played on a day, each with what the resolver handed back beside the score (the who-played report). */
export type CapCheckDayGames = Parameters<SeasonDayStep["run"]>[1]["games"];

/** What `onRun` is handed beside a season's bare events. */
export interface CapCheckRun {
  /** The season's run as `runSeason` returned it: the events with their stamps, each step's events with its id, the season's state. */
  readonly run: SeasonRun;
  /** The people the season started with (what `runSeason` was handed). */
  readonly before: SeasonPeople;
}

export interface CapCheckInput {
  readonly seed: string;
  readonly file: StandInFile;
  /** How many seasons to play, from the file's season. */
  readonly seasons: number;
  readonly callerVersion?: CallerVersion;
  /**
   * ADR-087 (D5b): growth and aging, injuries, or both, in the walk. Absent or both off, the walk is
   * today's: no growth records, copied injuries or practice squads are read, and no players' step runs.
   */
  readonly players?: PlayerSwitches;
  /** After each season, with what it measured. */
  readonly onYear?: (year: CapYear) => void;
  /**
   * After each season, with its events and the people it ended with (for other checks to measure), and
   * the run itself with the people it started from. Watches only; it must not change what it is handed.
   */
  readonly onRun?: (season: number, events: readonly FranchiseEvent[], people: SeasonPeople, more: CapCheckRun) => void;
  /**
   * Every day the walk passes, after that day's games and before any other step (the players', the
   * league year's, the draft's), with the people as they stand and the day's games. Watches only: what
   * it returns is ignored, and it must not change what it is handed (the people are the walk's own).
   * It may throw to end the walk.
   */
  readonly onDay?: (season: number, day: CalendarStamp, people: SeasonPeople, games: CapCheckDayGames) => void;
  /** Each event as the season adds it, with the season's schedule (`runSeason`'s own `onEvent`). Watches only. */
  readonly onEvent?: NonNullable<SeasonInput["onEvent"]>;
  /**
   * ADR-085 step 14: count each season's cap at week 1 (`capSplit`, kept as `CapYear.weekOne`): one
   * more day step, after `onDay`'s, that only looks. The cap-check command turns it on. Absent, the
   * walk's input is as before and no year carries the split.
   */
  readonly weekOneSplit?: boolean;
  /**
   * The coaches, changed at the start of every season (`transformStaff`): for an arm that sets every
   * head coach's depth-chart leanings (`StaffState.lineup`). Switched on, the carousel can seat a new
   * head coach after any season's playoffs, so the walk hands this the people's whole staff again
   * before each season, and the new man takes the arm's leanings before he coaches a game. It must
   * leave its own output as it is. Absent, the staff is `buildStaff`'s and the carousel's.
   */
  readonly staffTransform?: (staff: readonly StaffState[]) => StaffState[];
  /**
   * Start part-way (a checkpoint, for the 20-season check): `seasonsDone` seasons already played, and
   * the people the next season starts from, as `onSeasonEnd` handed them (the coaching world with
   * them). Everything else the walk needs is built again from the input. `onYear` and the returned
   * years cover the seasons played here only. Absent, the walk starts at the file's season, as before.
   */
  readonly resume?: { readonly seasonsDone: number; readonly people: SeasonPeople };
  /**
   * After each season, once the people the next season starts from are settled (after `onRun`, the
   * limbo sweep and `onYear`): what a checkpoint keeps. Watches only; it may throw to end the walk.
   */
  readonly onSeasonEnd?: (season: number, people: SeasonPeople) => void;
  /**
   * ADR-085 step 14: how free agency sets prices (`LeagueYearConfig.marketPrices`). Absent or
   * "calendar", today's market; "offers", the four rules of the design "Free agency: prices from the
   * offers" (switched off by default while the middle class is looked at).
   */
  readonly marketPrices?: "calendar" | "offers";
}

/** One position group's share of the money. OverTheCap's groups. */
export const CAP_GROUPS: Readonly<Record<string, readonly Position[]>> = {
  QB: ["QB"], RB: ["RB", "FB"], WR: ["WR"], TE: ["TE"], OL: ["LT", "LG", "C", "RG", "RT"],
  IDL: ["DT", "NT"], EDGE: ["DE", "OLB"], LB: ["MLB", "ILB"], CB: ["CB"], S: ["FS", "SS"], ST: ["K", "P", "LS"],
};

export interface CapYear {
  /** The league year measured: the season the money is for (the walk's season + 1). */
  readonly leagueYear: number;
  readonly cap: number;
  /** Each team's top-51 total over its own cap (the league's plus its carryover; dead money counted), lowest first. */
  readonly capUse: number[];
  /**
   * Each team's dead money this league year (dollars), lowest first, as it stands at the end of the walk
   * before it: the new league year's cuts and void years are in, its cut-down day and its season's cuts
   * are not yet, so it reads low. `playedYearDead` counts a league year once its season is over.
   */
  readonly deadMoney: number[];
  /**
   * The league year just played (the walk's own season), counted once its season is over: each team's
   * dead money for it, lowest first, with the new league year's cuts, cut-down day and the season's cuts
   * all in (ADR-085 step 14). The first walk's year starts with the league file's own dead money.
   */
  readonly playedYearDead: { readonly leagueYear: number; readonly cap: number; readonly perTeam: number[] };
  /** What each team carried into this league year (dollars), lowest first. */
  readonly carryover: number[];
  /** Share of all live cap numbers by position group. */
  readonly groupShare: Record<string, number>;
  /** The five biggest deals a year, league-wide. */
  readonly topDeals: { player: string; position: Position; apy: number }[];
  readonly counts: {
    signed: Record<string, number>;
    expired: number;
    released: number;
    restructured: number;
    freeAgentMoves: number;
    compPicks: number;
    /** Veteran deals with a new team at $2M a year or more, and at $5M or more (OverTheCap counts the real ones). */
    newTeam2M: number;
    newTeam5M: number;
    /** Deals of two years or more with a player's own team (extensions and re-signings). */
    ownTeamMultiYear: number;
    /**
     * The same, above the minimum: a year's value over 1.1 times the top of the league year's minimum
     * salary scale, the line the real count drew (step 14; real about 135 a year, 117 by the table's rows).
     */
    ownTeamMultiYearAboveMinimum: number;
  };
  /** Players on each team's books at the end of the year (the 90 in the offseason), lowest first. */
  readonly rosterSizes: number[];
  /**
   * The walk's own season (the league year just played) at week 1: each team's men and cap by kind of
   * deal, a veteran's deal by its size (`capSplit`, ADR-085 step 14). Absent when the walk did not pass week 1.
   */
  readonly weekOne?: CapSplit;
  /** Real seconds the year took. */
  readonly seconds: number;
}

/** The deals `measure` counts as a veteran's (and the 20-season check's reader with it): no rookie deal, tender, tag or practice squad. */
export const VETERAN_DEAL_KINDS: readonly (PlayerContract["kind"] | undefined)[] = ["VETERAN", "MINIMUM", "EXTENSION", undefined];

/**
 * Each player's team on his latest deal in `contracts`, by signing day (the later listed of two on
 * one day). Taken from the people a season starts with, a deal the season signs with another team is
 * a move, and one with this team a re-signing or extension.
 */
export function lastTeams(contracts: readonly PlayerContract[]): Map<string, string> {
  const lastTeam = new Map<string, string>();
  for (const c of [...contracts].sort((a, b) => compareStamps(a.signedAt, b.signedAt))) lastTeam.set(String(c.player), String(c.team));
  return lastTeam;
}

const live = (c: PlayerContract, season: number) => c.ended === undefined && c.years.some((y) => y.season === season && !y.voidYear);
const capHit = (c: PlayerContract, season: number) => c.years.find((y) => y.season === season)?.capHit ?? 0;

/**
 * The top of the minimum salary scale (seven credited seasons or more) in a league year. REPORTED: the
 * CBA's 2026 figure and its yearly step through 2030, the last season it sets (copied from franchise's
 * table, `MINIMUM_2026`); after it, the 2030 figure moves with the cap.
 */
export function topMinimum(year: number, cap: (season: number) => number): number {
  const within = 1_300_000 + 45_000 * (Math.min(year, 2030) - 2026);
  return year <= 2030 ? within : within * cap(year) / cap(2030);
}

/** Each team's dead money charged to league year `year`, in the people's order of teams. */
export function deadByTeam(people: Pick<SeasonPeople, "teams" | "deadMoney">, year: number): number[] {
  const by = new Map<string, number>();
  for (const d of people.deadMoney ?? []) if (d.season === year) by.set(String(d.team), (by.get(String(d.team)) ?? 0) + d.amount);
  return people.teams.map((t) => by.get(String(t.id)) ?? 0);
}

/**
 * A deal's own pay a year, as OverTheCap counts it: an extension made in the walk leaves out the bonus
 * money it carries over from the old deal (step 14), counting its own signing bonus instead.
 */
export function ownPay(c: PlayerContract): number {
  const real = c.years.filter((y) => !y.voidYear);
  if (c.kind === "EXTENSION" && c.signingBonus !== undefined) {
    const pay = real.reduce((s, y) => s + y.capHit - y.signingBonusProration - (y.optionBonusProration ?? 0), 0);
    return (pay + c.signingBonus) / Math.max(1, real.length);
  }
  return real.reduce((s, y) => s + y.capHit, 0) / Math.max(1, real.length);
}

/** Where a deal sits in the cap (ADR-085 step 14): its kind, or for a veteran's deal its size. */
export type CapBand = "rookie" | "practiceSquad" | "tenderOrTag" | "minimum" | "aboveMinimum" | "middle" | "big";
export const CAP_BANDS: readonly CapBand[] = ["rookie", "practiceSquad", "tenderOrTag", "minimum", "aboveMinimum", "middle", "big"];

/**
 * A veteran's deal by its own pay a year over the cap of its first real year: the middle class from
 * 0.66% (OverTheCap's $2M line against the 2026 cap of $301.2M), a big deal from 4% (both CHOSEN for
 * step 14's count). A deal at or under 1.1 times the top of that year's minimum scale is a minimum deal.
 */
export const MIDDLE_CLASS_FROM = 2_000_000 / 301_200_000;
export const BIG_DEAL_FROM = 0.04;

/** A deal's band: a rookie deal, a practice-squad deal, a tender or tag, or a veteran's deal by its size. */
export function capBand(c: PlayerContract, cap: (season: number) => number): CapBand {
  if (c.kind === "ROOKIE") return "rookie";
  if (c.kind === "PRACTICE_SQUAD") return "practiceSquad";
  if (!VETERAN_DEAL_KINDS.includes(c.kind)) return "tenderOrTag";
  const first = c.years.find((y) => !y.voidYear)?.season ?? c.signedAt.season;
  const pay = ownPay(c);
  if (pay <= 1.1 * topMinimum(first, cap)) return "minimum";
  const share = pay / cap(first);
  return share < MIDDLE_CLASS_FROM ? "aboveMinimum" : share < BIG_DEAL_FROM ? "middle" : "big";
}

/**
 * The cap at week 1 of a season (ADR-085 step 14): a team's men in each band and its cap numbers there,
 * over the season's cap, from the deals live that day. Real, the league file's 2026 53s (contracts as
 * of 23 October) by the same split, COUNTED: big deals 7.7 men and 39.5% of a team's cap, the middle
 * class 13.7 men and 21.4%.
 */
export interface CapSplit {
  readonly season: number;
  readonly men: Record<CapBand, number>;
  readonly share: Record<CapBand, number>;
}

export function capSplit(people: Pick<SeasonPeople, "teams" | "contracts">, season: number, cap: (season: number) => number): CapSplit {
  const men = Object.fromEntries(CAP_BANDS.map((b) => [b, 0])) as Record<CapBand, number>;
  const money = { ...men };
  for (const c of people.contracts ?? []) {
    if (!live(c, season)) continue;
    const band = capBand(c, cap);
    men[band] += 1;
    money[band] += capHit(c, season);
  }
  const teams = Math.max(1, people.teams.length);
  return {
    season,
    men: Object.fromEntries(CAP_BANDS.map((b) => [b, men[b] / teams])) as Record<CapBand, number>,
    share: Object.fromEntries(CAP_BANDS.map((b) => [b, money[b] / teams / cap(season)])) as Record<CapBand, number>,
  };
}

function measure(
  people: SeasonPeople, events: readonly FranchiseEvent[], year: number, cap: number, seconds: number,
  lastTeam: ReadonlyMap<string, string>, played: { leagueYear: number; cap: number }, minimumTop: number, weekOne: CapSplit | undefined,
): CapYear {
  const contracts = people.contracts ?? [];
  const position = new Map(people.players.map((p) => [String(p.bio.id), p.bio.position]));
  const capUse = people.teams.map((t) => {
    const carry = people.capCarryover?.find((c) => c.team === t.id && c.season === year)?.amount ?? 0;
    return teamCapTotal(t.id, year, contracts, people.deadMoney ?? [], { top51: true }).total / (cap + carry);
  }).sort((a, b) => a - b);
  const groupOf = new Map<Position, string>();
  for (const [g, ps] of Object.entries(CAP_GROUPS)) for (const p of ps) groupOf.set(p, g);
  const groups: Record<string, number> = Object.fromEntries(Object.keys(CAP_GROUPS).map((g) => [g, 0]));
  let total = 0;
  for (const c of contracts) {
    if (!live(c, year)) continue;
    const g = groupOf.get(position.get(String(c.player)) ?? ("QB" as Position)) ?? "ST";
    const hit = capHit(c, year);
    groups[g] = (groups[g] ?? 0) + hit;
    total += hit;
  }
  const signed: Record<string, number> = {};
  for (const e of events) if (e.type === "CONTRACT_SIGNED") signed[e.payload.kind ?? "UNKNOWN"] = (signed[e.payload.kind ?? "UNKNOWN"] ?? 0) + 1;
  const topDeals = contracts.filter((c) => live(c, year)).sort((a, b) => ownPay(b) - ownPay(a)).slice(0, 5)
    .map((c) => ({ player: String(c.player), position: position.get(String(c.player)) ?? ("QB" as Position), apy: Math.round(ownPay(c)) }));
  const vets = events.filter((e): e is Extract<FranchiseEvent, { type: "CONTRACT_SIGNED" }> =>
    e.type === "CONTRACT_SIGNED" && VETERAN_DEAL_KINDS.includes(e.payload.kind));
  const apyOfEvent = (e: (typeof vets)[number]) => (e.payload.value ?? 0) / Math.max(1, e.payload.years ?? 1);
  const isNew = (e: (typeof vets)[number]) => { const was = lastTeam.get(String(e.payload.player)); return was !== undefined && was !== String(e.payload.team); };
  const comp = events.filter((e): e is Extract<FranchiseEvent, { type: "COMPENSATORY_PICKS_AWARDED" }> => e.type === "COMPENSATORY_PICKS_AWARDED");
  return {
    leagueYear: year, cap, capUse,
    deadMoney: deadByTeam(people, year).sort((a, b) => a - b),
    playedYearDead: { ...played, perTeam: deadByTeam(people, played.leagueYear).sort((a, b) => a - b) },
    carryover: people.teams.map((t) => people.capCarryover?.find((c) => c.team === t.id && c.season === year)?.amount ?? 0).sort((a, b) => a - b),
    groupShare: Object.fromEntries(Object.entries(groups).map(([g, v]) => [g, total === 0 ? 0 : v / total])),
    topDeals,
    counts: {
      signed,
      expired: events.filter((e) => e.type === "CONTRACT_EXPIRED").length,
      released: events.filter((e) => e.type === "PLAYER_RELEASED").length,
      restructured: events.filter((e) => e.type === "CONTRACT_RESTRUCTURED").length,
      freeAgentMoves: (people.freeAgentMoves ?? []).filter((m) => m.signedAt.season === year - 1).length,
      compPicks: comp.reduce((s, e) => s + e.payload.picks.length, 0),
      newTeam2M: vets.filter((e) => isNew(e) && apyOfEvent(e) >= 2e6).length,
      newTeam5M: vets.filter((e) => isNew(e) && apyOfEvent(e) >= 5e6).length,
      ownTeamMultiYear: vets.filter((e) => !isNew(e) && lastTeam.has(String(e.payload.player)) && (e.payload.years ?? 1) >= 2).length,
      ownTeamMultiYearAboveMinimum: vets.filter((e) => !isNew(e) && lastTeam.has(String(e.payload.player)) && (e.payload.years ?? 1) >= 2
        && apyOfEvent(e) > 1.1 * minimumTop).length,
    },
    rosterSizes: people.teams.map((t) => t.roster.length).sort((a, b) => a - b),
    ...(weekOne ? { weekOne } : {}),
    seconds,
  };
}

/**
 * The league file (ADR-088, written before ADR-086 C1) keeps a traded pick's condition as its source's
 * words alone. Those are kept, with the rule the game cannot settle (OTHER): the pick stays where it is.
 */
export function withConditionRule(p: SeasonPeople["picks"][number]): SeasonPeople["picks"][number] {
  const c = p.condition as unknown;
  return typeof c === "string" ? { ...p, condition: { text: c, rule: { kind: "OTHER" } } } : p;
}

/** A base salary no player is paid: a year written in only to void (CHOSEN threshold; the real ones are $99M to $500M). */
export const DUMMY_SALARY = 95_000_000;

/**
 * The league file keeps many deals' placeholder years as ordinary years: base salaries written in
 * so the year voids ($10M to $500M; most are $30M, $50M or $100M). Two marks give them away: a base
 * no player is paid, or a run of years at the end of the deal, after the file's season, whose
 * stored cap hit leaves the base out (the real cap hit is the bonus share alone). Here they are what
 * they are: void years, no cap number of their own; their bonus proration lands as dead money when
 * the deal ends.
 *
 * Some placeholders sit in a roster bonus instead ($50M or $100M, ADR-085 step 14): in a year after
 * the file's season whose stored cap hit leaves more than `PLACEHOLDER_SLACK` out, the roster bonus
 * comes down by what is left out (not below nothing). And a void year carries no pay of its own, only
 * its bonus proration: the file has one that still carries a $50M roster bonus. Left in, these set
 * the top of a position's price list (a guard at $63M a year).
 */
export function withDummyYearsVoid(c: PlayerContract, fileSeason = -Infinity): PlayerContract {
  type Year = PlayerContract["years"][number];
  const leavesBaseOut = (y: Year) => y.season > fileSeason && y.baseSalary > y.capHit + 1000;
  let from = c.years.length;
  while (from > 0 && leavesBaseOut(c.years[from - 1]!)) from--;
  const dummy = (y: Year, i: number) => y.baseSalary >= DUMMY_SALARY || i >= from;
  const pay = (y: Year) => y.baseSalary + (y.rosterBonus ?? 0) + (y.workoutBonus ?? 0) + (y.perGameRosterBonus ?? 0) + (y.incentives?.likely ?? 0);
  const capNumber = (y: Year) => pay(y) + y.signingBonusProration + (y.optionBonusProration ?? 0);
  const voided = (y: Year): Year => ({
    ...y, baseSalary: 0, capHit: 0, voidYear: true,
    ...(y.rosterBonus ? { rosterBonus: 0 } : {}), ...(y.workoutBonus ? { workoutBonus: 0 } : {}),
    ...(y.perGameRosterBonus ? { perGameRosterBonus: 0 } : {}), ...(y.incentives?.likely ? { incentives: { ...y.incentives, likely: 0 } } : {}),
  });
  const leftOut = (y: Year) => (y.season > fileSeason && (y.rosterBonus ?? 0) > 0 ? capNumber(y) - y.capHit : 0);
  const fix = (y: Year, i: number): Year => {
    if (dummy(y, i) || (y.voidYear && pay(y) > 0)) return voided(y);
    const out = leftOut(y);
    return out > PLACEHOLDER_SLACK ? { ...y, rosterBonus: Math.max(0, y.rosterBonus! - out) } : y;
  };
  if (!c.years.some((y, i) => fix(y, i) !== y)) return c;
  return { ...c, years: c.years.map(fix) };
}

/** What a stored cap hit may leave out of a year's pay before its roster bonus counts as a placeholder (CHOSEN). */
export const PLACEHOLDER_SLACK = 1_000_000;

/** Room each team is given beyond its opening deals in the first season (CHOSEN; real teams carry some). */
export const OPENING_ROOM = 5_000_000;

/** A player's grade for every money decision: his overall at his position. */
const rate = (p: PlayerState): number => positionOverall(p.bio.position, p.attributes.values);

/**
 * Players on no team who are not in the free-agent pool (and not prospects, whose class decides for
 * them), in the players' order: nobody can sign them, so they neither play nor retire.
 */
export function limboPlayers(people: Pick<SeasonPeople, "players" | "freeAgents">): PlayerId[] {
  const free = new Set(people.freeAgents.map(String));
  return people.players
    .filter((p) => p.teamId === undefined && p.bio.draft !== "PROSPECT" && !free.has(String(p.bio.id)))
    .map((p) => p.bio.id);
}

/**
 * The limbo sweep (switched-on walks only): every player `limboPlayers` finds joins the free agents,
 * after those already there, so he can be signed, or retire unsigned, from the next season on.
 *
 * Who lands there: the league file's reserve-list players (injured reserve and the like). The file
 * keeps their team but not `Team.reserve`, they are on no roster or practice squad, and the league
 * year's `placePlayers` (franchise leagueYear.ts) takes their team away without making them free
 * agents. The real fix is franchise's: carry `Team.reserve` across the league year. Until it lands,
 * this keeps them in the game. Switched off, nothing is swept, as before.
 */
export function sweepLimbo(people: SeasonPeople): SeasonPeople {
  const stranded = limboPlayers(people);
  return stranded.length === 0 ? people : { ...people, freeAgents: [...people.freeAgents, ...stranded] };
}

/**
 * The staff transform on the people's coaches: switched on, the coaching world's staff, with
 * `staff` set to the same array (franchise's steps keep the two one list); switched off, `staff`.
 * Every other part of the people is as it was.
 */
export function transformStaff(people: SeasonPeople, transform: NonNullable<CapCheckInput["staffTransform"]>): SeasonPeople {
  const coaching = people.coaching;
  if (coaching === undefined) return { ...people, staff: transform(people.staff ?? []) };
  const staff = transform(coaching.world.staff);
  return { ...people, staff, coaching: { ...coaching, world: { ...coaching.world, staff } } };
}

/** `onDay` as a day step: it hands the step's people and games on and does nothing (undefined: nothing to do today). */
function watchStep(season: number, onDay: NonNullable<CapCheckInput["onDay"]>): SeasonDayStep {
  return {
    id: "cap-check:watch",
    run: (people, ctx) => {
      onDay(season, ctx.day, people, ctx.games);
      return undefined;
    },
  };
}

/** A day step that keeps the season's cap split on its first day of week 1 (ADR-085 step 14); it only looks. */
function weekOneStep(season: number, cap: (season: number) => number, keep: (split: CapSplit) => void): SeasonDayStep {
  return {
    id: "cap-check:week-one",
    run: (people, ctx) => {
      if (ctx.day.phase === "REGULAR_SEASON" && ctx.day.week === 1 && ctx.day.day === 1) keep(capSplit(people, season, cap));
      return undefined;
    },
  };
}

export function runCapCheck(input: CapCheckInput): CapYear[] {
  const switched = input.players?.development === true || input.players?.injuries === true;
  const development = input.players?.development === true;
  const base = buildLeague(input.seed);
  const { league, rated } = buildStandInLeague(base, input.file, input.players);
  const cap = capForecast(input.seed);
  const first = input.file.season;
  // Switched on, each head coach keeps his depth-chart leanings all walk, as the season command's do;
  // without them his leanings would be drawn again from each season's seed. Switched on, the whole
  // coaching world rides in the people, so the carousel and the meetings can change it (the views are
  // seated on the first day, as the season command's are); switched off, the staff alone, as before.
  const world = buildStaff(base, { firstSeason: first, ...(switched ? { lineups: true } : {}) }).world;
  const coaches: Pick<SeasonPeople, "staff" | "coaching"> = switched ? { staff: world.staff, coaching: { world } } : { staff: [...world.staff] };
  // The file has the real deals but not each team's real adjusted cap. Every real team is under its
  // own, so each starts with the carryover that puts it there, plus a little room (CHOSEN).
  const opening = new Map<string, number>();
  for (const c of input.file.contracts ?? []) opening.set(String(c.team), (opening.get(String(c.team)) ?? 0) + capHit(c, first));
  for (const d of input.file.deadMoney ?? []) if (d.season === first) opening.set(String(d.team), (opening.get(String(d.team)) ?? 0) + d.amount);
  const capCarryover = league.teams.map((t) => ({
    team: t.id, season: first, amount: Math.max(0, (opening.get(String(t.id)) ?? 0) - cap(first)) + OPENING_ROOM,
  }));
  let people: SeasonPeople = input.resume !== undefined ? input.resume.people : {
    capCarryover,
    teams: league.teams,
    players: [...rated.league.players],
    picks: (input.file.picks ?? []).map(withConditionRule),
    classes: [],
    freeAgents: [],
    contracts: (input.file.contracts ?? []).map((c) => withDummyYearsVoid(c, first)),
    deadMoney: [...(input.file.deadMoney ?? [])],
    ...coaches,
  };
  // With development on, each class comes with growth records, or the players drafted in the walk
  // would never grow or age.
  const makeClass = (draft: number, usedNames: ReadonlySet<string>) => {
    const made = generateDraftClass({ seed: input.seed, draft, usedNames, ...(development ? { development: true } : {}) });
    return { draftClass: made.draftClass, players: made.players };
  };
  // The players' steps, as `runRealSeason` runs them for the stand-ins (ADR-087 §10); switched off, none.
  const players: Pick<SeasonInput, "players"> = switched ? {
    players: {
      development,
      injuries: input.players?.injuries === true,
      unfilled: (team, available, ps) => unfilledPosition(rated, team, available, ps),
    },
  } : {};
  // The coaches' steps (ADR-084: views, weekly drift, the carousel) and the end-of-season meeting
  // (ADR-081), as `runRealSeason` runs them with a coaching world; switched off, neither.
  const coachingSteps: Pick<SeasonInput, "coaching" | "meeting"> = switched ? { coaching: {}, meeting: {} } : {};
  // The day watcher: a day step that only looks, first in the day's order (no `onDay`, no watcher).
  // Then the week-1 split's step, which only looks too (switched on by `weekOneSplit`). With neither,
  // the season's input has no day steps at all.
  const { onDay, onEvent } = input;
  const weekOnes = new Map<number, CapSplit>();
  const watchers = (season: number): Pick<SeasonInput, "daySteps" | "onEvent"> => {
    const daySteps = [
      ...(onDay ? [watchStep(season, onDay)] : []),
      ...(input.weekOneSplit === true ? [weekOneStep(season, cap, (split) => weekOnes.set(season, split))] : []),
    ];
    return { ...(daySteps.length > 0 ? { daySteps } : {}), ...(onEvent ? { onEvent } : {}) };
  };
  const years: CapYear[] = [];
  let current: League = input.resume !== undefined ? { ...league, teams: people.teams } : league;
  for (let i = input.resume?.seasonsDone ?? 0; i < input.seasons; i++) {
    const season = first + i;
    const started = Date.now();
    // The arm's coaches: the staff as the last season left it (a head coach the carousel seated
    // included), changed before this season's first day.
    if (input.staffTransform) people = transformStaff(people, input.staffTransform);
    // Each player's team on his latest deal before the year: a signing elsewhere is a move.
    const lastTeam = lastTeams(people.contracts ?? []);
    const before = people;
    const run = runSeason({
      league: { ...current, teams: people.teams },
      season, seed: `${input.seed}/${season}`,
      resolve: peopleResolver(rated, input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion }),
      people,
      through: "YEAR",
      // The league file's contracts are as of 23 October, after its own camp: that camp's extensions are
      // already in them, so the walk's first camp extends nobody.
      leagueYear: { rate, cap, campExtensionsFrom: first + 1, ...(input.marketPrices !== undefined ? { marketPrices: input.marketPrices } : {}) },
      draft: { rate, makeClass, cap },
      ...players,
      ...coachingSteps,
      ...watchers(season),
    });
    if (!run.complete || run.people === undefined) throw new Error(`cap check: season ${season} did not finish its league year`);
    people = run.people;
    const events = run.events.map((e) => e.event);
    input.onRun?.(season, events, people, { run, before });
    if (switched) people = sweepLimbo(people);
    current = { ...current, teams: people.teams };
    const year = measure(people, events, season + 1, cap(season + 1), (Date.now() - started) / 1000, lastTeam, { leagueYear: season, cap: cap(season) }, topMinimum(season + 1, cap), weekOnes.get(season));
    years.push(year);
    input.onYear?.(year);
    input.onSeasonEnd?.(season, people);
  }
  return years;
}
