/**
 * ADR-093 step 1, F5: a game takes its crew and writes it on `GAME_START`, and changes no play.
 *
 * Through `simulateGame` with `buildGameFixture`. At step 1 the loop's one use of a crew is the copy
 * `crewOnRecord` makes for `GAME_START`; no officials' roll, foul or flag is written, with a crew or
 * without one. The bundles are taken by rule-set name: the default (`legacy`) and ADR-089 step 2's
 * design bundle (`S2`), as `determinism.test.ts` plays whole games under it.
 */
import { describe, expect, it } from "vitest";
import { officiatingCrewId } from "@ff/contracts";
import type { CrewLeanFamily, MatchEvent, OfficiatingCrew } from "@ff/contracts";
import type { GameEventEnvelope } from "../src/game/events.js";
import { defaultPlayCaller } from "../src/game/playCaller.js";
import { simulateGame } from "../src/game/simulateGame.js";
import type { GameResult } from "../src/game/simulateGame.js";
import type { GameInputs, PlayCaller } from "../src/game/types.js";
import { OfficialsError } from "../src/officials/officials.js";
import type { Tunables } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { RULE_SETS } from "./pocketTunables.js";

type StartPayload = Extract<MatchEvent, { type: "GAME_START" }>["payload"];

const BUNDLES: readonly { readonly name: string; readonly tunables: Tunables }[] = RULE_SETS.filter(
  (r) => r.name === "legacy" || r.name === "S2",
);

const FAMILIES: readonly CrewLeanFamily[] = ["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"];

const CREW: OfficiatingCrew = {
  id: officiatingCrewId("crew-07"),
  referee: "C. Stand-In",
  leans: { LINE_HOLDING: 62, COVERAGE: 50, PLAYER_SAFETY: 44, TECHNICAL: 58, SNAP: 50 },
};

const STRICTEST: OfficiatingCrew = {
  id: officiatingCrewId("crew-17"),
  referee: "D. Stand-In",
  leans: { LINE_HOLDING: 100, COVERAGE: 100, PLAYER_SAFETY: 100, TECHNICAL: 100, SNAP: 100 },
};

function play(seed: string, over: Partial<Pick<GameInputs, "crew" | "scheduled" | "callers">>, tunables?: Tunables): GameResult {
  const fixture = buildGameFixture({ seed });
  const inputs: GameInputs = { ...fixture.inputs, ...over };
  return simulateGame(fixture.state, inputs, fixture.seed, tunables);
}

/** The game's one `GAME_START`, which is its first event. */
function gameStartOf(result: GameResult): StartPayload {
  expect(result.events.filter(({ event }) => event.type === "GAME_START")).toHaveLength(1);
  const first = result.events[0]?.event;
  if (first?.type !== "GAME_START") throw new Error("a game opens on GAME_START");
  return first.payload;
}

/** The stream as JSON text with `GAME_START.payload.crew` deleted, every other key in its place. */
function streamWithoutCrew(events: readonly GameEventEnvelope[]): string {
  const copy = JSON.parse(JSON.stringify(events)) as { event: { type: string; payload: Record<string, unknown> } }[];
  for (const envelope of copy) if (envelope.event.type === "GAME_START") delete envelope.event.payload["crew"];
  return JSON.stringify(copy);
}

/** A caller that writes down every question the game asks it, then answers as the default does. */
function askingCaller(name: string, asked: string[]): PlayCaller {
  const answer = defaultPlayCaller(name);
  return {
    name,
    callOffense: (request, rng) => {
      asked.push(`${name}: offense`);
      return answer.callOffense(request, rng);
    },
    callDefense: (request, rng) => {
      asked.push(`${name}: defense`);
      return answer.callDefense(request, rng);
    },
    decideFourthDown: (request) => {
      asked.push(`${name}: fourth down`);
      return answer.decideFourthDown(request);
    },
    decideCoinToss: (request) => {
      asked.push(`${name}: coin toss`);
      return answer.decideCoinToss(request);
    },
  };
}

