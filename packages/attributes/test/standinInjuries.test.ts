/**
 * `standin-injuries` end to end (ADR-087 AB7; tests 1, 8-11, 16-18, 23), on made-up folders only: a
 * league file import-real's build makes from hand-written rows (ids g:NN / p:NN, names "Made Up Player
 * ..."), its made-up sealed table, and an injuries snapshot whose files are made-up bytes (the manifest's
 * checks run on them) read through a stand-in reader of made-up rows (`projecting`). Nothing here reads
 * the network, a real sealed table or a real snapshot.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compareStamps, teamId, type CalendarStamp, type PlayerState, type Team } from "@ff/contracts";
import {
  buildRealLeague, copiedPastInjuries, fetchInjuriesSnapshot, fetchSnapshot, importRealFile, importRealWrites, injuryHistoryFiles,
  injuriesSnapshotDir, INJURY_HISTORY_FIRST_SEASON, latestSnapshot, officiatingWrites, pastInjuriesOfSnapshot, pastInjuriesWrites, readLeagueText,
  printoutLeaks, REAL_INJURY_KINDS, REAL_TEAM_SLOTS, runStandinInjuries, serializeLeagueFile, STARTING_DEVELOPMENT_VERSION, withoutPastInjuries, withStartingDevelopment,
  type Download, type LeagueFileLike, type PastInjuriesBlock, type RosterRow, type SealedTable,
} from "../src/importer/real/index.js";
import { INJURY_REPORT_COLUMNS, INJURY_ROSTER_COLUMNS, INJURY_SCHEDULE_COLUMNS, INJURY_SNAP_COLUMNS } from "../src/importer/real/injuryRows.js";
import type { ColumnsOf } from "../src/importer/real/injurySnapshot.js";
import { leakCount, LEAK_PATTERNS, projecting, shuffled } from "./helpers.js";

const SEASON = 2026;
const CUT = "2026-10-23";
const NOW = new Date("2026-10-24T08:00:00Z");
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const MEN = [1, 2, 3, 4, 5, 6, 7, 8];
const gsis = (n: number) => `g:${String(n).padStart(2, "0")}`;
const pfr = (n: number) => `p:${String(n).padStart(2, "0")}`;
const nameOf = (n: number) => `Made Up Player ${WORDS[n]}`;
/** The snapshot's made-up report texts, by season (each season one man out two weeks). */
const TEXTS = ["Left Knee", "Ankle", "Hamstring", "Concussion", "Shoulder", "Groin", "Back"];

// --- the made-up league file, as import-real builds one ---------------------------------------------

function madeUpLeague(): { file: LeagueFileLike; sealed: SealedTable } {
  const teams: Team[] = REAL_TEAM_SLOTS.map((_, i) => ({
    id: teamId(`T${String(i + 1).padStart(2, "0")}`), displayName: `Team ${i + 1}`, city: `City ${i + 1}`,
    roster: [], staff: [], depthChart: {}, capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
  }));
  const POS = ["QB", "RB", "WR", "TE", "OLB", "CB", "SS", "DE"] as const;
  const row = (n: number): RosterRow => ({
    gsis_id: gsis(n), pfr_id: pfr(n), team: n <= 4 ? "BAL" : "PIT", week: 7, status: "ACT", status_description_abbr: "A01",
    position: POS[n - 1]!, depth_chart_position: POS[n - 1]!,
    birth_date: `199${n}-06-15`, height: 74, weight: 220, years_exp: 3 + n, full_name: nameOf(n),
  });
  const built = buildRealLeague({
    seed: "made-up", season: SEASON, date: CUT, teams, sealed: {},
    rosters: MEN.map(row), players: [], depth: [], contracts: [], combine: [],
    snaps: [],
    injuries: [{ gsis_id: gsis(2), week: 7, report_primary_injury: "Hamstring", practice_primary_injury: null, report_status: "Out" }],
    tracking: { ngsPass: [], ngsRec: [], ngsRush: [], pfrPass: [], pfrRec: [], pfrRush: [], pfrDef: [] },
  });
  const file = importRealFile({
    season: SEASON, snapshotDate: CUT, league: built.league, contracts: built.contracts, deadMoney: [], picks: [],
    picksSource: { published: "2026-10-01" }, startingDevelopment: built.startingDevelopment,
  });
  return { file: JSON.parse(serializeLeagueFile(file)) as LeagueFileLike, sealed: built.sealed };
}

