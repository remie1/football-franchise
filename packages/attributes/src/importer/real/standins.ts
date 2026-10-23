/**
 * THE STAND-INS (ADR-088 R2): each real player becomes a made-up one with his real team, position,
 * age, size, draft slot and years in the league.
 *
 * Pure: takes the snapshot's rows (see `rows.ts`) and returns the league. No I/O, so the tests
 * run on hand-written rows with made-up ids.
 *
 * Names: a real player keeps his stand-in name and id for as long as the sealed table (local,
 * gitignored; attributes.md §5) remembers him. A new player draws a name from his own seed,
 * re-drawing on a clash with any stand-in or any real player in nflverse's player list (past or
 * present), so no stand-in is accidentally named after a real one. Real names are read for that
 * check only and never leave this function.
 */
import {
  createRng, playerId,
  type PlayerId, type PlayerState, type Position, type Team, type TeamId,
} from "@ff/contracts";
import type { Measurements } from "../../fictional/derive.js";
import { drawName } from "../../fictional/names.js";
import { ESPN_SLOT, gamePosition, REAL_TEAM_SLOTS } from "./positions.js";
import type { CombineRow, DepthRow, PlayerRow, RosterRow } from "./rows.js";

/** Real id (nflverse `gsis_id`) → stand-in. Local only: this is the one join back to real identity. */
export type SealedTable = Record<string, { readonly id: string; readonly name: string }>;

export type RosterStatus = "active" | "reserve" | "practice";

/** Positions every game-day roster has; see the elevation rule in `buildStandIns`. */
export const MUST_FIELD: readonly Position[] = ["QB", "K", "P", "LS"];

/**
 * nflverse's detailed roster status → ours: A01 is the 53; P01-P07 the practice squad (a
 * practice player elevated for a game is listed active that week, and stays practice here);
 * reserve lists (R01 injured, R04 PUP, R05 non-football injury, R4x suspended / designated to
 * return) are reserve; R02 (retired), cuts, waivers and exempt lists are off the team.
 */
/** The coarse status must agree: a row marked cut, retired, traded or exempt is off the team whatever its code. */
const ON_TEAM = new Set(["ACT", "INA", "RES", "DEV"]);

export function rosterStatus(status: string, code: string | null): RosterStatus | undefined {
  if (code === null || !ON_TEAM.has(status)) return undefined;
  if (code === "A01") return "active";
  if (code.startsWith("P")) return "practice";
  if (code.startsWith("R") && code !== "R02") return "reserve";
  return undefined;
}

export interface StandInInput {
  readonly season: number;
  /** The snapshot's date, `YYYY-MM-DD`; ages are taken on it. */
  readonly date: string;
  /** The league's 32 teams in `buildLeague` order. Their roster and depth chart are replaced. */
  readonly teams: readonly Team[];
  readonly rosters: readonly RosterRow[];
  readonly players: readonly PlayerRow[];
  readonly combine: readonly CombineRow[];
  readonly depth: readonly DepthRow[];
  readonly sealed: SealedTable;
}

/** What `RatedLeague.provenance` holds for the stand-in league (ADR-088 "interim placement"). */
export interface RealProvenance {
  readonly importer: "real/1";
  readonly season: number;
  readonly snapshotDate: string;
  readonly status: Readonly<Record<string, RosterStatus>>;
  readonly creditedSeasons: Readonly<Record<string, number>>;
  /** Combine numbers where he tested; height and weight always. */
  readonly measurements: Readonly<Record<string, Partial<Measurements>>>;
  /** His best rank on his team's latest ESPN depth chart (1 = starter), where listed. */
  readonly espnRank: Readonly<Record<string, number>>;
  /** Practice-squad players moved up because their team had nobody at a must-field position. */
  readonly elevated: readonly string[];
  readonly reserve: Readonly<Record<string, readonly string[]>>;
  readonly practiceSquad: Readonly<Record<string, readonly string[]>>;
}

export interface StandInLeague {
  readonly teams: Team[];
  readonly players: PlayerState[];
  readonly provenance: RealProvenance;
  readonly sealed: SealedTable;
}

