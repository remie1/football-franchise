/**
 * ADR-089 step 6: P-21 ON THE GOLDEN GAMES PLAYED TODAY (check.md S-4; the Orchestrator's ruling 4).
 *
 * `pocketStep6Lifted.test.ts` holds the readers to played step-6 games, and waits for the lift. Its sack
 * half runs here now, on the streams the engine plays today: the golden 50 games a league under
 * `legacy` (every sack credited to the last rusher ARRIVED) and under F5 (`pocket-1.s5a`, step 4's
 * contact credit, a coverage sack credited to nobody). Four readers must count the same sacks and
 * credit the same man: the dropback reader (`throwClass.ts`), the metrics fold (`collect.ts`), the
 * sacker mix (`m3SackerMix.ts`) and the engine's statline (each game's `statlines`, as
 * `pocketStep6Lifted` reads it: calibration's engine surface takes no per-play statline reducer,
 * `adr089Surface.test.ts`).
 *
 *  - **Sack by sack.** On each dropback alone the sacker mix, fed that dropback alone, counts a sack
 *    exactly when the dropback reader reads one, and files it under the man the reader's credit names
 *    (step 4's man at contact from `pocket-1.s4` on, else the last arrival) or under no arrival. Each
 *    game's sacks in the metrics fold are the reader's, tick by tick (`sackSeconds` against each sack's
 *    last tick), in and out of the pocket (`sacksIn`, `sacksOut`) and clean at the sack
 *    (`sacksCleanAtSack`).
 *  - **Man by man, game by game.** Each game's statline counts the reader's sacks (`passing.sacked`)
 *    and credits, man by man, the men the reader's credits name (`defense.sacks`), a sack credited to
 *    nobody credited to no man; and S-14's own check (`foldStep6Game` with `agree`, then
 *    `finishStep6League`; `s6Checks.ts`), which on a tree before step 6 reads each sack by its own
 *    stamp's credit, holds the statline, the sacker mix's count and the metrics fold's totals to the
 *    readers', game by game and at the league's end.
 *
 * Nothing here needs a petition: every game is one the engine plays today, and no step-6 arm plays.
 * The play log's side (the game viewer's) stays with ui-layout, after the lift. The counts each case
 * prints are MEASURED by it; at fix-1 (both leagues, 50 games each): legacy flat 4,415 dropbacks and
 * 696 sacks, gen 4,755 and 785; F5 flat 4,674 and 128, gen 4,944 and 128.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { armById } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { emptyM3Fold, foldM3Dropback, s4SackCreditOf, sackCreditsOf } from "../src/pocket/m3SackerMix.js";
import { readsStep4Facts, rulesOnPlayStart } from "../src/pocket/rules.js";
import { s2ContextOf } from "../src/pocket/s2Stream.js";
import { s5DropbacksOf } from "../src/pocket/s5Stream.js";
import { emptyStep6LeagueFolds, finishStep6League, foldStep6Game } from "../src/pocket/s6Checks.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { playsOf, readDropback, throwClassOf } from "../src/pocket/throwClass.js";

const GAMES = 50;

/** The trees played: legacy (no stamp) and F5's `pocket-1.s5a` (step 4's credit). */
const TREES: readonly { readonly id: string; readonly tunables: Tunables; readonly stamp: string | undefined }[] = [
  { id: "legacy", tunables: DEFAULT_TUNABLES, stamp: undefined },
  { id: "F5", tunables: armById("F5").tunables, stamp: "pocket-1.s5a" },
];

const ascending = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);
/** A credit map as sorted [man, sacks] pairs, for an order-free comparison. */
const pairs = (m: ReadonlyMap<string, number>): [string, number][] => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

