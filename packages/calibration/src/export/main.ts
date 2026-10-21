/** The `export-game` script's entry point. Everything it does lives in `cli.ts`, where it is tested. */
import { parseExportArgs, runExport } from "./cli.js";

const path = runExport(parseExportArgs(process.argv.slice(2)));
process.stdout.write(`saved ${path}\n`);
