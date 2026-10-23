/**
 * ADR-082 R2: calibration may import from `@ff/narrative` only `createNewsDesk` and `formatEdition`,
 * and only in the season command (`src/season/main.ts`). Spec #7 §10: calibration ignores narrative
 * for measurement, so no harness, metric, caller or test file may reach it. Any other name or file
 * is a new exception, which needs its own ADR.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const PERMITTED = new Set(["createNewsDesk", "formatEdition"]);
const ONLY_FILE = "src/season/main.ts";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []);
}

describe("calibration → narrative surface (ADR-082 R2)", () => {
  it("imports only the two ratified names, and only in the season command", () => {
    const root = join(__dirname, "..");
    const used = new Set<string>();
    const importers = new Set<string>();
    for (const f of [...files(join(root, "src")), ...files(join(root, "test"))]) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} reaches into narrative internals`).not.toMatch(/from\s+"@ff\/narrative\/|packages\/narrative\/src/);
      for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@ff\/narrative"/g)) {
        importers.add(relative(root, f).split("\\").join("/"));
        for (const name of m[1]!.split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!).filter(Boolean)) used.add(name);
      }
      if (/from\s+"@ff\/narrative"/.test(src)) importers.add(relative(root, f).split("\\").join("/"));
    }
    expect([...importers]).toEqual([ONLY_FILE]);
    expect([...used].filter((n) => !PERMITTED.has(n))).toEqual([]);
    expect(used.size).toBeGreaterThan(0);
  });
});
