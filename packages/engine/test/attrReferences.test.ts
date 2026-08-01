/**
 * THE TWO WAYS AN ATTRIBUTE REFERENCE CAN GO WRONG, and the guards for both.
 *
 * V1 — THE ENGINE MUST NOT PARSE MEANING OUT OF AN ID.
 * `docs/design/contracts.md` §1: *"IDs are opaque. No domain may parse meaning
 * out of an ID string."* `src/terms.ts` used to reconstruct display names by
 * regex over the id (`"runBlock"` → `"Run Block"`), which produced the wrong
 * word wherever the registry's own name is not that transformation — and it was
 * already wrong in the live stream, because the registry names `yac` **"YAC"**
 * and the regex yielded **"Yac"** on every YAC contest. Latent siblings:
 * `pullSkill` → "Pull Skill" vs the registry's "Pulling", `catchInTraffic` →
 * "Catch In Traffic" vs "Catch in Traffic", `footballIQ` → "Football I Q".
 *
 * V2 — A STRINGLY-TYPED REFERENCE MUST FAIL AT LOAD, NOT MID-BATCH.
 * Most attribute references now live in `TUNABLES` as `{ attr: "..." }` and are
 * resolved lazily at roll time. An unknown id would therefore surface deep
 * inside a calibration run, on whichever band happened to fire first, long after
 * the registry churned. `src/attrs.ts` walks the whole tunables object at module
 * load and throws immediately.
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_REGISTRY_V1 } from "@ff/contracts";
import type { MatchEventEnvelope, RollDetail } from "@ff/contracts";
import {
  ATTR,
  TUNABLE_ATTR_REFS,
  attrName,
  collectTunableAttrRefs,
  resolveAttr,
  validateTunableAttrRefs,
} from "../src/attrs.js";
import { simulateGame, simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { buildGameFixture } from "./gameFixtures.js";
import { TUNABLES } from "../src/tunables.js";
import {
  RUN_SCHEMES,
  buildDeflectionScenario,
  buildMixedCoverageScenario,
  buildRunScenario,
  buildScenario,
  buildScramblerScenario,
  buildZoneScenario,
} from "./fixtures.js";

function everyRoll(events: readonly MatchEventEnvelope[]): RollDetail[] {
  const rolls: RollDetail[] = [];
  for (const { event } of events) {
    if (event.type === "CHECK") {
      rolls.push(event.payload.roll);
      if (event.payload.opposedRoll !== undefined) rolls.push(event.payload.opposedRoll);
    }
    if (event.type === "QB_READ") rolls.push(event.payload.varianceRoll);
  }
  return rolls;
}

function everyStream(prefix: string, n: number): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  for (const build of [
    buildScenario,
    buildZoneScenario,
    buildMixedCoverageScenario,
    buildDeflectionScenario,
    buildScramblerScenario,
  ]) {
    for (let i = 0; i < n; i++) {
      const { state, calls } = build();
      out.push([...simulatePassPlay(state, calls, `${prefix}-pass-${i}`).events]);
    }
  }
  for (const scheme of RUN_SCHEMES) {
    for (let i = 0; i < n; i++) {
      const { state, calls } = buildRunScenario(scheme);
      out.push([...simulateRunPlay(state, calls, `${prefix}-run-${scheme}-${i}`).events]);
    }
  }
  // ...and a whole game, so the KICKING game is swept too. It was not, and the
  // special-teams modifiers were the last hand-written attribute labels in the
  // engine ("K Leg" over `strength`). ADR-014 gave those attributes real
  // registry names, and this is what keeps the labels honest about them.
  const fixture = buildGameFixture({ seed: `${prefix}-game` });
  out.push([...simulateGame(fixture.state, fixture.inputs, fixture.seed).events]);
  return out;
}

describe("V1 — the stream spells attributes the way the registry does", () => {
  /**
   * The invariant, over every attribute-backed modifier the engine can produce:
   * a modifier that names an `attr` must carry that attribute's REGISTRY name in
   * its `source`. It cannot pass by accident — the id-mangling regex this
   * replaced fails it on the first YAC contest.
   */
  it("every attribute-backed modifier source contains the registry's own name", () => {
    let checked = 0;
    const namesSeen = new Set<string>();
    for (const events of everyStream("attr-source", 25)) {
      for (const roll of everyRoll(events)) {
        for (const modifier of roll.modifiers) {
          if (modifier.attr === undefined) continue;
          checked += 1;
          const registryName = attrName(modifier.attr);
          namesSeen.add(registryName);
          expect(
            modifier.source,
            `"${modifier.source}" names ${String(modifier.attr)}, ` +
              `which the registry spells "${registryName}"`,
          ).toContain(registryName);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    // ...and the sample really reached the attributes whose registry name is NOT
    // the id with spaces inserted, which are the only ones that can catch this.
    expect(namesSeen).toContain("YAC");
    // ...and the kicking attributes, whose labels used to be hand-written.
    expect(namesSeen).toContain("Kick Power");
    expect(namesSeen).toContain("Kick Accuracy");
    expect(namesSeen).toContain("Punt Power");
  });

  it("the registry disagrees with a naive id transformation, which is the point", () => {
    const naive = (id: string): string =>
      id.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    // Every one of these is a real entry the engine reads through a term list.
    expect(naive("yac")).not.toBe(attrName(ATTR.yac));
    expect(attrName(ATTR.yac)).toBe("YAC");
    expect(naive("pullSkill")).not.toBe(attrName(ATTR.pullSkill));
    expect(attrName(ATTR.pullSkill)).toBe("Pulling");
    expect(naive("catchInTraffic")).not.toBe(attrName(ATTR.catchInTraffic));
    expect(attrName(ATTR.catchInTraffic)).toBe("Catch in Traffic");
    expect(naive("footballIQ")).not.toBe(attrName(ATTR.footballIQ));
    expect(attrName(ATTR.footballIQ)).toBe("Football IQ");
  });

  it("no modifier source spells an attribute a way the registry does not", () => {
    // The mirror of the first test, and the one that catches a HAND-WRITTEN
    // label drifting: if a source mentions a registry display name at all, the
    // modifier had better be about that attribute.
    const registryNames = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).map((a) => a.name);
    const distinctive = registryNames.filter(
      (n) => n.length > 6 && registryNames.filter((m) => m.includes(n)).length === 1,
    );
    for (const events of everyStream("attr-drift", 6)) {
      for (const roll of everyRoll(events)) {
        for (const modifier of roll.modifiers) {
          if (modifier.attr === undefined) continue;
          const own = attrName(modifier.attr);
          for (const other of distinctive) {
            if (other === own) continue;
            expect(
              modifier.source.includes(other),
              `"${modifier.source}" is about ${own} but mentions "${other}"`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe("V2 — every TUNABLES attribute reference resolves, at load", () => {
  it("the load-time sweep found and validated the whole tunables tree", () => {
    // The module-level constant only exists because the sweep already ran and
    // did not throw: importing this file is the assertion.
    expect(TUNABLE_ATTR_REFS.length).toBeGreaterThan(0);
    for (const ref of TUNABLE_ATTR_REFS) {
      expect(() => resolveAttr(ref.id)).not.toThrow();
    }
  });

  it("it walks the tree generically, so a NEW reference is covered the day it is added", () => {
    // Not a list of known sites: a shape. Both spellings in use are found at any
    // depth, inside objects and inside arrays.
    const refs = collectTunableAttrRefs({
      block: { terms: [{ attr: "speed", divisor: 5 }, { attr: "power", divisor: 5 }] },
      nested: { deeper: [{ later: { speedAttr: "agility" } }] },
      notAReference: { attrDivisor: 5, label: "speed" },
    });
    expect(refs.map((r) => `${r.path}=${r.id}`)).toEqual([
      "block.terms.0.attr=speed",
      "block.terms.1.attr=power",
      "nested.deeper.0.later.speedAttr=agility",
    ]);
  });

  it("covers the sites the audit named, and every term list in the doc's formulas", () => {
    const paths = TUNABLE_ATTR_REFS.map((r) => r.path);
    // The three the audit called out as escaping `ATTR`'s eager resolution...
    expect(paths).toContain("ballCarrier.pursuitAngle.speedAttr");
    expect(paths).toContain("tippedBall.recovery.offenseHandsAttr");
    expect(paths).toContain("tippedBall.recovery.defenseHandsAttr");
    expect(paths.some((p) => p.startsWith("pocketMovement.appeal."))).toBe(true);
    // ...and the term lists generally.
    expect(paths).toContain("runGame.vision.terms.0.attr");
    expect(paths).toContain("ballCarrier.contests.yac.carrierTerms.0.attr");
    expect(paths).toContain("catching.contested.receiverTerms.2.attr");
  });

  it("throws immediately, naming the path, on an id the registry does not define", () => {
    const broken = {
      ...TUNABLES,
      runGame: {
        ...TUNABLES.runGame,
        vision: { ...TUNABLES.runGame.vision, terms: [{ attr: "clairvoyance", divisor: 5 }] },
      },
    };
    expect(() => validateTunableAttrRefs(broken)).toThrow(/clairvoyance/);
    expect(() => validateTunableAttrRefs(broken)).toThrow(/runGame\.vision\.terms\.0\.attr/);
    expect(() => validateTunableAttrRefs(broken)).toThrow(/ATTRIBUTE_REGISTRY_V1/);
  });

  it("a killed attribute is caught by the sweep even where no ATTR entry names it", () => {
    // `jumping` (ADR-003) is read ONLY through §11.3's tunables term lists —
    // there is no `ATTR.jumping`, deliberately, because adding a term was meant
    // to be a data edit. So before the sweep it had no load-time guard at all,
    // and a registry kill would have surfaced on the first contested catch.
    expect(TUNABLE_ATTR_REFS.map((r) => r.id)).toContain("jumping");
    expect((ATTR as Readonly<Record<string, unknown>>)["jumping"]).toBeUndefined();
  });
});
