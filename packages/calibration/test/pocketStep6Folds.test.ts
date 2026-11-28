/**
 * ADR-089 step 6: THE STEP-6 FOLDS ON ONE LEAGUE (step-6 plan §3.2 K2, commit (9); `s6Checks.ts`), on
 * constructed step-6 games read with H0's tunables and a golden game's rosters (one legacy game, played
 * for its snapshot only: no step-6 arm plays before the lift).
 *
 *  - `foldStep6Game`: the rows, the counts, the throws on the run, S-14 (the dropback reader, the
 *    step-6 reading, the sacker mix and the statline count the same sacks and credit the same man)
 *    with games that agree and games that do not, M5's games, the stripped digests and the movement
 *    cross-check's deadline picks against the step-6 reading's;
 *  - `finishStep6League`: the metrics fold's counts and S-14's league totals;
 *  - the stream equalities' strip (S-8'), the probes' rating fold and the Mobility thirds.
 */
import type { MatchEventEnvelope, PlayerState } from "@ff/contracts";
import type { GameSnapshot } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import { beforeAll, describe, expect, it } from "vitest";
import { indexLeague } from "../src/league/snapshot.js";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { buildStep6Arm, step6ArmDef, STEP6_PROBE_RATINGS } from "../src/pocket/arms.js";
import { CORPORA, goldenGames } from "../src/pocket/corpus.js";
import { gameDigest } from "../src/pocket/golden.js";
import { playersOfSnapshot, ratingReader } from "../src/pocket/m6Contact.js";
import { m5GameOf } from "../src/pocket/m5Mirror.js";
import { applyRatingOverrides } from "../src/pocket/ratingOverride.js";
import { STEP6_PETITIONS_GRANTED } from "../src/pocket/rules.js";
import { s2ContextOf } from "../src/pocket/s2Stream.js";
import { s5DropbacksOf } from "../src/pocket/s5Stream.js";
import {
  deadlineChoiceOf,
  emptyStep6LeagueFolds,
  finishStep6League,
  foldRatingsGame,
  foldStep6Game,
  MOBILITY_THIRDS,
  STEP6_EQUALITY_STRIP,
  thirdsByMobility,
  thirdsOf,
  type Step6FoldOptions,
  type Step6Game,
  type Step6LeagueFolds,
} from "../src/pocket/s6Checks.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { throwClassOfS5 } from "../src/pocket/throwClass.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { deadlinePlay, editDecisions, mapBody, onTheRunThrow, scramblePlay } from "./s6EngineShaped.js";
import { BLOCKED_CATCH_SACK, constructedGame, DEADLINE_THROWAWAY, SHED_THEN_SACK, throwaway, type PlaySpec } from "./s6Fixtures.js";

const tree = (id: string) => buildStep6Arm(step6ArmDef(id)!, undefined, STEP6_PETITIONS_GRANTED).tunables;
const H0 = tree("H0");
const H2 = tree("H2");

const faulted = (L: Step6LeagueFolds): Readonly<Record<string, number>> => Object.fromEntries(Object.entries(L.faults).filter(([, f]) => f.n > 0).map(([p, f]) => [p, f.n]));
const why = (L: Step6LeagueFolds, proof: string): string => (L.faults[proof]?.first ?? []).join(" | ");

