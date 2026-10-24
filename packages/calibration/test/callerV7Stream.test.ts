/**
 * ADR-073 step 3.5 — CALLER v7 ON THE STREAM.
 *
 * `caller.test.ts` checks v7's CALLS against v6's, call for call. This checks the GAMES:
 *
 *  1. THE PROOF, IN THE SUITE. `v7/front-0` (an empty front-look catalogue, over which the draw
 *     throws no die) plays v6's game exactly: the same `stableDigest` of the stream, and the same
 *     `JSON.stringify` of `{at, event}`, which also holds the key order. At leash 50 nothing is
 *     rolled; at leash 0 the leash's roll is thrown on the coverage read's rungs, so the proof holds
 *     under rolls too. It is made on v6 itself and on each of step 3.4's arm settings with
 *     `/front-0` added, against v6 with the same setting: the bound, pressure, front, jnc and joint
 *     parts. That is ADR-073 §4.5's "v7 `/front-0` ≡ v6" (line 810) in the suite; the arm harness
 *     proves it at scale against references taken at the 3.5 base.
 *  2. NON-VACUITY. Plain v7, the Mug alone (`/front-MUG`) and the Stem alone (`/front-STEM`) are
 *     each NOT v6's game on some seed, so `/front-0` differs from them by the looks it drops. The
 *     arms that wear the Mug also differ from v6 beyond PLAY_START's echo of the look (its
 *     `shownRush` and `tags`) on some seed: the pressure read sees the Mug's ghosts, and the play
 *     changes with it. The Stem shows no ghost and adds no roll (ADR-073 lines 584 and 812), so a
 *     Stem arm may differ from v6 in that echo alone, and nothing more is asked of it here.
 *  3. THE ECHO, PARTITIONED BY THE FRONT LOOK (ADR-073 §3.5, R28), on every PASS and RUN
 *     PLAY_START of every v7 arm. With a front LOOK tag, said once and last, the shown rush differs
 *     from the played one (`shownRushDiffers`), and its first |rush| entries name the played rushers
 *     in `rush` order (applyFrontLook writes the played rush first, then the Mug's ghosts, men
 *     shown rushing who do not come; the Stem moves the same men). Without one, the shown rush is
 *     the played rush with `move` stripped, as `shownRushStream.test.ts` checks on every caller.
 *     Each arm wears only the looks its catalogue names, and `/front-0` wears none.
 *  4. DETERMINISM (Iron Rule 4). Same seed, identical v7 stream, on plain v7 and on each narrowed
 *     arm.
 *
 * The engine's own shown-rush check (`assertShownRush`: everyone shown is on the call, nobody shown
 * twice) runs on every call of every game below; `protectionOptionsSmoke.test.ts` runs it on every
 * composed call wearing each legal look.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import type { DefensiveTag, MatchEventEnvelope, ShownRusher } from "@ff/contracts";
import { isFrontLookTag, shownRushDiffers, type FrontLookId } from "@ff/playbook";
import type { CallerVersion } from "../src/caller/anticipate.js";
import type { CallerKnobs } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures, type BuiltFixture } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const BATCH_SEED = "adr-073:caller-v7-stream";

const index = indexLeague(buildFlatLeague({ teams: 8 }));
const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 }).slice(0, 6);
const seeds = generateSeeds(BATCH_SEED, fixtures.length).seeds;
const games = fixtures.map((fixture, i) => ({ built: buildFixture(index, fixture), seed: seeds[i]! }));

/** Step 3.4's arms, as v6 knob settings (as `callerV6Stream.test.ts` names them). Joint is v6 itself. */
const V6_ARMS: readonly { readonly label: string; readonly knobs: CallerKnobs }[] = [
  { label: "bound", knobs: { drawPressures: false, drawLines: false } },
  { label: "pressure", knobs: { creeper: false, drawLines: false } },
  { label: "front", knobs: { drawPressures: false } },
  { label: "jnc", knobs: { creeper: false } },
  { label: "joint", knobs: {} },
];