// --- the made-up snapshot rows ---------------------------------------------------------------------

type Raw = Record<string, unknown>;
const gameday = (season: number, week: number) => new Date(Date.UTC(season, 8, 10 + 7 * (week - 1))).toISOString().slice(0, 10);
/** Who is out when: in each season before the file's, one man two weeks (4-5); man 3 on IR at 2025's end and into 2026 (open at the cut). */
function outIn(season: number, n: number, week: number): string | null {
  if (season < SEASON && n === ((season - INJURY_HISTORY_FIRST_SEASON) % MEN.length) + 1 && (week === 4 || week === 5)) return TEXTS[season - INJURY_HISTORY_FIRST_SEASON]!;
  if (n === 3 && ((season === 2025 && week >= 17) || season === SEASON)) return "IR";
  return null;
}
function snapshotRows(): Record<string, Raw[]> {
  const files: Record<string, Raw[]> = { schedules: [] };
  for (let y = INJURY_HISTORY_FIRST_SEASON; y <= SEASON; y++) {
    const rosters: Raw[] = [], reports: Raw[] = [], snaps: Raw[] = [];
    for (let week = 1; week <= 18; week++) {
      files.schedules!.push({ game_id: `${y}_${week}_T1`, season: y, game_type: "REG", week, home_team: "T1", away_team: "T2", gameday: gameday(y, week) });
      for (const n of MEN) {
        const team = n <= 4 ? "T1" : "T2";
        const out = outIn(y, n, week);
        rosters.push({
          season: y, week, team, gsis_id: gsis(n), status: out === "IR" ? "RES" : "ACT", status_description_abbr: out === "IR" ? "R01" : "A01",
          game_type: "REG", pfr_id: pfr(n), full_name: nameOf(n),
        });
        if (out === null) snaps.push({ season: y, week, team, game_type: "REG", pfr_player_id: pfr(n), player: nameOf(n), offense_snaps: 40, defense_snaps: 0, st_snaps: 2 });
        else if (out !== "IR") {
          reports.push({
            season: y, week, team, gsis_id: gsis(n), game_type: "REG", report_primary_injury: out, practice_primary_injury: out,
            report_status: "Out", practice_status: "Did Not Participate In Practice",
          });
        }
      }
    }
    // A preseason game and its rows: read past, as the regular season alone counts.
    files.schedules!.push({ game_id: `${y}_00_T1`, season: y, game_type: "PRE", week: 1, home_team: "T1", away_team: "T2", gameday: gameday(y, 0) });
    files[`rosters${y}`] = rosters;
    files[`injuries${y}`] = reports;
    files[`snaps${y}`] = snaps;
  }
  return files;
}

/** Every file has every column the loaders read. */
const allColumns: ColumnsOf = async (_dir, key) =>
  key === "schedules" ? INJURY_SCHEDULE_COLUMNS : key.startsWith("rosters") ? INJURY_ROSTER_COLUMNS : key.startsWith("injuries") ? INJURY_REPORT_COLUMNS : INJURY_SNAP_COLUMNS;
/** Made-up bytes stand in for the downloads: the manifest's checks run on them; only `projecting` can read them. */
const download: Download = async (url) => new TextEncoder().encode(`made-up bytes of ${url}`);

