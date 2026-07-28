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
 * rusher with the tackle from the far side.
 *
 * ============================ ADR-022, AND WHAT CHANGED ============================
 *
 * **THE SCHEME IS NOW STATED, AND IT IS A DISCRIMINATED UNION.** A list of pairings
 * is a MAN protection by construction; there was no way to say "we slide left".
 * `ProtectionCall` in contracts is the field, and `SchemeCall` below is the card's
 * form of it — `kind: "SLIDE"` carries `slideSide` structurally, so a side-less slide
 * does not compile (Charter §4.1, and the shape the owner ratified over the engine's
 * own weaker draft).
 *
 * The scheme is not decoration: **the cross-formation pickup is now gated on it.**
 * Rule 5 below — an interior rusher answered by an interior protector from the other
 * side — is what a line SLIDING does, and a big-on-big man protection does not do it.
 * Before ADR-022 every protection got the slide rule because no card could say it was
 * not sliding.
 *
 * **A FREE RUSHER IS NO LONGER AN ERROR.** This file used to throw
 * `UnprotectableCallError` the moment a rusher could not be paired, and the stated
 * reason was that "§7.4 blitz pickup is unimplemented in the engine, so a free rusher
 * cannot be simulated". §7.4 is implemented; the reason has expired; and the throw was
 * the playbook half of `CALIBRATION-BACKLOG.md` entry 21 — protection that is
 * perfectly informed because any front it cannot answer is refused rather than played.
 * An unpaired rusher now comes free, is reported in `unblocked`, and the engine
 * resolves him against `available` and the card's hot routes. See ADR-023.
 *
 * **`available` IS THE LEFTOVERS, AND IT IS NOT A GUESS.** It is the protectors who
 * finished the pairing walk with nobody to block, in pickup priority. Two refusals
 * shape it:
 *
 *  - **A check-release man who released is NOT available.** ADR-022 petition 1 is
 *    explicit that a man running a route must not materialise as a blocker the instant
 *    a blitz shows. Keeping a man in costs a route, and it costs it before the snap:
 *    that is what `checkRelease` does, and `pulledIn` is the receipt.
 *  - **The two tackles are NOT available.** A tackle with nobody on his edge is not
 *    free, he is holding an edge against a rusher who has not declared; a tackle who
 *    leaves it is the reason the edge rusher was free. Everybody else who ended up
 *    unengaged is available, backs and tight ends first, because scanning for exactly
 *    this is their job.
 */
