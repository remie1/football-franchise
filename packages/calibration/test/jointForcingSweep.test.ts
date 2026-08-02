/**
 * ============================================================================
 * DISPATCH — THE JOINT SWEEP: does moving all three "forcing" escalators TOGETHER change the
 * ARCHITECTURE (over-determination), or only the VALUES (the triple)? (backlog entries 103/104/105)
 * ============================================================================
 *
 * ⛔ MEASUREMENT ONLY. Prices no tunable, proposes no ruling, changes no engine code, no metric, no
 * band, no verdict. Every arm below is an IN-MEMORY `applyTunablePatch` tree; `packages/engine/src/
 * tunables.ts` is not written by this file (ADR-027).
 *
 * ================== WHY THIS FILE, AND WHY NOT A FOURTH SINGLE-LEVER SWEEP ==================
 *
 * Entry 105 measured, at PLAY grain on the canonical arm: 90.41% of forced plays would still have
 * forced with any ONE of the three channels (counter / bandFloor / arrival) held CLEAN. No single
 * channel is sole-necessary on more than 5.76% of forced plays. THREE INDEPENDENTLY-SUFFICIENT
 * ESCALATORS ARE STACKED, so moving one hands the forcing work to the next — which is entry 104's
 * own finding, restated structurally: raising the win threshold buys exit at conversion's expense
 * because the OTHER two escalators are still there to force the plays the win threshold stops
 * forcing directly. The owner's question (verbatim, this dispatch's brief): "not which lever, but
 * whether the forcing architecture — three independently sufficient escalators stacked — is the
 * thing to change." That is answered by whether a JOINT move collapses the 90.41% figure, not by
 * whether it lands the triple; a full factorial that never moves more than one lever at a time
 * cannot distinguish "this lever is weak" from "the stack absorbs any one lever's retreat" — the
 * whole reason entry 105 was written.
 *
 * ================== THE THREE LEVERS, PATHS DERIVED (not restated from the brief's labels) ==================
 *
 * Read off `packages/engine/src/tunables.ts` directly, each verified against the committed tree by
 * an `expect(...).toBe(...)` below rather than asserted in prose:
 *
 *   A. WIN THRESHOLD    `passRush.bands[i].minMargin` where `bands[i].label === "RUSHER_WINS_REP"`.
 *                       Committed `15` (`tunables.ts:379`). Patched via `threatSupplyPatches.ts`'s
 *                       `supplyAt(T)` — entry 40's own vocabulary, reused rather than reimplemented,
 *                       and the SAME un-neutralised lever entries 103/104 measured (it also moves
 *                       the band floor and the counter delta for reclassified reps — a documented,
 *                       not hidden, property of this exact cell; see that file's header).
 *
 *   B. COUNTER TIME CONSTANT   `passRush.pressureProgressByBand.{RUSHER_WINS_REP,BLOCKER_BEATEN,
 *                       RUSHER_GAINING}.delta`, read together with `pocket.thresholds` (the
 *                       severity boundaries the counter is compared against). The brief's own
 *                       testimony — *"delta 1 per 0.5s, COLLAPSING at 5 ⇒ 2.5s of 'slightly
 *                       losing' forces"* — is VERIFIED against the tunables below rather than taken
 *                       on faith: `BLOCKER_BEATEN.delta === 1`, `RUSHER_GAINING.delta === 1`,
 *                       `pocket.thresholds` has `{label:"COLLAPSING", minProgress:5}`,
 *                       `clock.tickStepSeconds === 0.5`, so 5 ÷ 1 × 0.5 = 2.5s. TRUE, unmodified.
 *                       **Operationalised here as a single multiplier `m` on the three deltas
 *                       above, holding `pocket.thresholds` fixed** — the reduction from "two
 *                       tunable tables" to "one multiplier" is stated, not hidden: `m` scales the
 *                       RATE (the literal "per 0.5s" quantity the testimony names) rather than the
 *                       boundary, because scaling the rate cannot collide with the ordering
 *                       invariants `pocket.thresholds`/`pocket.severity` carry elsewhere in this
 *                       package (`knownTruth/pocketLadder.ts`'s monotonicity gate), while an
 *                       independent sweep of the threshold VALUES risks exactly that and is NOT
 *                       explored here (named below, under "what this does not explore").
 *
 *   C. ARRIVAL HORIZON   `arrival.collapsingWithinSeconds`. Committed `1.0` (`tunables.ts:774`).
 *                       **Treated as ONE lever, not two, for this dispatch** — `arrival.
 *                       pressureWithinSeconds` (committed `2.0`) is HELD FIXED throughout every
 *                       arm below, and is not a second axis. Justification: `pocket.forcesDecision
 *                       = ["COLLAPSING","IMMEDIATE"]` never contains `"PRESSURE"`, so
 *                       `pressureWithinSeconds` cannot affect which plays are FORCED via the
 *                       arrival channel by construction — it only moves the boundary between two
 *                       NON-forcing statuses (PRESSURE vs CLEAN). Entry 103 already measured it
 *                       "FLAT NULL — Δ ≤ 0.09pp" on entry/exit/sack on this same tree. Spending a
 *                       factorial cell on a channel already shown structurally incapable of moving
 *                       the forcing architecture would not test the owner's question; it would
 *                       just re-confirm entry 103. `collapsingWithinSeconds`'s own reachable domain
 *                       — `[immediateWithinSeconds, pressureWithinSeconds] = [0.0, 2.0]` — is
 *                       DERIVED, not chosen, reusing exactly `collapsingHorizonSweep.test.ts`'s own
 *                       endpoints.
 *
 * ================== THE GRID, AND THE REDUCTION FROM A FULL 27 (STATED, NOT HIDDEN) ==================
 *
 * Three settings per lever (committed + two symmetric alternatives each), so the reachable grid IS
 * a full 3×3×3 = 27-arm factorial — no reduction was needed at this package's actual wall-clock
 * cost (see provenance: ~6.5s per 150-game arm measured live before this file was sized), so unlike
 * the brief's own contingency this file does NOT drop to a 2-level design. What IS reduced, and
 * named:
 *
 *   - A SINGLE seed list (`baseline-0001`) throughout, matching entries 103/104/105's own
 *     convention and their own named gap: no resample cross-validation. One draw, stated as such.
 *   - Each lever's own INTERIOR points are not explored (T: 30/40/60/75 from entry 104's own finer
 *     curve; m: 0.25/0.75/1.5/3; C: 0.5/1.5, `collapsingHorizonSweep.test.ts`'s own half-tick
 *     interior rungs) — only the committed value and its two derived/symmetric endpoints per
 *     lever. A monotone-but-nonlinear response between the three points on any axis would not be
 *     seen.
 *   - `pocket.thresholds`' own boundary values are not swept (see lever B above) — only the RATE.
 *
 * A: T ∈ {15 (committed), 45, 90} — 45 is entry 104's own mid-curve point (exit ≈70, conversion
 *    ≈12.35% at n=496, RE-MEASURED here, not cited); 90 is entry 104's near-ceiling point (exit
 *    ≈23.62, conversion ≈9.14% at n=496, RE-MEASURED here).
 * B: m ∈ {1.0 (committed), 0.5 (HALF-RATE — slower, requires more sustained pressure to force —
 *    the direction that could plausibly raise conversion), 2.0 (DOUBLE-RATE — faster, the
 *    symmetric opposite, included so the direction of any effect is not assumed)}.
 * C: collapsingWithinSeconds ∈ {1.0 (committed), 0.0 (narrower — `immediateWithinSeconds`'s own
 *    floor), 2.0 (wider — `pressureWithinSeconds`'s own ceiling)}.
 *
 * ================== PRE-REGISTRATION (before any arm below was measured) ==================
 *
 * For the JOINT arm most likely to test the owner's hypothesis — T=90 (raises exit, per entry 104,
 * the only lever with a demonstrated transfer) crossed with m=0.5 and C=0.0 (both in the direction
 * that should make forcing more SELECTIVE and therefore raise conversion, if the mechanism is what
 * the owner suspects) — three branches, stated before measurement:
 *
 *   (i)   THE ARCHITECTURE IS THE THING. The joint arm lands (or comes materially closer to) the
 *         triple — exit up toward real AND conversion not falling as far, or rising — AND the
 *         multi-channel share collapses well below 90%. ⇒ the stack was genuinely loosened.
 *   (ii)  VALUES MOVED, ARCHITECTURE DID NOT. The joint arm moves the triple (in either direction)
 *         but multi-channel share stays ~90% (say, above 80%). ⇒ the escalators are still stacked;
 *         whatever moved is a level shift, not a structural one, and single-lever refusals will
 *         return under different values.
 *   (iii) NEITHER. The joint arm moves neither the triple materially nor the multi-channel share.
 *         ⇒ the stack is not the mechanism for THIS combination of directions either — a further,
 *         different combination (not explored here) would be owed.
 *
 * The branch NOT expected going in: (iii). Entry 105's own finding (arrival's *presence*, not its
 * *exclusive necessity*, correlates with higher sack rate — "arrival never forcing" plays convert
 * at 0.99% vs 18.43%) argues against a NARROWER arrival horizon raising conversion in the direction
 * hoped for, so (ii) is the prior-favoured branch, and (i)/(iii) are both live.
 *
 * ================== HELD CONSTANT (entry 37 — every arm names every tunable held) ==================
 *
 * `DEFAULT_TUNABLES` for everything not named above, EVERY ARM, INCLUDING `arrival.
 * pressureWithinSeconds = 2.0` (see lever C). `pocket.forcesDecision = ["COLLAPSING","IMMEDIATE"]`,
 * `pocket.thresholds` values (`PRESSURE:3, COLLAPSING:5, IMMEDIATE:7`), `pocket.minimumStatusByBand`,
 * `pocket.sackWhenNoTarget` — none of these six tables is touched by any arm below.
 *
 * ================== THE MACHINERY: REUSED, NOT REINVENTED (Charter — do not write a fifth harness) ==================
 *
 * `reconstructPlay`/`CHANNEL_IDS`/`severityOf` are IMPORTED from `pocketChannelShares.ts`, exactly
 * as `arrivalForcingAttribution.test.ts` imports them. The per-game PLAY_START buffering, the
 * play-terminal-outcome scan (forced/arrived/sacked/scrambled/threw/threwAway), and the
 * `wouldStillForceWithout` exclusive-attribution test below are COPIED, unchanged in method, from
 * that file's own `processGame`/`wouldStillForceWithout` (they are file-local there, not exported,
 * so "reuse" here means identical algorithm over the identical imported reconstruction, run across
 * new ARMS — not a new instrument). The only addition is the outer loop over the 27-arm grid and
 * the tunables-patch builder for the three levers.
 *
 *   FF_JFS=1 pnpm --filter @ff/calibration exec vitest run test/jointForcingSweep.test.ts
 *   FF_JFS=1 FF_JFS_GAMES=496 ...                      (re-run the WHOLE 27-arm grid at 496 — slow)
 *   FF_JFS_496=1 pnpm --filter @ff/calibration exec vitest run test/jointForcingSweep.test.ts
 *                                                       (headline arms ONLY, confirmed at n=496)
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { CHANNEL_IDS, reconstructPlay, type ChannelId, type TickChannels } from "../src/knownTruth/pocketChannelShares.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";
import { supplyAt, SUPPLY_COMMITTED } from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_JFS"] === "1";
const ENABLED_496 = process.env["FF_JFS_496"] === "1";
const GRID_GAMES = Number(process.env["FF_JFS_GAMES"] ?? "150");
const BATCH_SEED = "baseline-0001";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 2): string {
  return d === 0 ? "—" : `${((100 * n) / d).toFixed(places)}%`;
}

// ---------------------------------------------------------------------------
// PREMISE LEDGER — every cited constant checked against the tree, not asserted in prose.
// ---------------------------------------------------------------------------

describe("premise ledger (checked against the committed tree, reported either way)", () => {
  it("verifies every cited constant before any arm is measured", () => {
    const winRow = DEFAULT_TUNABLES.passRush.bands.find((b) => b.label === "RUSHER_WINS_REP");
    expect(winRow?.minMargin).toBe(15);
    expect(DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_BEATEN.delta).toBe(1);
    expect(DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_GAINING.delta).toBe(1);
    expect(DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_WINS_REP.delta).toBe(2);
    const collapsingRow = DEFAULT_TUNABLES.pocket.thresholds.find((t) => t.label === "COLLAPSING");
    expect(collapsingRow?.minProgress).toBe(5);
    expect(DEFAULT_TUNABLES.clock.tickStepSeconds).toBe(0.5);
    // testimony: "delta 1 per 0.5s, COLLAPSING at 5 => 2.5s of 'slightly losing' forces" — VERIFIED:
    expect((collapsingRow!.minProgress / 1) * DEFAULT_TUNABLES.clock.tickStepSeconds).toBe(2.5);
    expect(DEFAULT_TUNABLES.arrival.collapsingWithinSeconds).toBe(1.0);
    expect(DEFAULT_TUNABLES.arrival.pressureWithinSeconds).toBe(2.0);
    expect(DEFAULT_TUNABLES.arrival.immediateWithinSeconds).toBe(0.0);
    expect(SUPPLY_COMMITTED).toBe(15);
    say("PREMISE LEDGER: all cited constants verified against DEFAULT_TUNABLES. No refutation.");
  });
});

// ---------------------------------------------------------------------------
// LEVER B — the counter rate multiplier. `pocket.thresholds` is untouched by this function.
// ---------------------------------------------------------------------------

const COUNTER_BANDS = ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING"] as const;

function counterRateAt(multiplier: number, base: Tunables): Tunables {
  if (multiplier === 1.0) return base;
  let out = base;
  for (const band of COUNTER_BANDS) {
    const committed = DEFAULT_TUNABLES.passRush.pressureProgressByBand[band].delta;
    const proposed = committed * multiplier;
    out = applyTunablePatch(out, {
      tunableId: `passRush.pressureProgressByBand.${band}.delta`,
      currentValue: committed,
      proposedValue: proposed,
      evidence:
        "JOINT FORCING SWEEP (backlog 103/104/105) — the counter's time-constant lever, " +
        "operationalised as a uniform rate multiplier over the three progress-bearing bands. " +
        "In-memory only; packages/engine/src/tunables.ts is unchanged.",
      expectedEffect:
        `${band}'s per-tick pressure accumulation scales by ${String(multiplier)}x; ` +
        "pocket.thresholds (the boundary the counter is compared against) is untouched.",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// LEVER C — the arrival horizon. `arrival.pressureWithinSeconds` is untouched (held fixed, see header).
// ---------------------------------------------------------------------------

function collapsingAt(value: number, base: Tunables): Tunables {
  if (base.arrival.collapsingWithinSeconds === value) return base;
  return applyTunablePatch(base, {
    tunableId: "arrival.collapsingWithinSeconds",
    currentValue: base.arrival.collapsingWithinSeconds,
    proposedValue: value,
    evidence:
      "JOINT FORCING SWEEP (backlog 103/104/105) — the arrival channel's forcing horizon. " +
      "In-memory only; packages/engine/src/tunables.ts is unchanged. arrival.pressureWithinSeconds " +
      "(2.0) is HELD FIXED throughout — see this file's header for why it is not a second axis.",
    expectedEffect:
      "moves which minTta values the arrival channel floors at COLLAPSING vs. CLEAN (PRESSURE's " +
      "own boundary, pressureWithinSeconds, is untouched); does not touch the band floor or the " +
      "counter directly.",
  });
}

// ---------------------------------------------------------------------------
// THE ARM — one point in the (T, m, C) grid.
// ---------------------------------------------------------------------------

interface LeverSetting {
  readonly T: number;
  readonly m: number;
  readonly C: number;
}

const T_GRID: readonly { readonly value: number; readonly label: string }[] = [
  { value: 15, label: "T=15(committed)" },
  { value: 45, label: "T=45" },
  { value: 90, label: "T=90" },
];
const M_GRID: readonly { readonly value: number; readonly label: string }[] = [
  { value: 1.0, label: "m=1.0x(committed)" },
  { value: 0.5, label: "m=0.5x(slower)" },
  { value: 2.0, label: "m=2.0x(faster)" },
];
const C_GRID: readonly { readonly value: number; readonly label: string }[] = [
  { value: 1.0, label: "C=1.0s(committed)" },
  { value: 0.0, label: "C=0.0s(floor)" },
  { value: 2.0, label: "C=2.0s(ceiling)" },
];

function armLabel(s: LeverSetting): string {
  const t = T_GRID.find((x) => x.value === s.T)!;
  const m = M_GRID.find((x) => x.value === s.m)!;
  const c = C_GRID.find((x) => x.value === s.C)!;
  return `${t.label} · ${m.label} · ${c.label}`;
}

function armKind(s: LeverSetting): string {
  const moved = [s.T !== 15, s.m !== 1.0, s.C !== 1.0].filter(Boolean).length;
  return moved === 0 ? "BASELINE" : moved === 1 ? "SINGLE" : moved === 2 ? "PAIR" : "TRIPLE";
}

function armTree(s: LeverSetting): Tunables {
  let t: Tunables = DEFAULT_TUNABLES;
  t = supplyAt(s.T, t);
  t = counterRateAt(s.m, t);
  t = collapsingAt(s.C, t);
  return t;
}

function fullGrid(): readonly LeverSetting[] {
  const out: LeverSetting[] = [];
  for (const t of T_GRID) for (const m of M_GRID) for (const c of C_GRID) {
    out.push({ T: t.value, m: m.value, C: c.value });
  }
  return out;
}

/**
 * The headline arms confirmed at n=496 — see header's pre-registration.
 *
 * The FOURTH arm, `{T:90, m:2.0, C:0.0}`, is NOT pre-registered. It is added AFTER the n=150 grid
 * was read: that grid's own summary table shows it as the single best triple-landing point of all
 * 27 — exit 28.50% (real ≈29%) and conversion 19.50% (real ≈23-25%, still short but more than
 * double the committed 17.84% and the pre-registered corner's conversion is WORSE on exit, see
 * below) — WHILE ALSO carrying multi-channel share down to 9.48% (from baseline's 90.32%). This is
 * a POST-HOC finding from scanning all 27 arms, not a confirmatory test of a stated prediction, and
 * is reported as such (look-elsewhere risk named, not hidden) — it is confirmed at n=496 alongside
 * the three pre-registered arms so the same caveat that applies to the pre-registered corner's
 * confirmation (single seed list, no resample) applies equally here, rather than leaving the most
 * interesting point in the grid uncomfirmed at the canonical corpus size.
 */
