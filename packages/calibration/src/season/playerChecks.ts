/**
 * ADR-087 D5a: WHAT ONE SEASON WITH THE PLAYERS' SWITCHES DID, summed up for the single-season checks.
 *
 * Read from the season's own output (its event stream, standings and the people at the start and
 * at the end of the league year), never from inside franchise:
 *  - the win spread, as ADR-079 R5 measured it (each team's regular-season wins; the share of games
 *    the team with the better final record won);
 *  - injuries by setting, length, kind and position group (`INJURY_OCCURRED`), and the regular
 *    season's again in the real measurement's terms;
 *  - how far players moved over the year: each player's position overall (contracts'
 *    `positionOverall`) at the start of camp against the end of the league year, by age and by
 *    starter or backup;
 *  - what the depth charts and the free-agent pool did.
 *
 * On the stand-in league (`groups` given: each player's roster group in the league file), the same
 * counts split by group where they count players (the 53, the practice squad, the reserve lists and
 * the street free agents), the players who started the year hurt (copied from the file, so no
 * INJURY_OCCURRED marks them), and the growth rates' scale on the 53 at camp. The injury counts
 * themselves (`injuries`) then take the 53 and the street only, the people the generated league's
 * count (it has no practice squad or reserve lists), so the two compare like for like; the practice
 * squad's and the reserve lists' injuries are in `standIn.injuriesByGroup` alone, except that a
 * practice-squad player called up to the 53 (a `CONTRACT_SIGNED` for him) counts in `injuries` from
 * then on, as a street signing does, since he fills the spot a street signing would. Everywhere he
 * keeps his group in the file (the practice squad), and `standIn.callUps` counts the call-ups among
 * the emergency signings. And the stand-ins'
 * starters are who the engine fields from their real depth charts (`fieldedStarters`, given as
 * `starters`), not the generated league's `STARTERS` table, which their charts do not follow (most
 * list inside linebackers, `ILB`, whom the table never starts). Without `groups` and `starters`
 * nothing of that is added, so the generated league's summary is exactly what it was.
 */
import {
  positionOverall,
  type FranchiseEventEnvelope, type PlayerState, type Position, type SeasonState, type Team,
} from "@ff/contracts";
import { buildDefensiveUnit, buildOffensiveUnit, type DepthChart } from "@ff/playbook";

/** Starters per position: the draft thread's table (ADR-086, `draft/board.ts`), copied, since calibration may not import it. */
export const STARTERS: Readonly<Record<Position, number>> = {
  QB: 1, RB: 1, FB: 0, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  DE: 2, DT: 1, NT: 1, OLB: 2, MLB: 1, ILB: 0, CB: 3, FS: 1, SS: 1, K: 1, P: 1, LS: 1,
};

/**
 * A team's starters as the engine fields them from its depth chart (`@ff/playbook`'s units, with
 * their stated fallbacks): the 11-personnel offence, the base and nickel defences together (four
 * linemen, three linebackers, three corners, two safeties: the shape of `STARTERS`) and the first
 * kicker, punter and long snapper, 26 a team. For the stand-in league, whose real depth charts list
 * positions the `STARTERS` table does not start (`ILB`), or more of one than it starts.
 */
export function fieldedStarters(teams: readonly Team[]): Set<string> {
  const out = new Set<string>();
  for (const t of teams) {
    const chart = t.depthChart as DepthChart;
    const units = [buildOffensiveUnit("11", chart), buildDefensiveUnit("BASE", chart), buildDefensiveUnit("NICKEL", chart)];
    for (const unit of units) for (const id of Object.values(unit)) if (id !== undefined) out.add(String(id));
    for (const specialist of ["K", "P", "LS"] as const) { const id = chart[specialist]?.[0]; if (id !== undefined) out.add(String(id)); }
  }
  return out;
}

/** The position groups the injury measurement reports by (reports/injury-rates.md). */
export const POSITION_GROUP: Readonly<Record<Position, string>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DL", DT: "DL", NT: "DL", OLB: "LB", MLB: "LB", ILB: "LB",
  CB: "DB", FS: "DB", SS: "DB", K: "K/P", P: "K/P", LS: "K/P",
};

