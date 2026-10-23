/**
 * ADR-078 R1: calibration may import from `@ff/franchise` only the named surface.
 * Any other name is a new exception, which needs its own ADR. Amendment 1 (2026-10-21, save and load)
 * added `makeSave` and `readSave`; amendment 2 (2026-10-23, saves keep the coaching staff) `buildStaff`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PERMITTED = new Set([
  "buildLeague", "League", "buildSchedule", "computeStandings", "seedPlayoffs", "runSeason", "GameResolver", "SeasonRun",
  // Save and load (R1 amendment 1, 2026-10-21).
  "makeSave", "readSave",
  // Saves keep the coaching staff (R1 amendment 2, 2026-10-23).
  "buildStaff",
]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []);
}

describe("calibration → franchise surface (ADR-078 R1)", () => {
  it("imports nothing from @ff/franchise beyond the ratified names", () => {
    const root = join(__dirname, "..");
    const used = new Set<string>();
    for (const f of [...files(join(root, "src")), ...files(join(root, "test"))]) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@ff\/franchise(?:\/[^"]*)?"/g)) {
        for (const name of m[1]!.split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!).filter(Boolean)) used.add(name);
      }
      expect(src, `${f} reaches into franchise internals`).not.toMatch(/from\s+"@ff\/franchise\/|packages\/franchise\/src/);
    }
    expect([...used].filter((n) => !PERMITTED.has(n))).toEqual([]);
    expect(used.size).toBeGreaterThan(0);
  });
});
