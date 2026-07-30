/**
 * Engine-local input/output shapes for a simulated play.
 *
 * These are NOT redefinitions of shared contract types — every player, id,
 * event, calendar stamp, attribute and PLAY CALL here comes from @ff/contracts.
 * What lives in this file is the engine's own STATE vocabulary: the state a play
 * simulation runs against, the payloads it puts on PLAY_START, and the result it
 * hands back.
 */
import type {
  AnyPlayCalls,
  BlitzDisguise,
  BlockType,
  CalendarStamp,
  ChemistryTable,
  CoverageAssignment,
  CoverageTechnique,
  DefensivePlayCall,
  FieldZone,
  GameId,
  HorizontalZone,
  HotRouteSpec,
  ManAssignment,
  MatchEventEnvelope,
  OffensiveCall,
  OffensivePlayCall,
  PlayCalls,
  PlayerId,
  PlayerState,
  PocketStatus,
  ProtectionAssignment,
  ProtectionCall,
  ReadSystem,
  RouteAssignment,
  RouteDepthClass,
  RunBlockAssignment,
  RunGap,
  RunPlayCall,
  RunPlayCalls,
  RunScheme,
  RunSide,
  RushAlignment,
  RushAssignment,
  RushMove,
  SpaceBlockAssignment,
  StuntCall,
  StuntComplexity,
  TeamId,
  ThrowType,
  VerticalZone,
  ZoneAssignment,
} from "@ff/contracts";

/**
 * ADR-013 — `PocketStatus`, `ThrowType` and `RushAlignment` are NOT declared
 * here any more. They are members of match-event payloads, contracts names them,
 * and a local copy silently becomes a subset the moment contracts widens one.
 * They are re-exported so that every existing `from "../types.js"` import keeps
 * working and the ADR-012 barrel surface is unchanged — the DEFINITION moved,
 * the spelling did not.
 */
export type { PocketStatus, RushAlignment, ThrowType };

/**
 * A total map from `PocketStatus` to `T` — every rung, no optionals, no index
 * signature. Engine-owned (ADR-053 §6 ruling 2, `match-engine`'s half of the
 * petition contracts' `ByTier<T>` raised): `PocketStatus` is a contracts type,
 * but the tables this constrains — `pocket.severity`, `pocket.accuracyModifier`,
 * `pocket.readCapacityDelta` in `tunables.ts` — are engine machinery, the same
 * place `ContestPosition` above lives for the analogous reason.
 *
 * WHY THIS ONE HAS A LIVE SUBJECT WHEN `ByTier<T>` DOES NOT. `ResultTier`
 * appears repo-wide only as a payload field type; nothing is keyed by it.
 * `PocketStatus` is different — three tables in `tunables.ts` ARE keyed by it
 * today, and ADR-033/ADR-034 record the exact failure this guards against
 * already having happened there: a status-keyed lookup with `?? 0`, where `0`
 * is the BEST rung, so an unranked status silently read as the cleanest
 * possible pocket. The fix at the time was to narrow `PocketStatus` itself and
 * to make the engine-side reader (`pocketSeverityOfEmitted`) throw rather than
 * default. This type moves the SAME guarantee two steps earlier — from "throws
 * at the package boundary when the value arrives from outside the type system"
 * and "asserted at runtime by a test that reads `Object.keys`" to "the object
 * literal in `tunables.ts` fails to compile" — without replacing either of the
 * existing guards, which cover callers this type cannot (a status arriving
 * from JSON, from an older `@ff/contracts`, or from any other side of a
 * package boundary the compiler cannot see across).
 *
 * A MAPPED TYPE OVER THE UNION, never a hand-written record of status names —
 * so it is derived from `PocketStatus` rather than restating it, and a future
 * contracts petition that widens or narrows the union moves every `satisfies`
 * site that uses this to a compile error instead of a silent gap.
 *
 * ⚠ NOT EVERY PocketStatus-ADJACENT TABLE IS KEYED BY IT. `pocket
 * .minimumStatusByBand` is keyed by `PassRushBandLabel` (§7.1's band, not the
 * pocket's own status) and its VALUES — not its keys — are `PocketStatus`.
 * That table does not fit this shape and is constrained separately, by value,
 * where it is declared.
 */