describe("ADR-089 step 6, P-21 on the golden games played today: the dropback reader, the metrics fold, the sacker mix and the statline agree, sack by sack and man by man", () => {
  for (const tree of TREES) {
    for (const league of GOLDEN_LEAGUES) {
      it(
        `${tree.id}, ${league}: ${String(GAMES)} golden games`,
        () => {
          const { tunables, stamp } = tree;
          const s4 = readsStep4Facts(stamp);
          const L = emptyStep6LeagueFolds();
          let leagueFold = emptyAccumulator();
          const tally = { games: 0, dropbacks: 0, sacks: 0, byContact: 0, byArrival: 0, byNobody: 0, outOfPocket: 0, cleanAtSack: 0 };
          goldenGames(
            league,
            (o, snapshot) => {
              const events = o.events as readonly MatchEventEnvelope[];
              const game = `${tree.id} ${league} ${o.seed}`;
              tally.games += 1;
              leagueFold = foldGame(leagueFold, o, tunables);
              // S-14's own check, on a tree before step 6.
              foldStep6Game(L, { seed: o.seed, events, statlines: o.statlines }, snapshot, tunables, { agree: true, classify: throwClassOf }, s5DropbacksOf(events, s2ContextOf(tunables, snapshot)));
              // Sack by sack.
              const positions = positionsFromSnapshot(snapshot);
              const ticks: number[] = [];
              const credits = new Map<string, number>();
              let sacks = 0;
              let inPocket = 0;
              let outOfPocket = 0;
              let cleanAtSack = 0;
              for (const play of playsOf(events)) {
                const d = readDropback(play);
                if (d === undefined) continue;
                tally.dropbacks += 1;
                const where = `${game} ${d.playId}`;
                const start = play.events.find((e) => e.event.type === "PLAY_START");
                expect(rulesOnPlayStart((start?.event as { readonly payload?: unknown } | undefined)?.payload)?.name, `${where}: the stamp`).toBe(stamp);
                const contact = d.sacked && s4 ? s4SackCreditOf(d) : undefined;
                const credit = d.sacked ? (contact ?? sackCreditsOf(d)) : undefined;
                const m3 = emptyM3Fold();
                foldM3Dropback(m3, d, (id) => positions.get(id as never), s4);
                expect([m3.sacks, m3.noArrival, m3.unsplitByPosition[credit === undefined ? "" : (positions.get(credit.last as never) ?? "unknown")] ?? 0], `${where}: the sacker mix on this dropback alone`).toEqual(
                  d.sacked ? [1, credit === undefined ? 1 : 0, credit === undefined ? 0 : 1] : [0, 0, 0],
                );
                if (!d.sacked) continue;
                sacks += 1;
                if (credit !== undefined) credits.set(credit.last, (credits.get(credit.last) ?? 0) + 1);
                if (contact !== undefined) tally.byContact += 1;
                else if (credit !== undefined) tally.byArrival += 1;
                else tally.byNobody += 1;
                ticks.push(d.endTick);
                if (d.pursuitTick === undefined) inPocket += 1;
                else outOfPocket += 1;
                if ((d.statuses.at(-1)?.status ?? "CLEAN") === "CLEAN") cleanAtSack += 1;
              }
              tally.sacks += sacks;
              tally.outOfPocket += outOfPocket;
              tally.cleanAtSack += cleanAtSack;
              const pf = foldGame(emptyAccumulator(), o, tunables).play.pocket;
              expect(ascending(pf.sackSeconds), `${game}: the metrics fold's sacks, tick by tick`).toEqual(ascending(ticks));
              expect([pf.sacksIn, pf.sacksOut, pf.sacksCleanAtSack], `${game}: the metrics fold's sacks in and out of the pocket, and clean at the sack`).toEqual([inPocket, outOfPocket, cleanAtSack]);
              // Man by man, game by game: the game's statline.
              expect(o.statlines.reduce((a, s) => a + s.passing.sacked, 0), `${game}: the statline's sacks`).toBe(sacks);
              const statCredits = new Map(o.statlines.filter((s) => s.defense.sacks > 0).map((s) => [String(s.player), s.defense.sacks]));
              expect(pairs(statCredits), `${game}: the statline's sackers, man by man, against the reader's credits`).toEqual(pairs(credits));
            },
            { callerVersion: STEP1_CALLER, first: GAMES, ...(stamp === undefined ? {} : { tunables }) },
          );
          finishStep6League(L, leagueFold);
          process.stdout.write(`pocketStep6LegacyAgree ${tree.id} ${league}: ${JSON.stringify(tally)}\n`);
          expect(tally.games).toBe(GAMES);
          expect(L.faults["S-14"], (L.faults["S-14"]?.first ?? []).join(" | ")).toEqual({ n: 0, first: [] });
          expect(L.checked["S-14"]).toBe(tally.dropbacks);
          expect(L.agree).toEqual({ games: GAMES, sacks: tally.sacks, failedScrambleSacks: 0, nobody: 0, fallbacks: 0 });
          expect([L.pocket?.dropbacks, L.pocket?.sacks, L.pocket?.failedScrambleSacks]).toEqual([tally.dropbacks, tally.sacks, 0]);
          expect(L.rows.wholePlayPocketDisagreements).toBe(0);
          expect(L.rows.m3.sacks).toBe(tally.sacks);
          // Every credit the trees can give is read: the arrival on both, the contact and nobody on F5.
          expect(tally.byArrival).toBeGreaterThan(0);
          if (s4) expect([tally.byContact > 0, tally.byNobody > 0]).toEqual([true, true]);
          else expect([tally.byContact, tally.byNobody]).toEqual([0, 0]);
        },
        600_000,
      );
    }
  }
});
