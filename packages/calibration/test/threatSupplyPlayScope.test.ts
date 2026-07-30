/**
 * ============================================================================
 * ENTRY 40's TWO SUPPLY CANDIDATES AT PLAY SCOPE — `startsThreat`'s RATE and THREAT PERSISTENCE.
 * ============================================================================
 *
 *   FF_TS_SCOPE=1 pnpm --filter @ff/calibration exec vitest run test/threatSupplyPlayScope.test.ts
 *   FF_TS_SCOPE=1 FF_TS_SCOPE_GAMES=496 ...
 *
 * ⚠ TIER 3 in Charter §4.1's register — env-gated, so nothing in CI can tell whether a human typed
 * the variable. Gated because it replays every play of every game twice per arm.
 *
 * ⚠ **MEASUREMENT ONLY, ADR-027's split.** Every value here is applied through `applyTunablePatch`
 * in memory and dies with the process. `packages/engine/src/tunables.ts` is not written by this file.
 *
 * ================== WHY THIS SUBJECT, AND WHY PLAY SCOPE FIRST ==================
 *
 * Backlog entry 40. Four levers have been swept and refused — `blockerStructuralAdvantage` (4.70pp),
 * `freeRunnerArrivalSeconds` (0.406pp), `RUSHER_GAINING`'s band map (2.395pp),
 * `arrival.pressureWithinSeconds` (2.600pp) — and ADR-032 §5b's exhaustion arm left **88.3% of the
 * pressure divergence standing with every classifying threshold removed.** The remaining candidates
 * are upstream of all of them: the **SUPPLY** of threats (`startsThreat`) and their **PERSISTENCE**
 * (a threat is retired only by `BLOCKER_RESETS`).
 *
 * `calibration.md` §5.3's standing rule (backlog 53): both are per-play subjects, so they are priced
 * at PLAY scope before any corpus rate is quoted. A corpus arm cannot distinguish *"no effect"* from
 * *"effect swamped"*, and it has now over-stated reach in every subject measured (register in
 * `src/harness/playScope.ts`).
 *
 * ================== THE SUBJECT PREDICATES ARE CLAIMS ABOUT MECHANISMS ==================
 *
 * ADR-048 §1: a subject predicate is a claim about a MECHANISM, never a reusable default. Both are
 * stated here and both are ASSERTED by an isolation arm over the whole rejected complement.
 *
 * **SUPPLY.** `passRush.bands[RUSHER_WINS_REP].minMargin` is read at exactly two places:
 * `bandFor(t.bands, margin)` in `resolve/passRush.ts` (which reps land in the band) and
 * `winMinMargin` in `resolve/rushThreat.ts` (the dominance shave's zero, `travelSecondsFor`). The
 * second is reachable ONLY from `threatFromWonRep`, i.e. only on a rep already in the band. So a
 * play whose every §7.1 rep has margin < 15 cannot move: no band boundary below 15 is touched, and
 * nothing calls the shave. Predicate: **the play carries at least one `pass_rush_tick` rep with
 * `margin >= 15`.**
 *
 * ⛔ **AND THE CELL IS NOT A SINGLE MECHANISM — this is stated here rather than discovered later.**
 * Raising the threshold does three things at once, because three tables are keyed on the band:
 *   1. the rep no longer creates a threat (`startsThreat`) — the subject;
 *   2. the rep's `pocket.minimumStatusByBand` floor falls COLLAPSING → PRESSURE (it lands in
 *      `BLOCKER_BEATEN`);
 *   3. its `passRush.pressureProgressByBand` delta falls 2 → 1.
 * A play-scope count bounds all three together and does not separate them. The corpus sweep
 * (`threatSupplySweep.test.ts`) carries a base on which 2 and 3 are held flat by construction; that
 * is where the separation is made, and no number in this file may be read as the supply mechanism
 * alone.
 *
 * **PERSISTENCE.** `passRush.pressureProgressByBand[band].reset` is read at exactly two places:
 * `clearsThreat` (which retires the threat) and `advancePressure` (which zeroes the counter). A play
 * with no rep in the newly-resetting band set cannot move. Predicate: **the play carries at least one
 * `pass_rush_tick` rep whose band is in the set this arm turns on.**
 *
 * ⛔ **AND `reset` IS ONE FLAG SERVING TWO MECHANISMS**, so a persistence arm at play scope is a
 * JOINT arm exactly as ADR-030's extinguishment was (the clamp nobody noticed for eight dispatches).
 * Same treatment: reported, not routed around. The corpus sweep's arrival-only base turns the
 * counter off, which is what makes `reset` a pure retirement dial there and not here.
 *
 * ================== ⚠ BOTH SUBJECTS ARE PUBLISHED — READ ONLY THE OUTCOME COLUMN ==================
 *
 * `freeRunnerArrivalSeconds` came back at **exactly 1.00× stream over-statement** because `etaTick`
 * is published on `RUSH_THREAT`. Both subjects here are published harder than that:
 *
 *   - the band label AND the margin are on the `pass_rush_tick` `CHECK` (ADR-011, ADR-042), so a
 *     reclassified rep moves the stream on every play that carries one, unconditionally;
 *   - `RUSH_THREAT` is published `TRAVELLING` / `DELAYED` / `RESET` / `ARRIVED`, so both creating
 *     one fewer threat and retiring one more moves the stream by construction.
 *
 * **EXPECT the stream column to approach RAW and carry no information. Only `EXCLUSIVE outcome` is a
 * measurement here.** It is printed anyway, because a degenerate ratio is itself the evidence that
 * the subject is published.
 *
 * ================== THE CENSUS — the descriptive half, and it is not a counterfactual ==================
 *
 * Entry 40 asserts two structural facts. Both are re-measured on the CONTROL corpus, because ADR-032
 * ran before ADR-033/034/046/048 moved the engine underneath them:
 *
 *   - `startsThreat`'s rep share (entry 40 says 31.85%);
 *   - how threats END. A threat is retired only by `BLOCKER_RESETS`; everything else — the blocker
 *     recovering, the rusher being ridden past, the clock — leaves it live. The census counts, per
 *     threat, whether it was ever `RESET`, and whether it was still live when the play ended.
 *
 * This is a DESCRIPTION of the committed engine, not an estimate of any counterfactual (backlog 37).
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | arm | stated subject | what actually reddens it |
 * |---|---|---|
 * | ISOLATION (supply) | no rep below margin 15 can be reclassified, and the shave is unreachable off-band | a second reader of `passRush.bands[0].minMargin`; a band boundary added between the committed value and the arm's |
 * | ISOLATION (persistence) | `reset` is read only where its band was posted | a reader of `pressureProgressByBand` keyed on a band the play never posted |
 * | COMPLEMENT DIGEST | `exclusive` is a bound, not an observation | an unpaired replay — shared RNG, mutated state, cases consumed out of order |
 * | RAW ≥ EXCLUSIVE | the population contains the effect | a play outside the predicate moving, i.e. the isolation failure seen from the other side |
 * | LIVE POPULATION | the corpus exercises the subject | a caller or schedule that stops producing won reps — §5.3's precondition |
 *
 * ⚠ **AND THE HONEST ANSWER FOR THE PRINTED COUNTS THEMSELVES: NOTHING.** They are a measurement,
 * not a gate. Anyone quoting them is relying on the five arms above, which is why each has an
 * `expect`.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  applyTunablePatch,
  createMatchState,
  simulateGame,
  simulatePlay,
  type Tunables,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { capturePlays, priceAtPlayScope, type CapturedPlay } from "../src/harness/playScope.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  BAND_LABELS,
  SUPPLY_PATH,
  SUPPLY_COMMITTED,
  supplyAt,
  retireOn,
  type BandLabel,
} from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_TS_SCOPE"] === "1";
const d = ENABLED ? describe : describe.skip;

/** Same league, schedule, caller and batch seed as every other sweep in this directory. */
const BATCH_SEED = "baseline-0001";
const GAMES = Number(process.env["FF_TS_SCOPE_GAMES"] ?? "96");

