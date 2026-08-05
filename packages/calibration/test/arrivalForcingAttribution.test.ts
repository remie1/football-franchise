/**
 * ============================================================================
 * DISPATCH — ARRIVAL-FLOOR ATTRIBUTION FOR THE CONVERSION SHORTFALL (backlog entries 103/104)
 * ============================================================================
 *
 * ⛔ MEASUREMENT ONLY. Prices no tunable, proposes no ruling, changes no engine code. Runs the
 * canonical 496-game arm ONCE (`flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` 2024, batch seed
 * `"baseline-0001"`, `DEFAULT_TUNABLES`, `FROZEN_TENDENCIES`/`FROZEN_FOURTH_DOWN`) and reads two
 * things off the SAME stream:
 *
 *   A. The exit-predicate decomposition the external review reported at §2 (forced-status-only /
 *      arrival-without-sack / sacks / arrival-only), reproduced here rather than inherited.
 *   B. A PLAY-LEVEL exclusive-attribution of `forcesDecision` to one of the three channels
 *      `pocketChannelShares.ts` already reconstructs (counter / bandFloor / arrival), answering
 *      "would this dropback have been non-forced without this channel" — never a re-simulation,
 *      a per-tick counterfactual read off the SAME observed trajectory (identical scope to
 *      `pocketChannelShares.ts`'s own EXCLUSIVE measure, lifted from tick-grain to play-grain).
 *
 * `reconstructPlay`/`reconstructGame` are IMPORTED, not reimplemented — this file adds a
 * play-terminal-outcome scan (sacked/arrived-raw/forced-raw, `gapProbe.arms.test.ts`'s own
 * predicate) over the IDENTICAL per-play event buffer `reconstructGame` already splits out, so the
 * two views of one play can never drift out of alignment by construction (same buffer, same index).
 *
 * HELD CONSTANT (Charter — name every tunable held, per entry 37): `DEFAULT_TUNABLES`, unpatched.
 * `pocket.forcesDecision = ["COLLAPSING","IMMEDIATE"]` (read off the tree, not restated). Win
 * threshold at its committed value (T=15, i.e. whatever `DEFAULT_TUNABLES` ships — this file
 * patches nothing). ONE run, no counterfactual re-simulation of any kind: channel "removal" below
 * is a status-level recomputation over the SAME tick data (worst-of-remaining-two), never a
 * re-run with a rusher's presence removed from the physics. It cannot say what QB decisions or
 * downstream ticks would have been with a channel actually gone; it can only say whether the
 * PUBLISHED forcing status, on this exact trajectory, depended on that channel.
 *
 *   FF_AFA=1 pnpm --filter @ff/calibration exec vitest run test/arrivalForcingAttribution.test.ts
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  CHANNEL_IDS,
  positionsFromSnapshot,
  reconstructPlay,
  type ChannelId,
  type TickChannels,
} from "../src/knownTruth/pocketChannelShares.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";

const ENABLED = process.env["FF_AFA"] === "1";
const GAMES = Number(process.env["FF_AFA_GAMES"] ?? "496");

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 2): string {
  return d === 0 ? "—" : `${((100 * n) / d).toFixed(places)}%`;
}

interface PlayOutcome {
  readonly isPass: boolean;
  readonly forcedRaw: boolean; // any POCKET_STATUS in tunables.pocket.forcesDecision, raw stream read
  readonly arrivedRaw: boolean; // any RUSH_THREAT{state:"ARRIVED"}, raw stream read (review's own predicate)
  readonly sacked: boolean;
  readonly scrambled: boolean;
  readonly threw: boolean;
  readonly threwAway: boolean;
  readonly worstNonClean: boolean; // "entry" predicate — any non-CLEAN POCKET_STATUS
}

/** channel -> would the play still have a forcing tick if this channel alone were held CLEAN? */
function wouldStillForceWithout(
  ticks: readonly TickChannels[],
  removed: ChannelId,
  forcing: ReadonlySet<string>,
  tunables: Tunables,
): boolean {
  const others = CHANNEL_IDS.filter((c) => c !== removed);
  for (const t of ticks) {
    let worst = "CLEAN";
    for (const o of others) {
      const v = t[o];
      if (severityOf(v, tunables) > severityOf(worst, tunables)) worst = v;
    }
    if (forcing.has(worst)) return true;
  }
  return false;
}

/**
 * Split one game's events into PASS-play buffers (identical PLAY_START/kind test
 * `pocketChannelShares.ts`'s `reconstructGame` uses), and for EACH buffer produce both:
 *   - the channel reconstruction (`reconstructPlay`, imported/reused verbatim)
 *   - the terminal-outcome scan this file adds (forced/arrived/sacked/etc., raw stream reads)
 * from the SAME buffer, so the two never misalign.
 */
function processGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
  forcing: ReadonlySet<string>,
  positions: ReadonlyMap<PlayerId, Position>,
): {
  readonly plays: readonly { outcome: PlayOutcome; ticks: readonly TickChannels[] }[];
  readonly identityChecks: number;
  readonly identityMismatches: number;
} {
  const plays: { outcome: PlayOutcome; ticks: readonly TickChannels[] }[] = [];
  let identityChecks = 0;
  let identityMismatches = 0;
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (!isPass || buf.length === 0) {
      buf = [];
      isPass = false;
      return;
    }
    const reclass = reconstructPlay(buf, tunables, positions);
    identityChecks += reclass.identityChecks;
    identityMismatches += reclass.identityMismatches;

    let forcedRaw = false;
    let arrivedRaw = false;
    let worstNonClean = false;
    let scrambled = false;
    let threw = false;
    let threwAway = false;
    for (const envelope of buf) {
      const event = envelope.event as { type: string; payload?: unknown };
      switch (event.type) {
        case "POCKET_STATUS": {
          const status = String((event.payload as { status?: unknown } | undefined)?.status ?? "");
          if (status !== "CLEAN") worstNonClean = true;
          if (forcing.has(status)) forcedRaw = true;
          break;
        }
        case "RUSH_THREAT":
          if (String((event.payload as { state?: unknown } | undefined)?.state) === "ARRIVED") arrivedRaw = true;
          break;
        case "QB_DECISION":
          if (String((event.payload as { choice?: unknown } | undefined)?.choice) === "SCRAMBLE") scrambled = true;
          break;
        case "THROW":
          threw = true;
          break;
        case "THROWAWAY":
          threwAway = true;
          break;
        default:
          break;
      }
    }
    const sacked = !threw && !threwAway && !scrambled;
    plays.push({
      outcome: { isPass: true, forcedRaw, arrivedRaw, sacked, scrambled, threw, threwAway, worstNonClean },
      ticks: reclass.ticks,
    });
    buf = [];
    isPass = false;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass =
        typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();

  return { plays, identityChecks, identityMismatches };
}

