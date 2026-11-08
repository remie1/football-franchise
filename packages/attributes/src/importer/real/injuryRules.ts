/**
 * THE SPELL RULES, COPIED (ADR-087 AB7, §12.3.7: real veterans' injury history, P8).
 *
 * A stand-in's past injuries are built from past injury reports, weekly rosters and snap counts by
 * the same definitions calibration's `injury-rates` counts spells with ("Time-loss injury (spell)",
 * "Games missed, weeks out"). Those rules live in calibration, which this package may not import
 * (Iron Rule 1), so they are COPIED here, read in calibration's:
 *   - `injuries/classify.ts`: `RESERVE_CODE_KIND`, `COARSE_KIND`, `rosterKind`, `onRoster`,
 *     `NON_INJURY`, `COVID`, `ILLNESS`, `reportTextKind`, `BODY_KEYWORDS`, `bodyPart`;
 *   - `ingest/sources/injuries.ts`: `normaliseGameStatus`, `normalisePracticeStatus`;
 *   - `ingest/availability.ts`: `normaliseName`;
 *   - `injuries/timeline.ts`: `DESIGNATED`, `LIMITED`, `makeEntry` (without the two position
 *     fields), `closeRosterLag`, `buildTimelines` (without the name, position and group it keeps);
 *   - `injuries/spells.ts`: `onsetOf`, `spellBodyPart`, `spellsOf` (without `group`).
 * Only the code is copied. One made-up fixture, `test/fixtures/injury-spell-rules.json`, pins both
 * copies: this package's `test/injurySpellRules.test.ts` runs its rows through this file, and
 * calibration's test of the same name runs them through the originals; both pin the fixture's sha256.
 * A change on either side is a change to make on the other.
 *
 * Pure: rows in, timelines and spells out. The rows hold real ids and names (the snap join reads names),
 * so what this file returns stays inside `importer/real/`: `injurySpells.ts` keeps each man's spells
 * and the states of his weeks, and what it writes is keyed by stand-in id.
 */

// --- the row shapes the rules read (calibration's `injuries/rows.ts`, the columns the rules use) ---

export interface GameRow {
  readonly season: number;
  readonly week: number;
  readonly gameId: string;
  readonly home: string;
  readonly away: string;
}

export interface RosterRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly gsisId: string;
  /** Read only for the snap join. */
  readonly name: string;
  readonly status: string | null;
  readonly code: string | null;
  readonly pfrId: string | null;
}

export type InjuryGameStatus = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "NONE";
export type PracticeStatus = "FULL" | "LIMITED" | "DNP" | "NONE";

export interface ReportRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly gsisId: string;
  readonly reportInjury: string | null;
  readonly gameStatus: InjuryGameStatus;
  readonly practiceInjury: string | null;
  readonly practiceStatus: PracticeStatus;
}

export interface SnapRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly pfrId: string | null;
  /** Read only for the snap join. */
  readonly name: string;
  readonly snaps: number;
}

// --- classify.ts ----------------------------------------------------------------------------------

export type RosterKind =
  | "ACTIVE" | "INACTIVE" | "IR" | "PUP" | "NFI" | "COVID" | "SUSPENDED" | "NOT_WITH_TEAM" | "OTHER_RESERVE"
  | "PRACTICE_SQUAD" | "OFF_ROSTER" | "UNKNOWN";

const RESERVE_CODE_KIND: Readonly<Record<string, RosterKind>> = {
  R01: "IR", R48: "IR",
  R04: "PUP", R47: "PUP",
  R05: "NFI", R49: "NFI",
  R59: "COVID", R62: "COVID",
  R30: "SUSPENDED", R33: "SUSPENDED", R40: "SUSPENDED",
  R02: "OFF_ROSTER", R23: "OFF_ROSTER",
  R03: "NOT_WITH_TEAM",
};