/** v7's front settings: the full catalogue (plain v7), each look alone, and none. */
const V7_ARMS: readonly { readonly label: string; readonly knobs: CallerKnobs; readonly wears: readonly FrontLookId[] }[] = [
  { label: "v7", knobs: {}, wears: ["MUG", "STEM"] },
  { label: "v7/front-MUG", knobs: { frontLooks: ["MUG"] }, wears: ["MUG"] },
  { label: "v7/front-STEM", knobs: { frontLooks: ["STEM"] }, wears: ["STEM"] },
  { label: "v7/front-0", knobs: { frontLooks: [] }, wears: [] },
];

function play(
  game: { readonly built: BuiltFixture; readonly seed: string },
  callerVersion: CallerVersion,
  knobs: CallerKnobs,
  leash: number,
): readonly MatchEventEnvelope[] {
  return runOneGame({
    built: game.built,
    seed: game.seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    leash,
    callerVersion,
    ...knobs,
  }).observation.events;
}

function withoutSeq(events: readonly MatchEventEnvelope[]): unknown[] {
  return events.map((e) => ({ at: e.at, event: e.event }));
}

/** The stream with PLAY_START's echo of the defence's look (`defense.shownRush` and `defense.tags`) taken out. */
function withoutTheEcho(stream: readonly unknown[]): unknown[] {
  return stream.map((entry) => {
    const { at, event } = entry as { readonly at: unknown; readonly event: MatchEventEnvelope["event"] };
    if (event.type !== "PLAY_START") return entry;
    const payload = event.payload as { readonly defense?: Record<string, unknown> };
    if (payload.defense === undefined) return entry;
    const { shownRush: _shownRush, tags: _tags, ...defense } = payload.defense;
    return { at, event: { ...event, payload: { ...payload, defense } } };
  });
}