// ---------------------------------------------------------------------------
// READING THE CONTROL STREAM
// ---------------------------------------------------------------------------

interface RepShape {
  readonly band: string;
  readonly margin: number;
}

/** Every `pass_rush_tick` rep on the play, read structurally (payload is `unknown` in contracts). */
function repsOf(events: readonly MatchEventEnvelope[]): readonly RepShape[] {
  const out: RepShape[] = [];
  for (const e of events) {
    if (e.event.type !== "CHECK") continue;
    if (e.event.payload.checkKind !== "pass_rush_tick") continue;
    const band = e.event.payload.band;
    const margin = e.event.payload.margin;
    if (typeof band !== "string" || typeof margin !== "number") continue;
    out.push({ band, margin });
  }
  return out;
}

/** SUPPLY's population: a rep at or above the committed won-rep threshold. */
function carriesWonRep(events: readonly MatchEventEnvelope[]): boolean {
  return repsOf(events).some((r) => r.margin >= SUPPLY_COMMITTED);
}

/** PERSISTENCE's population, per arm: a rep in the band set this arm turns into a reset. */
function carriesBandIn(bands: ReadonlySet<string>) {
  return (events: readonly MatchEventEnvelope[]): boolean =>
    repsOf(events).some((r) => bands.has(r.band));
}

