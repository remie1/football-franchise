/**
 * ADR-089 step 4: THE RATING OVERRIDE (`pocket/ratingOverride.ts`; `RunGameInput.ratings`; review F9, F10).
 *
 * The probes set or raise one attribute, by registry id, on chosen men before a game is played. These
 * tests hold that the override is pure (the snapshot it is given is never touched), reaches exactly
 * the men it names, goes through the registry's own path (refused off the registry, clamped to the
 * scale), and that a corpus game played with it is deterministic and differs from today's, while a
 * game played without it is today's byte for byte (the pin tests hold the same on the whole golden
 * corpora: `goldenDigests`, `pocketS1Pins`, `pocketS2Pins`, `pocketS3Pins`).
 */
import { getAttr } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { buildFixture } from "../src/harness/schedule.js";
import { registryAttr } from "../src/pocket/freeRun.js";
import { genSeason, goldenFixtures, goldenGames } from "../src/pocket/corpus.js";
import { gameBytesDigest } from "../src/pocket/golden.js";
import { applyRatingOverrides, checkRatingOverride, ratingOverridesDigest, ratingOverridesKey, ratingOverridesReach, ratingOverrideTargets, type RatingOverride } from "../src/pocket/ratingOverride.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";

const GOLDEN = goldenFixtures("flat");
const built = buildFixture(GOLDEN.index, GOLDEN.fixtures[0]!);
const snap = built.snapshot;
const RELEASE = registryAttr("release");
const STRENGTH = registryAttr("strength");
const TACKLING = registryAttr("tackling");
const valueOf = (s: typeof snap, id: string, attr: ReturnType<typeof registryAttr>): number => getAttr((s.home.players[id] ?? s.away.players[id])!.attributes.values, attr);