/** Age bands for the movement table, by age at the start of camp. */
export const AGE_BANDS: readonly { readonly label: string; readonly min: number; readonly max: number }[] = [
  { label: "21-22", min: 0, max: 22 },
  { label: "23-24", min: 23, max: 24 },
  { label: "25-26", min: 25, max: 26 },
  { label: "27-28", min: 27, max: 28 },
  { label: "29-30", min: 29, max: 30 },
  { label: "31-32", min: 31, max: 32 },
  { label: "33+", min: 33, max: 99 },
];

export interface MovementCell { n: number; sum: number; sumSq: number; deltas: number[] }

/** A stand-in's roster group at the start (the league file's status); "street" = the run's street free agents, signed or not. */
export type RosterGroup = "53" | "practice" | "reserve" | "street";
export const ROSTER_GROUPS: readonly RosterGroup[] = ["53", "practice", "reserve", "street"];

/** The growth rates' scale (ADR-087 §2.1): the median rate and the spread of its logarithm. */
export interface GrowthScale { n: number; median: number; medianLog: number; sdLog: number }

export interface SeasonCheck {
  readonly seed: string;
  readonly arm: string;
  /** Regular-season wins by team (ties count half). */
  readonly wins: Record<string, number>;
  /** Regular-season games between teams with different final records, and how many the better record won. */
  readonly betterRecord: { games: number; won: number };
  readonly regularSeasonGames: number;
  readonly injuries: {
    readonly total: number;
    readonly bySetting: Record<string, number>;
    readonly byBand: Record<string, number>;
    readonly byKind: Record<string, number>;
    /** Game injuries in regular-season games, by position group. */
    readonly regularGameByGroup: Record<string, number>;
    readonly regularGame: number;
    /** Injuries of 4+ weeks drawn from camp to the end of the regular season. */
    readonly longInSeason: number;
    readonly weeksLost: number;
    /**
     * The regular season in the real measurement's terms (reports/injury-rates.md), which cannot tell a
     * game injury from a practice one: injuries to players on a team, begun after one of his team's
     * regular-season games and before its next (a *team interval*). Football injuries only, as in the
     * real headline: illness and accidents away from football (`AWAY_ONLY_KINDS`) are counted apart,
     * in `timeLossAllCauses`. Time-loss = costs at least a week (not DAY_TO_DAY).
     */
    readonly regular: {
      /** Team intervals: each team's regular-season games less its last. */
      intervals: number;
      timeLoss: number;
      dayToDay: number;
      /** Time-loss of any cause, illness and accidents included (the real `perTeamGameAllCauses`). */
      timeLossAllCauses: number;
      /** Football time-loss and day-to-day injuries by setting, and the time-loss alone. */
      bySetting: Record<string, number>;
      timeLossBySetting: Record<string, number>;
      timeLossBands: Record<string, number>;
      timeLossByGroup: Record<string, number>;
      /**
       * Players on a team out with a football injury, each once: `long` = begun in the regular season
       * and costing 4+ of his team's games before the season ends (the real "new in season, by
       * games"); `longAll` = out 4+ regular-season weeks, whenever it began, so those still out at
       * week 1 count too (the real "all, by weeks").
       */
      long: number;
      longAll: number;
    };
  };
  /** Change in position overall over the league year, by age band and role ("starter" / "backup"). */
  readonly movement: Record<string, Record<string, MovementCell>>;
  /** Mean position overall at the start and at the end, starters and backups. */
  readonly gap: Record<"starter" | "backup", { n: number; start: number; end: number }>;
  readonly roster: {
    readonly emergencySignings: number;
    readonly unsignedRetired: number;
    readonly depthChanges: Record<string, number>;
    readonly battles: number;
  };
  /** Stand-in league only (`groups` given). */
  readonly standIn?: {
    /** INJURY_OCCURRED by the player's roster group (his group in the file, called up or not). */
    readonly injuriesByGroup: Record<string, number>;
    /** Emergency signings that called up a team's own practice-squad player (counted in `roster.emergencySignings` too). */
    readonly callUps: number;
    /** Players hurt at the start of camp (copied from the league file), by roster group. */
    readonly startedHurt: Record<string, number>;
    /** Players at the start of camp by roster group (for per-team and per-player rates). */
    readonly players: Record<string, number>;
    /** Growth rates on the 53 at camp; absent when nobody there has a growth record (development off). */
    readonly growthScale?: GrowthScale;
  };
}

