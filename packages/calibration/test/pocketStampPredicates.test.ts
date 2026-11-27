/**
 * ADR-089 step 5 — THE STAMP PREDICATES (plan §1.3; critique 1 B1): `pocketStepOf`, `readsStep3Facts`
 * and `readsStep4Facts` in `src/pocket/rules.ts`.
 *
 * Before step 5 five readers keyed on the exact name `pocket-1.s4` (`collect.ts`'s `pk.s4`,
 * `s4Stream.ts`'s `isS4Rules`, M6's and M3's step-4 folds) and `readsStep3Facts` on `s3 || s4`; under
 * an s5 stamp they would silently fall back to the tick clock and the legacy hit stand-in. Here:
 *
 *  1. `pocketStepOf` maps s1 to s4 to 1 to 4 and both step-5 names to 5; legacy, an absent name and
 *     any other name (a near miss included) to undefined.
 *  2. Every name that is not a step-5 name reads exactly as the exact-name tests read it before
 *     (copied below as they stood at 517002e): `readsStep3Facts` is s3 or s4, the step-4 readers s4.
 *  3. `pocket-1.s5a` and `pocket-1.s5b` read step 3's and step 4's facts.
 *  4. `isS4Rules` (s4Stream) is `readsStep4Facts`.
 *  5. ADR-089 step 6 (step-6 plan §1.1, §3.1 item 3): `pocket-1.s6` maps to 6 and reads step 3's, step
 *     4's and step 6's facts (`readsStep6Facts`); every s1 to s5a stamp, `pocket-1.s5b` (relocated
 *     after step 7 by the played order, still step 5's) and every other name read exactly as before,
 *     and none reads step 6's facts.
 *
 * The plays that read raw release and the `QB_HIT` construct under an s5 stamp are in
 * `pocketStep4Stream.test.ts` (the hand-built streams live there).
 */
import { describe, expect, it } from "vitest";
import {
  LEGACY_RULES,
  POCKET_1_S1_RULES,
  POCKET_1_S2_RULES,
  POCKET_1_S3_RULES,
  POCKET_1_S4_RULES,
  POCKET_1_S5A_RULES,
  POCKET_1_S5B_RULES,
  POCKET_1_S6_RULES,
  pocketStepOf,
  readsStep3Facts,
  readsStep4Facts,
  readsStep6Facts,
} from "../src/pocket/rules.js";
import { isS4Rules } from "../src/pocket/s4Stream.js";

/** The exact-name tests as they stood at 517002e (rules.ts:354, collect.ts:1711, s4Stream.ts:93, m6Contact.ts:508, m3SackerMix.ts:145). */
const OLD = {
  readsStep3Facts: (name: string | undefined): boolean => name === "pocket-1.s3" || name === "pocket-1.s4",
  s4: (name: string | undefined): boolean => name === "pocket-1.s4",
};

const S5 = ["pocket-1.s5a", "pocket-1.s5b"] as const;
/** Every name a stream of steps 0 to 4 carries, and near misses no stream carries. */
const BEFORE_S5: readonly (string | undefined)[] = [
  undefined,
  LEGACY_RULES,
  POCKET_1_S1_RULES,
  POCKET_1_S2_RULES,
  POCKET_1_S3_RULES,
  POCKET_1_S4_RULES,
  "",
  "pocket-1",
  "pocket-1.s5",
  "pocket-1.s6a",
  "pocket-1.S6",
  "pocket-1.s5c",
  "pocket-1.S5A",
  "pocket-1.s4@fnv1a:8edb4bad",
  "pocket-1.s5a@fnv1a:00000000",
];

describe("pocketStepOf (plan §1.3)", () => {
  it("maps s1 to s4 to their steps and both step-5 names to 5", () => {
    expect([POCKET_1_S1_RULES, POCKET_1_S2_RULES, POCKET_1_S3_RULES, POCKET_1_S4_RULES].map(pocketStepOf)).toEqual([1, 2, 3, 4]);
    for (const name of S5) expect(pocketStepOf(name), name).toBe(5);
  });

  it("maps legacy, an absent name and any other name to undefined", () => {
    for (const name of [undefined, LEGACY_RULES, "", "pocket-1", "pocket-1.s5", "pocket-1.s6a", "pocket-1.S6", "pocket-1.s6@fnv1a:00000000", "pocket-1.s7", "pocket-1.s5c", "pocket-1.S5A", "pocket-1.s4@fnv1a:8edb4bad", "pocket-1.s5a@fnv1a:00000000"]) {
      expect(pocketStepOf(name), String(name)).toBeUndefined();
    }
  });
});

