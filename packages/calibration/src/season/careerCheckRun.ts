/**
 * THE 20-SEASON CHECK, ONE SEED AT A TIME (ADR-087 §9, row D5b): the arms, the seed sets, the cache
 * and the checkpoint behind the `career-check` command (`careerCheckMain.ts`).
 *
 * One seed is one walk of the stand-in league (`runCareerCheck`), about 45-55 minutes for 20
 * seasons, so the command plays one seed per process and keeps what it played:
 *  - the finished rows at `data-cache/career-check/<fingerprint>/<arm>-<seed>-<seasons>.json`, so a
 *    seed is played once per build and the grader reads every seed's rows from there;
 *  - after each season, a checkpoint beside them (`...checkpoint.json`): the people the next season
 *    starts from and both readers' states. A seed stopped part-way (a killed process) carries on from
 *    its last finished season and gives the rows the unbroken walk gives. The checkpoint goes once
 *    the rows are written.
 *
 * The fingerprint covers what a seed's rows depend on: every workspace package's source
 * (`packages/<package>/src`, every file) except the few files of this check that the walk never
 * reaches (`CAREER_FINGERPRINT_LEAVES_OUT`: the grader, the command, the real-NFL side), the league
 * file's sha256, the engine rules (the walk plays `legacy`, the default; `runCapCheck` takes no
 * other), the caller version, and this check's own version. A change to any of them starts a fresh
 * cache; a change to the grader or the report does not, so finished rows can be graded again. The
 * arm and the seed are in each file's name, so one build's folder holds every arm. The grade can
 * also read an earlier build's folder by name (`career-check --grade --build <fingerprint>`).
 *
 * The arms (one walk each):
 *  - `both`: growth and aging, and injuries (the check itself);
 *  - `development`: growth and aging alone (a diagnostic);
 *  - `incumbent` and `form`: both switches, with every head coach's depth-chart leanings
 *    (`StaffState.lineup`, ADR-087 C1) set to stick with the incumbent, or to play who looks best
 *    this week, from the first season (the coach-style check).
 *
 * The people go to disk through a small codec (`encodeState`, `decodeState`): JSON with tags for
 * what JSON cannot say (a Set, a Map, an undefined property, NaN, an infinity, -0), so a checkpoint
 * comes back as the same objects. Anything else (a class instance, a function) is refused, not
 * guessed at.
 *
 * Two processes on the same seed (a seed launched again while it still runs) never share a
 * temporary file: each write goes to a name of its own (`<file>.<pid>.<thread>.<n>.tmp`) and is
 * renamed over, so a file on disk is always one writer's whole file.
 *
 * Library code: it reads and writes files, never starts a process.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { threadId } from "node:worker_threads";
import type { StaffState } from "@ff/contracts";
import { DEFAULT_CALLER_VERSION, type CallerVersion } from "../caller/anticipate.js";
import type { CapCheckInput } from "./capCheck.js";
import { runCareerCheck, type CareerCheckpoint, type CareerCheckRows, type CareerReaderState } from "./careerCheck.js";
import type { DraftReaderState } from "./draftCheck.js";
import type { SeasonPeople } from "./realSeason.js";

/** This check's own version: a change to what a record holds starts a fresh cache. */
export const CAREER_CHECK_VERSION = 3;

/** The engine rules the walk plays (`runCapCheck` plays the default, `legacy`). */
export const CAREER_ENGINE_RULES = "legacy";

// --- arms and seeds ------------------------------------------------------------------------------

export const CAREER_ARMS = ["both", "development", "incumbent", "form"] as const;
export type CareerArm = (typeof CAREER_ARMS)[number];
export const isCareerArm = (a: string): a is CareerArm => (CAREER_ARMS as readonly string[]).includes(a);

/** The coach-style arms' leanings for every head coach (0..100 each; the veteran leaning left at its middle). */
export const COACH_STYLE_LINEUPS: Readonly<Record<"incumbent" | "form", NonNullable<StaffState["lineup"]>>> = {
  incumbent: { incumbent: 100, veteran: 50, form: 0 },
  form: { incumbent: 0, veteran: 50, form: 100 },
};

/**
 * Is he a head coach: his role, or the job he holds now (the last on his résumé, not ended), says so.
 * Franchise reads a team's leanings from its sitting head coach (`teamLineup`); setting them on every
 * head coach covers him whichever way he is listed.
 */
