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
 * PAIRING IS GEOMETRIC NOW (ADR-018 §Petition 2, landed). `RushAssignment.side`
 * exists, every rush duty in the corpus states it, and every protector states which
 * side of the centre he sets to. What this file used to do — take edge rushers in
 * card order and hand them to whichever tackle was still free — could put the LEFT
 * TACKLE ON THE RIGHT END, resolve cleanly, and produce plausible numbers from an
 * impossible matchup. That is silent wrongness, which Charter §4.1 exists to catch,
 * and it is gone: a blocker and a rusher are paired because they are on the same
 * side of the football.
 *
 * THE ONE CROSSING THAT IS REAL is the slide. An interior rusher may be picked up by
 * an interior protector from the other side, because that is what a full slide
 * protection does. An EDGE rusher may not: no protection in football answers a wide
 * rusher with the tackle from the far side, so when that is the only pairing left the
 * call is unprotectable and says so.
 */
import type {
  PlayerId,
  ProtectionAssignment,
  RunSide,
  RushAlignment,
  RushAssignment,
} from "@ff/contracts";
import { UnprotectableCallError } from "./errors.js";
import type { AnyOffensiveUnit, OffenseRole, OffenseSkillRole } from "./roles.js";

/**
 * A rusher whose alignment AND SIDE are known.
 *
 * Both are optional in contracts — the engine may derive an alignment from the
 * rusher's `Position`, and a card written before ADR-018 has no side at all. Every
 * defensive card in this corpus states both, so the pairing below never has to guess,
 * and it does not have to guess IN A WAY THE TYPE RECORDS, which is the point.
 *
 * Declared here rather than imported as contracts' `ResolvedRushAssignment`, and the
 * distinction matters: that name means "the alignment the engine SIMULATED with",
 * which is a product of resolution. This means "the alignment the card DECLARED",
 * which is a property of the card. Same shape, different fact.
 */
export interface DeclaredRush extends RushAssignment {
  readonly alignment: RushAlignment;
  readonly side: RunSide;
}

/**
 * Which side of the centre a protector sets to.
 *
 * `MIDDLE` is the centre, and it is a third value rather than a missing one: he is
 * genuinely uncommitted and helps either A gap, which is a fact about the position
 * and not an absence of information. A back who stays in to scan is `MIDDLE` for the
 * same reason. Required, so a scheme cannot be side-blind by omission — that is the
 * defect ADR-018 §Petition 2 was filed about, and an optional field with an implied
 * meaning would reintroduce it as a convention.
 */
export type ProtectorSide = RunSide | "MIDDLE";

export interface ProtectorSpec {
  readonly role: OffenseRole;
  /** Which kind of rusher this man is responsible for first. */
  readonly takes: RushAlignment;
  readonly side: ProtectorSide;
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
  readonly side: ProtectorSide;
  readonly player: PlayerId;
}

/**
 * Whom this rusher may be blocked by, in preference order. Every rule below is a
 * protection rule somebody could say out loud, which is the test a pairing has to
 * pass before it is allowed to produce numbers:
 *
 *  1. **His man.** Same side, and the technique the protector is set for.
 *  2. **Same side, wrong technique.** A guard on an overloading edge rusher; a
 *     tackle on a looping interior man. Real on any overload — and it comes BEFORE
 *     the centre on purpose: the centre is the only protector who can help either
 *     side, so a side that still has a body of its own does not get to burn him.
 *     Getting this order wrong makes a six-man pressure with three rushers a side
 *     unblockable by a six-man protection that can plainly block it.
 *  3. **The centre, on his technique.** Uncommitted, so he takes an interior man.
 *  4. **The centre, on anything.**
 *  5. **The slide, and INTERIOR ONLY.** An interior rusher can be picked up across
 *     the football because the line slides a gap. An edge rusher cannot, and that
 *     omission is the whole point: it makes the left-tackle-on-the-right-end pairing
 *     unrepresentable rather than merely unlikely.
 */
function claim(free: readonly Slot[], rusher: DeclaredRush): Slot | undefined {
  const onHisSide = (s: Slot): boolean => s.side === rusher.side;
  const middle = (s: Slot): boolean => s.side === "MIDDLE";
  const onHisTechnique = (s: Slot): boolean => s.takes === rusher.alignment;
  return (
    free.find((s) => onHisSide(s) && onHisTechnique(s)) ??
    free.find(onHisSide) ??
    free.find((s) => middle(s) && onHisTechnique(s)) ??
    free.find(middle) ??
    (rusher.alignment === "INTERIOR" ? free.find((s) => s.takes === "INTERIOR") : undefined)
  );
}