describe("every s1 to s4 stamp reads exactly as before", () => {
  it.each(BEFORE_S5.map((n) => [String(n), n] as const))("%s", (_, name) => {
    expect(readsStep3Facts(name)).toBe(OLD.readsStep3Facts(name));
    expect(readsStep4Facts(name)).toBe(OLD.s4(name));
    expect(isS4Rules(name)).toBe(OLD.s4(name));
  });

  it("reads step 3's facts on s3 and s4 only, step 4's on s4 only", () => {
    expect(BEFORE_S5.filter(readsStep3Facts)).toEqual([POCKET_1_S3_RULES, POCKET_1_S4_RULES]);
    expect(BEFORE_S5.filter(readsStep4Facts)).toEqual([POCKET_1_S4_RULES]);
  });
});

describe("step 5's names read step 3's and step 4's facts (raw release, the QB_HIT construct, the s4 folds)", () => {
  it.each(S5.map((n) => [n] as const))("%s", (name) => {
    expect(readsStep3Facts(name)).toBe(true);
    expect(readsStep4Facts(name)).toBe(true);
    expect(isS4Rules(name)).toBe(true);
    // The exact-name tests they replace would have read an s5 play as legacy's: the fault this fixes.
    expect(OLD.s4(name)).toBe(false);
    expect(OLD.readsStep3Facts(name)).toBe(false);
  });
});

describe("step 6's name (ADR-089 step 6, plan §1.1, §3.1 item 3)", () => {
  /** Every name a stream of steps 0 to 5a carries (and 5b's), with the step pocketStepOf gave it before step 6. */
  const BEFORE_S6: readonly (readonly [string | undefined, number | undefined])[] = [
    [undefined, undefined],
    [LEGACY_RULES, undefined],
    [POCKET_1_S1_RULES, 1],
    [POCKET_1_S2_RULES, 2],
    [POCKET_1_S3_RULES, 3],
    [POCKET_1_S4_RULES, 4],
    [POCKET_1_S5A_RULES, 5],
    [POCKET_1_S5B_RULES, 5],
  ];

  it("maps pocket-1.s6 to 6, which reads step 3's, step 4's and step 6's facts", () => {
    expect(POCKET_1_S6_RULES).toBe("pocket-1.s6");
    expect(pocketStepOf(POCKET_1_S6_RULES)).toBe(6);
    expect(readsStep3Facts(POCKET_1_S6_RULES)).toBe(true);
    expect(readsStep4Facts(POCKET_1_S6_RULES)).toBe(true);
    expect(isS4Rules(POCKET_1_S6_RULES)).toBe(true);
    expect(readsStep6Facts(POCKET_1_S6_RULES)).toBe(true);
  });

  it.each(BEFORE_S6.map(([n, step]) => [String(n), n, step] as const))("%s reads as before and reads no step-6 fact", (_, name, step) => {
    expect(pocketStepOf(name)).toBe(step);
    expect(readsStep3Facts(name)).toBe((step ?? 0) >= 3);
    expect(readsStep4Facts(name)).toBe((step ?? 0) >= 4);
    expect(readsStep6Facts(name)).toBe(false);
  });

  it("the relocated pocket-1.s5b stays step 5's: it plays after step 7 but carries no step-6 part", () => {
    expect(pocketStepOf(POCKET_1_S5B_RULES)).toBe(5);
    expect(readsStep6Facts(POCKET_1_S5B_RULES)).toBe(false);
  });

  it("no near miss reads step 6's facts", () => {
    for (const name of BEFORE_S5) expect(readsStep6Facts(name), String(name)).toBe(false);
    for (const name of ["pocket-1.s6a", "pocket-1.S6", "pocket-1.s6@fnv1a:00000000", "pocket-1.s7", "s6"]) expect(readsStep6Facts(name), name).toBe(false);
  });
});