const HEADLINE_ARMS: readonly LeverSetting[] = [
  { T: 15, m: 1.0, C: 1.0 }, // BASELINE
  { T: 90, m: 1.0, C: 1.0 }, // SINGLE — the one lever with a demonstrated transfer (entry 104)
  { T: 90, m: 0.5, C: 0.0 }, // TRIPLE — the conversion-favourable joint corner (PRE-REGISTERED)
  { T: 90, m: 2.0, C: 0.0 }, // TRIPLE — the n=150 grid's own best triple-landing point (POST-HOC, NOT pre-registered)
];

// ---------------------------------------------------------------------------
// THE MACHINERY — copied, unchanged in method, from arrivalForcingAttribution.test.ts's own
// processGame/wouldStillForceWithout (file-local there, so "reuse" here means identical algorithm
// applied to new arms, not a new instrument). See this file's header.
// ---------------------------------------------------------------------------

interface PlayOutcome {
  readonly isPass: boolean;
  readonly forcedRaw: boolean;
  readonly sacked: boolean;
  readonly scrambled: boolean;
  readonly threw: boolean;
  readonly threwAway: boolean;
  readonly worstNonClean: boolean;
}

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

function processGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
  forcing: ReadonlySet<string>,
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
    const reclass = reconstructPlay(buf, tunables);
    identityChecks += reclass.identityChecks;
    identityMismatches += reclass.identityMismatches;

    let forcedRaw = false;
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
      outcome: { isPass: true, forcedRaw, sacked, scrambled, threw, threwAway, worstNonClean },
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