/** A made-up package folder: its league file, its sealed table and an injuries snapshot fetched the day after the cut. */
async function setup(o: { snapshot?: boolean } = {}) {
  const pkg = await mkdtemp(join(tmpdir(), "ff-standin-injuries-"));
  const { file, sealed } = madeUpLeague();
  const leagues = join(pkg, "leagues");
  const cache = join(pkg, "data-cache", "real");
  await mkdir(leagues, { recursive: true });
  await mkdir(cache, { recursive: true });
  const league = join(leagues, `standin-${CUT}.json`);
  const text = serializeLeagueFile(file);
  await writeFile(league, text);
  const sealedPath = join(cache, "sealed.json");
  await writeFile(sealedPath, JSON.stringify(sealed, null, 1) + "\n");
  const snap = o.snapshot === false ? null : await fetchInjuriesSnapshot({ root: join(cache, "injuries"), season: SEASON, now: NOW, download });
  const lines: string[] = [];
  const deps = { now: NOW, log: (l: string) => lines.push(l), pkg, cwd: pkg, read: projecting(snapshotRows()), columnsOf: allColumns };
  return { pkg, league, text, file, sealed, sealedPath, cache, dir: snap?.dir ?? null, lines, deps };
}
type Setup = Awaited<ReturnType<typeof setup>>;
const run = (s: Setup, argv: string[] = [], over: Partial<Setup["deps"]> & { download?: Download } = {}) => runStandinInjuries(argv, { ...s.deps, ...over });
/** The refusal's message, or "" when it ran. */
async function refusal(p: Promise<unknown>): Promise<string> {
  try { await p; return ""; } catch (e) { return e instanceof Error ? e.message : "not an Error"; }
}
/** Counts of what must never show: the rows' names, real ids, team codes and report texts, and id-like shapes. */
function leaks(text: string): Record<string, number> {
  return {
    names: leakCount(text, /Made Up Player/),
    "real ids": leakCount(text, /\b[gp]:\d\d\b/),
    "row teams": leakCount(text, /\bT[1-4]\b/),
    "report texts": leakCount(text, new RegExp(`\\b(${[...TEXTS, "Hamstring"].join("|")})\\b`)),
    ...Object.fromEntries(Object.entries(LEAK_PATTERNS).map(([k, re]) => [k, leakCount(text, re)])),
  };
}
const NONE = { names: 0, "real ids": 0, "row teams": 0, "report texts": 0, "gsis-like ids": 0, "pfr-like ids": 0 };

describe("standin-injuries on a made-up package folder", () => {
  let s: Setup;
  let after: string;
  beforeAll(async () => {
    s = await setup();
    await run(s, ["--league", relative(s.pkg, s.league)]);
    after = readFileSync(s.league, "utf8");
  });

  it("writes the block and each man's records at /3, and prints counts only (test 1)", () => {
    const f = JSON.parse(after) as LeagueFileLike & { pastInjuries: PastInjuriesBlock; startingDevelopment: { version: string } };
    expect(f.startingDevelopment.version).toBe(STARTING_DEVELOPMENT_VERSION);
    expect(Object.keys(f)).toEqual(["format", "season", "snapshotDate", "league", "contracts", "deadMoney", "picks", "picksSource", "pastInjuries", "startingDevelopment"]);
    const block = f.pastInjuries;
    // Seasons 2019-2025, one man two weeks each; man 3's 2025-end spell runs into the cut and is left out.
    expect(block.seasons).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    expect(block.counts).toMatchObject({ men: 7, records: 7, openAtCutDropped: 1, chainedAcrossSeasonEnd: 1, snapshotSeasonDropped: 0, merged: 0 });
    const records = Object.values(block.players).flat();
    expect(records.map((r) => r.kind).sort()).toEqual(["real:ankle", "real:back-neck", "real:concussion-head", "real:groin-hip", "real:hamstring", "real:knee", "real:shoulder"]);
    const first: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
    for (const r of records) {
      expect(Object.keys(r)).toEqual(["kind", "weeks", "since", "healed"]);
      expect(REAL_INJURY_KINDS as readonly string[]).toContain(r.kind);
      expect(r.weeks).toBe(2);
      expect(compareStamps(r.healed, first)).toBeLessThan(0);
    }
    // Each man's records are the block's, as he has them.
    for (const p of f.league.players as PlayerState[]) expect(p.condition.injuryHistory).toEqual(block.players[String(p.bio.id)]);
    // No name, real id, team or report text in the block, the file or the printout; no key that could hold one in the block.
    expect(leaks(JSON.stringify(block)), "block").toEqual(NONE);
    // The file adds none: its counts are the file's before the run (import-real's own provenance keeps its copied report's word).
    expect(leaks(after), "file").toEqual(leaks(s.text));
    expect(leaks(after)).toMatchObject({ names: 0, "real ids": 0, "row teams": 0, "gsis-like ids": 0, "pfr-like ids": 0 });
    expect(leaks(s.lines.join("\n")), "printout").toEqual(NONE);
    const keys = new Set<string>();
    const walk = (v: unknown): void => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } };
    walk(block);
    for (const k of ["name", "team", "gsis", "gsisId", "gsis_id", "pfr", "pfrId", "displayName"]) expect(keys.has(k), k).toBe(false);
    expect(s.lines.at(-1)).toBe(`  wrote ${relative(s.pkg, s.league)}`);
    expect(s.lines.some((l) => l.includes("names agree: 8 of 8"))).toBe(true);
  });

  it("changes only AB7's paths (test 16)", () => {
    expect(serializeLeagueFile(withoutPastInjuries(readLeagueText(after, s.league)))).toBe(s.text);
  });

  it("changes nothing on a second run (test 2)", async () => {
    const lines: string[] = [];
    await run(s, [], { log: (l) => lines.push(l) });
    expect(readFileSync(s.league, "utf8")).toBe(after);
    expect(lines.at(-1)).toBe(`  unchanged: ${relative(s.pkg, s.league)}`);
    // standin-development on the /3 file: the same bytes.
    expect(serializeLeagueFile(withStartingDevelopment(readLeagueText(after, s.league)))).toBe(after);
  });

  it("leaves the sealed table byte for byte, and its time (test 11)", async () => {
    const t = await setup();
    const bytes = await readFile(t.sealedPath);
    const mtime = statSync(t.sealedPath).mtimeMs;
    await run(t);
    expect((await readFile(t.sealedPath)).equals(bytes)).toBe(true);
    expect(statSync(t.sealedPath).mtimeMs).toBe(mtime);
  });

  it("gives import-real's file the same bytes (test 18), and its own build the same block", async () => {
    const built = await pastInjuriesOfSnapshot(s.dir!, s.file, s.sealed, projecting(snapshotRows()), allColumns);
    expect(importRealWrites(s.file, null, undefined, built.block).league).toBe(after);
    const copied = await copiedPastInjuries(s.cache, s.file, s.sealed, projecting(snapshotRows()), allColumns);
    expect(copied.kind).toBe("copied");
    if (copied.kind === "copied") expect(JSON.stringify(copied.built.block)).toBe(JSON.stringify(built.block));
    // Without its blocks, import-real's file is the file the command started from.
    expect(importRealWrites(s.file, null, undefined).league).toBe(s.text);
  });

  it("gives the same bytes for the same inputs, and for the rows in another order (test 23)", async () => {
    const again = await setup();
    await run(again);
    expect(readFileSync(again.league, "utf8")).toBe(after);
    const rows = snapshotRows();
    const mixed = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, shuffled(v, k)]));
    const other = await setup();
    await run(other, [], { read: projecting(mixed) });
    expect(readFileSync(other.league, "utf8")).toBe(after);
  });
});

