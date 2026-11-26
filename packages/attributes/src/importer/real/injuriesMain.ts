/**
 * `pnpm --filter @ff/attributes standin-injuries -- [--league <file>] [--fetch | --snapshot <dir>] [--cache <dir>] [--dry-run]`
 *
 * The thin wrapper: the command is `runStandinInjuries` (`injuriesCommand.ts`, where its flags are told).
 * On a refusal it prints the message alone, never the error object or its stack (critic 3), so nothing
 * but what the message names (a check, a stand-in id, a path or a count) reaches the terminal.
 */
import { runStandinInjuries } from "./injuriesCommand.js";

runStandinInjuries(process.argv.slice(2), { now: new Date(), log: (line) => console.log(line) }).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "standin-injuries stopped");
  process.exit(1);
});