describe("the rating override is pure and reaches exactly the men it names", () => {
  it("SET on every player of both teams, and the snapshot it was given is untouched", () => {
    const before = JSON.stringify(snap);
    const o: RatingOverride = { attr: "release", target: { kind: "ROLE", role: "ALL", side: "BOTH" }, change: { op: "SET", value: 40 } };
    const after = applyRatingOverrides(snap, [o]);
    expect(JSON.stringify(snap)).toBe(before);
    const all = [...Object.keys(snap.home.players), ...Object.keys(snap.away.players)];
    expect(ratingOverrideTargets(snap, o)).toHaveLength(all.length);
    for (const id of all) expect(valueOf(after, id, RELEASE), id).toBe(40);
    for (const id of all) expect(valueOf(snap, id, RELEASE), id).toBe(60);
  });

  it("a role names its men from the personnel: QB both sides, the first end of each defense, one named man", () => {
    const qbs = ratingOverrideTargets(snap, { attr: "strength", target: { kind: "ROLE", role: "QB", side: "BOTH" }, change: { op: "ADD", delta: 30 } });
    expect(qbs).toEqual([String(snap.home.offense.quarterback), String(snap.away.offense.quarterback)]);
    const homeQb = ratingOverrideTargets(snap, { attr: "release", target: { kind: "ROLE", role: "QB", side: "HOME" }, change: { op: "ADD", delta: 40 } });
    expect(homeQb).toEqual([String(snap.home.offense.quarterback)]);
    const ends = ratingOverrideTargets(snap, { attr: "tackling", target: { kind: "ROLE", role: "EDGE", side: "BOTH", slot: 0 }, change: { op: "ADD", delta: 30 } });
    expect(ends).toEqual([String(snap.home.defense.edges[0]), String(snap.away.defense.edges[0])]);
    const rushers = ratingOverrideTargets(snap, { attr: "tackling", target: { kind: "ROLE", role: "RUSHER", side: "AWAY" }, change: { op: "ADD", delta: 1 } });
    expect(rushers).toEqual([...snap.away.defense.edges, ...snap.away.defense.interior].map(String));
    const man = String(snap.away.defense.interior[1]);
    const raised = applyRatingOverrides(snap, [{ attr: "tackling", target: { kind: "PLAYER", player: man }, change: { op: "ADD", delta: 30 } }]);
    expect(valueOf(raised, man, TACKLING)).toBe(90);
    const others = Object.keys(snap.away.players).filter((id) => id !== man);
    for (const id of others) expect(raised.away.players[id], id).toBe(snap.away.players[id]);
    expect(raised.home.players).toEqual(snap.home.players);
    expect(ratingOverrideTargets(snap, { attr: "tackling", target: { kind: "PLAYER", player: "p:nobody" }, change: { op: "ADD", delta: 1 } })).toEqual([]);
  });

  it("DEFENSE names every man in the defense's personnel, coverage included, and no man of the offense (ADR-089 step 6, plan §5.1, H15)", () => {
    const SPEED = registryAttr("speed");
    const defense = (team: typeof snap.home): string[] =>
      [...team.defense.edges, ...team.defense.interior, ...team.defense.linebackers, ...team.defense.corners, ...team.defense.safeties].map(String);
    const o: RatingOverride = { attr: "speed", target: { kind: "ROLE", role: "DEFENSE", side: "BOTH" }, change: { op: "ADD", delta: 10 } };
    expect(() => checkRatingOverride(o)).not.toThrow();
    // Eleven a side, in the personnel's order: the ends, the interior, the linebackers, the corners, the safeties.
    for (const team of [snap.home, snap.away]) expect(new Set(defense(team)).size).toBe(11);
    expect(ratingOverrideTargets(snap, o)).toEqual([...defense(snap.home), ...defense(snap.away)]);
    expect(ratingOverrideTargets(snap, { ...o, target: { kind: "ROLE", role: "DEFENSE", side: "AWAY" } })).toEqual(defense(snap.away));
    // A slot picks one man of that list: slot 6 is the first corner.
    expect(ratingOverrideTargets(snap, { ...o, target: { kind: "ROLE", role: "DEFENSE", side: "HOME", slot: 6 } })).toEqual([String(snap.home.defense.corners[0])]);
    // The rushers are a part of it; the quarterback and every other man of the offense are not.
    const reached = new Set(ratingOverrideTargets(snap, o));
    for (const id of ratingOverrideTargets(snap, { ...o, target: { kind: "ROLE", role: "RUSHER", side: "BOTH" } })) expect(reached.has(id), id).toBe(true);
    for (const team of [snap.home, snap.away]) {
      const off = team.offense;
      for (const id of [off.quarterback, off.runningBack, ...off.receivers, off.tightEnd, off.leftTackle, off.leftGuard, off.center, off.rightGuard, off.rightTackle]) {
        expect(reached.has(String(id)), String(id)).toBe(false);
      }
    }
    // Speed +10 on every defender, capped at 99 by the registry's clamp; nobody else's state changes.
    const raised = applyRatingOverrides(snap, [o]);
    for (const id of reached) expect(valueOf(raised, id, SPEED), id).toBe(Math.min(99, valueOf(snap, id, SPEED) + 10));
    for (const side of ["home", "away"] as const) {
      for (const id of Object.keys(snap[side].players).filter((p) => !reached.has(p))) expect(raised[side].players[id], id).toBe(snap[side].players[id]);
    }
    expect(() => checkRatingOverride({ ...o, target: { kind: "ROLE", role: "OFFENSE" as never, side: "BOTH" } })).toThrow("no role OFFENSE (ALL, QB, EDGE, INTERIOR, RUSHER, DEFENSE)");
  });

  it("ADD reads through getAttr and setAttr clamps to the scale; later overrides see earlier ones", () => {
    const qb = String(snap.home.offense.quarterback);
    const t = { kind: "PLAYER", player: qb } as const;
    expect(valueOf(applyRatingOverrides(snap, [{ attr: "strength", target: t, change: { op: "ADD", delta: 60 } }]), qb, STRENGTH)).toBe(99);
    expect(valueOf(applyRatingOverrides(snap, [{ attr: "strength", target: t, change: { op: "ADD", delta: -70 } }]), qb, STRENGTH)).toBe(0);
    const two = applyRatingOverrides(snap, [
      { attr: "strength", target: t, change: { op: "SET", value: 20 } },
      { attr: "strength", target: t, change: { op: "ADD", delta: 5 } },
    ]);
    expect(valueOf(two, qb, STRENGTH)).toBe(25);
  });

  it("no override returns the snapshot itself; the key and digest name the overrides, none as none", () => {
    expect(applyRatingOverrides(snap, undefined)).toBe(snap);
    expect(applyRatingOverrides(snap, [])).toBe(snap);
    expect(ratingOverridesKey(undefined)).toBe("none");
    expect(ratingOverridesDigest([])).toBe("none");
    const o: RatingOverride = { attr: "release", target: { kind: "ROLE", role: "ALL", side: "BOTH" }, change: { op: "SET", value: 80 } };
    expect(ratingOverridesDigest([o])).toMatch(/^fnv1a:[0-9a-f]{8}$/);
    expect(ratingOverridesDigest([o])).toBe(ratingOverridesDigest([{ change: { value: 80, op: "SET" }, target: { side: "BOTH", role: "ALL", kind: "ROLE" }, attr: "release" }]));
    expect(ratingOverridesDigest([o])).not.toBe(ratingOverridesDigest([{ ...o, change: { op: "SET", value: 40 } }]));
    expect([...ratingOverridesReach(snap, [o])].length).toBe(Object.keys(snap.home.players).length + Object.keys(snap.away.players).length);
  });

  it("refuses an attribute off the registry, a fraction, a zero delta, a bad slot", () => {
    const t = { kind: "ROLE", role: "QB", side: "BOTH" } as const;
    expect(() => checkRatingOverride({ attr: "releese", target: t, change: { op: "SET", value: 40 } })).toThrow(/not an attribute of ATTRIBUTE_REGISTRY_V1/);
    expect(() => checkRatingOverride({ attr: "release", target: t, change: { op: "SET", value: 40.5 } })).toThrow(/whole rating/);
    expect(() => checkRatingOverride({ attr: "release", target: t, change: { op: "SET", value: 100 } })).toThrow(/whole rating/);
    expect(() => checkRatingOverride({ attr: "release", target: t, change: { op: "ADD", delta: 0 } })).toThrow(/non-zero delta/);
    expect(() => checkRatingOverride({ attr: "release", target: { ...t, slot: -1 }, change: { op: "ADD", delta: 1 } })).toThrow(/slot/);
    expect(() => applyRatingOverrides(snap, [{ attr: "releese", target: t, change: { op: "SET", value: 40 } }])).toThrow(/releese/);
  });
});

