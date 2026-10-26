/**
 * ADR-059 — THE DANGLING `rollRef` INVARIANT.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * ADR-059's Impact section names the invariant calibration gains once the rep latent lands:
 *
 *   > Every `pass_rush_tick` carrying a `rollRef` resolves to a `pass_rush_rep` in the same play.
 *   > A dangling `rollRef` is the failure this field exists to make loud.
 *
 * `CHECK.payload.rollRef` (contracts `events.ts`) is `RollDetail.rngLabel` of a PRIOR roll in the
 * same play (ADR-004's rule, extended `CHECK`→`CHECK` by ADR-059). For a `pass_rush_tick` that
 * prior roll is the `pass_rush_rep` the tick jitters around. If a `rollRef` ever named a label no
 * `pass_rush_rep` in that play published, the deciding quantity would exist only in engine memory
 * again — exactly the violation ADR-059 was written to close (Iron Rule 3).
 *
 * ============================ THE TRAP THIS FILE REFUSES ============================
 *
 * An invariant that passes because nothing was checked is not a pass. If this corpus never
 * produced a `pass_rush_tick` carrying a `rollRef` (e.g. because the rep/tick split has not landed
 * yet, or a future change stops populating the field), silently asserting "no dangling ref found"
 * over zero observations would be exactly the shape this project's backlog keeps cataloguing. The
 * population is therefore asserted `> 0` in its own right, with the count in the failure message.
 *
 * ============================ SAME-PLAY, NEVER CROSS-PLAY ============================
 *
 * The join is scoped to one play's own events. Two different plays legitimately reuse RNG fork
 * labels drawn from independent, play-scoped trees (`createRng(seed, "game:<id>").fork("play:<n>")`
 * per `playScope.ts`), so a rollRef from one play matching a label in another proves nothing and a
 * cross-play join would be checking the wrong relation entirely.
 *
 * ============================ DETERMINISM ============================
 *
 * One batch seed, `generateSeeds`'d into one seed per fixture (`calibration.md` §3). Reproduce this
 * report by re-running with the batch seed and digest below; a mismatch means the seed list itself
 * changed, not the invariant.
 *
 * ============================ ADR-089 STEP 1: SHAPE S's JOIN ============================
 *
 * (Plan §16.3, checker A2(a).) Under `pocket-1`'s shape S a `pass_rush_tick` draws no die (P3) and
 * its `rollRef` names the matchup's `pass_rush_beat` (P2), whose own `rollRef` names the rep. Read as
 * written at ADR-059, every such tick would report as dangling. This file takes the join, not the
 * legacy-only reading: a ROLLED tick (`legacy`, shape L) must name a `pass_rush_rep` in its play, as
 * ADR-059 says; a DIELESS tick (shape S) must name a `pass_rush_beat` in its play, and that beat a
 * `pass_rush_rep` in the same play (tick → beat → rep). A beat that names no rep is dangling too. A
 * dieless tick that names a rep directly, or a rolled tick that names a beat, is the other shape's
 * join and dangling here. Constructed plays pin the S join now; the corpus case under `pocket-1.s1`
 * waits on the engine (TODO(ADR-089 K-b2), `test/pocket1Gate.ts`). The legacy corpus case is
 * unchanged, and asserts no dieless tick and no beat in a legacy stream.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { POCKET_1_S1_DIGEST, rulesTunables } from "../src/pocket/rules.js";
import { POCKET_1_ENGINE_LANDED } from "./pocket1Gate.js";

/** Regenerates this test's own corpus. Cited in every failure message, per the determinism rule. */
const BATCH_SEED = "adr-059:pass-rush-rep-rollref";

interface GameFold {
  /** Every ROLLED `pass_rush_tick` CHECK in this game that carries a `rollRef` (`legacy`, shape L). */
  readonly ticksWithRollRef: number;
  /** Every DIELESS `pass_rush_tick` CHECK (shape S, P3), each of which carries a `rollRef`. */
  readonly dielessTicks: number;
  /** Every `pass_rush_beat` CHECK (shape S, P2). */
  readonly beats: number;
  /** Human-readable lines for every reference that named nothing it may name in its play. */
  readonly dangling: readonly string[];
}

