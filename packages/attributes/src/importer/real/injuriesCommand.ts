/**
 * `pnpm --filter @ff/attributes standin-injuries -- [--league <file>] [--fetch | --snapshot <dir>] [--cache <dir>] [--dry-run]`
 *
 * Gives a stand-in league file its players' real injury history (ADR-087 AB7, §12.3.7; contracts P8), in
 * place: the file's `pastInjuries` block, just before `officiating` (else `startingDevelopment`), and each
 * man's `condition.injuryHistory`, copied from it by the starting-development step at
 * `standin-development/3`. Written through the serializer `import-real` writes with; nothing else in the
 * file changes (checked before anything is written). A second run on the same snapshot and sealed table
 * changes nothing, and `standin-development`, `standin-officials` and `standin-contracts` before or after
 * give the same bytes.
 *
 * `--league`: the file, from the folder the command was typed in; default the newest
 * `leagues/standin-<date>.json` in this package. `--snapshot <dir>`: an injuries snapshot folder; else
 * `--fetch` fetches one into `<cache>/injuries/<today, UTC>/` (refused when that folder is there already; a
 * failed fetch leaves no dated folder); else the newest under `<cache>/injuries/`. `--cache` (default
 * `data-cache/real`) and `--snapshot` are relative to this package, and the cache must be inside its
 * gitignored `data-cache/` (critic 4), so no snapshot file lands where it could be committed. `--dry-run`
 * builds and prints and writes no league file (a fetch still fills the cache). Any other flag is refused.
 *
 * Reads the snapshot (real ids and names, read only inside `importer/real/`) and the players' sealed table
 * `<cache>/sealed.json` (read only, never written here; required). Prints counts, file hashes and paths
 * only: no name, no real id, no team, no row value, and no error carries one. The printout and the block are
 * made in full first and checked against the real values the run holds (`printoutLeaks`, review finding
 * 2); if either would hold one, nothing is printed or written and the refusal gives the counts alone.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { nameWords, pastInjuriesOfSnapshot, injuriesSnapshotDir, type ColumnsOf } from "./injurySnapshot.js";
import { CHAIN_LEFT_WEEKS, SNAPSHOT_SEASON_SPELLS } from "./injurySpells.js";
import { pastInjuriesWrites, readLeagueText } from "./leagueFile.js";
import type { ReadRows } from "./rows.js";
import type { Download } from "./snapshot.js";
import { parseSealedTable } from "./standins.js";

export interface StandinInjuriesDeps {
  /** The fetched folder's date (UTC). */
  readonly now: Date;
  /** One printout line. */
  readonly log: (line: string) => void;
  /** The package folder (`--cache`, `--snapshot` and `leagues/` resolve against it); default this package. */
  readonly pkg?: string;
  /** The folder the command was typed in (`--league` resolves against it); default `INIT_CWD`, else the process's. */
  readonly cwd?: string;
  readonly download?: Download;
  readonly read?: ReadRows;
  readonly columnsOf?: ColumnsOf;
}

const VALUE_FLAGS = ["--league", "--snapshot", "--cache"] as const;
const SWITCHES = ["--fetch", "--dry-run"] as const;

/** The arguments, checked: a flag's value must be there and not be a flag; any other word is refused (against typos). */
function parseArgs(raw: readonly string[]): { opt: (name: (typeof VALUE_FLAGS)[number]) => string | undefined; has: (name: (typeof SWITCHES)[number]) => boolean } {
  const argv = raw.filter((a) => a !== "--");
  const values = new Map<string, string>();
  const on = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if ((VALUE_FLAGS as readonly string[]).includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new SyntaxError(`${a} requires a value`);
      values.set(a, v);
      i++;
    } else if ((SWITCHES as readonly string[]).includes(a)) on.add(a);
    else throw new SyntaxError(`standin-injuries: unknown argument ${a.startsWith("--") ? a : "(a word that is no flag's value)"}; ` +
      `the flags are ${[...VALUE_FLAGS, ...SWITCHES].join(", ")}`);
  }
  return { opt: (name) => values.get(name), has: (name) => on.has(name) };
}

/** What the run holds that its printout and block must not show: real ids, team codes, names (as `nameWords` writes them). */
export interface HeldValues {
  readonly ids: Iterable<string>;
  readonly teams: ReadonlySet<string>;
  readonly names: ReadonlySet<string>;
}

/** What `printoutLeaks` counts, each a count only. */
export interface LeakCounts {
  readonly "real ids": number;
  readonly "team codes": number;
  readonly names: number;
  readonly "gsis-like ids": number;
  readonly "pfr-like ids": number;
}