const COARSE_KIND: Readonly<Record<string, RosterKind>> = {
  ACT: "ACTIVE",
  INA: "INACTIVE",
  PUP: "PUP",
  RSN: "NFI",
  RSR: "COVID",
  SUS: "SUSPENDED",
  NWT: "NOT_WITH_TEAM",
  EXE: "NOT_WITH_TEAM", E01: "NOT_WITH_TEAM", E14: "NOT_WITH_TEAM",
  DEV: "PRACTICE_SQUAD",
  CUT: "OFF_ROSTER", RET: "OFF_ROSTER", TRC: "OFF_ROSTER", TRD: "OFF_ROSTER", TRT: "OFF_ROSTER",
  UFA: "OFF_ROSTER", RFA: "OFF_ROSTER",
};

/** classify.ts `rosterKind`. */
export function rosterKind(status: string | null, code: string | null): RosterKind {
  const s = (status ?? "").trim().toUpperCase();
  const c = (code ?? "").trim().toUpperCase();
  const byCode = RESERVE_CODE_KIND[c];
  if (s === "RES") {
    if (byCode !== undefined) return byCode;
    if (c === "" || c === "A01" || c === "I01" || c === "I02") return "IR";
    return "OTHER_RESERVE";
  }
  if ((s === "ACT" || s === "INA") && (byCode === "IR" || byCode === "COVID")) return byCode;
  return COARSE_KIND[s] ?? "UNKNOWN";
}

/** classify.ts `onRoster`. */
export function onRoster(kind: RosterKind): boolean {
  return kind === "ACTIVE" || kind === "INACTIVE";
}

export type ReportTextKind = "FOOTBALL" | "ILLNESS" | "NON_INJURY" | "COVID" | "NONE";

const NON_INJURY = /not injury|non-injury|non injury|\brest\b|\bresting\b|personal|coach|team decision|did not travel|suspen|load management|family|birth|bereavement|ramp up|no game status|expected to (be available|play)/;
const COVID = /covid/;
const ILLNESS = /illness|\bill\b|\bsick|\bflu\b/;

/** classify.ts `reportTextKind`. */
export function reportTextKind(text: string | null): ReportTextKind {
  if (text === null) return "NONE";
  const t = text.trim().toLowerCase();
  if (t === "") return "NONE";
  if (COVID.test(t)) return "COVID";
  if (ILLNESS.test(t)) return "ILLNESS";
  if (NON_INJURY.test(t)) return "NON_INJURY";
  return "FOOTBALL";
}

/** classify.ts `BodyPart`: the 17 classes, in calibration's order. */
export const BODY_PARTS = [
  "knee", "ankle", "hamstring", "concussion/head", "shoulder", "groin/hip", "foot/toe", "calf/shin", "achilles", "quad/thigh",
  "back/neck", "hand/wrist", "elbow/arm", "chest/ribs/abdomen", "illness", "other", "unknown",
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

const BODY_KEYWORDS: readonly (readonly [Exclude<BodyPart, "illness" | "other" | "unknown">, RegExp])[] = [
  ["achilles", /achilles/],
  ["concussion/head", /concussion|\bhead\b/],
  ["hamstring", /hamstring/],
  ["knee", /knee|\bacl\b|\bmcl\b|\bpcl\b|patell|menisc/],
  ["ankle", /ankle/],
  ["foot/toe", /\bfoot\b|\bfeet\b|\btoes?\b|heel|plantar|lisfranc|\barch\b/],
  ["calf/shin", /\bcalf|calves|\bshin|fibula|tibia|\bleg\b/],
  ["quad/thigh", /\bquad|thigh/],
  ["groin/hip", /groin|\bhips?\b|adductor|abductor|glute|pelvi/],
  ["shoulder", /shoulder|collarbone|clavicle|rotator|scapula|labrum|\bac joint/],
  ["hand/wrist", /\bhands?\b|wrist|finger|thumb|forearm|knuckle/],
  ["elbow/arm", /elbow|bicep|tricep|\barm\b/],
  ["back/neck", /\bback\b|spine|lumbar|\bdisc\b|stinger|\bneck\b|cervical/],
  ["chest/ribs/abdomen", /chest|pectoral|\bpec\b|\bribs?\b|abdom|oblique|\bcore\b|sternum|hernia|kidney|liver|spleen|lung/],
];

/** classify.ts `bodyPart`: the class whose keyword matches earliest in the text. */
export function bodyPart(text: string | null): BodyPart {
  const kind = reportTextKind(text);
  if (kind === "NONE" || kind === "NON_INJURY" || kind === "COVID") return "unknown";
  if (kind === "ILLNESS") return "illness";
  const t = (text ?? "").toLowerCase();
  let best: BodyPart = "other";
  let at = Number.POSITIVE_INFINITY;
  for (const [part, re] of BODY_KEYWORDS) {
    const m = re.exec(t);
    if (m !== null && m.index < at) {
      at = m.index;
      best = part;
    }
  }
  return best;
}

// --- ingest/sources/injuries.ts and ingest/availability.ts ----------------------------------------

/** ingest/sources/injuries.ts `normaliseGameStatus`. */
export function normaliseGameStatus(raw: string | null): InjuryGameStatus {
  if (raw === null) return "NONE";
  const v = raw.trim().toLowerCase();
  if (v === "out") return "OUT";
  if (v === "doubtful") return "DOUBTFUL";
  if (v === "questionable") return "QUESTIONABLE";
  return "NONE";
}

/** ingest/sources/injuries.ts `normalisePracticeStatus`. */
export function normalisePracticeStatus(raw: string | null): PracticeStatus {
  if (raw === null) return "NONE";
  const v = raw.trim().toLowerCase();
  if (v.startsWith("full participation")) return "FULL";
  if (v.startsWith("limited participation")) return "LIMITED";
  if (v.startsWith("did not participate")) return "DNP";
  return "NONE";
}

/** ingest/availability.ts `normaliseName`. */
export function normaliseName(name: string): string {
  return name
    .normalize("NFD")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z]/g, "");
}