import type {
  PlayerId,
  ProtectionAssignment,
  ProtectionCall,
  RunSide,
  RushAlignment,
  RushAssignment,
} from "@ff/contracts";
import { UnprotectableCallError } from "./errors.js";
import type { AnyOffensiveUnit, OffenseLineRole, OffenseRole, OffenseSkillRole } from "./roles.js";
import { OFFENSE_LINE_ROLES } from "./roles.js";

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
 * MAN or SLIDE, as a discriminated union so `slideSide` is structurally required
 * (ADR-022 §Decision — the shape ratified over the engine's optional-plus-a-check).
 *
 * The names mean what a coach means. **MAN** is big-on-big: every rusher is answered
 * by a designated man, which is exactly what a list of pairings already is, and it is
 * what the six- and seven-man protections in this corpus play. **SLIDE** is a gap
 * rule rather than a man rule, and it is what five men play when six can come.
 */
export type SchemeCall =
  | { readonly kind: "MAN" }
  | { readonly kind: "SLIDE"; readonly slideSide: RunSide };

/**
 * NOT generic in the personnel grouping, deliberately. Tying it to `P` fought
 * inference at every construction site and bought little: `validate.ts` already
 * rejects a scheme that leaves a lineman out or check-releases a man with no route,
 * and instantiation throws loudly if a named role is not bound to a player.
 */
export interface ProtectionScheme {
  readonly name: string;
  readonly call: SchemeCall;
  /**
   * The man §5.3 and §7.3 roll "Centre Awareness" on, and §7.3 rolls "Adjacent OL
   * Awareness" around.
   *
   * REQUIRED, and typed to a line role so a scheme cannot nominate a back. Contracts
   * makes it optional because the ENGINE cannot work it out — `ProtectionAssignment`
   * names players, not positions, and ADR-006 forbids reading it out of `formation` —
   * and states plainly that absent a centre the term is simply not rolled, with no
   * stand-in substituted. Playbook is the layer that knows: it binds a typed role
   * called `C` to a player. So it says, on every card, and the engine gets to make
   * the roll the doc asks for instead of dropping a term.
   */
  readonly center: OffenseLineRole;
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
  /** The contracts call: scheme, centre and pickup order, ready to go on the play. */
  readonly scheme: ProtectionCall;
  /** Protectors nobody claimed, in pickup priority. Mirrors `scheme.available`. */
  readonly available: readonly PlayerId[];
  /** Rushers no protector could answer. §7.4 resolves them; nothing here refuses. */
  readonly unblocked: readonly PlayerId[];
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
 *  5. **The slide, and INTERIOR ONLY, and ONLY IF THE CARD SAID IT IS SLIDING.** An
 *     interior rusher can be picked up across the football because the line slides a
 *     gap. An edge rusher cannot, and that omission is the whole point: it makes the
 *     left-tackle-on-the-right-end pairing unrepresentable rather than merely
 *     unlikely. Gating the rule on `kind === "SLIDE"` is what makes the scheme a
 *     mechanic rather than a label — a big-on-big protection that runs out of bodies
 *     on one side gives up a free runner, which is why offences slide at all.
 */
function claim(free: readonly Slot[], rusher: DeclaredRush, call: SchemeCall): Slot | undefined {
  const onHisSide = (s: Slot): boolean => s.side === rusher.side;
  const middle = (s: Slot): boolean => s.side === "MIDDLE";
  const onHisTechnique = (s: Slot): boolean => s.takes === rusher.alignment;
  const sliding = call.kind === "SLIDE" && rusher.alignment === "INTERIOR";
  return (
    free.find((s) => onHisSide(s) && onHisTechnique(s)) ??
    free.find(onHisSide) ??
    free.find((s) => middle(s) && onHisTechnique(s)) ??
    free.find(middle) ??
    (sliding ? free.find((s) => s.takes === "INTERIOR") : undefined)
  );
}

/**
 * Pickup priority for a protector nobody claimed, and the two refusals in the file
 * header expressed as a number.
 *
 * 0 — a back or tight end who stayed in. Scanning is the job; §7.4 step 3's contest
 *     is written about exactly this man.
 * 1 — the centre. The only lineman with a help-either-side rule.
 * 2 — a guard. He can fold to the next gap; he is not holding an edge.
 *
 * The tackles are absent, and `available` filters them out rather than ranking them
 * last: a list that ends with the left tackle is a list that says he may be used, and
 * the engine picking down it under a six-man pressure would produce exactly the
 * left-tackle-leaves-the-edge pairing ADR-018 made unrepresentable.
 */
const EDGE_ANCHORS: readonly string[] = ["LT", "RT"];

function pickupRank(role: string, center: string): number {
  if (role === center) return 1;
  return (OFFENSE_LINE_ROLES as readonly string[]).includes(role) ? 2 : 0;
}

/**
 * Deterministic, and deliberately so: the same card against the same front pairs
 * identically on every seed, so protection is never a hidden source of variance in
 * a calibration batch.
 *
 * Order of resolution: edge rushers first (they are the ones a tackle must have),
 * then interior. Each rusher claims a protector by the rules above; a rusher nobody
 * can legally block pulls in a check-release man — which is what a check release is
 * for — and if there is no reserve left he comes FREE and is reported. Nothing here
 * refuses a front any more (ADR-023).
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
  const unblocked: PlayerId[] = [];

  for (const rusher of ordered) {
    const free = slots.filter((s) => !used.has(s.role));
    let slot = claim(free, rusher, scheme.call);
    if (slot === undefined) {
      const next = reserve.shift();
      if (next === undefined) {
        // §7.4's free runner. He is the reason the card states a hot route, and the
        // reason `available` exists; both travel to the engine on the same call.
        unblocked.push(rusher.rusher);
        continue;
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

  const center = requirePlayer(unit, scheme.center, cardName);
  const available = slots
    .filter((s) => !used.has(s.role) && !EDGE_ANCHORS.includes(s.role))
    .map((s, index) => ({ slot: s, index }))
    .sort(
      (a, b) =>
        pickupRank(a.slot.role, scheme.center) - pickupRank(b.slot.role, scheme.center) ||
        a.index - b.index,
    )
    .map((entry) => entry.slot.player);

  // `available` is emitted even when empty, for the reason `zoneAssignment` emits a
  // zero span: "everybody is engaged" is a statement, and it is a different statement
  // from a call that never mentioned pickup at all.
  const call: ProtectionCall =
    scheme.call.kind === "SLIDE"
      ? { kind: "SLIDE", slideSide: scheme.call.slideSide, center, available }
      : { kind: "MAN", center, available };

  return { protection, pulledIn, scheme: call, available, unblocked };
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

/** The five up front, with the technique and side each is set for. */
const LINE: readonly ProtectorSpec[] = [
  { role: "LT", takes: "EDGE", side: "LEFT" },
  { role: "RT", takes: "EDGE", side: "RIGHT" },
  { role: "LG", takes: "INTERIOR", side: "LEFT" },
  { role: "RG", takes: "INTERIOR", side: "RIGHT" },
  { role: "C", takes: "INTERIOR", side: "MIDDLE" },
];

/**
 * Five-man SLIDE protection: the line, and nobody else, sliding one way.
 *
 * Five men and six possible rushers, so the answer cannot be a man rule. The line
 * slides, one man is left over on the away side, and the offence covers him with the
 * check-release back or with a hot route — which is why every concept using this
 * lists one or the other, and why `validate.ts` insists on it.
 *
 * **WHICH WAY IT SLIDES IS AUTHORED, NOT DERIVED**, for the reason ADR-018 made the
 * sixth protector's side authored: a resolver that works it out from where the routes
 * happen to go is inventing a call. The principle the corpus authors to is stated on
 * `passConcepts.ts` and checked as a warning in `validate.ts`: **the line slides AWAY
 * from the man who answers that side.** With a check-release back that is the back,
 * and his side is the one he releases to — you do not cross the formation to check a
 * linebacker. In empty there is no back, so it is the hot receiver.
 */
export function fiveManSlide(
  slideSide: RunSide,
  checkRelease: readonly OffenseSkillRole[],
): ProtectionScheme {
  return {
    name: `5-man slide ${slideSide.toLowerCase()}`,
    call: { kind: "SLIDE", slideSide },
    center: "C",
    protectors: LINE,
    checkRelease,
  };
}

/**
 * Six men, big on big: the line plus one, usually the back. One fewer eligible, one
 * more blocker, and a designated man for every rusher a six-man pressure can send —
 * which is what MAN means and what a bare pairing list already said.
 *
 * THE SIXTH MAN'S SIDE IS STATED, not inferred from where he lines up. A protection
 * call says which edge the back has, and it is the same information a defensive card
 * gives about its rushers. Leaving it to the resolver would put the invention back
 * exactly where ADR-018 took it out.
 */
export function sixManProtection(
  sixth: OffenseSkillRole,
  side: ProtectorSide,
  checkRelease: readonly OffenseSkillRole[] = [],
): ProtectionScheme {
  return {
    name: "6-man",
    call: { kind: "MAN" },
    center: "C",
    protectors: [...LINE, { role: sixth, takes: "EDGE", side }],
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
    call: { kind: "MAN" },
    center: "C",
    protectors: [
      ...LINE,
      { role: sixth, takes: "EDGE", side: sixthSide },
      { role: seventh, takes: "EDGE", side: seventhSide },
    ],
    checkRelease: [],
  };
}