describe.skipIf(!ENABLED)("arrival-floor attribution for the conversion shortfall", () => {
  it(
    "reproduces the exit decomposition and attributes forcing to one of the three channels, exclusively, per play",
    { timeout: 30 * 60_000 },
    () => {
      const tunables = DEFAULT_TUNABLES;
      const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);

      const index = indexLeague(buildFlatLeague({ teams: 32 }));
      const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
      const seeds = generateSeeds("baseline-0001", fixtures.length);
      const limit = Math.min(GAMES, fixtures.length);

      let dropbacks = 0;
      let entryCount = 0; // worstNonClean
      let sacks = 0;
      let scrambles = 0;
      let throwaways = 0;

      // Part A buckets — disjoint, sum to exit.
      let forcedOnlyNoArrivalNoSack = 0; // F && !A && !S
      let arrivalWithoutSack = 0; // A && !S
      let arrivalOnly = 0; // A && !F && !S  (sanity: expected 0)
      // sacks bucket = `sacks` above (S, regardless of F/A)
      let exitCount = 0; // F || A || S

      // Part B — per-play exclusive channel attribution among FORCED plays (forcedRaw).
      let forcedTotal = 0;
      const soleCount: Record<ChannelId, number> = { counter: 0, bandFloor: 0, arrival: 0 };
      let multiChannelForced = 0;
      let soleAmbiguity = 0; // should stay 0 — falsifier for "at most one sole channel per play"

      // Part C — of plays forced ONLY by arrival, how many sacked?
      let arrivalSoleSacked = 0;
      // Part C addendum — arrival's PRESENCE (any tick reaching forcing severity via arrival),
      // whether or not it is the SOLE necessary channel. Answers "how big is arrival's footprint
      // including redundant ties", distinct from "how big is arrival's exclusive necessity".
      let arrivalPresentForced = 0;
      let arrivalPresentSacked = 0;
      let arrivalAbsentForced = 0;
      let arrivalAbsentSacked = 0;

      const usedSeeds: string[] = [];
      let identityChecksTotal = 0;
      let identityMismatchesTotal = 0;
      let gamesRun = 0;

      for (let i = 0; i < limit; i++) {
        const fixture = fixtures[i];
        const seed = seeds.seeds[i];
        if (fixture === undefined || seed === undefined) continue;
        const built = buildFixture(index, fixture);
        const { observation } = runOneGame({
          built,
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          tunables,
        });
        const { plays, identityChecks, identityMismatches } = processGame(
          observation.events,
          tunables,
          forcing,
          positionsFromSnapshot(built.snapshot),
        );
        identityChecksTotal += identityChecks;
        identityMismatchesTotal += identityMismatches;

        for (const { outcome, ticks } of plays) {
          dropbacks += 1;
          if (outcome.worstNonClean) entryCount += 1;
          if (outcome.sacked) sacks += 1;
          if (outcome.scrambled) scrambles += 1;
          if (outcome.threwAway) throwaways += 1;

          const F = outcome.forcedRaw;
          const A = outcome.arrivedRaw;
          const S = outcome.sacked;
          const disrupted = F || A || S;
          if (disrupted) exitCount += 1;
          if (F && !A && !S) forcedOnlyNoArrivalNoSack += 1;
          if (A && !S) arrivalWithoutSack += 1;
          if (A && !F && !S) arrivalOnly += 1;

          if (F) {
            forcedTotal += 1;
            const soleFor: ChannelId[] = [];
            for (const c of CHANNEL_IDS) {
              const stillForces = wouldStillForceWithout(ticks, c, forcing, tunables);
              if (!stillForces) soleFor.push(c);
            }
            if (soleFor.length === 0) {
              multiChannelForced += 1;
            } else if (soleFor.length === 1) {
              soleCount[soleFor[0]!] += 1;
              if (soleFor[0] === "arrival" && S) arrivalSoleSacked += 1;
            } else {
              soleAmbiguity += 1;
            }

            const arrivalEverForcing = ticks.some((t) => forcing.has(t.arrival));
            if (arrivalEverForcing) {
              arrivalPresentForced += 1;
              if (S) arrivalPresentSacked += 1;
            } else {
              arrivalAbsentForced += 1;
              if (S) arrivalAbsentSacked += 1;
            }
          }
        }
        usedSeeds.push(seed);
        gamesRun += 1;
      }

      say("");
      say("=======================================================================");
      say("ARM: flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · DEFAULT_TUNABLES · FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN");
      say(`games ${String(gamesRun)} of requested ${String(limit)} · seed digest ${digestSeeds(usedSeeds)}`);
      say(`tunablesDigest: ${stableDigest(tunables)}`);
      say(`pocket.forcesDecision = ${JSON.stringify([...forcing])} (read off the tree, not restated)`);
      say("MEASUREMENT ONLY — no tunable moved, nothing priced, no ruling proposed.");
      say("=======================================================================");

      // ---- THE FALSIFIER: channel reconstruction identity, over the whole run ----
      say("");
      say(
        `IDENTITY CHECK (reconstructPlay's own falsifier): ${String(identityMismatchesTotal)} mismatches of ` +
          `${String(identityChecksTotal)} checks across ${String(dropbacks)} dropbacks.`,
      );
      expect(identityMismatchesTotal).toBe(0);

      // ---- THE SOLE-ATTRIBUTION FALSIFIER: at most one sole channel per play ----
      say(`SOLE-ATTRIBUTION AMBIGUITY (should be 0 — two channels both "sole" for one play is a logic error): ${String(soleAmbiguity)}`);
      expect(soleAmbiguity).toBe(0);
      const soleSum = CHANNEL_IDS.reduce((a, c) => a + soleCount[c], 0);
      say(
        `forced ${String(forcedTotal)} = sole(counter ${String(soleCount.counter)}) + sole(bandFloor ${String(soleCount.bandFloor)}) + ` +
          `sole(arrival ${String(soleCount.arrival)}) + multiChannel ${String(multiChannelForced)} = ${String(soleSum + multiChannelForced)}`,
      );
      expect(soleSum + multiChannelForced).toBe(forcedTotal);

      // ---- THE TRIPLE ----
      const entry = pct(entryCount, dropbacks, 2);
      const exit = pct(exitCount, dropbacks, 2);
      const sackRate = pct(sacks, dropbacks, 2);
      const conversion = pct(sacks, exitCount, 2);
      say("");
      say("### THE TRIPLE (never one column)");
      say(`entry (any non-CLEAN)   = ${String(entryCount)}/${String(dropbacks)} = ${entry}`);
      say(`exit  (F||A||S)         = ${String(exitCount)}/${String(dropbacks)} = ${exit}`);
      say(`sack                    = ${String(sacks)}/${String(dropbacks)} = ${sackRate}`);
      say(`conversion (sack÷exit)  = ${String(sacks)}/${String(exitCount)} = ${conversion}`);
      say(`(scramble ${pct(scrambles, dropbacks)}, throwaway ${pct(throwaways, dropbacks)}, of dropbacks)`);

      // ---- PART A: the exit decomposition ----
      say("");
      say("### A. EXIT-PREDICATE DECOMPOSITION (disjuncts of exit), reproduced on OUR canonical 496 arm");
      say(`forced-status-only (F && !A && !S): ${String(forcedOnlyNoArrivalNoSack)} = ${pct(forcedOnlyNoArrivalNoSack, dropbacks)} of dropbacks`);
      say(`arrival-without-sack (A && !S):      ${String(arrivalWithoutSack)} = ${pct(arrivalWithoutSack, dropbacks)} of dropbacks`);
      say(`sacks (S, any F/A):                  ${String(sacks)} = ${pct(sacks, dropbacks)} of dropbacks`);
      say(`arrival-only (A && !F && !S):         ${String(arrivalOnly)} = ${pct(arrivalOnly, dropbacks)} of dropbacks  (review claims 0.00pp)`);
      const decompSum = forcedOnlyNoArrivalNoSack + arrivalWithoutSack + sacks;
      say(
        `sum forced-only + arrival-without-sack + sacks = ${String(decompSum)} vs exit ${String(exitCount)}: ` +
          `${decompSum === exitCount ? "MATCH" : "⛔ MISMATCH"}`,
      );
      say(
        `review's cited figures (§2, EXTERNAL-COLD-READ): forced-status-only 67.36pp, arrival-without-sack 3.04pp, ` +
          `sacks 15.20pp, arrival-only 0.00pp, on a claimed exit of 85.60.`,
      );

      // ---- PART B: channel attribution ----
      say("");
      say("### B. FORCED-STATUS BUCKET, SPLIT BY WHICH CHANNEL FORCED IT ALONE (exclusive share, play-grain)");
      say(`forced plays (forcedRaw): ${String(forcedTotal)} = ${pct(forcedTotal, dropbacks)} of dropbacks`);
      say("");
      say("| channel | sole-forced plays | share of FORCED plays | share of ALL dropbacks |");
      say("|---|---|---|---|");
      for (const c of CHANNEL_IDS) {
        say(`| ${c} | ${String(soleCount[c])} | ${pct(soleCount[c], forcedTotal)} | ${pct(soleCount[c], dropbacks)} |`);
      }
      say(`| multi-channel (no single channel is necessary) | ${String(multiChannelForced)} | ${pct(multiChannelForced, forcedTotal)} | ${pct(multiChannelForced, dropbacks)} |`);

      // ---- PART C: the owner's specific hypothesis ----
      say("");
      say("### C. THE OWNER'S HYPOTHESIS — arrival-floor auto-forcing regardless of QB effect");
      const arrivalSoleTotal = soleCount.arrival;
      const arrivalSoleSackRate = pct(arrivalSoleSacked, arrivalSoleTotal, 2);
      say(`dropbacks forced ONLY by pocketFloorFromArrival: ${String(arrivalSoleTotal)} = ${pct(arrivalSoleTotal, dropbacks)} of ALL dropbacks, ${pct(arrivalSoleTotal, exitCount)} of EXIT, ${pct(arrivalSoleTotal, forcedTotal)} of FORCED`);
      say(`of those, sacked: ${String(arrivalSoleSacked)} = ${arrivalSoleSackRate}`);
      say(`overall conversion (sack÷exit) for comparison: ${conversion}`);
      say(`overall sack rate among ALL forced plays (sack÷forced) for comparison: ${pct(sacks, forcedTotal)}`);
      say("");
      say("ADDENDUM — arrival's FOOTPRINT (present on any tick, sole or tied) vs its EXCLUSIVE necessity above:");
      say(
        `  arrival forcing-present on ≥1 tick: ${String(arrivalPresentForced)} plays = ${pct(arrivalPresentForced, dropbacks)} of ALL dropbacks, ` +
          `${pct(arrivalPresentForced, forcedTotal)} of FORCED — of those, sacked ${String(arrivalPresentSacked)} = ${pct(arrivalPresentSacked, arrivalPresentForced)}`,
      );
      say(
        `  arrival never forcing (forced via counter/bandFloor only): ${String(arrivalAbsentForced)} plays = ${pct(arrivalAbsentForced, dropbacks)} of ALL dropbacks, ` +
          `${pct(arrivalAbsentForced, forcedTotal)} of FORCED — of those, sacked ${String(arrivalAbsentSacked)} = ${pct(arrivalAbsentSacked, arrivalAbsentForced)}`,
      );

      say("");
      say(
        "##ARRIVALFORCING##" +
          JSON.stringify({
            arm: "flat-60-32t/SYNTHETIC_ROUND_ROBIN-2024/baseline-0001/DEFAULT_TUNABLES",
            games: gamesRun,
            seedDigest: digestSeeds(usedSeeds),
            tunablesDigest: stableDigest(tunables),
            dropbacks,
            entryCount,
            exitCount,
            sacks,
            forcedOnlyNoArrivalNoSack,
            arrivalWithoutSack,
            arrivalOnly,
            forcedTotal,
            soleCount,
            multiChannelForced,
            arrivalSoleTotal,
            arrivalSoleSacked,
            arrivalPresentForced,
            arrivalPresentSacked,
            arrivalAbsentForced,
            arrivalAbsentSacked,
          }),
      );
      say("=======================================================================");
    },
  );
});