/**
 * Deterministic, and deliberately so: the same card against the same front pairs
 * identically on every seed, so protection is never a hidden source of variance in
 * a calibration batch.
 *
 * Order of resolution: edge rushers first (they are the ones a tackle must have),
 * then interior. Each rusher claims a protector by the rules above, and a rusher
 * nobody can legally block pulls in a check-release man — which is what a check
 * release is for.
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
    side: spec.side,
    player: requirePlayer(unit, spec.role, cardName),
  }));
  const reserve: string[] = [...scheme.checkRelease];

  const ordered = [...rush].sort((a, b) => rank(a.alignment) - rank(b.alignment));
  const used = new Set<string>();
  const pulledIn: string[] = [];
  const protection: ProtectionAssignment[] = [];

  for (const rusher of ordered) {
    const free = slots.filter((s) => !used.has(s.role));
    let slot = claim(free, rusher);
    if (slot === undefined) {
      const next = reserve.shift();
      if (next === undefined) {
        throw new UnprotectableCallError(unprotectable(cardName, scheme, ordered, free, rusher));
      }
      // A back who stays in scans and blocks whoever came free, so he has no declared
      // side. That is a fact about check release, not a pairing this code invented.
      slot = {
        role: next,
        takes: rusher.alignment,
        side: "MIDDLE",
        player: requirePlayer(unit, next, cardName),
      };
      slots.push(slot);
      pulledIn.push(next);
    }
    used.add(slot.role);
    protection.push({ blocker: slot.player, rusher: rusher.rusher });
  }

  return { protection, pulledIn };
}

/**
 * Two different failures wearing one exception, told apart because they call for
 * different fixes: too few blockers is a protection choice, and too few blockers ON
 * ONE SIDE is an overload the offence has no answer to without a hot route.
 */
function unprotectable(
  cardName: string,
  scheme: ProtectionScheme,
  rush: readonly DeclaredRush[],
  free: readonly Slot[],
  rusher: DeclaredRush,
): string {
  const tail =
    "§7.4 blitz pickup is unimplemented in the engine, so a free rusher cannot be " +
    "simulated; call a card with more protection or a hot route.";
  if (free.length > 0) {
    const sameSide = rush.filter((r) => r.side === rusher.side).length;
    return (
      `${cardName}: ${sameSide} rushers from the ${rusher.side} against ` +
      `${scheme.protectors.filter((p) => p.side === rusher.side).length} protectors set that way, ` +
      `with ${free.length} free on the other side and a ${rusher.alignment} rusher who cannot be ` +
      `passed across the formation. ${tail}`
    );
  }
  return (
    `${cardName}: ${rush.length} rushers against ${scheme.protectors.length} protectors ` +
    `and ${scheme.checkRelease.length} check-release men. ${tail}`
  );
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
      { role: "LT", takes: "EDGE", side: "LEFT" },
      { role: "RT", takes: "EDGE", side: "RIGHT" },
      { role: "LG", takes: "INTERIOR", side: "LEFT" },
      { role: "RG", takes: "INTERIOR", side: "RIGHT" },
      { role: "C", takes: "INTERIOR", side: "MIDDLE" },
    ],
    checkRelease,
  };
}

/**
 * Six men: the line plus one, usually the back. One fewer eligible, one more blocker.
 *
 * THE SIXTH MAN'S SIDE IS STATED, not inferred from where he lines up. A protection
 * call says which edge the back has — "slide right, back has the backside" — and it
 * is the same information a defensive card gives about its rushers. Leaving it to the
 * resolver would put the invention back exactly where ADR-018 took it out.
 */
export function sixManProtection(
  sixth: OffenseSkillRole,
  side: ProtectorSide,
  checkRelease: readonly OffenseSkillRole[] = [],
): ProtectionScheme {
  return {
    name: "6-man",
    protectors: [...fiveManLine([]).protectors, { role: sixth, takes: "EDGE", side }],
    checkRelease,
  };
}

/** Max protect. Seven in, two or three out — the shot-play protection. */
export function sevenManProtection(
  sixth: OffenseSkillRole,
  sixthSide: ProtectorSide,
  seventh: OffenseSkillRole,
  seventhSide: ProtectorSide,
): ProtectionScheme {
  return {
    name: "7-man",
    protectors: [
      ...fiveManLine([]).protectors,
      { role: sixth, takes: "EDGE", side: sixthSide },
      { role: seventh, takes: "EDGE", side: seventhSide },
    ],
    checkRelease: [],
  };
}