// ---------------------------------------------------------------------------
// THE RUNNER — one arm, GAMES games, the canonical flat-60-32t / SYNTHETIC_ROUND_ROBIN corpus.
// ---------------------------------------------------------------------------

interface ArmResult {
  readonly setting: LeverSetting;
  readonly label: string;
  readonly kind: string;
  readonly games: number;
  readonly seedDigest: string;
  readonly tunablesDigest: string;
  readonly wallMs: number;
  readonly dropbacks: number;
  readonly entryCount: number;
  readonly exitCount: number;
  readonly sacks: number;
  readonly forcedTotal: number;
  readonly soleCount: Record<ChannelId, number>;
  readonly multiChannelForced: number;
  readonly soleAmbiguity: number;
  readonly identityChecks: number;
  readonly identityMismatches: number;
}

function measureArm(setting: LeverSetting, games: number): ArmResult {
  const tunables = armTree(setting);
  const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(games, fixtures.length);
  const started = Date.now();

  let dropbacks = 0;
  let entryCount = 0;
  let exitCount = 0;
  let sacks = 0;
  let forcedTotal = 0;
  const soleCount: Record<ChannelId, number> = { counter: 0, bandFloor: 0, arrival: 0 };
  let multiChannelForced = 0;
  let soleAmbiguity = 0;
  let identityChecksTotal = 0;
  let identityMismatchesTotal = 0;
  const usedSeeds: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const { observation } = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    const { plays, identityChecks, identityMismatches } = processGame(observation.events, tunables, forcing);
    identityChecksTotal += identityChecks;
    identityMismatchesTotal += identityMismatches;

    for (const { outcome, ticks } of plays) {
      dropbacks += 1;
      if (outcome.worstNonClean) entryCount += 1;
      if (outcome.sacked) sacks += 1;
      const F = outcome.forcedRaw;
      const S = outcome.sacked;
      // exit = F || arrivedRaw || S. `arrivedRaw` is not separately tracked in this file (it is
      // reported in arrivalForcingAttribution.test.ts's Part A, which this dispatch does not
      // re-litigate); F already subsumes the overwhelming majority of arrival's contribution to
      // exit per entry 105 Part A (arrival-only was measured at 0.00%), so exit here is F || S,
      // which UNDER-counts exit by at most the 0.00%-measured arrival-only slice. Named, not hidden.
      const disrupted = F || S;
      if (disrupted) exitCount += 1;
      if (F) {
        forcedTotal += 1;
        const soleFor: ChannelId[] = [];
        for (const c of CHANNEL_IDS) {
          if (!wouldStillForceWithout(ticks, c, forcing, tunables)) soleFor.push(c);
        }
        if (soleFor.length === 0) multiChannelForced += 1;
        else if (soleFor.length === 1) soleCount[soleFor[0]!] += 1;
        else soleAmbiguity += 1;
      }
    }
    usedSeeds.push(seed);
  }

  return {
    setting,
    label: armLabel(setting),
    kind: armKind(setting),
    games: limit,
    seedDigest: digestSeeds(usedSeeds),
    tunablesDigest: stableDigest(tunables),
    wallMs: Date.now() - started,
    dropbacks,
    entryCount,
    exitCount,
    sacks,
    forcedTotal,
    soleCount,
    multiChannelForced,
    soleAmbiguity,
    identityChecks: identityChecksTotal,
    identityMismatches: identityMismatchesTotal,
};
}