// --- injuries/timeline.ts --------------------------------------------------------------------------

export type EntryState = "PLAYED" | "MISSED_INJURY" | "HEALTHY_DNP" | "OFF_53" | "ABSENT";
export type MissClass = "FOOTBALL" | "ILLNESS" | "NFI";

export interface Entry {
  readonly week: number;
  readonly kind: RosterKind | "ABSENT";
  readonly report: ReportRow | null;
  readonly reportText: string | null;
  readonly reportKind: ReportTextKind;
  readonly snaps: number;
  readonly state: EntryState;
  readonly missClass: MissClass | null;
  readonly listed: boolean;
  readonly designated: boolean;
}

export interface Timeline {
  readonly season: number;
  readonly team: string;
  readonly gsisId: string;
  readonly entries: readonly Entry[];
}

export interface TeamSeason {
  readonly season: number;
  readonly team: string;
  readonly weeks: readonly number[];
}

/** timeline.ts `TimelineCoverage`, the counts the printout reads. */
export interface TimelineCoverage {
  readonly season: number;
  readonly teamSeasons: number;
  readonly teamGames: number;
  readonly rosterRows: number;
  readonly rosterRowsNoGame: number;
  readonly rosterRowsDuplicate: number;
  readonly reportRows: number;
  readonly reportRowsUnmatched: number;
  readonly teamWeeksWithoutReport: number;
  readonly snapRows: number;
  readonly snapRowsJoinedById: number;
  readonly snapRowsJoinedByName: number;
  readonly snapRowsUnmatched: number;
  readonly playedWhileListedOut: number;
}

export interface Timelines {
  readonly teamSeasons: readonly TeamSeason[];
  readonly timelines: readonly Timeline[];
  readonly coverage: readonly TimelineCoverage[];
}

const DESIGNATED: ReadonlySet<InjuryGameStatus> = new Set<InjuryGameStatus>(["OUT", "DOUBTFUL", "QUESTIONABLE"]);
const LIMITED: ReadonlySet<PracticeStatus> = new Set<PracticeStatus>(["DNP", "LIMITED"]);

