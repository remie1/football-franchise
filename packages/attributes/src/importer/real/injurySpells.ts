/**
 * THE STAND-INS' PAST INJURIES, BUILT (ADR-087 AB7, §12.3.7; contracts P8): pure, rows in, the
 * `pastInjuries` block out. `injurySnapshot.ts` reads the snapshot and calls these; `standin-injuries`
 * (`injuriesMain.ts`) and `import-real` (`main.ts`) both write what `buildPastInjuries` gives.
 *
 * In order:
 *   1. `standInJoin`: the players' sealed table, inverted to stand-in id -> real id, checked against the
 *      file (every man has one entry, and the table's made-up name for him is his name in the file, so the
 *      table is the one that built the file).
 *   2. `seasonSpells`, one season at a time: the copied rules (`injuryRules.ts` `buildTimelines`,
 *      `spellsOf`) run on every row of the season, so the snap join sees every row as calibration's does;
 *      then only the file's men are kept, each timeline cut down to its weeks and their states. In the
 *      file's season a game counts only when it was played before the cut (`gameday < snapshotDate`).
 *   3. `buildPastInjuries`, the importer's own rules (CHOSEN, each in `pastInjuriesMethod`): football and
 *      illness spells; two spells of one man on two teams that overlap in time merged; a spell that ran
 *      on past what the rows show chained into his next under `CHAIN_LEFT_WEEKS` and the season-end rule;
 *      every chain with a link in the file's season left out (`SNAPSHOT_SEASON_SPELLS = "drop"`): the sim
 *      plays that season again from camp, so its spells have not happened yet; kind, weeks and stamps;
 *      oldest first; keyed by stand-in id, in the file's order.
 *
 * Nothing it returns carries a name, a real id, a team or report text: the block holds stand-in ids,
 * kinds from a closed list, whole numbers and stamps. Every refusal names the check, a stand-in id or a
 * count, never a row value. No randomness: the order is the file's, then each man's records by
 * `(since, healed, kind)`; rows are read in the order the snapshot's files hold them, which the manifest's
 * sha256 pins (critic 7: the copied rules keep the first roster and report row of a duplicate key).
 */
import { DEFAULT_LEAGUE_RULES, type CalendarStamp, type InjuryRecord } from "@ff/contracts";
import { bandOf } from "./development.js";
import {
  buildTimelines, spellsOf, type EntryState, type MissClass, type ReportRow, type RosterRow, type SnapRow, type Spell,
} from "./injuryRules.js";
import type { DatedGameRow } from "./injuryRows.js";
import { compareRecords, STANDIN_INJURIES_VERSION, type PastInjuriesBlock, type PastInjuriesCounts } from "./pastInjuries.js";
import { INJURY_HISTORY_FIRST_SEASON } from "./snapshot.js";
import type { SealedTable } from "./standins.js";

/** The spell classes kept (ruling D2): football and illness; the non-football list has no body part, so it could never be a prior. */
export const KEPT_CLASSES: readonly MissClass[] = ["FOOTBALL", "ILLNESS"];
/** What `weeks` sums (ruling D3): calendar weeks out, byes counted, the unit of franchise's `weeksRemaining`. */
export const WEEKS_MEASURE: "weeksOut" | "gamesMissed" = "weeksOut";
/** The file's own season's spells (ruling D1): left out, since the sim plays that season again from camp. */
export const SNAPSHOT_SEASON_SPELLS = "drop" as const;
/**
 * A spell that ends with him off the roster chains into his next, with the same team or another, only when
 * it starts within this many calendar weeks of his last missed week (ruling D4, CHOSEN; the window holds
 * for a same-team spell too, as the build spec's chain rule has no team test).
 */
export const CHAIN_LEFT_WEEKS = 4;
/** The entries that show him well between two spells: either one stops a chain. */
const HEALTHY: readonly EntryState[] = ["PLAYED", "HEALTHY_DNP"];

