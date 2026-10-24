/**
 * The whole importer, rows to league (ADR-088): stand-ins (R2), then their ratings (R3).
 * Pure: the command (`main.ts`) does the reading and writing.
 */
import { playerId, type RatedLeague, type Team } from "@ff/contracts";
import { buildContracts, type ContractSource, type StandInContract } from "./contracts.js";
import { REAL_TEAM_SLOTS } from "./positions.js";
import { rateStandIns, type RatingProvenance } from "./rate.js";
import { buildHistory, type CareerHistory } from "./history.js";
import type { ContractRow, InjuryRow, PlayerRow, SnapRow } from "./rows.js";
import { buildSignals } from "./signals.js";
import { buildStandIns, type RealProvenance, type SealedTable, type StandInInput } from "./standins.js";
import { trackingScores, type TrackingRow, type TrackingSource } from "./tracking.js";

export interface RealLeagueInput extends StandInInput {
  readonly seed: string;
  readonly contracts: readonly ContractRow[];
  readonly snaps: readonly SnapRow[];
  readonly injuries: readonly InjuryRow[];
  readonly tracking: Readonly<Record<TrackingSource, readonly TrackingRow[]>>;
}

export interface RealLeagueProvenance extends RealProvenance {
  readonly seed: string;
  readonly ratings: Readonly<Record<string, RatingProvenance & { readonly measures: readonly string[] }>>;
  /** Each contract's copy: "copied" or "estimated" (`contracts.ts`). */
  readonly contractSource: Readonly<Record<string, ContractSource>>;
  /** Career snaps, games played, reserve list and latest injury (`history.ts`; ADR-087 reads it). */
  readonly history: Readonly<Record<string, CareerHistory>>;
  /** Stand-ins with no current deal in the contract file. */
  readonly noContract: readonly string[];
}

export function buildRealLeague(input: RealLeagueInput): {
  league: RatedLeague & { provenance: RealLeagueProvenance };
  contracts: StandInContract[];
  sealed: SealedTable;
} {
  const s = buildStandIns(input);
  const position = new Map(s.players.map((p) => [String(p.bio.id), p.bio.position]));
  const realIds = realIdsOf(s.sealed, input.rosters, input.players);
  const tracked = trackingScores(
    s.players.map((p) => ({ id: String(p.bio.id), position: p.bio.position, ...realIds.get(String(p.bio.id)) })),
    input.tracking,
  );
  const base = buildSignals({
    sealed: s.sealed, rosters: input.rosters, players: input.players, contracts: input.contracts, snaps: input.snaps,
    snapSeason: input.season - 1,
    positionOf: (id) => position.get(id)!, creditedSeasons: Object.fromEntries(s.players.map((p) => [String(p.bio.id), p.bio.creditedSeasons ?? 0])), espnRank: s.provenance.espnRank,
  });
  const signals = Object.fromEntries(Object.entries(base).map(([id, sig]) => [id, { ...sig, play: tracked.get(id)?.play }]));
  const rated = rateStandIns({
    seed: input.seed, players: s.players, measurements: s.provenance.measurements, signals,
    nudges: Object.fromEntries([...tracked].map(([id, t]) => [id, t.nudges])),
  });
  const ratings = Object.fromEntries(Object.entries(rated.ratings).map(([id, r]) => [id, { ...r, measures: tracked.get(id)?.measures ?? [] }]));
  const teams: Team[] = s.teams;
  const slot = new Map(input.teams.map((t, i) => [String(t.id), REAL_TEAM_SLOTS[i]!]));
  const owner = new Map(s.players.map((p) => [String(p.bio.id), p.teamId!]));
  const deals = buildContracts({
    season: input.season,
    contracts: input.contracts,
    players: new Map(Object.entries(s.sealed).filter(([, x]) => owner.has(x.id)).map(([gsis, x]) => {
      const team = owner.get(x.id)!;
      return [gsis, { id: playerId(x.id), team, code: slot.get(String(team))! }];
    })),
  });
  const history = buildHistory({
    season: input.season, snaps: input.snaps, injuries: input.injuries,
    players: new Map([...realIds].filter(([id]) => position.has(id)).map(([id, r]) => [id, { ...r, reserveCode: s.reserveCode[id] }])),
  });
  return {
    league: {
      teams, players: rated.players, coverage: null,
      provenance: { ...s.provenance, seed: input.seed, ratings, contractSource: deals.source, history, noContract: deals.missing },
    },
    contracts: deals.contracts,
    sealed: s.sealed,
  };
}

/** Stand-in id -> the real ids the tracking files key on. Importer-internal. */
function realIdsOf(sealed: SealedTable, rosters: StandInInput["rosters"], players: readonly PlayerRow[]) {
  const pfr = new Map<string, string>();
  for (const p of players) if (p.gsis_id !== null && p.pfr_id !== null) pfr.set(p.gsis_id, p.pfr_id);
  for (const r of rosters) if (r.gsis_id !== null && r.pfr_id !== null) pfr.set(r.gsis_id, r.pfr_id);
  return new Map(Object.entries(sealed).map(([gsis, s]) => [s.id, { gsis, pfr: pfr.get(gsis) }]));
}
