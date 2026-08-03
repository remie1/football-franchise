/**
 * §7.1 — one rusher vs. one blocker.
 *
 * ADR-059 (August 2026): the matchup's ATTRIBUTE CONTEST is a REP, drawn ONCE
 * per matchup per play (`resolvePassRushRep`) and MEMOIZED by the caller
 * (`sim/passPlay.ts`'s `resolvePassRushRepFor`) exactly the shape
 * `resolveBreakPoint` already uses for a receiver's coverage contest — lazily,
 * on the tick it is first needed, guarded so it never redraws. Every tick after
 * that draws only `resolvePassRushTick`'s UNMODDED jitter around the rep's own
 * margin, and references the rep's roll by `rollRef` (ADR-004's rule, extended
 * from summary→CHECK to CHECK→CHECK by ADR-059).
 *
 * Before this ADR, `rusherRoll`/`blockerRoll` were drawn WITH MODS every tick,
 * independently — a rusher losing at t=1.0 was, at t=1.5, contesting a fresh
 * matchup against the same blocker. That is the defect this split repairs: the
 * attribute contest now happens once, and "he is being handled today" is
 * representable, not just "he lost that instant".
 */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor, traitModifier } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { RushMove } from "../types.js";

export type PassRushBandLabel = (Tunables["passRush"]["bands"])[number]["label"];

export interface PassRushRepArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly rusher: PlayerState;
  readonly blocker: PlayerState;
  readonly move: RushMove;
  /**
   * ADR-059 CONSEQUENCE, FLAGGED RATHER THAN SILENTLY DROPPED: this argument
   * is structurally always `undefined` at the one call site that can ever
   * reach it. `resolvePassRushRepFor` (`sim/passPlay.ts`) fires this function
   * exactly once per matchup, lazily, on the FIRST tick it is needed — which
   * is, by construction, before any tick of THIS matchup has posted a band.
   * There is no "previous rep" within a play for the counter-move bonus
   * (`counterMoveAfterStalemate`) to key on.
   *
   * Kept on the signature anyway, because ADR-059 moves EVERY mod the tick
   * used to apply here wholesale ("the mods move here from the tick" is not
   * attribute-selective — see the module comment) rather than hand-picking
   * which ones survive, and because a future caller that DID have a genuine
   * prior rep (there is none today) would have somewhere to hand it. The
   * practical effect: `counterMoveAfterStalemate` is now DEAD CODE, a
   * consequence of the rep model this ADR did not itself call out. See this
   * file's report to the Orchestrator.
   */
  readonly previousBand?: PassRushBandLabel;
  /**
   * Play-scoped, per-matchup fork — NOT tick-scoped (ADR-059's explicit
   * requirement). Callers fork this off the play's own "rush" bucket with a
   * label stable for the whole play (the rusher's id), the same way
   * `resolveBreakPoint` forks `coverageRng` by receiver id rather than by tick.
   */
  readonly repRng: Rng;
}

