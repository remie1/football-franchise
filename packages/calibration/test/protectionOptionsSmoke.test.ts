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
 *
 * ADR-073 step 3.5 extends it to every call caller v7 can play: every entry of `COMPOSED` wearing
 * each front look legal on it as the draw can make it (the Mug; the Stem toward the side the played
 * strength sets, or toward each legal side over a balanced rush), laid on the instantiated call
 * through playbook's `applyFrontLook` as the caller lays it, the offence instantiated against the
 * bare call (the huddle cannot see a look; R30). The engine's own shown-rush check
 * (`assertShownRush`: everyone shown is on the call, nobody shown twice) is what a worn call must
 * pass, on the pass and the run sim alike, and PLAY_START must echo the look. Its census pins the
 * worn snaps today, so a card or a look that changes them is read again.
 */
import { describe, expect, it } from "vitest";
import type { DefensiveTag, MatchEventEnvelope, OffensivePlayCall, RunPlayCall, ShownRusher } from "@ff/contracts";
import { createMatchState, simulateGame, simulatePlay, DEFAULT_TUNABLES } from "@ff/engine";
import {
  COMPOSED,
  DEFENSIVE_CARDS,
  PASS_CONCEPTS,
  RUN_CONCEPTS,
  UnprotectableCallError,
  applyFrontLook,
  buildDefensiveUnit,
  buildOffensiveUnit,
  dutyList,
  instantiateDefense,
  instantiatePass,
  instantiateRun,
  isFrontLookTag,
  legalFrontLooks,
  protectionOptions,
  shownRushDiffers,
  type AnyDefensiveCard,
  type DepthChart,
  type FrontLookDraw,
  type InstantiatedDefense,
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
 * One v4 game, captured: its first pass play and, on asking, its first run play, each with the
 * offence's and the defence's depth charts. The states are what a real game hands the engine. The run
 * play is found only when it is asked for, so the pass-card test needs no run play in the game.
 */
function capturedSnaps(): { readonly pass: CapturedSnap; readonly run: () => CapturedSnap } {
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
  return { pass: sideOf("PASS"), run: () => sideOf("RUN") };
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
    const captured = capturedSnaps();
    const pass = captured.pass;
    const run = captured.run();
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

// --- ADR-073 step 3.5: the front looks, worn ---------------------------------------------------

/** Whether the card's played rush is balanced, counted off its RUSH duties (as playbook's own test counts it). */
function balanced(card: AnyDefensiveCard): boolean {
  const sides = dutyList(card).flatMap(({ duty }) => (duty.kind === "RUSH" ? [duty.side] : []));
  return sides.filter((s) => s === "LEFT").length * 2 === sides.length;
}

/**
 * The draws a call can make over its card, written as `drawFrontLook` writes them: the Mug; the
 * Stem with no side over an unbalanced played rush (its strength sets the side), and toward each
 * legal side over a balanced one.
 */
function drawsFor(card: AnyDefensiveCard): readonly FrontLookDraw[] {
  return legalFrontLooks(card).flatMap((option): FrontLookDraw[] => {
    if (option.look === "MUG") return [{ cardId: card.id, look: "MUG" }];
    if (!balanced(card)) return [{ cardId: card.id, look: "STEM" }];
    return option.sides.map((side) => ({ cardId: card.id, look: "STEM", side }));
  });
}

const drawLabel = (draw: FrontLookDraw): string =>
  draw.look === "STEM" && draw.side !== undefined ? `STEM:${draw.side}` : draw.look;

/** What is wrong with the snap's PLAY_START echo of a worn look: its tag said last, and a shown rush that differs. */
function echoProblem(events: readonly MatchEventEnvelope[], draw: FrontLookDraw): string | undefined {
  const start = events.find((e) => e.event.type === "PLAY_START");
  if (start === undefined) return "no PLAY_START";
  const payload = start.event.payload as {
    readonly defense?: { readonly rush?: unknown; readonly shownRush?: unknown; readonly tags?: unknown };
  };
  const defense = payload.defense;
  const { rush, shownRush, tags } = defense ?? {};
  if (!Array.isArray(rush) || !Array.isArray(shownRush) || !Array.isArray(tags)) return "PLAY_START carries no rush, shown rush or tags";
  const fronts = (tags as readonly DefensiveTag[]).filter((tag) => isFrontLookTag(tag));
  const last = (tags as readonly DefensiveTag[])[tags.length - 1];
  if (fronts.length !== 1 || last === undefined || !isFrontLookTag(last) || last.id !== draw.look) {
    return `PLAY_START's tags ${JSON.stringify(tags)} do not end with the one ${draw.look} look`;
  }
  if (!shownRushDiffers(rush as readonly ShownRusher[], shownRush as readonly ShownRusher[])) {
    return "PLAY_START echoes a shown rush that does not differ from the played one";
  }
  return undefined;
}

describe("ADR-073 step 3.5: every composed call, wearing each front look legal on it, plays through the engine", () => {
  // The caller's order: the offence is instantiated against the bare call (the huddle's guess
  // never wears a look), and the snap is played against the call wearing the look.
  it("wears each legal Mug and Stem over every call in COMPOSED, against every pass and run concept, and plays each snap", () => {
    const captured = capturedSnaps();
    const pass = captured.pass;
    const run = captured.run();
    const entries = Object.values(COMPOSED);
    const drawsByLabel = new Map<string, number>();
    const wornPass = new Map<string, number>();
    const wornRun = new Map<string, number>();
    const wornEntries = new Set<string>();
    const dropped: string[] = [];
    const failures: string[] = [];
    let entriesWithALook = 0;

    const wearAndPlay = (
      defense: InstantiatedDefense,
      draw: FrontLookDraw,
      play: (worn: InstantiatedDefense) => readonly MatchEventEnvelope[],
      where: string,
      into: Map<string, number>,
      entryKey: string,
    ): void => {
      const worn = applyFrontLook(defense, draw);
      if (worn === defense) {
        dropped.push(where);
        return;
      }
      let events: readonly MatchEventEnvelope[] = [];
      expect(() => {
        events = play(worn);
      }, where).not.toThrow();
      const problem = echoProblem(events, draw);
      if (problem !== undefined) failures.push(`${where}: ${problem}`);
      into.set(drawLabel(draw), (into.get(drawLabel(draw)) ?? 0) + 1);
      wornEntries.add(entryKey);
    };

    for (const entry of entries) {
      const draws = drawsFor(entry.call);
      if (draws.length === 0) continue;
      entriesWithALook += 1;
      for (const draw of draws) drawsByLabel.set(drawLabel(draw), (drawsByLabel.get(drawLabel(draw)) ?? 0) + 1);
      for (const concept of PASS_CONCEPTS) {
        const unit = buildOffensiveUnit(concept.formation.personnel, pass.offenceChart);
        const defense = instantiateDefense(entry.call, buildDefensiveUnit(entry.call.personnel, pass.defenceChart), {
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
        for (const draw of draws) {
          const where = `${concept.id} vs ${entry.key} wearing ${drawLabel(draw)}`;
          wearAndPlay(
            defense,
            draw,
            (worn) => simulatePlay(pass.snap.state, { offense: call, defense: worn.call }, `adr-073:options-smoke:${where}`).events,
            where,
            wornPass,
            entry.key,
          );
        }
      }
      for (const concept of RUN_CONCEPTS) {
        const unit = buildOffensiveUnit(concept.formation.personnel, run.offenceChart);
        const defense = instantiateDefense(entry.call, buildDefensiveUnit(entry.call.personnel, run.defenceChart), {
          formation: concept.formation,
          unit,
        });
        let offense;
        try {
          offense = instantiateRun(concept, unit, defense);
        } catch (e) {
          if (e instanceof UnprotectableCallError) continue;
          throw e;
        }
        if (offense.call.kind !== "RUN") throw new Error(`${concept.id} vs ${entry.key}: a run concept instantiated as a ${offense.call.kind}`);
        const call: RunPlayCall = offense.call;
        for (const draw of draws) {
          const where = `${concept.id} vs ${entry.key} wearing ${drawLabel(draw)}`;
          wearAndPlay(
            defense,
            draw,
            (worn) => simulatePlay(run.snap.state, { offense: call, defense: worn.call }, `adr-073:options-smoke:${where}`).events,
            where,
            wornRun,
            entry.key,
          );
        }
      }
    }

    const sum = (m: ReadonlyMap<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);
    const census =
      `${String(entries.length)} composed calls, ${String(entriesWithALook)} with a legal look; draws ` +
      `${JSON.stringify(Object.fromEntries([...drawsByLabel].sort()))}; worn snaps ${String(sum(wornPass))} pass ` +
      `${JSON.stringify(Object.fromEntries([...wornPass].sort()))} + ${String(sum(wornRun))} run ` +
      `${JSON.stringify(Object.fromEntries([...wornRun].sort()))}; ${String(dropped.length)} dropped by the formation`;
    expect(failures, `${String(failures.length)} failures (${census})\n${failures.slice(0, 10).join("\n")}`).toEqual([]);
    // Every call that can wear a look was played wearing it, and no formation here took a look away.
    expect(wornEntries.size, census).toBe(entriesWithALook);
    expect(dropped, census).toEqual([]);
    expect(run.snap.calls.offense.kind).toBe("RUN");

    // The census, today: 134 of the 144 composed calls can wear a look; the Mug over all 134, the
    // Stem over 112 (toward the side the played strength sets on 14, toward either side on the 98
    // over a balanced rush). Every dropback and every run concept was played against each draw:
    // 344 draws × 28 dropbacks and × 16 runs.
    expect(entries.length, census).toBe(144);
    expect(entriesWithALook, census).toBe(134);
    expect(Object.fromEntries(drawsByLabel), census).toEqual({ MUG: 134, STEM: 14, "STEM:LEFT": 98, "STEM:RIGHT": 98 });
    expect(Object.fromEntries(wornPass), census).toEqual({ MUG: 3752, STEM: 392, "STEM:LEFT": 2744, "STEM:RIGHT": 2744 });
    expect(Object.fromEntries(wornRun), census).toEqual({ MUG: 2144, STEM: 224, "STEM:LEFT": 1568, "STEM:RIGHT": 1568 });
  }, 5 * 60_000);
});
