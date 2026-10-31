/**
 * ADR-089 STEP 3, K5 (plan §2.11, §9 commit 15): the frozen pair draws the arm's picture.
 *
 * An arm publishes the picture its physics reads. The free-run block's picture dial
 * (`blitzPickup.freeRun.picture`) says which: `AS_RULED` is ADR-090's picture under its rulings,
 * `snapPicture(input)`; `MUG_HEAD_ONLY` (C6, ADR-090 question 1's other answer) is
 * `snapPicture(input, { mug: "HEAD_ONLY" })`, which skips beat 3 for the Mug alone. A bundle with no
 * free-run block (legacy, s1, s2, and C13) draws the ruled picture as before, so its line-ups,
 * and so its games, are unchanged (the golden digests and the s1 and s2 pins say so too).
 *
 * Read here through a recorder around the real frozen pair: at each line-up it returns what the
 * pair drew for the request, and asks the same pair, on the same request and the same Rng, for the
 * picture under the ruled dial, the head-only dial and the legacy tunables. The pair's line-up
 * throws no die (it re-resolves the snap from a pure, label-addressed Rng), so asking again changes
 * nothing; the test checks that too, by playing the same game through the harness without the
 * recorder.
 */
import type { MatchEventEnvelope, SnapPicture } from "@ff/contracts";
import { createMatchState, DEFAULT_TUNABLES, simulateGame, type PlayCaller, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { frozenCallerPair, pictureOptionsOf } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { buildFixture } from "../src/harness/schedule.js";
import { armById, everyArm } from "../src/pocket/arms.js";
import { goldenFixtures, goldenGames } from "../src/pocket/corpus.js";
import { mirrorCaller } from "../src/pocket/mirror.js";
import { ENGINE_RULES, rulesTunables } from "../src/pocket/rules.js";

type LineUp = NonNullable<PlayCaller["lineUp"]>;

/** The ruled picture's dial (C1) and the head-only one (C6): the same arm but for the dial. */
const AS_RULED = armById("C1").tunables;
const HEAD_ONLY = armById("C6").tunables;

/** Golden flat games played here: enough line-ups to see Mug calls in both directions. */
const GAMES = 3;

interface Drawn {
  /** The defense's call wears the Mug front look. */
  readonly mug: boolean;
  /** The tunables the engine asked with. */
  readonly tunables: Tunables;
  readonly published: SnapPicture;
  readonly asRuled: SnapPicture;
  readonly headOnly: SnapPicture;
  readonly legacy: SnapPicture;
}

function recorder(inner: PlayCaller, out: Drawn[]): PlayCaller {
  const lineUp = inner.lineUp;
  if (lineUp === undefined) throw new Error("the frozen pair draws a line-up");
  const draw = (request: Parameters<LineUp>[0], rng: Parameters<LineUp>[1]): SnapPicture => {
    const picture = lineUp(request, rng);
    if (picture === undefined) throw new Error("the frozen pair drew no picture");
    return picture;
  };
  return {
    name: inner.name,
    callOffense: (request, rng) => inner.callOffense(request, rng),
    callDefense: (request, rng) => inner.callDefense(request, rng),
    lineUp: ((request, rng) => {
      const published = draw(request, rng);
      out.push({
        mug: request.defenseCall.tags.some((t) => t.kind === "LOOK" && t.id === "MUG"),
        tunables: request.tunables,
        published,
        asRuled: draw({ ...request, tunables: AS_RULED }, rng),
        headOnly: draw({ ...request, tunables: HEAD_ONLY }, rng),
        legacy: draw({ ...request, tunables: DEFAULT_TUNABLES }, rng),
      });
      return published;
    }) satisfies LineUp,
    decideFourthDown: (request) => inner.decideFourthDown(request),
    decideCoinToss: (request) => inner.decideCoinToss(request),
  };
}

/** The first `GAMES` golden flat games under `tunables`, through the recorder (inside the mirror when asked). */
function recorded(tunables: Tunables, mirror = false): { readonly streams: readonly string[]; readonly drawn: readonly Drawn[] } {
  const { index, fixtures, seeds } = goldenFixtures("flat");
  const streams: string[] = [];
  const drawn: Drawn[] = [];
  for (let i = 0; i < GAMES; i++) {
    const built = buildFixture(index, fixtures[i]!);
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion: "v7",
    });
    const home = recorder(pair.home, drawn);
    const away = recorder(pair.away, drawn);
    const coordinates = {
      season: built.fixture.season,
      week: built.fixture.week,
      home: built.fixture.home,
      away: built.fixture.away,
      ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
    };
    const callers = mirror ? { home: mirrorCaller(home), away: mirrorCaller(away) } : { home, away };
    const result = simulateGame(createMatchState(coordinates, built.snapshot, tunables), { coordinates, snapshot: built.snapshot, callers }, seeds[i]!, tunables);
    streams.push(JSON.stringify(result.events));
  }
  return { streams, drawn };
}