const bump = (m: Record<string, number>, k: string, by = 1) => { m[k] = (m[k] ?? 0) + by; };

/**
 * Kinds that only ever happen away from football: the real reports list them as illness or on the
 * non-football list, outside the headline counts. Copied from franchise's `INJURY_KINDS` (those with
 * an AWAY share alone), since calibration may not import it.
 */
export const AWAY_ONLY_KINDS: ReadonlySet<string> = new Set(["illness", "car-accident", "bicycle-accident", "fireworks"]);

export function summariseSeason(input: {
  seed: string;
  arm: string;
  state: SeasonState;
  events: readonly FranchiseEventEnvelope[];
  /** The teams and players at the start of camp. */
  startTeams: readonly Team[];
  startPlayers: readonly PlayerState[];
  /** The players at the end of the run (absent with the switches off: nobody moved). */
  endPlayers?: readonly PlayerState[];
  /** Stand-in league: each player's roster group at the start, by id. Anyone else counts as "street". */
  groups?: ReadonlyMap<string, Exclude<RosterGroup, "street">>;
  /** Who started at camp, by id (`fieldedStarters`); absent: the `STARTERS` table, by depth-chart order. */
  starters?: ReadonlySet<string>;
}): SeasonCheck {
  const { state, events } = input;
  const regular = new Set(state.schedule.games.map((g) => String(g.gameId)));

  const wins: Record<string, number> = {};
  for (const r of state.standings) wins[String(r.team)] = r.overall.wins + 0.5 * r.overall.ties;
  let games = 0, won = 0, regularSeasonGames = 0;
  for (const r of state.results) {
    if (!regular.has(String(r.gameId))) continue;
    regularSeasonGames++;
    const h = wins[String(r.home)]!, a = wins[String(r.away)]!;
    if (h === a || r.homeScore === r.awayScore) continue;
    games++;
    if ((h > a) === (r.homeScore > r.awayScore)) won++;
  }

  const startById = new Map(input.startPlayers.map((p) => [String(p.bio.id), p]));
  const endById = new Map((input.endPlayers ?? input.startPlayers).map((p) => [String(p.bio.id), p]));
  const positionOf = (id: string): Position | undefined => (startById.get(id) ?? endById.get(id))?.bio.position;

  // Each team's regular-season game weeks, the week order of the year (from the stream's own stamps)
  // and who is on a team (the start of camp's rosters, then each signing).
  const gameWeeks = new Map<string, number[]>();
  for (const g of state.schedule.games) {
    for (const t of [g.home, g.away]) gameWeeks.set(String(t), [...(gameWeeks.get(String(t)) ?? []), g.at.week]);
  }
  for (const w of gameWeeks.values()) w.sort((a, b) => a - b);
  const lastRegularWeek = Math.max(...state.schedule.games.map((g) => g.at.week));
  const weekIndex = new Map<string, number>();
  for (const { at } of events) if (!weekIndex.has(`${at.phase}/${at.week}`)) weekIndex.set(`${at.phase}/${at.week}`, weekIndex.size);
  const regularIndex = (week: number) => weekIndex.get(`REGULAR_SEASON/${week}`);
  const teamOf = new Map<string, string>();
  for (const t of input.startTeams) for (const id of t.roster) teamOf.set(String(id), String(t.id));
  const longPlayers = new Set<string>(), longAllPlayers = new Set<string>();

  const regularInjuries = {
    intervals: [...gameWeeks.values()].reduce((n, w) => n + Math.max(0, w.length - 1), 0),
    timeLoss: 0, dayToDay: 0, timeLossAllCauses: 0, bySetting: {}, timeLossBySetting: {}, timeLossBands: {}, timeLossByGroup: {}, long: 0, longAll: 0,
  } as SeasonCheck["injuries"]["regular"];
  const injuries = { total: 0, bySetting: {}, byBand: {}, byKind: {}, regularGameByGroup: {}, regularGame: 0, longInSeason: 0, weeksLost: 0, regular: regularInjuries } as {
    total: number; bySetting: Record<string, number>; byBand: Record<string, number>; byKind: Record<string, number>;
    regularGameByGroup: Record<string, number>; regularGame: number; longInSeason: number; weeksLost: number; regular: SeasonCheck["injuries"]["regular"];
  };
  const depthChanges: Record<string, number> = {};
  let emergencySignings = 0, unsignedRetired = 0, battles = 0;
  const groupOf = (id: string): RosterGroup => input.groups?.get(id) ?? "street";
  const injuriesByGroup: Record<string, number> = {};
  // Practice-squad players called up to the 53 so far (stand-ins only).
  const calledUp = new Set<string>();
  let callUps = 0;
  for (const { at, event } of events) {
    switch (event.type) {
      case "INJURY_OCCURRED": {
        const p = event.payload;
        if (input.groups) {
          const group = groupOf(String(p.player));
          bump(injuriesByGroup, group);
          // The generated league's people are its 53s and the street: the stand-ins' practice squads
          // and reserve lists are counted by group alone, a practice-squad player until he is called up.
          if (group === "reserve" || (group === "practice" && !calledUp.has(String(p.player)))) break;
        }
        injuries.total++;
        injuries.weeksLost += p.weeks;
        bump(injuries.bySetting, p.setting);
        bump(injuries.byBand, p.band);
        bump(injuries.byKind, p.kind);
        const inSeason = at.phase === "TRAINING_CAMP" || at.phase === "PRESEASON" || at.phase === "REGULAR_SEASON";
        if (inSeason && p.weeks >= 4) injuries.longInSeason++;
        const team = teamOf.get(String(p.player));
        const football = !AWAY_ONLY_KINDS.has(p.kind);
        // Out for the next `weeks` week-ends' games: every injury is drawn on a week's last day, after its games.
        const from = weekIndex.get(`${at.phase}/${at.week}`);
        if (team !== undefined && football && from !== undefined && p.band !== "DAY_TO_DAY") {
          let weeksOut = 0;
          for (let w = 1; w <= lastRegularWeek; w++) { const j = regularIndex(w); if (j !== undefined && j > from && j <= from + p.weeks) weeksOut++; }
          if (weeksOut >= 4) longAllPlayers.add(String(p.player));
          const games = (gameWeeks.get(team) ?? []).filter((w) => at.phase === "REGULAR_SEASON" && w > at.week && w <= at.week + p.weeks).length;
          if (games >= 4) longPlayers.add(String(p.player));
        }
        const inInterval = at.phase === "REGULAR_SEASON" && team !== undefined && (gameWeeks.get(team) ?? []).some((w) => w > at.week);
        if (inInterval) {
          const pos = positionOf(String(p.player));
          if (p.band !== "DAY_TO_DAY") regularInjuries.timeLossAllCauses++;
          if (football) {
            bump(regularInjuries.bySetting, p.setting);
            if (p.band === "DAY_TO_DAY") regularInjuries.dayToDay++;
            else {
              regularInjuries.timeLoss++;
              bump(regularInjuries.timeLossBySetting, p.setting);
              bump(regularInjuries.timeLossBands, p.band);
              bump(regularInjuries.timeLossByGroup, pos ? POSITION_GROUP[pos] : "?");
            }
          }
        }
        if (p.setting === "GAME" && p.game !== undefined && regular.has(String(p.game))) {
          injuries.regularGame++;
          const pos = positionOf(String(p.player));
          bump(injuries.regularGameByGroup, pos ? POSITION_GROUP[pos] : "?");
        }
        break;
      }
      case "CONTRACT_SIGNED":
        if (event.payload.kind === "MINIMUM") emergencySignings++;
        teamOf.set(String(event.payload.player), String(event.payload.team));
        if (input.groups?.get(String(event.payload.player)) === "practice") {
          calledUp.add(String(event.payload.player));
          if (event.payload.kind === "MINIMUM") callUps++;
        }
        break;
      case "PLAYER_RETIRED":
        if (event.payload.reason === "UNSIGNED") unsignedRetired++;
        break;
      case "DEPTH_CHART_CHANGED":
        bump(depthChanges, event.payload.situation);
        break;
      case "POSITION_BATTLE_DECLARED":
        battles++;
        break;
      default:
        break;
    }
  }

  regularInjuries.long = longPlayers.size;
  regularInjuries.longAll = longAllPlayers.size;

  // Who started at the start of camp.
  const role = new Map<string, "starter" | "backup">();
  for (const t of input.startTeams) {
    for (const [pos, ids] of Object.entries(t.depthChart) as [Position, readonly string[]][]) {
      ids.forEach((id, i) => role.set(String(id), (input.starters ? input.starters.has(String(id)) : i < STARTERS[pos]) ? "starter" : "backup"));
    }
  }
  const movement: Record<string, Record<string, MovementCell>> = {};
  const gap = { starter: { n: 0, start: 0, end: 0 }, backup: { n: 0, start: 0, end: 0 } };
  for (const p of input.startPlayers) {
    // Stand-ins off the 53 (practice squad, reserve lists) are their own rows; the gap stays the 53's.
    const off = input.groups?.get(String(p.bio.id));
    const r: string | undefined = role.get(String(p.bio.id)) ?? (off === "practice" || off === "reserve" ? off : undefined);
    const after = endById.get(String(p.bio.id));
    if (r === undefined || after === undefined) continue;
    const pos = p.bio.position;
    const from = positionOverall(pos, p.attributes.values);
    const to = positionOverall(pos, after.attributes.values);
    const band = AGE_BANDS.find((b) => p.bio.age >= b.min && p.bio.age <= b.max)!.label;
    const cell = ((movement[band] ??= {})[r] ??= { n: 0, sum: 0, sumSq: 0, deltas: [] });
    const d = to - from;
    cell.n++; cell.sum += d; cell.sumSq += d * d; cell.deltas.push(Math.round(d * 100) / 100);
    if (r === "starter" || r === "backup") { gap[r].n++; gap[r].start += from; gap[r].end += to; }
  }
  for (const g of Object.values(gap)) if (g.n > 0) { g.start /= g.n; g.end /= g.n; }

  return {
    seed: input.seed, arm: input.arm, wins, betterRecord: { games, won }, regularSeasonGames, injuries, movement, gap,
    roster: { emergencySignings, unsignedRetired, depthChanges, battles },
    ...(input.groups ? { standIn: standInCounts(input.startPlayers, input.groups, injuriesByGroup, callUps) } : {}),
  };
}

