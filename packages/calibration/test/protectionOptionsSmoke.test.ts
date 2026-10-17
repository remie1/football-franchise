/**
 * ADR-073 step 3.3 — EVERY PASS CARD'S OPTIONS, THROUGH THE ENGINE (left for 3.3 by 3.2b, §10).
 *
 * `playbook/test/protectionOptions.test.ts` checks what `protectionOptions` states, against the
 * playbook's own coherence rules. This plays it: every pass concept in the corpus, against every
 * defensive card it can be protected against, with its options stated and the caller's leash of 50
 * stamped, through one snap of `simulatePlay`. That runs the engine's validator (contracts P3's
 * four rules) and the pressure read on every card the corpus has, which no game is sure to reach:
 * the frozen caller draws by situation, and some cards are rare.
 *
 * The snap is a pass play captured from a v4 game (the state a real game hands the engine), with
 * each concept's men bound from that offence's own depth chart and each card's from the defence's.
 *
 * The census at the end pins what the corpus offers today: which concepts slide, and which back or
 * end each card may keep in. A new card fails it on purpose, so that the count is read again.
 */
import { describe, expect, it } from "vitest";
import type { OffensivePlayCall } from "@ff/contracts";
import { createMatchState, simulateGame, simulatePlay, DEFAULT_TUNABLES } from "@ff/engine";
import {
  DEFENSIVE_CARDS,
  PASS_CONCEPTS,
  UnprotectableCallError,
  buildDefensiveUnit,
  buildOffensiveUnit,
  instantiateDefense,
  instantiatePass,
  protectionOptions,
} from "@ff/playbook";
import { DEFAULT_LEASH, frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { capturePlays } from "../src/harness/playScope.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

describe("ADR-073 §2.3: every pass card's options play through the engine", () => {
  it("validates and plays every concept against every card it can protect against", () => {
    const index = indexLeague(buildFlatLeague({ teams: 2 }));
    const teams = index.teamIds();
    const built = buildFixture(
      index,
      buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 1, season: 2024 })[0]!,
    );
    const coordinates = {
      season: built.fixture.season,
      week: built.fixture.week,
      home: built.fixture.home,
      away: built.fixture.away,
      ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
    };
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion: "v4",
    });
    const capture = capturePlays(pair, { coordinates, at: built.at });
    const result = simulateGame(
      createMatchState(coordinates, built.snapshot, DEFAULT_TUNABLES),
      { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } },
      "adr-073:options-smoke",
      DEFAULT_TUNABLES,
    );
    const snap = capture.finish(result.events).find((p) => p.calls.offense.kind === "PASS");
    if (snap === undefined) throw new Error("the captured game had no pass play");
    const homeOnOffence = String(snap.state.offenseTeam) === String(built.fixture.home);
    const offenceChart = homeOnOffence ? built.homeDepthChart : built.awayDepthChart;
    const defenceChart = homeOnOffence ? built.awayDepthChart : built.homeDepthChart;

    const played = new Set<string>();
    const slideChecked = new Map<string, number>();
    const keptInRoles = new Map<string, Set<string>>();
    let snaps = 0;
    for (const concept of PASS_CONCEPTS) {
      const unit = buildOffensiveUnit(concept.formation.personnel, offenceChart);
      const roleOf = new Map(Object.entries(unit).map(([role, id]) => [String(id), role]));
      for (const card of DEFENSIVE_CARDS) {
        const where = `${concept.id} vs ${card.id}`;
        const defense = instantiateDefense(card, buildDefensiveUnit(card.personnel, defenceChart), {
          formation: concept.formation,
          unit,
        });
        let offense;
        try {
          offense = instantiatePass(concept, unit, defense);
        } catch (e) {
          if (e instanceof UnprotectableCallError) continue;
          throw e;
        }
        const scheme = protectionOptions(concept, unit, offense);
        const call: OffensivePlayCall = { ...(offense.call as OffensivePlayCall), protectionScheme: scheme, leash: DEFAULT_LEASH };
        expect(() => simulatePlay(snap.state, { offense: call, defense: defense.call }, `adr-073:options-smoke:${where}`), where).not.toThrow();
        snaps += 1;
        played.add(concept.id);
        if (scheme.kind === "SLIDE") {
          expect(scheme.slideCheck, where).toBe(true);
          slideChecked.set(concept.id, (slideChecked.get(concept.id) ?? 0) + 1);
        }
        for (const man of scheme.checkRelease ?? []) {
          keptInRoles.set(concept.id, (keptInRoles.get(concept.id) ?? new Set()).add(roleOf.get(String(man)) ?? "?"));
        }
      }
    }

    expect(played.size, "a concept that could not be protected against any card was never played").toBe(PASS_CONCEPTS.length);
    expect(snaps).toBeGreaterThan(PASS_CONCEPTS.length);
    const slides = PASS_CONCEPTS.filter((c) => c.protection.call.kind === "SLIDE").map((c) => c.id);
    expect([...slideChecked.keys()].sort()).toEqual([...slides].sort());
    const withList = PASS_CONCEPTS.filter((c) => c.protection.checkRelease.length > 0).map((c) => c.id);
    expect([...keptInRoles.keys()].sort(), "a concept whose card releases a check-release man never stated one").toEqual(
      [...withList].sort(),
    );

    // The census, today: 28 dropbacks, 13 of them slides, 12 with a check-release man to keep in.
    expect(PASS_CONCEPTS.length).toBe(28);
    expect(slides).toHaveLength(13);
    const byRole = new Map<string, string[]>();
    for (const [id, roles] of keptInRoles) for (const role of roles) byRole.set(role, [...(byRole.get(role) ?? []), id]);
    expect(byRole.get("RB") ?? []).toHaveLength(10);
    expect(byRole.get("FB")).toEqual(["PASS_SPLIT_BACKS_TEXAS"]);
    expect(byRole.get("TE_Y")).toEqual(["PASS_RB_SLIP_SCREEN"]);
    expect([...byRole.keys()].sort()).toEqual(["FB", "RB", "TE_Y"]);
  }, 5 * 60_000);
});
