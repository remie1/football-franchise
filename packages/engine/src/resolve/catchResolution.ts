/** §11 — catch type, catch roll, contested catch. */
import type { PlayerState, Rng, RollDetail, RollModifier } from "@ff/contracts";
import { ATTR, TRAIT, attrName, resolveAttr } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor, traitModifier } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ContestPosition } from "../types.js";
import type { AccuracyBand } from "./throwExecution.js";

export type CatchType = "ROUTINE" | "CONTESTED";
export type RoutineCatchBandLabel = (Tunables["catching"]["routine"]["bands"])[number]["label"];
export type ContestedCatchBandLabel = (Tunables["catching"]["contested"]["bands"])[number]["label"];

export interface CatchOutcome {
  readonly catchType: CatchType;
  readonly band: RoutineCatchBandLabel | ContestedCatchBandLabel;
  readonly margin: number;
  readonly caught: boolean;
  readonly interception: boolean;
  readonly roll: RollDetail;
  readonly opposedRoll?: RollDetail;
  readonly check: CheckEmission;
}

/** §11.1 — a defender inside the contest window makes it a 50/50 ball. */
export function catchTypeFor(tunables: Tunables, actualOpenness: number): CatchType {
  return actualOpenness <= tunables.catching.contestedMaxOpenness ? "CONTESTED" : "ROUTINE";
}

export interface CatchArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly receiver: PlayerState;
  /**
   * Absent when nobody is near enough to contest — a hole in a zone with no
   * defender responsible for it. A contested catch without a defender is not a
   * 50/50 ball, it is a catch.
   */
  readonly defender?: PlayerState | undefined;
  readonly accuracy: AccuracyBand;
  readonly contestPosition: ContestPosition;
  readonly catchType: CatchType;
  /** §9.4 "+20 to contest/interception" for a zone defender who broke on the ball. */
  readonly defenderContestModifiers?: readonly RollModifier[];
  readonly catchRng: Rng;
}

export function resolveCatch(args: CatchArgs): CatchOutcome {
  return args.catchType === "CONTESTED" && args.defender !== undefined
    ? resolveContestedCatch(args, args.defender)
    : resolveRoutineCatch(args);
}

function resolveRoutineCatch(args: CatchArgs): CatchOutcome {
  const { receiver, accuracy, catchRng, tunables } = args;
  const t = tunables.catching.routine;

  const mods = compact([
    actorAttrModifier(receiver, "Catching", ATTR.catching, t.attrDivisor),
    traitModifier("Trait: Reliable Hands", receiver.attributes.traits, TRAIT.reliableHands, tunables.traitBonuses.reliableHands),
    flatModifier(`Ball placement: ${accuracy.label}`, accuracy.catchMod),
  ]);

  const roll = rollD100(catchRng.fork(`${receiver.bio.id}:catch`), mods);
  const target = t.target + accuracy.difficulty;
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  return {
    catchType: "ROUTINE",
    band: band.label,
    margin,
    caught: band.caught,
    interception: false,
    roll,
    check: {
      checkKind: "catch",
      actors: [receiver.bio.id],
      roll,
      target,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.catching],
    },
  };
}

function resolveContestedCatch(args: CatchArgs, defender: PlayerState): CatchOutcome {
  const { receiver, accuracy, contestPosition, catchRng, tunables } = args;
  const t = tunables.catching.contested;

  // The role prefix is the actor's own position (B2); the attribute label is the
  // registry's display name, so a ratified attribute (ADR-003 `jumping`) needs
  // no code change here either.
  type AttrTerm = { readonly attr: string; readonly divisor: number };
  const termMods = (terms: readonly AttrTerm[], who: PlayerState): RollModifier[] =>
    terms.map((term) => {
      const id = resolveAttr(term.attr);
      return actorAttrModifier(who, attrName(id), id, term.divisor);
    });

  const receiverMods = compact([
    ...termMods(t.receiverTerms, receiver),
    traitModifier("Trait: Reliable Hands", receiver.attributes.traits, TRAIT.reliableHands, tunables.traitBonuses.reliableHands),
    flatModifier(`Ball placement: ${accuracy.label}`, accuracy.catchMod),
  ]);

  const defenderMods = compact([
    ...termMods(t.defenderTerms, defender),
    flatModifier(`Contest position: ${contestPosition}`, t.positionModifier[contestPosition]),
    flatModifier(`Ball placement: ${accuracy.label}`, accuracy.defenderContestMod),
    traitModifier("Trait: Ball Hawk", defender.attributes.traits, TRAIT.ballHawk, tunables.traitBonuses.ballHawk),
    ...(args.defenderContestModifiers ?? []),
  ]);

  const roll = rollD100(catchRng.fork(`${receiver.bio.id}:contested`), receiverMods);
  const opposedRoll = rollD100(catchRng.fork(`${defender.bio.id}:contest`), defenderMods);
  const margin = roll.total - opposedRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    catchType: "CONTESTED",
    band: band.label,
    margin,
    caught: band.caught,
    interception: band.interception,
    roll,
    opposedRoll,
    check: {
      checkKind: "contested_catch",
      actors: [receiver.bio.id, defender.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [
        ...t.receiverTerms.map((term) => resolveAttr(term.attr)),
        ...t.defenderTerms.map((term) => resolveAttr(term.attr)),
      ],
    },
  };
}