/** What the stand-in league's start holds by roster group: players, those already hurt, and the 53's growth rates. */
function standInCounts(
  start: readonly PlayerState[], groups: ReadonlyMap<string, Exclude<RosterGroup, "street">>, injuriesByGroup: Record<string, number>, callUps: number,
): NonNullable<SeasonCheck["standIn"]> {
  const players: Record<string, number> = {};
  const startedHurt: Record<string, number> = {};
  const lnGrowth: number[] = [];
  for (const p of start) {
    const g = groups.get(String(p.bio.id));
    if (g === undefined) continue;
    bump(players, g);
    if (p.condition.injury !== undefined) bump(startedHurt, g);
    const growth = p.attributes.development?.growth;
    if (g === "53" && growth !== undefined) lnGrowth.push(Math.log(growth));
  }
  return { injuriesByGroup, callUps, startedHurt, players, ...(lnGrowth.length > 0 ? { growthScale: growthScaleOf(lnGrowth) } : {}) };
}

/** Median and spread of growth rates, from their logarithms. */
export function growthScaleOf(lnGrowth: readonly number[]): GrowthScale {
  const s = [...lnGrowth].sort((a, b) => a - b);
  const mid = s.length % 2 === 1 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
  const m = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, median: Math.exp(mid), medianLog: mid, sdLog: Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / s.length) };
}

