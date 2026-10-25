/**
 * ADR-089 step 0 — THE COMMITTED FILING, `reports/adr-089-step0.filed.json` (§6.0; plan §7.2, §8.1).
 *
 * The file validates as `adr-089-filed/v1`; it is written in `saveFiled`'s format; it equals
 * `step0Filing()` everywhere except where `step0Filing()` leaves a pending marker, which C3 fills
 * (append-only); the prediction's three lists are disjoint; and the filed census is the live one,
 * so a new leaf in `DEFAULT_TUNABLES` fails here naming ADR-089's census rule.
 *
 * `FF_POCKET_FILED_WRITE=1` rewrites the file from `step0Filing()`; it refuses once any pending
 * marker has been filled, because the filing is append-only from then on. C3 pins `FILED_DIGEST`
 * here (plan §7.3 item 2).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import { numericLeafPathDigest } from "../src/knownTruth/docConformance.js";
import { FILED_PATH, step0Filing } from "../src/pocket/bands.js";
import { FILED_BLOCKS, isPending, loadFiled, pendingPaths, saveFiled, validateFiled } from "../src/pocket/filed.js";

const PATH = join(import.meta.dirname, "..", FILED_PATH);
const CENSUS_RULE =
  "ADR-089 §6.0, the census (K2-02, ADR-089:993): every new dial lives in the pocket-1 overlay, never in DEFAULT_TUNABLES, until step 11";

/**
 * Where `actual` differs from `expected`, by dot path. A pending marker in `expected` matches
 * anything at that path (the same marker, or the value C3 filled in); everything else must be equal.
 */
function differences(expected: unknown, actual: unknown, path = ""): string[] {
  if (isPending(expected)) return [];
  const here = path === "" ? "(root)" : path;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${here}: expected an array`];
    if (expected.length !== actual.length) return [`${here}: expected ${String(expected.length)} items, found ${String(actual.length)}`];
    return expected.flatMap((x, i) => differences(x, actual[i], `${path}${path === "" ? "" : "."}${String(i)}`));
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return [`${here}: expected an object`];
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    const out: string[] = [];
    for (const k of Object.keys(a)) if (!(k in e)) out.push(`${path}${path === "" ? "" : "."}${k}: not in step0Filing()`);
    for (const k of Object.keys(e)) {
      if (!(k in a)) out.push(`${path}${path === "" ? "" : "."}${k}: missing`);
      else out.push(...differences(e[k], a[k], `${path}${path === "" ? "" : "."}${k}`));
    }
    return out;
  }
  return Object.is(expected, actual) ? [] : [`${here}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`];
}

describe("ADR-089 step 0: the committed filing", () => {
  if (process.env["FF_POCKET_FILED_WRITE"] === "1") {
    it("writes the filing from step0Filing() (FF_POCKET_FILED_WRITE=1), only while nothing has been filled", () => {
      let current: unknown;
      try {
        current = JSON.parse(readFileSync(PATH, "utf8")) as unknown;
      } catch {
        current = undefined;
      }
      if (current !== undefined) {
        const now = pendingPaths(validateFiled(current)).map((p) => p.path);
        const fresh = pendingPaths(step0Filing()).map((p) => p.path);
        expect(now, "a pending marker has been filled: the filing is append-only (plan §8.1); amend by a named entry").toEqual(fresh);
      }
      saveFiled(PATH, step0Filing());
    });
  }

  // Read inside each case, so that the gated writer above runs first.
  const committed = (): string => readFileSync(PATH, "utf8");

  it("validates as adr-089-filed/v1, with every block", () => {
    const file = loadFiled(PATH);
    expect(file.format).toBe("adr-089-filed/v1");
    expect(file.adr).toBe("ADR-089");
    expect(file.step).toBe(0);
    expect(Object.keys(file).sort()).toEqual([...FILED_BLOCKS].sort());
  });

  it("is written in saveFiled's format: two-space JSON and a final newline", () => {
    const text = committed();
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
  });

  it("equals step0Filing() wherever step0Filing() is not pending", () => {
    const file = loadFiled(PATH);
    expect(differences(step0Filing(), file)).toEqual([]);
  });

  it("leaves pending only what step0Filing() leaves pending, all of it M- or base-derived", () => {
    const file = loadFiled(PATH);
    const fresh = new Map(pendingPaths(step0Filing()).map((p) => [p.path, p.source]));
    for (const p of pendingPaths(file)) expect(fresh.get(p.path), p.path).toBe(p.source);
    expect(new Set([...fresh.values()])).toEqual(new Set(["BASE", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"]));
  });

  it("keeps the prediction's three lists disjoint (plan §9)", () => {
    const file = loadFiled(PATH);
    const lists = { a: file.prediction.a, b: file.prediction.b, c: file.prediction.c };
    const seen = new Map<string, string>();
    for (const [name, items] of Object.entries(lists)) {
      expect(items.length, name).toBeGreaterThan(0);
      for (const item of items) {
        expect(seen.has(item.id), `${item.id} is in ${seen.get(item.id) ?? ""} and ${name}`).toBe(false);
        seen.set(item.id, name);
        expect(item.id.startsWith(`${name}.`), item.id).toBe(true);
      }
    }
    const texts = [...lists.a, ...lists.b, ...lists.c].map((x) => x.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("files the live census: the path digest and the tunables digest", () => {
    const file = loadFiled(PATH);
    expect(file.census).toEqual({ pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" });
    expect(numericLeafPathDigest(), `${CENSUS_RULE}; the numeric-leaf path digest moved`).toBe(file.census.pathDigest);
    expect(stableDigest(DEFAULT_TUNABLES), `${CENSUS_RULE}; the tunables digest moved`).toBe(file.census.tunablesDigest);
  });

  it("answers question 19 with Wait, and files Table now as information only", () => {
    const file = loadFiled(PATH);
    expect(file.constants["snap.answer"]?.value).toBe("WAIT");
    expect(file.selectionRule.freeRunClock.startsWith("WAIT:")).toBe(true);
    const tableNow = file.constants["snap.tableNow"]?.value as Record<string, unknown>;
    expect(String(tableNow["informationOnly"])).toMatch(/answered Wait/);
  });
});