describe("a corpus game with an override: deterministic, and changed; without one, today's", () => {
  const digests = (opts: { readonly ratings?: readonly RatingOverride[] }): string[] => {
    const out: string[] = [];
    goldenGames("flat", (o) => out.push(gameBytesDigest(o.events)), { callerVersion: STEP1_CALLER, first: 2, ...opts });
    return out;
  };
  const release40: RatingOverride[] = [{ attr: "release", target: { kind: "ROLE", role: "ALL", side: "BOTH" }, change: { op: "SET", value: 40 } }];
  const today = digests({});

  it("the same override on the same seeds gives the same games", () => {
    expect(digests({ ratings: release40 })).toEqual(digests({ ratings: release40 }));
  });

  it("release, read only by the throwing motion, leaves today's games as they are (the release probe's premise: only the motion reads it)", () => {
    expect(digests({ ratings: release40 })).toEqual(today);
  });

  it("the override reaches the engine (every quarterback's accuracy set to 20 moves today's golden games), and an empty list is today's", () => {
    const accuracy20: RatingOverride[] = [{ attr: "accuracy", target: { kind: "ROLE", role: "QB", side: "BOTH" }, change: { op: "SET", value: 20 } }];
    const moved = digests({ ratings: accuracy20 });
    expect(moved).not.toEqual(today);
    expect(digests({ ratings: accuracy20 })).toEqual(moved);
    expect(digests({ ratings: [] })).toEqual(today);
  });
});

describe("the season path carries the override (the gen probe plays the generated league's season)", () => {
  it("week 1 of the generated season: an override moves its games, the same override twice gives the same games, none is today's", () => {
    const week1 = (ratings?: readonly RatingOverride[]): string[] => {
      const out: string[] = [];
      genSeason(1, (o) => out.push(gameBytesDigest(o.events)), { callerVersion: STEP1_CALLER, throughWeek: 1, ...(ratings === undefined ? {} : { ratings }) });
      return out;
    };
    const accuracy20: RatingOverride[] = [{ attr: "accuracy", target: { kind: "ROLE", role: "QB", side: "HOME" }, change: { op: "SET", value: 20 } }];
    const today = week1();
    const moved = week1(accuracy20);
    expect(moved).toHaveLength(today.length);
    expect(moved).not.toEqual(today);
    expect(week1(accuracy20)).toEqual(moved);
  }, 120_000);
});
