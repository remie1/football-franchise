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
 *   - a player with a current deal but no row for this season (mostly practice-squad and
 *     minimum deals signed late) gets one year at his deal's yearly average, marked estimated;
 *   - dead money left behind by cut and traded players is NOT in the file (a cut player's
 *     history stops). It needs another source; see ADR-088 R4.
 *
 * The shape is the existing `PlayerContract` plus ADR-085's proposed K1/K2 fields, all
 * optional, so the league file needs no contracts edit today and fits K1/K2 once approved.
 */
import type { CalendarStamp, ContractYear, PlayerContract, PlayerId, TeamId } from "@ff/contracts";

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
}

/** ADR-085 K2, proposed (kind only), plus how sure the copy is. */
export interface StandInContract extends PlayerContract {
  readonly years: StandInContractYear[];
  readonly kind?: "ROOKIE" | "VETERAN";
  /** "copied" from the year-by-year history; "estimated" at the deal's yearly average. */
  readonly source: "copied" | "estimated";
}

const dollars = (m: number | null | undefined): number => Math.round((m ?? 0) * 1_000_000);

/** A deal signed in year Y was signed in the offseason before season Y (free agency's opening week). */
export const signedStamp = (year: number): CalendarStamp => ({ season: year - 1, phase: "OFF_RESET_FA", week: 1, day: 1 });

/**
 * Each stand-in's contract. `players`: real id -> (stand-in id, team, nflverse team code).
 */
export function buildContracts(input: {
  readonly season: number;
  readonly contracts: readonly ContractHistoryRow[];
  readonly players: ReadonlyMap<string, { readonly id: PlayerId; readonly team: TeamId; readonly code: string }>;
}): { contracts: StandInContract[]; missing: string[] } {
  // His current deal: the active contract signed most recently.
  const deal = new Map<string, ContractHistoryRow>();
  for (const c of input.contracts) {
    if (!c.is_active || c.gsis_id === null) continue;
    const prev = deal.get(c.gsis_id);
    if (prev === undefined || (c.year_signed ?? 0) > (prev.year_signed ?? 0)) deal.set(c.gsis_id, c);
  }
  const contracts: StandInContract[] = [];
  const missing: string[] = [];
  for (const [gsis, p] of input.players) {
    const c = deal.get(gsis);
    if (c === undefined) { missing.push(String(p.id)); continue; }
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
        };
      })
      .sort((a, b) => a.season - b.season);
    const signedAt = signedStamp(c.year_signed ?? input.season);
    if (years.length > 0) {
      contracts.push({ player: p.id, team: p.team, years, signedAt, kind, source: "copied" });
    } else {
      const apy = dollars(c.apy);
      contracts.push({
        player: p.id, team: p.team, signedAt, kind, source: "estimated",
        years: [{ season: input.season, baseSalary: apy, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: apy }],
      });
    }
  }
  return { contracts, missing };
}
