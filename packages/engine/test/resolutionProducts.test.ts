/**
 * ADR-018 — THE THREE TYPES THAT CAME BACK, AND THE TEST THAT SENT THEM BACK.
 *
 * `ResolvedRushAssignment`, `CoverageShell` and `GapId` spent one dispatch in
 * `@ff/contracts/playcalls` and are engine-local again. The argument that
 * settled it was not "who imports it" — the playbook agent used all three and
 * still argued none was shared — it was **same shape, different fact**:
 *
 *   `ResolvedRushAssignment` means *the alignment the engine SIMULATED with*.
 *   A card corpus needed *the alignment the card DECLARED*. Identical structure,
 *   two different claims.
 *
 * That is a sentence, and a sentence rots. The first describe below turns it
 * into a failing test: it shows the two facts DIVERGING, and diverging on an
 * engine TUNABLE, so that one shared name would have made a play card's meaning
 * move whenever calibration patched `arrival.defaultAlignment`. If the two facts
 * ever became one fact, this test would go green for the wrong reason and the
 * argument for the split would be gone — so it also asserts the coupling
 * directly.
 *
 * The second describe is the boundary pin, mirroring the one `packages/playbook`
 * put on its own import surface: no engine source file may take any of the three
 * names from contracts. It reads source text because that is the only place an
 * `import type` still exists at test time — types are erased, so there is
 * nothing at runtime to assert against.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { rushAlignmentFor, resolvedRushAssignment } from "../src/resolve/rushThreat.js";
import { TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { PassPlayStartPayload, PlayCalls, RunPlayStartPayload } from "../src/types.js";
import { buildRunScenario, buildScenario } from "./fixtures.js";

function passStartPayload(calls: PlayCalls, seed: string): PassPlayStartPayload {
  const { state } = buildScenario();
  const { events } = simulatePassPlay(state, calls, seed);
  const start = events.find((e) => e.event.type === "PLAY_START");
  if (start === undefined) throw new Error("no PLAY_START");
  return start.event.payload as PassPlayStartPayload;
}

describe("ADR-018 — same shape, different fact", () => {
  /** A card that says nothing about alignment, which is most cards. */
  const silentCard = (): PlayCalls => {
    const { calls } = buildScenario();
    return {
      ...calls,
      defense: {
        ...calls.defense,
        rush: calls.defense.rush.map((r) => ({ rusher: r.rusher, move: r.move })),
      },
    };
  };

  it("the card declares nothing and the stream states a value: two different facts", () => {
    const calls = silentCard();
    for (const r of calls.defense.rush) expect(r.alignment).toBeUndefined();

    const payload = passStartPayload(calls, "same-shape");
    for (const r of payload.defense.rush) {
      expect(["EDGE", "INTERIOR"]).toContain(r.alignment);
    }
  });

  it("the resolved fact moves when a TUNABLE moves; the declared fact cannot", () => {
    // This is the coupling one shared name would have created. A corpus stating
    // "the alignment on this card" would have had its meaning changed by a
    // calibration patch it never saw, silently, in a package that does not
    // import the engine.
    const patched = applyTunablePatch(TUNABLES, {
      tunableId: "arrival.defaultAlignment",
      currentValue: "EDGE",
      proposedValue: "INTERIOR",
      evidence: "ADR-018 regression test",
      expectedEffect: "an undeclared alignment resolves INTERIOR instead of EDGE",
    });
    const endPosition = "DE" as const;
    expect(rushAlignmentFor(TUNABLES, endPosition, undefined)).toBe("EDGE");
    expect(rushAlignmentFor(patched, endPosition, undefined)).toBe("INTERIOR");
    // ...and a DECLARED alignment is untouched by the same patch, which is the
    // other half of "different fact": the card's claim is the card's.
    expect(rushAlignmentFor(patched, endPosition, "EDGE")).toBe("EDGE");
  });

  it("a CoverageShell is computed, never echoed — MIXED is the answer no card states", () => {
    // The same test, applied to the second type. `DefensivePlayCall` has no
    // coverage field to echo; the shell is derived by walking assignments, and
    // the value it most often derives is one no single-enum card could carry.
    const { calls } = buildScenario();
    expect("coverage" in calls.defense).toBe(false);
    const payload = passStartPayload(calls, "shell-derived");
    expect(payload.defense.coverage).toBe("MAN");
  });

  it("a GapId appears on no card: the pair is formed by the engine to key a lookup", () => {
    const { calls } = buildRunScenario();
    // The card carries two independent fields, exactly as `RunBlockAssignment`
    // does; nothing on it is shaped like the pair the run resolver forms.
    expect(calls.offense.designedGap).toBe("B");
    expect(calls.offense.designedSide).toBe("LEFT");
    expect("gapId" in calls.offense).toBe(false);
  });
});