function unionPopulation(
  a: (e: readonly MatchEventEnvelope[]) => boolean,
  b: (e: readonly MatchEventEnvelope[]) => boolean,
) {
  return (e: readonly MatchEventEnvelope[]): boolean => a(e) || b(e);
}

/**
 * The play's OUTCOME, for the stricter count. Both subjects are published, so a stream difference
 * is frequently a diagnostic difference and not a football one.
 */
function playResultOf(events: readonly MatchEventEnvelope[]): unknown {
  return events.filter((e) => e.event.type === "PLAY_RESULT").map((e) => e.event.payload);
}

// ---------------------------------------------------------------------------
// THE CENSUS — descriptive, control arm only
// ---------------------------------------------------------------------------

interface Census {
  plays: number;
  dropbacks: number;
  reps: number;
  repsByBand: Map<string, number>;
  /** Threats, keyed within a play by rusher. */
  threats: number;
  threatsByOrigin: Map<string, number>;
  /** Threats that reached a RESET publication — the ONLY retirement the engine has. */
  threatsReset: number;
  /** Threats still live when the play ended. */
  threatsLiveAtEnd: number;
  /** Threats that published an ARRIVED. */
  threatsArrived: number;
  /** Sum of (last tick observed live − creation tick), in ticks, over threats. */
  liveTickSum: number;
  liveTickCount: number;
  /** Dropbacks carrying at least one threat. */
  dropbacksWithThreat: number;
  /** Dropbacks where every threat was eventually reset. */
  dropbacksAllReset: number;
}