const isHeadCoach = (s: StaffState): boolean => {
  const job = s.career[s.career.length - 1];
  return s.role === "HEAD_COACH" || (job !== undefined && job.role === "HEAD_COACH" && job.lastSeason === undefined && job.ended === undefined);
};

/** Every head coach given these leanings; everyone else as he was. */
export function withHeadCoachLineups(staff: readonly StaffState[], lineup: NonNullable<StaffState["lineup"]>): StaffState[] {
  return staff.map((s) => (isHeadCoach(s) ? { ...s, lineup: { ...lineup } } : s));
}

/** What an arm changes in the walk's input: the switches, and for the coach-style arms the staff. */
export function armInput(arm: CareerArm): Pick<CapCheckInput, "players" | "staffTransform"> {
  switch (arm) {
    case "both": return { players: { development: true, injuries: true } };
    case "development": return { players: { development: true, injuries: false } };
    case "incumbent":
    case "form": {
      const lineup = COACH_STYLE_LINEUPS[arm];
      return { players: { development: true, injuries: true }, staffTransform: (staff) => withHeadCoachLineups(staff, lineup) };
    }
  }
}

/** The seed sets (the D5b plan): four tuning seeds, twelve grade seeds. */
export const CAREER_SEED_SETS: Readonly<Record<"tune" | "grade", readonly string[]>> = {
  tune: Array.from({ length: 4 }, (_, i) => `d5b-t${i + 1}`),
  grade: Array.from({ length: 12 }, (_, i) => `d5b-g${i + 1}`),
};

/** The `index`-th seed (from 1) of a set. */
export function seedOf(set: "tune" | "grade", index: number): string {
  const seeds = CAREER_SEED_SETS[set];
  if (!Number.isInteger(index) || index < 1 || index > seeds.length) throw new RangeError(`--index for the ${set} set runs 1 to ${seeds.length}, not ${index}`);
  return seeds[index - 1]!;
}

/** A seed is part of a file name: letters, digits, dot, dash and underscore only. */
export function assertSeedName(seed: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(seed)) throw new SyntaxError(`a seed names a cache file: letters, digits, ".", "-" and "_" only, not ${JSON.stringify(seed)}`);
}

// --- the fingerprint -----------------------------------------------------------------------------

export interface CareerFingerprintInput {
  readonly repoRoot: string;
  readonly leagueSha256: string;
  readonly engineRules: string;
  readonly callerVersion: string;
}

/**
 * Source files the fingerprint leaves out, repository-relative: this check's grader and command,
 * and the real-NFL side of it (`careers/`, all but the usage and group pieces the reader shares).
 * None is reachable from the walk (`careerCheckRun.ts` and what it imports); a test reads the walk's
 * imports and holds this list to that, so a file the walk comes to import cannot stay left out.
 */
export const CAREER_FINGERPRINT_LEAVES_OUT: readonly string[] = [
  "packages/calibration/src/season/careerGrade.ts",
  "packages/calibration/src/season/careerCheckMain.ts",
  "packages/calibration/src/careers/baseline.ts",
  "packages/calibration/src/careers/data.ts",
  "packages/calibration/src/careers/main.ts",
  "packages/calibration/src/careers/measure.ts",
  "packages/calibration/src/careers/nflCareers.ts",
  "packages/calibration/src/careers/report.ts",
  "packages/calibration/src/careers/stats.ts",
  "packages/calibration/src/careers/wins.ts",
];

/** Every file under `dir`, repository-relative with "/", sorted. */
function filesUnder(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => statSync(join(dir, f)).isFile())
    .map((f) => f.split(sep).join("/"))
    .sort();
}

/**
 * The sha256 (first 16 hex digits) over every workspace package's source but the files left out
 * (`CAREER_FINGERPRINT_LEAVES_OUT`), each file framed as `path NUL length NUL bytes` in sorted
 * order, then the league file's sha256, the engine rules, the caller version and
 * `CAREER_CHECK_VERSION`, each framed the same way.
 */
