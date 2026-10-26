/**
 * ADR-089 step 1 — THE HARNESS (`src/pocket/step1.ts`, `src/pocket/gitTree.ts`; plan §7.2 items 8
 * and 11).
 *
 *  - the filing's refusals: a pending s1.* field, a filing that is not the committed one;
 *  - the shard bookkeeping: every n-th arm from the i-th, any n, disjoint and complete;
 *  - the fingerprint, the stamp and its stale refusal, the temporary-file-and-rename write;
 *  - the tree's state read from git's own files (a scratch repository `git` makes here; the library
 *    never starts `git`);
 *  - one real arm on a cut corpus, deterministic, and the S-1 digests on one game a league;
 *  - the run through its `play` seam: shards that grade once every arm is cached and write the same
 *    bytes, the one-arm `--out`, the refusals (a stale cached arm, a committed report from a dirty
 *    tree or from arms stamped dirty);
 *  - grading on synthetic arm results (cut-corpus records, re-stamped and edited): a pass, a
 *    structural failure, a graded clause failure and a guard breach (K22's three kinds), a re-play;
 *  - **K14**: no file under `src/pocket` or `src/metrics` that folds a game reads `DEFAULT_TUNABLES`
 *    outside an import or a default parameter (a failing assertion over the source, not a list of
 *    files), and the arm's tunables reach the folds (the same game folds differently under Heels).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import { ARM_IDS, armById, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { flatBaseline, type SeedSet } from "../src/pocket/corpus.js";
import { loadFiled, STEP0_FILED_DIGEST, filedDigest, type FiledFile } from "../src/pocket/filed.js";
import { blobSha, headCommit, readIndex, treeState } from "../src/pocket/gitTree.js";
import { s1Problems } from "../src/pocket/s1Stream.js";
import { sanitize } from "../src/pocket/step0.js";
import {
  armFileOf,
  BASE_GROUPS,
  checkFilingForStep1,
  DIGEST_ARMS,
  emptyLeagueFolds,
  FINGERPRINT_MANIFESTS,
  FINGERPRINT_PACKAGES,
  foldStep1Game,
  gradeStep1,
  guardNoise,
  jsonText,
  planStep1,
  playArm,
  referenceOf,
  renderStep1Report,
  runDigests,
  runStep1,
  sourceFingerprint,
  stampOf,
  stampProblems,
  step1Env,
  STEP1_ARM_FORMAT,
  STEP1_DIGESTS_FORMAT,
  STEP1_MEASURES_FORMAT,
  writeAtomic,
  type ArmRecord,
  type Step1Corpus,
  type Step1Env,
} from "../src/pocket/step1.js";

const PKG = resolve(import.meta.dirname, "..");
/** A repo-relative source path, built from parts so the surface tests' text scans do not read it as a reach into another package. */
const srcPath = (pkg: string, file: string): string => ["packages", pkg, "src", file].join("/");
const FILED = join(PKG, FILED_PATH);
const TINY: Step1Corpus = { flatFirst: 1, genThroughWeek: 1 };
const ENV: Step1Env = { fingerprint: "0123456789abcdef", commit: "c".repeat(40), dirty: false, node: "v22.0.0-test" };

type W<T> = T extends readonly (infer U)[] ? W<U>[] : T extends object ? { -readonly [K in keyof T]: W<T[K]> } : T;
const clone = <T>(x: T): W<T> => structuredClone(x) as W<T>;

