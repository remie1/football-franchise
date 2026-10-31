/**
 * THE CAP OVER SEVERAL YEARS (ADR-085 §7, the multi-season check).
 *
 * Plays the stand-in league (ADR-088) through the real sim for several seasons in a row. Each
 * season runs through its offseason (`through: "YEAR"`) with the league year (ADR-085) and the
 * draft (ADR-086) in the walk. The league year sets the cap, re-signs and tags, lets deals run out,
 * runs free agency and keeps every team under the cap. The draft makes the picks, signs the
 * rookies and turns the year. After each year it measures the money the way OverTheCap counts it,
 * so the numbers can be set against the real league's.
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
 * unsigned retirements) run in the walk. Absent, or both off, the walk is exactly what it was.
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
   * The coaches the walk starts with, changed before the first season: for an arm that sets every head
   * coach's depth-chart leanings (`StaffState.lineup`). Absent, the staff is `buildStaff`'s.
   */
  readonly staffTransform?: (staff: readonly StaffState[]) => StaffState[];
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
  /** Each team's dead money this league year (dollars), lowest first. */
  readonly deadMoney: number[];
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
  };
  /** Players on each team's books at the end of the year (the 90 in the offseason), lowest first. */
  readonly rosterSizes: number[];
  /** Real seconds the year took. */
  readonly seconds: number;
}

const live = (c: PlayerContract, season: number) => c.ended === undefined && c.years.some((y) => y.season === season && !y.voidYear);
const capHit = (c: PlayerContract, season: number) => c.years.find((y) => y.season === season)?.capHit ?? 0;

