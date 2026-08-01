/**
 * THE PLAY-SCOPE INSTRUMENT FOR §8.7's OPENNESS GAIN — ITS SELF-TESTS, AND THE
 * CORPUS ADR-048 IS PRICED OVER.
 *
 * ⛔ THIS FILE PREDATES THE CHANGE IT PRICES. That ordering is a hard rule, not a
 *    preference: `docs/design/calibration.md` §5.3's standing rule ends *"build
 *    the play-scope instrument BEFORE the change, not after — a null produced by
 *    the wrong instrument is indistinguishable from a null, and that is the whole
 *    problem."* A corpus arm would have reported ADR-048's convergence fix as a
 *    null (ADR-045 §3a.5 established the mechanism the hard way: a cell that
 *    moved DOWN produced a corpus reading of +0.03, the wrong SIGN, because
 *    composition shifted underneath it).
 *
 * ============ WHAT WOULD MAKE EACH OF THESE GO RED? (backlog entry 55) ============
 *
 * Stated per case below, in the case's own comment, because the rule is that the
 * answer lives NEXT TO the instrument rather than in a dispatch. The harness
 * itself answers *nothing* — see the block comment in `harness/playScope.ts`: a
 * pricing harness is a measurement and never reddens, which is precisely why its
 * five controls carry the whole burden.
 */
