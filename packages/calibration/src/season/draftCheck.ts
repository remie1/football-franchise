/**
 * THE DRAFT OVER MANY YEARS (ADR-086 D7).
 *
 * Plays the stand-in league through the cap check's multi-season walk (`runCapCheck`: league year,
 * draft, year turn) and reads, from the events and the people each season leaves, what the draft did:
 * which positions go in round 1, how often a pick of each round is a starter, how many compensatory
 * picks go to how many clubs, and how many cut players are claimed off waivers. The real numbers it is
 * set against are `NFL_DRAFT` below, measured from nflverse's draft picks table.
 *
 * The reading itself is `draftReader` (an `onRun` and the rows it adds up to), so another check can
 * run it on its own walk: the 20-season check (`careerCheck.ts`) reads the draft and its own rows from
 * one walk.
 */
import type { FranchiseEvent, PlayerState, Position } from "@ff/contracts";
import { runCapCheck, type CapCheckInput } from "./capCheck.js";
import type { SeasonPeople } from "./realSeason.js";

/** Our positions in the groups the real table can be read in (it often says only DB, OL, DL or LB). */
export const DRAFT_GROUPS: Readonly<Record<string, readonly Position[]>> = {
  QB: ["QB"], RB: ["RB", "FB"], WR: ["WR"], TE: ["TE"], OL: ["LT", "LG", "C", "RG", "RT"],
  EDGE: ["DE", "OLB"], IDL: ["DT", "NT"], LB: ["MLB", "ILB"], DB: ["CB", "FS", "SS"], ST: ["K", "P", "LS"],
};

/**
 * The real league (MEASURED 2026-10-31 from nflverse-data `draft_picks.csv`, release tag draft_picks).
 * Round 1 by position group: the 446 first-round picks of 2011-2024, the table's positions folded into
 * `DRAFT_GROUPS` (T, G, C, OL → OL; DE, OLB → EDGE; DT, NT, DL → IDL; LB, ILB → LB; CB, S, DB → DB).
 * Starter rate by round: drafts 2011-2018, seasons as a primary starter (PFR's `seasons_started`) over
 * seasons in the league (`to` − draft year + 1).
 */
export const NFL_DRAFT = {
  roundOneShare: { QB: 0.105, RB: 0.04, WR: 0.135, TE: 0.025, OL: 0.2, EDGE: 0.137, IDL: 0.103, LB: 0.081, DB: 0.175, ST: 0 } as Record<string, number>,
  starterRate: { "1": 0.635, "2": 0.512, "3": 0.41, "4-7": 0.239 } as Record<string, number>,
  everStarter: { "1": 0.933, "2": 0.802, "3": 0.653, "4-7": 0.341 } as Record<string, number>,
} as const;

/**
 * How many men at each position count as starters in a team's depth chart (CHOSEN: an 11 on each side
 * from the roster shape, 3 receivers and a 4-3 front; specialists one each).
 */
export const STARTING: Readonly<Record<Position, number>> = {
  QB: 1, RB: 1, FB: 0, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  DE: 2, DT: 2, NT: 0, OLB: 2, MLB: 1, ILB: 0, CB: 2, FS: 1, SS: 1, K: 1, P: 1, LS: 1,
};

export interface DraftCheckResult {
  readonly drafts: number;
  /** Share of round-1 picks by group, ours. */
  readonly roundOneShare: Record<string, number>;
  /** By round band: player-seasons on a 53 that ended as a starter, over all player-seasons on a 53. */
  readonly starterRate: Record<string, number>;
  /** By round band: share of picks who were a starter at the end of any season (only drafts with 3+ seasons played). */
  readonly everStarter: Record<string, number>;
  /** Each draft: compensatory picks and how many clubs got one; waiver claims on its cut-down day. */
  readonly perYear: { draft: number; compPicks: number; compClubs: number; waiverClaims: number }[];
}

const band = (round: number) => (round <= 3 ? String(round) : "4-7");

/**
 * The draft check's reader: an `onRun` for the cap check's walk, and the rows it adds up to once the
 * walk is done. `runDraftCheck` runs it alone; the 20-season check (`runCareerCheck`) runs it beside
 * its own on one walk.
 */
export interface DraftReader {
  readonly onRun: (season: number, events: readonly FranchiseEvent[], people: SeasonPeople) => void;
  result(): DraftCheckResult;
  /** What it has read so far, as plain JSON (a checkpoint between seasons), and back into a fresh reader. */
  save(): DraftReaderState;
  restore(state: DraftReaderState): void;
}

