/**
 * ADR-093 F3 (step 0): `PENALTY`, the flag as called and what became of it, with `EnforcementSpot`,
 * `PenaltyOutcome`, `PenaltyDown` and `PenaltyEnforcement`.
 *
 * Type-level, as `foulKinds.test.ts` is: the `@ts-expect-error` lines and the pins (`typePins.ts`)
 * fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost, and the runtime
 * asserts show the shapes survive JSON. Nothing produces a flag at step 0, so nothing here can
 * change a stream.
 */
import { describe, expect, it } from "vitest";
import type { EnforcementSpot, MatchEvent, PenaltyDown, PenaltyEnforcement, PenaltyOutcome, PlayId, PlayerId, TeamId } from "../src/index.js";
import type { Is, OptionalKeys, UndefinedKeys } from "./typePins.js";

type Penalty = Extract<MatchEvent, { type: "PENALTY" }>;
type PenaltyPayload = Penalty["payload"];
type Enforced = Extract<PenaltyPayload, { outcome: "ENFORCED" }>;
type NotEnforced = Exclude<PenaltyPayload, Enforced>;
type Marked = Extract<PenaltyEnforcement, { safety: false }>;
type Safety = Extract<PenaltyEnforcement, { safety: true }>;

const p = "p1" as PlayerId;
const team = "T1" as TeamId;
const ref = "g1/play:12/penalty:p1";

const marked: PenaltyEnforcement = { safety: false, spot: "PREVIOUS_SPOT", yards: 5, halfTheDistance: false, down: "YARDS_ONLY" };

describe("ADR-093 F3: PENALTY, what was called and what became of it", () => {
  const enforced: PenaltyPayload = {
    kind: "DEFENSIVE_OFFSIDE", player: p, team, rollRef: ref, freePlay: true, outcome: "ENFORCED", enforcement: marked,
  };
  const declined: PenaltyPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, rollRef: ref, freePlay: false, outcome: "DECLINED" };

  it("an enforced flag carries how it was marked off; every other outcome carries nothing", () => {
    const offset: PenaltyPayload = { ...declined, outcome: "OFFSET" };
    const superseded: PenaltyPayload = { kind: "FALSE_START", player: p, team, rollRef: ref, freePlay: false, outcome: "SUPERSEDED" };
    const outcomes: Record<PenaltyOutcome, true> = { ENFORCED: true, DECLINED: true, OFFSET: true, SUPERSEDED: true };
    expect(Object.keys(outcomes)).toHaveLength(4);
    for (const flag of [enforced, declined, offset, superseded]) expect(JSON.parse(JSON.stringify(flag))).toEqual(flag);
    expect("enforcement" in declined).toBe(false);
  });

  it("refuses an enforced flag without its enforcement, any other with one, and a fifth outcome", () => {
    // @ts-expect-error an ENFORCED flag must say how it was marked off
    const bare: PenaltyPayload = { kind: "DEFENSIVE_OFFSIDE", player: p, team, rollRef: ref, freePlay: true, outcome: "ENFORCED" };
    // @ts-expect-error a DECLINED flag marks nothing off
    const both: PenaltyPayload = { ...declined, enforcement: marked };
    // @ts-expect-error exactOptionalPropertyTypes: enforcement: undefined is refused, so a declined flag writes no key
    const undef: PenaltyPayload = { ...declined, enforcement: undefined };
    // @ts-expect-error a flag the booth picks up is not one of the four (Q8's build brings its own petitions)
    const pickedUp: PenaltyPayload = { ...declined, outcome: "PICKED_UP" };
    // A declined flag built elsewhere, carrying marks: refused too, so `enforcement?: never` does the work.
    const built = { kind: "OFFENSIVE_HOLDING" as const, player: p, team, rollRef: ref, freePlay: false, outcome: "DECLINED" as const, enforcement: marked };
    // @ts-expect-error a declined flag carries no enforcement, even one not written as a literal
    const smuggled: PenaltyPayload = built;
    expect([bare, both, undef, pickedUp, smuggled]).toHaveLength(5);
  });

  it("the old fields are gone, so a reader of either fails to compile (ADR-010)", () => {
    // @ts-expect-error `accepted` could not say OFFSET or SUPERSEDED
    const accepted = (f: PenaltyPayload): boolean => f.accepted;
    // @ts-expect-error nor may `yards` be read off the flag
    const yards = (f: PenaltyPayload): number => f.yards;
    // @ts-expect-error a reader narrows on the outcome before it reads the yards
    const unguarded = (f: PenaltyPayload): number => f.enforcement.yards;
    const guarded = (f: PenaltyPayload): number | undefined => (f.outcome === "ENFORCED" ? f.enforcement.yards : undefined);
    expect([accepted, yards, unguarded]).toHaveLength(3);
    expect(guarded(enforced)).toBe(5);
    expect(guarded(declined)).toBeUndefined();
  });

  it("names its foul, its man, his team, its roll and whether it was a free play", () => {
    // @ts-expect-error the kind is a FoulKind, not a free string
    const free: PenaltyPayload = { ...declined, kind: "holding" };
    // @ts-expect-error a flag names the penalty_check roll of the moment flagged
    const noRoll: PenaltyPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, freePlay: false, outcome: "DECLINED" };
    // @ts-expect-error and the team flagged
    const noTeam: PenaltyPayload = { kind: "OFFENSIVE_HOLDING", player: p, rollRef: ref, freePlay: false, outcome: "DECLINED" };
    // @ts-expect-error and the man flagged: a team's flag waits for its step, and never names a stand-in
    const noPlayer: PenaltyPayload = { kind: "DELAY_OF_GAME", team, rollRef: ref, freePlay: false, outcome: "DECLINED" };
    // @ts-expect-error and whether the play ran as a free play (ADR-091 M5)
    const noFree: PenaltyPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, rollRef: ref, outcome: "DECLINED" };
    expect([free, noRoll, noTeam, noPlayer, noFree]).toHaveLength(5);
  });

  it("is about a play, so it names the play, and leaves no key to undefined", () => {
    const pins: true[] = [
      true as Is<Penalty["playId"], PlayId>,
      true as Is<OptionalKeys<Enforced>, never>,
      true as Is<OptionalKeys<NotEnforced>, "enforcement">,
      true as Is<Required<NotEnforced>["enforcement"], never>,
      true as Is<UndefinedKeys<PenaltyPayload>, never>,
    ];
    expect(pins).toHaveLength(5);
  });
});

