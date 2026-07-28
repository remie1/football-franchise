/**
 * PROTECTION — and the one place a card cannot be authored in isolation.
 *
 * `ProtectionAssignment` names a BLOCKER and a RUSHER. That pairing is stated
 * rather than inferred because ADR-006 forbids the engine working out from a
 * formation string which defender the right tackle is answering. The consequence
 * is that an offensive card cannot be turned into a contracts play call without
 * knowing who is rushing — so a template declares a SCHEME, and the scheme is
 * paired against the defensive card at instantiation.
 *
 * TWO THINGS THIS MODELS THAT THE FIXTURES DID NOT.
 *
 *  1. **The centre blocks somebody.** The fixture playbook's own header admits the
 *     centre "stands there" against a four-man front. Here he is a protector like
 *     anyone else and takes an interior rusher when there is one.
 *  2. **Check release.** A back listed in the protection count blocks if a rusher
 *     would otherwise be free and releases into his route if not. That is how real
 *     protections handle a five-man pressure, and it means a blitz card produces
 *     FEWER ROUTES rather than an unresolvable play — an emergent, correct
 *     consequence of pressure that no tunable had to be invented for.
 *
 * KNOWN LIMITATION, and it is a vocabulary gap rather than a modelling choice:
 * `RushAssignment.alignment` is `EDGE | INTERIOR` with NO SIDE. So a card cannot
 * say "left A-gap blitz", and pairing cannot be geometrically correct — the left
 * tackle may end up on the right end. This is the pass-protection twin of
 * `CALIBRATION-BACKLOG.md` entry 17 ("§6.4's climb pairs blockers to linebackers by
 * ORDER, not geometry"). Petitioned as ADR-018.
 */
import type { PlayerId, ProtectionAssignment, RushAlignment, RushAssignment } from "@ff/contracts";
import { UnprotectableCallError } from "./errors.js";
import type { AnyOffensiveUnit, OffenseRole, OffenseSkillRole } from "./roles.js";

/**
 * A rusher whose alignment is KNOWN.
 *
 * `RushAssignment.alignment` is optional in contracts because the engine may derive
 * it from the rusher's `Position`. Every defensive card in this corpus states it, so
 * the pairing below never has to guess — and it does not have to guess in a way the
 * TYPE records, which is the point.
 *
 * Declared here rather than imported as contracts' `ResolvedRushAssignment`, and the
 * distinction matters: that name means "the alignment the engine SIMULATED with",
 * which is a product of resolution. This means "the alignment the card DECLARED",
 * which is a property of the card. Same shape, different fact.
 */
export interface DeclaredRush extends RushAssignment {
  readonly alignment: RushAlignment;
}

export interface ProtectorSpec {
  readonly role: OffenseRole;
  /** Which kind of rusher this man is responsible for first. */
  readonly takes: RushAlignment;
}

/**
 * NOT generic in the personnel grouping, deliberately. Tying it to `P` fought
 * inference at every construction site and bought little: `validate.ts` already
 * rejects a scheme that leaves a lineman out or check-releases a man with no route,
 * and instantiation throws loudly if a named role is not bound to a player.
 */
export interface ProtectionScheme {
  readonly name: string;
  /** Blocks on every snap. Order is the order in which they claim rushers. */
  readonly protectors: readonly ProtectorSpec[];
  /**
   * Blocks only if a rusher would otherwise be unblocked, in priority order. A
   * check-release man who blocks loses his route — which is the point.
   */
  readonly checkRelease: readonly OffenseSkillRole[];
}

export interface ProtectionResult {
  readonly protection: readonly ProtectionAssignment[];
  /** Check-release roles that ended up blocking, and therefore lost their route. */
  readonly pulledIn: readonly string[];
}

interface Slot {
  readonly role: string;
  readonly takes: RushAlignment;
  readonly player: PlayerId;
}

