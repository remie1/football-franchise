/**
 * The signals behind each stand-in's standing (ADR-088 R3; `rate.ts`), read from the snapshot.
 */
import type { Signals } from "./rate.js";
import type { ContractRow, PlayerRow, RosterRow, SnapRow } from "./rows.js";
import type { SealedTable } from "./standins.js";

const SIDE_PCT: Readonly<Record<string, keyof SnapRow>> = { K: "st_pct", P: "st_pct", LS: "st_pct" };

export function buildSignals(input: {
  readonly sealed: SealedTable;
  readonly rosters: readonly RosterRow[];
  readonly players: readonly PlayerRow[];
  readonly contracts: readonly ContractRow[];
  readonly snaps: readonly SnapRow[];
  readonly positionOf: (id: string) => string;
  readonly creditedSeasons: Readonly<Record<string, number>>;
  readonly espnRank: Readonly<Record<string, number>>;
}): Record<string, Signals> {
  const pfrOf = new Map<string, string>();
  for (const p of input.players) if (p.gsis_id !== null && p.pfr_id !== null) pfrOf.set(p.gsis_id, p.pfr_id);
  for (const r of input.rosters) if (r.gsis_id !== null && r.pfr_id !== null) pfrOf.set(r.gsis_id, r.pfr_id);
  const pickOf = new Map(input.players.filter((p) => p.gsis_id !== null).map((p) => [p.gsis_id!, p]));

  // His current deal: the active contract signed most recently.
  const deal = new Map<string, ContractRow>();
  for (const c of input.contracts) {
    if (!c.is_active || c.gsis_id === null) continue;
    const prev = deal.get(c.gsis_id);
    if (prev === undefined || (c.year_signed ?? 0) > (prev.year_signed ?? 0)) deal.set(c.gsis_id, c);
  }

  // Regular-season snap shares by pfr id, both sides and special teams.
  const snaps = new Map<string, { off: number; def: number; st: number }>();
  for (const s of input.snaps) {
    if (s.game_type !== "REG" || s.pfr_player_id === null) continue;
    const t = snaps.get(s.pfr_player_id) ?? { off: 0, def: 0, st: 0 };
    t.off += s.offense_pct ?? 0;
    t.def += s.defense_pct ?? 0;
    t.st += s.st_pct ?? 0;
    snaps.set(s.pfr_player_id, t);
  }

  const out: Record<string, Signals> = {};
  for (const [gsis, s] of Object.entries(input.sealed)) {
    if (input.creditedSeasons[s.id] === undefined) continue; // not in this snapshot
    const years = input.creditedSeasons[s.id]!;
    const c = deal.get(gsis);
    const d = pickOf.get(gsis);
    const pfr = pfrOf.get(gsis);
    const sn = pfr === undefined ? undefined : snaps.get(pfr);
    const pos = input.positionOf(s.id);
    const side = SIDE_PCT[pos];
    const share = sn === undefined ? undefined
      : side === "st_pct" ? sn.st / 17 : Math.max(sn.off, sn.def) / 17;
    out[s.id] = {
      capShare: c?.apy_cap_pct ?? undefined,
      rookieDeal: c !== undefined && d?.draft_year != null && c.year_signed === d.draft_year,
      pick: d?.draft_pick ?? undefined,
      yearsInLeague: years,
      // A player with no snaps last season who was in the league then played none; a rookie has no signal.
      snapShare: share ?? (years >= 1 ? 0 : undefined),
      depthRank: input.espnRank[s.id],
    };
  }
  return out;
}
