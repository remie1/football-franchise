/**
 * ADR-089 step 0 — CALIBRATION'S ENGINE SURFACE, PINNED (plan §0, §3.7; C1-B1, C2-B1).
 *
 * The design says the pocket fix adds no surface (ADR-089:971). Its list of what calibration may
 * import is incomplete, at e23bf69 and already at 8b387f7: calibration also imports ADR-035's
 * band-table names (`knownTruth/bandTables.ts`) and the caller, snapshot and summary types. So the
 * pin is the set MEASURED at e23bf69: 39 names in `src`, 40 with `test` (`TunablePatch` is
 * test-only). Every name calibration imports from the engine's barrel, in `src` or `test`, must be
 * one of these 40. And none may be a resolver: no `resolve*`, `bandFor`, `tierFor` or
 * `resolveAttr` (ADR-012 removed exactly those; ADR-089 §6.0 keeps the line bench in the engine's
 * own tests for that reason).
 *
 * Only named imports and re-exports of the barrel are allowed: no deep import into the package, no
 * import of its source by path, no namespace, default, side-effect or dynamic import.
 *
 * The barrel itself is pinned on the engine's side by `packages/engine/test/tunablePatch.test.ts`
 * (its PERMITTED list and the "exports these runtime values and no others" case): that pins what
 * the engine offers; this pins what calibration takes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/** MEASURED at e23bf69 (plan §0). */
const PERMITTED = new Set([
  "AnyPlayCalls", "BandCell", "BandTable", "CoinTossChoice", "CoinTossRequest", "DEFAULT_TUNABLES",
  "DefensiveCallRequest", "DefensivePersonnel", "DefensivePlayCall", "FourthDownChoice", "FourthDownRequest",
  "GameCoordinates", "GameSnapshot", "GameSummary", "GuardedByRelation", "MatchGameState", "OffensiveCallRequest",
  "OffensivePersonnel", "OffensivePlayCall", "OrderViolation", "PlayCaller", "PlayCalls", "RunPlayCall",
  "RunPlayCalls", "SpecialTeamsPersonnel", "StatLine", "TeamSnapshot", "Tunables", "allCells",
  "applyTunablePatch", "columnIsOrderable", "createMatchState", "deriveGameId", "deriveGuardedBy",
  "discoverBandTables", "labelledLadderPaths", "orderViolations", "simulateGame", "simulatePlay",
  // test-only
  "TunablePatch",
]);

const DENIED = (name: string): boolean => /^resolve/.test(name) || name === "bandFor" || name === "tierFor" || name === "resolveAttr";

// Built by concatenation so that this file's own text never matches what it scans for.
const PKG = "@ff/" + "engine";
const Q = PKG.replace("/", "\\/");
// Either quote style (review finding CT-N1): a single-quoted import must be counted, not skipped.
const NAMED = new RegExp(`(?:import|export)\\s+(?:type\\s+)?\\{([^}]*)\\}\\s+from\\s+["']${Q}["']`, "g");
const ANY_FROM = new RegExp(`from\\s+["']${Q}["']`, "g");
const DEEP = new RegExp(`["']${Q}\\/`);
const BY_PATH = new RegExp(`from\\s+["'][^"']*engine\\/src[^"']*["']`);
const DYNAMIC = new RegExp(`import\\(\\s*["']${Q}`);
const BARE = new RegExp(`import\\s+["']${Q}["']`);

/** The engine names one source file imports from the barrel, and every form of import it may not use. */
function scanSource(src: string): { names: string[]; badForms: string[] } {
  const names: string[] = [];
  const badForms: string[] = [];
  let named = 0;
  for (const m of src.matchAll(NAMED)) {
    named += 1;
    for (const raw of m[1]!.split(",")) {
      const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
      if (name.length > 0) names.push(name);
    }
  }
  const from = [...src.matchAll(ANY_FROM)].length;
  if (from !== named) badForms.push(`${String(from - named)} import(s) of the barrel that are not named imports`);
  if (DEEP.test(src)) badForms.push("a deep import into the engine package");
  if (BY_PATH.test(src)) badForms.push("an import of the engine's source by path");
  if (DYNAMIC.test(src)) badForms.push("a dynamic import of the engine");
  if (BARE.test(src)) badForms.push("a side-effect import of the engine");
  return { names, badForms };
}

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []);
}

describe("ADR-089 step 0: calibration's engine surface is the set measured at e23bf69", () => {
  const root = join(import.meta.dirname, "..");
  const scanned = [...files(join(root, "src")), ...files(join(root, "test"))];
  const used = new Map<string, Set<string>>();
  const badForms: string[] = [];

  for (const f of scanned) {
    const where = relative(root, f);
    const r = scanSource(readFileSync(f, "utf8"));
    for (const name of r.names) {
      if (!used.has(name)) used.set(name, new Set());
      used.get(name)!.add(where);
    }
    badForms.push(...r.badForms.map((b) => `${where}: ${b}`));
  }

  it("the scan reads either quote style and flags every other form (self-test, CT-N1)", () => {
    const named = scanSource(`import { simulateGame, type Tunables as T } from '${PKG}';\nexport { DEFAULT_TUNABLES } from "${PKG}";`);
    expect(named.names).toEqual(["simulateGame", "Tunables", "DEFAULT_TUNABLES"]);
    expect(named.badForms).toEqual([]);
    expect(scanSource(`import * as E from '${PKG}';`).badForms).toEqual(["1 import(s) of the barrel that are not named imports"]);
    expect(scanSource(`import E from "${PKG}";`).badForms).toEqual(["1 import(s) of the barrel that are not named imports"]);
    expect(scanSource(`import { x } from '${PKG}/src/x.js';`).badForms).toContain("a deep import into the engine package");
    expect(scanSource(`import { x } from '../../${"engine" + "/src"}/x.js';`).badForms).toEqual(["an import of the engine's source by path"]);
    expect(scanSource(`const e = await import('${PKG}');`).badForms).toEqual(["a dynamic import of the engine"]);
    expect(scanSource(`import '${PKG}';`).badForms).toEqual(["a side-effect import of the engine"]);
  });

  it("scans a non-trivial tree (so a passing scan means something)", () => {
    expect(scanned.length).toBeGreaterThan(150);
    expect(used.size).toBeGreaterThan(30);
  });

  it("imports only names in the measured set", () => {
    const outside = [...used.keys()].filter((n) => !PERMITTED.has(n)).map((n) => `${n} (${[...used.get(n)!].join(", ")})`);
    expect(outside, "a new engine name is a new surface: ADR-012 needs a named amendment").toEqual([]);
  });

  it("imports no resolver: no resolve*, bandFor, tierFor or resolveAttr", () => {
    expect([...used.keys()].filter(DENIED)).toEqual([]);
    expect([...PERMITTED].filter(DENIED), "the measured set itself holds none").toEqual([]);
  });

  it("uses only named imports and re-exports of the barrel", () => {
    expect(badForms).toEqual([]);
  });
});
