/**
 * `pnpm --filter @ff/attributes standin-contracts -- --contracts <historical_contracts.parquet> [--league <file>] [--sealed <file>]`
 *
 * Rebuilds a stand-in league file's estimated contracts in place by the importer's rules
 * (`buildContracts`, through `refreshContracts`), from OverTheCap's contract rows: the snapshot's
 * `contracts.parquet`, or nflverse's `historical_contracts.parquet` downloaded the same day. For when the
 * contract rules change and the file's snapshot is not at hand. Every deal the file copied from the
 * year-by-year history must come out unchanged, or it stops and writes nothing. Like `import-real` it
 * reads the sealed table (real id -> stand-in; default `data-cache/real/sealed.json` in this package), and
 * it writes made-up ids only. Prints counts only.
 *
 * `--league`: the file, from the folder the command was typed in; default the newest
 * `leagues/standin-<date>.json` in this package.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlayerId, TeamId } from "@ff/contracts";
import { refreshContracts, type ContractSource, type StandInContract } from "./contracts.js";
import { serializeLeagueFile } from "./leagueFile.js";
import { CONTRACT_COLUMNS, type ContractRow } from "./rows.js";
import { readRows } from "./snapshot.js";

interface ContractsFile {
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: {
    readonly teams: readonly { readonly id: TeamId }[];
    readonly players: readonly { readonly bio: { readonly id: PlayerId }; readonly teamId?: TeamId }[];
    readonly provenance: { readonly contractSource: Readonly<Record<string, ContractSource>> };
  };
  readonly contracts: readonly StandInContract[];
  readonly [key: string]: unknown;
}

async function main(argv: readonly string[]) {
  const opt = (name: string) => {
    const i = argv.indexOf(name);
    if (i >= 0 && argv[i + 1] === undefined) throw new SyntaxError(`${name} requires a file`);
    return i < 0 ? undefined : argv[i + 1];
  };
  const typedPath = (p: string) => resolve(process.env.INIT_CWD ?? process.cwd(), p);
  const rowsAt = opt("--contracts");
  if (rowsAt === undefined) throw new SyntaxError("--contracts <historical_contracts.parquet> is required");
  const leagues = fileURLToPath(new URL("../../../leagues", import.meta.url));
  const newest = () => {
    const name = readdirSync(leagues).filter((f) => /^standin-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
    if (name === undefined) throw new Error(`no stand-in league file in ${leagues}; run import-real`);
    return join(leagues, name);
  };
  const league = opt("--league");
  const path = league === undefined ? newest() : typedPath(league);
  const sealedAt = opt("--sealed");
  const sealedPath = sealedAt === undefined ? resolve(process.cwd(), "data-cache/real/sealed.json") : typedPath(sealedAt);

  const file = JSON.parse(readFileSync(path, "utf8")) as ContractsFile;
  const rowsPath = typedPath(rowsAt);
  const rows = await readRows<ContractRow>(dirname(rowsPath), basename(rowsPath, ".parquet"), CONTRACT_COLUMNS);
  const source = file.league.provenance.contractSource;
  const { contracts, changed } = refreshContracts({
    season: file.season, rows, sealed: JSON.parse(readFileSync(sealedPath, "utf8")) as Record<string, { id: string }>,
    teams: file.league.teams, players: file.league.players, contracts: file.contracts, source,
  });
  if (changed.length > 0) writeFileSync(path, serializeLeagueFile({ ...file, contracts }));

  const estimated = contracts.filter((c) => source[String(c.player)] === "estimated");
  const byLength = new Map<number, number>();
  for (const c of estimated) byLength.set(c.years.length, (byLength.get(c.years.length) ?? 0) + 1);
  const lengths = [...byLength].sort((a, b) => a[0] - b[0]).map(([n, k]) => `${k} for ${n} year${n === 1 ? "" : "s"}`).join(", ");
  console.log(`standin-contracts ${file.snapshotDate}: ${changed.length} of ${estimated.length} estimated deals rebuilt; estimated deals now ${lengths}`);
  console.log(changed.length > 0 ? `  wrote ${path}` : `  unchanged: ${path}`);
}

main(process.argv.slice(2).filter((a) => a !== "--")).catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