const scratch: string[] = [];
function tempDir(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ff-step1-${label}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

// --- the filing ----------------------------------------------------------------------------------

describe("the filing step 1 grades against", () => {
  const committed = (): FiledFile => loadFiled(FILED);

  it("is the committed filing, with no s1.* field pending", () => {
    const file = committed();
    expect(filedDigest(file)).toBe(STEP0_FILED_DIGEST);
    expect(() => checkFilingForStep1(file)).not.toThrow();
  });

  it("refuses a filing that differs by one character", () => {
    const file = clone(committed());
    const c = file.bands.clauses.find((x) => x.id === "s1.L8.flat.pressure")!;
    c.text = `${c.text} `;
    expect(() => checkFilingForStep1(file as unknown as FiledFile)).toThrow(/digests to fnv1a:[0-9a-f]{8}, not fnv1a:9a1c90e9/);
  });

  it("refuses a filing that leaves an s1.* clause or the M1 bound pending, naming the path", () => {
    const file = clone(committed());
    const i = file.bands.clauses.findIndex((x) => x.id === "s1.window.pressure");
    (file.bands.clauses[i] as unknown as Record<string, unknown>)["hi"] = { pending: "M1" };
    expect(() => checkFilingForStep1(file as unknown as FiledFile)).toThrow(new RegExp(`bands\\.clauses\\.${String(i)}\\.hi pending; every s1\\.\\* field must be filed first`));
    const m1 = clone(committed());
    (m1 as unknown as { m1Bound: Record<string, unknown> }).m1Bound["B1"] = { pending: "M1" };
    expect(() => checkFilingForStep1(m1 as unknown as FiledFile)).toThrow(/m1Bound\.B1 pending/);
  });

  it("does not run an arm when the filing is refused", () => {
    const dir = tempDir("filing");
    const file = clone(committed());
    file.bands.clauses[0]!.text = "changed";
    const path = join(dir, "filed.json");
    writeFileSync(path, jsonText(file));
    let plays = 0;
    expect(() =>
      runStep1({ filedPath: path, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: () => { plays += 1; throw new Error("played"); } }),
    ).toThrow(/digests to/);
    expect(plays).toBe(0);
    expect(existsSync(join(dir, "cache"))).toBe(false);
  });
});

// --- the shards ------------------------------------------------------------------------------------

describe("the shard bookkeeping", () => {
  it("takes every n-th arm from the i-th: 17 arms over 3 shards are 6, 6 and 5, disjoint and complete", () => {
    const all = planStep1({});
    expect(all.targets.map((t) => t.id)).toEqual([...ARM_IDS]);
    expect(all.complete).toEqual(all.targets);
    expect(all.targets.find((t) => t.id === "A15")?.seedSet).toBe(2);
    expect(all.targets.find((t) => t.id === "A0b")?.seedSet).toBe(2);
    const shards = [1, 2, 3].map((index) => planStep1({ shard: { index, count: 3 } }).mine.map((t) => t.id));
    expect(shards.map((s) => s.length)).toEqual([6, 6, 5]);
    expect(shards[0]).toEqual(["A0", "A3", "A6", "A9", "A12", "A15"]);
    expect(shards.flat().sort()).toEqual([...ARM_IDS].sort());
  });

  it("works for any n, an empty shard included", () => {
    for (const count of [1, 2, 4, 5, 16, 17, 20]) {
      const mine = Array.from({ length: count }, (_, k) => planStep1({ shard: { index: k + 1, count } }).mine.map((t) => t.id));
      expect(mine.flat().sort(), `n = ${String(count)}`).toEqual([...ARM_IDS].sort());
      expect(new Set(mine.flat()).size).toBe(ARM_IDS.length);
      expect(Math.max(...mine.map((m) => m.length)) - Math.min(...mine.map((m) => m.length))).toBeLessThanOrEqual(1);
    }
    expect(planStep1({ shard: { index: 20, count: 20 } }).mine).toEqual([]);
  });

  it("plays named arms in the table's order, and re-plays them on a named seed set", () => {
    const p = planStep1({ arms: ["A3", "A0"] });
    expect(p.targets).toEqual([{ id: "A0", seedSet: 1 }, { id: "A3", seedSet: 1 }]);
    expect(p.complete).toHaveLength(ARM_IDS.length);
    const r = planStep1({ arms: ["A1", "A0"], seedSet: 2 });
    expect(r.targets).toEqual([{ id: "A0", seedSet: 2 }, { id: "A1", seedSet: 2 }]);
    expect(r.complete).toEqual(r.targets);
    expect(r.replaySeedSet).toBe(2);
  });

  it("refuses a bad shard, an arm named twice and a seed set with no arms", () => {
    for (const shard of [{ index: 0, count: 3 }, { index: 4, count: 3 }, { index: 1, count: 0 }, { index: 1.5, count: 3 }]) {
      expect(() => planStep1({ shard }), JSON.stringify(shard)).toThrow(/--shard takes i\/n/);
    }
    expect(() => planStep1({ arms: ["A1", "A1"] })).toThrow(/names an arm twice/);
    expect(() => planStep1({ seedSet: 2 })).toThrow(/--seed-set re-plays named arms/);
  });
});

// --- the fingerprint, the stamp and the files --------------------------------------------------------

/** A repository-shaped folder: every fingerprinted package with one source file, and a filing. */
function fakeRepo(dir: string): { filed: string } {
  for (const pkg of FINGERPRINT_PACKAGES) {
    mkdirSync(join(dir, "packages", pkg, "src", "sub"), { recursive: true });
    writeFileSync(join(dir, "packages", pkg, "src", "index.ts"), `export const name = "${pkg}";\n`);
    writeFileSync(join(dir, "packages", pkg, "src", "sub", "deep.ts"), "export const deep = 1;\n");
  }
  for (const m of FINGERPRINT_MANIFESTS) writeFileSync(join(dir, m), `${m}\n`);
  const filed = join(dir, "packages", "calibration", "reports", "filed.json");
  mkdirSync(dirname(filed), { recursive: true });
  writeFileSync(filed, "{}\n");
  return { filed };
}

describe("the source fingerprint", () => {
  it("hashes every package's .ts sources (paths and bytes) and the filing, and nothing else", () => {
    const dir = tempDir("fp");
    const { filed } = fakeRepo(dir);
    const a = sourceFingerprint(dir, filed);
    expect(a.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(a.files).toHaveLength(FINGERPRINT_PACKAGES.length * 2 + FINGERPRINT_MANIFESTS.length + 1);
    expect(a.files).toContain(srcPath("engine", "sub/deep.ts"));
    expect(a.files.at(-1)).toBe("packages/calibration/reports/filed.json");
    expect(a.dirs).toEqual(FINGERPRINT_PACKAGES.map((p) => `packages/${p}/src`));
    expect(sourceFingerprint(dir, filed)).toEqual(a);

    writeFileSync(join(dir, "packages", "narrative", "src", "notes.md"), "not source\n");
    expect(sourceFingerprint(dir, filed).fingerprint, "a non-.ts file is not source").toBe(a.fingerprint);

    const changed: string[] = [];
    writeFileSync(join(dir, "packages", "playbook", "src", "index.ts"), 'export const name = "playbook!";\n');
    changed.push(sourceFingerprint(dir, filed).fingerprint);
    writeFileSync(join(dir, "packages", "playbook", "src", "index.ts"), 'export const name = "playbook";\n');
    expect(sourceFingerprint(dir, filed).fingerprint).toBe(a.fingerprint);
    writeFileSync(join(dir, "packages", "engine", "src", "sub", "new.ts"), "export {};\n");
    changed.push(sourceFingerprint(dir, filed).fingerprint);
    rmSync(join(dir, "packages", "engine", "src", "sub", "new.ts"));
    writeFileSync(filed, "{ }\n");
    changed.push(sourceFingerprint(dir, filed).fingerprint);
    expect(new Set([a.fingerprint, ...changed]).size).toBe(4);
  });

  it("frames each file by its path and length, so moving bytes from one file to the next is a change (review CT-9)", () => {
    // Unframed, "path\n" + bytes for each file read the same for these two trees.
    const one = tempDir("fp-frame-1");
    const two = tempDir("fp-frame-2");
    const a = fakeRepo(one);
    const b = fakeRepo(two);
    writeFileSync(join(one, "packages", "contracts", "src", "a.ts"), "x\ncontracts/b.ts\ny");
    writeFileSync(join(two, "packages", "contracts", "src", "a.ts"), "x\n");
    writeFileSync(join(two, "packages", "contracts", "src", "b.ts"), "y");
    expect(sourceFingerprint(one, a.filed).fingerprint).not.toBe(sourceFingerprint(two, b.filed).fingerprint);
  });

  it("hashes the lockfile and the manifests too, and refuses a tree without one (review CT-9)", () => {
    const dir = tempDir("fp-manifests");
    const { filed } = fakeRepo(dir);
    const a = sourceFingerprint(dir, filed);
    for (const m of FINGERPRINT_MANIFESTS) expect(a.files).toContain(m);
    for (const m of ["pnpm-lock.yaml", "packages/engine/package.json"]) {
      const path = join(dir, m);
      const before = readFileSync(path);
      writeFileSync(path, `${before.toString()}# a bump\n`);
      expect(sourceFingerprint(dir, filed).fingerprint, m).not.toBe(a.fingerprint);
      writeFileSync(path, before);
    }
    expect(sourceFingerprint(dir, filed).fingerprint).toBe(a.fingerprint);
    rmSync(join(dir, "pnpm-lock.yaml"));
    expect(() => sourceFingerprint(dir, filed)).toThrow(/no .*pnpm-lock\.yaml/);
  });

  it("refuses a tree without one of the packages", () => {
    const dir = tempDir("fp-missing");
    const { filed } = fakeRepo(dir);
    rmSync(join(dir, "packages", "narrative"), { recursive: true });
    expect(() => sourceFingerprint(dir, filed)).toThrow(/no .*packages\/narrative\/src/);
  });
});

describe("the stamp", () => {
  it("names the arm, the filing, the rules, the dials, the seeds, the corpus and the build, and no clock or host", () => {
    const s = stampOf("A1", 1, ENV, TINY);
    expect(Object.keys(s)).toEqual(["arm", "filedDigest", "amendments", "rules", "overlayDigest", "tunablesDigest", "patches", "seedSet", "caller", "corpus", "fingerprint", "commit", "dirty", "node"]);
    expect(s).toMatchObject({ arm: "A1", filedDigest: STEP0_FILED_DIGEST, amendments: "none", rules: "pocket-1.s1", seedSet: 1, caller: "v7", corpus: TINY });
    expect(Object.keys(stampOf("A0", 1, ENV))).not.toContain("overlayDigest");
    expect(stampOf("A9", 1, ENV).patches).toEqual(armById("A9").patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`));
  });

  it("finds a cached stamp stale on any field but the commit and the tree's state", () => {
    const want = stampOf("A3", 1, ENV, TINY);
    expect(stampProblems(want, want)).toEqual([]);
    expect(stampProblems({ ...want, commit: "d".repeat(40), dirty: true }, want)).toEqual([]);
    expect(stampProblems({ ...want, node: "v20.0.0" }, want)).toEqual([expect.stringMatching(/^node: cached "v20.0.0", this build "v22.0.0-test"$/)]);
    expect(stampProblems({ ...want, tunablesDigest: "fnv1a:00000000" }, want)[0]).toMatch(/^tunablesDigest:/);
    expect(stampProblems({ ...want, corpus: { flatFirst: null, genThroughWeek: null } }, want)[0]).toMatch(/^corpus:/);
    expect(stampProblems({ ...want, wallClockMs: 1 }, want)).toEqual(["wallClockMs: a field this build does not stamp"]);
    expect(stampProblems({ ...want, overlayDigest: "fnv1a:1" }, stampOf("A0", 1, ENV, TINY))).toContain("overlayDigest: cached on an arm this build does not stamp");
    expect(stampProblems(undefined, want)).toEqual(["the record carries no stamp"]);
  });

  it("compares each field whole, not through a 32-bit digest (review CT-9)", () => {
    // Two Node versions whose stableDigest is the same fnv1a:785faaff.
    const [cachedNode, thisNode] = ["v42.1xqod.11oz", "v0.eunli.1dyi"];
    expect(stableDigest(cachedNode)).toBe(stableDigest(thisNode));
    const want = { ...stampOf("A3", 1, ENV, TINY), node: thisNode };
    expect(stampProblems({ ...want, node: cachedNode }, want)).toEqual([`node: cached "${cachedNode}", this build "${thisNode}"`]);
    expect(stampProblems({ ...want, patches: [...want.patches] }, want)).toEqual([]);
  });
});

describe("the files", () => {
  it("writes through a temporary file and a rename, making the folder, leaving no temporary file of its own", () => {
    const dir = tempDir("atomic");
    const path = join(dir, "a", "b", "A1.set1.json");
    writeAtomic(path, "one\n");
    expect(readFileSync(path, "utf8")).toBe("one\n");
    expect(readdirSync(dirname(path))).toEqual(["A1.set1.json"]);
    // A killed run's temporary file is another writer's name (it could be a live writer's): it is
    // neither read nor replaced, and this write leaves none of its own beside it (review CT-1).
    const killed = "A1.set1.json.1.0.1.tmp";
    writeFileSync(join(dirname(path), killed), "a half-written file from a killed run");
    writeAtomic(path, "two\n");
    expect(readFileSync(path, "utf8")).toBe("two\n");
    expect(readdirSync(dirname(path)).sort()).toEqual(["A1.set1.json", killed]);
    expect(armFileOf("/c", "A0b", 2)).toBe(join("/c", "A0b.set2.json"));
    expect(jsonText({ b: 1, a: [1, 2] })).toBe('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}\n');
  });
});

// --- the tree's state from git's files ------------------------------------------------------------

function git(dir: string, ...args: string[]): string {
  const env = { ...process.env };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) delete env[key];
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main", ...args], {
    cwd: dir,
    encoding: "utf8",
    env,
  }).trim();
}

describe("the tree's state, read from the repository's files", () => {
  let dir: string;
  let fp: ReturnType<typeof sourceFingerprint>;
  beforeAll(() => {
    dir = tempDir("git");
    const { filed } = fakeRepo(dir);
    git(dir, "init", "-q");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "one");
    fp = sourceFingerprint(dir, filed);
  });

  it("reads HEAD's commit through a loose ref, packed-refs and a linked worktree", () => {
    const head = git(dir, "rev-parse", "HEAD");
    expect(headCommit(dir)).toBe(head);
    git(dir, "pack-refs", "--all");
    expect(existsSync(join(dir, ".git", "refs", "heads", "main"))).toBe(false);
    expect(headCommit(dir)).toBe(head);
    const wt = join(tempDir("worktree"), "wt");
    git(dir, "worktree", "add", "-q", "-b", "other", wt);
    expect(readFileSync(join(wt, ".git"), "utf8")).toMatch(/^gitdir: /);
    expect(headCommit(wt)).toBe(head);
    git(dir, "worktree", "remove", "--force", wt);
    expect(headCommit(tempDir("no-git"))).toBeUndefined();
  });

  it("reads the index (versions 2 and 3) and git's blob names", () => {
    const entries = readIndex(readFileSync(join(dir, ".git", "index")));
    expect(entries.map((e) => e.path)).toEqual(git(dir, "ls-files").split("\n"));
    const one = entries.find((e) => e.path === srcPath("engine", "index.ts"))!;
    expect(one.sha).toBe(git(dir, "rev-parse", `:${srcPath("engine", "index.ts")}`));
    expect(blobSha(readFileSync(join(dir, srcPath("engine", "index.ts"))))).toBe(one.sha);
    expect(() => readIndex(Buffer.from("not an index"))).toThrow(/not a git index/);
  });

  it("is clean as committed, and dirty for a changed, an untracked or a deleted source", () => {
    expect(treeState(dir, fp.files, fp.dirs)).toEqual({ commit: git(dir, "rev-parse", "HEAD"), dirty: false });
    const file = join(dir, "packages", "franchise", "src", "index.ts");
    const before = readFileSync(file);
    writeFileSync(file, "export const changed = true;\n");
    expect(treeState(dir, fp.files, fp.dirs)).toMatchObject({ dirty: true, reason: `${srcPath("franchise", "index.ts")} differs from the index` });
    writeFileSync(file, before);
    expect(treeState(dir, fp.files, fp.dirs).dirty).toBe(false);
    expect(treeState(dir, [...fp.files, srcPath("franchise", "untracked.ts")], fp.dirs)).toMatchObject({ dirty: true, reason: `${srcPath("franchise", "untracked.ts")} is not in the index` });
    expect(treeState(dir, fp.files.filter((f) => f !== srcPath("attributes", "sub/deep.ts")), fp.dirs)).toMatchObject({
      dirty: true,
      reason: `${srcPath("attributes", "sub/deep.ts")} is in the index and not in the tree`,
    });
  });

  it("does not see a change staged and not committed (the stated gap), and is dirty on an index it cannot read", () => {
    const file = join(dir, "packages", "contracts", "src", "index.ts");
    const before = readFileSync(file);
    writeFileSync(file, "export const staged = 1;\n");
    git(dir, "add", srcPath("contracts", "index.ts"));
    expect(treeState(dir, sourceFingerprint(dir, join(dir, "packages/calibration/reports/filed.json")).files, fp.dirs).dirty).toBe(false);
    writeFileSync(file, before);
    git(dir, "add", srcPath("contracts", "index.ts"));
    git(dir, "update-index", "--index-version", "4");
    expect(treeState(dir, fp.files, fp.dirs)).toMatchObject({ dirty: true, reason: "gitTree: index version 4 is not read here" });
    git(dir, "update-index", "--index-version", "2");
    expect(treeState(dir, fp.files, fp.dirs).dirty).toBe(false);
  });

  it("gives the step-1 stamp's build fields", () => {
    const env = step1Env(dir, join(dir, "packages/calibration/reports/filed.json"));
    expect(env).toEqual({ fingerprint: fp.fingerprint, commit: git(dir, "rev-parse", "HEAD"), dirty: false, node: process.version });
  });
});

// --- real arms on a cut corpus ---------------------------------------------------------------------

/** The cut-corpus records the synthetic arms are made from: one per clock. */
const TEMPLATE_IDS = ["A0", "A1", "A2", "A3", "A4"] as const;
const templates = new Map<ArmId, ArmRecord>();

const templateOf = (id: ArmId): ArmId => {
  const c = armById(id).clock;
  return c.kind === "LEGACY" ? "A0" : c.kind === "S" ? (c.window ? "A1" : "A2") : c.R === 5 ? "A3" : "A4";
};

/** An arm's synthetic record: its clock's cut-corpus record, re-stamped as the arm, the guard made A0's (so it passes as given). */
function synthetic(id: ArmId, seedSet: SeedSet = armById(id).seedSet, env: Step1Env = ENV, corpus: Step1Corpus = TINY): W<ArmRecord> {
  const r = clone(templates.get(templateOf(id))!);
  r.stamp = clone(stampOf(id, seedSet, env, corpus));
  r.report.intGuard = clone(templates.get("A0")!.report.intGuard);
  const ref = referenceOf(id);
  if (ref === undefined) {
    delete r.affected;
    delete r.report.affectedPlays;
  } else if (r.affected === undefined) {
    // A legacy-clock arm with a base (Heels or Past only alone) takes A1's counts as its own.
    const a1 = templates.get("A1")!;
    r.affected = { ...clone(a1.affected!), against: ref };
    r.report.affectedPlays = clone(a1.report.affectedPlays!);
  } else r.affected.against = ref;
  if (id !== "A0") delete r.baseRows;
  return r;
}

const recordsOf = (edit?: (m: Map<ArmId, W<ArmRecord>>) => void): ReadonlyMap<ArmId, ArmRecord> => {
  const m = new Map<ArmId, W<ArmRecord>>(ARM_IDS.map((id) => [id, synthetic(id)]));
  edit?.(m);
  return m as unknown as ReadonlyMap<ArmId, ArmRecord>;
};

describe("one arm on a cut corpus, and the digests", () => {
  beforeAll(() => {
    for (const id of TEMPLATE_IDS) templates.set(id, playArm(id, 1, ENV, { corpus: TINY }));
  }, 300_000);

  it("plays both leagues with the arm's own tunables, its folds clean, its record plain data", () => {
    for (const id of TEMPLATE_IDS) {
      const r = templates.get(id)!;
      expect(r.format).toBe(STEP1_ARM_FORMAT);
      expect(r.stamp).toEqual(stampOf(id, 1, ENV, TINY));
      expect({ flat: r.measures.flat.games, gen: r.measures.gen.games }).toEqual({ flat: 1, gen: 16 });
      expect(r.report.arm).toBe(id);
      for (const league of ["flat", "gen"] as const) expect(s1Problems(r.s1[league]), `${id} ${league}`).toEqual([]);
      expect(JSON.parse(jsonText(r))).toEqual(r);
      expect(r.measures.flat.dropbacks).toBeGreaterThan(20);
    }
    const a1 = templates.get("A1")!;
    expect(a1.s1.gen.windowTicks.windowOn).toBe(true);
    expect(a1.s1.gen.windowTicks.reps).toBeGreaterThan(0);
    expect(a1.s1.gen.beats.beats).toBeGreaterThan(0);
    expect(templates.get("A3")!.s1.gen.lToday.R).toEqual([5]);
    expect(templates.get("A2")!.m1?.gen.dropbacks).toBe(templates.get("A2")!.measures.gen.dropbacks);
    expect(templates.get("A0")!.baseRows).toBeDefined();
    expect(templates.get("A1")!.affected?.against).toBe("A0");
    expect(templates.get("A0")!.affected).toBeUndefined();
    expect(templates.get("A0")!.s1.flat.margins.ticks.LEGACY).toBeGreaterThan(0);
    expect(a1.s1.flat.margins.ticks.S).toBeGreaterThan(0);
  });

  it("is deterministic: the same arm twice is the same bytes", () => {
    expect(jsonText(playArm("A1", 1, ENV, { corpus: TINY }))).toBe(jsonText(templates.get("A1")!));
  }, 120_000);

  it("holds no clock, host or path field", () => {
    for (const r of templates.values()) {
      const text = jsonText(r);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
      expect(text).not.toContain(PKG);
      expect(text).not.toContain(tmpdir());
      const keys: string[] = [];
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
      };
      walk(r);
      expect(keys.filter((k) => /wall|elapsed|millis|started|host|cwd|path|date/i.test(k) || /^ms$|[a-z]Ms$/.test(k))).toEqual([]);
    }
  });

  it("writes S-1's digests: A1 to A4, both leagues, counts and folds, no timing", () => {
    const d = runDigests({ node: "v-test", first: 1 });
    expect(d.format).toBe(STEP1_DIGESTS_FORMAT);
    expect(d.gamesPerLeague).toBe(1);
    expect(Object.keys(d.arms)).toEqual([...DIGEST_ARMS]);
    for (const id of DIGEST_ARMS) {
      expect(d.arms[id]!.stamp).toEqual({ arm: id, rules: "pocket-1.s1", overlayDigest: armById(id).overlayDigest, tunablesDigest: armById(id).tunablesDigest, patches: [] });
      for (const league of ["flat", "gen"]) {
        const l = d.arms[id]!.leagues[league]!;
        expect(l.games).toBe(1);
        expect(l.events).toBeGreaterThan(1000);
        expect(l.canonicalFold).toMatch(/^fnv1a:[0-9a-f]{8}$/);
      }
    }
    expect(new Set(DIGEST_ARMS.map((id) => d.arms[id]!.leagues["flat"]!.canonicalFold)).size).toBe(4);
    expect(jsonText(d)).not.toMatch(/"(ms|elapsed|wallClock\w*|started\w*)"/);
  }, 120_000);

  // --- K14, behaviourally: the arm's tunables reach the folds ----------------------------------------

  it("K14: the same game folds differently under Heels than under the default (the arm's tunables are read)", () => {
    const heels = armById("A9");
    let games = 0;
    let differ = 0;
    flatBaseline(1, (o, snapshot) => {
      const mine = emptyLeagueFolds("A9", undefined);
      const def = emptyLeagueFolds("A9", undefined);
      foldStep1Game(mine, o, snapshot, heels.tunables, []);
      foldStep1Game(def, o, snapshot, DEFAULT_TUNABLES, []);
      games += 1;
      if (stableDigest(sanitize(mine)) !== stableDigest(sanitize(def))) differ += 1;
    }, { tunables: heels.tunables, callerVersion: "v7", first: 2 });
    expect(games).toBe(2);
    expect(differ).toBe(2);
  }, 120_000);

  // --- grading ---------------------------------------------------------------------------------------

  describe("grading synthetic arm results", () => {
    const file = (): FiledFile => loadFiled(FILED);
    const clause = (g: ReturnType<typeof gradeStep1>, id: string) => g.sections.clauses.find((c) => c.id === id)!;

    it("as given: every structural proof passes, no guard breach, a merge card may be posted", () => {
      const g = gradeStep1(recordsOf(), file());
      expect(g.sections.structural.map((p) => [p.id, p.verdict])).toEqual([
        ["s1.window.ticks", "PASS"], ["s1.window.noDie", "PASS"], ["s1.falsifier.lToday", "PASS"], ["S-4", "PASS"], ["S-7", "PASS"], ["S-8", "PASS"], ["s1.falsifier.offBytes", "NOT CHECKED"],
      ]);
      expect(g.sections.structural.at(-1)!.detail).toMatch(/^NOT CHECKED: A0 played a cut corpus/);
      expect(clause(g, "s1.falsifier.offBytes").verdict).toBe("NOT CHECKED");
      expect(g.sections.outcome.structuralFailures).toEqual([]);
      expect(g.sections.outcome.guardBreaches).toEqual([]);
      expect(g.sections.outcome.mergeCard).toBe(true);
      expect(g.sections.guard).toHaveLength(14 * 2);
      expect(clause(g, "guard.mix").verdict).toBe("PASS");
      expect(clause(g, "guard.byClass").verdict).toBe("PASS");
      expect(g.groups.map((x) => x.arms.map((a) => a.arm))).toEqual([
        ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"],
        ["A14 (pricing arm, never a design value)", "A11 (pricing arm, never a design value)", "A12 (pricing arm, never a design value)", "A13 (pricing arm, never a design value)"],
        ["A0b (pricing arm, never a design value)", "A15 (context only; pricing arm, never a design value)"],
      ]);
      expect(g.groups.map((x) => x.arms.filter((a) => a.isBase).length)).toEqual([1, 1, 1]);
      expect(BASE_GROUPS.flatMap((x) => [x.base, ...x.arms]).sort()).toEqual([...ARM_IDS].sort());
      expect(g.sections.interaction.map((x) => x.formula)).toEqual(["A5 - (A4 + A9 - A0)", "A5 - (A4 + A9 - A0)", "A6 - (A4 + A10 - A0)", "A6 - (A4 + A10 - A0)", "A7 - (A3 + A9 - A0)", "A7 - (A3 + A9 - A0)", "A8 - (A3 + A10 - A0)", "A8 - (A3 + A10 - A0)"]);
      expect(g.sections.pkAInteraction).toBe(-25.3);
    });

    it("a graded clause outside its band is a graded failure, reported as filed; the merge card is not held", () => {
      const inBand = gradeStep1(recordsOf((m) => { m.get("A4")!.measures.flat.pressure = 36.5; }), file());
      expect(clause(inBand, "s1.L8.flat.pressure")).toMatchObject({ verdict: "PASS", filed: "33.5 to 39.5", values: ["A4 flat 36.50 %"] });
      const out = gradeStep1(recordsOf((m) => { m.get("A4")!.measures.flat.pressure = 99; }), file());
      expect(clause(out, "s1.L8.flat.pressure").verdict).toBe("FAIL");
      expect(out.sections.outcome.gradedFailures).toContain("s1.L8.flat.pressure (33.5 to 39.5): A4 flat 99.00 %");
      expect(out.sections.outcome.mergeCard).toBe(true);
      const row = out.sections.headline.find((h) => h.arm === "A4" && h.league === "flat")!;
      expect(row.verdicts.pressure).toMatch(/L8\.flat\.pressure 33\.5 to 39\.5: FAIL/);
      const window = gradeStep1(recordsOf((m) => {
        m.get("A1")!.measures.gen.pressure = 30.5;
        m.get("A2")!.measures.gen.pressure = 30;
      }), file());
      expect(clause(window, "s1.window.pressure").verdict).toBe("FAIL");
      expect(clause(window, "s1.window.pressure").values).toContain("A1 gen 0.50 points (A1 - A2)");
    });

    it("a structural proof that fails is a structural failure, and holds the merge card", () => {
      const g = gradeStep1(recordsOf((m) => { m.get("A1")!.s1.flat.margins.problemCount = 1; }), file());
      expect(g.sections.structural.find((p) => p.id === "S-4")).toMatchObject({ verdict: "FAIL", detail: expect.stringMatching(/failures A1 flat$/) });
      expect(g.sections.outcome.structuralFailures).toEqual([expect.stringMatching(/^S-4: /)]);
      expect(g.sections.outcome.mergeCard).toBe(false);
      const w = gradeStep1(recordsOf((m) => { m.get("A2")!.s1.gen.windowTicks.played.gaining = 1; }), file());
      expect(clause(w, "s1.window.ticks").verdict).toBe("FAIL");
      expect(w.sections.outcome.mergeCard).toBe(false);
      const off = gradeStep1(recordsOf((m) => {
        const a0 = m.get("A0")!;
        a0.stamp.corpus = { flatFirst: null, genThroughWeek: null };
      }), file());
      expect(off.sections.structural.find((p) => p.id === "s1.falsifier.offBytes")!.verdict).toBe("FAIL");
    });

    it("a guard breach stops the step and names the re-play on the other seed set", () => {
      const g = gradeStep1(recordsOf((m) => { m.get("A1")!.report.intGuard.flat.all.interceptions += 1000; }), file());
      expect(clause(g, "guard.mix").verdict).toBe("FAIL");
      expect(g.sections.outcome.guardBreaches).toEqual([expect.stringMatching(/^A1 against A0, flat: league-wide rise \d+\.\d\d > allowed -?\d+\.\d\d$/)]);
      expect(g.sections.outcome.next).toEqual([expect.stringContaining("pnpm --filter @ff/calibration pocket -- --step 1 --arms A1,A0 --seed-set 2")]);
      expect(g.sections.outcome.mergeCard).toBe(false);
      const pricing = gradeStep1(recordsOf((m) => { m.get("A15")!.report.intGuard.gen.all.interceptions += 1000; }), file());
      expect(pricing.sections.outcome.next).toEqual([expect.stringContaining("--arms A15,A0b --seed-set 1")]);
    });

    it("prints each guard verdict with its binomial SE and z, league-wide and by class; the verdict is the filed rule (review M2)", () => {
      // 20 of 1000 aimed against 30 of 1000: SE = 100 * sqrt(0.02 * 0.98 / 1000 + 0.03 * 0.97 / 1000).
      const base = { aimedByBin: [400, 300, 200, 100], interceptions: 20 };
      const arm = { aimedByBin: [400, 300, 200, 100], interceptions: 30 };
      const n = guardNoise(base, arm, { baseRate: 2, armRate: 3, rise: 1, allowed: 0.3, passes: false });
      expect(n.se).toBeCloseTo(0.697854, 5);
      expect(n.z).toBeCloseTo(0.7 / 0.697854, 5);
      expect(guardNoise({ aimedByBin: [10, 0, 0, 0], interceptions: 0 }, { aimedByBin: [10, 0, 0, 0], interceptions: 0 }, { baseRate: 0, armRate: 0, rise: 0, allowed: 0, passes: true })).toEqual({ se: 0, z: null });
      const g = gradeStep1(recordsOf((m) => {
        const all = m.get("A1")!.report.intGuard.flat.all;
        all.interceptions = Math.min(all.aimedByBin.reduce((a, b) => a + b, 0), all.interceptions + 5);
      }), file());
      const row = g.sections.guard.find((r) => r.arm === "A1" && r.league === "flat")!;
      expect(row.mix.passes).toBe(false);
      expect(row.mixNoise.se).toBeGreaterThan(0);
      expect(row.mixNoise.z).toBeCloseTo((row.mix.rise - row.mix.allowed) / row.mixNoise.se, 9);
      expect(row.byClass.scored.length).toBeGreaterThan(0);
      for (const c of row.byClass.scored) expect(c.z === null || Number.isFinite(c.z)).toBe(true);
      const text = renderStep1Report(g, recordsOf());
      expect(text).toMatch(/- A1 against A0, flat: league-wide rise \d+\.\d\d against an allowed -?\d+\.\d\d \(SE \d+\.\d\d, z [+-]\d+\.\d\d\): BREACH; by class: /);
      expect(text).toMatch(/\n  - by class \(rise \/ allowed \/ SE \/ z\): [A-Z_]+ -?\d+\.\d\d \/ -?\d+\.\d\d \/ \d+\.\d\d \/ (?:[+-]\d+\.\d\d|n\/a) (?:PASSES|BREACH)/);
      expect(text).toContain("SE is binomial, the two arms read as independent");
    });

    it("a re-play on the other seed set grades the guard only, and never posts the merge card", () => {
      const m = new Map<ArmId, W<ArmRecord>>([["A0", synthetic("A0", 2)], ["A1", synthetic("A1", 2)]]);
      // A0 re-played on the full corpus of seed set 2: the filed base rows are seed set 1's (review M1).
      m.get("A0")!.stamp.corpus = { flatFirst: null, genThroughWeek: null };
      const g = gradeStep1(m as unknown as ReadonlyMap<ArmId, ArmRecord>, file(), 2);
      expect(g.sections.replaySeedSet).toBe(2);
      expect(g.sections.clauses.every((c) => c.id.startsWith("guard."))).toBe(true);
      expect(g.sections.outcome.mergeCard).toBe(false);
      expect(g.sections.outcome.structuralFailures).toEqual([]);
      expect(Object.fromEntries(g.sections.structural.map((p) => [p.id, p.verdict]))).toMatchObject({
        "s1.window.ticks": "PASS", "s1.falsifier.lToday": "NOT APPLICABLE", "s1.falsifier.offBytes": "NOT CHECKED", "S-4": "PASS", "S-7": "PASS", "S-8": "PASS",
      });
      expect(g.sections.structural.find((p) => p.id === "s1.falsifier.offBytes")!.detail).toMatch(/^NOT CHECKED: A0 played seed set 2; the filed base rows are seed set 1's/);
      expect(g.sections.outcome.next).toEqual([expect.stringMatching(/^this is a re-play on seed set 2: /)]);
      // A breach on the re-play goes to the owner; it names no third re-play (review M1).
      m.get("A1")!.report.intGuard.flat.all.interceptions += 1000;
      const breach = gradeStep1(m as unknown as ReadonlyMap<ArmId, ArmRecord>, file(), 2);
      expect(breach.sections.outcome.guardBreaches).toHaveLength(1);
      expect(breach.sections.outcome.next[0]).toMatch(/^A1 against A0 breaches on seed set 2 too: the breach holds on both seed sets and goes to the owner/);
      expect(breach.sections.outcome.next.join("\n")).not.toMatch(/--seed-set/);
      expect(renderStep1Report(breach, m as unknown as ReadonlyMap<ArmId, ArmRecord>)).not.toMatch(/STRUCTURAL \(a build fault/);
      const mixed = new Map<ArmId, W<ArmRecord>>([["A0", synthetic("A0", 1)], ["A1", synthetic("A1", 2)]]);
      expect(() => gradeStep1(mixed as unknown as ReadonlyMap<ArmId, ArmRecord>, file())).toThrow(/same seeds/);
    });

    it("a partial run grades what it played: an absent proof is not applicable, an absent clause not played, and the headline notes only full clauses (review M1, M5)", () => {
      const partial = (keep: readonly ArmId[]) => recordsOf((m) => { for (const id of ARM_IDS) if (!keep.includes(id)) m.delete(id); });
      const g = gradeStep1(partial(["A0", "A1", "A4"]), file());
      expect(g.sections.outcome.structuralFailures).toEqual([]);
      expect(clause(g, "s1.falsifier.lToday").verdict).toBe("NOT APPLICABLE");
      expect(clause(g, "s1.window.pressure")).toMatchObject({ verdict: "NOT PLAYED", arms: ["A1", "A2"] });
      expect(clause(g, "s1.window.sack").verdict).toBe("NOT PLAYED");
      expect(g.sections.outcome.gradedFailures.filter((f) => f.startsWith("s1.window."))).toEqual([]);
      expect(clause(g, "s1.falsifier.pressure45").verdict).toBe("NOT PLAYED");
      const a4 = g.sections.headline.find((h) => h.arm === "A4" && h.league === "flat")!;
      expect(a4.verdicts.pressure).toMatch(/L8\.flat\.pressure/);
      expect(a4.verdicts.pressure).not.toMatch(/pressure45/);
      const noWindow = gradeStep1(partial(["A0", "A2", "A3"]), file());
      expect(clause(noWindow, "s1.window.ticks").verdict).toBe("NOT APPLICABLE");
      expect(noWindow.sections.outcome.structuralFailures).toEqual([]);
      const nan = gradeStep1(recordsOf((m) => { (m.get("A1")!.measures.flat as { timeToThrow: number | null }).timeToThrow = null; }), file());
      const text = renderStep1Report(nan, recordsOf());
      expect(text).not.toContain("NaN");
      expect(text).toMatch(/\| A1 \| flat \| .* \| n\/a \|/);
    });

    it("is deterministic, and its report prints every group, the pricing labels and P2S against both references", () => {
      const records = recordsOf();
      const a = gradeStep1(records, file());
      expect(stableDigest(sanitize(a))).toBe(stableDigest(sanitize(gradeStep1(recordsOf(), file()))));
      const text = renderStep1Report(a, records);
      expect(renderStep1Report(gradeStep1(recordsOf(), file()), recordsOf())).toBe(text);
      expect(text.split("\n").filter((l) => l === "```text")).toHaveLength(3);
      expect(text).toContain("## The step reports, one per base group");
      expect(text).toContain("A11 (pricing arm, never a design value)");
      expect(text).toContain("A15 (context only; pricing arm, never a design value)");
      expect(text).toContain("22.02");
      expect(text).toContain("15.46");
      expect(text).toContain("CUT: flat first 1, gen through week 1; tests only");
      expect(text).not.toContain(PKG);
    });
  });

  // --- the run, through its play seam ---------------------------------------------------------------

  describe("the run", () => {
    const seam = (calls: string[]) => (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: { corpus?: Step1Corpus }): ArmRecord => {
      calls.push(`${id}.set${String(seedSet)}`);
      return synthetic(id, seedSet, env, opts.corpus ?? TINY) as unknown as ArmRecord;
    };

    it("plays a shard at a time, grades once every arm is cached, and two finishing invocations write the same bytes", () => {
      const dir = tempDir("run");
      const calls: string[] = [];
      const common = { filedPath: FILED, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: seam(calls) };
      const report = join(dir, "out", "step1.md");
      const out = join(dir, "out", "step1.json");
      const r1 = runStep1({ ...common, shard: { index: 1, count: 3 }, report, out });
      expect(r1).toMatchObject({ graded: false, wrote: [], cached: [] });
      expect(r1.played).toHaveLength(6);
      expect(r1.remaining).toHaveLength(11);
      expect(r1.cacheDir).toBe(join(dir, "cache", ENV.fingerprint));
      expect(existsSync(report) || existsSync(out)).toBe(false);
      const r2 = runStep1({ ...common, shard: { index: 2, count: 3 }, report, out });
      expect(r2.played).toHaveLength(6);
      expect(r2.graded).toBe(false);
      const r3 = runStep1({ ...common, shard: { index: 3, count: 3 }, report, out });
      expect(r3.played).toHaveLength(5);
      expect(r3).toMatchObject({ graded: true, remaining: [], wrote: [report, out] });
      expect(calls.sort()).toEqual(ARM_IDS.map((id) => `${id}.set${String(armById(id).seedSet)}`).sort());
      expect(readdirSync(r3.cacheDir).sort()).toEqual(ARM_IDS.map((id) => `${id}.set${String(armById(id).seedSet)}.json`).sort());
      const bytes = { report: readFileSync(report, "utf8"), out: readFileSync(out, "utf8") };
      const measures = JSON.parse(bytes.out) as { format: string; filedDigest: string; fingerprint: string; arms: Record<string, unknown> };
      expect(measures.format).toBe(STEP1_MEASURES_FORMAT);
      expect(measures.filedDigest).toBe(STEP0_FILED_DIGEST);
      expect(Object.keys(measures.arms)).toEqual([...ARM_IDS]);
      expect(bytes.out).not.toContain(dir);
      expect(bytes.report).not.toContain(dir);

      const again = runStep1({ ...common, shard: { index: 1, count: 3 }, report, out });
      expect(again).toMatchObject({ graded: true, played: [] });
      expect(again.cached).toHaveLength(6);
      expect(readFileSync(report, "utf8")).toBe(bytes.report);
      expect(readFileSync(out, "utf8")).toBe(bytes.out);
      expect(calls).toHaveLength(ARM_IDS.length);
    });

    it("writes one named arm's record to --out, byte for byte its cache file, while the set is incomplete", () => {
      const dir = tempDir("one");
      const out = join(dir, "A3.json");
      const r = runStep1({ filedPath: FILED, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: seam([]), arms: ["A3"], out });
      expect(r).toMatchObject({ graded: false, played: ["A3.set1"], wrote: [out] });
      expect(readFileSync(out, "utf8")).toBe(readFileSync(armFileOf(r.cacheDir, "A3", 1), "utf8"));
      const two = runStep1({ filedPath: FILED, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: seam([]), arms: ["A3", "A4"], out: join(dir, "two.json") });
      expect(two.wrote).toEqual([]);
    });

    it("writes one named arm's record to --out once every arm is cached too, and grades the --report as before (review CT-4)", () => {
      const dir = tempDir("one-full");
      const common = { filedPath: FILED, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: seam([]) };
      const fullReport = join(dir, "full.md");
      const full = runStep1({ ...common, report: fullReport });
      expect(full).toMatchObject({ graded: true, remaining: [], wrote: [fullReport] });
      const out = join(dir, "A3.json");
      const report = join(dir, "step1.md");
      const one = runStep1({ ...common, arms: ["A3"], out, report });
      expect(one).toMatchObject({ graded: true, played: [], cached: ["A3.set1"] });
      expect(one.wrote.slice().sort()).toEqual([out, report].sort());
      expect(readFileSync(out, "utf8")).toBe(readFileSync(armFileOf(one.cacheDir, "A3", 1), "utf8"));
      expect(readFileSync(report, "utf8")).toBe(readFileSync(fullReport, "utf8"));
    });

    it("refuses a cached arm whose stamp is not this build's", () => {
      const dir = tempDir("stale");
      const calls: string[] = [];
      const common = { filedPath: FILED, cacheParent: join(dir, "cache"), corpus: TINY, play: seam(calls), arms: ["A1"] as ArmId[] };
      runStep1({ ...common, env: ENV });
      expect(() => runStep1({ ...common, env: { ...ENV, node: "v99.0.0" } })).toThrow(/the cached A1 \(set 1\) at .* is not this build's arm: node: cached "v22\.0\.0-test", this build "v99\.0\.0"\. Delete it, or use another --cache/);
      expect(() => runStep1({ ...common, env: ENV, corpus: { flatFirst: 2, genThroughWeek: 1 } })).toThrow(/corpus: cached/);
      expect(calls).toEqual(["A1.set1"]);
      const notRecord = armFileOf(join(dir, "cache", ENV.fingerprint), "A2", 1);
      writeFileSync(notRecord, '{"format":"something else"}\n');
      expect(() => runStep1({ ...common, env: ENV, arms: ["A2"] })).toThrow(/not a step-1 arm record/);
    });

    it("refuses a committed report from a dirty tree before playing, and from arms stamped dirty when grading", () => {
      const dir = tempDir("committed");
      const committedDir = join(dir, "reports");
      const calls: string[] = [];
      const common = { filedPath: FILED, cacheParent: join(dir, "cache"), corpus: TINY, play: seam(calls), committedDir };
      expect(() => runStep1({ ...common, env: { ...ENV, dirty: true }, report: join(committedDir, "adr-089-step1.md") })).toThrow(/a committed report \(under reports\/\) is made from a clean tree/);
      expect(() => runStep1({ ...common, env: { ...ENV, dirty: true }, out: join(committedDir, "sub", "m.json") })).toThrow(/made from a clean tree/);
      expect(calls).toEqual([]);
      const elsewhere = runStep1({ ...common, env: { ...ENV, dirty: true }, report: join(dir, "reportsx", "r.md") });
      expect(elsewhere.graded).toBe(true);
      expect(() => runStep1({ ...common, env: ENV, report: join(committedDir, "adr-089-step1.md") })).toThrow(/refused to grade a committed report: A0 was played on a dirty tree/);
      expect(existsSync(committedDir)).toBe(false);
    });

    it("sees a committed report through a symlink, to the folder or to a parent of it (review CT-11)", () => {
      const dir = tempDir("committed-link");
      const committedDir = join(dir, "pkg", "reports");
      mkdirSync(committedDir, { recursive: true });
      symlinkSync(committedDir, join(dir, "to-reports"));
      symlinkSync(join(dir, "pkg"), join(dir, "to-pkg"));
      const calls: string[] = [];
      const common = { filedPath: FILED, cacheParent: join(dir, "cache"), corpus: TINY, play: seam(calls), committedDir, env: { ...ENV, dirty: true } };
      for (const report of [join(dir, "to-reports", "adr-089-step1.md"), join(dir, "to-pkg", "reports", "new", "adr-089-step1.md")]) {
        expect(() => runStep1({ ...common, report }), report).toThrow(/a committed report \(under reports\/\) is made from a clean tree/);
      }
      expect(() => runStep1({ ...common, committedDir: join(dir, "to-reports"), out: join(committedDir, "m.json") })).toThrow(/made from a clean tree/);
      expect(calls).toEqual([]);
      expect(readdirSync(committedDir)).toEqual([]);
    });
  });
});

// --- K14, over the source -------------------------------------------------------------------------------

/** The source with every comment and the contents of every string, template and regex literal blanked (newlines kept). */
function codeOnly(src: string): string {
  const out = src.split("");
  const n = src.length;
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to && k < n; k += 1) if (out[k] !== "\n") out[k] = " ";
  };
  const templateExprDepth: number[] = [];
  let depth = 0;
  let last = "";
  const REGEX_AFTER_WORD = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await", "instanceof"]);
  const regexAllowed = (): boolean => last === "" || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(last) || REGEX_AFTER_WORD.has(last);
  let i = 0;
  const template = (start: number): number => {
    let j = start;
    while (j < n) {
      if (src[j] === "\\") { j += 2; continue; }
      if (src[j] === "`") { blank(start, j); last = "`"; return j + 1; }
      if (src[j] === "$" && src[j + 1] === "{") { blank(start, j); templateExprDepth.push(depth); last = "{"; return j + 2; }
      j += 1;
    }
    blank(start, n);
    return n;
  };
  while (i < n) {
    const c = src[i] as string;
    const d = src[i + 1];
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); const end = e < 0 ? n : e; blank(i, end); i = end; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      blank(i + 1, j);
      i = j + 1;
      last = c;
      continue;
    }
    if (c === "`") { i = template(i + 1); continue; }
    if (c === "}" && templateExprDepth.length > 0 && depth === templateExprDepth[templateExprDepth.length - 1]) { templateExprDepth.pop(); i = template(i + 1); continue; }
    if (c === "/" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        j += 1;
      }
      blank(i + 1, j);
      i = j + 1;
      last = "/re/";
      continue;
    }
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j] as string)) j += 1;
      last = src.slice(i, j);
      i = j;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    if (!/\s/.test(c)) last = c;
    i += 1;
  }
  return out.join("");
}

