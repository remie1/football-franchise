/**
 * `pnpm --filter @ff/attributes standin-officials -- [--league <file>] [--fetch] [--snapshot <dir>] [--cache <dir>] [--check]`
 *
 * Gives a stand-in league file its 17 officiating crews (ADR-093 step 1b; §15 Q3, §16 A11), copies of
 * the real NFL's under made-up referee names (`officials.ts`), in place: the file's `officiating` block,
 * just before `startingDevelopment`, written through the serializer `import-real` writes with, and
 * nothing else in the file changes (checked before anything is written). A second run on the same
 * snapshot and sealed tables changes nothing, and `standin-development` before or after gives the same
 * bytes.
 *
 * `--league`: the file, from the folder the command was typed in; default the newest
 * `leagues/standin-<date>.json` in this package. `--snapshot <dir>`: an officials snapshot folder; else
 * `--fetch` fetches one into `<cache>/officials/<today, UTC>/` (refused when that folder is there already,
 * so a re-run on a kept folder names it with `--snapshot`; a failed fetch leaves no dated folder); else
 * the newest under `<cache>/officials/` (`officialsSnapshotDir`). `--cache` (default `data-cache/real`) and
 * `--snapshot` are relative to this package. `--check`: the port check against ADR-093's Table 6 and
 * the two sources' agreement on who refereed each game.
 *
 * Reads the snapshot (real names, read only inside `importer/real/`), the players' sealed table
 * `<cache>/sealed.json` (read only, never written here) and the referees' `<cache>/sealed-officials.json`
 * (written only when it changes). Both spreads, as measured and widened, are computed and printed on
 * every run; `STANDIN_SPREAD` picks the one written. Prints counts, foul names and file hashes only,
 * never a name.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { officiatingWrites, readLeagueText } from "./leagueFile.js";
import { CREW_FAMILIES, kindlessShown, LEAN_WINDOW, MIN_SPREAD_GAMES, SPREAD_WINDOW, STANDIN_SPREAD, table6Check } from "./officials.js";
import { crewsOfSnapshot, officialsSnapshotDir, readOfficialsSnapshot, snapshotTaken } from "./officialsSnapshot.js";
import { parseSealedTable, type SealedTable } from "./standins.js";

/** ADR-093's Table 6 (REAL, its real-numbers page): offensive holding's single-season crew SD and the share of the spread beyond chance. */
const TABLE6: Readonly<Record<string, { readonly sd: number; readonly share: number }>> = {
  2023: { sd: 0.11, share: 0.28 },
  2024: { sd: 0.25, share: 0.71 },
  2025: { sd: 0.15, share: 0.41 },
};

const pct = (x: number, places = 1) => `${(100 * x).toFixed(places)}%`;
const span = (r: { readonly min: number; readonly max: number }) => `${r.min} to ${r.max}`;

/** A sealed table, or an empty one when the file is not there; a damaged one is refused by its path alone (`parseSealedTable`). */
function readSealed(path: string): { table: SealedTable; text: string | undefined } {
  if (!existsSync(path)) return { table: {}, text: undefined };
  const text = readFileSync(path, "utf8");
  return { table: parseSealedTable(text, path), text };
}