interface PlayRefs {
  readonly reps: Set<string>;
  /** Each beat's own roll label, and the rep its `rollRef` names. */
  readonly beats: Map<string, string | undefined>;
  readonly ticks: { readonly rollRef: string; readonly dieless: boolean; readonly tick: number | undefined }[];
}

/**
 * Fold one game's stream, grouped by `playId`. `pass_rush_rep` CHECKs publish their own roll's
 * `rngLabel`; `pass_rush_beat` CHECKs publish theirs and a `rollRef` naming a rep; `pass_rush_tick`
 * CHECKs publish a `rollRef` naming the rep (rolled) or the beat (dieless). All the fields live
 * directly on the `CHECK` payload (contracts `events.ts`), so this reads the stream structurally
 * rather than recomputing anything the engine already decided.
 */
function foldGame(gameLabel: string, events: readonly MatchEventEnvelope[]): GameFold {
  const byPlay = new Map<string, PlayRefs>();
  const refsOf = (playId: string): PlayRefs => {
    let refs = byPlay.get(playId);
    if (refs === undefined) {
      refs = { reps: new Set(), beats: new Map(), ticks: [] };
      byPlay.set(playId, refs);
    }
    return refs;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "CHECK") continue;
    const playId = String(event.playId);
    const p = event.payload;
    if (p.checkKind === "pass_rush_rep") {
      refsOf(playId).reps.add(p.roll.rngLabel);
    } else if (p.checkKind === "pass_rush_beat") {
      refsOf(playId).beats.set(p.roll.rngLabel, p.rollRef);
    } else if (p.checkKind === "pass_rush_tick") {
      const rollRef = p.rollRef;
      if (rollRef === undefined) continue;
      refsOf(playId).ticks.push({ rollRef, dieless: p.roll === undefined, tick: event.tick });
    }
  }

  let ticksWithRollRef = 0;
  let dielessTicks = 0;
  let beats = 0;
  const dangling: string[] = [];
  for (const [playId, refs] of byPlay) {
    const where = `game ${gameLabel} play ${playId}`;
    const seen = `(pass_rush_rep labels seen here: ${refs.reps.size === 0 ? "none" : [...refs.reps].join(", ")})`;
    for (const [beat, rep] of refs.beats) {
      beats += 1;
      if (rep === undefined || !refs.reps.has(rep)) {
        dangling.push(`${where}: pass_rush_beat "${beat}" names rep ${JSON.stringify(rep)}, no pass_rush_rep CHECK in this play ${seen}`);
      }
    }
    for (const t of refs.ticks) {
      if (t.dieless) {
        dielessTicks += 1;
        // Shape S: tick → beat → rep. The beat's own reference is checked above.
        if (!refs.beats.has(t.rollRef)) {
          dangling.push(
            `${where} tick ${String(t.tick)}: a dieless pass_rush_tick's rollRef "${t.rollRef}" names ` +
              `no pass_rush_beat CHECK in this play (beats seen here: ${refs.beats.size === 0 ? "none" : [...refs.beats.keys()].join(", ")})`,
          );
        }
      } else {
        ticksWithRollRef += 1;
        if (!refs.reps.has(t.rollRef)) {
          dangling.push(`${where} tick ${String(t.tick)}: rollRef "${t.rollRef}" names no pass_rush_rep CHECK in this play ${seen}`);
        }
      }
    }
  }
  return { ticksWithRollRef, dielessTicks, beats, dangling };
}