export type ByPocketStatus<T> = { readonly [K in PocketStatus]: T };

/**
 * ADR-017 — THE PLAY-CALL VOCABULARY IS NOT DECLARED HERE ANY MORE EITHER, AND
 * THE ENGINE'S STATE VOCABULARY BELOW STILL IS.
 *
 * Three parties must now agree on what a play card IS: `playbook` authors them,
 * this package resolves them, `calibration` constructs them for batches. Under
 * Charter §4's Amendment 6 corollary a type two or more domains both need is by
 * definition shared vocabulary, and a play call passes `contracts.md` §10's test
 * cleanly — it is inert data with no target number, no modifier and no formula.
 * Two declarations of the same shape are structurally identical right up until
 * one side widens, and then the drift is invisible because each side's tests
 * still pass; so there is now exactly one, in `@ff/contracts/playcalls`.
 *
 * This NARROWS ADR-013's refusal rather than reversing it. What ADR-013 actually
 * refused to move — `MatchGameState`, `SimulationResult`, the PLAY_START payload
 * shapes, `ContestPosition`, the tunables — is engine machinery and is still
 * declared below.
 *
 * Re-exported for the same reason as the ADR-013 block above: every existing
 * `from "../types.js"` import keeps working and the ADR-012 barrel surface is
 * unchanged. The DEFINITION moved; the spelling did not.
 */
export type {
  AnyPlayCalls,
  BlitzDisguise,
  BlockType,
  CoverageAssignment,
  CoverageTechnique,
  DefensivePlayCall,
  FieldZone,
  HorizontalZone,
  HotRouteSpec,
  ManAssignment,
  OffensiveCall,
  OffensivePlayCall,
  PlayCalls,
  ProtectionAssignment,
  ProtectionCall,
  ReadSystem,
  RouteAssignment,
  RouteDepthClass,
  RunBlockAssignment,
  RunGap,
  RunPlayCall,
  RunPlayCalls,
  RunScheme,
  RunSide,
  RushAssignment,
  RushMove,
  SpaceBlockAssignment,
  StuntCall,
  StuntComplexity,
  VerticalZone,
  ZoneAssignment,
};

/**
 * `isRunCall` is a VALUE — a type guard, not a type — so it needs a value
 * re-export rather than an `export type`. It stays off the ADR-012 barrel, which
 * `test/tunablePatch.test.ts` asserts; this line only preserves the module path
 * its call sites already use.
 */
export { isRunCall } from "@ff/contracts";

/**
 * §12.3 — where a defender is relative to the receiver at the catch point. This
 * is a CHECK INPUT the engine derives during a play, not something a card states,
 * so ADR-013's refusal still covers it and it stays here.
 */
export type ContestPosition = "TRAILING" | "EVEN" | "IN_FRONT";

/**
 * §5.3 — a route that broke off hot, and what it was before. A RESOLUTION
 * PRODUCT, not vocabulary: the card states a `HotRouteSpec`, and whether it was
 * used is decided by a die (ADR-018's "same shape, different fact" test).
 */
export interface HotConversion {
  readonly receiver: PlayerId;
  /** The route the card drew. */
  readonly from: string;
  /** The route he actually ran. */
  readonly to: string;
  readonly airYards: number;
}