async function main(argv: readonly string[]) {
  const opt = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    if (i < 0) return undefined;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new SyntaxError(`${name} requires a value`);
    return v;
  };
  const pkg = fileURLToPath(new URL("../../../", import.meta.url));
  const leagues = join(pkg, "leagues");
  const newest = () => {
    const name = readdirSync(leagues).filter((f) => /^standin-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
    if (name === undefined) throw new Error(`no stand-in league file in ${leagues}; run import-real`);
    return join(leagues, name);
  };
  const typed = opt("--league");
  const path = typed === undefined ? newest() : resolve(process.env.INIT_CWD ?? process.cwd(), typed);
  const cache = resolve(pkg, opt("--cache") ?? "data-cache/real");

  const before = readFileSync(path, "utf8");
  // Refused now if it does not read back as its serializer writes it; `officiatingWrites` checks it again before any write.
  const file = readLeagueText(before, path);

  // The snapshot: given, fetched today, or the newest kept.
  const root = join(cache, "officials");
  const given = opt("--snapshot");
  const dir = await officialsSnapshotDir({
    root, given: given === undefined ? undefined : resolve(pkg, given), fetch: argv.includes("--fetch"), season: file.season, now: new Date(),
  });
  if (dir === null) throw new Error(`no officials snapshot under ${root}; run with --fetch`);
  const snap = await readOfficialsSnapshot(dir, file.season);
  const season = file.season;
  const leanSeasons = LEAN_WINDOW.map((d) => season + d);
  const spreadSeasons = SPREAD_WINDOW.map((d) => season + d);

  console.log(`standin-officials ${relative(pkg, path)}: season ${season}, the stand-in league's 17 crews copied from the real crews`);
  console.log(`  officials snapshot ${basename(dir)} (${relative(pkg, dir)}): season ${snap.manifest.season}, fetched ${snap.manifest.fetchedAt}; ` +
    `every file matches its manifest`);
  for (const [key, e] of Object.entries(snap.manifest.files)) console.log(`    ${key.padEnd(10)} ${String(e.bytes).padStart(9)} bytes  sha256 ${e.sha256}`);

  const players = readSealed(join(cache, "sealed.json"));
  const referees = readSealed(join(cache, "sealed-officials.json"));
  console.log(`  the players' sealed table (sealed.json): ${players.text === undefined
    ? "not found, so stand-ins off today's file are not in the taken set"
    : `found, ${Object.keys(players.table).length} entries, every name in it taken`}`);
  console.log(`  the referees' sealed table (sealed-officials.json): ${referees.text === undefined ? "none yet" : `${Object.keys(referees.table).length} entries`} before this run`);

  const here = snap.counts.find((c) => c.season === season)!;
  console.log(`  ${season} so far: ${here.played} regular-season games played, ${here.withReferee} with a referee in the schedules`);
  for (const c of snap.counts) {
    const refs = Object.values(c.referees);
    console.log(`    ${c.season}: ${c.played} played, ${c.withReferee} with a referee, ${refs.length} referees ` +
      `(${refs.filter((r) => r.games >= MIN_SPREAD_GAMES).length} with ${MIN_SPREAD_GAMES} or more games), ${refs.reduce((a, r) => a + r.snaps, 0)} scrimmage snaps in those games`);
  }
  const all = snap.counts.reduce((a, c) => a + c.flagged.all, 0);
  const withKind = snap.counts.reduce((a, c) => a + c.flagged.withKind, 0);
  console.log(`  flags on scrimmage snaps, ${snap.counts[0]!.season} to ${season}: ${all}, ${withKind} with a kind (${pct(all > 0 ? withKind / all : 0, 2)})`);

  const sealed = { players: players.table, referees: referees.table };
  const taken = snapshotTaken(snap, file, sealed);
  // The foul names are free text from the plays' descriptions: `kindlessShown` shows only those made of a foul's words, and no taken name.
  const kindless = kindlessShown(snap.counts, taken);
  const hidden = kindless.hidden;
  console.log(`  flags with no kind, counted in no family: ${kindless.shown.map(([name, n]) => `${name} ${n}`).join(", ") || "none"}` +
    `${hidden.flags > 0 ? `; ${hidden.flags} more under ${hidden.names} name${hidden.names === 1 ? "" : "s"} not shown` : ""}`);
  const by = snap.namesBySource;
  console.log(`  the snapshot's names, distinct, by source: the officials table's ${by.officials}, the schedules' referees ${by.referees}, ` +
    `coaches ${by.coaches}, players ${by.players}`);
  console.log(`  the taken set: ${taken.size} names (the snapshot's, the file's stand-ins and both sealed tables)`);

  if (argv.includes("--check")) {
    const check = table6Check(snap.check);
    console.log(`  --check, ADR-093 Table 6 (offensive holding, the officials table's referee, per game, referees with 10 or more games):`);
    for (const s of check.seasons) {
      const page = TABLE6[String(s.season)];
      console.log(`    ${s.season}: ${s.referees} referees, crew SD ${pct(s.sd)}${page === undefined ? "" : ` (the page ${pct(page.sd, 0)})`}, ` +
        `share beyond chance ${pct(s.share, 0)}${page === undefined ? "" : ` (the page ${pct(page.share, 0)})`}`);
    }
    const a = check.agreement;
    console.log(`  --check, the two sources on who refereed each game, ${spreadSeasons[0]} to ${spreadSeasons[spreadSeasons.length - 1]}: ` +
      `${a.compared} games compared, ${a.agree} agree, ${a.differ} differ, ${a.setAside} set aside as one person spelled two ways ` +
      `(${a.spellingPairs} spelling pair${a.spellingPairs === 1 ? "" : "s"})`);
  }

  const built = crewsOfSnapshot(snap, file, sealed);
  const r = built.report;
  const ids = built.officiating.crews.map((c) => String(c.id));
  console.log(`  referees with a game in ${season}: ${r.referees}, ${r.minted} new; sealed referees with no game this season: ${r.missing}; ` +
    `crews ${ids[0]} to ${ids[ids.length - 1]}; kept their id and referee: ${r.kept === null ? "no block before this run" : `${r.kept} of ${ids.length}`}`);
  console.log(`  games behind each copy: ${span(r.games.total)} (${leanSeasons.map((s) => `${s}: ${span(r.games.bySeason[String(s)]!)}`).join("; ")})`);
  console.log(`  per family: flags a refereed game by season; tau by season (RMS); mean pull; as measured: SD in points (of the rate), range, mean; ` +
    `widened: factor, SD, range, mean`);
  for (const f of CREW_FAMILIES) {
    const x = r.families[f];
    const perGame = Object.entries(x.perGame).map(([, v]) => v.toFixed(2)).join(" / ");
    console.log(`    ${f.padEnd(13)} ${perGame}; tau ${x.tau.map((t) => (100 * t).toFixed(1)).join(" / ")}% (${pct(x.tauRms)}); pull ${x.shrink.toFixed(2)}; ` +
      `measured ${x.measured.sd.toFixed(2)} (${pct(x.measured.sd / 50)}), ${span(x.measured)}, mean ${x.measured.mean.toFixed(2)}; ` +
      `widened ${x.widened.factor === null ? "none (no spread)" : x.widened.factor.toFixed(2)}, ${x.widened.sd.toFixed(2)} (${pct(x.widened.sd / 50)}), ` +
      `${span(x.widened)}, mean ${x.widened.mean.toFixed(2)}`);
  }
  for (const f of CREW_FAMILIES) {
    const sorted = built.officiating.crews.map((c) => c.leans[f]).sort((a, b) => a - b);
    console.log(`    ${f.padEnd(13)} the written leans, sorted: ${sorted.join(", ")}`);
  }
  console.log(`  the spread written: ${STANDIN_SPREAD}`);

  // In place: the block, and nothing else; each file written only when it changes.
  const writes = officiatingWrites({ path, text: before, officiating: built.officiating, sealed: built.sealed, sealedText: referees.text });
  if (writes.sealed !== null) writeFileSync(join(cache, "sealed-officials.json"), writes.sealed);
  console.log(`  the referees' sealed table: ${Object.keys(built.sealed).length} entries, ${writes.sealed === null ? "unchanged" : "written"}`);
  if (writes.league === null) console.log(`  unchanged: ${relative(pkg, path)}`);
  else {
    writeFileSync(path, writes.league);
    console.log(`  wrote ${relative(pkg, path)}`);
  }
}

main(process.argv.slice(2).filter((a) => a !== "--")).catch((e: unknown) => { console.error(e); process.exit(1); });