const leashReads = (events: readonly MatchEventEnvelope[]): number =>
  events.filter((e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "leash_discipline").length;

describe("ADR-073 step 3.5: v7/front-0 plays v6's game", () => {
  it.each([50, 0])(
    "at leash %i, game for game, digest and bytes, on v6 and on each of step 3.4's arm settings",
    (leash) => {
      let rolls = 0;
      for (const game of games) {
        for (const arm of V6_ARMS) {
          const v6Events = play(game, "v6", arm.knobs, leash);
          const v6 = withoutSeq(v6Events);
          const proof = withoutSeq(play(game, "v7", { ...arm.knobs, frontLooks: [] }, leash));
          const where = `v7/front-0 (${arm.label}) against v6 (${arm.label}), ${game.seed}, leash ${String(leash)}`;
          expect(stableDigest(proof), where).toBe(stableDigest(v6));
          expect(JSON.stringify(proof), where).toBe(JSON.stringify(v6));
          rolls += leashReads(v6Events);
        }
      }
      if (leash === 0) expect(rolls, "no leash roll at leash 0, so the proof was never made under one").toBeGreaterThan(0);
      else expect(rolls).toBe(0);
    },
    5 * 60_000,
  );

  // The proof is not vacuous: each arm that wears a look is NOT v6's game, so `/front-0` differs
  // from them by the looks it drops and by nothing else. Where the arm wears the Mug, the game also
  // differs past the echo of the look: the engine's pressure read sees its ghosts.
  it("plain v7, v7/front-MUG and v7/front-STEM are not v6's game; the Mug's arms differ past the echo of the look", () => {
    for (const arm of V7_ARMS.filter((a) => a.wears.length > 0)) {
      let differs = 0;
      let differsPastTheEcho = 0;
      for (const game of games) {
        const v6 = withoutSeq(play(game, "v6", {}, 50));
        const v7 = withoutSeq(play(game, "v7", arm.knobs, 50));
        if (stableDigest(v7) !== stableDigest(v6)) differs += 1;
        if (JSON.stringify(withoutTheEcho(v7)) !== JSON.stringify(withoutTheEcho(v6))) differsPastTheEcho += 1;
      }
      expect(differs, `${arm.label} played v6's game in every seed, so no look it wore reached the stream`).toBeGreaterThan(0);
      if (arm.wears.includes("MUG")) {
        expect(differsPastTheEcho, `${arm.label} differed from v6 only in the echo of its looks, so no Mug was ever read`).toBeGreaterThan(0);
      }
    }
  }, 5 * 60_000);
});

describe("ADR-073 §3.5: on the stream, a front LOOK tag iff the shown rush is not the played one", () => {
  interface EchoFold {
    passPlays: number;
    runPlays: number;
    /** PLAY_STARTs carrying a front LOOK tag, by kind of play and by look. */
    wornPass: number;
    wornRun: number;
    readonly wornBy: Map<string, number>;
    /** Ghosts: men a Mug showed rushing who were not in the played rush. */
    ghosts: number;
    readonly failures: string[];
  }

  function foldEchoes(label: string, wears: readonly FrontLookId[], events: readonly MatchEventEnvelope[], into: EchoFold): void {
    for (const envelope of events) {
      const event = envelope.event;
      if (event.type !== "PLAY_START") continue;
      const payload = event.payload as {
        readonly kind?: unknown;
        readonly defense?: { readonly rush?: unknown; readonly shownRush?: unknown; readonly tags?: unknown };
      };
      const where = `${label} play ${String(event.playId)} (${String(payload.kind)})`;
      // Only the pass and run sims open a play with PLAY_START; any other kind is a payload this
      // test does not know how to check, so it fails rather than skips.
      const isPass = payload.kind === "PASS_PLAY_V1";
      if (isPass) into.passPlays += 1;
      else if (payload.kind === "RUN_PLAY_V1") into.runPlays += 1;
      else {
        into.failures.push(`${where}: a PLAY_START of a kind this test does not check`);
        continue;
      }
      const rush = payload.defense?.rush;
      const shown = payload.defense?.shownRush;
      const tags = payload.defense?.tags;
      if (!Array.isArray(rush) || !Array.isArray(shown) || !Array.isArray(tags)) {
        into.failures.push(`${where}: defense.rush, defense.shownRush or defense.tags is missing from PLAY_START`);
        continue;
      }
      const played = (rush as readonly Record<string, unknown>[]).map(({ move: _move, ...rest }) => rest);
      const fronts = (tags as readonly DefensiveTag[]).flatMap((tag, i) => (isFrontLookTag(tag) ? [{ tag, i }] : []));
      const [front] = fronts;
      if (front === undefined) {
        if (!isDeepStrictEqual(shown, played)) {
          into.failures.push(
            `${where}: no front LOOK tag, and the shown rush is not the played rush, move stripped\n` +
              `  shown:  ${JSON.stringify(shown)}\n  played: ${JSON.stringify(played)}`,
          );
        }
        continue;
      }
      if (isPass) into.wornPass += 1;
      else into.wornRun += 1;
      into.wornBy.set(front.tag.id, (into.wornBy.get(front.tag.id) ?? 0) + 1);
      if (fronts.length > 1) into.failures.push(`${where}: ${String(fronts.length)} front LOOK tags, at most one a call (R21)`);
      if (front.i !== tags.length - 1) into.failures.push(`${where}: the ${front.tag.id} look is not the last tag`);
      if (!(wears as readonly string[]).includes(front.tag.id)) {
        into.failures.push(`${where}: wore ${front.tag.id}, which the arm's catalogue [${wears.join(", ")}] does not name`);
      }
      const shownRush = shown as readonly ShownRusher[];
      if (!shownRushDiffers(rush as readonly ShownRusher[], shownRush)) {
        into.failures.push(
          `${where}: a ${front.tag.id} LOOK tag, and the shown rush does not differ from the played one\n` +
            `  shown:  ${JSON.stringify(shown)}\n  played: ${JSON.stringify(played)}`,
        );
      }
      // The played rushers first, in `rush` order (critique CC finding 5): a permuted copy passes
      // R28 as worded, so the order is pinned here.
      const playedIds = played.map((r) => String(r["rusher"]));
      const leading = shownRush.slice(0, playedIds.length).map((r) => String(r.rusher));
      if (!isDeepStrictEqual(leading, playedIds)) {
        into.failures.push(
          `${where}: the shown rush does not open with the played rushers in rush order: ` +
            `${JSON.stringify(leading)} against ${JSON.stringify(playedIds)}`,
        );
      }
      // The Mug adds its ghosts after them; the Stem moves the men who come and adds nobody.
      const extra = shownRush.length - playedIds.length;
      if (front.tag.id === "MUG") {
        if (extra <= 0) into.failures.push(`${where}: a Mug that shows nobody rushing who does not come`);
        into.ghosts += Math.max(0, extra);
      } else if (extra !== 0) {
        into.failures.push(`${where}: a Stem that shows ${String(shownRush.length)} rushers for ${String(playedIds.length)} played`);
      }
    }
  }

  it.each(V7_ARMS.map((arm) => [arm.label, arm] as const))(
    "%s: every untagged PLAY_START echoes the played rush; every tagged one names its look last and shows another rush, the played men first",
    (_label, arm) => {
      const fold: EchoFold = { passPlays: 0, runPlays: 0, wornPass: 0, wornRun: 0, wornBy: new Map(), ghosts: 0, failures: [] };
      for (const game of games) foldEchoes(`${arm.label} ${game.seed}`, arm.wears, play(game, "v7", arm.knobs, 50), fold);
      const corpus =
        `${arm.label}, batch "${BATCH_SEED}", ${String(games.length)} games, ${String(fold.passPlays)} pass + ` +
        `${String(fold.runPlays)} run plays, worn on ${String(fold.wornPass)} + ${String(fold.wornRun)} ` +
        `(${JSON.stringify(Object.fromEntries(fold.wornBy))}), ${String(fold.ghosts)} ghosts`;
      expect(fold.failures, `${String(fold.failures.length)} failures (${corpus}):\n${fold.failures.slice(0, 10).join("\n")}`).toEqual([]);
      expect(fold.passPlays, corpus).toBeGreaterThan(200);
      expect(fold.runPlays, corpus).toBeGreaterThan(100);
      // Non-vacuity: every look the arm names was worn and echoed, and looks were worn on dropbacks
      // and on runs alike.
      expect([...fold.wornBy.keys()].sort(), corpus).toEqual([...arm.wears].sort());
      if (arm.wears.length === 0) {
        expect(fold.wornPass + fold.wornRun, corpus).toBe(0);
      } else {
        expect(fold.wornPass, `no dropback wore a front look (${corpus})`).toBeGreaterThan(0);
        expect(fold.wornRun, `no run wore a front look (${corpus})`).toBeGreaterThan(0);
      }
      if (arm.wears.includes("MUG")) expect(fold.ghosts, corpus).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});

describe("ADR-073 step 3.5: determinism (Iron Rule 4)", () => {
  it.each([50, 20])("the same seed plays the identical stream at leash %i, on plain v7 and on each narrowed arm", (leash) => {
    const game = games[0]!;
    for (const arm of V7_ARMS) {
      const a = withoutSeq(play(game, "v7", arm.knobs, leash));
      const b = withoutSeq(play(game, "v7", arm.knobs, leash));
      expect(stableDigest(b), arm.label).toBe(stableDigest(a));
      expect(JSON.stringify(b), arm.label).toBe(JSON.stringify(a));
    }
  }, 5 * 60_000);
});