/** timeline.ts `makeEntry`, without the roster and depth-chart positions. */
export function makeEntry(week: number, roster: RosterRow | null, report: ReportRow | null, snaps: number): Entry {
  const kind: RosterKind | "ABSENT" = roster === null ? "ABSENT" : rosterKind(roster.status, roster.code);
  const reportText = report === null ? null : (report.reportInjury ?? report.practiceInjury);
  const reportKind = reportTextKind(reportText);
  const hurtText = reportKind === "FOOTBALL" || reportKind === "ILLNESS";
  const designation = report !== null && DESIGNATED.has(report.gameStatus);
  let state: EntryState;
  let missClass: MissClass | null = null;
  if (kind === "ABSENT") state = "ABSENT";
  else if (snaps > 0) state = "PLAYED";
  else if (kind === "IR" || kind === "PUP") {
    state = "MISSED_INJURY";
    missClass = "FOOTBALL";
  } else if (kind === "NFI") {
    state = "MISSED_INJURY";
    missClass = "NFI";
  } else if (onRoster(kind)) {
    const missed = hurtText && (designation || LIMITED.has(report!.practiceStatus));
    if (missed) {
      state = "MISSED_INJURY";
      missClass = reportKind === "ILLNESS" ? "ILLNESS" : "FOOTBALL";
    } else state = "HEALTHY_DNP";
  } else state = "OFF_53";
  const reportListed = report !== null && reportKind === "FOOTBALL" && (designation || LIMITED.has(report.practiceStatus));
  const missedFootball = state === "MISSED_INJURY" && missClass === "FOOTBALL";
  return {
    week, kind, report, reportText, reportKind, snaps, state, missClass,
    listed: missedFootball || reportListed,
    designated: missedFootball || (reportKind === "FOOTBALL" && designation),
  };
}

/** timeline.ts `closeRosterLag`. */
export function closeRosterLag(entries: readonly Entry[]): Entry[] {
  return entries.map((e, i) => {
    const before = entries[i - 1];
    const after = entries[i + 1];
    const lag = e.state === "HEALTHY_DNP" && e.report === null && before?.state === "PLAYED"
      && after !== undefined && (after.kind === "IR" || after.kind === "PUP");
    return lag ? { ...e, state: "MISSED_INJURY", missClass: "FOOTBALL", listed: true, designated: true } : e;
  });
}

const k4 = (season: number, week: number, team: string, id: string): string => `${season}|${week}|${team}|${id}`;