/** Every CHOSEN rule the records were built by, as data: written in the block, so a change shows. */
export function pastInjuriesMethod(season: number) {
  return {
    spells: "time-loss spells as calibration's injury-rates counts them (injuryRules.ts, pinned by test/fixtures/injury-spell-rules.json)",
    seasons: { from: INJURY_HISTORY_FIRST_SEASON, to: season },
    classes: KEPT_CLASSES,
    cut: "a regular-season game of the file's season is read only when its gameday is before the cut (through)",
    snapshotSeasonSpells: SNAPSHOT_SEASON_SPELLS,
    chain: {
      seasonEnd: "a spell running at a season's end continues into his next only when that starts at his first game of the next season",
      left: "a spell he left the roster in continues into his next spell of that season, with the same team or another, only when it starts within leftWithinWeeks calendar weeks of his last missed week",
      leftWithinWeeks: CHAIN_LEFT_WEEKS,
      brokenBy: HEALTHY,
    },
    overlap: "two spells of one man on two teams that overlap in time are one: the longer by weeksOut is kept whole, its start and its weeks; the shorter's weeks outside it are lost",
    kind: "real: and the first link's body-part class, \"/\" written \"-\"; the first known later link's when the first is other or unknown",
    franchiseKind: "on the spot path franchise reads each class as the game's kind of that body part (REAL_PART_KINDS); knee as knee-mcl (CHOSEN), so a real knee history is a prior for knee-mcl draws only, never acl; other and unknown as \"other\", never drawn and never a repeat",
    weeks: WEEKS_MEASURE,
    since: "the first missed week: {season, REGULAR_SEASON, week, 1}",
    healed: "the week he was back: {season, REGULAR_SEASON, week, 1}, or {season, PLAYOFFS, 1, 1} past the regular season's last week",
    order: "the file's player order; each man's records by since, healed, kind; rows in the order the snapshot's files hold them (pinned by manifestSha256)",
  };
}

// --- 1. the join ---------------------------------------------------------------------------------

export interface StandInJoin {
  /** Stand-in id -> real id: stays inside `importer/real/`. */
  readonly realOf: ReadonlyMap<string, string>;
  readonly sealedEntries: number;
  /** Men of the file whose made-up name in the table is their name in the file (critic 5): all of them, or the join is refused. */
  readonly namesAgree: number;
}

/** The sealed table, inverted and checked against the file's men. Refusals name a stand-in id or counts only. */
export function standInJoin(players: readonly { readonly id: string; readonly displayName: string }[], sealed: SealedTable): StandInJoin {
  const byStandIn = new Map<string, { real: string; name: string }>();
  for (const [real, entry] of Object.entries(sealed)) {
    if (byStandIn.has(entry.id)) throw new Error(`the sealed table gives stand-in ${entry.id} two real ids`);
    byStandIn.set(entry.id, { real, name: entry.name });
  }
  const realOf = new Map<string, string>();
  let namesAgree = 0;
  for (const p of players) {
    const e = byStandIn.get(p.id);
    if (e === undefined) throw new Error(`stand-in ${p.id} has no entry in the sealed table`);
    realOf.set(p.id, e.real);
    if (e.name === p.displayName) namesAgree++;
  }
  if (namesAgree !== players.length) {
    throw new Error(`the sealed table's names agree with the file's for ${namesAgree} of ${players.length} men: it is not the table this file was built with`);
  }
  return { realOf, sealedEntries: Object.keys(sealed).length, namesAgree };
}

// --- 2. one season ---------------------------------------------------------------------------------

/** One of a man's timelines, cut down to what the importer's rules read: each game week and his state in it. */
export interface WeekStates {
  readonly season: number;
  readonly team: string;
  readonly weeks: readonly number[];
  readonly states: readonly EntryState[];
}

export interface InjurySeasonCounts {
  readonly season: number;
  /** Team games read (both teams of a game count), and the file's season's games left out by the cut. */
  readonly teamGames: number;
  readonly gamesCut: number;
  readonly rosterRows: number;
  readonly reportRows: number;
  readonly snapRows: number;
  /** The file's men's timelines and spells, by class. */
  readonly timelines: number;
  readonly spells: number;
  readonly football: number;
  readonly illness: number;
  readonly nfi: number;
}

