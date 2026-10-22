/** The `news` script's entry point. Everything it does lives in `newsCli.ts`, where it is tested. */
import { parseNewsArgs, runNews } from "./newsCli.js";

const path = runNews(parseNewsArgs(process.argv.slice(2)));
console.log(`Saved ${path}`);