/**
 * ADR-018 — RESOLUTION PRODUCTS, DECLARED HERE BECAUSE THEY ARE NOT VOCABULARY.
 *
 * `CoverageShell` and `ResolvedRushAssignment` spent one dispatch in
 * `@ff/contracts/playcalls` and came back. The test that settled it is worth
 * keeping, because it is not "who uses it" — the playbook agent used all three
 * and still argued none was shared — it is **same shape, different fact**:
 *
 *   `ResolvedRushAssignment` means *the alignment the engine SIMULATED with*,
 *   after `rushAlignmentFor` defaulted an omitted one from a tunable. What a
 *   card corpus needed was *the alignment the card DECLARED*. The two structures
 *   are identical and the two claims are not, so one name for both would have
 *   coupled a play card to an engine tunable permanently and invisibly: change
 *   `tunables.arrival.defaultAlignment` and a corpus's meaning moves.
 *
 * The same test disposes of the other two. A `CoverageShell` is COMPUTED by
 * walking assignments — no card has a coverage field, and `MIXED` is precisely
 * the answer no card can state. `GapId` (now in `resolve/runGame.ts`, next to
 * every operation on it) appears on no card at all: cards carry `designedGap`
 * and `designedSide` as two fields, and the pair is an engine handle.
 *
 * `contracts.md` §10's rule for that file is "what a play card IS". The ATOMS —
 * `RunGap`, `RunSide`, `RushAlignment`, `FieldZone` — are shared vocabulary and
 * are still imported from contracts above. Their resolution products are
 * machinery and live with the machine.
 */

/**
 * What the defence PLAYED, derived from the assignments rather than declared.
 * Emitted on PLAY_START so a consumer can split man from zone without walking
 * every assignment — and so `MIXED` is sayable at all.
 */
export type CoverageShell = "MAN" | "ZONE" | "MIXED" | "NONE";

/**
 * A rush assignment after the engine has resolved the optional alignment. This
 * is what goes into PLAY_START, so the stream carries the alignment the play was
 * actually simulated with rather than the one the caller happened to type.
 *
 * `side` (ADR-018 petition 2) is inherited from `RushAssignment` and stays
 * OPTIONAL, which is the honest shape: unlike `alignment` there is no tunable
 * default to resolve it from, and inventing one would be exactly the fabricated
 * geometry the petition exists to remove. Omitted here means the card did not
 * say, which is what it means on the card.
 */
export interface ResolvedRushAssignment extends RushAssignment {
  readonly alignment: RushAlignment;
}

/**
 * The engine's view of game state. Franchise owns the real one; this is the
 * subset a play needs. `at` rides along because EventEnvelope requires it.
 */
export interface MatchGameState {
  readonly gameId: GameId;
  readonly at: CalendarStamp;
  /** 1-based play counter; part of the PRNG fork label. */
  readonly playNumber: number;
  /** Sequence number the next emitted event will carry. */
  readonly nextEventSeq: number;
  /** PlayerId-keyed. Engine reads attributes from these through the registry. */
  readonly players: Readonly<Record<string, PlayerState>>;
  readonly offenseTeam: TeamId;
  readonly defenseTeam: TeamId;
  readonly quarterback: PlayerId;
  readonly down: number;
  readonly distance: number;
  /** Yards from the offense's own goal line (0-100). */
  readonly ballOn: number;
  readonly clockSeconds: number;
  /**
   * ADR-008 — resolved QB↔receiver rapport, keyed passer → receiver, 0-100 with
   * 50 neutral. Franchise-owned pair state, delivered as a snapshot; the engine
   * reads it and never writes it. Absent table, absent passer, or absent pair
   * all read 50, which is the neutral modifier and today's behaviour exactly.
   */
  readonly chemistry?: ChemistryTable;
}

/**
 * PLAY_START payload. `MatchEvent["PLAY_START"].payload` is typed `unknown` in
 * contracts — a deliberately open slot. This is the engine's shape for it, and
 * a candidate for a future petition to type it in contracts.
 */
