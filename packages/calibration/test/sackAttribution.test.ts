/**
 * BACKLOG 22b, DECOMPOSED — where the uncredited sacks go.
 *
 *   FF_SACKS=1 pnpm --filter @ff/calibration test sackAttribution
 *
 * ============================ WHAT THIS ANSWERS ============================
 *
 * `CALIBRATION-BACKLOG.md` 22b measured, over 30 games, an offence charged **344** sacks against
 * a defensive ledger naming a sacker on **164**. It named three candidate causes and said they
 * *"need separating rather than assuming"*:
 *
 *   1. **Coverage sacks with no winner** — no rusher ever arrived, so nobody SHOULD be credited.
 *      Legitimate; the question is the share.
 *   2. **Free runners the ledger does not credit** — a rusher nobody blocked arrives without a
 *      won rep. If this is the bulk, it is a reducer fix.
 *   3. **The sacker dropped on the way to the statline** — a real winner in the stream who does
 *      not survive the fold. The only one of the three that is a DEFECT.
 *
 * ADR-022's `RUSH_THREAT.origin` is what makes 2 separable from 1 for the first time, and it is
 * the instrument this file uses: `WON_REP` is §7.1's rep, and `UNBLOCKED` / `PICKUP_LOST` /
 * `STUNT_LOOPER` are the three ways to be coming without one.
 *
 * ============================ HOW THE PARTITION IS BUILT ============================
 *
 * The credit rule is not guessed. `reduceStatlines` credits `defense.sacks` to
 * `play.lastArrivedRusher` — *"the last rusher the stream published as ARRIVED"* — so the
 * question "why was nobody credited" is exactly "why was no `RUSH_THREAT` published with
 * `state: "ARRIVED"` on this play". This file re-derives BOTH sides from the same stream and
 * checks its own arithmetic against the real statlines rather than asserting agreement:
 * `chargedFromStream` must equal the summed `passing.sacked`, and `creditedFromStream` the summed
 * `defense.sacks`. A disagreement means this fold is wrong, and the test says so.
 *
 * The classes below are DISJOINT and exhaustive over uncredited sacks, so the shares are a real
 * decomposition rather than four overlapping observations.
 *
 * ============================ WHAT IT MEASURES AGAINST ============================
 *
 * `baselineTool.test.ts`'s configuration exactly — flat-60 32 teams, SYNTHETIC_ROUND_ROBIN 2024,
 * seeds `generateSeeds("baseline-0001", 496)`, FROZEN_TENDENCIES, DEFAULT_TUNABLES. No tunable is
 * patched anywhere in this file: an attribution gap is not a tuning question and nothing here
 * would be answered by moving a dial.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, ThreatOrigin } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const enabled = process.env["FF_SACKS"] === "1";
const GAMES = Number(process.env["FF_SACKS_GAMES"] ?? "496");
const BATCH_SEED = process.env["FF_SACKS_SEED"] ?? "baseline-0001";

// ---------------------------------------------------------------------------
// PLAY_START, read structurally. Same rule as `metrics/collect.ts`: everything optional, a
// changed payload shape produces missing counts rather than a thrown batch.
// ---------------------------------------------------------------------------

interface PlayStartShape {
  readonly kind: string;
  readonly offense?: {
    readonly hotConversions?: readonly unknown[];
    readonly availableBlockers?: readonly unknown[];
  };
  readonly defense?: {
    readonly rush?: readonly unknown[];
    readonly unaccountedRushers?: readonly unknown[];
    readonly stunts?: readonly unknown[];
    readonly blitzDisguise?: unknown;
  };
}

function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

function len(value: readonly unknown[] | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

// ---------------------------------------------------------------------------
// The classes. Disjoint by construction; the switch that assigns them is total.
// ---------------------------------------------------------------------------

/**
 * `CREDITED` is not a cause — it is the complement, kept in the same enumeration so the four
 * shares are shares of a partition of ALL sacks and the uncredited shares are a partition of the
 * remainder. Two denominators in one table is how a decomposition stops adding up.
 */
