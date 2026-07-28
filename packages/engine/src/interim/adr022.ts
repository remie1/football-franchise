/**
 * ADR-022 INTERIM VOCABULARY — the whole of it, in one deletable file.
 *
 * ================== READ THIS BEFORE ADDING ANYTHING ==================
 * Everything in this module is a PETITION under review, implemented so that
 * §5.3, §7.3 and §7.4 are not blocked on ratification. It is deliberately
 * confined to one file so that ratification is a MOVE (these declarations go to
 * `@ff/contracts/playcalls`, the `Interim*` wrappers disappear, and the readers
 * below become plain field access) rather than an excavation.
 *
 * The engine names no interim field anywhere else: every consumer goes through
 * a reader here, and `test/blitzPickup.test.ts` asserts the file is the only
 * place the field names are spelled.
 *
 * WHY THE FIELDS ARE READ THROUGH A CAST AND NOT DECLARED ON THE CONTRACT TYPE.
 * `packages/engine` may not write in `packages/contracts` (Charter §4). A play
 * card is inert data, so an author CAN attach these fields today and the engine
 * CAN read them; what it cannot do is make the compiler require them. That is
 * exactly the weakness Charter §4.1 is about, it is the reason ADR-022 exists,
 * and it is why every reader below returns `undefined` rather than a default
 * where absence is meaningful.
 *
 * WHAT IS NOT FAKED HERE. No reader invents geometry, a scheme, or a body:
 *  - absent `protectionScheme` means MAN protection, which is precisely what a
 *    list of `ProtectionAssignment`s already IS. Nothing is assumed.
 *  - absent `blitzDisguise` means STANDARD, which is §5.3's own +0 row.
 *  - absent `center` means the centre's term is NOT ROLLED. No stand-in is
 *    substituted; the stream shows which terms actually applied.
 * =====================================================================
 */
import type {
  DefensivePlayCall,
  FieldZone,
  OffensivePlayCall,
  PlayerId,
  RouteAssignment,
  RouteDepthClass,
  RunSide,
} from "@ff/contracts";

// --- petitioned vocabulary --------------------------------------------------

/** §5.3's disguise table. The card states which kind of pressure it is. */
export type BlitzDisguise = "STANDARD" | "ZONE_BLITZ" | "DELAYED" | "ZERO";

/** §7.3's complexity table. */
export type StuntComplexity = "T_E" | "T_T" | "DELAYED" | "TRIPLE";

/**
 * §7.4 step 1 — the protection SCHEME, which `ProtectionAssignment[]` cannot
 * express. A list of pairings is a man protection by construction; there is no
 * way to say "we slide left", and no way to say who stayed in without a pairing
 * to state.
 */
export interface ProtectionSchemeCall {
  /** MAN is exactly today's behaviour: a rusher is covered iff he is named. */
  readonly kind: "MAN" | "SLIDE";
  /** SLIDE only. §7.4: "Covered if blitzer on slide side." */
  readonly slideSide?: RunSide;
  /**
   * §5.3's and §7.3's "Centre Awareness" term. Absent ⇒ the term is not rolled.
   * The engine has no way to work out who the centre is: `ProtectionAssignment`
   * names blockers, not positions on the line, and ADR-006 forbids reading it
   * out of the formation string.
   */
  readonly center?: PlayerId;
  /**
   * Men in protection who are NOT pre-paired to a rusher, in pickup priority:
   * the uncommitted lineman on a slide, the back who stayed in to scan, the
   * tight end who chipped. THIS is what §7.4 step 3 picks up with, and its
   * absence is why the engine had no answer but to refuse a free rusher.
   *
   * They may not run routes (`assertCoherentPlayCall` enforces it): keeping a
   * man in is a PRE-SNAP decision, and letting a route-runner materialise as a
   * blocker the instant a blitz shows would restore precisely the perfectly-
   * informed protection that biases pressure downward (backlog entry 21).
   */
  readonly available?: readonly PlayerId[];
}

/**
 * §5.3's "hot route available" — what this route becomes when the blitz is read.
 * Every field is what a `RouteAssignment` already states, because a converted
 * route is just a different route.
 */
export interface HotRouteSpec {
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  /** Where he breaks off TO — the area the blitzer vacated, as the card sees it. */
  readonly breakZone?: FieldZone;
}

/** §7.3 — a stunt, as a pairing of two rushers the card already names. */
export interface StuntCall {
  /** The man who goes first and occupies blockers. */
  readonly penetrator: PlayerId;
  /** The man who loops behind him — and who comes free when the line misses it. */
  readonly looper: PlayerId;
  readonly complexity: StuntComplexity;
}

// --- the interim call shapes an author builds against ------------------------

export interface InterimRouteAssignment extends RouteAssignment {
  readonly hot?: HotRouteSpec;
}

export interface InterimOffensivePlayCall extends OffensivePlayCall {
  readonly routes: readonly InterimRouteAssignment[];
  readonly protectionScheme?: ProtectionSchemeCall;
}

export interface InterimDefensivePlayCall extends DefensivePlayCall {
  readonly stunts?: readonly StuntCall[];
  readonly blitzDisguise?: BlitzDisguise;
}

// --- the readers. The ONLY place these field names are spelled. --------------

export function protectionSchemeOf(offense: OffensivePlayCall): ProtectionSchemeCall | undefined {
  return (offense as InterimOffensivePlayCall).protectionScheme;
}

/** Men kept in who are not pre-paired to a rusher. Empty is the honest default. */
export function availableBlockersOf(offense: OffensivePlayCall): readonly PlayerId[] {
  return protectionSchemeOf(offense)?.available ?? [];
}

export function centerOf(offense: OffensivePlayCall): PlayerId | undefined {
  return protectionSchemeOf(offense)?.center;
}

export function hotRouteOf(route: RouteAssignment): HotRouteSpec | undefined {
  return (route as InterimRouteAssignment).hot;
}

export function stuntsOf(defense: DefensivePlayCall): readonly StuntCall[] {
  return (defense as InterimDefensivePlayCall).stunts ?? [];
}

/** §5.3's own +0 row, which is why an absent value is not an invention. */
export function blitzDisguiseOf(defense: DefensivePlayCall): BlitzDisguise {
  return (defense as InterimDefensivePlayCall).blitzDisguise ?? "STANDARD";
}
