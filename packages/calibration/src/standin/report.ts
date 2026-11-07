/**
 * The standin-recount report (ADR-087): the stand-in file's 53s counted the real way, and the
 * importer's rules tried on real rows, as Markdown for people and JSON for the record. Both carry
 * aggregates only: no ids, no names, no row per player.
 */

import type { AssetManifest } from "../injuries/data.js";
import { compactJson } from "../injuries/report.js";
import { CAREER_GROUPS, type CareerGroup } from "../careers/groups.js";
import { NFL_CAREERS } from "../careers/nflCareers.js";
import { round } from "../careers/stats.js";
import {
  gapSplits, gapSteps, stepRange, type AgeShares, type FileRecount, type GapSplits, type GapStep, type ImporterReading, type Reading, type RealReading, type RealStudy,
} from "./recount.js";

/** The real week-8 count of one more season, for the range beside the file. */
export interface RealSeason extends RealReading {
  readonly season: number;
}

/** The pooled real week-8 values, copied from `NFL_CAREERS` (REAL, 2018-24; ± one standard error across seasons). */
export interface PooledReference {
  readonly seasons: readonly [number, number];
  readonly league: { readonly meanAge: number; readonly from31: number; readonly from34: number };
  readonly byGroup: Record<CareerGroup, { readonly n: number; readonly from31: number; readonly se31: number; readonly from34: number; readonly se34: number }>;
}

/**
 * The file's 31+ share with the real season's group mix, and the real season's with the file's; and,
 * by group, how many more men aged 31 or over the file's 53s hold than they would at the importer's
 * 23 October rate for the study season, and than they would at the real week-8 rate (CHOSEN checks).
 */
export interface MixCheck {
  readonly season: number;
  readonly fileAtRealMix: number;
  readonly realAtFileMix: number;
  /** Against the importer's 23 October share in each group: the file's men × (its share − that share). */
  readonly excessOldMen: Record<CareerGroup, number>;
  /** Against the real week-8 share in each group (the gap's own reference): the file's men × (its share − that share). */
  readonly excessOldMenAtRealRate: Record<CareerGroup, number>;
}

/** Each step's 31+ part over the three splits (a, b, c): its least and greatest (`stepRange`). */
export interface StepRanges {
  readonly method: { readonly min: number; readonly max: number };
  readonly snapshot: { readonly min: number; readonly max: number };
  readonly rows: { readonly min: number; readonly max: number };
}

export interface StandInRecountReport {
  readonly measuredOn: string;
  readonly league: { readonly file: string; readonly sha256: string; readonly season: number; readonly snapshotDate: string };
  readonly file: FileRecount;
  readonly realBySeason: readonly RealSeason[];
  readonly study: RealStudy;
  /** Split (a): the method at week 8, then the snapshot by the importer's rules (`gapSteps`). */
  readonly steps: readonly GapStep[];
  /** Splits (b) and (c) of the same gap (`gapSplits`). */
  readonly splits: GapSplits;
  readonly stepRanges: StepRanges;
  readonly mix: MixCheck;
  readonly pooled: PooledReference;
  readonly sources: readonly AssetManifest[];
}

export function pooledReference(): PooledReference {
  const w = NFL_CAREERS.weekEight;
  const byGroup = {} as PooledReference["byGroup"];
  for (const g of CAREER_GROUPS) {
    const r = w.byGroup[g];
    byGroup[g] = { n: r.age31Plus.n, from31: r.age31Plus.value, se31: r.age31Plus.se, from34: r.age34Plus.value, se34: r.age34Plus.se };
  }
  return {
    seasons: [w.seasons[0]!, w.seasons[w.seasons.length - 1]!],
    league: { meanAge: w.league.meanAge.value, from31: w.league.age31Plus.value, from34: w.league.age34Plus.value },
    byGroup,
  };
}

