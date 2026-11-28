/**
 * ADR-089 step 6: THE READERS ON PLAYED STEP-6 GAMES, AND THE CROSS-CHECK (step-6 plan §3.2 K2;
 * critique 2 #7; S-14, `s6.readersAgree`).
 *
 * Q-2g proves no old reading moved; it cannot show that a reader misreads s6. This file reads the
 * golden games the engine plays under H0 (every part), the parts that change what the readers see
 * alone (H7 the side-aware catch, H8 the caught escape as contact, H12 the rescoring) and HB0 (the
 * bench with every part), and holds, play for play:
 *
 *  - **the escape roll:** the step-6 reading has one escape roll per `scramble` CHECK, each outcome
 *    the CHECK band's under the arm's table, every catch either the play's sack on the roll's tick or
 *    shed (a `QB_HIT` SHED, and the play goes on), at most one roll spending the escape under the cap;
 *  - **the movement CHECK:** one deadline pick per `:deadline` CHECK, each after `QB_PURSUIT`, every
 *    OUT_OF_POCKET throwaway on a deadline pick's tick with P10's flag true; no forced act after
 *    pursuit; the cross-check's deadline picks the same count;
 *  - **the sack:** the dropback reader, the step-6 reading, the metrics fold and the engine's statline
 *    count the same sacks (the failed scrambles the marker scores included, and only on a marker arm),
 *    and the credit each sack's reader gives is, man by man, the statline's `defense.sacks` (a catch
 *    that names nobody is credited as the statline credits it, to the last man ARRIVED on the play,
 *    else nobody; both counted apart);
 *  - **the pocket:** the fold's whole-play status and the rows' pocket agree on every dropback;
 *  - **the contact at the escape site:** the step-4 contact fold, the s4 fold and the step-6 reading
 *    count the same contests at the escape roll;
 *  - the step-2, step-4 and step-5a folds read the streams with no problem (but step 2's arrival
 *    falsifier, which holds only before step 4's contact: a shed arrival plays on). The M2 replays (M2 STREAM
 *    in step 2's folds, and the replay the movement cross-check rides on) read no step-3 fact, so they
 *    are left out here as every step-3 and later harness leaves them out (`playStep3Arm`'s
 *    `m2 = !s3`); the cross-check's deadline picks are read without the replay.
 *
 * While petitions P9 to P12 are out of contracts no step-6 game can be played (the engine and
 * calibration refuse every tree carrying `pocket.outs`), so the file is skipped; it runs from the lift
 * on. Before the lift it was run in a scratch copy with the gates flipped and the log writing the
 * step-6 records onto the stream (`step6/build/cal-2.md`).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { buildStep6Arm, step6ArmDef } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { emptyM3Fold, foldM3Dropback, s4SackCreditOf, s6SackCreditOf, sackCreditsOf } from "../src/pocket/m3SackerMix.js";
import { crossCheckMovement, emptyM6Fold, emptyM6Step4Fold, foldM6Step4Game, playersOfSnapshot } from "../src/pocket/m6Contact.js";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { step6PetitionsIn } from "../src/pocket/rules.js";
import { emptyS2Folds, forcedActsOf, s2Checks, s2ContextOf, s2PlaysOf, s2Problems } from "../src/pocket/s2Stream.js";
import { emptyS4Fold, foldS4Game, s4Problems } from "../src/pocket/s4Stream.js";
import { emptyS5Fold, foldS5Game } from "../src/pocket/s5Stream.js";
import { emptyS6RowsFold, foldS6RowsGame } from "../src/pocket/s6Rows.js";
import { escapeBandOutcomeOf, isDeadlinePickLabel, OUT_OF_POCKET, readS6Play } from "../src/pocket/s6Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { playsOf, readDropback } from "../src/pocket/throwClass.js";

const ARMS = ["H0", "H7", "H8", "H12", "HB0"] as const;
const GAMES = 10;

describe.skipIf(!step6PetitionsIn())("ADR-089 step 6: on played step-6 games the readers agree with the stream and the statline (lifts with P9 to P12)", () => {
  for (const id of ARMS) {
    it(
      `${id}: the escape roll, the movement CHECK and the sack, read by every reader, play for play`,
      () => {
        const arm = buildStep6Arm(step6ArmDef(id)!);
        const { tunables } = arm;
        const outs = tunables.pocket.outs!;
        const tally = {
          plays: 0,
          rolls: 0,
          catches: 0,
          sheds: 0,
          deadlinePicks: 0,
          sacks: 0,
          failedScrambleSacks: 0,
          nobody: 0,
          statlineFallbacks: 0,
          atEscape: 0,
          standInByCatch: 0,
          ruleThrowaways: 0,
          ruleHolds: 0,
          spentHolds: 0,
        };
        for (const league of GOLDEN_LEAGUES) {
          goldenGames(
            league,
            (o, snapshot) => {
              const events = o.events as readonly MatchEventEnvelope[];
              const positions = positionsFromSnapshot(snapshot);
              const credits = new Map<string, number>();
              let readerSacks = 0;
              let nobody = 0;
              let fallbacks = 0;
              for (const play of playsOf(events)) {
                const d = readDropback(play);
                if (d === undefined) continue;
                const where = `${id} ${league} ${play.playId}`;
                const s6 = readS6Play(play.events, tunables);
                expect(s6, where).toBeDefined();
                tally.plays += 1;
                // The escape roll.
                const rolls = d.checks.filter((c) => c.checkKind === "scramble");
                expect(s6!.escapes.length, where).toBe(rolls.length);
                tally.rolls += rolls.length;
                for (const [i, e] of s6!.escapes.entries()) {
                  const byBand = escapeBandOutcomeOf(tunables, rolls[i]!.band);
                  expect(e.outcome.startsWith(byBand === "CAUGHT" ? "CAUGHT_" : byBand), where).toBe(true);
                  if (e.outcome === "CAUGHT_SACKED") expect(s6!.sacked && s6!.endTick === e.tick, `${where}: a catch sacked at the roll ends the play there`).toBe(true);
                  if (e.outcome === "CAUGHT_SHED") {
                    expect(outs.caughtAsContact, `${where}: a shed only under the caught escape as contact`).toBe(true);
                    expect(s6!.endTick > e.tick, `${where}: he plays on after a shed`).toBe(true);
                    tally.sheds += 1;
                  }
                  if (e.outcome.startsWith("CAUGHT")) tally.catches += 1;
                }
                if (outs.escapeCap !== undefined) expect(s6!.escapes.filter((e) => e.spends).length, `${where}: one escape a play`).toBeLessThanOrEqual(outs.escapeCap.maxPerPlay);
                // The movement CHECK.
                const deadline = d.checks.filter((c) => c.checkKind === "pocket_movement" && isDeadlinePickLabel(c.rngLabel));
                expect(s6!.deadlinePicks.length, where).toBe(deadline.length);
                tally.deadlinePicks += deadline.length;
                for (const p of s6!.deadlinePicks) expect(d.pursuitTick !== undefined && p.tick >= d.pursuitTick, `${where}: a deadline pick after QB_PURSUIT`).toBe(true);
                if (d.throwawayCause === OUT_OF_POCKET) {
                  expect(s6!.deadlinePicks.some((p) => p.tick === d.throwawayTick && p.choice === "THROWAWAY"), `${where}: an OUT_OF_POCKET throwaway on its deadline pick`).toBe(true);
                  expect(d.throwawayOutsideTackleBox, where).toBe(true);
                }
                if (outs.throwawayRule || outs.deadlinePick !== undefined) {
                  if (d.throwawayTick !== undefined) expect(d.throwawayOutsideTackleBox, `${where}: P10's flag on every throwaway of a play that read a position`).toBeDefined();
                } else expect(d.throwawayOutsideTackleBox, `${where}: no flag where no position was read`).toBeUndefined();
                // The sack, and its credit.
                expect(d.sacked, where).toBe(s6!.sacked);
                expect(d.failedScrambleSack === true, where).toBe(s6!.failedScrambleSack);
                if (!outs.failedScrambleSack) expect(s6!.failedScrambleSack, `${where}: no rescoring without the marker`).toBe(false);
                if (d.sacked) {
                  readerSacks += 1;
                  tally.sacks += 1;
                  if (s6!.failedScrambleSack) tally.failedScrambleSacks += 1;
                  const own = s6SackCreditOf(d, s6!);
                  if (own === null) nobody += 1;
                  if (own?.statlineFallback === true) fallbacks += 1;
                  const c = own === null ? undefined : (own ?? s4SackCreditOf(d) ?? sackCreditsOf(d));
                  if (c !== undefined) credits.set(c.last, (credits.get(c.last) ?? 0) + 1);
                }
              }
              // The metrics fold and the statline count the same sacks.
              const acc = foldGame(emptyAccumulator(), o, tunables);
              expect(acc.play.sacks, `${id} ${league} ${o.seed}: the metrics fold's sacks`).toBe(readerSacks);
              const statSacks = o.statlines.reduce((a, s) => a + s.passing.sacked, 0);
              expect(statSacks, `${id} ${league} ${o.seed}: the statline's sacks`).toBe(readerSacks);
              // The credit, man by man, is the statline's (the mix counts the statline's credit as it is).
              const statCredits = new Map(o.statlines.filter((s) => s.defense.sacks > 0).map((s) => [String(s.player), s.defense.sacks]));
              const byMan = (m: ReadonlyMap<string, number>): Record<string, number> => Object.fromEntries([...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
              expect(byMan(credits), `${id} ${league} ${o.seed}: the readers' sack credit, man by man, is the statline's defense.sacks`).toEqual(byMan(statCredits));
              tally.nobody += nobody;
              tally.statlineFallbacks += fallbacks;
              // The pocket, and every fold reads the stream with no problem.
              const rows = emptyS6RowsFold();
              foldS6RowsGame(rows, events, tunables, positions);
              expect(rows.wholePlayPocketDisagreements, `${id} ${league} ${o.seed}: the whole-play pocket and the rows' pocket`).toBe(0);
              const ctx = s2ContextOf(tunables, snapshot);
              const s2 = emptyS2Folds();
              for (const play of s2PlaysOf(events)) {
                for (const a of forcedActsOf(play, tunables)) expect(a.afterPursuit, `${play.playId}: a forced act after pursuit`).toBe(false);
                s2Checks.liveSet(s2.liveSet, play, ctx);
                s2Checks.mustAct(s2.mustAct, play, ctx);
                s2Checks.arrival(s2.arrival, play, ctx);
                s2Checks.warning(s2.warning, play, ctx);
                s2Checks.share(s2.share, play, ctx);
                s2Checks.desperation(s2.desperation, play, ctx);
                s2Checks.checkdown(s2.checkdown, play, ctx);
              }
              s2Checks.guardGame(s2.guardGames, events, ctx);
              // Step 2's arrival falsifier (every arrival ends the play on its tick) holds only before step 4's
              // contact, where a shed arrival plays on (MEASURED: it fails on D1, F1 and F5's own golden games
              // too, cal-2's probe), so it is left out; every other step-2 check must pass.
              expect(s2Problems(s2).filter((p) => !p.startsWith("arrival (everyArrival)")), `${id} ${league} ${o.seed}: step 2's folds`).toEqual([]);
              // The real throwaway rule's restatement, read both ways by the must-act witness: every in-pocket
              // throwaway on a tick it allows, and no closing HOLD it allows with the count part holding.
              tally.ruleThrowaways += s2.mustAct.witness.ruleThrowaways ?? 0;
              if (outs.throwawayRule) {
                tally.ruleHolds += s2.mustAct.witness.countHolds;
                const inPocket = events.filter((e) => e.event.type === "THROWAWAY" && (e.event.payload.cause === "POCKET_DURESS" || e.event.payload.cause === "CLOCK_EXPIRED")).length;
                expect(s2.mustAct.witness.ruleThrowaways, `${id} ${league} ${o.seed}: the witness reads every in-pocket throwaway against the restatement`).toBe(inPocket);
              }
              tally.spentHolds += s2.mustAct.witness.spentHolds ?? 0;
              const s4 = emptyS4Fold();
              foldS4Game(s4, events, tunables);
              expect(s4Problems(s4), `${id} ${league} ${o.seed}: step 4's folds`).toEqual([]);
              foldS5Game(emptyS5Fold(), events, tunables, snapshot);
              // The cross-check's deadline picks, and the contact at the escape site by three readers.
              const m6 = emptyM6Fold();
              const players = playersOfSnapshot(snapshot);
              const m6s4 = emptyM6Step4Fold();
              foldM6Step4Game(m6s4, events);
              let deadlinePicks = 0;
              let atEscape = 0;
              for (const play of playsOf(events)) {
                const d = readDropback(play);
                if (d === undefined) continue;
                crossCheckMovement(m6, d, [], players, tunables);
                const s6 = readS6Play(play.events, tunables);
                deadlinePicks += s6?.deadlinePicks.length ?? 0;
                atEscape += s6?.escapes.filter((e) => e.contestBand !== undefined).length ?? 0;
              }
              expect(m6.deadlinePicks ?? 0, `${id} ${league} ${o.seed}: the cross-check's deadline picks`).toBe(deadlinePicks);
              expect(m6s4.atEscape ?? 0, `${id} ${league} ${o.seed}: the contacts at the escape site, the step-4 contact fold's`).toBe(atEscape);
              expect(s4.s6?.atEscape ?? 0, `${id} ${league} ${o.seed}: the contacts at the escape site, the s4 fold's`).toBe(atEscape);
              tally.atEscape += atEscape;
              tally.standInByCatch += s4.s6?.standInByCatch ?? 0;
              const m3 = emptyM3Fold();
              for (const play of playsOf(events)) {
                const d = readDropback(play);
                if (d !== undefined) foldM3Dropback(m3, d, (pid) => positions.get(pid as never), true, readS6Play(play.events, tunables));
              }
              expect(m3.sacks).toBe(readerSacks);
              expect([m3.noSacker, m3.statlineFallbacks], `${id} ${league} ${o.seed}: the sacker mix's nobody and fallback credits`).toEqual([nobody, fallbacks]);
            },
            { tunables, callerVersion: STEP1_CALLER, first: GAMES },
          );
        }
        process.stdout.write(`pocketStep6Lifted ${id}: ${JSON.stringify(tally)}\n`);
        expect(tally.plays).toBeGreaterThan(0);
        if (outs.failedScrambleSack) expect(tally.failedScrambleSacks).toBeGreaterThan(0);
        else expect(tally.failedScrambleSacks).toBe(0);
        if (outs.throwawayRule) expect(tally.ruleThrowaways + tally.ruleHolds, "the restatement read on played games").toBeGreaterThan(0);
        else expect(tally.ruleThrowaways).toBe(0);
      },
      1_800_000,
    );
  }
});