type SackClass =
  | "CREDITED"
  /** Cause 1a — no RUSH_THREAT was ever published. Nobody won a rep, nobody came free. */
  | "C1_NO_RUSHER_EVER"
  /** Cause 1b — threats existed and every one was RESET before the ball came out. */
  | "C1_ALL_THREATS_RESET"
  /** Cause 2 — a non-WON_REP threat was still travelling and never published ARRIVED. */
  | "C2_FREE_RUNNER_UNCREDITED"
  /** Cause 3 — a WON_REP threat was still travelling and never published ARRIVED. */
  | "C3_WINNER_DROPPED";

const SACK_CLASSES: readonly SackClass[] = [
  "CREDITED",
  "C1_NO_RUSHER_EVER",
  "C1_ALL_THREATS_RESET",
  "C2_FREE_RUNNER_UNCREDITED",
  "C3_WINNER_DROPPED",
];

const ORIGINS: readonly ThreatOrigin[] = ["WON_REP", "UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"];

interface SackFold {
  dropbacks: number;
  /** Dropbacks by the corpus facts ADR-022/023 made sayable. Context for every share below. */
  blitzDropbacks: number;
  unaccountedDropbacks: number;
  hotConversionDropbacks: number;
  stuntDropbacks: number;
  availableBlockerDropbacks: number;

  /** Sacks as the OFFENCE is charged them, re-derived by this fold. */
  chargedFromStream: number;
  /** Sacks where a RUSH_THREAT reached ARRIVED, i.e. what the ledger credits. */
  creditedFromStream: number;

  byClass: Map<SackClass, number>;
  /** Per class, how many of those sacks were on a dropback with an unaccounted rusher. */
  byClassUnaccounted: Map<SackClass, number>;
  /** Per class, the sack tick, so "a sack with nobody coming" can be dated. */
  byClassTickSum: Map<SackClass, number>;

  /** Origin of the threat CREDITED with each credited sack. The Tier-4 denominator's content. */
  creditedOrigin: Map<ThreatOrigin, number>;
  /** Origin of every still-active threat on an uncredited sack. Not disjoint across a play. */
  uncreditedActiveOrigin: Map<ThreatOrigin, number>;
  /** Every threat published on any dropback, by origin — the population cause 2 lives in. */
  threatsByOrigin: Map<ThreatOrigin, number>;
  /** Threats that reached ARRIVED, by origin. `arrived ÷ published` is cause 2's real question. */
  arrivedByOrigin: Map<ThreatOrigin, number>;

  /** Uncredited sacks on which an escape (§8.8) was attempted and failed. */
  uncreditedAfterEscapeAttempt: number;
  creditedAfterEscapeAttempt: number;

  /**
   * How far the nearest still-travelling rusher was from arriving, at the tick the sack was
   * recorded, on an UNCREDITED sack. This is what separates "a real winner was about to get
   * there and the fold lost him" from "somebody won a rep fifty feet away three ticks ago" —
   * cause 3's whole claim rests on it, so it is measured rather than argued.
   */
  uncreditedEtaGap: Map<number, number>;
}

