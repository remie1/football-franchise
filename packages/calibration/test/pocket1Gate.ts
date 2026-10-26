/**
 * ADR-089 step 1 — THE ONE GATE FOR TESTS THAT NEED THE ENGINE'S `pocket-1` (stream K-b, part 1).
 *
 * Part 1 of K-b (calibration) was built before the engine stream E-b landed: in that tree the
 * engine reads none of the `pocket-1` blocks, so a game played under `pocket-1.s1` plays exactly
 * `legacy`. Every assertion that needs a `pocket-1` game to play DIFFERENTLY is written, behind
 * `describe.skipIf(!POCKET_1_ENGINE_LANDED)`, and listed in the K-b part 1 report.
 *
 * TODO(ADR-089 K-b2): once this tree is rebased onto E-b, set this to `true` (or delete the gate and
 * its uses) and finish each gated test; nothing else reads it.
 */
export const POCKET_1_ENGINE_LANDED = false;