/** The draft reader's state as plain JSON. */
export interface DraftReaderState {
  readonly position: [string, Position][];
  readonly pickRound: [string, { draft: number; round: number }][];
  readonly roundOne: string[];
  readonly seasons: [string, { onTeam: number; started: number; everStarted: boolean }][];
  readonly perYear: DraftCheckResult["perYear"];
  readonly lastSeason: number;
}

export function draftReader(): DraftReader {
  const groupOf = new Map<Position, string>();
  for (const [g, ps] of Object.entries(DRAFT_GROUPS)) for (const p of ps) groupOf.set(p, g);
  let position = new Map<string, Position>();
  let pickRound = new Map<string, { draft: number; round: number }>();
  let roundOne: string[] = [];
  let seasons = new Map<string, { onTeam: number; started: number; everStarted: boolean }>();
  let perYear: DraftCheckResult["perYear"] = [];
  let lastSeason = 0;

  const onRun = (season: number, events: readonly FranchiseEvent[], people: SeasonPeople) => {
    lastSeason = season;
    for (const p of people.players) position.set(String(p.bio.id), p.bio.position);
    // The season's cut-down day (its waiver claims) and the draft of its offseason (draft season + 1).
    let compPicks = 0;
    const compClubs = new Set<string>();
    let waiverClaims = 0;
    for (const e of events) {
      if (e.type === "DRAFT_PICK_MADE") {
        pickRound.set(String(e.payload.player), { draft: season + 1, round: e.payload.round });
        if (e.payload.round === 1) roundOne.push(String(e.payload.player));
      } else if (e.type === "COMPENSATORY_PICKS_AWARDED") {
        for (const p of e.payload.picks) { compPicks++; compClubs.add(String(p.team)); }
      } else if (e.type === "WAIVER_CLAIMED") waiverClaims++;
    }
    perYear.push({ draft: season + 1, compPicks, compClubs: compClubs.size, waiverClaims });
    // Who of our draftees is on a 53 at the season's end, and is he a starter there.
    const byId = new Map<string, PlayerState>(people.players.map((p) => [String(p.bio.id), p]));
    for (const t of people.teams) {
      for (const id of t.roster) {
        const pick = pickRound.get(String(id));
        if (!pick || pick.draft > season) continue;
        const p = byId.get(String(id));
        if (!p) continue;
        const chart = t.depthChart[p.bio.position] ?? [];
        const starter = chart.slice(0, STARTING[p.bio.position]).some((x) => String(x) === String(id));
        const s = seasons.get(String(id)) ?? { onTeam: 0, started: 0, everStarted: false };
        s.onTeam++;
        if (starter) { s.started++; s.everStarted = true; }
        seasons.set(String(id), s);
      }
    }
  };

  const result = (): DraftCheckResult => {
    const roundOneCount: Record<string, number> = Object.fromEntries(Object.keys(DRAFT_GROUPS).map((g) => [g, 0]));
    for (const id of roundOne) { const g = groupOf.get(position.get(id)!) ?? "ST"; roundOneCount[g]!++; }
    const roundOneShare = Object.fromEntries(Object.entries(roundOneCount).map(([g, n]) => [g, roundOne.length === 0 ? 0 : n / roundOne.length]));
    const rate: Record<string, [number, number]> = {};
    const ever: Record<string, [number, number]> = {};
    for (const [id, pick] of pickRound) {
      const s = seasons.get(id);
      const b = band(pick.round);
      if (s) { const r = (rate[b] ??= [0, 0]); r[0] += s.started; r[1] += s.onTeam; }
      if (lastSeason - pick.draft + 1 >= 3) { const e = (ever[b] ??= [0, 0]); e[0] += s?.everStarted ? 1 : 0; e[1]++; }
    }
    const ratio = (m: Record<string, [number, number]>) => Object.fromEntries(Object.entries(m).map(([k, [a, b]]) => [k, b === 0 ? 0 : a / b]));
    return { drafts: perYear.length, roundOneShare, starterRate: ratio(rate), everStarter: ratio(ever), perYear };
  };
  const save = (): DraftReaderState => JSON.parse(JSON.stringify({
    position: [...position], pickRound: [...pickRound], roundOne, seasons: [...seasons], perYear, lastSeason,
  })) as DraftReaderState;
  const restore = (state: DraftReaderState): void => {
    const c = JSON.parse(JSON.stringify(state)) as DraftReaderState;
    position = new Map(c.position);
    pickRound = new Map(c.pickRound);
    roundOne = [...c.roundOne];
    seasons = new Map(c.seasons);
    perYear = [...c.perYear];
    lastSeason = c.lastSeason;
  };
  return { onRun, result, save, restore };
}

export function runDraftCheck(input: Omit<CapCheckInput, "onRun">): DraftCheckResult {
  const reader = draftReader();
  runCapCheck({ ...input, onRun: reader.onRun });
  return reader.result();
}