/**
 * Deterministic, and deliberately so: the same card against the same front pairs
 * identically on every seed, so protection is never a hidden source of variance in
 * a calibration batch.
 *
 * Order of resolution: edge rushers first (they are the ones a tackle must have),
 * then interior; each rusher takes the first free protector whose responsibility
 * matches, then any free protector, then a check-release man.
 */
export function assignProtection(
  cardName: string,
  scheme: ProtectionScheme,
  unit: AnyOffensiveUnit,
  rush: readonly DeclaredRush[],
): ProtectionResult {
  const slots: Slot[] = scheme.protectors.map((spec) => ({
    role: spec.role,
    takes: spec.takes,
    player: requirePlayer(unit, spec.role, cardName),
  }));
  const reserve: string[] = [...scheme.checkRelease];

  const ordered = [...rush].sort((a, b) => rank(a.alignment) - rank(b.alignment));
  const used = new Set<string>();
  const pulledIn: string[] = [];
  const protection: ProtectionAssignment[] = [];

  for (const rusher of ordered) {
    const alignment = rusher.alignment;
    let slot = slots.find((s) => !used.has(s.role) && s.takes === alignment);
    slot ??= slots.find((s) => !used.has(s.role));
    if (slot === undefined) {
      const next = reserve.shift();
      if (next === undefined) {
        throw new UnprotectableCallError(
          `${cardName}: ${ordered.length} rushers against ${scheme.protectors.length} protectors ` +
            `and ${scheme.checkRelease.length} check-release men. §7.4 blitz pickup is ` +
            "unimplemented in the engine, so a free rusher cannot be simulated; call a card " +
            "with more protection or a hot route.",
        );
      }
      slot = { role: next, takes: alignment, player: requirePlayer(unit, next, cardName) };
      slots.push(slot);
      pulledIn.push(next);
    }
    used.add(slot.role);
    protection.push({ blocker: slot.player, rusher: rusher.rusher });
  }

  return { protection, pulledIn };
}

function rank(alignment: RushAlignment): number {
  return alignment === "EDGE" ? 0 : 1;
}

function requirePlayer(unit: AnyOffensiveUnit, role: string, cardName: string): PlayerId {
  const player = (unit as Readonly<Record<string, PlayerId | undefined>>)[role];
  if (player === undefined) {
    throw new UnprotectableCallError(`${cardName}: no player bound to protector role ${role}`);
  }
  return player;
}

// --- the named schemes ------------------------------------------------------

/**
 * Five-man protection: the line, and nobody else. The back and the tight end are
 * in the route. This is the league's most common dropback protection and it is
 * also the one that gets a free rusher against a five-man pressure — which is why
 * every concept using it lists a check-release man.
 */
export function fiveManLine(checkRelease: readonly OffenseSkillRole[]): ProtectionScheme {
  return {
    name: "5-man",
    protectors: [
      { role: "LT", takes: "EDGE" },
      { role: "RT", takes: "EDGE" },
      { role: "LG", takes: "INTERIOR" },
      { role: "RG", takes: "INTERIOR" },
      { role: "C", takes: "INTERIOR" },
    ],
    checkRelease,
  };
}

/** Six men: the line plus one, usually the back. One fewer eligible, one more blocker. */
export function sixManProtection(
  sixth: OffenseSkillRole,
  checkRelease: readonly OffenseSkillRole[] = [],
): ProtectionScheme {
  return {
    name: "6-man",
    protectors: [...fiveManLine([]).protectors, { role: sixth, takes: "EDGE" }],
    checkRelease,
  };
}

/** Max protect. Seven in, two or three out — the shot-play protection. */
export function sevenManProtection(
  sixth: OffenseSkillRole,
  seventh: OffenseSkillRole,
): ProtectionScheme {
  return {
    name: "7-man",
    protectors: [
      ...fiveManLine([]).protectors,
      { role: sixth, takes: "EDGE" },
      { role: seventh, takes: "EDGE" },
    ],
    checkRelease: [],
  };
}