export function careerFingerprint(input: CareerFingerprintInput): { fingerprint: string; files: number } {
  const hash = createHash("sha256");
  const add = (label: string, bytes: Buffer | string): void => {
    const b = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
    hash.update(label).update("\0").update(String(b.length)).update("\0").update(b);
  };
  const packages = join(input.repoRoot, "packages");
  const leftOut = new Set(CAREER_FINGERPRINT_LEAVES_OUT);
  let files = 0;
  for (const pkg of readdirSync(packages).sort()) {
    const src = join(packages, pkg, "src");
    if (!existsSync(src) || !statSync(src).isDirectory()) continue;
    for (const f of filesUnder(src)) {
      const path = `packages/${pkg}/src/${f}`;
      if (leftOut.has(path)) continue;
      add(path, readFileSync(join(src, f)));
      files++;
    }
  }
  if (files === 0) throw new Error(`career check's fingerprint: no package source under ${packages}`);
  add("league", input.leagueSha256);
  add("engineRules", input.engineRules);
  add("callerVersion", input.callerVersion);
  add("version", String(CAREER_CHECK_VERSION));
  return { fingerprint: hash.digest("hex").slice(0, 16), files };
}

/** Where one seed's rows and its checkpoint live in a fingerprint's cache folder. */
export function careerCachePaths(cacheDir: string, arm: CareerArm, seed: string, seasons: number): { rows: string; checkpoint: string } {
  assertSeedName(seed);
  const stem = `${arm}-${seed}-${seasons}`;
  return { rows: join(cacheDir, `${stem}.json`), checkpoint: join(cacheDir, `${stem}.checkpoint.json`) };
}

// --- the codec -----------------------------------------------------------------------------------

type Tagged = { $set: unknown[] } | { $map: [unknown, unknown][] } | { $undef: 1 } | { $num: string } | { $obj: Record<string, unknown> };
const TAGS = new Set(["$set", "$map", "$undef", "$num", "$obj"]);

const isPlain = (v: object): boolean => {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * A value as plain JSON, with tags for what JSON cannot say: a Set (`$set`), a Map (`$map`), an
 * undefined property or array item (`$undef`), NaN, an infinity or -0 (`$num`), and a plain object
 * whose only key would read as a tag (`$obj`). Anything that is not a plain object, an array, a Set,
 * a Map, a string, a number, a boolean, null or undefined is refused.
 */
export function encodeState(value: unknown, path = "$"): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (value === undefined) return { $undef: 1 } satisfies Tagged;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return { $num: "NaN" } satisfies Tagged;
    if (value === Infinity) return { $num: "Infinity" } satisfies Tagged;
    if (value === -Infinity) return { $num: "-Infinity" } satisfies Tagged;
    if (Object.is(value, -0)) return { $num: "-0" } satisfies Tagged;
    return value;
  }
  if (typeof value !== "object") throw new TypeError(`career check's codec: ${path} is a ${typeof value}, which a checkpoint cannot keep`);
  if (Array.isArray(value)) return value.map((v, i) => encodeState(v, `${path}[${i}]`));
  if (value instanceof Set) return { $set: [...value].map((v, i) => encodeState(v, `${path}<set ${i}>`)) } satisfies Tagged;
  if (value instanceof Map) return { $map: [...value].map(([k, v], i) => [encodeState(k, `${path}<key ${i}>`), encodeState(v, `${path}<value ${i}>`)]) } satisfies Tagged;
  if (!isPlain(value)) throw new TypeError(`career check's codec: ${path} is a ${value.constructor?.name ?? "class instance"}, which a checkpoint cannot keep`);
  const out: Record<string, unknown> = {};
  const keys = Object.keys(value);
  for (const k of keys) out[k] = encodeState((value as Record<string, unknown>)[k], `${path}.${k}`);
  return keys.length === 1 && TAGS.has(keys[0]!) ? ({ $obj: out } satisfies Tagged) : out;
}

/** `encodeState` undone. */
export function decodeState(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(decodeState);
  const keys = Object.keys(value);
  if (keys.length === 1 && TAGS.has(keys[0]!)) {
    const v = value as Record<string, unknown>;
    if ("$set" in v) return new Set((v.$set as unknown[]).map(decodeState));
    if ("$map" in v) return new Map((v.$map as [unknown, unknown][]).map(([k, x]) => [decodeState(k), decodeState(x)]));
    if ("$undef" in v) return undefined;
    if ("$num" in v) return v.$num === "NaN" ? NaN : v.$num === "Infinity" ? Infinity : v.$num === "-Infinity" ? -Infinity : -0;
    const inner = v.$obj as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(inner)) out[k] = decodeState(inner[k]);
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = decodeState((value as Record<string, unknown>)[k]);
  return out;
}

/**
 * Are two states the same objects: the same keys (an undefined property is not a missing one),
 * Sets and Maps with the same members in the same order, numbers by `Object.is`. The first
 * difference's path, or null.
 */
