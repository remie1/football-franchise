/**
 * ADR-089 step 1, review CT-1: `writeAtomic` (step1.ts) and two writers of one path.
 *
 * Two shards that finish together write the same `--report` and `--out`, and two overlapping runs
 * of one arm into one cache write the same record. With one fixed temporary name the second
 * writer's `writeFileSync` replaced the file the first was about to rename, and the first rename
 * threw ENOENT. Here `node:fs` is wrapped so that a second `writeAtomic` of the same path runs
 * inside the first one's rename, which is that interleaving made deterministic. Every call still
 * reaches the real `node:fs`.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

/** What the wrapped `renameSync` does before it renames: nothing, unless a test sets it. */
const hook: { beforeRename: ((from: string, to: string) => void) | null } = { beforeRename: null };

vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  const renameSync: typeof real.renameSync = (from, to) => {
    const before = hook.beforeRename;
    hook.beforeRename = null;
    if (before !== null) before(String(from), String(to));
    real.renameSync(from, to);
  };
  return { ...real, default: { ...real, renameSync }, renameSync };
});

const { writeAtomic } = await import("../src/pocket/step1.js");

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "ff-write-atomic-"));
  scratch.push(dir);
  return dir;
}

describe("writeAtomic with two writers of one path (review CT-1)", () => {
  it("a second writer that finishes inside the first one's rename costs neither its write", () => {
    const path = join(tempDir(), "reports", "step1.md");
    hook.beforeRename = () => {
      writeAtomic(path, "the other shard's bytes\n");
    };
    expect(() => writeAtomic(path, "this shard's bytes\n")).not.toThrow();
    expect(readFileSync(path, "utf8")).toBe("this shard's bytes\n");
    expect(readdirSync(dirname(path))).toEqual(["step1.md"]);
  });

  it("a rename that fails removes its own temporary file and throws", () => {
    const path = join(tempDir(), "A1.set1.json");
    hook.beforeRename = () => {
      throw new Error("the rename failed");
    };
    expect(() => writeAtomic(path, "bytes\n")).toThrow("the rename failed");
    expect(readdirSync(dirname(path))).toEqual([]);
  });
});