describe("the step-6 folds on constructed games, with a golden game's rosters", () => {
  let snapshot: GameSnapshot;
  let qb = "";
  let players: ReadonlyMap<string, PlayerState>;
  beforeAll(() => {
    goldenGames(
      "flat",
      (o, snap) => {
        snapshot = snap;
        const start = (o.events as readonly MatchEventEnvelope[]).find((e) => e.event.type === "PLAY_START" && (e.event.payload as { kind?: string }).kind === "PASS_PLAY_V1");
        qb = String((start?.event.payload as { offense: { quarterback: string } }).offense.quarterback);
      },
      { callerVersion: STEP1_CALLER, first: 1 },
    );
    players = playersOfSnapshot(snapshot);
  }, 120_000);

  const withQb = (spec: PlaySpec): PlaySpec => ({ ...spec, quarterback: qb });
  /** The deadline pick that throws it away, on the band whose rank takes THROWAWAY for this quarterback. */
  const deadlineThrowaway = (): PlaySpec => {
    const ratingOf = ratingReader(players.get(qb)!);
    const margin = [5, -3].find((m) => deadlineChoiceOf(H0, 1, ratingOf, m).choice === "THROWAWAY")!;
    return deadlinePlay("THROWAWAY", margin, { tunables: H0, quarterback: qb });
  };
  /** A failed scramble (lb1 credited), the deadline throwaway, a shed then a sack in the pocket (dt1), a blocked catcher's sack (de1) and a throw on the run. */
  const plays = (): PlaySpec[] => [scramblePlay(-5, { quarterback: qb }), deadlineThrowaway(), withQb(SHED_THEN_SACK), withQb(BLOCKED_CATCH_SACK), onTheRunThrow(qb)];
  const STATLINES = (): NonNullable<Step6Game["statlines"]> => [
    { player: qb, passing: { sacked: 3 }, defense: { sacks: 0 } },
    { player: "lb1", passing: { sacked: 0 }, defense: { sacks: 1 } },
    { player: "dt1", passing: { sacked: 0 }, defense: { sacks: 1 } },
    { player: "de1", passing: { sacked: 0 }, defense: { sacks: 1 } },
  ];
  const optionsOf = (o: Partial<Step6FoldOptions> = {}): Step6FoldOptions => ({ agree: true, m5: true, digests: true, crossCheck: true, thirdOf: () => "HIGH", classify: throwClassOfS5, players, ...o });
  /** One game into a fresh league fold under `tunables`. */
  const fold = (specs: readonly PlaySpec[], o: { readonly statlines?: Step6Game["statlines"] | null; readonly options?: Partial<Step6FoldOptions>; readonly tunables?: typeof H0; readonly L?: Step6LeagueFolds } = {}): { readonly L: Step6LeagueFolds; readonly events: readonly MatchEventEnvelope[] } => {
    const tunables = o.tunables ?? H0;
    const L = o.L ?? emptyStep6LeagueFolds();
    const events = constructedGame("g", specs);
    const statlines = o.statlines === null ? undefined : (o.statlines ?? STATLINES());
    foldStep6Game(L, { seed: "g", events, ...(statlines === undefined ? {} : { statlines }) }, snapshot, tunables, optionsOf(o.options), s5DropbacksOf(events, s2ContextOf(tunables, snapshot)));
    return { L, events };
  };

  it("folds the rows, the counts and the throws on the run, every proof passing on engine-shaped plays", () => {
    const { L } = fold(plays());
    expect(faulted(L)).toEqual({});
    expect(L.counts["dropbacks"]).toBe(5);
    expect(L.counts["s6Plays"]).toBe(5);
    expect(L.counts["sacks"]).toBe(3);
    expect(L.counts["sacks.failedScramble"]).toBe(1);
    expect(L.counts["deadline.THROWAWAY"]).toBe(1);
    expect(L.rows.dropbacks).toBe(5);
    expect(L.rows.s6Dropbacks).toBe(5);
    expect(L.rows.wholePlayPocketDisagreements).toBe(0);
    // The thirds read the passer's third (here every play HIGH).
    expect(Object.keys(L.rows.thirds)).toEqual(["HIGH"]);
    // The throw on the run, by the rows' pocket ("rusher got close").
    const onRun = L.onTheRun.CLEAN.aimed + L.onTheRun.PRESSURED.aimed;
    expect(onRun).toBe(1);
    expect(L.onTheRun.CLEAN.completions + L.onTheRun.PRESSURED.completions).toBe(1);
    for (const p of ["S-12", "S-13", "S-14", "S-15", "S-16", "S-17", "S-18", "S-19", "S-11", "S-11c"]) expect(L.checked[p], p).toBeGreaterThan(0);
  });

  it("S-14: the readers, the sacker mix and the statline count three sacks and credit lb1, dt1 and de1", () => {
    const { L } = fold(plays());
    expect(L.agree).toEqual({ games: 1, sacks: 3, failedScrambleSacks: 1, nobody: 0, fallbacks: 0 });
    expect(L.checked["S-14"]).toBe(5);
    expect(faulted(L)["S-14"] ?? 0).toBe(0);
  });

  it("S-14 faults a statline that counts other sacks, credits another man, or is missing, and a rescored sack on a tree without the marker", () => {
    const fewer = STATLINES().map((x) => (x.player === qb ? { ...x, passing: { sacked: 2 } } : x));
    expect(why(fold(plays(), { statlines: fewer }).L, "S-14")).toBe("g: the statline's 2 sacks, the readers' 3");
    const other = STATLINES().map((x) => (x.player === "de1" ? { ...x, player: "de2" } : x));
    expect(why(fold(plays(), { statlines: other }).L, "S-14")).toBe("g: the sack credit differs from the statline's for de1, de2");
    expect(why(fold(plays(), { statlines: null }).L, "S-14")).toBe("g: the game came with no statlines");
    // H2 (the start alone) carries no marker: a rescored sack on its stream is a reader fault.
    const rescored = fold([scramblePlay(-5, { quarterback: qb, drills: [], direction: null })], { tunables: H2, statlines: [{ player: qb, passing: { sacked: 1 }, defense: { sacks: 0 } }, { player: "lb1", passing: { sacked: 0 }, defense: { sacks: 1 } }] });
    expect(why(rescored.L, "S-14")).toBe("g g:play:1: a rescored sack without the marker");
    // A dropback the step-6 reading does not read (a play stamped before step 6) on an agreement arm.
    const early = fold([{ ...withQb(DEADLINE_THROWAWAY), rules: "pocket-1.s5a" }], { statlines: [] });
    expect(why(early.L, "S-14")).toBe("g g:play:1: a dropback with no step-6 reading on an agreement arm");
    // Off an agreement arm S-14 reads nothing.
    const off = fold(plays(), { statlines: null, options: { agree: false } });
    expect(off.L.checked["S-14"]).toBe(0);
    expect(off.L.agree).toBeNull();
  });

  it("finishStep6League: the metrics fold's counts, and S-14's league totals against the readers'", () => {
    const { L, events } = fold(plays());
    const acc = foldGame(emptyAccumulator(), { seed: "g", summary: { gameId: "g", home: "H", away: "A", score: { home: 0, away: 0 } } as never, events, statlines: [] }, H0);
    finishStep6League(L, acc);
    expect(faulted(L)).toEqual({});
    expect(L.pocket).toMatchObject({ dropbacks: 5, sacks: 3, failedScrambleSacks: 1, throwaways: 1, throwawaysByCause: { OUT_OF_POCKET: 1 } });
    expect(L.pocket!.sackSecondsN).toBe(3);
    // A league whose readers counted a sack the metrics fold did not.
    const { L: off } = fold(plays());
    off.agree!.sacks += 1;
    finishStep6League(off, acc);
    expect(why(off, "S-14")).toBe("the league: the metrics fold's 3 sacks, the readers' 4");
  });

  it("keeps M5's games without the free-run pictures, each game's stripped digest, and the cross-check's deadline picks", () => {
    const { L, events } = fold(plays());
    const { freeRun: _f, ...m5 } = m5GameOf(events, H0);
    void _f;
    expect(L.m5).toEqual([m5]);
    expect(L.m5![0]!.s6?.directions).toEqual({ LEFT: 2, RIGHT: 1 });
    expect(L.digests).toEqual([gameDigest(events, STEP6_EQUALITY_STRIP)]);
    expect(L.crossCheck).toMatchObject({ dropbacks: 5, deadlinePicks: 1, readerDeadlinePicks: 1 });
    expect(L.crossCheck!.unread).toBe(L.crossCheck!.movementChecks);
    // Off the folds' arms, none is kept.
    const none = fold(plays(), { options: { m5: false, digests: false, crossCheck: false } }).L;
    expect([none.m5, none.digests, none.crossCheck]).toEqual([null, null, null]);
    // The cross-check reads the rosters as played.
    const noRosters: Partial<Step6FoldOptions> = { crossCheck: true };
    expect(() => {
      const events2 = constructedGame("g", plays());
      const { players: _p, ...rest } = optionsOf(noRosters);
      void _p;
      foldStep6Game(emptyStep6LeagueFolds(), { events: events2 }, snapshot, H0, rest, []);
    }).toThrow("s6Checks: the movement cross-check reads the rosters as played (opts.players)");
  });

  it("the stream equalities' strip leaves out the rules stamp, the marker, the side and P10's flag, and nothing else (S-8')", () => {
    const step6 = constructedGame("g", [withQb(DEADLINE_THROWAWAY), scramblePlay(4, { quarterback: qb, drills: [], marker: true })]);
    const without = constructedGame("g", [
      mapBody(editDecisions({ ...withQb(DEADLINE_THROWAWAY), rules: "pocket-1.s5a" }, (p) => ({ choice: p["choice"] })), (b) => (b.type === "THROWAWAY" ? [throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t6:deadline" })] : [b])),
      { ...editDecisions(scramblePlay(4, { quarterback: qb, drills: [], marker: false }), (p) => ({ choice: p["choice"] })), rules: "pocket-1.s5a" },
    ]);
    expect(gameDigest(step6, STEP6_EQUALITY_STRIP)).toBe(gameDigest(without, STEP6_EQUALITY_STRIP));
    expect(gameDigest(step6)).not.toBe(gameDigest(without));
    // A die that moves is not stripped.
    const moved = constructedGame("g", [withQb(DEADLINE_THROWAWAY), scramblePlay(5, { quarterback: qb, drills: [], marker: true })]);
    expect(gameDigest(moved, STEP6_EQUALITY_STRIP)).not.toBe(gameDigest(step6, STEP6_EQUALITY_STRIP));
  });

  it("the probes' rating fold reads each patched man's change as the rosters were played (H14: Mobility 90; H15: Speed +10, capped at 99)", () => {
    const L = emptyStep6LeagueFolds();
    const h14 = applyRatingOverrides(snapshot, STEP6_PROBE_RATINGS.H14);
    foldRatingsGame(L, snapshot, h14, ["mobility", "speed"]);
    const qbs = [...playersOfSnapshot(h14).values()].filter((p) => ratingReader(p)("mobility") === 90 && ratingReader(players.get(String(p.bio.id))!)("mobility") !== 90);
    expect(L.ratings).toMatchObject({ games: 1, men: qbs.length });
    expect(L.ratings!.byAttr["mobility"]?.men).toBe(qbs.length);
    expect(L.ratings!.byAttr["mobility"]?.sumChange).toBe(qbs.reduce((a, p) => a + 90 - ratingReader(players.get(String(p.bio.id))!)("mobility"), 0));
    expect(L.ratings!.byAttr["speed"]).toBeUndefined();
    const S = emptyStep6LeagueFolds();
    foldRatingsGame(S, snapshot, applyRatingOverrides(snapshot, STEP6_PROBE_RATINGS.H15), ["mobility", "speed"]);
    const speed = S.ratings!.byAttr["speed"]!;
    expect(speed.men).toBeGreaterThan(0);
    expect(speed.sumChange / speed.men).toBeGreaterThan(0);
    expect(speed.sumChange / speed.men).toBeLessThanOrEqual(10);
    // Unpatched rosters read no change.
    const none = emptyStep6LeagueFolds();
    foldRatingsGame(none, snapshot, snapshot, ["mobility", "speed"]);
    expect(none.ratings).toEqual({ games: 1, men: 0, byAttr: {} });
  });
});

describe("the Mobility thirds (plan §6.2; CHOSEN)", () => {
  it("sorts by Mobility, then id: the first floor(n/3) LOW, the next MID, the rest HIGH", () => {
    const men = [
      { id: "q7", mobility: 90 },
      { id: "q1", mobility: 40 },
      { id: "q3", mobility: 60 },
      { id: "q2", mobility: 60 },
      { id: "q5", mobility: 75 },
      { id: "q4", mobility: 50 },
      { id: "q6", mobility: 80 },
    ];
    expect([...thirdsByMobility(men).entries()]).toEqual([
      ["q1", "LOW"],
      ["q4", "LOW"],
      ["q2", "MID"],
      ["q3", "MID"],
      ["q5", "HIGH"],
      ["q6", "HIGH"],
      ["q7", "HIGH"],
    ]);
    expect([...MOBILITY_THIRDS]).toEqual(["LOW", "MID", "HIGH"]);
    expect(thirdsByMobility([]).size).toBe(0);
  });

  it("reads a seed set's generated rosters before any arm plays: every quarterback in a third by Mobility, any other man in none", () => {
    const def = CORPORA.genSeason;
    const index = indexLeague(buildGeneratedLeague(buildLeague(def.seasonSeed[1]), { season: def.season }));
    const men = [...index.players.values()];
    const qbs = men.filter((p) => p.bio.position === "QB").map((p) => String(p.bio.id));
    const third = thirdsOf(1);
    const counts: Record<string, number> = { LOW: 0, MID: 0, HIGH: 0 };
    for (const id of qbs) counts[third(id) ?? "none"] = (counts[third(id) ?? "none"] ?? 0) + 1;
    expect(qbs.length).toBeGreaterThan(30);
    expect(counts).toEqual({ LOW: Math.floor(qbs.length / 3), MID: Math.floor(qbs.length / 3), HIGH: qbs.length - 2 * Math.floor(qbs.length / 3) });
    expect(third(String(men.find((p) => p.bio.position !== "QB")!.bio.id))).toBeUndefined();
    // The LOW third's Mobility is never above the HIGH third's.
    const mobility = (id: string): number => ratingReader(index.players.get(id as never)!)("mobility");
    const low = Math.max(...qbs.filter((id) => third(id) === "LOW").map(mobility));
    const high = Math.min(...qbs.filter((id) => third(id) === "HIGH").map(mobility));
    expect(low).toBeLessThanOrEqual(high);
  }, 120_000);
});
