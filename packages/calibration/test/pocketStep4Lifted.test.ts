/**
 * ADR-089 step 4 — THE STREAM'S REBUILD OF `from` AGAINST THE ENGINE'S, ON PLAYED STEP-4 GAMES
 * (contracts-guardian G-6; risk R20).
 *
 * The s4 folds read each contest's approach, `from` and `seen` off the `QB_HIT` (SHED or SACK) that
 * names it. `contactClassOf` and `contactFromOf` rebuild the same facts from `RUSH_THREAT`s and the
 * play's STEP_UPs; they are kept as a cross-check only. This file holds, on games the engine plays
 * under the step-4 D arms, that the rebuild equals the engine's own `from` (the `contactFrom` it
 * writes on the hit) on every contest, that every contest is named by its hit, and that the folds
 * read the played streams with no problem.
 *
 * While petitions P6, P7 and P8 are out of contracts no step-4 game can be played (the engine and
 * calibration refuse every such bundle), so the file is skipped; it runs from the lift on. Before
 * the lift it was run in a scratch copy with the gates flipped and the log writing the three
 * records onto the stream (`review/sack-wiring.md`).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { armById, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { step4PetitionsIn } from "../src/pocket/rules.js";
import { emptyS4Fold, foldS4Game, s4PlaysOf, s4Problems } from "../src/pocket/s4Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";

/** The design, the pricing build, contact alone on today's line, and the BEHIND or NEVER tilt alone. */
const ARMS: readonly ArmId[] = ["D1", "D2", "D3", "D11"];
const GAMES = 20;
/**
 * The contests the rebuild cannot compare (a man reset on the contest's own tick) stay rare: seen
 * once in 499 contests on D4 (review 2 S3). More than this many in a hundred is a fault to look at,
 * not a skip to pass over.
 */
const UNCOMPARED_PER_HUNDRED = 2;

describe.skipIf(!step4PetitionsIn())("ADR-089 step 4 — on played step-4 games, the stream's from equals the engine's", () => {
  for (const id of ARMS) {
    it(`${id}: every contest is named by its QB_HIT, whose from is the stream's rebuild; the folds find no problem`, () => {
      const arm = armById(id);
      let contests = 0;
      let sacks = 0;
      let compared = 0;
      for (const league of ["flat", "gen"] as const) {
        goldenGames(league, (o) => {
          const events = o.events as readonly MatchEventEnvelope[];
          for (const play of s4PlaysOf(events, arm.tunables)) {
            expect(play.s4).toBe(true);
            for (const c of play.contests) {
              contests += 1;
              const where = `${id} ${league} ${play.playId} ${c.rngLabel}`;
              expect(c.hit, where).toBeDefined();
              expect(c.hit!.phase, where).toBe(c.band === "RUSHER_SACKS" ? "SACK" : "SHED");
              // The rebuild has no threat for a man whose latest RUSH_THREAT on the stream is a RESET
              // (the engine can contest a man reset on the contest's own tick); the hit still carries
              // his facts, and the folds read those. Wherever the rebuild has one, it is the engine's.
              if (c.derivedFrom !== undefined) {
                compared += 1;
                expect(c.hit!.from, where).toBe(c.derivedFrom);
              }
              if (c.band === "RUSHER_SACKS") sacks += 1;
            }
          }
          const f = emptyS4Fold();
          foldS4Game(f, events, arm.tunables);
          expect(f.fromMismatch).toBe(0);
          expect(s4Problems(f)).toEqual([]);
        }, { tunables: arm.tunables, callerVersion: STEP1_CALLER, first: GAMES });
      }
      expect(contests).toBeGreaterThan(0);
      expect(compared).toBeGreaterThan(0);
      expect(sacks).toBeGreaterThan(0);
      expect((contests - compared) * 100, `${id}: ${String(contests - compared)} of ${String(contests)} contests not compared`).toBeLessThanOrEqual(UNCOMPARED_PER_HUNDRED * contests);
    });
  }
});