/** The round robin this file plays, folded; `tunables` absent is today's (legacy) game. */
function playCorpus(tunables?: Tunables): GameFold & { readonly games: number; readonly digest: string } {
  const league = buildFlatLeague({ teams: 8 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, {
    kind: "SYNTHETIC_ROUND_ROBIN",
    rounds: 1,
    season: 2024,
  });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  let ticksWithRollRef = 0;
  let dielessTicks = 0;
  let beats = 0;
  const dangling: string[] = [];
  for (const [i, fixture] of fixtures.entries()) {
    const seed = seeds.seeds[i];
    if (seed === undefined) continue;
    const { observation } = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      ...(tunables === undefined ? {} : { tunables }),
    });
    const fold = foldGame(seed, observation.events);
    ticksWithRollRef += fold.ticksWithRollRef;
    dielessTicks += fold.dielessTicks;
    beats += fold.beats;
    dangling.push(...fold.dangling);
  }
  return { ticksWithRollRef, dielessTicks, beats, dangling, games: fixtures.length, digest: seeds.digest };
}

describe("ADR-059: the dangling pass_rush_tick rollRef invariant", () => {
  it(
    "every rollRef-carrying pass_rush_tick resolves to a pass_rush_rep's rngLabel in the same " +
      "play, over a non-empty population",
    () => {
      const { ticksWithRollRef, dielessTicks, beats, dangling, games, digest } = playCorpus();

      // Direction 1: no dangling reference. Every rollRef this corpus produced resolves within
      // its own play.
      expect(
        dangling,
        `${String(dangling.length)} of ${String(ticksWithRollRef)} rollRef-carrying ` +
          `pass_rush_tick CHECKs named no pass_rush_rep in the same play ` +
          `(batch "${BATCH_SEED}", digest ${digest}, ${String(games)} games):\n` +
          dangling.slice(0, 20).join("\n"),
      ).toEqual([]);

      // Direction 2: the population checked above is non-empty. ADR-059 names this trap by name —
      // an invariant that passes because nothing was checked is the shape this register keeps
      // cataloguing, so a zero count here must fail loud rather than read as a green invariant.
      expect(
        ticksWithRollRef,
        `no pass_rush_tick CHECK in ${String(games)} games (batch "${BATCH_SEED}", ` +
          `digest ${digest}) carried a rollRef. This invariant is only meaningful over a ` +
          `non-empty population of rollRef-carrying ticks -- an empty check here is not a pass, ` +
          `it means either the pass_rush_rep/rollRef linkage has not landed in the engine yet, or ` +
          `this corpus never reached one.`,
      ).toBeGreaterThan(0);

      // ADR-089: a legacy stream carries shape S's records nowhere.
      expect(dielessTicks, "a dieless pass_rush_tick in a legacy stream").toBe(0);
      expect(beats, "a pass_rush_beat in a legacy stream").toBe(0);
    },
    5 * 60_000,
  );
});

// --- ADR-089 step 1: shape S's join, on constructed plays -----------------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
const envelope = (playId: string, payload: Record<string, unknown>): MatchEventEnvelope => ({
  seq: 0,
  at: AT,
  event: { gameId: "g", playId, type: "CHECK", payload } as never,
});
const d100 = (rngLabel: string) => ({ die: "d100", raw: 50, modifiers: [], total: 50, rngLabel });
const rep = (playId: string, label: string) =>
  envelope(playId, { checkKind: "pass_rush_rep", actors: [], roll: d100(label), opposedRoll: d100(`${label}/b`), tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [] });
const beat = (playId: string, label: string, rollRef?: string) =>
  envelope(playId, {
    checkKind: "pass_rush_beat",
    actors: [],
    roll: { die: "uniform", raw: 0.37, modifiers: [], total: 0.37, rngLabel: label },
    tier: "TIE",
    margin: 0,
    testsAttrs: [],
    ...(rollRef === undefined ? {} : { rollRef }),
  });
const dielessTick = (playId: string, rollRef: string) =>
  envelope(playId, { checkKind: "pass_rush_tick", actors: [], tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [], rollRef });
const rolledTick = (playId: string, label: string, rollRef: string) =>
  envelope(playId, { checkKind: "pass_rush_tick", actors: [], roll: d100(label), opposedRoll: d100(`${label}/b`), tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [], rollRef });