// --- across seasons ------------------------------------------------------------------------------

/** ADR-079 R5's NFL row (2021-24 regular seasons; `packages/franchise/test/fixtures/nfl-seasons.json`). REPORTED. */
export const NFL_SPREAD = { winSpread: 3.05, best: 13.8, worst: 2.8, share13Plus: 0.10, share4OrFewer: 0.14, betterRecordWins: 0.74 } as const;

const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const sd = (xs: readonly number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const quantile = (xs: readonly number[], q: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]!;
};

export interface ArmSummary {
  readonly arm: string;
  readonly seasons: number;
  readonly spread: { winSpread: number; best: number; worst: number; share13Plus: number; share4OrFewer: number; betterRecordWins: number };
  readonly injuries: {
    perTeamGame: number;
    perTeamSeason: number;
    settingShares: Record<string, number>;
    bandShares: Record<string, number>;
    longInSeasonPerTeam: number;
    weeksPerInjury: number;
    gameByGroupPerTeamGame: Record<string, number>;
    topKinds: { kind: string; share: number }[];
    /** The regular season in the real measurement's terms (`SeasonCheck`'s `regular`); "per team-game" is per team interval. */
    regular: {
      timeLossPerTeamGame: number;
      dayToDayPerTeamGame: number;
      timeLossAllCausesPerTeamGame: number;
      settingShares: Record<string, number>;
      /** Football time-loss per team-game by setting (what the game rate, practice and away each add). */
      timeLossBySettingPerTeamGame: Record<string, number>;
      timeLossBands: Record<string, number>;
      timeLossByGroupPerTeamGame: Record<string, number>;
      longPerTeamSeason: number;
      longAllPerTeamSeason: number;
    };
  };
  readonly movement: Record<string, Record<string, { n: number; mean: number; sd: number; p10: number; p90: number }>>;
  readonly gap: { starterStart: number; starterEnd: number; backupStart: number; backupEnd: number };
  readonly roster: { emergencySigningsPerSeason: number; unsignedRetiredPerSeason: number; depthChangesPerTeamSeason: Record<string, number>; battlesPerTeamSeason: number };
  /** Stand-in league only: `SeasonCheck.standIn` over the arm's seasons. */
  readonly standIn?: {
    /** INJURY_OCCURRED per team-season, and per player-season, by roster group. */
    readonly injuriesPerTeamSeason: Record<string, number>;
    readonly injuriesPerPlayerSeason: Record<string, number>;
    /** Players hurt at the start of camp, per team, by roster group. */
    readonly startedHurtPerTeam: Record<string, number>;
    readonly playersPerTeam: Record<string, number>;
    /** Practice-squad call-ups a season (part of `roster.emergencySigningsPerSeason`). */
    readonly callUpsPerSeason: number;
    readonly growthScale?: GrowthScale;
  };
}