describe("the four commands in any order (test 17)", () => {
  it("give the same bytes, the keys in order", async () => {
    const s = await setup();
    const block = (await pastInjuriesOfSnapshot(s.dir!, s.file, s.sealed, projecting(snapshotRows()), allColumns)).block;
    // A made-up officiating block: the committed file's (its crews are made up), reused only as bytes to place.
    const committed = JSON.parse(readFileSync(join(__dirname, "..", "leagues", "standin-2026-10-23.json"), "utf8")) as { officiating: never };
    const contracts = [{ player: "made-up deal", team: "T01", years: [] }];
    const steps: Record<string, (t: string) => string> = {
      development: (t) => serializeLeagueFile(withStartingDevelopment(readLeagueText(t, "made-up"))),
      officials: (t) => officiatingWrites({ path: "made-up", text: t, officiating: committed.officiating, sealed: {}, sealedText: undefined }).league ?? t,
      contracts: (t) => serializeLeagueFile({ ...(JSON.parse(t) as object), contracts }),
      injuries: (t) => pastInjuriesWrites({ path: "made-up", text: t, block }) ?? t,
    };
    const orders = (xs: string[]): string[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x) => orders(xs.filter((y) => y !== x)).map((o) => [x, ...o])));
    const results = new Set<string>();
    for (const order of orders(Object.keys(steps))) results.add(order.reduce((t, k) => steps[k]!(t), s.text));
    expect(results.size).toBe(1);
    const [only] = [...results];
    expect(Object.keys(JSON.parse(only!) as object)).toEqual([
      "format", "season", "snapshotDate", "league", "contracts", "deadMoney", "picks", "picksSource", "pastInjuries", "officiating", "startingDevelopment",
    ]);
  });
});

