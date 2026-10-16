/**
 * ADR-073 step 3.2b — `protectionOptions`: the line's two pre-snap options, stated on the call.
 *
 * Over the whole pass corpus against every defensive card: a SLIDE says the line may check it, a MAN
 * protection says nothing about a slide, and the check-release list is the card's check-release men
 * who released, in card order, by PlayerId. The call it returns still passes the corpus's coherence
 * check, extended with contracts P3's four rules, and the instantiated offence is left as it was.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import type { OffensivePlayCall } from "@ff/contracts";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { instantiateDefense, instantiatePass, protectionOptions } from "../src/instantiate.js";
import { PASS_CONCEPTS } from "../src/passConcepts.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEEP_CHART, checkCoherence } from "./fixtures.js";

describe("ADR-073 P3: protectionOptions over the pass corpus", () => {
  it("states each option exactly where the card allows it, and nothing else changes", () => {
    let slides = 0;
    let men = 0;
    let listed = 0;
    let pulledInLeftOut = 0;
    let emptyOmitted = 0;
    for (const concept of PASS_CONCEPTS) {
      const unit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      for (const card of DEFENSIVE_CARDS) {
        const defense = instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), {
          formation: concept.formation,
          unit,
        });
        const offense = instantiatePass(concept, unit, defense);
        const before = structuredClone(offense);
        const options = protectionOptions(concept, unit, offense);
        const where = `${concept.id} vs ${card.id}`;
        expect(isDeepStrictEqual(offense, before), `${where}: offense was changed`).toBe(true);
        if (offense.call.kind !== "PASS") throw new Error(`${where}: not a dropback`);
        const call: OffensivePlayCall = offense.call;
        const scheme = call.protectionScheme;
        if (scheme === undefined) throw new Error(`${where}: no scheme`);

        // Everything the scheme already said is said again, unchanged.
        const { checkRelease: _c, ...rest } = options as typeof options & { slideCheck?: true };
        const { slideCheck: _s, ...restNoSlide } = rest as typeof rest & { slideCheck?: true };
        expect(restNoSlide, where).toEqual(scheme);

        if (options.kind === "SLIDE") {
          slides += 1;
          expect(options.slideCheck, where).toBe(true);
        } else {
          men += 1;
          expect("slideCheck" in options, where).toBe(false);
        }

        // The check-release men who released: the card's roles, minus the pulled-in, with a route.
        const runners = call.routes.map((r) => String(r.receiver));
        const blockers = new Set(call.protection.map((p) => String(p.blocker)));
        const expected = concept.protection.checkRelease
          .filter((role) => !offense.pulledIntoProtection.includes(role))
          .map((role) => unit[role])
          .filter((id) => id !== undefined && runners.includes(String(id)));
        if (expected.length === 0) {
          emptyOmitted += 1;
          expect("checkRelease" in options, where).toBe(false);
        } else {
          listed += 1;
          expect(options.checkRelease, where).toEqual(expected);
        }
        for (const id of options.checkRelease ?? []) {
          expect(runners, where).toContain(String(id));
          expect(blockers.has(String(id)), where).toBe(false);
          expect((scheme.available ?? []).map(String), where).not.toContain(String(id));
        }
        expect(new Set(options.checkRelease ?? []).size, where).toBe((options.checkRelease ?? []).length);
        if (offense.pulledIntoProtection.some((role) => concept.protection.checkRelease.includes(role))) {
          pulledInLeftOut += 1;
          for (const role of offense.pulledIntoProtection) {
            const id = unit[role];
            if (id !== undefined) expect(options.checkRelease ?? [], where).not.toContain(id);
          }
        }

        const quarterback = unit.QB;
        if (quarterback === undefined) throw new Error(`${where}: no quarterback`);
        const report = checkCoherence(quarterback, { ...call, protectionScheme: options }, defense.call);
        expect(report.problems, where).toEqual([]);
      }
    }
    // Non-vacuity: both kinds of protection, a listed man, a pulled-in man, and an empty list.
    expect(slides).toBeGreaterThan(0);
    expect(men).toBeGreaterThan(0);
    expect(listed).toBeGreaterThan(0);
    expect(pulledInLeftOut).toBeGreaterThan(0);
    expect(emptyOmitted).toBeGreaterThan(0);
  });

  it("the extended coherence check refuses each of P3's four incoherent lists", () => {
    const concept = PASS_CONCEPTS.find((c) => c.protection.checkRelease.length > 0);
    if (concept === undefined) throw new Error("no concept with a check-release man");
    const unit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
    const card = DEFENSIVE_CARDS[0];
    if (card === undefined) throw new Error("no defensive card");
    const defense = instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), {
      formation: concept.formation,
      unit,
    });
    const offense = instantiatePass(concept, unit, defense);
    if (offense.call.kind !== "PASS" || offense.call.protectionScheme === undefined) throw new Error("bad call");
    const call = offense.call;
    const scheme = call.protectionScheme;
    if (scheme === undefined) throw new Error("bad call");
    const quarterback = unit.QB;
    if (quarterback === undefined) throw new Error("no quarterback");
    const runner = call.routes[0]?.receiver;
    const blocker = call.protection[0]?.blocker;
    if (runner === undefined || blocker === undefined) throw new Error("bad call");
    const problems = (protectionScheme: typeof scheme): readonly string[] =>
      checkCoherence(quarterback, { ...call, protectionScheme }, defense.call).problems;

    expect(problems({ ...scheme, checkRelease: [runner, runner] }).join()).toContain("listed twice");
    expect(problems({ ...scheme, checkRelease: [blocker] }).join()).toContain("runs no route");
    expect(problems({ ...scheme, checkRelease: [blocker] }).join()).toContain("already blocking");
    expect(
      problems({ ...scheme, available: [...(scheme.available ?? []), runner], checkRelease: [runner] }).join(),
    ).toContain("available for pickup");
    const man = { ...scheme, kind: "MAN" as const, ...{ slideCheck: true as const } };
    expect(problems(man).join()).toContain("MAN protection states slideCheck");
  });
});