/** Σ over groups of one count's group weights × the other's group 31+ shares. */
export function mixCheck(file: Reading, real: Reading, atSnapshot: Reading, season: number): MixCheck {
  const at = (weights: Reading, values: Reading): number => {
    const total = CAREER_GROUPS.reduce((a, g) => a + weights.byGroup[g].n, 0);
    return total === 0 ? 0 : CAREER_GROUPS.reduce((a, g) => a + (weights.byGroup[g].n / total) * values.byGroup[g].from31, 0);
  };
  const excess = (rate: Reading): Record<CareerGroup, number> => {
    const out = {} as Record<CareerGroup, number>;
    for (const g of CAREER_GROUPS) out[g] = file.byGroup[g].aged * (file.byGroup[g].from31 - rate.byGroup[g].from31);
    return out;
  };
  return { season, fileAtRealMix: at(real, file), realAtFileMix: at(file, real), excessOldMen: excess(atSnapshot), excessOldMenAtRealRate: excess(real) };
}

export function buildRecountReport(input: Omit<StandInRecountReport, "steps" | "splits" | "stepRanges" | "mix" | "pooled">): StandInRecountReport {
  const steps = gapSteps(input.file.the53.league, input.study);
  const splits = gapSplits(input.file.the53.league, input.study);
  return {
    ...input,
    steps,
    splits,
    stepRanges: { method: stepRange(steps, splits, "method"), snapshot: stepRange(steps, splits, "snapshot"), rows: stepRange(steps, splits, "rows") },
    mix: mixCheck(input.file.the53, input.study.realWeek8.the53, input.study.importer.atSnapshot.the53, input.study.season),
    pooled: pooledReference(),
  };
}

/** Every number kept to 4 decimals (counts stay whole). */
function rounded(x: unknown): unknown {
  if (typeof x === "number") return Number.isInteger(x) ? x : round(x, 4);
  if (Array.isArray(x)) return x.map(rounded);
  if (x !== null && typeof x === "object") return Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, v]) => [k, rounded(v)]));
  return x;
}

export function renderJson(r: StandInRecountReport): string {
  return compactJson(rounded({ ...r, definitions: DEFINITIONS, chosen: CHOSEN, limits: LIMITS }), 240) + "\n";
}

// ---------------------------------------------------------------- words

export const DEFINITIONS: readonly { readonly term: string; readonly text: string }[] = [
  { term: "Data", text: "The stand-in league file (made-up names; ids and attributes only), read for its teams' rosters, reserve lists and practice squads, each man's age, position, credited seasons, draft record and copied injury, and its provenance's moved-up men; counts only. nflverse's public weekly rosters (roster_weekly_<season>.csv, every game type for the study season, the regular season for the real counts), the player table (players.csv, read for gsis_id, birth_date, draft_year, draft_round and draft_pick only) and the schedule (games.csv, the study season's game days only). 2025 is never read (held out, calibration.md §7)." },
  { term: "The real way", text: "As careers/measure.ts counts the real week-8 53s: status ACT or INA, without an injured-reserve or COVID code and without a practice-squad (P) code; week 8, a team on its bye read from its nearest week before; one row a man. Ages are whole years on 23 October; the mean age and the age shares are over men with a known age (a man with no roster birth date is left out of them); the rookie share (years_exp 0) over men with years_exp; the undrafted share (no draft number) over all. For the file: each team's roster less the practice-squad men the importer moved up (they carry a P code, which the real count leaves out); ages, credited seasons (the file's years_exp) and draft records as the file holds them." },
  { term: "The importer's way", text: "The stand-in importer's rules (the attributes package's real importer, its importer/real/standins.ts, copied in calibration's src/standin/rules.ts): a row counts only with coarse status ACT, INA, RES or DEV; code A01 is the 53, a P code the practice squad, an R code but R02 a reserve list, anything else (I01, I02, no code, W, E codes) is off the team; each team is read at its latest week among all its rows; a man on two teams' latest rosters stays with the later week; when a team's 53 has no QB, K, P or LS, its first practice-squad man there is moved up; age = whole years on the reference date from the roster's birth date, else the player table's, else 22 + years_exp; undrafted = no year, round and pick in the player table." },
  { term: "Readings of the study season", text: "Real week 8: the real way. (i) 23 October: the importer's way on rows through the last week whose first game was on or before 23 October (week 7 in 2024), as a file fetched that day would hold them. (ii) Week 8: the importer's way on rows through week 8, so each team is read at the same week as the real count. (iii) Latest: the importer's way on the whole file, playoffs included, as the importer reads a file fetched after the season; variants: the regular season's rows only, and the whole file with ages on the day after the last game. Ages are on 23 October of the season for every reading but the last." },
  { term: "Group", text: "QB, RB (RB+FB), WR, TE, OL, EDGE, IDL, LB, CB, S, K, P, LS. A real row folds by careers/groups.ts (its depth_chart_position, else its position, the importer's way); a man in the file by his game position through careerCheck.ts's CAREER_GROUP, the same fold (a test holds them equal)." },
  { term: "Out 4+ weeks", text: "A copied injury of band LONG (4-8 weeks) or MAJOR (9 or more), as a man on injured reserve misses at least 4 games." },
  { term: "Steps", text: "The file's 53s (the real way) against the study season's real week-8 count, split into three parts that add up to it: method = importer (ii) − real week 8 (same rows, same team weeks); snapshot = importer (i) − importer (ii); rows = file − importer (i) (another season's rows read the same way at the same point). Season's end = importer (iii) − importer (ii), beside the sum." },
  { term: "Other splits", text: "The steps above are split (a), which takes the method at week 8 and the file to have been read as the importer reads the final file, game-day inactives dropped. (b) The snapshot first: snapshot = the real count at the 23 October point − real week 8 (the real rules), method = importer (i) − the real count at the 23 October point, rows = file − importer (i) as in (a). (c) The file read the real way, as if its rows still carried the game-day inactives when it was fetched, so the importer's drop of them did not act: snapshot as in (b), no method step, rows = file − the real count at the 23 October point. Each adds up to the gap exactly. A step's range is its least and greatest part over (a), (b) and (c), a split with no method step counting 0 there." },
];