function measure(
  people: SeasonPeople, events: readonly FranchiseEvent[], year: number, cap: number, seconds: number,
  lastTeam: ReadonlyMap<string, string>,
): CapYear {
  const contracts = people.contracts ?? [];
  const dead = (people.deadMoney ?? []).filter((d) => d.season === year);
  const position = new Map(people.players.map((p) => [String(p.bio.id), p.bio.position]));
  const deadBy = new Map<string, number>();
  for (const d of dead) deadBy.set(String(d.team), (deadBy.get(String(d.team)) ?? 0) + d.amount);
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
  const apy = (c: PlayerContract) => {
    const real = c.years.filter((y) => !y.voidYear);
    return real.reduce((s, y) => s + y.capHit, 0) / Math.max(1, real.length);
  };
  const topDeals = contracts.filter((c) => live(c, year)).sort((a, b) => apy(b) - apy(a)).slice(0, 5)
    .map((c) => ({ player: String(c.player), position: position.get(String(c.player)) ?? ("QB" as Position), apy: Math.round(apy(c)) }));
  const vets = events.filter((e): e is Extract<FranchiseEvent, { type: "CONTRACT_SIGNED" }> =>
    e.type === "CONTRACT_SIGNED" && ["VETERAN", "MINIMUM", "EXTENSION", undefined].includes(e.payload.kind));
  const apyOfEvent = (e: (typeof vets)[number]) => (e.payload.value ?? 0) / Math.max(1, e.payload.years ?? 1);
  const isNew = (e: (typeof vets)[number]) => { const was = lastTeam.get(String(e.payload.player)); return was !== undefined && was !== String(e.payload.team); };
  const comp = events.filter((e): e is Extract<FranchiseEvent, { type: "COMPENSATORY_PICKS_AWARDED" }> => e.type === "COMPENSATORY_PICKS_AWARDED");
  return {
    leagueYear: year, cap, capUse,
    deadMoney: people.teams.map((t) => deadBy.get(String(t.id)) ?? 0).sort((a, b) => a - b),
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
    },
    rosterSizes: people.teams.map((t) => t.roster.length).sort((a, b) => a - b),
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
 */
export function withDummyYearsVoid(c: PlayerContract, fileSeason = -Infinity): PlayerContract {
  const leavesBaseOut = (y: PlayerContract["years"][number]) => y.season > fileSeason && y.baseSalary > y.capHit + 1000;
  let from = c.years.length;
  while (from > 0 && leavesBaseOut(c.years[from - 1]!)) from--;
  const dummy = (y: PlayerContract["years"][number], i: number) => y.baseSalary >= DUMMY_SALARY || i >= from;
  if (!c.years.some(dummy)) return c;
  return { ...c, years: c.years.map((y, i) => (dummy(y, i) ? { ...y, baseSalary: 0, capHit: 0, voidYear: true } : y)) };
}

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

export function runCapCheck(input: CapCheckInput): CapYear[] {
  const switched = input.players?.development === true || input.players?.injuries === true;
  const development = input.players?.development === true;
  const base = buildLeague(input.seed);
  const { league, rated } = buildStandInLeague(base, input.file, input.players);
  const cap = capForecast(input.seed);
  const first = input.file.season;
  // Switched on, each head coach keeps his depth-chart leanings all walk, as the season command's do;
  // without them his leanings would be drawn again from each season's seed.
  const built = buildStaff(base, { firstSeason: first, ...(switched ? { lineups: true } : {}) }).world.staff;
  const staff = input.staffTransform ? input.staffTransform(built) : built;
  // The file has the real deals but not each team's real adjusted cap. Every real team is under its
  // own, so each starts with the carryover that puts it there, plus a little room (CHOSEN).
  const opening = new Map<string, number>();
  for (const c of input.file.contracts ?? []) opening.set(String(c.team), (opening.get(String(c.team)) ?? 0) + capHit(c, first));
  for (const d of input.file.deadMoney ?? []) if (d.season === first) opening.set(String(d.team), (opening.get(String(d.team)) ?? 0) + d.amount);
  const capCarryover = league.teams.map((t) => ({
    team: t.id, season: first, amount: Math.max(0, (opening.get(String(t.id)) ?? 0) - cap(first)) + OPENING_ROOM,
  }));
  let people: SeasonPeople = {
    capCarryover,
    teams: league.teams,
    players: [...rated.league.players],
    picks: (input.file.picks ?? []).map(withConditionRule),
    classes: [],
    freeAgents: [],
    contracts: (input.file.contracts ?? []).map((c) => withDummyYearsVoid(c, first)),
    deadMoney: [...(input.file.deadMoney ?? [])],
    staff: [...staff],
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
  // The day watcher: a day step that only looks, first in the day's order; absent, no step is added.
  const { onDay, onEvent } = input;
  const watchers = (season: number): Pick<SeasonInput, "daySteps" | "onEvent"> => ({
    ...(onDay ? { daySteps: [watchStep(season, onDay)] } : {}),
    ...(onEvent ? { onEvent } : {}),
  });
  const years: CapYear[] = [];
  let current: League = league;
  for (let i = 0; i < input.seasons; i++) {
    const season = first + i;
    const started = Date.now();
    // Each player's team on his latest deal before the year: a signing elsewhere is a move.
    const lastTeam = new Map<string, string>();
    for (const c of [...(people.contracts ?? [])].sort((a, b) => compareStamps(a.signedAt, b.signedAt))) lastTeam.set(String(c.player), String(c.team));
    const before = people;
    const run = runSeason({
      league: { ...current, teams: people.teams },
      season, seed: `${input.seed}/${season}`,
      resolve: peopleResolver(rated, input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion }),
      people,
      through: "YEAR",
      leagueYear: { rate, cap },
      draft: { rate, makeClass, cap },
      ...players,
      ...watchers(season),
    });
    if (!run.complete || run.people === undefined) throw new Error(`cap check: season ${season} did not finish its league year`);
    people = run.people;
    const events = run.events.map((e) => e.event);
    input.onRun?.(season, events, people, { run, before });
    if (switched) people = sweepLimbo(people);
    current = { ...current, teams: people.teams };
    const year = measure(people, events, season + 1, cap(season + 1), (Date.now() - started) / 1000, lastTeam);
    years.push(year);
    input.onYear?.(year);
  }
  return years;
}