const GSIS_LIKE = /\d{2}-\d{7}/g;
const PFR_LIKE = /[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/g;

/**
 * The command's last check (review finding 2): how many of the run's real values `texts` hold. Real ids
 * anywhere in a text (each id counted once); team codes as whole words, case kept; names as runs of whole
 * words, case and marks ignored; and anything shaped like a gsis or pfr id. Counts only, never a value.
 */
export function printoutLeaks(texts: readonly string[], held: HeldValues): LeakCounts {
  const all = texts.join("\n");
  let ids = 0;
  for (const id of held.ids) if (id.length > 0 && all.includes(id)) ids++;
  const teams = (all.match(/[A-Za-z0-9]+/g) ?? []).filter((w) => held.teams.has(w)).length;
  let most = 0;
  for (const n of held.names) most = Math.max(most, Math.min(6, n.split(" ").length));
  let names = 0;
  for (const t of texts) {
    const w = nameWords(t);
    for (let i = 0; i < w.length; i++) for (let n = 2; n <= most && i + n <= w.length; n++) if (held.names.has(w.slice(i, i + n).join(" "))) names++;
  }
  return {
    "real ids": ids, "team codes": teams, names,
    "gsis-like ids": (all.match(GSIS_LIKE) ?? []).length, "pfr-like ids": (all.match(PFR_LIKE) ?? []).length,
  };
}

/** The command, on injectable seams, so a test runs it whole on made-up folders. */
export async function runStandinInjuries(argv: readonly string[], deps: StandinInjuriesDeps): Promise<void> {
  const { opt, has } = parseArgs(argv);
  const pkg = deps.pkg ?? fileURLToPath(new URL("../../../", import.meta.url));
  const leagues = join(pkg, "leagues");
  const newest = () => {
    const name = existsSync(leagues) ? readdirSync(leagues).filter((f) => /^standin-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop() : undefined;
    if (name === undefined) throw new Error(`no stand-in league file in ${leagues}; run import-real`);
    return join(leagues, name);
  };
  const typed = opt("--league");
  const path = typed === undefined ? newest() : resolve(deps.cwd ?? process.env.INIT_CWD ?? process.cwd(), typed);
  const cache = resolve(pkg, opt("--cache") ?? "data-cache/real");
  const kept = resolve(pkg, "data-cache");
  if (cache !== kept && !cache.startsWith(kept + sep)) {
    throw new Error(`--cache must be inside ${kept} (gitignored), so no snapshot file lands where it could be committed`);
  }

  const before = readFileSync(path, "utf8");
  // Refused now if it does not read back as its serializer writes it; `pastInjuriesWrites` checks it again before any write.
  const file = readLeagueText(before, path);
  const sealedPath = join(cache, "sealed.json");
  if (!existsSync(sealedPath)) throw new Error(`no sealed table at ${sealedPath}: the stand-ins cannot be joined`);
  // A damaged table is refused by its path alone: its keys are real people's (`parseSealedTable`). Never written here.
  const sealed = parseSealedTable(readFileSync(sealedPath, "utf8"), sealedPath);

  const root = join(cache, "injuries");
  const given = opt("--snapshot");
  const dir = await injuriesSnapshotDir({
    root, given: given === undefined ? undefined : resolve(pkg, given), fetch: has("--fetch"), season: file.season, now: deps.now,
    ...(deps.download === undefined ? {} : { download: deps.download }),
  });
  if (dir === null) throw new Error(`no injuries snapshot under ${root}; run with --fetch`);
  const built = await pastInjuriesOfSnapshot(dir, file, sealed, deps.read, deps.columnsOf);
  const { snapshot: snap, join: joined, block, report } = built;
  const c = block.counts;
  // The printout is made in full first, and printed only once it and the block pass the last check.
  const lines: string[] = [];
  const log = (line: string) => lines.push(line);

  log(`standin-injuries ${relative(pkg, path)}: season ${file.season}, cut ${file.snapshotDate}`);
  log(`  injuries snapshot ${basename(dir)} (${relative(pkg, dir)}): season ${snap.manifest.season}, fetched ${snap.manifest.fetchedAt}; ` +
    `every file matches its manifest (sha256 ${snap.manifestSha256})`);
  for (const [key, e] of Object.entries(snap.manifest.files)) log(`    ${key.padEnd(12)} ${String(e.bytes).padStart(10)} bytes  sha256 ${e.sha256}`);
  log(`  sealed table: ${joined.sealedEntries} entries; the file's ${joined.realOf.size} stand-ins all joined; names agree: ${joined.namesAgree} of ${joined.realOf.size}`);
  log(`  rows with a blank game_type, read as the regular season: ${snap.blankGameType}`);
  for (const s of snap.seasons) {
    const n = s.counts;
    log(`  ${n.season}: team games ${n.teamGames}${n.gamesCut > 0 ? ` (${n.gamesCut} games on or after the cut left out)` : ""}, ` +
      `the file's men's timelines ${n.timelines}, spells ${n.spells} (football ${n.football}, illness ${n.illness}; non-football left out ${n.nfi})`);
  }
  log(`  chained: across a season end ${c.chainedAcrossSeasonEnd}, after leaving a roster ${c.chainedAfterLeaving} (within ${CHAIN_LEFT_WEEKS} weeks); ` +
    `overlapping spells merged ${c.merged}`);
  log(`  the file's season's spells (${SNAPSHOT_SEASON_SPELLS}): open at the cut ${c.openAtCutDropped} (with a copied injury ` +
    `${c.openAtCutDroppedWithCopiedInjury}, without ${c.openAtCutDropped - c.openAtCutDroppedWithCopiedInjury}), others ${c.snapshotSeasonDropped}; ` +
    `copied injuries with no open spell: ${report.copiedWithoutOpen}`);
  log(`  records: ${c.men} men, ${c.records} records; by kind ${Object.entries(report.byKind).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}; ` +
    `by band SHORT ${report.byBand.SHORT}, LONG ${report.byBand.LONG}, MAJOR ${report.byBand.MAJOR}`);

  const writes = pastInjuriesWrites({ path, text: before, block });
  const write = !has("--dry-run") && writes !== null;
  log(has("--dry-run") ? `  dry run, nothing written: ${relative(pkg, path)}` : write ? `  wrote ${relative(pkg, path)}` : `  unchanged: ${relative(pkg, path)}`);

  const leaks = printoutLeaks([...lines, JSON.stringify(block)], { ids: joined.realOf.values(), ...snap.held });
  const found = Object.entries(leaks).filter(([, n]) => n > 0);
  if (found.length > 0) {
    throw new Error(`the printout or the block would hold real values (${found.map(([k, n]) => `${k} ${n}`).join(", ")}): nothing printed or written`);
  }
  if (write) writeFileSync(path, writes!);
  for (const line of lines) deps.log(line);
}
