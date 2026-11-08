/**
 * CONTRACTS (ADR-088 R4; ADR-085 §3).
 *
 * nflverse's contract file (from OverTheCap) carries, for every player with a current deal, his
 * year-by-year money: base salary, bonus proration, roster and workout bonuses, guaranteed
 * salary and cap number (`season_history`, in millions). That history belongs to the PLAYER,
 * not to one contract: every one of his contract rows carries the same copy, and a player who
 * was cut has no future years in it. So:
 *
 *   - his contract is the rows of his history from this season on, on his current team, that
 *     count against the cap (cap number above zero);
 *   - a player with a current deal but no row for this season (mostly deals signed this
 *     offseason, before OverTheCap fills in their years: the season's rookie class, practice-squad
 *     and minimum deals signed late) gets the deal's real length from this season on, each year
 *     at its yearly average, marked estimated (`estimatedYears`);
 *   - dead money left behind by cut and traded players is NOT in the file (a cut player's
 *     history stops). It needs another source; see ADR-088 R4.
 *
 * The shape is the existing `PlayerContract` plus ADR-085's proposed K1/K2 fields, all
 * optional, so the league file needs no contracts edit today and fits K1/K2 once approved.
 */
import { playerId, type CalendarStamp, type ContractYear, type PlayerContract, type PlayerId, type TeamId } from "@ff/contracts";
import { REAL_TEAM_SLOTS } from "./positions.js";

/** OverTheCap's team names in the history rows → nflverse team codes. */
export const OTC_TEAM: Readonly<Record<string, string>> = {
  Ravens: "BAL", Bengals: "CIN", Browns: "CLE", Steelers: "PIT",
  Texans: "HOU", Colts: "IND", Jaguars: "JAX", Titans: "TEN",
  Bills: "BUF", Dolphins: "MIA", Patriots: "NE", Jets: "NYJ",
  Broncos: "DEN", Chiefs: "KC", Chargers: "LAC", Raiders: "LV",
  Bears: "CHI", Lions: "DET", Packers: "GB", Vikings: "MIN",
  Falcons: "ATL", Panthers: "CAR", Saints: "NO", Buccaneers: "TB",
  Cowboys: "DAL", Giants: "NYG", Eagles: "PHI", Commanders: "WAS",
  Cardinals: "ARI", Rams: "LA", Seahawks: "SEA", "49ers": "SF",
};

export interface HistoryYear {
  readonly year: string;
  readonly team: string;
  readonly base_salary: number | null;
  readonly prorated_bonus: number | null;
  readonly option_bonus: number | null;
  readonly roster_bonus: number | null;
  readonly guaranteed_salary: number | null;
  readonly cap_number: number | null;
  readonly workout_bonus: number | null;
  readonly per_game_roster_bonus: number | null;
  readonly other_bonus: number | null;
}

export interface ContractHistoryRow {
  readonly gsis_id: string | null;
  readonly is_active: boolean;
  readonly year_signed: number | null;
  readonly years: number | null;
  /** The deal's whole value and its guaranteed money, in millions. */
  readonly value: number | null;
  readonly guaranteed: number | null;
  readonly apy: number | null;
  readonly draft_year: number | null;
  readonly season_history: readonly HistoryYear[] | null;
}

/** ADR-085 K1, proposed: the real pieces of a year. Optional so today's `ContractYear` still fits. */
export interface StandInContractYear extends ContractYear {
  readonly rosterBonus?: number;
  readonly workoutBonus?: number;
  readonly optionBonusProration?: number;
  readonly perGameRosterBonus?: number;
  readonly guaranteedSalary?: number;
  /** A year after the deal's real end that exists only to spread a bonus (zero base, proration only). */
  readonly voidYear?: boolean;
}

/** ADR-085 K2, proposed (kind only). */
export interface StandInContract extends PlayerContract {
  readonly years: StandInContractYear[];
  readonly kind?: "ROOKIE" | "VETERAN";
}

/** How sure each copy is: "copied" from the year-by-year history, "estimated" at the deal's yearly average. */
export type ContractSource = "copied" | "estimated";

const dollars = (m: number | null | undefined): number => Math.round((m ?? 0) * 1_000_000);

/**
 * A deal OverTheCap has no year rows for yet: the years it really runs from this season on (`years`
 * from `year_signed`; one when either is missing), each at the deal's yearly average. Real rookie deals
 * run four years drafted and three undrafted; OverTheCap lists them so from signing, and fills in their
 * year-by-year pay later. Its guaranteed money counts as a signing bonus spread evenly over the whole
 * deal, as a rookie's is, unless the whole deal is guaranteed (every first-rounder's, some
 * second-rounders'), when each year's salary is. The length, the yearly average and the guaranteed
 * total are OverTheCap's; only the split by year is estimated (a real deal's pay rises a little each year).
 */
export function estimatedYears(c: ContractHistoryRow, season: number): StandInContractYear[] {
  const apy = dollars(c.apy);
  const length = c.year_signed !== null && c.years !== null && c.years > 0 ? c.years : 1;
  const last = length > 1 ? c.year_signed! + length - 1 : season;
  const value = c.value === null ? apy * length : dollars(c.value);
  const guaranteed = Math.min(dollars(c.guaranteed), value);
  const whole = value > 0 && guaranteed >= value;
  const proration = whole ? 0 : Math.min(apy, Math.round(guaranteed / length));
  const years: StandInContractYear[] = [];
  for (let s = season; s <= Math.max(season, last); s++) {
    years.push({
      season: s, baseSalary: apy - proration, signingBonusProration: proration,
      guarantees: { fullyGuaranteed: whole }, capHit: apy,
      ...(whole ? { guaranteedSalary: apy } : {}),
    });
  }
  return years;
}