describe("ADR-093 F3: PenaltyEnforcement, how a flag was marked off", () => {
  it("marks off from one of four spots, and says half the distance and what it did to the down", () => {
    const spots: Record<EnforcementSpot, true> = { PREVIOUS_SPOT: true, SPOT_OF_FOUL: true, END_OF_RUN: true, SUCCEEDING_SPOT: true };
    const downs: Record<PenaltyDown, true> = { AUTOMATIC_FIRST_DOWN: true, LOSS_OF_DOWN: true, YARDS_ONLY: true };
    const halved: PenaltyEnforcement = { ...marked, yards: 3, halfTheDistance: true };
    // Roughing the passer: 15 yards and a first down.
    const roughing: PenaltyEnforcement = { ...marked, yards: 15, down: "AUTOMATIC_FIRST_DOWN" };
    // @ts-expect-error a spot is a kind of spot, not a yard line
    const yardLine: PenaltyEnforcement = { ...marked, spot: 35 };
    // @ts-expect-error nor a kicking-game spot, which comes with step 8
    const kickSpot: PenaltyEnforcement = { ...marked, spot: "SPOT_OF_THE_KICK" };
    // @ts-expect-error every mark is stated, none left to a default
    const partial: PenaltyEnforcement = { safety: false, spot: "PREVIOUS_SPOT", yards: 15, halfTheDistance: false };
    // @ts-expect-error and so is whether it was a safety
    const unsaid: PenaltyEnforcement = { spot: "PREVIOUS_SPOT", yards: 5, halfTheDistance: false, down: "YARDS_ONLY" };
    // @ts-expect-error one mark on the down: the two booleans, which could say both, are gone
    const both: PenaltyEnforcement = { ...marked, automaticFirstDown: true, lossOfDown: true };
    expect([Object.keys(spots).length, Object.keys(downs).length]).toEqual([4, 3]);
    expect(JSON.parse(JSON.stringify(roughing))).toEqual(roughing);
    expect([halved, yardLine, kickSpot, partial, unsaid, both]).toHaveLength(6);
  });

  it("a safety is marked from the spot of the foul, and carries no down", () => {
    // A hold in the offense's own end zone on a snap from its 1, as the NFL writes it: 1 yard, a safety.
    const safety: PenaltyEnforcement = { safety: true, spot: "SPOT_OF_FOUL", yards: 1 };
    // @ts-expect-error a safety is marked from the spot of the foul, in the end zone
    const fromPrevious: PenaltyEnforcement = { safety: true, spot: "PREVIOUS_SPOT", yards: 1 };
    // @ts-expect-error no down follows a safety, so it costs none
    const withLoss: PenaltyEnforcement = { safety: true, spot: "SPOT_OF_FOUL", yards: 8, down: "LOSS_OF_DOWN" as const };
    // @ts-expect-error nor says yards only: the down is absent, never stated as nothing (ADR-036)
    const yardsOnly: PenaltyEnforcement = { safety: true, spot: "SPOT_OF_FOUL", yards: 1, down: "YARDS_ONLY" as const };
    // @ts-expect-error nor says false of half the distance: the marks are absent, never false (ADR-036)
    const withFalse: PenaltyEnforcement = { safety: true, spot: "SPOT_OF_FOUL", yards: 1, halfTheDistance: false };
    // Intentional grounding from the end zone, built elsewhere, carrying a loss of down: refused too.
    const built = { safety: true as const, spot: "SPOT_OF_FOUL" as const, yards: 8, down: "LOSS_OF_DOWN" as const };
    // @ts-expect-error a safety carries no down marks, even in a value not written as a literal
    const smuggled: PenaltyEnforcement = built;
    expect(JSON.parse(JSON.stringify(safety))).toEqual(safety);
    expect([fromPrevious, withLoss, yardsOnly, withFalse, smuggled]).toHaveLength(5);
  });

  it("states every key of a marked flag; a safety's only optional keys are the two it never carries", () => {
    const pins: true[] = [
      true as Is<Marked["spot"], EnforcementSpot>,
      true as Is<Marked["down"], PenaltyDown>,
      true as Is<OptionalKeys<Marked>, never>,
      true as Is<UndefinedKeys<Marked>, never>,
      true as Is<Safety["spot"], "SPOT_OF_FOUL">,
      true as Is<OptionalKeys<Safety>, "halfTheDistance" | "down">,
      true as Is<Required<Safety>["halfTheDistance" | "down"], never>,
      true as Is<UndefinedKeys<Safety>, never>,
    ];
    expect(pins).toHaveLength(8);
  });
});