export interface PassPlayStartPayload {
  readonly kind: "PASS_PLAY_V1";
  readonly offense: {
    readonly team: TeamId;
    readonly call: string;
    readonly formation: string;
    readonly quarterback: PlayerId;
    readonly readSystem: ReadSystem;
    readonly routes: readonly RouteAssignment[];
    /**
     * The progression the quarterback actually worked, filtered to receivers who
     * have a route. §8.1's reading systems are only auditable from the stream if
     * the ORDER is in it — a consumer counting "did he get to his third read?"
     * cannot reconstruct it from `routes`, which is a set, not a sequence.
     */
    readonly readOrder: readonly PlayerId[];
    readonly protection: readonly ProtectionAssignment[];
    /**
     * §7.4 step 1 — men with nobody to block at the snap: the back who stayed to
     * scan, the uncommitted lineman on a slide, and (ADR-026) a protector whose
     * named rusher is not in `rush`. Without this the stream cannot say whether
     * a blitz went unblocked because the offence had nobody left or because the
     * body it had lost the contest.
     *
     * IN PICKUP PRIORITY, which is the order the engine actually offered them
     * in: the card's own list first, then `unblockedProtectors` at the back.
     * This is the pool as OFFERED — a man in it may have been used, beaten, or
     * never needed at all, and only the `blitz_pickup` CHECKs say which.
     */
    readonly availableBlockers: readonly PlayerId[];
    /**
     * ADR-026 — the tail of `availableBlockers`: men the card paired with a
     * rusher who is not in `rush`, so their protection entry named nobody who
     * came. They are also in `protection`, which is why they are named here
     * rather than left for a consumer to intersect two lists: a reader counting
     * bodies must not add `protection` and `availableBlockers` together, and a
     * reader asking "was he kept in to scan, or did his man simply not come?"
     * can now answer it from the stream instead of inferring it.
     */
    readonly unblockedProtectors: readonly PlayerId[];
    /**
     * §5.3 — routes that broke off hot, and what they were before.
     *
     * THIS IS WHERE A CONVERSION IS STATED, and ADR-022 ratified that it stays
     * here: `RoutePhase` gets no `HOT` member, because a phase is a position on
     * a route's timeline (`JAMMED`, `DEVELOPING`, `OPEN`…) and "hot" is a fact
     * about WHICH ROUTE HE IS RUNNING. A consumer that needs the change per-tick
     * wants a `ROUTE_CONVERTED` event, not an overloaded phase (ADR-010).
     */
    readonly hotConversions: readonly HotConversion[];
  };
  readonly defense: {
    readonly team: TeamId;
    readonly call: string;
    readonly front: string;
    /** Derived from `assignments`, not echoed from the call: `MIXED` is sayable. */
    readonly coverage: CoverageShell;
    readonly assignments: readonly CoverageAssignment[];
    /** Alignment resolved: §7.2's time-of-arrival model depends on it. */
    readonly rush: readonly ResolvedRushAssignment[];
    /**
     * §7.4 step 1 — rushers no `ProtectionAssignment` named. A fact about the
     * CALL, not about the resolution: whether each was picked up, ran through a
     * back, or came clean is in the `blitz_pickup` CHECKs and the RUSH_THREATs.
     */
    readonly unaccountedRushers: readonly PlayerId[];
    /** §5.3's disguise row this pressure was rolled against. */
    readonly blitzDisguise: BlitzDisguise;
    /** §7.3's twists, as the card stated them. */
    readonly stunts: readonly StuntCall[];
  };
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly clockSeconds: number;
  };
}

/**
 * PLAY_START payload for a designed run. Same open slot as `PassPlayStartPayload`
 * and the same reason it is worth filling: `RUN_RESOLUTION` states the gap the
 * ball ACTUALLY went through, and "did the back find the cutback?" is only
 * answerable if the gap it was DRAWN to is also in the stream.
 */
export interface RunPlayStartPayload {
  readonly kind: "RUN_PLAY_V1";
  readonly offense: {
    readonly team: TeamId;
    readonly call: string;
    readonly formation: string;
    readonly scheme: RunScheme;
    readonly carrier: PlayerId;
    readonly designedGap: string;
    readonly blocking: readonly RunBlockAssignment[];
    readonly perimeter: readonly SpaceBlockAssignment[];
  };
  readonly defense: {
    readonly team: TeamId;
    readonly call: string;
    readonly front: string;
    readonly coverage: CoverageShell;
    readonly assignments: readonly CoverageAssignment[];
    readonly rush: readonly ResolvedRushAssignment[];
  };
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly clockSeconds: number;
  };
}

export interface SimulationResult {
  readonly events: readonly MatchEventEnvelope[];
  readonly newState: MatchGameState;
}