/** Whether the (code-only) file folds a game: it defines or calls a `fold…Game`, or plays a corpus. */
const foldsAGame = (code: string): boolean => /\bfold[A-Za-z0-9]*Game\b|\b(flatBaseline|genSeason|goldenGames|playFixtures)\s*\(/.test(code);

/** Every read of `DEFAULT_TUNABLES` that is neither in an import (or re-export) nor a default parameter's value: `line: text`. */
function defaultReads(src: string): string[] {
  const code = codeOnly(src);
  const allowed: [number, number][] = [];
  for (const m of code.matchAll(/\b(?:import|export)\s+(?:type\s+)?\{[^}]*\}\s*from\s*["'][^"'\n]*["']/g)) allowed.push([m.index, m.index + m[0].length]);
  const out: string[] = [];
  for (const m of code.matchAll(/\bDEFAULT_TUNABLES\b/g)) {
    const at = m.index;
    if (allowed.some(([a, b]) => at >= a && at < b)) continue;
    const before = code.slice(Math.max(0, at - 200), at);
    const after = code.slice(at + m[0].length, at + m[0].length + 20);
    if (/[A-Za-z_$][\w$]*\s*:\s*Tunables\s*=\s*$/.test(before) && /^\s*[,)]/.test(after)) continue;
    const line = src.slice(0, at).split("\n").length;
    out.push(`${String(line)}: ${src.split("\n")[line - 1]!.trim()}`);
  }
  return out;
}