export interface SeasonSpells {
  readonly season: number;
  /** Real id -> his timelines this season, for the file's men only. */
  readonly timelines: ReadonlyMap<string, readonly WeekStates[]>;
  /** The file's men's spells, every class. */
  readonly spells: readonly Spell[];
  readonly counts: InjurySeasonCounts;
}

/**
 * One season's spells for the file's men (`keep`, real ids). `cutBefore`: in the file's season, a game
 * counts only when its `gameday` is before it (critic 12: the copied injuries were read on that date,
 * before that day's games were final); a game with no date is left out too (`readInjurySnapshot` refuses
 * such a game, and a file's season with no game before the cut, before it gets here).
 */
export function seasonSpells(input: {
  readonly season: number;
  readonly games: readonly DatedGameRow[];
  readonly rosters: readonly RosterRow[];
  readonly reports: readonly ReportRow[];
  readonly snaps: readonly SnapRow[];
  readonly keep: ReadonlySet<string>;
  readonly cutBefore?: string;
}): SeasonSpells {
  const all = input.games.filter((g) => g.season === input.season);
  const cut = input.cutBefore;
  const games = cut === undefined ? all : all.filter((g) => g.gameday !== null && g.gameday < cut);
  const built = buildTimelines({ games, rosters: input.rosters, reports: input.reports, snaps: input.snaps });
  const timelines = new Map<string, WeekStates[]>();
  const spells: Spell[] = [];
  for (const t of built.timelines) {
    if (!input.keep.has(t.gsisId)) continue;
    let list = timelines.get(t.gsisId);
    if (list === undefined) timelines.set(t.gsisId, (list = []));
    list.push({ season: t.season, team: t.team, weeks: t.entries.map((e) => e.week), states: t.entries.map((e) => e.state) });
    spells.push(...spellsOf(t));
  }
  const cov = built.coverage.find((c) => c.season === input.season);
  return {
    season: input.season,
    timelines,
    spells,
    counts: {
      season: input.season,
      teamGames: cov?.teamGames ?? 0,
      gamesCut: all.length - games.length,
      rosterRows: input.rosters.length,
      reportRows: input.reports.length,
      snapRows: input.snaps.length,
      timelines: [...timelines.values()].reduce((a, l) => a + l.length, 0),
      spells: spells.length,
      football: spells.filter((s) => s.cls === "FOOTBALL").length,
      illness: spells.filter((s) => s.cls === "ILLNESS").length,
      nfi: spells.filter((s) => s.cls === "NFI").length,
    },
  };
}

// --- 3. the records --------------------------------------------------------------------------------

/** A point in the regular seasons: (season, week). */
const before = (a: { s: number; w: number }, b: { s: number; w: number }) => a.s < b.s || (a.s === b.s && a.w < b.w);

/** The week of a spell's last missed game. */
function lastMissedWeek(sp: Spell, tls: readonly WeekStates[]): number {
  const t = tls.find((x) => x.season === sp.season && x.team === sp.team)!;
  return t.weeks[sp.startIndex + sp.gamesMissed - 1]!;
}

/** Whether any of his weeks strictly between `from` and `to` (to the end of the rows when `to` is null) shows him well. */
function healthyBetween(tls: readonly WeekStates[], from: { s: number; w: number }, to: { s: number; w: number } | null): boolean {
  for (const t of tls) {
    for (let i = 0; i < t.weeks.length; i++) {
      const at = { s: t.season, w: t.weeks[i]! };
      if (before(from, at) && (to === null || before(at, to)) && HEALTHY.includes(t.states[i]!)) return true;
    }
  }
  return false;
}