/** timeline.ts `buildTimelines`, without the name, position and group it keeps on each timeline. */
export function buildTimelines(input: {
  readonly games: readonly GameRow[];
  readonly rosters: readonly RosterRow[];
  readonly reports: readonly ReportRow[];
  readonly snaps: readonly SnapRow[];
}): Timelines {
  const weeksOf = new Map<string, Set<number>>();
  for (const g of input.games) {
    for (const team of [g.home, g.away]) {
      const k = `${g.season}|${team}`;
      let s = weeksOf.get(k);
      if (s === undefined) weeksOf.set(k, (s = new Set()));
      s.add(g.week);
    }
  }
  const teamSeasons: TeamSeason[] = [...weeksOf.entries()]
    .map(([k, weeks]) => {
      const [season, team] = k.split("|") as [string, string];
      return { season: Number(season), team, weeks: [...weeks].sort((a, b) => a - b) };
    })
    .sort((a, b) => a.season - b.season || a.team.localeCompare(b.team));
  const hasGame = new Set<string>();
  for (const ts of teamSeasons) for (const w of ts.weeks) hasGame.add(`${ts.season}|${w}|${ts.team}`);

  const cov = new Map<number, {
    rosterRows: number; rosterRowsNoGame: number; rosterRowsDuplicate: number; reportRows: number; reportRowsUnmatched: number;
    snapRows: number; byId: number; byName: number; playedWhileListedOut: number;
  }>();
  const covFor = (season: number) => {
    let c = cov.get(season);
    if (c === undefined) {
      c = { rosterRows: 0, rosterRowsNoGame: 0, rosterRowsDuplicate: 0, reportRows: 0, reportRowsUnmatched: 0, snapRows: 0, byId: 0, byName: 0, playedWhileListedOut: 0 };
      cov.set(season, c);
    }
    return c;
  };
  for (const ts of teamSeasons) covFor(ts.season);

  const rosterAt = new Map<string, RosterRow>();
  const players = new Map<string, RosterRow[]>();
  for (const r of input.rosters) {
    const c = covFor(r.season);
    if (!hasGame.has(`${r.season}|${r.week}|${r.team}`)) {
      c.rosterRowsNoGame++;
      continue;
    }
    const k = k4(r.season, r.week, r.team, r.gsisId);
    if (rosterAt.has(k)) {
      c.rosterRowsDuplicate++;
      continue;
    }
    c.rosterRows++;
    rosterAt.set(k, r);
    const pk = `${r.season}|${r.team}|${r.gsisId}`;
    let list = players.get(pk);
    if (list === undefined) players.set(pk, (list = []));
    list.push(r);
  }

  const reportAt = new Map<string, ReportRow>();
  const reportedTeamWeeks = new Set<string>();
  for (const r of input.reports) {
    if (!hasGame.has(`${r.season}|${r.week}|${r.team}`)) continue;
    covFor(r.season).reportRows++;
    reportedTeamWeeks.add(`${r.season}|${r.week}|${r.team}`);
    const k = k4(r.season, r.week, r.team, r.gsisId);
    if (!reportAt.has(k)) reportAt.set(k, r);
  }
  for (const [k, r] of reportAt) if (!rosterAt.has(k)) covFor(r.season).reportRowsUnmatched++;

  const snapById = new Map<string, SnapRow>();
  const snapByName = new Map<string, SnapRow>();
  const ambiguous = new Set<string>();
  for (const s of input.snaps) {
    if (!hasGame.has(`${s.season}|${s.week}|${s.team}`)) continue;
    covFor(s.season).snapRows++;
    if (s.pfrId !== null) snapById.set(k4(s.season, s.week, s.team, `pfr:${s.pfrId}`), s);
    const nk = k4(s.season, s.week, s.team, `name:${normaliseName(s.name)}`);
    if (snapByName.has(nk)) ambiguous.add(nk);
    else snapByName.set(nk, s);
  }
  for (const nk of ambiguous) snapByName.delete(nk);
  const usedSnaps = new Set<SnapRow>();
  const snapsFor = (r: RosterRow): number => {
    const byId = r.pfrId === null ? undefined : snapById.get(k4(r.season, r.week, r.team, `pfr:${r.pfrId}`));
    if (byId !== undefined && !usedSnaps.has(byId)) {
      usedSnaps.add(byId);
      covFor(r.season).byId++;
      return byId.snaps;
    }
    const byName = snapByName.get(k4(r.season, r.week, r.team, `name:${normaliseName(r.name)}`));
    if (byName !== undefined && !usedSnaps.has(byName) && (byName.pfrId === null || r.pfrId === null)) {
      usedSnaps.add(byName);
      covFor(r.season).byName++;
      return byName.snaps;
    }
    return 0;
  };

  const tsOf = new Map(teamSeasons.map((ts) => [`${ts.season}|${ts.team}`, ts] as const));
  const timelines: Timeline[] = [];
  for (const pk of [...players.keys()].sort()) {
    const rows = players.get(pk)!;
    const first = rows[0]!;
    const ts = tsOf.get(`${first.season}|${first.team}`);
    if (ts === undefined) continue;
    const entries: Entry[] = closeRosterLag(ts.weeks.map((week) => {
      const k = k4(first.season, week, first.team, first.gsisId);
      const roster = rosterAt.get(k) ?? null;
      const snaps = roster === null ? 0 : snapsFor(roster);
      const entry = makeEntry(week, roster, reportAt.get(k) ?? null, snaps);
      if (snaps > 0 && (entry.kind === "INACTIVE" || entry.kind === "IR" || entry.kind === "PUP" || entry.kind === "NFI")) {
        covFor(first.season).playedWhileListedOut++;
      }
      return entry;
    }));
    if (!entries.some((e) => e.state === "PLAYED" || e.state === "MISSED_INJURY" || e.state === "HEALTHY_DNP")) continue;
    timelines.push({ season: first.season, team: first.team, gsisId: first.gsisId, entries });
  }
  timelines.sort((a, b) => a.season - b.season || a.team.localeCompare(b.team) || a.gsisId.localeCompare(b.gsisId));

  const coverage: TimelineCoverage[] = [...cov.entries()].sort((a, b) => a[0] - b[0]).map(([season, c]) => {
    const seasonTeams = teamSeasons.filter((ts) => ts.season === season);
    let teamGames = 0;
    let teamWeeksWithoutReport = 0;
    for (const ts of seasonTeams) {
      teamGames += ts.weeks.length;
      for (const w of ts.weeks) if (!reportedTeamWeeks.has(`${season}|${w}|${ts.team}`)) teamWeeksWithoutReport++;
    }
    return {
      season, teamSeasons: seasonTeams.length, teamGames,
      rosterRows: c.rosterRows, rosterRowsNoGame: c.rosterRowsNoGame, rosterRowsDuplicate: c.rosterRowsDuplicate,
      reportRows: c.reportRows, reportRowsUnmatched: c.reportRowsUnmatched, teamWeeksWithoutReport,
      snapRows: c.snapRows, snapRowsJoinedById: c.byId, snapRowsJoinedByName: c.byName,
      snapRowsUnmatched: c.snapRows - c.byId - c.byName, playedWhileListedOut: c.playedWhileListedOut,
    };
  });
  return { teamSeasons, timelines, coverage };
}