/** What is CHOSEN here (everything else is counted from real rows or the file). */
export const CHOSEN: readonly string[] = [
  "Which week a file fetched on 23 October holds: the last regular-season week whose first game was played by then.",
  "Ages on 23 October of the study season for every reading but one, so the readings differ by who is counted, not by the date.",
  "LONG or MAJOR as out 4+ weeks.",
  "The group of a real row: careers/groups.ts's fold, the importer's game position folded into groups; the importer's must-field check reads QB, K, P and LS by group, where group and game position agree.",
  "The steps' split, the group-mix check (each count's group weights against the other's group shares) and the file's extra men aged 31 or over by group (its men times the difference from the importer's 23 October share).",
  "The order of the steps: the method and snapshot parts depend on it (the method read at week 8 in (a), at the 23 October point in (b)), and the method's part also on whether the importer's drop of the game-day inactives acted on the file ((c) takes it that it did not); the rows part is the same in (a) and (b). Each part is reported as its range over (a), (b) and (c).",
  "The file's extra men aged 31 or over by group against the real week-8 share as well (its men times the difference from the real count's share in that group), the gap's own reference.",
];

export const LIMITS: readonly string[] = [
  "The file was built from the 2026 rows, which are not read here (they are the importer's, under attributes); the study applies the same rules to the 2024 rows, so 'rows' is 2026's rows against 2024's read the same way, plus anything in the 2026 run these readings do not copy.",
  "The file does not record which ages came from the fallback; the bound given counts every man whose age equals 22 + years in the league.",
  "A weekly-roster file fetched during a week may hold that week's rows before its games; the final file holds each week as of its game day, so the 23 October reading is the nearest the final file allows.",
  "The player table is today's, not as of the file's date; it fills only a few birth dates.",
  "The file records no status codes, so whether the importer's drop of the game-day inactives acted on it is read only from its team sizes; that is why the method's part is given as a range over the three splits, split (c) taking it to be none.",
];

// ---------------------------------------------------------------- formatting