export function summariseArm(checks: readonly SeasonCheck[]): ArmSummary {
  const arm = checks[0]?.arm ?? "?";
  const teams = Object.keys(checks[0]?.wins ?? {}).length || 32;
  const wins = checks.map((c) => Object.values(c.wins));
  const allWins = wins.flat();
  const regularGames = checks.reduce((n, c) => n + c.regularSeasonGames, 0);
  const total = checks.reduce((n, c) => n + c.injuries.total, 0);
  const sumBy = (pick: (c: SeasonCheck) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const c of checks) for (const [k, v] of Object.entries(pick(c))) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  const shares = (m: Record<string, number>, of: number) => Object.fromEntries(Object.entries(m).sort().map(([k, v]) => [k, of > 0 ? v / of : 0]));
  const kinds = sumBy((c) => c.injuries.byKind);
  const movement: ArmSummary["movement"] = {};
  for (const c of checks) {
    for (const [band, roles] of Object.entries(c.movement)) {
      for (const [role, cell] of Object.entries(roles)) {
        const into = ((movement[band] ??= {})[role] ??= { n: 0, mean: 0, sd: 0, p10: 0, p90: 0 }) as { n: number; mean: number; sd: number; p10: number; p90: number; all?: number[] };
        into.all = [...(into.all ?? []), ...cell.deltas];
      }
    }
  }
  for (const roles of Object.values(movement)) {
    for (const [role, cell] of Object.entries(roles)) {
      const all = (cell as { all?: number[] }).all ?? [];
      roles[role] = { n: all.length, mean: mean(all), sd: sd(all), p10: quantile(all, 0.1), p90: quantile(all, 0.9) };
    }
  }
  const gapOf = (r: "starter" | "backup", k: "start" | "end") => mean(checks.map((c) => c.gap[r][k]));
  return {
    arm,
    seasons: checks.length,
    spread: {
      winSpread: mean(wins.map(sd)),
      best: mean(wins.map((w) => Math.max(...w))),
      worst: mean(wins.map((w) => Math.min(...w))),
      share13Plus: allWins.filter((w) => w >= 13).length / Math.max(1, allWins.length),
      share4OrFewer: allWins.filter((w) => w <= 4).length / Math.max(1, allWins.length),
      betterRecordWins: checks.reduce((n, c) => n + c.betterRecord.won, 0) / Math.max(1, checks.reduce((n, c) => n + c.betterRecord.games, 0)),
    },
    injuries: {
      perTeamGame: checks.reduce((n, c) => n + c.injuries.regularGame, 0) / Math.max(1, 2 * regularGames),
      perTeamSeason: total / Math.max(1, teams * checks.length),
      settingShares: shares(sumBy((c) => c.injuries.bySetting), total),
      bandShares: shares(sumBy((c) => c.injuries.byBand), total),
      longInSeasonPerTeam: checks.reduce((n, c) => n + c.injuries.longInSeason, 0) / Math.max(1, teams * checks.length),
      weeksPerInjury: checks.reduce((n, c) => n + c.injuries.weeksLost, 0) / Math.max(1, total),
      gameByGroupPerTeamGame: shares(sumBy((c) => c.injuries.regularGameByGroup), 2 * regularGames),
      topKinds: Object.entries(kinds).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([kind, n]) => ({ kind, share: n / Math.max(1, total) })),
      regular: (() => {
        const sum = (pick: (r: SeasonCheck["injuries"]["regular"]) => number) => checks.reduce((n, c) => n + pick(c.injuries.regular), 0);
        const tl = sum((r) => r.timeLoss), dd = sum((r) => r.dayToDay);
        const intervals = Math.max(1, sum((r) => r.intervals));
        const teamSeasons = Math.max(1, teams * checks.length);
        return {
          timeLossPerTeamGame: tl / intervals,
          dayToDayPerTeamGame: dd / intervals,
          timeLossAllCausesPerTeamGame: sum((r) => r.timeLossAllCauses) / intervals,
          settingShares: shares(sumBy((c) => c.injuries.regular.bySetting), tl + dd),
          timeLossBySettingPerTeamGame: shares(sumBy((c) => c.injuries.regular.timeLossBySetting), intervals),
          timeLossBands: shares(sumBy((c) => c.injuries.regular.timeLossBands), tl),
          timeLossByGroupPerTeamGame: shares(sumBy((c) => c.injuries.regular.timeLossByGroup), intervals),
          longPerTeamSeason: sum((r) => r.long) / teamSeasons,
          longAllPerTeamSeason: sum((r) => r.longAll) / teamSeasons,
        };
      })(),
    },
    movement,
    gap: { starterStart: gapOf("starter", "start"), starterEnd: gapOf("starter", "end"), backupStart: gapOf("backup", "start"), backupEnd: gapOf("backup", "end") },
    roster: {
      emergencySigningsPerSeason: mean(checks.map((c) => c.roster.emergencySignings)),
      unsignedRetiredPerSeason: mean(checks.map((c) => c.roster.unsignedRetired)),
      depthChangesPerTeamSeason: Object.fromEntries(Object.entries(sumBy((c) => c.roster.depthChanges)).sort().map(([k, v]) => [k, v / Math.max(1, teams * checks.length)])),
      battlesPerTeamSeason: checks.reduce((n, c) => n + c.roster.battles, 0) / Math.max(1, teams * checks.length),
    },
    ...(checks.length > 0 && checks.every((c) => c.standIn !== undefined) ? { standIn: standInArm(checks, teams) } : {}),
  };
}

