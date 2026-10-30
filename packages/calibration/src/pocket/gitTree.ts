/**
 * THE TREE A STEP-1 ARM WAS PLAYED ON (ADR-089 step 1; plan §7.2 item 8's stamp: `commit`, `dirty`).
 *
 * Read from the repository's own files, never by starting `git`: library code does not shell out
 * (`carryForward.test.ts`, "the honesty of the stamp"), and `FF_ENGINE_COMMIT` is the baseline
 * tool's alone. So:
 *
 *  - **`headCommit`** reads `HEAD`, follows a symbolic ref to its loose ref file or to
 *    `packed-refs` (and a linked worktree's `gitdir:` and `commondir`), and returns the 40-hex
 *    object name, or `undefined` if the files do not say;
 *  - **`treeState`** compares the files a fingerprint read against the index: a file the index
 *    lacks, a file whose blob hash (`sha1("blob <size>\0" + bytes)`) differs from its index entry,
 *    an indexed `.ts` file under a fingerprinted directory that is gone, an unmerged entry, or an
 *    index this reader cannot parse (version 4) each make the tree dirty. What it cannot see is a
 *    change staged and not committed: the index then matches the working file. That gap is stated
 *    wherever the stamp is printed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** The repository's git directory (a `.git` folder, or the folder a `.git` file's `gitdir:` names). */
export function gitDirOf(repoRoot: string): string | undefined {
  const dot = join(repoRoot, ".git");
  if (!existsSync(dot)) return undefined;
  if (statSync(dot).isDirectory()) return dot;
  const m = /^gitdir:\s*(.+)\s*$/m.exec(readFileSync(dot, "utf8"));
  return m === null ? undefined : resolve(repoRoot, m[1] as string);
}

function commonDirOf(gitDir: string): string {
  const file = join(gitDir, "commondir");
  return existsSync(file) ? resolve(gitDir, readFileSync(file, "utf8").trim()) : gitDir;
}

const SHA = /^[0-9a-f]{40}$/;

/** The commit HEAD names, from the repository's files; `undefined` when they do not say. */
export function headCommit(repoRoot: string): string | undefined {
  const gitDir = gitDirOf(repoRoot);
  if (gitDir === undefined || !existsSync(join(gitDir, "HEAD"))) return undefined;
  const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
  if (SHA.test(head)) return head;
  const m = /^ref:\s*(\S+)$/.exec(head);
  if (m === null) return undefined;
  const ref = m[1] as string;
  for (const dir of [gitDir, commonDirOf(gitDir)]) {
    const loose = join(dir, ref);
    if (existsSync(loose)) {
      const sha = readFileSync(loose, "utf8").trim();
      if (SHA.test(sha)) return sha;
    }
  }
  const packed = join(commonDirOf(gitDir), "packed-refs");
  if (!existsSync(packed)) return undefined;
  for (const line of readFileSync(packed, "utf8").split("\n")) {
    const [sha, name] = line.trim().split(/\s+/);
    if (name === ref && sha !== undefined && SHA.test(sha)) return sha;
  }
  return undefined;
}

/** One index entry: its path, blob name and merge stage. */
export interface IndexEntry {
  readonly path: string;
  readonly sha: string;
  readonly stage: number;
}

/** The index's entries (versions 2 and 3); throws on anything else. */
export function readIndex(buf: Buffer): readonly IndexEntry[] {
  if (buf.length < 12 || buf.toString("latin1", 0, 4) !== "DIRC") throw new Error("gitTree: not a git index");
  const version = buf.readUInt32BE(4);
  if (version !== 2 && version !== 3) throw new Error(`gitTree: index version ${String(version)} is not read here`);
  const count = buf.readUInt32BE(8);
  const out: IndexEntry[] = [];
  let at = 12;
  for (let i = 0; i < count; i += 1) {
    const sha = buf.toString("hex", at + 40, at + 60);
    const flags = buf.readUInt16BE(at + 60);
    const extended = version >= 3 && (flags & 0x4000) !== 0;
    const pathAt = at + 62 + (extended ? 2 : 0);
    const end = buf.indexOf(0, pathAt);
    if (end < 0) throw new Error("gitTree: a truncated index entry");
    const path = buf.toString("utf8", pathAt, end);
    out.push({ path, sha, stage: (flags >> 12) & 3 });
    const length = end - at; // fixed part and path, without the NUL padding
    at += (length + 8) & ~7;
  }
  return out;
}

/** The blob name git gives a file's bytes. */
export function blobSha(bytes: Buffer): string {
  return createHash("sha1").update(`blob ${String(bytes.length)}\0`).update(bytes).digest("hex");
}

export interface TreeState {
  readonly commit: string | undefined;
  readonly dirty: boolean;
  /** Why the tree is dirty (the first reason found), when it is. */
  readonly reason?: string;
}

/**
 * HEAD's commit, and whether the files a fingerprint read (repo-relative, `/`-separated) differ from
 * the index; `dirs` are the fingerprinted directories, so an indexed `.ts` file under one that is
 * gone counts too.
 */
export function treeState(repoRoot: string, files: readonly string[], dirs: readonly string[]): TreeState {
  const commit = headCommit(repoRoot);
  const gitDir = gitDirOf(repoRoot);
  const indexPath = gitDir === undefined ? undefined : join(gitDir, "index");
  if (indexPath === undefined || !existsSync(indexPath)) return { commit, dirty: true, reason: "no git index to compare with" };
  let entries: readonly IndexEntry[];
  try {
    entries = readIndex(readFileSync(indexPath));
  } catch (e: unknown) {
    return { commit, dirty: true, reason: e instanceof Error ? e.message : String(e) };
  }
  const byPath = new Map<string, IndexEntry>();
  for (const e of entries) {
    if (e.stage !== 0) return { commit, dirty: true, reason: `an unmerged index entry, ${e.path}` };
    byPath.set(e.path, e);
  }
  const read = new Set(files);
  for (const f of files) {
    const e = byPath.get(f);
    if (e === undefined) return { commit, dirty: true, reason: `${f} is not in the index` };
    if (blobSha(readFileSync(join(repoRoot, f))) !== e.sha) return { commit, dirty: true, reason: `${f} differs from the index` };
  }
  for (const e of entries) {
    if (!e.path.endsWith(".ts") || read.has(e.path)) continue;
    if (dirs.some((d) => e.path.startsWith(`${d}/`))) return { commit, dirty: true, reason: `${e.path} is in the index and not in the tree` };
  }
  return { commit, dirty: false };
}