const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d)}%`;
/** A signed number to `d` decimals; one that shows as zero carries no sign (not "−0.0"). */
const signed = (x: number, d = 1): string => {
  const shown = Math.abs(x).toFixed(d);
  return Number(shown) === 0 ? shown : `${x >= 0 ? "+" : "−"}${shown}`;
};
const pts = (x: number): string => signed(x * 100, 1);
const yrs = (x: number): string => signed(x, 2);
const fix = (x: number, d = 2): string => x.toFixed(d);
const int = (x: number): string => Math.round(x).toLocaleString("en-US");
const men = (n: number, one: string, many: string): string => `${int(n)} ${n === 1 ? one : many}`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

const shareCells = (s: AgeShares): string[] => [fix(s.meanAge), pct(s.upTo22), pct(s.from31), pct(s.from34), pct(s.rookie), pct(s.undrafted)];
const teamCell = (r: Reading): string => (r.teams.teams === 0 ? "-" : `${r.teams.min}-${r.teams.max}, ${fix(r.teams.mean, 1)}`);
const readingRow = (label: string, r: Reading): string[] => [label, int(r.league.n), teamCell(r), ...shareCells(r.league)];
const weeksCell = (r: ImporterReading): string =>
  Object.entries(r.teamWeeks).sort((a, b) => Number(b[0]) - Number(a[0])).map(([w, n]) => `${w} (${n})`).join(", ");
const topCodes = (codes: Record<string, number>, k = 4): string => {
  const list = Object.entries(codes).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const shown = list.slice(0, k).map(([c, n]) => `${c} ${n}`);
  return list.length > k ? `${shown.join(", ")}, other ${list.slice(k).reduce((a, [, n]) => a + n, 0)}` : shown.join(", ") || "-";
};
const cell31 = (s: AgeShares): string => (s.n === 0 ? "-" : `${pct(s.from31)} (${s.n})`);

const STEP_TEXT: Readonly<Record<GapStep["step"], string>> = {
  gap: "The gap: the file's 53s against the real week-8 count",
  method: "Method: the importer's rules at week 8 against the real rules at week 8",
  snapshot: "Snapshot: the importer at the 23 October point against week 8",
  rows: "Rows: the file against the importer at the 23 October point",
  seasonEnd: "Beside the sum, season's end: the importer at the file's latest week against week 8",
};

export function renderMarkdown(r: StandInRecountReport): string {
  const f = r.file;
  const s = r.study;
  const imp = s.importer;
  const real = s.realWeek8.the53;
  const realSnap = s.realAtSnapshot.the53;
  const seasons = r.realBySeason.map((x) => x.season);
  const out: string[] = [];
  out.push("# The stand-in league file, recounted the real way (ADR-087)");
  out.push("");
  out.push(
    `The stand-in league file \`${r.league.file}\` (the ${r.league.season} season, snapshot ${r.league.snapshotDate}) counted the way the real week-8 53s are counted, ` +
      `and the stand-in importer's own roster rules applied to the real ${s.season} weekly rosters, to see whether the file's share aged 31 or over comes from the import method, ` +
      "from when the file was taken, or from the rows themselves (owner's ruling, 2026-11-06). " +
      `Measured ${r.measuredOn}. Aggregates only: no ids, no names, no row per player. ` +
      "Every number is REAL (counted from the file or from nflverse's rows) unless the CHOSEN list below names the choice behind it.",
  );
  out.push("");
  out.push("Regenerate: `pnpm --filter @ff/calibration standin-recount` (reads `data-cache/injury-rates/raw/`, downloading once; `-- --league <file>`, `--season <year>`, `--out <path>`).");
  out.push("");

  out.push("## 1. The file's 53s, counted the real way");
  out.push("");
  const head = ["Count", "Men", "Per team (min-max, mean)", "Mean age", "22 or under", "31 or over", "34 or over", "Rookies", "Undrafted"];
  const p = r.pooled;
  out.push(table(head, [
    readingRow("File: the 53s, the real way", f.the53),
    readingRow("File: rosters as loaded (moved-up men in)", f.asLoaded),
    readingRow("File: the 53s less men out 4+ weeks", f.nflWay),
    readingRow("File: reserve lists", f.reserve),
    readingRow("File: practice squads", f.practice),
    readingRow("File: everyone on a team", f.onATeam),
    ...r.realBySeason.map((x) => readingRow(`Real ${x.season}, week 8`, x.the53)),
    [`Real ${p.seasons[0]}-${p.seasons[1]}, week 8, pooled (NFL_CAREERS)`, "-", "-", fix(p.league.meanAge), "-", pct(p.league.from31), pct(p.league.from34), "-", "-"],
  ]));
  out.push("");
  out.push(
    `The importer moved up ${men(f.elevated, "practice-squad man", "practice-squad men")} to a 53 (left out of the real-way count). ` +
      `${men(f.outFourPlus, "man", "men")} on the file's rosters ${f.outFourPlus === 1 ? "carries" : "carry"} a copied injury of 4+ weeks. ` +
      `Fallback ages: the file does not record which ages came from the importer's fallback (22 + years in the league); ${int(f.ageFallback.matches)} men on its 53s have exactly that age ` +
      `(${int(f.ageFallback.matches31Plus)} of them 31 or over), an upper bound. On the real ${s.season} rows the importer's way gives ${int(imp.week8.ageSources.fallback)} fallback ages on the week-8 53s, ` +
      `and of the ${int(s.fallbackLookalikes.dated)} men there with a birth date ${int(s.fallbackLookalikes.matches)} (${int(s.fallbackLookalikes.matches31Plus)} aged 31 or over) have that age anyway, so the bound is loose.`,
  );
  out.push("");

  out.push("Years in the league, a check on the ages that uses no birth date: the mean, the share with 9 or more, and age less years (his age on coming into the league), for every man counted and for the men aged 31 or over alone:");
  out.push("");
  const yearsRow = (label: string, x: Reading): string[] => [label, fix(x.league.meanYears), pct(x.league.years9Plus), fix(x.league.entryAge), int(x.old.n), fix(x.old.meanYears), pct(x.old.years9Plus), fix(x.old.entryAge)];
  out.push(table(
    ["Count", "Mean years", "9 or more years", "Age less years", "Men 31 or over", "Their mean years", "Their 9 or more", "Their age less years"],
    [
      yearsRow("File: the 53s, the real way", f.the53),
      ...r.realBySeason.map((x) => yearsRow(`Real ${x.season}, week 8`, x.the53)),
      yearsRow(`Importer's way, real ${s.season}, fetched ${s.ageDate}`, s.importer.atSnapshot.the53),
    ],
  ));
  out.push("");
  const span = (xs: readonly number[], show: (x: number) => string): string => `${show(Math.min(...xs))}-${show(Math.max(...xs))}`;
  out.push(
    `The file's 53s: ${pct(f.the53.league.years9Plus)} with 9 or more years in the league (real ${seasons[0]}-${seasons[seasons.length - 1]}: ` +
      `${span(r.realBySeason.map((x) => x.the53.league.years9Plus), pct)}); its men aged 31 or over came into the league at ${fix(f.the53.old.entryAge)} on average ` +
      `(real: ${span(r.realBySeason.map((x) => x.the53.old.entryAge), (x) => fix(x))}).`,
  );
  out.push("");
  out.push("## 2. By group: the file against the real 53s");
  out.push("");
  out.push(table(
    ["Group", "File men", `Real ${s.season} men`, "File mean age", "File 31+", `Real 31+ (${seasons.join(", ")})`, `Real 31+ ${p.seasons[0]}-${p.seasons[1]} ± SE`, "File 34+", `Real 34+ ${p.seasons[0]}-${p.seasons[1]} ± SE`,
      `File's extra men 31+ (at the importer's ${s.season} 23 October rate)`, `File's extra men 31+ (at the real ${s.season} week-8 rate)`],
    CAREER_GROUPS.map((g) => {
      const fg = f.the53.byGroup[g];
      const pg = p.byGroup[g];
      return [
        g, int(fg.n), int(real.byGroup[g].n), fix(fg.meanAge), pct(fg.from31),
        r.realBySeason.map((x) => pct(x.the53.byGroup[g].from31)).join(" / "),
        `${pct(pg.from31)} ± ${pct(pg.se31)}`, pct(fg.from34), `${pct(pg.from34)} ± ${pct(pg.se34)}`, signed(r.mix.excessOldMen[g]), signed(r.mix.excessOldMenAtRealRate[g]),
      ];
    }),
  ));
  out.push("");
  const sum = (x: Record<CareerGroup, number>): number => CAREER_GROUPS.reduce((a, g) => a + x[g], 0);
  // A group is below its reference when its column shows a minus (a part that shows as 0.0 is not).
  const below = (x: Record<CareerGroup, number>): string => CAREER_GROUPS.filter((g) => signed(x[g]).startsWith("−")).join(", ") || "none";
  out.push(
    `Group mix (CHOSEN check): with the real ${r.mix.season} week-8 group mix, the file's 31+ share would be ${pct(r.mix.fileAtRealMix)} (it is ${pct(f.the53.league.from31)}); ` +
      `with the file's mix, the real ${r.mix.season} share would be ${pct(r.mix.realAtFileMix)} (it is ${pct(real.league.from31)}). ` +
      `The last two columns are the file's men aged 31 or over less its men times a reference share in that group: the importer's ${s.season} 23 October share ` +
      `(${signed(sum(r.mix.excessOldMen))} men in all, of ${int(f.the53.league.aged)}; groups below it: ${below(r.mix.excessOldMen)}), ` +
      `and the real ${s.season} week-8 share, the gap's own reference (${signed(sum(r.mix.excessOldMenAtRealRate))} men in all; groups below it: ${below(r.mix.excessOldMenAtRealRate)}).`,
  );
  out.push("");

  out.push(`## 3. The importer's rules on the real ${s.season} rows`);
  out.push("");
  out.push(
    `The same file of ${s.season} weekly rosters read seven ways. Ages on ${s.ageDate} except where said. A file fetched on ${s.ageDate} holds rows through week ${s.snapshotWeek}, ` +
      `the last week whose first game had been played by then. The regular season ends at week ${s.lastRegularWeek}; the file's last week is ${s.lastWeek}. ` +
      "'Weeks read' gives each week the teams were read at, with the number of teams.",
  );
  out.push("");
  const rows: [string, ImporterReading][] = [
    [`(i) Importer, fetched ${s.ageDate} (through week ${s.snapshotWeek})`, imp.atSnapshot],
    ["(ii) Importer, through week 8", imp.week8],
    ["(iii) Importer, whole file (latest week, playoffs in)", imp.latest],
    ["(iii) Importer, regular season only", imp.latestRegular],
    [`(iii) Importer, whole file, ages on ${s.dayAfterLastGame}`, imp.latestAgedLater],
  ];
  out.push(table(
    ["Reading", "Weeks read (teams)", "Men", "Per team (min-max, mean)", "Mean age", "22 or under", "31 or over", "34 or over", "Rookies", "Undrafted", "31+ against real week 8"],
    [
      ["Real week 8 (the real way)", `8 (${real.teams.teams - s.realWeek8.byeFilled}), earlier (${s.realWeek8.byeFilled})`, int(real.league.n), teamCell(real), ...shareCells(real.league), "-"],
      [`Real at the 23 October point (week ${s.snapshotWeek}, the real way)`, `${s.snapshotWeek} (${realSnap.teams.teams - s.realAtSnapshot.byeFilled}), earlier (${s.realAtSnapshot.byeFilled})`,
        int(realSnap.league.n), teamCell(realSnap), ...shareCells(realSnap.league), pts(realSnap.league.from31 - real.league.from31)],
      ...rows.map(([label, x]) => [label, weeksCell(x), int(x.the53.league.n), teamCell(x.the53), ...shareCells(x.the53.league), pts(x.the53.league.from31 - real.league.from31)]),
    ],
  ));
  out.push("");
  out.push("Who is in one count and not the other, each reading against the real week-8 count (status/code pairs of their rows; 31+ over men with a known age):");
  out.push("");
  out.push(table(
    ["Reading", "In both", "Only the importer's: men", "31+", "their rows", "Only the real count's: men", "31+", "their rows"],
    rows.map(([label, x]) => {
      const v = x.versusReal;
      return [label, int(v.both), int(v.onlyImporter.n), v.onlyImporter.shares.aged === 0 ? "-" : pct(v.onlyImporter.shares.from31), topCodes(v.onlyImporter.codes),
        int(v.onlyReal.n), v.onlyReal.shares.aged === 0 ? "-" : pct(v.onlyReal.shares.from31), topCodes(v.onlyReal.codes)];
    }),
  ));
  out.push("");
  out.push("Where the importer's ages came from (men on its 53s), and its reserve lists and practice squads:");
  out.push("");
  out.push(table(
    ["Reading", "Roster birth date", "Player table", "Fallback (22 + years)", "Moved up", "Reserve: men, mean age, 31+", "Practice: men, mean age, 31+"],
    rows.map(([label, x]) => [label, int(x.ageSources.roster), int(x.ageSources.table), int(x.ageSources.fallback), int(x.elevated),
      `${int(x.reserve.n)}, ${fix(x.reserve.meanAge)}, ${pct(x.reserve.from31)}`, `${int(x.practice.n)}, ${fix(x.practice.meanAge)}, ${pct(x.practice.from31)}`]),
  ));
  out.push("");
  out.push("By group, 31 or over (men in brackets):");
  out.push("");
  out.push(table(
    ["Group", "Real week 8", `Real, 23 October point (week ${s.snapshotWeek})`, "(ii) Importer, week 8", "(i) Importer, 23 October", "(iii) Importer, latest", "File, the real way"],
    CAREER_GROUPS.map((g) => [g, cell31(real.byGroup[g]), cell31(realSnap.byGroup[g]), cell31(imp.week8.the53.byGroup[g]), cell31(imp.atSnapshot.the53.byGroup[g]), cell31(imp.latest.the53.byGroup[g]), cell31(f.the53.byGroup[g])]),
  ));
  out.push("");
  out.push("Week by week: the importer's way on rows through each week, and the real way at that week (regular season only):");
  out.push("");
  out.push(table(
    ["Week", "Type", "Importer men", "Mean age", "31 or over", "34 or over", "Real men", "Mean age", "31 or over", "34 or over"],
    s.byWeek.map((w) => [String(w.week), w.gameType, int(w.importer.n), fix(w.importer.meanAge), pct(w.importer.from31), pct(w.importer.from34),
      ...(w.real === null ? ["-", "-", "-", "-"] : [int(w.real.n), fix(w.real.meanAge), pct(w.real.from31), pct(w.real.from34)])]),
  ));
  out.push("");

  out.push("## 4. What moves the file's 31-and-over share");
  out.push("");
  out.push(`Split (a). Points of share (31 or over, 34 or over), years (mean age) and men. The first row is the sum of the next three, exactly; the last is beside them. Real side: ${s.season}.`);
  out.push("");
  const stepRow = (label: string, x: GapStep): string[] => [label, pts(x.from31), pts(x.from34), yrs(x.meanAge), `${x.n >= 0 ? "+" : "−"}${int(Math.abs(x.n))}`];
  out.push(table(["Step", "31 or over", "34 or over", "Mean age", "Men"], r.steps.map((x) => stepRow(STEP_TEXT[x.step], x))));
  out.push("");
  const pick = (xs: readonly GapStep[], k: GapStep["step"]): GapStep => xs.find((x) => x.step === k)!;
  const step = (k: GapStep["step"]) => pick(r.steps, k);
  out.push(
    "Split (a) reads the method at week 8 and takes the file to have been read as the importer reads the final file, its game-day inactives dropped. " +
      "Two more splits of the same gap, each adding up to it exactly (CHOSEN, like the first): (b) the snapshot first, by the real rules, then the method at the 23 October point; " +
      "(c) the file read the real way, as if its rows still carried the game-day inactives when it was fetched, so no method step.",
  );
  out.push("");
  out.push(table(
    ["Step", "31 or over", "34 or over", "Mean age", "Men"],
    [
      stepRow("(b) Snapshot, the real rules: the real count at the 23 October point against week 8", pick(r.splits.snapshotFirst, "snapshot")),
      stepRow("(b) Method at the 23 October point: the importer there against the real count there", pick(r.splits.snapshotFirst, "method")),
      stepRow("(b) Rows: the file against the importer at the 23 October point (as in a)", pick(r.splits.snapshotFirst, "rows")),
      stepRow("(c) Snapshot, the real rules (as in b)", pick(r.splits.fileReadRealWay, "snapshot")),
      stepRow("(c) Rows: the file against the real count at the 23 October point", pick(r.splits.fileReadRealWay, "rows")),
    ],
  ));
  out.push("");
  const range = (x: { readonly min: number; readonly max: number }): string => (pts(x.min) === pts(x.max) ? pts(x.min) : `${pts(x.min)} to ${pts(x.max)}`);
  out.push(
    `Read: the file's 31+ share is ${pts(step("gap").from31)} points from the real ${s.season} week-8 count. ` +
      "How much of that the import method makes depends on the order of the steps and on whether the importer's drop of the game-day inactives acted on the file: " +
      `${pts(step("method").from31)} read at week 8 (a), ${pts(pick(r.splits.snapshotFirst, "method").from31)} read at the 23 October point (b), and none if the file's rows still carried those men (c), ` +
      `so the method's part is ${range(r.stepRanges.method)}. Reading the rows at 23 October rather than week 8 moves it ${range(r.stepRanges.snapshot)}, ` +
      `and ${range(r.stepRanges.rows)} is left for the rows themselves (the ${r.league.season} rows against the ${s.season} rows at the same point). ` +
      `Reading the file at its latest week instead would move it ${pts(step("seasonEnd").from31)}.`,
  );
  out.push("");
  const inactive = Object.entries(imp.week8.versusReal.onlyReal.codes).filter(([c]) => /^(ACT|INA)\/I/.test(c)).reduce((a, [, n]) => a + n, 0);
  const nearerReal = Math.abs(f.the53.teams.mean - real.teams.mean) < Math.abs(f.the53.teams.mean - imp.atSnapshot.the53.teams.mean);
  out.push(
    `The method's part comes from the game-day inactives: in the final ${s.season} file a week's rows carry their I codes, which the importer drops ` +
      `(${int(inactive)} men at week 8, ${fix(inactive / Math.max(1, real.teams.teams), 1)} a team, ${pct(imp.week8.versusReal.onlyReal.shares.from31)} of them 31 or over). ` +
      `A file fetched in mid-week may not carry them yet. The file holds ${fix(f.the53.teams.mean, 1)} men a team on its 53s, against the importer's ` +
      `${fix(imp.atSnapshot.the53.teams.mean, 1)} at the 23 October point (${fix(imp.week8.the53.teams.mean, 1)} at week 8) and the real count's ${fix(real.teams.mean, 1)} here: ` +
      (nearerReal
        ? "nearer the real count's, so the file's rows likely still carried most of those men, and the method's part in the file is likely nearer (c)'s none than (a)'s."
        : "nearer the importer's, so the drop likely acted on the file, and the method's part in the file is likely nearer (a)'s than (c)'s none."),
  );
  out.push("");

  out.push("## Definitions");
  out.push("");
  for (const d of DEFINITIONS) out.push(`- **${d.term}.** ${d.text}`);
  out.push("");
  out.push("## CHOSEN");
  out.push("");
  for (const c of CHOSEN) out.push(`- ${c}`);
  out.push("");
  out.push("## Limits");
  out.push("");
  for (const l of LIMITS) out.push(`- ${l}`);
  out.push("");
  out.push("## Sources");
  out.push("");
  out.push(`- League file \`${r.league.file}\`, sha256 ${r.league.sha256}.`);
  for (const src of r.sources) out.push(`- ${src.url} (${int(src.bytes)} bytes, ${src.sha256}, fetched ${src.fetchedAt.slice(0, 10)}).`);
  out.push("");
  return out.join("\n");
}