describe("ADR-093 step 1: the game takes a crew", () => {
  it("a game with no crew writes GAME_START with home, away and seed only", () => {
    const result = play("officials-no-crew", {});
    const payload = gameStartOf(result);
    expect(Object.keys(payload)).toEqual(["home", "away", "seed"]);
    expect(payload).toEqual({ home: result.summary.home, away: result.summary.away, seed: "officials-no-crew" });
    // The schedule alone writes no crew either.
    const scheduled = play("officials-no-crew", { scheduled: { kind: "WILD_CARD", neutralSite: false } });
    expect(Object.keys(gameStartOf(scheduled))).toEqual(["home", "away", "seed"]);
  });

  it("a crew rides whole on GAME_START, last, copied and in family order", () => {
    const given = {
      roster: ["a franchise-side key the record never carries"],
      leans: { SNAP: 50, TECHNICAL: 58, PLAYER_SAFETY: 44, COVERAGE: 50, LINE_HOLDING: 62 },
      referee: "C. Stand-In",
      id: officiatingCrewId("crew-07"),
    };
    const payload = gameStartOf(play("officials-crew-rides", { crew: given }));
    expect(Object.keys(payload)).toEqual(["home", "away", "seed", "crew"]);
    const crew = payload.crew;
    if (crew === undefined) throw new Error("the crew is on the record");
    expect(Object.keys(crew)).toEqual(["id", "referee", "leans"]);
    expect(Object.keys(crew.leans)).toEqual(FAMILIES);
    expect(crew).toEqual(CREW);
    expect("roster" in crew).toBe(false);
    expect(crew).not.toBe(given);
    expect(crew.leans).not.toBe(given.leans);
  });

  it("a crew changes nothing but GAME_START.crew", () => {
    expect(BUNDLES.map((b) => b.name)).toEqual(["legacy", "S2"]);
    for (const { name, tunables } of BUNDLES) {
      const seed = `officials-crew-changes-nothing-${name}`;
      const without = play(seed, {}, tunables);
      const withCrew = play(seed, { crew: CREW }, tunables);
      expect(gameStartOf(withCrew).crew, name).toEqual(CREW);
      expect(JSON.stringify(withCrew.events), name).not.toBe(JSON.stringify(without.events));
      expect(streamWithoutCrew(withCrew.events), name).toBe(JSON.stringify(without.events));
      expect(JSON.stringify(withCrew.newState), name).toBe(JSON.stringify(without.newState));
      expect(JSON.stringify(withCrew.summary), name).toBe(JSON.stringify(without.summary));
      expect(JSON.stringify(withCrew.statlines), name).toBe(JSON.stringify(without.statlines));
      expect(without.events.length, name).toBeGreaterThan(1000);
    }
  });

  it("the schedule's kind and site change nothing at step 1", () => {
    for (const { name, tunables } of BUNDLES) {
      const seed = `officials-schedule-${name}`;
      const regular = play(seed, {}, tunables);
      const final = play(seed, { scheduled: { kind: "CHAMPIONSHIP", neutralSite: true } }, tunables);
      expect(JSON.stringify(final.events), name).toBe(JSON.stringify(regular.events));
      expect(JSON.stringify(final.newState), name).toBe(JSON.stringify(regular.newState));
      expect(JSON.stringify(final.summary), name).toBe(JSON.stringify(regular.summary));
    }
  });

  it("no game writes an officials' roll, a foul or a flag", () => {
    const officialsKinds = new Set(["penalty_check", "official_sees", "phantom_flag"]);
    let games = 0;
    let checks = 0;
    for (const { name, tunables } of BUNDLES) {
      for (const crew of [undefined, STRICTEST]) {
        for (let i = 1; i <= 4; i++) {
          const result = play(`officials-guard-${i}`, crew === undefined ? {} : { crew }, tunables);
          games += 1;
          for (const { event } of result.events) {
            const where = `${name}, seed ${i}, ${crew === undefined ? "no crew" : "the strictest crew"}`;
            expect(event.type === "FOUL" || event.type === "PENALTY", where).toBe(false);
            if (event.type !== "CHECK") continue;
            checks += 1;
            expect(officialsKinds.has(event.payload.checkKind), `${where}: ${event.payload.checkKind}`).toBe(false);
          }
        }
      }
    }
    expect(games).toBe(16);
    // Not vacuous: the games rolled thousands of other checks.
    expect(checks).toBeGreaterThan(16 * 100);
  });

  it("a game with a crew replays byte for byte", () => {
    for (const { name, tunables } of BUNDLES) {
      const first = play(`officials-replay-${name}`, { crew: CREW }, tunables);
      const second = play(`officials-replay-${name}`, { crew: CREW }, tunables);
      expect(JSON.stringify(second.events), name).toBe(JSON.stringify(first.events));
      expect(JSON.stringify(second.newState), name).toBe(JSON.stringify(first.newState));
      expect(JSON.stringify(second.summary), name).toBe(JSON.stringify(first.summary));
      expect(JSON.stringify(second.statlines), name).toBe(JSON.stringify(first.statlines));
    }
  });

  it("a bad crew is refused before the first event", () => {
    const { SNAP: _dropped, ...fourFamilies } = CREW.leans;
    const bad: readonly (readonly [string, OfficiatingCrew])[] = [
      ["a lean of 101", { ...CREW, leans: { ...CREW.leans, COVERAGE: 101 } }],
      ["a missing family", { ...CREW, leans: fourFamilies as OfficiatingCrew["leans"] }],
      ["an empty referee", { ...CREW, referee: "" }],
    ];
    for (const [why, crew] of bad) {
      const asked: string[] = [];
      const callers = { home: askingCaller("home", asked), away: askingCaller("away", asked) };
      let result: GameResult | undefined;
      expect(() => {
        result = play("officials-bad-crew", { crew, callers });
      }, why).toThrow(OfficialsError);
      expect(result, why).toBeUndefined();
      // GAME_START is the game's first event and the coin toss's question follows it: nothing was asked.
      expect(asked, why).toEqual([]);
    }
    // The same callers with a good crew are asked the coin toss first, so the check above can fail.
    const asked: string[] = [];
    play("officials-bad-crew", { crew: CREW, callers: { home: askingCaller("home", asked), away: askingCaller("away", asked) } });
    expect(asked[0]).toMatch(/coin toss$/);
  });
});