// ---------------------------------------------------------------------------
// REPORTING
// ---------------------------------------------------------------------------

function reportArm(r: ArmResult): void {
  const entry = pct(r.entryCount, r.dropbacks);
  const exit = pct(r.exitCount, r.dropbacks);
  const sackRate = pct(r.sacks, r.dropbacks);
  const conversion = pct(r.sacks, r.exitCount);
  const multiShare = pct(r.multiChannelForced, r.forcedTotal);
  say("");
  say(`--- [${r.kind}] ${r.label} (n=${String(r.games)}) ---`);
  say(`tunablesDigest ${r.tunablesDigest} · seedDigest ${r.seedDigest} · wallMs ${String(r.wallMs)}`);
  say(
    `IDENTITY: ${String(r.identityMismatches)} mismatches of ${String(r.identityChecks)} checks · ` +
      `SOLE-AMBIGUITY: ${String(r.soleAmbiguity)}`,
  );
  say(
    `TRIPLE — entry ${entry} · exit ${exit} · sack ${sackRate} · conversion(sack÷exit) ${conversion} ` +
      `(dropbacks ${String(r.dropbacks)})`,
  );
  say(
    `DECOMPOSITION — forced ${String(r.forcedTotal)} = sole(counter ${String(r.soleCount.counter)}) + ` +
      `sole(bandFloor ${String(r.soleCount.bandFloor)}) + sole(arrival ${String(r.soleCount.arrival)}) + ` +
      `MULTI-CHANNEL ${String(r.multiChannelForced)} (${multiShare} of forced)`,
  );
  say(
    "##JFS##" +
      JSON.stringify({
        label: r.label,
        kind: r.kind,
        setting: r.setting,
        games: r.games,
        seedDigest: r.seedDigest,
        tunablesDigest: r.tunablesDigest,
        dropbacks: r.dropbacks,
        entryCount: r.entryCount,
        exitCount: r.exitCount,
        sacks: r.sacks,
        forcedTotal: r.forcedTotal,
        soleCount: r.soleCount,
        multiChannelForced: r.multiChannelForced,
        multiChannelShare: r.forcedTotal === 0 ? null : r.multiChannelForced / r.forcedTotal,
      }),
  );
}

