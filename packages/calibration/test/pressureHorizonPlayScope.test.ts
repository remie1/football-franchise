/**
 * ============================================================================
 * ROADMAP 1e — `arrival.pressureWithinSeconds` AT PLAY SCOPE. RAW / EXCLUSIVE / ISOLATION.
 * ============================================================================
 *
 *   FF_PH_SCOPE=1 pnpm --filter @ff/calibration exec vitest run test/pressureHorizonPlayScope.test.ts
 *   FF_PH_SCOPE=1 FF_PH_SCOPE_GAMES=496 ...
 *
 * ⚠ TIER 3 (Charter §4.1) — env-gated, so CI cannot tell whether a human typed the variable.
 * ⚠ MEASUREMENT ONLY (ADR-027). Every arm is an in-memory `applyTunablePatch`; nothing here writes
 *   `packages/engine/src/tunables.ts`.
 *
 * ================== WHY THIS FIRST (`calibration.md` §5.3, backlog 53) ==================
 *
 * `pressureWithinSeconds` is a per-play subject (it decides ticks within one dropback), so its reach
 * is priced at PLAY scope before any corpus rate is quoted — a corpus arm cannot distinguish "no
 * effect" from "effect swamped by composition" (ADR-045 §3a's 17× lesson, `harness/playScope.ts`'s
 * register).
 *
 * ================== THE SUBJECT PREDICATE IS A CLAIM ABOUT ONE MECHANISM ==================
 *
 * `arrival.pressureWithinSeconds` is read in exactly one place, `pocketFloorFromArrival`
 * (`pressureHorizonPatches.ts`'s header). Predicate for horizon arm `H`: **the play carries at least
 * one `POCKET_STATUS` tick whose arrival-channel `minTta` exceeds `H`** — the exact condition under
 * which lowering the horizon to `H` can change what the arrival channel alone reports on that tick.
 * `maxArrivalMinTta` computes this from the published stream only (`RUSH_THREAT`, `QB_PURSUIT`,
 * `TICK`), the same pattern `geometryTimeRetirement.ts` and `pocketChannelShares.ts` already validate
 * against the engine's own reconstruction.
 *
 * ⛔ **RAW is a bound on where the CELL could matter, not on where the PUBLISHED status moves.** The
 * arrival channel is one of three the pocket status takes the WORST of (`pocketChannelShares.ts`).
 * A play in RAW's population can still fail to move at all if the band floor or the counter is
 * already at least as severe on every tick the arrival channel would have relaxed — which is exactly
 * ADR-049's over-determination lesson landing on this subject. EXCLUSIVE is what actually measures it.
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | arm | stated subject | what actually reddens it |
 * |---|---|---|
 * | arrival-reconstruction self-check | `maxArrivalMinTta` agrees with the engine's own channel | `arrivalNeverExceedsPublished` finding a tick where the arrival channel alone implies a status the engine published something milder than |
 * | ISOLATION | no play outside RAW can move | a second reader of `arrival.pressureWithinSeconds`, or a population predicate that misses a tick |
 * | COMPLEMENT DIGEST | `exclusive` is a bound, not an observation | an unpaired replay |
 * | RAW ≥ EXCLUSIVE | the population contains the effect | a play outside the predicate moving |
 * | LIVE POPULATION | the corpus exercises the subject | zero plays ever carry a live threat |
 *
 * ⚠ The printed counts themselves are measurements, not gates — reddened only by the arms above.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
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
  HORIZON_GRID,
  HORIZON_PATH,
  HORIZON_COMMITTED,
  arrivalNeverExceedsPublished,
  horizonAt,
  horizonLabel,
  maxArrivalMinTta,
} from "./pressureHorizonPatches.js";

const ENABLED = process.env["FF_PH_SCOPE"] === "1";
const d = ENABLED ? describe : describe.skip;

const BATCH_SEED = "baseline-0001";
const GAMES = Number(process.env["FF_PH_SCOPE_GAMES"] ?? "96");

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function pct(n: number, dnm: number, places = 3): string {
  return dnm === 0 ? "—" : `${((n / dnm) * 100).toFixed(places)}%`;
}

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

function playResultOf(events: readonly MatchEventEnvelope[]): unknown {
  return events.filter((e) => e.event.type === "PLAY_RESULT").map((e) => e.event.payload);
}

interface Arm {
  readonly h: number;
  readonly label: string;
  readonly tunables: Tunables;
}

d("roadmap 1e — arrival.pressureWithinSeconds at play scope", () => {
  it(
    "prices RAW, EXCLUSIVE stream, EXCLUSIVE outcome and ISOLATION for every horizon rung",
    { timeout: 6 * 60 * 60_000 },
    () => {
      const captured = captureCorpus(GAMES);
      const plays = captured.plays.map((p) => p.play);
      const seedFor = new Map(captured.plays.map((p) => [p.play, p.seed] as const));
      const seedOf = (play: CapturedPlay): string => seedFor.get(play) ?? "";

      const controlEvents = new Map<CapturedPlay, ReturnType<typeof simulatePlay>["events"]>();
      const maxTta = new Map<CapturedPlay, number | undefined>();
      let selfCheckPlays = 0;
      let selfCheckFailures = 0;
      let dropbacksWithThreat = 0;

      for (const play of plays) {
        const events = simulatePlay(play.state, play.calls, seedOf(play), DEFAULT_TUNABLES).events;
        controlEvents.set(play, events);
        const m = maxArrivalMinTta(events);
        maxTta.set(play, m);
        if (m !== undefined) dropbacksWithThreat += 1;
        selfCheckPlays += 1;
        if (!arrivalNeverExceedsPublished(events)) selfCheckFailures += 1;
      }

      say("");
      say("=======================================================================");
      say("ROADMAP 1e — arrival.pressureWithinSeconds, PLAY SCOPE");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(captured.gamesRun)} games`);
      say(`batch seed "${BATCH_SEED}" · seed digest ${captured.seedDigest}`);
      say(`plays replayed ${String(plays.length)} · plays with a live threat at ≥1 status tick ${String(dropbacksWithThreat)} (${pct(dropbacksWithThreat, plays.length)})`);
      say(`arrival-reconstruction self-check: ${String(selfCheckPlays)} plays, ${String(selfCheckFailures)} where the reconstructed arrival channel exceeded the published severity`);
      say(`subject: ${HORIZON_PATH}, committed ${horizonLabel(HORIZON_COMMITTED)}`);
      say("MEASUREMENT ONLY — every arm is an in-memory patch; TUNABLES on disk is UNCHANGED.");
      say("=======================================================================");

      expect(selfCheckFailures).toBe(0);
      expect(dropbacksWithThreat).toBeGreaterThan(0);

      say("");
      say("### Distribution of the maximum arrival-channel `minTta` ever observed per play");
      say("(the number a horizon arm has to beat to change anything on that play)");
      say("");
      const buckets = new Map<string, number>();
      for (const m of maxTta.values()) {
        const key = m === undefined ? "no live threat" : (Math.round(m * 2) / 2).toFixed(1);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      say("| max minTta | plays | share |");
      say("|---|---|---|");
      for (const [key, n] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        say(`| ${key} | ${String(n)} | ${pct(n, plays.length)} |`);
      }

      const arms: readonly Arm[] = HORIZON_GRID.filter((h) => h !== HORIZON_COMMITTED).map((h) => ({
        h,
        label: `${HORIZON_PATH} INF→${horizonLabel(h)}`,
        tunables: horizonAt(h),
      }));

      say("");
      say("| horizon | RAW | RAW % | EXCL stream | EXCL % | EXCL outcome | EXCL outcome % | over-statement (outcome) | ISOLATION | complement equal |");
      say("|---|---|---|---|---|---|---|---|---|---|");

      for (const arm of arms) {
        // `priceAtPlayScope`'s `population` callback is handed the CONTROL arm's own events for the
        // play currently being priced, so the predicate can simply re-run `maxArrivalMinTta` on
        // those events directly — cheap and idempotent, and it needs no separate identity join
        // against the precomputed `maxTta` map above (that map is used only for the header census).
        const rawPredicate = (events: readonly MatchEventEnvelope[]): boolean => {
          const m = maxArrivalMinTta(events);
          return m !== undefined && m > arm.h;
        };
        const rejected = plays.filter((p) => !rawPredicate(controlEvents.get(p) ?? []));

        const price = priceAtPlayScope(plays, seedOf, DEFAULT_TUNABLES, arm.tunables, {
          population: rawPredicate,
          outcomeOf: playResultOf,
        });
        const isolation = priceAtPlayScope(rejected, seedOf, DEFAULT_TUNABLES, arm.tunables);
        const raw = price.raw ?? 0;
        const outcome = price.outcomeMoved ?? 0;

        say(
          `| ${horizonLabel(arm.h)} | ${String(raw)} | ${pct(raw, price.plays)} | ${String(price.exclusive)} | ` +
            `${pct(price.exclusive, price.plays)} | ${String(outcome)} | ${pct(outcome, price.plays)} | ` +
            `${outcome === 0 ? "∞" : (raw / outcome).toFixed(2)}× | ${String(isolation.exclusive)} of ${String(rejected.length)} | ` +
            `${String(price.complementDigestControl === price.complementDigestTreatment)} |`,
        );

        expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
        expect(raw).toBeGreaterThanOrEqual(price.exclusive);
        expect(isolation.exclusive).toBe(0);
      }

      say("");
      say(
        "⚠ EXCLUSIVE stream is expected to approach RAW: `RUSH_THREAT.etaTick` is published on every " +
          "tick a threat is live, so a horizon that reclassifies a tick moves the stream whether or " +
          "not the PUBLISHED POCKET_STATUS (worst-of-three) changes. EXCLUSIVE outcome is the number " +
          "that answers 'does anything the play-caller or scoreboard sees move' and is the one this " +
          "file's own claims are built on.",
      );

      expect(plays.length).toBeGreaterThan(0);
    },
  );
});