function standInArm(checks: readonly SeasonCheck[], teams: number): NonNullable<ArmSummary["standIn"]> {
  const seasons = checks.length;
  const sum = (pick: (s: NonNullable<SeasonCheck["standIn"]>) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const c of checks) for (const [k, v] of Object.entries(pick(c.standIn!))) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  const per = (m: Record<string, number>, by: (g: string) => number) =>
    Object.fromEntries(ROSTER_GROUPS.filter((g) => m[g] !== undefined && by(g) > 0).map((g) => [g, m[g]! / by(g)]));
  const injuries = sum((s) => s.injuriesByGroup);
  const players = sum((s) => s.players);
  const growth = checks[0]!.standIn!.growthScale;
  return {
    injuriesPerTeamSeason: per(injuries, () => teams * seasons),
    injuriesPerPlayerSeason: per(injuries, (g) => players[g] ?? 0),
    startedHurtPerTeam: per(sum((s) => s.startedHurt), () => teams * seasons),
    playersPerTeam: per(players, () => teams * seasons),
    callUpsPerSeason: checks.reduce((n, c) => n + c.standIn!.callUps, 0) / seasons,
    // Every season starts from the same file, so the 53's growth rates are the same each season.
    ...(growth ? { growthScale: growth } : {}),
  };
}