/** The same games through the harness, with no recorder. */
function harnessStreams(tunables: Tunables, mirror = false): readonly string[] {
  const out: string[] = [];
  goldenGames("flat", (o) => out.push(JSON.stringify(o.events as readonly MatchEventEnvelope[])), {
    tunables,
    callerVersion: "v7",
    first: GAMES,
    ...(mirror ? { mirror: true } : {}),
  });
  return out;
}

describe("pictureOptionsOf: the picture an arm's tunables ask the pair to draw", () => {
  it("the ruled picture (no options) for every bundle and every arm but C6; the head-only Mug for C6", () => {
    for (const rules of ENGINE_RULES) expect(pictureOptionsOf(rulesTunables(rules)), rules).toBeUndefined();
    for (const arm of everyArm()) {
      const expected = arm.tunables.blitzPickup.freeRun?.picture === "MUG_HEAD_ONLY" ? { mug: "HEAD_ONLY" } : undefined;
      expect(pictureOptionsOf(arm.tunables), arm.id).toEqual(expected);
    }
    expect(pictureOptionsOf(HEAD_ONLY)).toEqual({ mug: "HEAD_ONLY" });
    expect(everyArm().filter((a) => pictureOptionsOf(a.tunables) !== undefined).map((a) => a.id)).toEqual(["C6"]);
  });
});

describe("ADR-089 step 3 (K5): each arm publishes the picture its physics reads", () => {
  it("C6 publishes the head-only picture: the ruled one but on Mug calls, where the walked-up backers stand at their aligned spots", () => {
    const { streams, drawn } = recorded(HEAD_ONLY);
    expect(streams).toEqual(harnessStreams(HEAD_ONLY));
    const mugs = drawn.filter((d) => d.mug);
    const moved = mugs.filter((d) => JSON.stringify(d.headOnly) !== JSON.stringify(d.asRuled));
    console.log(`C6: ${String(drawn.length)} line-ups, ${String(mugs.length)} Mug calls, ${String(moved.length)} with a picture the head-only Mug moves`);
    expect(drawn.length).toBeGreaterThan(0);
    expect(moved.length).toBeGreaterThan(0);
    for (const d of drawn) {
      expect(d.tunables).toBe(HEAD_ONLY);
      expect(d.published).toStrictEqual(d.headOnly);
      if (!d.mug) expect(d.headOnly).toStrictEqual(d.asRuled);
    }
    // Only defenders move: the offense, the ball and every man's order are the ruled picture's.
    for (const d of moved) {
      expect(d.published.ballX).toBe(d.asRuled.ballX);
      expect(d.published.offense).toStrictEqual(d.asRuled.offense);
      expect(d.published.defense.map((s) => s.player)).toEqual(d.asRuled.defense.map((s) => s.player));
    }
  }, 600_000);

  it("C1 (AS_RULED) publishes the ruled picture, the one a bundle with no free-run block draws", () => {
    const { streams, drawn } = recorded(AS_RULED);
    expect(streams).toEqual(harnessStreams(AS_RULED));
    expect(drawn.some((d) => d.mug && JSON.stringify(d.headOnly) !== JSON.stringify(d.asRuled))).toBe(true);
    for (const d of drawn) {
      expect(d.published).toStrictEqual(d.asRuled);
      expect(d.published).toStrictEqual(d.legacy);
    }
  }, 600_000);

  it.each(["legacy", "pocket-1.s1", "pocket-1.s2"] as const)("%s: line-ups unchanged, the ruled picture on every call", (rules) => {
    const t = rulesTunables(rules);
    const { streams, drawn } = recorded(t);
    expect(streams).toEqual(harnessStreams(t));
    expect(drawn.length).toBeGreaterThan(0);
    for (const d of drawn) {
      expect(d.tunables).toBe(t);
      expect(d.published).toStrictEqual(d.asRuled);
      expect(d.published).toStrictEqual(d.legacy);
    }
  }, 600_000);
});

describe("ADR-089 step 3 (K5): the mirror seam passes the arm's tunables through (`mirrorCaller` hands the request on, calls mirrored)", () => {
  it("a mirrored C6 game: the pair inside the mirror draws the head-only picture, and the game is the harness's", () => {
    const { streams, drawn } = recorded(HEAD_ONLY, true);
    expect(streams).toEqual(harnessStreams(HEAD_ONLY, true));
    expect(drawn.length).toBeGreaterThan(0);
    for (const d of drawn) {
      expect(d.tunables).toBe(HEAD_ONLY);
      expect(d.published).toStrictEqual(d.headOnly);
    }
  }, 600_000);
});