/** How spell `a` continues into `b`, his next: across a season end, after leaving a roster, or not at all (ruling D4). */
function joins(a: Spell, b: Spell, tls: readonly WeekStates[]): "seasonEnd" | "left" | null {
  const last = { s: a.season, w: lastMissedWeek(a, tls) };
  const first = { s: b.season, w: b.startWeek };
  if (a.end === "SEASON_END") {
    if (b.season !== a.season + 1 || b.startIndex !== 0) return null;
    return healthyBetween(tls, last, first) ? null : "seasonEnd";
  }
  if (a.end === "LEFT") {
    if (b.season !== a.season || b.startWeek <= last.w || b.startWeek - last.w > CHAIN_LEFT_WEEKS) return null;
    return healthyBetween(tls, last, first) ? null : "left";
  }
  return null;
}

const bySpellOrder = (a: Spell, b: Spell) => a.season - b.season || a.startWeek - b.startWeek || (a.team < b.team ? -1 : a.team > b.team ? 1 : 0);
const overlaps = (a: Spell, b: Spell) => a.season === b.season && a.team !== b.team
  && a.startWeek < b.startWeek + b.weeksOut && b.startWeek < a.startWeek + a.weeksOut;

/** A body-part class as a kind: `real:` and the class, "/" written "-". */
export const realKind = (part: string): string => `real:${part.replace(/\//g, "-")}`;

function stampsOf(first: Spell, last: Spell): { since: CalendarStamp; healed: CalendarStamp } {
  const back = last.startWeek + last.weeksOut;
  return {
    since: { season: first.season, phase: "REGULAR_SEASON", week: first.startWeek, day: 1 },
    // The week he was back; past the regular season's last week (18), the playoffs' first.
    healed: back > DEFAULT_LEAGUE_RULES.weeksPerSeason ? { season: last.season, phase: "PLAYOFFS", week: 1, day: 1 } : { season: last.season, phase: "REGULAR_SEASON", week: back, day: 1 },
  };
}

function recordOf(chain: readonly Spell[]): InjuryRecord {
  const known = (s: Spell) => s.bodyPart !== "other" && s.bodyPart !== "unknown";
  const part = known(chain[0]!) ? chain[0]!.bodyPart : (chain.find(known)?.bodyPart ?? chain[0]!.bodyPart);
  const { since, healed } = stampsOf(chain[0]!, chain[chain.length - 1]!);
  return { kind: realKind(part), weeks: chain.reduce((a, s) => a + s[WEEKS_MEASURE], 0), since, healed };
}

export interface PastInjuriesReport {
  /** Records by kind and by band (counts only). */
  readonly byKind: Readonly<Record<string, number>>;
  readonly byBand: { readonly SHORT: number; readonly LONG: number; readonly MAJOR: number };
  /** Men with a copied injury and no chain open at the cut. */
  readonly copiedWithoutOpen: number;
  /** Spells left out as non-football, over every season. */
  readonly nonFootball: number;
}

/**
 * The block: each of the file's men's records, from his spells over every season read. `players` is the
 * file's order, each with whether he has a copied `condition.injury` (for the open-at-cut counts).
 */