describe("ADR-018 — the boundary: the three names are the engine's own", () => {
  const RESOLUTION_PRODUCTS = ["ResolvedRushAssignment", "CoverageShell", "GapId"] as const;

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && entry.name.endsWith(".ts") ? [full] : [];
    });
  }

  /** Every `import ... from "@ff/contracts"` clause in a file, as raw text. */
  function contractsImportClauses(source: string): string[] {
    const pattern = /import\s+type\s*\{([^}]*)\}\s*from\s*"@ff\/contracts[^"]*"|import\s*\{([^}]*)\}\s*from\s*"@ff\/contracts[^"]*"/g;
    const clauses: string[] = [];
    for (const match of source.matchAll(pattern)) {
      const body = match[1] ?? match[2];
      if (body !== undefined) clauses.push(body);
    }
    return clauses;
  }

  it("no engine source imports a resolution product from contracts", () => {
    const root = join(import.meta.dirname, "..", "src");
    const offenders: string[] = [];
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const clause of contractsImportClauses(source)) {
        const names = clause.split(",").map((n) => n.trim().split(/\s+as\s+/)[0]?.trim() ?? "");
        for (const product of RESOLUTION_PRODUCTS) {
          if (names.includes(product)) offenders.push(`${file}: ${product}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the regex actually finds contracts imports, so an empty result means something", () => {
    // A boundary test that silently matches nothing passes forever. This pins
    // the parser against a file that certainly has one.
    const typesFile = readFileSync(join(import.meta.dirname, "..", "src", "types.ts"), "utf8");
    const clauses = contractsImportClauses(typesFile);
    expect(clauses.length).toBeGreaterThan(0);
    expect(clauses.join(",")).toContain("RushAssignment");
  });
});

describe("ADR-018 petition 2 — the rusher's side reaches the stream", () => {
  it("a stated side survives into PLAY_START, exactly as a resolved alignment does", () => {
    const { calls } = buildScenario();
    const withSides: PlayCalls = {
      ...calls,
      defense: {
        ...calls.defense,
        rush: [
          { ...calls.defense.rush[0]!, side: "LEFT" },
          { ...calls.defense.rush[1]!, side: "RIGHT" },
        ],
      },
    };
    const payload = passStartPayload(withSides, "side-pass");
    expect(payload.defense.rush.map((r) => r.side)).toEqual(["LEFT", "RIGHT"]);
  });

  it("an omitted side is an ABSENT KEY, never a guess and never a null", () => {
    // Nothing defaults it, deliberately: `alignment` has a tunable to fall back
    // on because §7.2 cannot run without one, and `side` has no consumer and so
    // no default. Inventing one is the fabricated geometry the petition removes.
    const payload = passStartPayload(buildScenario().calls, "side-absent");
    for (const r of payload.defense.rush) {
      expect("side" in r).toBe(false);
      expect(r.side).toBeUndefined();
    }
  });

  it("the run payload carries it too, from the same owner", () => {
    const { state, calls } = buildRunScenario();
    const sided = {
      ...calls,
      defense: {
        ...calls.defense,
        rush: calls.defense.rush.map((r, i) => ({
          ...r,
          side: i < 2 ? ("LEFT" as const) : ("RIGHT" as const),
        })),
      },
    };
    const { events } = simulateRunPlay(state, sided, "side-run");
    const start = events.find((e) => e.event.type === "PLAY_START");
    if (start === undefined) throw new Error("no PLAY_START");
    const payload = start.event.payload as RunPlayStartPayload;
    expect(payload.defense.rush.map((r) => r.side)).toEqual(["LEFT", "LEFT", "RIGHT", "RIGHT"]);
    // The alignment is still RESOLVED alongside it — the two fields are carried
    // differently on purpose and both are in the stream.
    expect(payload.defense.rush.map((r) => r.alignment)).toEqual([
      "EDGE",
      "INTERIOR",
      "INTERIOR",
      "EDGE",
    ]);
  });

  it("side changes nothing about resolution: it is geometry the stream reports", () => {
    // ADR-018's own words — petition 2 "changes no resolution today". If a side
    // ever starts moving a number, that is a mechanic, and it needs its own ADR.
    const { calls } = buildScenario();
    const sided: PlayCalls = {
      ...calls,
      defense: {
        ...calls.defense,
        rush: calls.defense.rush.map((r) => ({ ...r, side: "LEFT" as const })),
      },
    };
    const { state } = buildScenario();
    const plain = simulatePassPlay(state, calls, "side-noop");
    const withSide = simulatePassPlay(state, sided, "side-noop");
    const strip = (events: readonly { readonly event: { readonly type: string } }[]): string =>
      JSON.stringify(events.filter((e) => e.event.type !== "PLAY_START"));
    expect(strip(withSide.events)).toBe(strip(plain.events));
  });

  it("the one owner is used by both payloads, so they cannot drift", () => {
    expect(resolvedRushAssignment({
      rusher: buildScenario().calls.defense.rush[0]!.rusher,
      move: "SPEED",
      alignment: "EDGE",
      side: undefined,
    })).not.toHaveProperty("side");
  });
});