export function stateDifference(a: unknown, b: unknown, path = "$"): string | null {
  if (typeof a === "number" && typeof b === "number") return Object.is(a, b) ? null : path;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b ? null : path;
  if (Array.isArray(a) !== Array.isArray(b) || (a instanceof Set) !== (b instanceof Set) || (a instanceof Map) !== (b instanceof Map)) return path;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return `${path}.length`;
    for (let i = 0; i < a.length; i++) { const d = stateDifference(a[i], bb[i], `${path}[${i}]`); if (d !== null) return d; }
    return null;
  }
  if (a instanceof Set) return stateDifference([...a], [...(b as Set<unknown>)], `${path}<set>`);
  if (a instanceof Map) return stateDifference([...a], [...(b as Map<unknown, unknown>)], `${path}<map>`);
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return `${path}{keys}`;
  for (const k of ka) {
    const d = stateDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d !== null) return d;
  }
  return null;
}

// --- one seed ------------------------------------------------------------------------------------

/** One seed's finished rows as the cache keeps them, with how they were made. */
export interface CareerSeedRecord {
  readonly version: typeof CAREER_CHECK_VERSION;
  readonly seed: string;
  readonly arm: CareerArm;
  readonly seasons: number;
  readonly firstSeason: number;
  readonly fingerprint: string;
  readonly league: { readonly path: string; readonly sha256: string };
  readonly engineRules: string;
  readonly callerVersion: string;
  /** Real seconds each season took (a resumed seed's seasons before the checkpoint are the run's that took it). */
  readonly seconds: number[];
  /** The rows (no timing in them: a resumed seed's rows are the unbroken walk's). */
  readonly rows: CareerCheckRows;
}

/** A checkpoint as the cache keeps it. */
interface CheckpointFile {
  readonly version: typeof CAREER_CHECK_VERSION;
  readonly seed: string;
  readonly arm: CareerArm;
  readonly seasons: number;
  readonly fingerprint: string;
  readonly seasonsDone: number;
  readonly seconds: number[];
  readonly reader: CareerReaderState;
  readonly draft: DraftReaderState;
  /** `encodeState` of the people. */
  readonly people: unknown;
}

/** Thrown by the `stopAfter` test hook once its checkpoint is on disk: a stand-in for a killed process. */
export class CareerCheckStopped extends Error {
  constructor(readonly seasonsDone: number) {
    super(`career check stopped after ${seasonsDone} seasons (the stopAfter hook)`);
  }
}

export interface CareerSeedOptions {
  readonly file: CapCheckInput["file"];
  /** The league file as the record names it, and its sha256. */
  readonly league: { readonly path: string; readonly sha256: string };
  readonly seed: string;
  readonly arm: CareerArm;
  readonly seasons: number;
  /** The fingerprint's cache folder (`data-cache/career-check/<fingerprint>`). */
  readonly cacheDir: string;
  readonly fingerprint: string;
  readonly callerVersion?: CallerVersion;
  /** After each season played here, with its real seconds. */
  readonly onSeason?: (season: number, seconds: number) => void;
  /** Test hook: stop (throw `CareerCheckStopped`) once this many seasons are done and checkpointed. */
  readonly stopAfter?: number;
}

let tmpCount = 0;

/**
 * Write a file whole or not at all: to a temporary name beside it, then renamed over. The temporary
 * name is this writer's own (`<path>.<pid>.<thread>.<n>.tmp`), so two processes writing the same
 * file never write into one temporary file; the last rename wins with a whole file.
 */