function emptyFold(): SackFold {
  return {
    dropbacks: 0,
    blitzDropbacks: 0,
    unaccountedDropbacks: 0,
    hotConversionDropbacks: 0,
    stuntDropbacks: 0,
    availableBlockerDropbacks: 0,
    chargedFromStream: 0,
    creditedFromStream: 0,
    byClass: new Map(SACK_CLASSES.map((c) => [c, 0] as const)),
    byClassUnaccounted: new Map(SACK_CLASSES.map((c) => [c, 0] as const)),
    byClassTickSum: new Map(SACK_CLASSES.map((c) => [c, 0] as const)),
    creditedOrigin: new Map(ORIGINS.map((o) => [o, 0] as const)),
    uncreditedActiveOrigin: new Map(ORIGINS.map((o) => [o, 0] as const)),
    threatsByOrigin: new Map(ORIGINS.map((o) => [o, 0] as const)),
    arrivedByOrigin: new Map(ORIGINS.map((o) => [o, 0] as const)),
    uncreditedAfterEscapeAttempt: 0,
    creditedAfterEscapeAttempt: 0,
    uncreditedEtaGap: new Map<number, number>(),
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** One rusher's state on one play, as the stream last stated it. */
interface ThreatState {
  origin: ThreatOrigin;
  /** TRAVELLING / DELAYED / RESET / ARRIVED — the last one published for this man. */
  state: string;
  everArrived: boolean;
  /** The tick he reaches the quarterback, as the last publication stated it. */
  etaTick: number;
}

interface DropbackScratch {
  tick: number;
  hadThrow: boolean;
  hadCarrier: boolean;
  escapeAttempted: boolean;
  unaccounted: boolean;
  threats: Map<string, ThreatState>;
  /** The man the reducer would credit: the LAST rusher published as ARRIVED. */
  lastArrived: string | undefined;
  resultYards: number | null;
}

function foldSacks(fold: SackFold, events: readonly MatchEventEnvelope[]): void {
  let play: DropbackScratch | null = null;

  const flush = (): void => {
    if (play === null) return;
    const p = play;
    play = null;
    fold.dropbacks += 1;

    for (const threat of p.threats.values()) {
      bump(fold.threatsByOrigin, threat.origin);
      if (threat.everArrived) bump(fold.arrivedByOrigin, threat.origin);
    }

    // `reduceStatlines`' own predicate, verbatim: a dropback with no throw, no carry, and a
    // loss. Re-derived here rather than read off the statline so the CLASSIFICATION and the
    // COUNT come from one place and the test can check them against the statline afterwards.
    const sacked = !p.hadThrow && !p.hadCarrier && (p.resultYards ?? 0) < 0;
    if (!sacked) return;
    fold.chargedFromStream += 1;

    const credited = p.lastArrived !== undefined;
    if (credited) fold.creditedFromStream += 1;

    const active = [...p.threats.values()].filter((t) => t.state !== "RESET");
    const cls: SackClass = credited
      ? "CREDITED"
      : p.threats.size === 0
        ? "C1_NO_RUSHER_EVER"
        : active.length === 0
          ? "C1_ALL_THREATS_RESET"
          : active.some((t) => t.origin === "WON_REP")
            ? "C3_WINNER_DROPPED"
            : "C2_FREE_RUNNER_UNCREDITED";

    bump(fold.byClass, cls);
    bump(fold.byClassTickSum, cls, p.tick);
    if (p.unaccounted) bump(fold.byClassUnaccounted, cls);
    if (p.escapeAttempted) {
      if (credited) fold.creditedAfterEscapeAttempt += 1;
      else fold.uncreditedAfterEscapeAttempt += 1;
    }

    if (credited) {
      const winner = p.threats.get(p.lastArrived ?? "");
      if (winner !== undefined) bump(fold.creditedOrigin, winner.origin);
    } else {
      for (const t of active) bump(fold.uncreditedActiveOrigin, t.origin);
      if (active.length > 0) {
        const nearest = Math.min(...active.map((t) => t.etaTick));
        bump(fold.uncreditedEtaGap, Number((nearest - p.tick).toFixed(1)));
      }
    }
  };

  for (const envelope of events) {
    const event = envelope.event;
    switch (event.type) {
      case "PLAY_START": {
        flush();
        const start = asPlayStart(event.payload);
        if (start === null || start.kind !== "PASS_PLAY_V1") break;
        const unaccounted = len(start.defense?.unaccountedRushers) > 0;
        if (len(start.defense?.rush) >= 5) fold.blitzDropbacks += 1;
        if (unaccounted) fold.unaccountedDropbacks += 1;
        if (len(start.offense?.hotConversions) > 0) fold.hotConversionDropbacks += 1;
        if (len(start.defense?.stunts) > 0) fold.stuntDropbacks += 1;
        if (len(start.offense?.availableBlockers) > 0) fold.availableBlockerDropbacks += 1;
        play = {
          tick: 0,
          hadThrow: false,
          hadCarrier: false,
          escapeAttempted: false,
          unaccounted,
          threats: new Map<string, ThreatState>(),
          lastArrived: undefined,
          resultYards: null,
        };
        break;
      }
      case "TICK":
        if (play !== null) play.tick = event.payload.tick;
        break;
      case "RUSH_THREAT": {
        if (play === null) break;
        const key = String(event.payload.rusher);
        const existing = play.threats.get(key);
        const state: ThreatState = existing ?? {
          origin: event.payload.origin,
          state: event.payload.state,
          everArrived: false,
          etaTick: event.payload.etaTick,
        };
        state.state = event.payload.state;
        state.etaTick = event.payload.etaTick;
        if (event.payload.state === "ARRIVED") {
          state.everArrived = true;
          play.lastArrived = key;
        }
        play.threats.set(key, state);
        break;
      }
      case "THROW":
        // `reduceStatlines` sets `hadThrow` on ANY THROW event, throwaway included, so this
        // mirrors it exactly rather than filtering on throwType — the two must agree or the
        // charged count will not reconcile.
        if (play !== null) play.hadThrow = true;
        break;
      case "RUN_RESOLUTION":
        if (play !== null) play.hadCarrier = true;
        break;
      case "CHECK":
        if (play !== null && event.payload.checkKind === "scramble") play.escapeAttempted = true;
        break;
      case "PLAY_RESULT":
        if (play !== null) play.resultYards = event.payload.yards;
        break;
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(2)}%`;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

describe.skipIf(!enabled)("sack attribution", () => {
  it(
    "decomposes the unattributed sack remainder into backlog 22b's three named causes",
    () => {
      const league = buildFlatLeague({ teams: 32 });
      const index = indexLeague(league);
      const fixtures = buildFixtures(index, {
        kind: "SYNTHETIC_ROUND_ROBIN",
        rounds: 1,
        season: 2024,
      });
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);
      const limit = Math.min(GAMES, fixtures.length);

      const fold = emptyFold();
      let statlineCharged = 0;
      let statlineCredited = 0;

      for (let i = 0; i < limit; i++) {
        const fixture = fixtures[i];
        const seed = seeds.seeds[i];
        if (fixture === undefined || seed === undefined) continue;
        const output = runOneGame({
          built: buildFixture(index, fixture),
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          tunables: DEFAULT_TUNABLES,
        });
        foldSacks(fold, output.observation.events);
        for (const line of output.observation.statlines) {
          statlineCharged += line.passing.sacked;
          statlineCredited += line.defense.sacks;
        }
      }

      const charged = fold.chargedFromStream;
      const credited = fold.creditedFromStream;
      const remainder = charged - credited;

      say("");
      say("=======================================================================");
      say("BACKLOG 22b — the sack-attribution gap, decomposed");
      say(`league flat-60 32t · SYNTHETIC_ROUND_ROBIN 2024 · ${limit} games · seed "${BATCH_SEED}"`);
      say("tunables DEFAULT_TUNABLES (nothing patched — this is not a tuning question)");
      say("=======================================================================");
      say("");
      say(`dropbacks ......................... ${fold.dropbacks}`);
      say(`  five-or-more-man rush ........... ${fold.blitzDropbacks} (${pct(fold.blitzDropbacks, fold.dropbacks)})`);
      say(`  an UNACCOUNTED rusher ........... ${fold.unaccountedDropbacks} (${pct(fold.unaccountedDropbacks, fold.dropbacks)})`);
      say(`  a hot conversion ................ ${fold.hotConversionDropbacks} (${pct(fold.hotConversionDropbacks, fold.dropbacks)})`);
      say(`  a stunt on the card ............. ${fold.stuntDropbacks} (${pct(fold.stuntDropbacks, fold.dropbacks)})`);
      say(`  a man AVAILABLE in protection ... ${fold.availableBlockerDropbacks} (${pct(fold.availableBlockerDropbacks, fold.dropbacks)})`);
      say("");
      say(`sacks CHARGED to the offence ...... ${charged}   (statlines: ${statlineCharged})`);
      say(`sacks CREDITED to a defender ...... ${credited}  (statlines: ${statlineCredited}) = ${pct(credited, charged)}`);
      say(`UNATTRIBUTED REMAINDER ............ ${remainder} = ${pct(remainder, charged)} of all sacks`);
      say("");
      say("### The decomposition — shares of the UNATTRIBUTED REMAINDER");
      say("");
      say("| class | n | share of remainder | share of all sacks | mean sack tick | on an unaccounted-rusher dropback |");
      say("|---|---|---|---|---|---|");
      for (const cls of SACK_CLASSES) {
        if (cls === "CREDITED") continue;
        const n = fold.byClass.get(cls) ?? 0;
        const tickSum = fold.byClassTickSum.get(cls) ?? 0;
        say(
          `| ${cls} | ${n} | ${pct(n, remainder)} | ${pct(n, charged)} | ` +
            `${n === 0 ? "—" : (tickSum / n).toFixed(3)} | ${fold.byClassUnaccounted.get(cls) ?? 0} |`,
        );
      }
      const creditedN = fold.byClass.get("CREDITED") ?? 0;
      const creditedTick = fold.byClassTickSum.get("CREDITED") ?? 0;
      say(
        `| CREDITED (for contrast) | ${creditedN} | — | ${pct(creditedN, charged)} | ` +
          `${creditedN === 0 ? "—" : (creditedTick / creditedN).toFixed(3)} | ` +
          `${fold.byClassUnaccounted.get("CREDITED") ?? 0} |`,
      );

      say("");
      say("### ADR-022's instrument — every threat published, by origin");
      say("");
      say("| origin | published | reached ARRIVED | arrival share |");
      say("|---|---|---|---|");
      for (const origin of ORIGINS) {
        const published = fold.threatsByOrigin.get(origin) ?? 0;
        const arrived = fold.arrivedByOrigin.get(origin) ?? 0;
        say(`| ${origin} | ${published} | ${arrived} | ${pct(arrived, published)} |`);
      }
      say("");
      say("Origin of the threat CREDITED with each credited sack:");
      for (const origin of ORIGINS) {
        say(`  ${origin}: ${fold.creditedOrigin.get(origin) ?? 0} (${pct(fold.creditedOrigin.get(origin) ?? 0, credited)})`);
      }
      say("Origins still ACTIVE on an uncredited sack (a play may contribute more than one):");
      for (const origin of ORIGINS) {
        say(`  ${origin}: ${fold.uncreditedActiveOrigin.get(origin) ?? 0}`);
      }
      say("");
      say(
        `sacks after a failed §8.8 escape — credited ${fold.creditedAfterEscapeAttempt}, ` +
          `uncredited ${fold.uncreditedAfterEscapeAttempt}`,
      );

      say("");
      say("### How close the nearest travelling rusher was, on an UNCREDITED sack");
      say("");
      say("`etaTick − sack tick`, seconds. Negative means his ETA had already passed.");
      say("");
      say("| seconds to arrival | sacks | share of remainder |");
      say("|---|---|---|");
      for (const [gap, n] of [...fold.uncreditedEtaGap.entries()].sort((a, b) => a[0] - b[0])) {
        say(`| ${gap.toFixed(1)} | ${n} | ${pct(n, remainder)} |`);
      }

      // The fold has to agree with the reducer it is explaining. If it does not, every share
      // above is a share of the wrong number, and that is worse than not measuring.
      expect(fold.chargedFromStream).toBe(statlineCharged);
      expect(fold.creditedFromStream).toBe(statlineCredited);
      expect(charged).toBeGreaterThan(100);
    },
    30 * 60_000,
  );
});
