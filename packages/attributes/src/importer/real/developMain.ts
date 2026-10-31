/**
 * `pnpm --filter @ff/attributes standin-development -- [--league <file>]`
 *
 * Gives every stand-in in a league file his starting development (ADR-087 §2.5, step 1;
 * `development.ts`): growth rate, body, career snaps, patience, combine record and today's injury.
 * Takes off any records an earlier run left and writes the new ones into the same file, through the
 * serializer `import-real` writes with, so a second run changes nothing. Reads only the league file
 * (made-up names; no raw data, no name table). Prints counts only.
 *
 * `--league`: the file, from the folder the command was typed in; default the newest
 * `leagues/standin-<date>.json` in this package.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COPIED_REPORT, COPIED_RESERVE } from "./development.js";
import { serializeLeagueFile, withStartingDevelopment, type LeagueFileLike } from "./leagueFile.js";

function main(argv: readonly string[]) {
  const i = argv.indexOf("--league");
  const typed = i < 0 ? undefined : argv[i + 1];
  if (i >= 0 && typed === undefined) throw new SyntaxError("--league requires a file");
  const leagues = fileURLToPath(new URL("../../../leagues", import.meta.url));
  const newest = () => {
    const name = readdirSync(leagues).filter((f) => /^standin-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
    if (name === undefined) throw new Error(`no stand-in league file in ${leagues}; run import-real`);
    return join(leagues, name);
  };
  const path = typed === undefined ? newest() : resolve(process.env.INIT_CWD ?? process.cwd(), typed);

  const before = readFileSync(path, "utf8");
  const file = withStartingDevelopment(JSON.parse(before) as LeagueFileLike);
  const after = serializeLeagueFile(file);

  const players = file.league.players;
  const withRecords = players.filter((p) => p.attributes.development !== undefined).length;
  const sources = Object.values(file.startingDevelopment!.players).flatMap((f) => (f.injury ? [f.injury.source] : []));
  const bySource = [...COPIED_RESERVE, ...COPIED_REPORT].map((s) => `${s} ${sources.filter((x) => x === s).length}`).join(", ");
  const noStatus = file.startingDevelopment!.teamsWithoutGameStatus.length;
  console.log(`standin-development ${file.snapshotDate}: ${withRecords} of ${players.length} players with growth records, ` +
    `${players.filter((p) => p.bio.combine !== undefined).length} with a combine record`);
  console.log(`  injuries copied: ${sources.length} (${bySource})`);
  console.log(`  teams without game statuses on their latest injury report: ${noStatus} of ${new Set(players.map((p) => String(p.teamId))).size}`);
  if (after === before) console.log(`  unchanged: ${path}`);
  else {
    writeFileSync(path, after);
    console.log(`  wrote ${path}`);
  }
}

main(process.argv.slice(2).filter((a) => a !== "--"));