export function writeWhole(path: string, text: string): void {
  const tmp = `${path}.${String(process.pid)}.${String(threadId)}.${String(tmpCount++)}.tmp`;
  try {
    writeFileSync(tmp, text);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

function readCheckpoint(path: string, o: CareerSeedOptions): CareerCheckpoint & { seconds: number[] } {
  const c = JSON.parse(readFileSync(path, "utf8")) as CheckpointFile;
  const mismatch = c.version !== CAREER_CHECK_VERSION ? "version" : c.seed !== o.seed ? "seed" : c.arm !== o.arm ? "arm"
    : c.seasons !== o.seasons ? "seasons" : c.fingerprint !== o.fingerprint ? "fingerprint" : undefined;
  if (mismatch !== undefined) throw new Error(`career check: the checkpoint ${path} is for another ${mismatch}; remove it to start the seed again`);
  return { seasonsDone: c.seasonsDone, people: decodeState(c.people) as SeasonPeople, reader: c.reader, draft: c.draft, seconds: [...c.seconds] };
}

/**
 * One seed's rows: read from the cache if they are there; else played, carrying on from a checkpoint
 * if one is there, a checkpoint written after every season, the rows written at the end and the
 * checkpoint removed. `from` says which.
 */
export function runCareerSeed(o: CareerSeedOptions): { record: CareerSeedRecord; from: "cache" | "run" | "resumed" } {
  if (!Number.isInteger(o.seasons) || o.seasons < 1) throw new RangeError(`seasons must be a whole number, 1 or more, not ${o.seasons}`);
  mkdirSync(o.cacheDir, { recursive: true });
  const paths = careerCachePaths(o.cacheDir, o.arm, o.seed, o.seasons);
  if (existsSync(paths.rows)) return { record: JSON.parse(readFileSync(paths.rows, "utf8")) as CareerSeedRecord, from: "cache" };
  const resume = existsSync(paths.checkpoint) ? readCheckpoint(paths.checkpoint, o) : undefined;
  const seconds: number[] = resume?.seconds ?? [];
  const callerVersion = o.callerVersion ?? DEFAULT_CALLER_VERSION;
  const rows = runCareerCheck({
    seed: o.seed, file: o.file, seasons: o.seasons,
    ...(o.callerVersion === undefined ? {} : { callerVersion: o.callerVersion }),
    ...armInput(o.arm),
    onYear: (y) => {
      seconds.push(y.seconds);
      o.onSeason?.(y.leagueYear - 1, y.seconds);
    },
  }, {
    ...(resume === undefined ? {} : { resume }),
    onCheckpoint: (cp) => {
      if (cp.seasonsDone < o.seasons) {
        const file: CheckpointFile = {
          version: CAREER_CHECK_VERSION, seed: o.seed, arm: o.arm, seasons: o.seasons, fingerprint: o.fingerprint,
          seasonsDone: cp.seasonsDone, seconds: [...seconds], reader: cp.reader, draft: cp.draft, people: encodeState(cp.people),
        };
        writeWhole(paths.checkpoint, JSON.stringify(file));
      }
      if (o.stopAfter !== undefined && cp.seasonsDone === o.stopAfter) throw new CareerCheckStopped(cp.seasonsDone);
    },
  });
  const record: CareerSeedRecord = {
    version: CAREER_CHECK_VERSION, seed: o.seed, arm: o.arm, seasons: o.seasons, firstSeason: o.file.season,
    fingerprint: o.fingerprint, league: o.league, engineRules: CAREER_ENGINE_RULES, callerVersion, seconds, rows,
  };
  writeWhole(paths.rows, JSON.stringify(record));
  rmSync(paths.checkpoint, { force: true });
  return { record, from: resume === undefined ? "run" : "resumed" };
}

/** The finished rows of these seeds in one arm, from the cache; the seeds with none are listed. */
export function readCareerRecords(cacheDir: string, arm: CareerArm, seeds: readonly string[], seasons: number): {
  records: Map<string, CareerSeedRecord>; missing: string[];
} {
  const records = new Map<string, CareerSeedRecord>();
  const missing: string[] = [];
  for (const seed of seeds) {
    const { rows } = careerCachePaths(cacheDir, arm, seed, seasons);
    if (existsSync(rows)) records.set(seed, JSON.parse(readFileSync(rows, "utf8")) as CareerSeedRecord);
    else missing.push(seed);
  }
  return { records, missing };
}

/** Each build's folder under the cache root (`data-cache/career-check`) and how many finished rows it holds, by arm. */
export function listCareerBuilds(cacheRoot: string): { fingerprint: string; rows: Record<string, number> }[] {
  if (!existsSync(cacheRoot)) return [];
  return readdirSync(cacheRoot).sort().filter((f) => /^[0-9a-f]{16}$/.test(f) && statSync(join(cacheRoot, f)).isDirectory()).map((fingerprint) => {
    const rows: Record<string, number> = {};
    for (const f of readdirSync(join(cacheRoot, fingerprint)).sort()) {
      const arm = CAREER_ARMS.find((a) => f.startsWith(`${a}-`) && f.endsWith(".json") && !f.endsWith(".checkpoint.json"));
      if (arm !== undefined) rows[arm] = (rows[arm] ?? 0) + 1;
    }
    return { fingerprint, rows };
  });
}
