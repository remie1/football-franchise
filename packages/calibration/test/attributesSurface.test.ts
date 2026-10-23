/**
 * ADR-079 R1: calibration may import from `@ff/attributes` only the named surface.
 * Any other name is a new exception, which needs its own ADR.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PERMITTED = new Set(["generateLeagueRosters", "GenerateLeagueInput", "FictionalProvenance"]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []);
}

describe("calibration → attributes surface (ADR-079 R1)", () => {
  it("imports nothing from @ff/attributes beyond the ratified names", () => {
    const root = join(__dirname, "..");
    const used = new Set<string>();
    for (const f of [...files(join(root, "src")), ...files(join(root, "test"))]) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@ff\/attributes(?:\/[^"]*)?"/g)) {
        for (const name of m[1]!.split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!).filter(Boolean)) used.add(name);
      }
      expect(src, `${f} reaches into attributes internals`).not.toMatch(/from\s+"@ff\/attributes\/|packages\/attributes\/src/);
    }
    expect([...used].filter((n) => !PERMITTED.has(n))).toEqual([]);
    expect(used.size).toBeGreaterThan(0);
  });
});