/** Whole years between two `YYYY-MM-DD` dates. */
export function ageOn(birth: string, on: string): number {
  const [by, bm, bd] = birth.split("-").map(Number) as [number, number, number];
  const [y, m, d] = on.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Each player's row from his team's latest week. A player on two teams' latest rosters stays with the later week. */
function latestRows(rows: readonly RosterRow[]): RosterRow[] {
  const lastWeek = new Map<string, number>();
  for (const r of rows) lastWeek.set(r.team, Math.max(lastWeek.get(r.team) ?? 0, r.week));
  const byPlayer = new Map<string, RosterRow>();
  for (const r of rows) {
    if (r.week !== lastWeek.get(r.team) || r.gsis_id === null || rosterStatus(r.status, r.status_description_abbr) === undefined) continue;
    const prev = byPlayer.get(r.gsis_id);
    if (prev === undefined || r.week > prev.week) byPlayer.set(r.gsis_id, r);
  }
  return [...byPlayer.values()].sort((a, b) => (a.gsis_id! < b.gsis_id! ? -1 : 1));
}

/** Each team's latest ESPN depth chart: player → (game position → best rank there). */
function latestDepth(rows: readonly DepthRow[]): Map<string, Map<Position, number>> {
  const lastDt = new Map<string, string>();
  for (const r of rows) if ((lastDt.get(r.team) ?? "") < r.dt) lastDt.set(r.team, r.dt);
  const out = new Map<string, Map<Position, number>>();
  for (const r of rows) {
    const pos = ESPN_SLOT[r.pos_abb];
    if (r.dt !== lastDt.get(r.team) || r.gsis_id === null || pos === undefined) continue;
    const m = out.get(r.gsis_id) ?? new Map<Position, number>();
    m.set(pos, Math.min(m.get(pos) ?? Infinity, r.pos_rank));
    out.set(r.gsis_id, m);
  }
  return out;
}

const inches = (ht: string | null): number | undefined => {
  const m = /^(\d+)-(\d+)$/.exec(ht ?? "");
  return m ? Number(m[1]) * 12 + Number(m[2]) : undefined;
};

export function buildStandIns(input: StandInInput): StandInLeague {
  if (input.teams.length !== REAL_TEAM_SLOTS.length) {
    throw new Error(`buildStandIns: needs ${REAL_TEAM_SLOTS.length} teams, got ${input.teams.length}`);
  }
  const slotOf = new Map(REAL_TEAM_SLOTS.map((code, i) => [code, input.teams[i]!.id]));
  const draftOf = new Map(input.players.filter((p) => p.gsis_id !== null).map((p) => [p.gsis_id!, p]));
  const combineOf = new Map(input.combine.filter((c) => c.pfr_id !== null).map((c) => [c.pfr_id!, c]));
  const espn = latestDepth(input.depth);
  const rows = latestRows(input.rosters);

  const sealed: Record<string, { id: string; name: string }> = { ...input.sealed };
  const taken = new Set<string>([
    ...Object.values(sealed).map((s) => s.name),
    ...input.rosters.map((r) => r.full_name).filter((n): n is string => n !== null),
    ...input.players.map((p) => p.display_name).filter((n): n is string => n !== null),
  ]);
  let next = Math.max(0, ...Object.values(sealed).map((s) => Number(s.id.slice(2)) || 0)) + 1;

  const creditedSeasons: Record<string, number> = {};
  const measurements: Record<string, Partial<Measurements>> = {};
  const espnRank: Record<string, number> = {};
  const players: PlayerState[] = [];
  const onTeam = new Map<TeamId, { id: PlayerId; position: Position; status: RosterStatus; rank: number; exp: number }[]>();
  const status: Record<string, RosterStatus> = {};
  const sides = new Map<string, Record<string, number>>();

  for (const r of rows) {
    const teamId = slotOf.get(r.team);
    if (teamId === undefined) throw new Error(`buildStandIns: unknown team code "${r.team}"`);
    const gsis = r.gsis_id!;
    let entry = sealed[gsis];
    if (entry === undefined) {
      entry = { id: `r:${next++}`, name: drawName(createRng(`standin:${gsis}`, "attributes:real:name"), taken) };
      sealed[gsis] = entry;
    }
    const id = playerId(entry.id);
    const listed = espn.get(gsis) ?? new Map<Position, number>();
    const teamSides = sides.get(r.team) ?? {};
    sides.set(r.team, teamSides);
    const position = gamePosition(r.depth_chart_position, r.position, new Set(listed.keys()), teamSides);
    const st = rosterStatus(r.status, r.status_description_abbr)!;
    const d = draftOf.get(gsis);
    const pfr = r.pfr_id ?? d?.pfr_id ?? null;
    const c = pfr === null ? undefined : combineOf.get(pfr);
    const birth = r.birth_date ?? d?.birth_date ?? null;
    const heightIn = r.height ?? inches(c?.ht ?? null) ?? 0;
    const weightLb = r.weight ?? c?.wt ?? 0;
    const m: Partial<Measurements> = { heightIn, weightLb };
    if (c?.forty != null) (m as { forty?: number }).forty = c.forty;
    if (c?.bench != null) (m as { bench?: number }).bench = c.bench;
    if (c?.vertical != null) (m as { vertical?: number }).vertical = c.vertical;
    if (c?.cone != null) (m as { cone?: number }).cone = c.cone;

    status[entry.id] = st;
    creditedSeasons[entry.id] = r.years_exp ?? 0;
    measurements[entry.id] = m;
    players.push({
      bio: {
        id,
        displayName: entry.name,
        position,
        // No birth date (a handful): a rookie at 22 plus his years in the league.
        age: birth === null ? 22 + (r.years_exp ?? 0) : ageOn(birth, input.date),
        heightIn,
        weightLb,
        draft: d?.draft_round != null && d.draft_pick != null && d.draft_year != null
          ? { year: d.draft_year, round: d.draft_round, pick: d.draft_pick }
          : "UDFA",
      },
      // Ratings come in R3; until then only the empty map.
      attributes: { kind: "true", values: {}, traits: new Set<string>() },
      condition: { stamina: 100, morale: 0 },
      personality: { needs: {}, type: "quiet" },
      teamId,
    });
    const list = onTeam.get(teamId) ?? [];
    // His rank at his own position, else his best rank anywhere ESPN lists him (a DE listed as an outside linebacker).
    const rank = listed.get(position) ?? Math.min(Infinity, ...listed.values());
    if (rank !== Infinity) espnRank[entry.id] = rank;
    list.push({ id, position, status: st, rank, exp: r.years_exp ?? 0 });
    onTeam.set(teamId, list);
  }

  const reserve: Record<string, string[]> = {};
  const practiceSquad: Record<string, string[]> = {};
  const elevated: string[] = [];
  const teams = input.teams.map((team): Team => {
    const list = onTeam.get(team.id) ?? [];
    // A real team never plays without a quarterback, kicker, punter or snapper: when the copy
    // catches one between moves (cut on Tuesday, his replacement still on the practice squad),
    // the practice-squad man is elevated, as the real team does on game day.
    for (const must of MUST_FIELD) {
      if (list.some((p) => p.position === must && p.status === "active")) continue;
      const up = list.find((p) => p.position === must && p.status === "practice");
      if (up === undefined) continue;
      up.status = "active";
      status[String(up.id)] = "active";
      elevated.push(String(up.id));
    }
    const active = list.filter((p) => p.status === "active");
    // ESPN's order within each position; the unlisted after, most experienced first (ADR-088 Q10).
    active.sort((a, b) => a.rank - b.rank || b.exp - a.exp || (String(a.id) < String(b.id) ? -1 : 1));
    const depthChart: Partial<Record<Position, PlayerId[]>> = {};
    for (const p of active) (depthChart[p.position] ??= []).push(p.id);
    reserve[String(team.id)] = list.filter((p) => p.status === "reserve").map((p) => String(p.id));
    practiceSquad[String(team.id)] = list.filter((p) => p.status === "practice").map((p) => String(p.id));
    return { ...team, roster: active.map((p) => p.id), depthChart };
  });

  return {
    teams,
    players,
    provenance: {
      importer: "real/1", season: input.season, snapshotDate: input.date,
      status, creditedSeasons, measurements, espnRank, elevated, reserve, practiceSquad,
    },
    sealed,
  };
}