import { describe, expect, it } from "vitest";
import { TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import {
  READ_SYSTEMS,
  buildCleanPocketScenario,
  buildMixedCoverageScenario,
  buildScenario,
  buildShortConceptScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
  withReadSystem,
} from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import {
  carriesBrokenRoute,
  carriesCoverageRep,
  footballDigest,
  formatCounts,
  pricePlayScope,
  streamDigest,
} from "./harness/playScope.js";
import type { PlayCase } from "./harness/playScope.js";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { opennessAt } from "../src/resolve/route.js";

// ---------------------------------------------------------------------------
// THE CORPUS
// ---------------------------------------------------------------------------

/**
 * SIX PLAY CARDS, ROTATED, WITH THE SEED VARYING PER PLAY.
 *
 * ADR-045 §3a.2 priced its cell over `buildScenario` alone at 4,000 seeds. That
 * is the precedent and it is sound at play scope — plays are causally
 * independent given entering state and seed — but ONE play card is one
 * coverage/route/pressure geometry, and this subject is conditioned on the
 * COVERAGE REP, so a corpus that only ever runs Cover 1 press against the same
 * three routes can only ever produce the band distribution that card produces.
 *
 * So the rotation is over cards that differ in the thing the subject reads:
 * man press, man off, zone, mixed man/zone, a clean pocket (long holds, so many
 * post-break ticks) and a stalled one (short holds, so few). The read system is
 * rotated across them for the same reason §8.1's own fixture exists.
 *
 * ⚠ THIS IS A FIXTURE CORPUS, NOT A LEAGUE. It states nothing about how often a
 *   band occurs in a season; `packages/calibration` owns population. What it
 *   bounds is WHERE a change can act, which is the only thing an exclusive count
 *   ever bounds.
 */
const CARDS: readonly (readonly [string, () => Scenario])[] = [
  ["man-press", () => buildScenario()],
  ["man-clean-pocket", () => buildCleanPocketScenario()],
  ["zone", () => buildZoneScenario()],
  ["mixed", () => buildMixedCoverageScenario()],
  ["short-concept", () => buildShortConceptScenario()],
  ["stalled-pocket", () => buildStalledPocketScenario()],
];

export function opennessCorpus(plays: number): PlayCase[] {
  const built = CARDS.map(([label, make]) => [label, make()] as const);
  const cases: PlayCase[] = [];
  for (let i = 0; i < plays; i++) {
    const entry = built[i % built.length];
    if (entry === undefined) throw new Error("@ff/engine test: empty card rotation");
    const [label, base] = entry;
    const system = READ_SYSTEMS[Math.floor(i / built.length) % READ_SYSTEMS.length];
    if (system === undefined) throw new Error("@ff/engine test: empty read-system rotation");
    const scenario = withReadSystem(base, system);
    cases.push({
      label: `${label}/${system}#${String(i)}`,
      seed: `openness-${String(i)}`,
      state: scenario.state,
      calls: scenario.calls,
    });
  }
  return cases;
}

// ---------------------------------------------------------------------------
// THE THREE CONTROLS
// ---------------------------------------------------------------------------

describe("play-scope pricing harness — the controls that carry its credibility", () => {
  /**
   * ⚠ WHAT WOULD MAKE THIS GO RED?
   * A harness whose two arms are not genuinely paired — a shared RNG advanced
   * between arms, a mutated scenario, a case list consumed in a different order.
   * With `treatment === control` every honest implementation returns zero on
   * every difference count, so any non-zero here is the harness and never the
   * engine.
   *
   * ⚠ WHAT IT CANNOT SEE: a comparator that returns "identical" for everything.
   *   That is case 2's subject, and neither case is worth anything without the
   *   other — ADR-047 §4.5: *an exclusive count of 0 is what a correct replay
   *   returns AND what a broken reconstruction returns.*
   */
  it("NULL CONTROL — identical trees produce zero differences and a full identical complement", () => {
    const cases = opennessCorpus(60);
    const counts = pricePlayScope({
      control: TUNABLES,
      treatment: TUNABLES,
      cases,
      carriesSubject: carriesBrokenRoute,
    });
    expect(counts.streamDiffers).toBe(0);
    expect(counts.exclusive).toBe(0);
    expect(counts.differsWithoutSubject).toBe(0);
    expect(counts.streamIdentical).toBe(cases.length);
    // And the corpus is not vacuous: the subject is present on it. A null control
    // over a corpus where nothing breaks open would be green for the wrong reason.
    expect(counts.raw).toBeGreaterThan(0);
  });

  /**
   * ⚠ WHAT WOULD MAKE THIS GO RED?
   * A comparator blind to a difference the engine really produced — a digest that
   * drops the field that moved, a projection with a typo'd key, an arm that
   * silently reuses the control tree. The perturbation chosen is
   * `manCoverage.bands.0.openness`, a cell ADR-045 proved live at play scope;
   * if moving 70 to 20 does not change a single play's football, the harness is
   * broken, not the mechanic.
   *
   * ⚠ WHAT IT CANNOT SEE: whether the projection keeps too MUCH. That is case 3.
   *
   * ⚠ AND IT USES A DIFFERENT `carriesSubject` — deliberately, and the reason is
   *   worth keeping. `manCoverage.bands.0.openness` acts the instant the rep
   *   resolves; §8.7's gain acts only on the ticks AFTER it. Handing this arm the
   *   gain's population made `differsWithoutSubject` read 6, which was the
   *   isolation check correctly reporting that the predicate did not describe the
   *   perturbation. A subject predicate is a claim about a MECHANISM, never a
   *   reusable default.
   */
  it("POSITIVE CONTROL — a cell known to be live moves the football count off zero", () => {
    const perturbed = applyTunablePatch(TUNABLES, {
      tunableId: "manCoverage.bands.0.openness",
      currentValue: TUNABLES.manCoverage.bands[0]?.openness ?? 0,
      proposedValue: 20,
      evidence: "engine/test/opennessGainPlayScope.test.ts — positive control",
      expectedEffect: "the differ must be able to see a difference at all",
    });
    const counts = pricePlayScope({
      control: TUNABLES,
      treatment: perturbed,
      cases: opennessCorpus(60),
      carriesSubject: carriesCoverageRep,
    });
    expect(counts.streamDiffers).toBeGreaterThan(0);
    expect(counts.exclusive).toBeGreaterThan(0);
    expect(counts.differsWithoutSubject).toBe(0);
  });

  /**
   * ⚠ WHAT WOULD MAKE THIS GO RED?
   * The stream/football split ceasing to be a real split. Two halves, and each
   * has its own way of failing:
   *   - keeping an openness number in the football projection (then every
   *     openness move counts as a football difference, and `exclusive` becomes a
   *     second spelling of `streamDiffers`);
   *   - dropping the fields that ARE the football (then `exclusive` is zero for
   *     everything and the harness reports every change as inert).
   * Both are checked, on hand-built streams, so neither depends on the mechanic.
   */
  it("DIGEST DISCRIMINATION — the football digest ignores an openness move and not a result move", () => {
    const scenario = buildScenario();
    const events = simulatePassPlay(scenario.state, scenario.calls, "digest-probe", TUNABLES).events;
    expect(events.length).toBeGreaterThan(0);

    // (a) move every published openness number; the football must not notice.
    const opennessMoved = events.map((e) => {
      const p = e.event.payload as Record<string, unknown>;
      const bumped: Record<string, unknown> = { ...p };
      let touched = false;
      for (const key of ["openness", "actualOpenness", "perceivedOpenness", "effectiveOpenness"]) {
        if (typeof bumped[key] === "number") {
          bumped[key] = (bumped[key] as number) + 3;
          touched = true;
        }
      }
      return touched ? { ...e, event: { ...e.event, payload: bumped } } : e;
    }) as typeof events;
    expect(streamDigest(opennessMoved)).not.toBe(streamDigest(events));
    expect(footballDigest(opennessMoved)).toBe(footballDigest(events));

    // (b) move the play result; the football must notice.
    const resultMoved = events.map((e) => {
      if (e.event.type !== "PLAY_RESULT") return e;
      const p = e.event.payload as { yards: number };
      return { ...e, event: { ...e.event, payload: { ...p, yards: p.yards + 1 } } };
    }) as typeof events;
    expect(footballDigest(resultMoved)).not.toBe(footballDigest(events));
  });

  /**
   * The population statement §5.3 requires beside every count. Not an assertion
   * about the mechanic — an assertion that the corpus is not blind to it.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A corpus rotation that stopped producing
   *   broken routes — every card sacking or throwing away before anybody's break.
   *   That is exactly the `freeRunnerArrivalSeconds` failure §5.3's
   *   live-population precondition exists to refuse (0.13% of dropbacks), and it
   *   would make every count below meaningless rather than small.
   *
   * ⚠ THE FLOOR IS 0.15 AND THE MEASURED SHARE IS ~0.32. The gap is deliberate:
   *   the floor is a REFUSAL THRESHOLD, not a target, and it is set low enough
   *   that ordinary corpus drift does not redden it. It is set at all because a
   *   subject present on a handful of plays produces a number with the shape of a
   *   result and the content of noise.
   *
   * ⚠ AND THE MEASURED SHARE IS ITSELF A FINDING, RECORDED NOT FIXED: on roughly
   *   two plays in three the ball is gone within a tick of the break, so §8.7's
   *   gain never runs. That is a real property of the engine's decision timing
   *   and it BOUNDS every price this file can produce. It is not a reason to
   *   reweight the corpus toward holding plays — a corpus chosen to make a
   *   subject look large is the compensation-debt pattern wearing a population's
   *   clothes.
   */
  it("LIVE POPULATION — the corpus actually produces post-break ticks", () => {
    const cases = opennessCorpus(60);
    const withBreak = cases.filter((c) =>
      carriesBrokenRoute(simulatePassPlay(c.state, c.calls, c.seed, TUNABLES).events),
    ).length;
    expect(withBreak / cases.length).toBeGreaterThan(0.15);
  });

  /** The control arm's own claim, asserted. See the function's comment below. */
  it("CONTROL FIDELITY — the flat arm reproduces §8.7's pre-ADR-048 arithmetic exactly", () => {
    expect(() => { assertFlatControlIsTheOldMechanic(); }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// THE PRICING RUN
// ---------------------------------------------------------------------------

/**
 * ADR-048's price, at play scope, against the pre-ADR-048 tree.
 *
 * Env-gated because it is a measurement over thousands of plays and not a gate;
 * the numbers it produces live in ADR-048 §4 and are re-derivable from here:
 *
 *     FF_OPENNESS_PRICE=1 FF_OPENNESS_PRICE_PLAYS=4000 pnpm --filter @ff/engine test
 *
 * The control arm is the FLAT tree — `contestGain` neutralised so that every
 * contest class gains at §8.7's committed rate for every step, which is exactly
 * the pre-ADR-048 mechanic. Building the control by neutralising rather than by
 * keeping a copy of the old code means the control cannot drift away from what
 * the engine actually did.
 */
export function flatGainTree(t: Tunables): Tunables {
  const flat = {
    ...t,
    route: {
      ...t.route,
      contestGain: {
        ...t.route.contestGain,
        burstSteps: 0,
        byContest: {
          TRAILING: { burst: 1, steady: 1 },
          EVEN: { burst: 1, steady: 1 },
          IN_FRONT: { burst: 1, steady: 1 },
        },
      },
    },
  };
  return flat as unknown as Tunables;
}

/**
 * ⚠ THE CONTROL IS A CLAIM AND IS ASSERTED, NOT ASSUMED.
 *
 * `flatGainTree` says *"this tree reproduces the pre-ADR-048 mechanic"*. Nothing
 * about a spread and two literals makes that true, and a control that silently
 * stops being the old behaviour turns every price below into a diff between two
 * arbitrary trees. So the claim is pinned against §8.7's own arithmetic —
 * `base + gain × steps` — at the three route depths and both sides of the decay
 * point, for all three contest classes, which is the whole of what the flat
 * mechanic ever did.
 *
 * ⚠ WHAT WOULD MAKE THIS GO RED? A `contestGain` shape that `burstSteps: 0` and
 *   a uniform multiplier of 1 no longer neutralise — for instance a rate that
 *   stopped being a multiple of `opennessGainPerTick`, or a fourth contest class.
 *   That is the case where the control has quietly become something else, and it
 *   is the only way this instrument can lie.
 */
export function assertFlatControlIsTheOldMechanic(): void {
  const flat = flatGainTree(TUNABLES);
  const t = flat.route;
  const step = TUNABLES.clock.tickStepSeconds;
  for (const contest of ["TRAILING", "EVEN", "IN_FRONT"] as const) {
    for (const ready of [1.0, 1.5, 2.0, 2.5]) {
      for (let tick = ready; tick <= TUNABLES.clock.maxTick + 1e-9; tick += step) {
        const gainSteps = Math.max(0, (Math.min(tick, t.decayStartsAtSeconds) - ready) / step);
        const decaySteps = Math.max(0, (tick - t.decayStartsAtSeconds) / step);
        const expected = Math.round(
          Math.min(
            t.maxOpenness,
            Math.max(
              t.minOpenness,
              50 + t.opennessGainPerTick * gainSteps - t.opennessDecayPerTick * decaySteps,
            ),
          ),
        );
        const actual = opennessAt(flat, 50, ready, tick, contest);
        if (actual !== expected) {
          throw new Error(
            `@ff/engine test: flat control is not §8.7 at ${contest} ready=${String(ready)} ` +
              `tick=${String(tick)}: ${String(actual)} vs ${String(expected)}`,
          );
        }
      }
    }
  }
}

const PRICE = process.env["FF_OPENNESS_PRICE"] === "1";
const PRICE_PLAYS = Number(process.env["FF_OPENNESS_PRICE_PLAYS"] ?? "1200");

describe.skipIf(!PRICE)("ADR-048 — priced at PLAY scope against the flat gain", () => {
  it("counts raw, stream and football reach", () => {
    const cases = opennessCorpus(PRICE_PLAYS);
    const counts = pricePlayScope({
      control: flatGainTree(TUNABLES),
      treatment: TUNABLES,
      cases,
      carriesSubject: carriesBrokenRoute,
    });
    // eslint-disable-next-line no-console
    console.log(`\n${formatCounts(counts)}\n`);
    for (const [shape, n] of counts.exclusiveShapes.slice(0, 12)) {
      // eslint-disable-next-line no-console
      console.log(`  ${String(n).padStart(5)}  ${shape}`);
    }
    // The one thing the pricing run asserts: the arms were isolated. Every other
    // number is reported, never gated — a price is not a target.
    expect(counts.differsWithoutSubject).toBe(0);
  });
});