function emptyCensus(): Census {
  return {
    plays: 0,
    dropbacks: 0,
    reps: 0,
    repsByBand: new Map<string, number>(),
    threats: 0,
    threatsByOrigin: new Map<string, number>(),
    threatsReset: 0,
    threatsLiveAtEnd: 0,
    threatsArrived: 0,
    liveTickSum: 0,
    liveTickCount: 0,
    dropbacksWithThreat: 0,
    dropbacksAllReset: 0,
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

interface ThreatLife {
  origin: string;
  firstTick: number;
  lastLiveTick: number;
  reset: boolean;
  arrived: boolean;
}

/**
 * Fold ONE control play into the census.
 *
 * A threat is identified by its rusher within the play, which is exactly how the engine holds it
 * (`m.threat` on the matchup). A rusher who is RESET and later wins again is counted as a SECOND
 * threat, because that is what the engine created — `soonerThreat` is called with `before ===
 * undefined` after a reset.
 */
function foldCensus(census: Census, events: readonly MatchEventEnvelope[]): void {
  census.plays += 1;
  let isPass = false;
  let tick = 0;
  const live = new Map<string, ThreatLife>();
  const finished: ThreatLife[] = [];

  for (const e of events) {
    const event = e.event;
    switch (event.type) {
      case "PLAY_START": {
        const payload = event.payload;
        if (typeof payload === "object" && payload !== null) {
          const kind = (payload as { kind?: unknown }).kind;
          isPass = kind === "PASS_PLAY_V1";
        }
        break;
      }
      case "TICK":
        tick = event.payload.tick;
        break;
      case "CHECK": {
        if (event.payload.checkKind !== "pass_rush_tick") break;
        const band = event.payload.band;
        if (typeof band !== "string") break;
        census.reps += 1;
        bump(census.repsByBand, band);
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = String(event.payload.state);
        const existing = live.get(id);
        if (state === "RESET") {
          if (existing !== undefined) {
            existing.reset = true;
            existing.lastLiveTick = tick;
            finished.push(existing);
            live.delete(id);
          }
          break;
        }
        if (existing === undefined) {
          live.set(id, {
            origin: String(event.payload.origin),
            firstTick: tick,
            lastLiveTick: tick,
            reset: false,
            arrived: state === "ARRIVED",
          });
        } else {
          existing.lastLiveTick = tick;
          if (state === "ARRIVED") existing.arrived = true;
        }
        break;
      }
      default:
        break;
    }
  }

  if (!isPass) return;
  census.dropbacks += 1;
  for (const t of live.values()) {
    t.lastLiveTick = tick;
    finished.push(t);
  }
  if (finished.length > 0) census.dropbacksWithThreat += 1;
  let allReset = finished.length > 0;
  for (const t of finished) {
    census.threats += 1;
    bump(census.threatsByOrigin, t.origin);
    if (t.reset) census.threatsReset += 1;
    else {
      census.threatsLiveAtEnd += 1;
      allReset = false;
    }
    if (t.arrived) census.threatsArrived += 1;
    census.liveTickSum += t.lastLiveTick - t.firstTick;
    census.liveTickCount += 1;
  }
  if (allReset) census.dropbacksAllReset += 1;
}

// ---------------------------------------------------------------------------
// THE CORPUS
// ---------------------------------------------------------------------------

function captureCorpus(games: number): {
  readonly plays: readonly { readonly play: CapturedPlay; readonly seed: string }[];
  readonly seedDigest: string;
  readonly gamesRun: number;
} {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(games, fixtures.length);
  const out: { play: CapturedPlay; seed: string }[] = [];
  const used: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const built = buildFixture(index, fixture);
    const coordinates = {
      season: built.fixture.season,
      week: built.fixture.week,
      home: built.fixture.home,
      away: built.fixture.away,
    };
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
    });
    const capture = capturePlays(pair, { coordinates, at: built.at });
    const state = createMatchState(coordinates, built.snapshot, DEFAULT_TUNABLES);
    const result = simulateGame(
      state,
      { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } },
      seed,
      DEFAULT_TUNABLES,
    );
    for (const play of capture.finish(result.events)) out.push({ play, seed });
    used.push(seed);
  }
  return { plays: out, seedDigest: digestSeeds(used), gamesRun: used.length };
}

// ---------------------------------------------------------------------------

interface Arm {
  readonly label: string;
  readonly tunables: Tunables;
  readonly population: (e: readonly MatchEventEnvelope[]) => boolean;
}

