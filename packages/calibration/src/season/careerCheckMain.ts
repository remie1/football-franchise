/**
 * `pnpm --filter @ff/calibration career-check -- --league <file> (--seed <seed> | --seed-set tune|grade --index <n>) [--arm both|development|incumbent|form] [--seasons 20] [--out <file>]`
 * `pnpm --filter @ff/calibration career-check -- --grade --pass 1|2 --league <file> [--seasons 20] [--seeds a,b] [--coach-seeds a,b] [--build <fingerprint>] [--old gate|report] [--report <path>] [--smoke]`
 *
 * ADR-087 §9, row D5b: the 20-season check. Plays ONE seed of the stand-in league with growth and
 * injuries switched on (the cap check's walk, `careerCheckRun.ts`) and keeps its rows under
 * `data-cache/career-check/<fingerprint>/`, with a checkpoint after every season, so a killed seed
 * carries on where it stopped. A seed already played is read from there. One seed a process (about
 * 45-55 minutes for 20 seasons); run a few in separate shells to go faster.
 *
 * Seeds: `--seed <seed>`, or `--seed-set tune --index 1..4` (d5b-t1..t4) or `--seed-set grade --index
 * 1..12` (d5b-g1..g12). Arms: `both` (growth and injuries), `development` (growth alone), and the
 * coach-style arms `incumbent` and `form` (both switches, every head coach leaning all the way to his
 * incumbents, or to who looks best this week).
 *
 * `--grade --pass 1|2` reads the cached rows of the grade seeds (arm `both`) and of the coach-style
 * arms on the tuning seeds, sets them against the real league (`NFL_CAREERS`, `NFL_DRAFT`) under
 * the plan's bands (`careerGrade.ts`), and writes `reports/career-check-pass<N>.md` and `.json`
 * (`--report <path>` writes `<path>.md` and `<path>.json` instead). `--seeds` and `--coach-seeds`
 * name other seeds; `--smoke` clips the judged years to the seasons played (a smoke run's report,
 * never a graded one). `--build <fingerprint>` grades the rows of that build's folder instead of
 * the build the tree makes now (the report says which build it graded, and the command warns when
 * it is not the tree's); the grader and this command are not part of the fingerprint, so a change
 * to them alone keeps the rows. `--old gate|report` records the owner's answer on the Old card (the
 * 34-and-over share and reaching ten seasons gate the flip, or are reported); without it those rows
 * block the flip unless they pass. When grade seeds are missing, the command lists the builds the
 * cache holds.
 *
 * Paths given on the command line are read from the folder the command was typed in.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CALLER_VERSION } from "../caller/anticipate.js";
import type { CapCheckInput } from "./capCheck.js";
import type { CareerCheckRows } from "./careerCheck.js";
import {
  CAREER_ENGINE_RULES, CAREER_SEED_SETS, careerFingerprint, isCareerArm, listCareerBuilds, readCareerRecords, runCareerSeed, seedOf,
  type CareerArm,
} from "./careerCheckRun.js";
import { gradeCareerCheck, renderGradeJson, renderGradeMarkdown, type GradeWindows } from "./careerGrade.js";
import { readStandInFile } from "./standInLeague.js";

interface Args {
  readonly league: string;
  readonly seasons: number;
  readonly grade: boolean;
  readonly pass?: 1 | 2;
  readonly seed?: string;
  readonly arm: CareerArm;
  readonly out?: string;
  readonly seeds?: string[];
  readonly coachSeeds?: string[];
  readonly report?: string;
  readonly smoke: boolean;
  readonly build?: string;
  readonly old?: "GATE" | "REPORT";
}

function parse(argv: readonly string[]): Args {
  let league: string | undefined, seed: string | undefined, set: string | undefined, index: number | undefined;
  let arm = "both", seasons = 20, grade = false, pass: number | undefined, out: string | undefined, report: string | undefined, smoke = false;
  let seeds: string[] | undefined, coachSeeds: string[] | undefined, build: string | undefined, old: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    if (arg === "--") continue;
    else if (arg === "--league") league = next();
    else if (arg === "--seed") seed = next();
    else if (arg === "--seed-set") set = next();
    else if (arg === "--index") index = Number(next());
    else if (arg === "--arm") arm = next();
    else if (arg === "--seasons") seasons = Number(next());
    else if (arg === "--out") out = next();
    else if (arg === "--grade") grade = true;
    else if (arg === "--pass") pass = Number(next());
    else if (arg === "--seeds") seeds = next().split(",").filter(Boolean);
    else if (arg === "--coach-seeds") coachSeeds = next().split(",").filter(Boolean);
    else if (arg === "--report") report = next();
    else if (arg === "--smoke") smoke = true;
    else if (arg === "--build") build = next();
    else if (arg === "--old") old = next();
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (league === undefined) throw new SyntaxError("--league <file> is required (the stand-in league)");
  if (!Number.isInteger(seasons) || seasons < 1) throw new SyntaxError("--seasons must be a whole number, 1 or more");
  if (!isCareerArm(arm)) throw new SyntaxError(`unknown arm ${arm}: both, development, incumbent or form`);
  if (grade) {
    if (pass !== 1 && pass !== 2) throw new SyntaxError("--grade needs --pass 1 or --pass 2");
    if (seed !== undefined || set !== undefined) throw new SyntaxError("--grade reads the grade seeds' rows; name others with --seeds a,b");
    if (build !== undefined && !/^[0-9a-f]{16}$/.test(build)) throw new SyntaxError("--build names a build's fingerprint: 16 hex digits");
    if (old !== undefined && old !== "gate" && old !== "report") throw new SyntaxError("--old is gate or report (the owner's answer on the Old card)");
    return {
      league, seasons, grade, pass, arm, smoke, ...(seeds ? { seeds } : {}), ...(coachSeeds ? { coachSeeds } : {}), ...(report ? { report } : {}),
      ...(build ? { build } : {}), ...(old ? { old: old === "gate" ? "GATE" as const : "REPORT" as const } : {}),
    };
  }
  if (build !== undefined || old !== undefined) throw new SyntaxError("--build and --old are for --grade");
  if (seed !== undefined && set !== undefined) throw new SyntaxError("give --seed or --seed-set with --index, not both");
  if (set !== undefined) {
    if (set !== "tune" && set !== "grade") throw new SyntaxError("--seed-set is tune or grade");
    if (index === undefined) throw new SyntaxError("--seed-set needs --index <n> (one seed a process)");
    seed = seedOf(set, index);
  }
  if (seed === undefined) throw new SyntaxError("give --seed <seed>, or --seed-set tune|grade --index <n>");
  return { league, seasons, grade, arm, seed, smoke, ...(out ? { out } : {}) };
}

const root = fileURLToPath(new URL("../..", import.meta.url));
const repoRoot = join(root, "..", "..");
const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);
const args = parse(process.argv.slice(2));
const leagueFull = fromCaller(args.league);
const leagueBytes = readFileSync(leagueFull);
const leagueSha = createHash("sha256").update(leagueBytes).digest("hex");
// As the records name it: from the repository's root, so the same file reads the same however it was typed.
const leaguePath = (() => { const rel = relative(repoRoot, leagueFull); return rel.startsWith("..") || isAbsolute(rel) ? basename(leagueFull) : rel; })();
const league = { path: leaguePath, sha256: leagueSha };
const callerVersion = DEFAULT_CALLER_VERSION;
const treeFingerprint = careerFingerprint({ repoRoot, leagueSha256: leagueSha, engineRules: CAREER_ENGINE_RULES, callerVersion }).fingerprint;
const cacheRoot = join(root, "data-cache", "career-check");
const cacheOf = (fingerprint: string) => join(cacheRoot, fingerprint);

if (!args.grade) {
  const file = readStandInFile(leagueBytes.toString("utf8")) as CapCheckInput["file"];
  const fingerprint = treeFingerprint;
  const cacheDir = cacheOf(fingerprint);
  console.log(`career-check: seed ${args.seed}, arm ${args.arm}, ${args.seasons} seasons from ${file.season}; build ${fingerprint}, cache ${cacheDir}`);
  const started = Date.now();
  const { record, from } = runCareerSeed({
    file, league, seed: args.seed!, arm: args.arm, seasons: args.seasons, cacheDir, fingerprint,
    onSeason: (season, seconds) => console.log(`  season ${season} done (${seconds.toFixed(0)} s)`),
  });
  const wall = (Date.now() - started) / 1000;
  console.log(from === "cache" ? "Read from the cache (already played)." : `${from === "resumed" ? "Carried on from a checkpoint; " : ""}played in ${wall.toFixed(0)} s.`);
  const y0 = record.rows.perSeason[0]?.week8;
  const last = record.rows.perSeason[record.rows.perSeason.length - 1];
  if (y0) console.log(`Year 0 (${record.firstSeason} week 8): mean overall ${y0.overall.mean.toFixed(2)}, pooled sd ${y0.overall.pooledSd.toFixed(2)}, mean age ${y0.age.mean.toFixed(2)}`);
  if (last?.week8) console.log(`${last.season} week 8: mean overall ${last.week8.overall.mean.toFixed(2)}, pooled sd ${last.week8.overall.pooledSd.toFixed(2)}, mean age ${last.week8.age.mean.toFixed(2)}, win spread ${last.winSpread.toFixed(2)}`);
  if (args.out) {
    const to = fromCaller(args.out);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, JSON.stringify(record));
    console.log(`Saved ${to}`);
  }
} else {
  const seeds = args.seeds ?? [...CAREER_SEED_SETS.grade];
  const coachSeeds = args.coachSeeds ?? [...CAREER_SEED_SETS.tune];
  const build = args.build ?? treeFingerprint;
  if (build !== treeFingerprint) console.log(`career-check: grading build ${build}, not the tree's build ${treeFingerprint} (the rows were played on that build).`);
  const fingerprints: Record<string, string> = build === treeFingerprint ? { build } : { build, tree: treeFingerprint };
  const rowsOf = (arm: CareerArm, list: readonly string[]) => {
    const { records } = readCareerRecords(cacheOf(build), arm, list, args.seasons);
    for (const [s, r] of records) {
      if (r.fingerprint !== build) throw new Error(`career-check: ${arm}-${s} in build ${build}'s folder says it was played on build ${r.fingerprint}`);
    }
    return new Map<string, CareerCheckRows>([...records].map(([s, r]) => [s, r.rows]));
  };
  const rows = rowsOf("both", seeds);
  let windows: GradeWindows | undefined;
  if (args.smoke) {
    const any = [...rows.values()][0];
    const first = any?.firstSeason ?? 2026;
    const lastSeason = first + args.seasons - 1;
    windows = { early: [first, lastSeason], late: [first, lastSeason] };
  }
  const grade = gradeCareerCheck({
    pass: args.pass!, seeds, rows,
    coach: { seeds: coachSeeds, incumbent: rowsOf("incumbent", coachSeeds), form: rowsOf("form", coachSeeds) },
    ...(windows ? { windows } : {}),
    ...(args.old ? { ownerAnswers: { Old: args.old } } : {}),
    meta: { seasons: args.seasons, league, fingerprints, engineRules: CAREER_ENGINE_RULES, callerVersion, ...(args.smoke ? { smoke: true } : {}) },
  });
  const base = args.report !== undefined ? fromCaller(args.report) : join(root, "reports", `career-check-pass${args.pass}`);
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(`${base}.md`, renderGradeMarkdown(grade));
  writeFileSync(`${base}.json`, renderGradeJson(grade));
  console.log(`Graded ${grade.seeds.graded.length} of ${seeds.length} seeds (${grade.coachSeeds.graded.length} of ${coachSeeds.length} coach-style); flip ${grade.flip.recommended ? "recommended" : "not recommended"}.`);
  for (const r of grade.flip.reasons.slice(0, 12)) console.log(`  - ${r}`);
  if (grade.seeds.missing.length > 0 || grade.coachSeeds.missing.length > 0) {
    const builds = listCareerBuilds(cacheRoot);
    console.log(builds.length === 0 ? "The cache holds no build's rows." : "Builds in the cache (finished rows by arm; grade one with --build <fingerprint>):");
    for (const b of builds) console.log(`  ${b.fingerprint}${b.fingerprint === treeFingerprint ? " (the tree's)" : ""}: ${Object.entries(b.rows).map(([a, n]) => `${a} ${n}`).join(", ") || "none"}`);
  }
  console.log(`Wrote ${base}.md and ${base}.json`);
}