describe("standin-injuries' refusals", () => {
  it("refuses a file it would change outside AB7's paths, writing nothing; --dry-run writes nothing (test 16)", async () => {
    const s = await setup();
    const lines: string[] = [];
    const mtime = statSync(s.league).mtimeMs;
    await run(s, ["--dry-run"], { log: (l) => lines.push(l) });
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
    expect(statSync(s.league).mtimeMs).toBe(mtime);
    expect(lines.at(-1)).toBe(`  dry run, nothing written: ${relative(s.pkg, s.league)}`);
    // A key after startingDevelopment: the write would move it.
    const extra = serializeLeagueFile({ ...(JSON.parse(s.text) as object), later: 1 });
    await writeFile(s.league, extra);
    expect(await refusal(run(s))).toBe(`${s.league} would change outside its past injuries; if its records are stale, run standin-development first; nothing written`);
    expect(readFileSync(s.league, "utf8")).toBe(extra);
    // A stale record: one man's growth record is not what standin-development makes today.
    const stale = JSON.parse(s.text) as LeagueFileLike;
    const p0 = stale.league.players[0] as PlayerState;
    (stale.league.players as PlayerState[])[0] = { ...p0, attributes: { ...p0.attributes, development: { ...p0.attributes.development!, growth: p0.attributes.development!.growth + 0.5 } } };
    await writeFile(s.league, serializeLeagueFile(stale));
    expect(await refusal(run(s))).toMatch(/would change outside its past injuries/);
    // A file not as the serializer writes it.
    await writeFile(s.league, JSON.stringify(JSON.parse(s.text), null, 1));
    expect(await refusal(run(s))).toMatch(/is not as the league file's serializer writes it/);
  });

  it("refuses an unknown flag, a stray word and a flag without its value, never echoing the word", async () => {
    const s = await setup();
    expect(await refusal(run(s, ["--leauge", "x"]))).toBe("standin-injuries: unknown argument --leauge; the flags are --league, --snapshot, --cache, --fetch, --dry-run");
    const stray = await refusal(run(s, ["Made-Up-Word"]));
    expect(stray).toMatch(/unknown argument \(a word that is no flag's value\)/);
    expect(stray).not.toContain("Made-Up-Word");
    expect(await refusal(run(s, ["--league"]))).toBe("--league requires a value");
    expect(await refusal(run(s, ["--snapshot", "--fetch"]))).toBe("--snapshot requires a value");
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
  });

  it("refuses a cache outside the package's gitignored data-cache (critic 4)", async () => {
    const s = await setup();
    for (const c of ["..", "leagues", "data-cache-elsewhere", "/tmp"]) {
      expect(await refusal(run(s, ["--cache", c])), c).toBe(`--cache must be inside ${join(s.pkg, "data-cache")} (gitignored), so no snapshot file lands where it could be committed`);
    }
    // Inside it, another folder: no sealed table there.
    expect(await refusal(run(s, ["--cache", "data-cache/other"]))).toBe(`no sealed table at ${join(s.pkg, "data-cache", "other", "sealed.json")}: the stand-ins cannot be joined`);
  });

  it("refuses a missing or damaged sealed table, a man with no entry, two ids for one man and a table of other names, by path, id or count (test 11)", async () => {
    const s = await setup();
    const one = Object.keys(s.sealed)[0]!;
    const id = s.sealed[one]!.id;
    const cases: [string, string, RegExp | string][] = [
      ["damaged", "{ not json", `${s.sealedPath} is not valid JSON, so it cannot be read as a sealed table; the run stops`],
      ["no entry", JSON.stringify(Object.fromEntries(Object.entries(s.sealed).filter(([k]) => k !== one))), `stand-in ${id} has no entry in the sealed table`],
      ["two ids", JSON.stringify({ ...s.sealed, "g:99": { id, name: s.sealed[one]!.name } }), `the sealed table gives stand-in ${id} two real ids`],
      ["other names", JSON.stringify({ ...s.sealed, [one]: { id, name: "Some Other Made Up Name" } }), "the sealed table's names agree with the file's for 7 of 8 men: it is not the table this file was built with"],
    ];
    for (const [what, text, want] of cases) {
      await writeFile(s.sealedPath, text);
      const m = await refusal(run(s));
      if (typeof want === "string") expect(m, what).toBe(want); else expect(m, what).toMatch(want);
      expect(leaks(m), what).toEqual(NONE);
      expect(readFileSync(s.sealedPath, "utf8"), what).toBe(text);
    }
    const none = await setup();
    await writeFile(none.sealedPath, "");
    const { rm } = await import("node:fs/promises");
    await rm(none.sealedPath);
    expect(await refusal(run(none))).toBe(`no sealed table at ${none.sealedPath}: the stand-ins cannot be joined`);
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
  });

  it("refuses a snapshot that is not what its manifest says, of another season, missing a file or fetched before the cut (test 10)", async () => {
    const s = await setup({ snapshot: false });
    const root = join(s.cache, "injuries");
    // A changed byte.
    const changed = await fetchInjuriesSnapshot({ root, season: SEASON, now: NOW, download });
    const path = join(changed.dir, "rosters2020.parquet");
    const bytes = Buffer.from(await readFile(path));
    bytes[0] = bytes[0]! ^ 1;
    await writeFile(path, bytes);
    expect(await refusal(run(s))).toMatch(/rosters2020\.parquet is not the file that was fetched/);
    const at = (name: string) => join(s.pkg, "data-cache", "other", name);
    const other = async (name: string, season: number, now: Date, files: Record<string, string>) =>
      (await fetchSnapshot({ root: at(name), season, now, files, download })).dir;
    const of2025 = await other("a", 2025, NOW, { ...injuryHistoryFiles(2025) });
    expect(await refusal(run(s, ["--snapshot", of2025]))).toBe(`the injuries snapshot ${of2025} is of 2025, not the file's season 2026`);
    const { snaps2019: _gone, ...lacking } = injuryHistoryFiles(SEASON);
    const short = await other("b", SEASON, NOW, lacking);
    expect(await refusal(run(s, ["--snapshot", short]))).toBe(`the injuries snapshot ${short} has no snaps2019 in its manifest`);
    const early = await other("c", SEASON, new Date("2026-10-20T08:00:00Z"), { ...injuryHistoryFiles(SEASON) });
    expect(await refusal(run(s, ["--snapshot", early]))).toBe(
      `the injuries snapshot ${early} was fetched on 2026-10-20, before the file's cut ${CUT}, so it cannot cover it`);
    // --snapshot is read from the package folder.
    const ok = await other("d", SEASON, NOW, { ...injuryHistoryFiles(SEASON) });
    await run(s, ["--snapshot", relative(s.pkg, ok), "--dry-run"]);
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
  });

  it("refuses a --league that is not JSON or not a league file without quoting it (review finding 3)", async () => {
    const s = await setup();
    const cases: [string, string, string][] = [
      ["rows.csv", `${nameOf(1)},g:01,T1,Left Knee\n`, "is not valid JSON, so it is not a stand-in league file; nothing written"],
      ["other.json", JSON.stringify({ format: `${nameOf(1)} g:01 T1` }), "(another format, expected \"ff-standin-league/1\")"],
      ["list.json", JSON.stringify([nameOf(1)]), "(no format, expected"],
      ["text.json", JSON.stringify(nameOf(1)), "(no format: the file is not a JSON object, expected"],
    ];
    for (const [name, text, want] of cases) {
      const path = join(s.pkg, "leagues", name);
      await writeFile(path, text);
      const m = await refusal(run(s, ["--league", relative(s.pkg, path)]));
      expect(m, name).toContain(want);
      expect(m, name).toContain(path);
      expect(leaks(m), name).toEqual(NONE);
      expect(readFileSync(path, "utf8"), name).toBe(text);
    }
  });

  it("refuses the file's season with a game whose date is not YYYY-MM-DD, or with no game before the cut (review finding 9)", async () => {
    const s = await setup();
    const rows = snapshotRows();
    const of2026 = (f: (g: Raw) => Raw) => ({ ...rows, schedules: rows.schedules!.map((g) => (g.season === SEASON ? f(g) : g)) });
    const cases: [string, Record<string, Raw[]>, string][] = [
      ["no dates", of2026((g) => ({ ...g, gameday: null })), "schedules.parquet: 18 regular-season games of 2026 have no gameday written YYYY-MM-DD: a misread"],
      ["one date in another shape", of2026((g) => (g.week === 3 && g.game_type === "REG" ? { ...g, gameday: "09/24/2026" } : g)),
        "schedules.parquet: 1 regular-season games of 2026 have no gameday written YYYY-MM-DD: a misread"],
      ["every game after the cut", of2026((g) => ({ ...g, gameday: "2026-11-01" })), `the injuries snapshot has no regular-season game of 2026 before the cut ${CUT}: a misread`],
    ];
    for (const [what, files, want] of cases) {
      const m = await refusal(run(s, [], { read: projecting(files) }));
      expect(m, what).toBe(want);
      expect(leaks(m), what).toEqual(NONE);
    }
    // A preseason game with no date is not read, so it is no misread.
    const pre = of2026((g) => (g.game_type === "PRE" ? { ...g, gameday: null } : g));
    await run(s, ["--dry-run"], { read: projecting(pre) });
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
  });

  it("refuses a printout or block holding a value the run read, printing and writing nothing (review finding 2)", async () => {
    const s = await setup();
    // A made-up real id, a row's team code and a row's name, each planted in the printout through the league file's path.
    const cases: [string, string][] = [["g:01", "real ids 1"], ["T1", "team codes 2"], [nameOf(1), "names 2"]];
    for (const [folder, want] of cases) {
      const path = join(s.pkg, "leagues", folder, `standin-${CUT}.json`);
      await mkdir(join(s.pkg, "leagues", folder), { recursive: true });
      await writeFile(path, s.text);
      const lines: string[] = [];
      const m = await refusal(run(s, ["--league", relative(s.pkg, path)], { log: (l) => lines.push(l) }));
      expect(m, folder).toBe(`the printout or the block would hold real values (${want}): nothing printed or written`);
      expect(lines, folder).toEqual([]);
      expect(readFileSync(path, "utf8"), folder).toBe(s.text);
    }
  });

  it("counts every kind of real value the run holds, and only those (printoutLeaks)", () => {
    const held = { ids: ["g:01", "g:02"], teams: new Set(["T1", "T2"]), names: new Set(["made up player one", "made up player two"]) };
    const none = { "real ids": 0, "team codes": 0, names: 0, "gsis-like ids": 0, "pfr-like ids": 0 };
    expect(printoutLeaks(["  records: 7 men, 7 records; by kind real:knee 1", "T12 T3 made up player three", "{\"kind\":\"real:ankle\"}"], held)).toEqual(none);
    expect(printoutLeaks(["at g:01 and g:01, and g:02x"], held)).toEqual({ ...none, "real ids": 2 });
    expect(printoutLeaks(["T1, (T2) and T1"], held)).toEqual({ ...none, "team codes": 3 });
    expect(printoutLeaks(["MADE-UP player  ONE", "Madé Úp Player" + " Two."], held)).toEqual({ ...none, names: 2 });
    // The id shapes, built here so this file holds none.
    expect(printoutLeaks([["12", "3456789"].join("-"), ["Made", "Up", "07"].join("")], held)).toEqual({ ...none, "gsis-like ids": 1, "pfr-like ids": 1 });
  });

  it("refuses a missing column and a season with no rows or no spell among the file's men (test 9)", async () => {
    const s = await setup();
    const lacking: ColumnsOf = async (dir, key) => ((await allColumns(dir, key)).filter((c) => !(key === "rosters2024" && c === "gsis_id")));
    expect(await refusal(run(s, [], { columnsOf: lacking }))).toBe("rosters2024.parquet has no column gsis_id");
    const rows = snapshotRows();
    expect(await refusal(run(s, [], { read: projecting({ ...rows, rosters2021: [] }) }))).toBe("the injuries snapshot has no regular-season weekly roster row of 2021: a misread");
    expect(await refusal(run(s, [], { read: projecting({ ...rows, injuries2022: [] }) }))).toBe("the injuries snapshot has no regular-season injury report row of 2022: a misread");
    expect(await refusal(run(s, [], { read: projecting({ ...rows, schedules: rows.schedules!.filter((g) => g.season !== 2020) }) })))
      .toBe("the injuries snapshot has no regular-season game of 2020: a misread");
    // 2023's one report row moved to a week with no game: the rows are there, and no spell among the file's men that season.
    const moved = rows.injuries2023!.map((r) => ({ ...r, week: 30 }));
    expect(await refusal(run(s, [], { read: projecting({ ...rows, injuries2023: moved }) }))).toBe("the injuries snapshot gives the file's men no spell in 2023: a misread");
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
  });
});

describe("every importer entry point prints a refusal's message alone (critic 3; review finding 5)", () => {
  it("has one catch, printing e.message or a fixed word, and prints no error object, stack or String(e) (counted)", () => {
    const dir = join(__dirname, "..", "src", "importer", "real");
    const entries = readdirSync(dir).filter((f) => f === "main.ts" || /Main\.ts$/.test(f)).sort();
    expect(entries).toEqual(["contractsMain.ts", "developMain.ts", "injuriesMain.ts", "main.ts", "officialsMain.ts"]);
    for (const f of entries) {
      const t = readFileSync(join(dir, f), "utf8");
      const messageOnly = leakCount(t, /console\.error\(e instanceof Error \? e\.message : "[a-z-]+ stopped"\)/);
      expect(messageOnly, `message-only refusals in ${f}`).toBe(1);
      expect(leakCount(t, /console\.error\(/) - messageOnly, `other console.error calls in ${f}`).toBe(0);
      expect(leakCount(t, /\.stack\b|String\(e\)|\$\{e\}|console\.(log|warn|info|debug)\(e\b/), `error objects printed in ${f}`).toBe(0);
    }
  });
});

describe("the injuries snapshot folder (test 8)", () => {
  const counting = (fail?: number) => {
    const seen = { calls: 0 };
    const fn: Download = async (url) => {
      if (++seen.calls === fail) throw new Error("download made-up: HTTP 503");
      return download(url);
    };
    return { seen, fn };
  };

  it("fetches today's into <cache>/injuries with --fetch, refuses a second the same day, and a failed fetch leaves no dated folder", async () => {
    const s = await setup({ snapshot: false });
    const root = join(s.cache, "injuries");
    expect(await refusal(run(s))).toBe(`no injuries snapshot under ${root}; run with --fetch`);
    const net = counting();
    await run(s, ["--fetch", "--dry-run"], { download: net.fn });
    expect(net.seen.calls).toBe(Object.keys(injuryHistoryFiles(SEASON)).length);
    expect(await readdir(root)).toEqual(["2026-10-24"]);
    expect(readFileSync(s.league, "utf8")).toBe(s.text);
    const again = counting();
    expect(await refusal(run(s, ["--fetch"], { download: again.fn }))).toMatch(/the injuries snapshot .*2026-10-24 is there already, and a fetch today would write over it/);
    expect(again.seen.calls).toBe(0);
    // The next day, a download that fails at its third file: nothing dated is left, and the newest is the kept one.
    const failing = counting(3);
    expect(await refusal(run(s, ["--fetch"], { download: failing.fn, now: new Date("2026-10-25T08:00:00Z") }))).toMatch(/HTTP 503/);
    expect((await readdir(root)).filter((d) => /^\d/.test(d))).toEqual(["2026-10-24"]);
    expect(await latestSnapshot(root)).toBe(join(root, "2026-10-24"));
  });

  it("reads <cache>/injuries, never import-real's dated folders in <cache> itself, and the other way round", async () => {
    const s = await setup({ snapshot: false });
    const importReal = await fetchSnapshot({ root: s.cache, season: SEASON, now: NOW, download });
    expect(existsSync(importReal.dir)).toBe(true);
    // import-real's folder is no injuries snapshot: standin-injuries finds none.
    expect(await refusal(run(s))).toBe(`no injuries snapshot under ${join(s.cache, "injuries")}; run with --fetch`);
    const injuries = await fetchInjuriesSnapshot({ root: join(s.cache, "injuries"), season: SEASON, now: new Date("2026-10-30T08:00:00Z"), download });
    // import-real's newest is still its own: the injuries folder is not dated.
    expect(await latestSnapshot(s.cache)).toBe(importReal.dir);
    expect(await injuriesSnapshotDir({ root: join(s.cache, "injuries"), given: undefined, fetch: false, season: SEASON, now: NOW })).toBe(injuries.dir);
    // --snapshot wins over --fetch, and fetches nothing.
    const net = counting();
    expect(await injuriesSnapshotDir({ root: join(s.cache, "injuries"), given: "/made/up/injuries/2026-10-01", fetch: true, season: SEASON, now: NOW, download: net.fn })).toBe("/made/up/injuries/2026-10-01");
    expect(net.seen.calls).toBe(0);
  });
});