// --- injuries/spells.ts ------------------------------------------------------------------------------

export type Onset = "AFTER_PLAYED" | "AFTER_NOT_PLAYED" | "BEFORE_SEASON" | "UNCLEAR";
export type SpellEnd = "RETURNED" | "RECOVERED" | "LEFT" | "SEASON_END";

export interface Spell {
  readonly season: number;
  readonly team: string;
  readonly gsisId: string;
  readonly startIndex: number;
  readonly startWeek: number;
  readonly onset: Onset;
  readonly afterBye: boolean;
  readonly cls: MissClass;
  readonly firstKind: RosterKind | "ABSENT";
  readonly ir: boolean;
  readonly bodyPart: BodyPart;
  readonly gamesMissed: number;
  readonly weeksOut: number;
  readonly end: SpellEnd;
  readonly censored: boolean;
}

/** spells.ts `onsetOf`. */
export function onsetOf(entries: readonly Entry[], i: number): Onset {
  if (i === 0) return "BEFORE_SEASON";
  const prev = entries[i - 1]!;
  if (prev.state === "PLAYED") return "AFTER_PLAYED";
  if (prev.state === "HEALTHY_DNP" && prev.reportKind !== "FOOTBALL" && prev.reportKind !== "ILLNESS") return "AFTER_NOT_PLAYED";
  return "UNCLEAR";
}

/** spells.ts `spellBodyPart`. */
function spellBodyPart(entries: readonly Entry[], start: number, end: number): BodyPart {
  const order = [start, start - 1];
  for (let j = start + 1; j < end; j++) order.push(j);
  order.push(end, end + 1);
  for (const j of order) {
    const e = entries[j];
    if (e === undefined || e.reportKind !== "FOOTBALL") continue;
    return bodyPart(e.reportText);
  }
  return "unknown";
}

/** spells.ts `spellsOf`, without `group`. */
export function spellsOf(t: Timeline): Spell[] {
  const out: Spell[] = [];
  const es = t.entries;
  let i = 0;
  while (i < es.length) {
    if (es[i]!.state !== "MISSED_INJURY") {
      i++;
      continue;
    }
    let j = i;
    let ir = false;
    while (j < es.length && es[j]!.state === "MISSED_INJURY") {
      if (es[j]!.kind === "IR") ir = true;
      j++;
    }
    const after = es[j];
    const end: SpellEnd = after === undefined ? "SEASON_END"
      : after.state === "PLAYED" ? "RETURNED"
      : after.state === "HEALTHY_DNP" ? "RECOVERED"
      : "LEFT";
    const lastWeek = es[es.length - 1]!.week;
    const first = es[i]!;
    out.push({
      season: t.season, team: t.team, gsisId: t.gsisId,
      startIndex: i, startWeek: first.week,
      onset: onsetOf(es, i),
      afterBye: i > 0 && first.week - es[i - 1]!.week > 1,
      cls: first.missClass ?? "FOOTBALL",
      firstKind: first.kind,
      ir,
      bodyPart: first.missClass === "NFI" ? "unknown" : first.missClass === "ILLNESS" ? "illness" : spellBodyPart(es, i, j),
      gamesMissed: j - i,
      weeksOut: (after === undefined ? lastWeek + 1 : after.week) - first.week,
      end,
      censored: end === "LEFT" || end === "SEASON_END",
    });
    i = j;
  }
  return out;
}