/** The bands each persistence arm ADDS to the retiring set. `BLOCKER_RESETS` is already in it. */
const P_CONTAINS: readonly BandLabel[] = ["BLOCKER_CONTAINS"];
const P_HOLDING: readonly BandLabel[] = ["BLOCKER_CONTAINS", "STALEMATE"];
const P_ALL: readonly BandLabel[] = BAND_LABELS.filter(
  (b) => b !== "RUSHER_WINS_REP" && b !== "BLOCKER_RESETS",
);

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

d("entry 40 — threat SUPPLY and threat PERSISTENCE at play scope", () => {
  it(
    "prices RAW, EXCLUSIVE stream, EXCLUSIVE outcome and ISOLATION for both candidates",
    { timeout: 6 * 60 * 60_000 },
    () => {
      const captured = captureCorpus(GAMES);
      const plays = captured.plays.map((p) => p.play);
      const seedFor = new Map(captured.plays.map((p) => [p.play, p.seed] as const));
      const seedOf = (play: CapturedPlay): string => seedFor.get(play) ?? "";

      // The control arm is replayed ONCE here and reused for every predicate and the census, so the
      // partition prices a population rather than asserting one.
      const controlEvents = new Map<CapturedPlay, readonly MatchEventEnvelope[]>();
      const census = emptyCensus();
      for (const play of plays) {
        const events = simulatePlay(play.state, play.calls, seedOf(play), DEFAULT_TUNABLES).events;
        controlEvents.set(play, events);
        foldCensus(census, events);
      }

      const arms: readonly Arm[] = [
        {
          label: `SUPPLY  ${SUPPLY_PATH} ${String(SUPPLY_COMMITTED)} → 25`,
          tunables: supplyAt(25),
          population: carriesWonRep,
        },
        {
          label: `SUPPLY  ${SUPPLY_PATH} ${String(SUPPLY_COMMITTED)} → 40`,
          tunables: supplyAt(40),
          population: carriesWonRep,
        },
        {
          label: `SUPPLY  ${SUPPLY_PATH} ${String(SUPPLY_COMMITTED)} → 1000 (channel extinguished)`,
          tunables: supplyAt(1000),
          population: carriesWonRep,
        },
        {
          label: "PERSIST  BLOCKER_CONTAINS retires the threat",
          tunables: retireOn(P_CONTAINS),
          population: carriesBandIn(new Set<string>(P_CONTAINS)),
        },
        {
          label: "PERSIST  BLOCKER_CONTAINS + STALEMATE retire the threat",
          tunables: retireOn(P_HOLDING),
          population: carriesBandIn(new Set<string>(P_HOLDING)),
        },
        {
          label: "PERSIST  every band but RUSHER_WINS_REP retires (a threat lasts one tick)",
          tunables: retireOn(P_ALL),
          population: carriesBandIn(new Set<string>(P_ALL)),
        },
        {
          label: "JOINT  supply extinguished × threat lasts one tick",
          tunables: retireOn(P_ALL, supplyAt(1000)),
          population: unionPopulation(carriesWonRep, carriesBandIn(new Set<string>(P_ALL))),
        },
      ];

      say("");
      say("=======================================================================");
      say("ENTRY 40 — THREAT SUPPLY × THREAT PERSISTENCE, PLAY SCOPE");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(captured.gamesRun)} games`);
      say(`batch seed "${BATCH_SEED}" · seed digest ${captured.seedDigest}`);
      say(`plays replayed ${String(plays.length)}`);
      say("MEASUREMENT ONLY — every arm is an in-memory patch; TUNABLES on disk is UNCHANGED.");
      say("=======================================================================");

      // --- the census -------------------------------------------------------
      say("");
      say("### CENSUS of the CONTROL corpus — entry 40's two structural claims, re-measured");
      say("");
      say(`plays ${String(census.plays)} · dropbacks ${String(census.dropbacks)} · §7.1 reps ${String(census.reps)}`);
      say("");
      say("| band | reps | share of reps |");
      say("|---|---|---|");
      for (const band of BAND_LABELS) {
        const n = census.repsByBand.get(band) ?? 0;
        say(`| ${band} | ${String(n)} | ${pct(n, census.reps)} |`);
      }
      say("");
      say("| threat census | value |");
      say("|---|---|");
      say(`| threats created | ${String(census.threats)} |`);
      say(`| threats per dropback | ${(census.threats / Math.max(1, census.dropbacks)).toFixed(3)} |`);
      say(`| dropbacks carrying ≥1 threat | ${String(census.dropbacksWithThreat)} (${pct(census.dropbacksWithThreat, census.dropbacks)}) |`);
      say(`| **threats ever RESET** | ${String(census.threatsReset)} (${pct(census.threatsReset, census.threats)}) |`);
      say(`| **threats still LIVE when the play ended** | ${String(census.threatsLiveAtEnd)} (${pct(census.threatsLiveAtEnd, census.threats)}) |`);
      say(`| threats that published ARRIVED | ${String(census.threatsArrived)} (${pct(census.threatsArrived, census.threats)}) |`);
      say(`| mean published lifetime (s, first→last publication) | ${(census.liveTickSum / Math.max(1, census.liveTickCount)).toFixed(3)} |`);
      say(`| dropbacks where EVERY threat was retired | ${String(census.dropbacksAllReset)} (${pct(census.dropbacksAllReset, census.dropbacksWithThreat)}) |`);
      say("");
      say("| origin | threats | share |");
      say("|---|---|---|");
      for (const [origin, n] of [...census.threatsByOrigin.entries()].sort((a, b) => b[1] - a[1])) {
        say(`| ${origin} | ${String(n)} | ${pct(n, census.threats)} |`);
      }
      say("");
      say("⚠ `mean published lifetime` is a LOWER BOUND on the time a threat is live: it measures");
      say("first→last PUBLICATION, and an unchanged threat is not an event (`passPlay.ts` only");
      say("publishes when the threat object changes). A threat created at 1.0 and never touched");
      say("again reads 0.0 here and was live for the rest of the play. The RESET share is the");
      say("number that carries the claim, and it is exact.");

      // --- the arms ---------------------------------------------------------
      for (const arm of arms) {
        const rejected = plays.filter((p) => !arm.population(controlEvents.get(p) ?? []));
        const price = priceAtPlayScope(plays, seedOf, DEFAULT_TUNABLES, arm.tunables, {
          population: (e) => arm.population(e),
          outcomeOf: playResultOf,
        });
        const isolation = priceAtPlayScope(rejected, seedOf, DEFAULT_TUNABLES, arm.tunables);
        const raw = price.raw ?? 0;
        const outcome = price.outcomeMoved ?? 0;

        say("");
        say(`  ── ${arm.label}`);
        say(`     RAW population     ${String(raw)}  (${pct(raw, price.plays)})`);
        say(`     EXCLUSIVE stream   ${String(price.exclusive)}  (${pct(price.exclusive, price.plays)})`);
        say(`     EXCLUSIVE outcome  ${String(outcome)}  (${pct(outcome, price.plays)})`);
        say(
          `     over-statement     ${price.exclusive === 0 ? "∞" : (raw / price.exclusive).toFixed(2)}× (stream), ` +
            `${outcome === 0 ? "∞" : (raw / outcome).toFixed(2)}× (outcome)`,
        );
        say(
          `     complement         ${String(price.plays - price.exclusive)} plays, identical in both arms: ` +
            `${String(price.complementDigestControl === price.complementDigestTreatment)}`,
        );
        say(`     ISOLATION          ${String(isolation.exclusive)} of ${String(rejected.length)} rejected (must be 0)`);

        expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
        expect(raw).toBeGreaterThanOrEqual(price.exclusive);
        expect(isolation.exclusive).toBe(0);
        expect(raw).toBeGreaterThan(0);
      }

      say("");
      expect(plays.length).toBeGreaterThan(0);
    },
  );
});