export interface PassRushRepOutcome {
  readonly margin: number;
  readonly rusherRoll: RollDetail;
  readonly blockerRoll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * §7.1's attribute contest, drawn ONCE per matchup per play.
 *
 * ADR-059 claim 11 (owner ruling, minimal reading): "the latent tests exactly
 * what the tick tests today; the jitter tests nothing." So every modifier the
 * tick used to compute — attribute, trait, and the (currently zero) structural
 * flat term — moves here unchanged, and `testsAttrs` is populated here instead
 * of on the tick.
 */
export function resolvePassRushRep(args: PassRushRepArgs): PassRushRepOutcome {
  const { rusher, blocker, move, previousBand, repRng, tunables } = args;
  const t = tunables.passRush;

  const moveMods =
    move === "SPEED"
      ? [
          actorAttrModifier(rusher, "speed rush (First Step)", ATTR.firstStep, t.rusherAttrDivisor),
          traitModifier("Trait: Quick Twitch", rusher.attributes.traits, TRAIT.quickTwitch, tunables.traitBonuses.quickTwitch),
        ]
      : move === "POWER"
        ? [
            actorAttrModifier(rusher, "power rush (Power Move)", ATTR.powerMove, t.rusherAttrDivisor),
            actorAttrModifier(rusher, "power rush (Strength)", ATTR.strength, t.rusherAttrDivisor),
          ]
        : [actorAttrModifier(rusher, "finesse (Finesse Move)", ATTR.finesseMove, t.rusherAttrDivisor)];

  const rusherMods = compact([
    actorAttrModifier(rusher, "Pass Rush", ATTR.passRush, t.rusherAttrDivisor),
    ...moveMods,
    previousBand === "STALEMATE"
      ? flatModifier("Counter move after stalemate", t.counterMoveAfterStalemate)
      : undefined,
  ]);

  /**
   * ADR-028 petition 1. The blocker's third ATTRIBUTE term, and the reason
   * `t.blockerStructuralAdvantage` is now 0. See `tunables.ts`'s own comment on
   * that field for the full history; unchanged by ADR-059 beyond relocation.
   */
  const blockerMods = compact([
    flatModifier("Protection structural advantage", t.blockerStructuralAdvantage),
    actorAttrModifier(blocker, "Pass Block", ATTR.passBlock, t.blockerAttrDivisor),
    actorAttrModifier(blocker, "Footwork", ATTR.footwork, t.blockerAttrDivisor),
    actorAttrModifier(blocker, "Anchor", ATTR.anchor, t.blockerAttrDivisor),
    move === t.brickWallMove
      ? traitModifier("Trait: Brick Wall (anchor)", blocker.attributes.traits, TRAIT.brickWall, tunables.traitBonuses.brickWall)
      : undefined,
  ]);

  const rusherRoll = rollD100(repRng.fork(`${rusher.bio.id}:rush`), rusherMods);
  const blockerRoll = rollD100(repRng.fork(`${blocker.bio.id}:block`), blockerMods);
  const margin = rusherRoll.total - blockerRoll.total;

  return {
    margin,
    rusherRoll,
    blockerRoll,
    check: {
      checkKind: "pass_rush_rep",
      actors: [rusher.bio.id, blocker.bio.id],
      roll: rusherRoll,
      opposedRoll: blockerRoll,
      tier: tierFor(tunables, margin),
      // Informational, same as every other contest with a band table
      // (`resolveZoneCoverage` etc.) — NOT what a given tick's band is decided
      // from; that is `resolvePassRushTick`'s own jittered margin.
      band: bandFor(t.bands, margin).label,
      margin,
      testsAttrs: [
        ATTR.passRush,
        ...(move === "SPEED" ? [ATTR.firstStep] : move === "POWER" ? [ATTR.powerMove, ATTR.strength] : [ATTR.finesseMove]),
        ATTR.passBlock,
        ATTR.footwork,
        ATTR.anchor,
      ],
    },
  };
}

export interface PassRushTickArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly rusher: PlayerState;
  readonly blocker: PlayerState;
  /** The `pass_rush_rep` CHECK's margin — this tick jitters around it. */
  readonly repMargin: number;
  /** The `pass_rush_rep` CHECK's `roll.rngLabel` (ADR-059's `rollRef`). */
  readonly rollRef: string;
  /** Tick-scoped fork; the resolver forks once per actor for auditability. */
  readonly tickRng: Rng;
}

export interface PassRushTickOutcome {
  readonly band: PassRushBandLabel;
  readonly margin: number;
  readonly rusherRoll: RollDetail;
  readonly blockerRoll: RollDetail;
  readonly pressureDelta: number;
  readonly resetsPressure: boolean;
  readonly check: CheckEmission;
}

/**
 * §7.1's per-tick jitter around the rep's latent margin.
 *
 * ADR-059 claim 11 (owner ruling): UNMODDED — the attribute contest already
 * happened at the rep, so this roll legitimately tests nothing, and
 * `testsAttrs: []` is the honest answer rather than an omission (mirrored by
 * `determinism.test.ts`'s hand-named exception, paired with the assertion that
 * `pass_rush_rep`'s `testsAttrs` is non-empty).
 *
 * THE JITTER MAGNITUDE (`passRush.repJitter.divisor`) IS A TUNABLE, not a
 * hardcode — see its own comment in `tunables.ts` for provenance. It is NOT
 * ratified football content; ADR-059 ratifies structure only.
 */
export function resolvePassRushTick(args: PassRushTickArgs): PassRushTickOutcome {
  const { rusher, blocker, repMargin, rollRef, tickRng, tunables } = args;
  const t = tunables.passRush;

  const rusherRoll = rollD100(tickRng.fork(`${rusher.bio.id}:jitter`), []);
  const blockerRoll = rollD100(tickRng.fork(`${blocker.bio.id}:jitter`), []);
  const jitter = Math.round((rusherRoll.total - blockerRoll.total) / t.repJitter.divisor);
  const margin = repMargin + jitter;
  const band = bandFor(t.bands, margin);
  const progress = t.pressureProgressByBand[band.label];

  return {
    band: band.label,
    margin,
    rusherRoll,
    blockerRoll,
    pressureDelta: progress.delta,
    resetsPressure: progress.reset,
    check: {
      checkKind: "pass_rush_tick",
      actors: [rusher.bio.id, blocker.bio.id],
      roll: rusherRoll,
      opposedRoll: blockerRoll,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [],
      rollRef,
    },
  };
}