/** The engine's package name, built so the surface tests' text scans do not read the samples below as imports. */
const ENGINE_PKG = ["@ff", "engine"].join("/");

describe("K14: no fold reads the default tunables", () => {
  it("the checker: a default parameter and an import pass; a constant, a fallback, an argument and a template expression do not; comments and strings are not code", () => {
    const ok = [
      `import { DEFAULT_TUNABLES, type Tunables } from "${ENGINE_PKG}";`,
      `import {\n  applyTunablePatch,\n  DEFAULT_TUNABLES,\n} from "${ENGINE_PKG}";`,
      "export function f(acc: number, tunables: Tunables = DEFAULT_TUNABLES): void {}",
      "const g = (a: number, t: Tunables = DEFAULT_TUNABLES, b = 1): number => a;",
      "// const tunables = DEFAULT_TUNABLES;",
      "/** reads `DEFAULT_TUNABLES` */",
      'const s = "DEFAULT_TUNABLES.pocket" + `DEFAULT_TUNABLES`;',
      "const re = /\"/; const n = 1;",
    ];
    for (const src of ok) expect(defaultReads(src), src).toEqual([]);
    const bad = [
      "const tunables: Tunables = DEFAULT_TUNABLES;",
      "const t = opts.tunables ?? DEFAULT_TUNABLES;",
      "foldGame(acc, o, DEFAULT_TUNABLES);",
      "const s = `x ${DEFAULT_TUNABLES.pocket.y} z`;",
      'const re = /"/.test(s) ? DEFAULT_TUNABLES : x;',
      "const { pocket } = DEFAULT_TUNABLES;",
      "function f(t: Tunables = DEFAULT_TUNABLES.x) {}",
    ];
    for (const src of bad) expect(defaultReads(src), src).toHaveLength(1);
    expect(foldsAGame(codeOnly("// foldGame(acc)\nconst x = 1;"))).toBe(false);
    expect(foldsAGame(codeOnly("export function foldM1Game() {}"))).toBe(true);
    expect(foldsAGame(codeOnly("genSeason(1, visit, {});"))).toBe(true);
  });

  it("catches step 0's old line (the constant runStep0 used to read)", () => {
    const step0 = readFileSync(join(PKG, "src", "pocket", "step0.ts"), "utf8");
    expect(defaultReads(step0)).toEqual([]);
    const old = step0.replace("const tunables: Tunables = rulesTunables(LEGACY_RULES);", "const tunables: Tunables = DEFAULT_TUNABLES;");
    expect(old).not.toBe(step0);
    expect(defaultReads(old)).toEqual(["const tunables: Tunables = DEFAULT_TUNABLES;"].map((t) => expect.stringContaining(t)));
  });

  it("no file under src/pocket or src/metrics that folds a game reads DEFAULT_TUNABLES outside a default parameter", () => {
    const files: string[] = [];
    for (const dir of ["pocket", "metrics"]) {
      for (const f of readdirSync(join(PKG, "src", dir), { recursive: true }) as string[]) if (/\.(ts|mts)$/.test(f)) files.push(join(PKG, "src", dir, f));
    }
    const folding = files.filter((f) => foldsAGame(codeOnly(readFileSync(f, "utf8"))));
    expect(folding.length, "the scan finds the fold files, so a pass means something").toBeGreaterThan(10);
    for (const name of ["step0.ts", "step1.ts", "s1Stream.ts", "collect.ts", "rows.ts"]) expect(folding.some((f) => f.endsWith(`/${name}`)), name).toBe(true);
    const reads = folding.flatMap((f) => defaultReads(readFileSync(f, "utf8")).map((r) => `${f.slice(PKG.length + 1)}:${r}`));
    expect(reads, reads.join("\n")).toEqual([]);
  });
});