function reportSummaryTable(rows: readonly ArmResult[]): void {
  say("");
  say("=======================================================================");
  say("SUMMARY — every arm, the triple AND the architectural outcome variable side by side");
  say("=======================================================================");
  say(
    "| kind | arm | entry | exit | sack | conversion | forced | multi-channel share (THE ARCHITECTURE COLUMN) |",
  );
  say("|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    say(
      `| ${r.kind} | ${r.label} | ${pct(r.entryCount, r.dropbacks)} | ${pct(r.exitCount, r.dropbacks)} | ` +
        `${pct(r.sacks, r.dropbacks)} | ${pct(r.sacks, r.exitCount)} | ${String(r.forcedTotal)} | ` +
        `${pct(r.multiChannelForced, r.forcedTotal)} |`,
    );
  }
}

function assertFalsifiers(r: ArmResult): void {
  expect(r.identityMismatches).toBe(0);
  expect(r.soleAmbiguity).toBe(0);
  const soleSum = CHANNEL_IDS.reduce((a, c) => a + r.soleCount[c], 0);
  expect(soleSum + r.multiChannelForced).toBe(r.forcedTotal);
}

// ---------------------------------------------------------------------------
// THE 27-ARM GRID, n=150 default
// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED)("joint forcing sweep — full grid (measurement only)", () => {
  it(
    "measures every (T, m, C) combination, the triple AND the channel decomposition, together",
    { timeout: 30 * 60_000 },
    () => {
      say("");
      say("=======================================================================");
      say("JOINT FORCING SWEEP — flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · batch seed " + BATCH_SEED);
      say(`GAMES=${String(GRID_GAMES)} per arm (27 arms = full 3×3×3 factorial, T×m×C)`);
      say(
        "held fixed EVERY arm: DEFAULT_TUNABLES elsewhere, incl. arrival.pressureWithinSeconds=2.0, " +
          "pocket.thresholds, pocket.minimumStatusByBand, pocket.forcesDecision, pocket.sackWhenNoTarget",
      );
      say("MEASUREMENT ONLY — no tunable moved on disk, no ruling proposed.");
      say("=======================================================================");

      const grid = fullGrid();
      expect(grid.length).toBe(27);
      const base = grid.find((s) => s.T === 15 && s.m === 1.0 && s.C === 1.0);
      expect(base).toBeDefined();

      const rows = grid.map((s) => measureArm(s, GRID_GAMES));
      for (const r of rows) {
        reportArm(r);
        assertFalsifiers(r);
      }
      reportSummaryTable(rows);

      const control = rows.find((r) => r.setting.T === 15 && r.setting.m === 1.0 && r.setting.C === 1.0);
      expect(control).toBeDefined();
      if (control !== undefined) expect(control.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
    },
  );
});

// ---------------------------------------------------------------------------
// HEADLINE ARMS, CONFIRMED AT n=496
// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED_496)("joint forcing sweep — headline arms confirmed at n=496", () => {
  it(
    "re-measures BASELINE, the best single lever (T=90), and the conversion-favourable joint corner at the canonical corpus size",
    { timeout: 60 * 60_000 },
    () => {
      say("");
      say("=======================================================================");
      say("JOINT FORCING SWEEP — HEADLINE ARMS AT n=496 (canonical corpus)");
      say("=======================================================================");
      const rows = HEADLINE_ARMS.map((s) => measureArm(s, 496));
      for (const r of rows) {
        expect(r.games).toBe(496);
        reportArm(r);
        assertFalsifiers(r);
      }
      reportSummaryTable(rows);

      const control = rows.find((r) => r.setting.T === 15 && r.setting.m === 1.0 && r.setting.C === 1.0);
      expect(control).toBeDefined();
      if (control !== undefined) expect(control.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
    },
  );
});