/** A deal signed in year Y was signed in the offseason before season Y (free agency's opening week). */
export const signedStamp = (year: number): CalendarStamp => ({ season: year - 1, phase: "OFF_RESET_FA", week: 1, day: 1 });

/**
 * Each stand-in's contract. `players`: real id -> (stand-in id, team, nflverse team code).
 */
export function buildContracts(input: {
  readonly season: number;
  readonly contracts: readonly ContractHistoryRow[];
  readonly players: ReadonlyMap<string, { readonly id: PlayerId; readonly team: TeamId; readonly code: string }>;
}): { contracts: StandInContract[]; source: Record<string, ContractSource>; missing: string[] } {
  // His current deal: the active contract signed most recently.
  const deal = new Map<string, ContractHistoryRow>();
  for (const c of input.contracts) {
    if (!c.is_active || c.gsis_id === null) continue;
    const prev = deal.get(c.gsis_id);
    if (prev === undefined || (c.year_signed ?? 0) > (prev.year_signed ?? 0)) deal.set(c.gsis_id, c);
  }
  const contracts: StandInContract[] = [];
  const source: Record<string, ContractSource> = {};
  const missing: string[] = [];
  for (const [gsis, p] of input.players) {
    const c = deal.get(gsis);
    if (c === undefined) { missing.push(String(p.id)); continue; }
    // The last year the deal really runs; OverTheCap lists void years after it.
    const lastReal = c.year_signed !== null && c.years !== null ? c.year_signed + c.years - 1 : Infinity;
    const kind = c.draft_year !== null && c.year_signed === c.draft_year ? "ROOKIE" as const : "VETERAN" as const;
    const years: StandInContractYear[] = (c.season_history ?? [])
      .filter((y) => Number(y.year) >= input.season && OTC_TEAM[y.team] === p.code && (y.cap_number ?? 0) > 0)
      .map((y) => {
        const base = dollars(y.base_salary);
        const guaranteed = dollars(y.guaranteed_salary);
        return {
          season: Number(y.year),
          baseSalary: base,
          signingBonusProration: dollars(y.prorated_bonus),
          guarantees: { fullyGuaranteed: base > 0 && guaranteed >= base },
          capHit: dollars(y.cap_number),
          rosterBonus: dollars(y.roster_bonus),
          workoutBonus: dollars(y.workout_bonus),
          optionBonusProration: dollars(y.option_bonus),
          perGameRosterBonus: dollars(y.per_game_roster_bonus),
          guaranteedSalary: guaranteed,
          ...(Number(y.year) > lastReal && base === 0 && (y.prorated_bonus ?? 0) > 0 ? { voidYear: true } : {}),
        };
      })
      .sort((a, b) => a.season - b.season);
    const signedAt = signedStamp(c.year_signed ?? input.season);
    if (years.length > 0) {
      contracts.push({ player: p.id, team: p.team, years, signedAt, kind });
      source[String(p.id)] = "copied";
    } else {
      contracts.push({ player: p.id, team: p.team, signedAt, kind, years: estimatedYears(c, input.season) });
      source[String(p.id)] = "estimated";
    }
  }
  return { contracts, source, missing };
}

/**
 * A league file's estimated contracts rebuilt by `buildContracts` from OverTheCap's rows, for a refresh
 * of the contracts alone (`standin-contracts`: the contract rules changed and the file's snapshot is
 * not at hand). The rows must be the file's snapshot's: every deal the file copied from the
 * year-by-year history must come out as the file has it, and every estimated one must still be
 * estimated, or it throws and nothing changes. `teams` in slot order (`REAL_TEAM_SLOTS`), as
 * `import-real` makes them; `sealed` is its table of real ids -> stand-ins.
 */
export function refreshContracts(input: {
  readonly season: number;
  readonly rows: readonly ContractHistoryRow[];
  readonly sealed: Readonly<Record<string, { readonly id: string }>>;
  readonly teams: readonly { readonly id: TeamId }[];
  readonly players: readonly { readonly bio: { readonly id: PlayerId }; readonly teamId?: TeamId }[];
  readonly contracts: readonly StandInContract[];
  readonly source: Readonly<Record<string, ContractSource>>;
}): { contracts: StandInContract[]; changed: string[] } {
  const owner = new Map(input.players.flatMap((p) => (p.teamId === undefined ? [] : [[String(p.bio.id), p.teamId] as const])));
  const slot = new Map(input.teams.map((t, i) => [String(t.id), REAL_TEAM_SLOTS[i]!]));
  const built = buildContracts({
    season: input.season, contracts: input.rows,
    players: new Map(Object.entries(input.sealed).filter(([, x]) => owner.has(x.id)).map(([gsis, x]) => {
      const team = owner.get(x.id)!;
      return [gsis, { id: playerId(x.id), team, code: slot.get(String(team))! }] as const;
    })),
  });
  const fresh = new Map(built.contracts.map((c) => [String(c.player), c]));
  const unlike: string[] = [];
  const changed: string[] = [];
  const contracts = input.contracts.map((old) => {
    const id = String(old.player);
    const now = fresh.get(id);
    const same = now !== undefined && JSON.stringify(now) === JSON.stringify(old);
    if (now === undefined || built.source[id] !== input.source[id] || (input.source[id] === "copied" && !same)) { unlike.push(id); return old; }
    if (same) return old;
    changed.push(id);
    return now;
  });
  if (unlike.length > 0) {
    throw new Error(`${unlike.length} deals come out unlike the file's (${unlike.slice(0, 3).join(", ")}...): these rows are not its snapshot's`);
  }
  return { contracts, changed };
}
