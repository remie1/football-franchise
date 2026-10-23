/**
 * The whole importer, rows to league (ADR-088): stand-ins (R2), then their ratings (R3).
 * Pure: the command (`main.ts`) does the reading and writing.
 */
import type { RatedLeague, Team } from "@ff/contracts";
import { rateStandIns, type RatingProvenance } from "./rate.js";
import type { ContractRow, PlayerRow, SnapRow } from "./rows.js";
import { buildSignals } from "./signals.js";
import { buildStandIns, type RealProvenance, type SealedTable, type StandInInput } from "./standins.js";
import { trackingScores, type TrackingRow, type TrackingSource } from "./tracking.js";

export interface RealLeagueInput extends StandInInput {
  readonly seed: string;
  readonly contracts: readonly ContractRow[];
  readonly snaps: readonly SnapRow[];
  readonly tracking: Readonly<Record<TrackingSource, readonly TrackingRow[]>>;
}

export interface RealLeagueProvenance extends RealProvenance {
  readonly seed: string;
  readonly ratings: Readonly<Record<string, RatingProvenance & { readonly measures: readonly string[] }>>;
}

export function buildRealLeague(input: RealLeagueInput): { league: RatedLeague & { provenance: RealLeagueProvenance }; sealed: SealedTable } {
  const s = buildStandIns(input);
  const position = new Map(s.players.map((p) => [String(p.bio.id), p.bio.position]));
  const realIds = realIdsOf(s.sealed, input.rosters, input.players);
  const tracked = trackingScores(
    s.players.map((p) => ({ id: String(p.bio.id), position: p.bio.position, ...realIds.get(String(p.bio.id)) })),
    input.tracking,
  );
  const base = buildSignals({
    sealed: s.sealed, rosters: input.rosters, players: input.players, contracts: input.contracts, snaps: input.snaps,
    positionOf: (id) => position.get(id)!, creditedSeasons: s.provenance.creditedSeasons, espnRank: s.provenance.espnRank,
  });
  const signals = Object.fromEntries(Object.entries(base).map(([id, sig]) => [id, { ...sig, play: tracked.get(id)?.play }]));
  const rated = rateStandIns({
    seed: input.seed, players: s.players, measurements: s.provenance.measurements, signals,
    nudges: Object.fromEntries([...tracked].map(([id, t]) => [id, t.nudges])),
  });
  const ratings = Object.fromEntries(Object.entries(rated.ratings).map(([id, r]) => [id, { ...r, measures: tracked.get(id)?.measures ?? [] }]));
  const teams: Team[] = s.teams;
  return {
    league: { teams, players: rated.players, provenance: { ...s.provenance, seed: input.seed, ratings }, coverage: null },
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
