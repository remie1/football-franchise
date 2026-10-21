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
 *
 * ADR-073 step 3.4 extends it to every call caller v6 can play: every entry of playbook's `COMPOSED`
 * (each coverage bare and under each pressure it hosts, with its own line game, none, or each legal
 * one), both as the real call and as the anticipated one, the run concepts included. That closes
 * the third hazard of the call drawn in parts: the offence is instantiated against the anticipated
 * call, the frozen caller's concept loop catches `UnprotectableCallError` alone, and so any other
 * throw from `instantiatePass` or `instantiateRun` (`UnresolvableAssignmentError`, say) would stop a
 * game mid-batch rather than redraw.
 */
import { describe, expect, it } from "vitest";
import type { OffensivePlayCall, RunPlayCall } from "@ff/contracts";
import { createMatchState, simulateGame, simulatePlay, DEFAULT_TUNABLES } from "@ff/engine";
import {
  COMPOSED,
  DEFENSIVE_CARDS,
  PASS_CONCEPTS,
  RUN_CONCEPTS,
  UnprotectableCallError,
  buildDefensiveUnit,
  buildOffensiveUnit,
  instantiateDefense,
  instantiatePass,
  instantiateRun,
  protectionOptions,
  type DepthChart,
} from "@ff/playbook";
import { DEFAULT_LEASH, frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { capturePlays, type CapturedPlay } from "../src/harness/playScope.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

interface CapturedSnap {
  readonly snap: CapturedPlay;
  readonly offenceChart: DepthChart;
  readonly defenceChart: DepthChart;
}

/**
 * One v4 game, captured: its first pass play and its first run play, each with the offence's and
 * the defence's depth charts. The states are what a real game hands the engine.
 */
function capturedSnaps(): { readonly pass: CapturedSnap; readonly run: CapturedSnap } {
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
  const plays = capture.finish(result.events);
  const sideOf = (kind: "PASS" | "RUN"): CapturedSnap => {
    const snap = plays.find((p) => p.calls.offense.kind === kind);
    if (snap === undefined) throw new Error(`the captured game had no ${kind === "PASS" ? "pass" : "run"} play`);
    const homeOnOffence = String(snap.state.offenseTeam) === String(built.fixture.home);
    return {
      snap,
      offenceChart: homeOnOffence ? built.homeDepthChart : built.awayDepthChart,
      defenceChart: homeOnOffence ? built.awayDepthChart : built.homeDepthChart,
    };
  };
  return { pass: sideOf("PASS"), run: sideOf("RUN") };
}

describe("ADR-073 §2.3: every pass card's options play through the engine", () => {
  it("validates and plays every concept against every card it can protect against", () => {
    const { snap, offenceChart, defenceChart } = capturedSnaps().pass;

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

describe("ADR-073 step 3.4: every composed call plays through the engine, as the real call and as the anticipated one", () => {
  // Each concept is instantiated against the composed call (the call as the offence's huddle
  // anticipated it: v6's guess is a composed call), and the snap is played with that call as the
  // defence's (the call as played). Any throw but `UnprotectableCallError`, which the caller's
  // concept loop redraws, fails here rather than mid-game.
  it("instantiates every pass and run concept against every call in COMPOSED, and plays each snap", () => {
    const { pass, run } = capturedSnaps();
    const entries = Object.values(COMPOSED);
    const playedByPass = new Set<string>();
    const playedByRun = new Set<string>();
    const passConcepts = new Set<string>();
    const runConcepts = new Set<string>();
    let unprotectable = 0;
    let slideChecks = 0;
    for (const entry of entries) {
      for (const concept of PASS_CONCEPTS) {
        const where = `${concept.id} vs ${entry.key}`;
        const unit = buildOffensiveUnit(concept.formation.personnel, pass.offenceChart);
        const defense = instantiateDefense(entry.call, buildDefensiveUnit(entry.call.personnel, pass.defenceChart), {
          formation: concept.formation,
          unit,
        });
        let offense;
        try {
          offense = instantiatePass(concept, unit, defense);
        } catch (e) {
          if (e instanceof UnprotectableCallError) {
            unprotectable += 1;
            continue;
          }
          throw e;
        }
        const scheme = protectionOptions(concept, unit, offense);
        const call: OffensivePlayCall = { ...(offense.call as OffensivePlayCall), protectionScheme: scheme, leash: DEFAULT_LEASH };
        expect(
          () => simulatePlay(pass.snap.state, { offense: call, defense: defense.call }, `adr-073:options-smoke:${where}`),
          where,
        ).not.toThrow();
        if (scheme.kind === "SLIDE") {
          expect(scheme.slideCheck, where).toBe(true);
          slideChecks += 1;
        }
        playedByPass.add(entry.key);
        passConcepts.add(concept.id);
      }
      for (const concept of RUN_CONCEPTS) {
        const where = `${concept.id} vs ${entry.key}`;
        const unit = buildOffensiveUnit(concept.formation.personnel, run.offenceChart);
        const defense = instantiateDefense(entry.call, buildDefensiveUnit(entry.call.personnel, run.defenceChart), {
          formation: concept.formation,
          unit,
        });
        let offense;
        try {
          offense = instantiateRun(concept, unit, defense);
        } catch (e) {
          if (e instanceof UnprotectableCallError) {
            unprotectable += 1;
            continue;
          }
          throw e;
        }
        if (offense.call.kind !== "RUN") throw new Error(`${where}: a run concept instantiated as a ${offense.call.kind}`);
        const call: RunPlayCall = offense.call;
        expect(
          () => simulatePlay(run.snap.state, { offense: call, defense: defense.call }, `adr-073:options-smoke:${where}`),
          where,
        ).not.toThrow();
        playedByRun.add(entry.key);
        runConcepts.add(concept.id);
      }
    }

    // Every composed call was played, by a dropback and by a run, and every concept against some call.
    const census = `${String(entries.length)} composed calls, ${String(unprotectable)} unprotectable snaps, ${String(slideChecks)} slide checks`;
    expect(entries.length, census).toBeGreaterThan(DEFENSIVE_CARDS.length);
    expect(playedByPass.size, `a composed call no dropback could be protected against (${census})`).toBe(entries.length);
    expect(playedByRun.size, `a composed call no run could be blocked against (${census})`).toBe(entries.length);
    expect(passConcepts.size, census).toBe(PASS_CONCEPTS.length);
    expect(runConcepts.size, census).toBe(RUN_CONCEPTS.length);
    expect(slideChecks, census).toBeGreaterThan(0);
    // The run snap is a run, so the runs above went through the run simulation.
    expect(run.snap.calls.offense.kind).toBe("RUN");
  }, 5 * 60_000);
});