describe("ADR-089 step 1: shape S's tick → beat → rep join (plan §16.3)", () => {
  it("a dieless tick that names its play's beat, which names its play's rep, is not dangling", () => {
    const fold = foldGame("s", [rep("p1", "rep/a"), beat("p1", "beat/a", "rep/a"), dielessTick("p1", "beat/a"), dielessTick("p1", "beat/a")]);
    expect(fold).toEqual({ ticksWithRollRef: 0, dielessTicks: 2, beats: 1, dangling: [] });
  });

  it("a legacy or shape L play beside it is read as ADR-059 reads it", () => {
    const fold = foldGame("mixed", [
      rep("p1", "rep/a"),
      beat("p1", "beat/a", "rep/a"),
      dielessTick("p1", "beat/a"),
      rep("p2", "rep/a"),
      rolledTick("p2", "tick/a/1.0", "rep/a"),
    ]);
    expect(fold).toEqual({ ticksWithRollRef: 1, dielessTicks: 1, beats: 1, dangling: [] });
  });

  it("a dieless tick whose beat is not in its play is dangling, and so is one that names the rep directly", () => {
    // Listed play by play, in the order the plays first appear.
    expect(foldGame("s", [rep("p1", "rep/a"), beat("p2", "beat/a", "rep/a"), dielessTick("p1", "beat/a")]).dangling).toEqual([
      "game s play p1 tick undefined: a dieless pass_rush_tick's rollRef \"beat/a\" names no pass_rush_beat CHECK in this play (beats seen here: none)",
      "game s play p2: pass_rush_beat \"beat/a\" names rep \"rep/a\", no pass_rush_rep CHECK in this play (pass_rush_rep labels seen here: none)",
    ]);
    expect(foldGame("s", [rep("p1", "rep/a"), dielessTick("p1", "rep/a")]).dangling).toHaveLength(1);
  });

  it("a beat that names no rep, or a rep not in its play, is dangling", () => {
    expect(foldGame("s", [rep("p1", "rep/a"), beat("p1", "beat/a"), dielessTick("p1", "beat/a")]).dangling).toEqual([
      "game s play p1: pass_rush_beat \"beat/a\" names rep undefined, no pass_rush_rep CHECK in this play (pass_rush_rep labels seen here: rep/a)",
    ]);
    expect(foldGame("s", [rep("p1", "rep/a"), beat("p1", "beat/a", "rep/b"), dielessTick("p1", "beat/a")]).dangling).toHaveLength(1);
  });

  it("a rolled tick that names a beat is the other shape's join, and dangling", () => {
    const fold = foldGame("s", [rep("p1", "rep/a"), beat("p1", "beat/a", "rep/a"), rolledTick("p1", "tick/a/1.0", "beat/a")]);
    expect(fold.dangling).toEqual([
      "game s play p1 tick undefined: rollRef \"beat/a\" names no pass_rush_rep CHECK in this play (pass_rush_rep labels seen here: rep/a)",
    ]);
  });
});

// TODO(ADR-089 K-b2): needs the engine's `pocket-1` (stream E-b). The same round robin under the
// design bundle: shape S writes beats and dieless ticks, and every reference resolves in its play.
describe.skipIf(!POCKET_1_ENGINE_LANDED)("ADR-089 step 1: the invariant on a pocket-1.s1 corpus (TODO(ADR-089 K-b2))", () => {
  it(
    "every dieless tick names its play's beat, every beat its play's rep, over non-empty populations",
    () => {
      const tunables = rulesTunables("pocket-1.s1");
      expect(tunables.engineRules?.overlayDigest).toBe(POCKET_1_S1_DIGEST);
      const { dielessTicks, beats, dangling, games, digest } = playCorpus(tunables);
      expect(dangling, `batch "${BATCH_SEED}" under pocket-1.s1, digest ${digest}, ${String(games)} games:\n${dangling.slice(0, 20).join("\n")}`).toEqual([]);
      expect(beats).toBeGreaterThan(0);
      expect(dielessTicks).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});