export function buildPastInjuries(input: {
  readonly season: number;
  readonly snapshotDate: string;
  readonly players: readonly { readonly id: string; readonly copiedInjury: boolean }[];
  readonly realOf: ReadonlyMap<string, string>;
  readonly seasons: readonly SeasonSpells[];
  readonly manifest: { readonly date: string; readonly fetchedAt: string };
  readonly manifestSha256: string;
}): { block: PastInjuriesBlock; report: PastInjuriesReport } {
  const S = input.season;
  const tlsOf = new Map<string, WeekStates[]>();
  const spellsOf_ = new Map<string, Spell[]>();
  let nonFootball = 0;
  for (const ss of input.seasons) {
    for (const [real, list] of ss.timelines) {
      let l = tlsOf.get(real);
      if (l === undefined) tlsOf.set(real, (l = []));
      l.push(...list);
    }
    for (const sp of ss.spells) {
      if (!KEPT_CLASSES.includes(sp.cls)) {
        nonFootball++;
        continue;
      }
      let l = spellsOf_.get(sp.gsisId);
      if (l === undefined) spellsOf_.set(sp.gsisId, (l = []));
      l.push(sp);
    }
  }

  const players: Record<string, InjuryRecord[]> = {};
  let chainedAcrossSeasonEnd = 0;
  let chainedAfterLeaving = 0;
  let merged = 0;
  let openAtCutDropped = 0;
  let openAtCutDroppedWithCopiedInjury = 0;
  let snapshotSeasonDropped = 0;
  let copiedWithoutOpen = 0;
  for (const p of input.players) {
    const real = input.realOf.get(p.id);
    if (real === undefined) throw new Error(`stand-in ${p.id} has no entry in the sealed table`);
    const tls = tlsOf.get(real) ?? [];
    const sorted = [...(spellsOf_.get(real) ?? [])].sort(bySpellOrder);

    // Two spells of his on two teams that overlap in time (a trade week's rows on both): one, the longer, kept whole;
    // the shorter's weeks outside it are lost, so its start can move later (the spec's rule, kept by ruling D4).
    const spells: Spell[] = [];
    for (const sp of sorted) {
      const prev = spells[spells.length - 1];
      if (prev !== undefined && overlaps(prev, sp)) {
        merged++;
        if (sp.weeksOut > prev.weeksOut) spells[spells.length - 1] = sp;
      } else spells.push(sp);
    }

    // Chains: each spell continues into his next when the rules allow (ruling D4).
    const chains: Spell[][] = [];
    for (const sp of spells) {
      const cur = chains[chains.length - 1];
      const how = cur === undefined ? null : joins(cur[cur.length - 1]!, sp, tls);
      if (how === null) chains.push([sp]);
      else {
        cur!.push(sp);
        if (how === "seasonEnd") chainedAcrossSeasonEnd++;
        else chainedAfterLeaving++;
      }
    }

    const records: InjuryRecord[] = [];
    let open = false;
    for (const chain of chains) {
      if (chain.some((sp) => sp.season >= S)) {
        // The file's season (ruling D1, "drop"): the sim plays it again from camp.
        const last = chain[chain.length - 1]!;
        const isOpen = last.season === S
          && (last.end === "SEASON_END" || (last.end === "LEFT" && !healthyBetween(tls, { s: S, w: lastMissedWeek(last, tls) }, null)));
        if (isOpen) {
          open = true;
          openAtCutDropped++;
          if (p.copiedInjury) openAtCutDroppedWithCopiedInjury++;
        } else snapshotSeasonDropped++;
        continue;
      }
      records.push(recordOf(chain));
    }
    if (p.copiedInjury && !open) copiedWithoutOpen++;
    records.sort(compareRecords);
    if (records.length > 0) players[p.id] = records;
  }

  const all = Object.values(players).flat();
  const byKind: Record<string, number> = {};
  for (const r of all) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  const byBand = { SHORT: 0, LONG: 0, MAJOR: 0 };
  for (const r of all) {
    const b = bandOf(r.weeks);
    if (b !== "DAY_TO_DAY") byBand[b]++;
  }
  const counts: PastInjuriesCounts = {
    men: Object.keys(players).length, records: all.length, chainedAcrossSeasonEnd, chainedAfterLeaving, merged,
    openAtCutDropped, openAtCutDroppedWithCopiedInjury, snapshotSeasonDropped,
  };
  const block: PastInjuriesBlock = {
    version: STANDIN_INJURIES_VERSION,
    season: S,
    asOf: input.manifest.date,
    fetchedAt: input.manifest.fetchedAt,
    through: input.snapshotDate,
    manifestSha256: input.manifestSha256,
    seasons: input.seasons.map((s) => s.season),
    method: pastInjuriesMethod(S),
    counts,
    players,
  };
  return { block, report: { byKind: Object.fromEntries(Object.entries(byKind).sort(([a], [b]) => (a < b ? -1 : 1))), byBand, copiedWithoutOpen, nonFootball } };
}
