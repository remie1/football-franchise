/**
 * THE PRESSURE READ'S PICTURES, AND WHAT THEY DECIDE — ADR-073 §2.2 and §2.3.
 *
 * §5.3's roll (`resolveBlitzRecognition`) says how well the quarterback and the centre read the
 * front; this module says what that read makes of the front they were SHOWN, and what the line
 * wants to do about it. It throws no die and imports no `TUNABLES`: everything here is arithmetic
 * on the call's own three lists and on the band the roll produced.
 *
 *  - R, the played rush (`defense.rush`); S, the shown rush (`defense.shownRush`); N, the rushers
 *    some `ProtectionAssignment` names.
 *  - EXTRAS: R's men not in N, in rush order, where they play. Today's `unaccounted`.
 *  - GHOSTS: S's men not in R and not in N, in `shownRush` order, where shown: shown rushing,
 *    unnamed, not coming.
 *  - MOVED: extras whose shown side or alignment is not their played one, where shown. Every
 *    moved man is also an extra.
 *
 * The comparison reads the rusher, the side and the RESOLVED alignment (`rushAlignmentFor`, as the
 * played rush is resolved). A side stated on one list and omitted on the other is no difference;
 * `move` is never shown and the gap is never read here, so neither can make a man moved. On an
 * honest front (`shownRush` the same men at the same spots) there are no ghosts and nobody moved,
 * and every function below gives today's answer.
 *
 * WHAT IT DECIDES (§2.3): who is answered (the hot routes, rung 0, in `readPreSnap`), and the one
 * decision `PROTECTION_ADJUST` (rung 30): keeping in check-release men the card lists, and checking
 * a slide the card lets the line check. Whether a wanted adjustment is MADE is the leash's
 * business (`resolveLeash`); this module only says what is wanted. Options exist only where the
 * card states them (`ProtectionCall.checkRelease`, `slideCheck`), so a call that states neither
 * never wants an adjustment.
 */
import type { PlayerId, PlayerState } from "@ff/contracts";
import type { BlitzRecognitionPicture } from "../resolve/blitz.js";
import type { AssertEmptyUnion } from "../resolve/pocket.js";
import { rushAlignmentFor } from "../resolve/rushThreat.js";
import type { Tunables } from "../tunables.js";
import type {
  PlacedRusher,
  PlayCalls,
  PressurePicture,
  PressurePictureKind,
  ProtectionAdjustment,
  ProtectionAssignment,
  ProtectionCall,
  RouteAssignment,
  RunSide,
  RushAlignment,
} from "../types.js";

/** The band table's `picture` column names exactly the four pictures, both ways. */
export type _PictureColumnIsThePictures = AssertEmptyUnion<
  Exclude<BlitzRecognitionPicture, PressurePictureKind> | Exclude<PressurePictureKind, BlitzRecognitionPicture>
>;

/** The four pictures, in the order §2.2's table lists them. */
export const PRESSURE_PICTURES: readonly PressurePictureKind[] = ["TRUE", "COUNT", "CALL", "LOOK"];

/** Step 1 of §2.4: the front as the call states it, before any die. */
export interface FrontAccount {
  /** EXTRAS — played rushers no pairing names, in rush order, at their played spots. */
  readonly extras: readonly PlacedRusher[];
  /** GHOSTS — shown rushers who are neither played nor named, in `shownRush` order, where shown. */
  readonly ghosts: readonly PlacedRusher[];
  /** MOVED — extras shown at another side or alignment, in rush order, where shown. */
  readonly moved: readonly PlacedRusher[];
  /** Each extra where he is SHOWN, or where he plays if the shown rush leaves him out; rush order. */
  readonly extrasAsShown: readonly PlacedRusher[];
  /** ids(R). */
  readonly played: ReadonlySet<string>;
  /** ids(S). */
  readonly shown: ReadonlySet<string>;
  /** The card's own `available`, in its order. */
  readonly declaredAvailable: readonly PlayerId[];
  /** ADR-026's windfalls: protectors paired with a man not in R, in `protection` order. */
  readonly unblockedProtectors: readonly PlayerId[];
  /** The card's pairings, as stated. */
  readonly pairings: readonly ProtectionAssignment[];
}

/** A picture's two sets (§2.2). */
export type PictureSets = Pick<PressurePicture, "answers" | "placed">;

/**
 * What the line wants done to the protection (§2.3), when it wants anything at all: the side he
 * wants the slide checked to (absent: not checked), and the check-release men he wants kept in,
 * in card order (empty: nobody). PLAY_START's `protectionAdjustment` is this and `made`.
 */
export type ProtectionWant = Omit<ProtectionAdjustment, "made">;

/** A man at a spot, with an absent key where no side was stated (`exactOptionalPropertyTypes`). */
function placed(rusher: PlayerId, side: RunSide | undefined, alignment: RushAlignment): PlacedRusher {
  return side === undefined ? { rusher, alignment } : { rusher, side, alignment };
}

/**
 * §2.4 step 1 — R, S and N, and the extras, ghosts and moved men they give. Pure, and the same
 * on every picture: it reads the call, never the band.
 */
export function accountFront(
  tunables: Tunables,
  calls: PlayCalls,
  player: (id: PlayerId) => PlayerState,
): FrontAccount {
  const { offense, defense } = calls;
  const named = new Set(offense.protection.map((p) => String(p.rusher)));
  const played = new Set(defense.rush.map((r) => String(r.rusher)));
  const shown = new Set(defense.shownRush.map((s) => String(s.rusher)));
  const shownBy = new Map(defense.shownRush.map((s) => [String(s.rusher), s] as const));
  const alignmentOf = (id: PlayerId, declared: RushAlignment | undefined): RushAlignment =>
    rushAlignmentFor(tunables, player(id).bio.position, declared);

  const extras: PlacedRusher[] = [];
  const extrasAsShown: PlacedRusher[] = [];
  const moved: PlacedRusher[] = [];
  for (const r of defense.rush) {
    if (named.has(String(r.rusher))) continue;
    const at = placed(r.rusher, r.side, alignmentOf(r.rusher, r.alignment));
    extras.push(at);
    const s = shownBy.get(String(r.rusher));
    if (s === undefined) {
      extrasAsShown.push(at);
      continue;
    }
    // Where shown: the shown side if the shown rush states one, else the played side (a side
    // stated on one list and omitted on the other is no difference), and the shown alignment,
    // resolved as the played one is.
    const asShown = placed(r.rusher, s.side ?? r.side, alignmentOf(s.rusher, s.alignment));
    extrasAsShown.push(asShown);
    const sideDiffers = s.side !== undefined && r.side !== undefined && s.side !== r.side;
    if (sideDiffers || asShown.alignment !== at.alignment) moved.push(asShown);
  }

  const ghosts: PlacedRusher[] = defense.shownRush
    .filter((s) => !played.has(String(s.rusher)) && !named.has(String(s.rusher)))
    .map((s) => placed(s.rusher, s.side, alignmentOf(s.rusher, s.alignment)));

  return {
    extras,
    ghosts,
    moved,
    extrasAsShown,
    played,
    shown,
    declaredAvailable: offense.protectionScheme?.available ?? [],
    unblockedProtectors: offense.protection.filter((p) => !played.has(String(p.rusher))).map((p) => p.blocker),
    pairings: offense.protection,
  };
}

/**
 * §2.2's table: each picture's ANSWER SET (who he treats as coming with no blocker named on him)
 * and SLIDE SET (the men he counts for the slide majority, where he perceives them). Extras come
 * first, in rush order, then ghosts, in `shownRush` order.
 *
 * - TRUE: the extras, where they play.
 * - COUNT: the extras and the ghosts, he cannot tell a bluff from a blitz; placed where shown.
 * - CALL: nobody. He has not pinned it down, and runs the protection as called.
 * - LOOK: the ghosts, only what the look sells; he misses every real extra, moved or not. The
 *   slide set is the ghosts and the moved men, where shown.
 *
 * A moved man never changes who is answered, only where the slide thinks the strength is.
 */
export function pictureSets(picture: PressurePictureKind, front: FrontAccount): PictureSets {
  const ids = (men: readonly PlacedRusher[]): PlayerId[] => men.map((m) => m.rusher);
  switch (picture) {
    case "TRUE":
      return { answers: ids(front.extras), placed: front.extras };
    case "COUNT":
      return {
        answers: [...ids(front.extras), ...ids(front.ghosts)],
        placed: [...front.extrasAsShown, ...front.ghosts],
      };
    case "CALL":
      return { answers: [], placed: [] };
    case "LOOK":
      return { answers: ids(front.ghosts), placed: [...front.moved, ...front.ghosts] };
  }
}

/**
 * §2.3 step 1 — THE PERCEIVED POOL: the card's declared men, plus the blockers whose named man
 * the picture believes is not rushing. He does not count on a lineman whose man he thinks is
 * coming.
 *
 * - TRUE: whose man is not in R — ADR-026's unblocked protectors.
 * - COUNT: whose man is in neither R nor S.
 * - LOOK: whose man is not in S.
 * - CALL: the real pool. CALL answers nobody, so nothing is ever decided from it.
 *
 * On an honest front every picture's pool is the real pool.
 */
export function perceivedPool(picture: PressurePictureKind, front: FrontAccount): readonly PlayerId[] {
  const free = (p: ProtectionAssignment): boolean => {
    const man = String(p.rusher);
    switch (picture) {
      case "TRUE":
      case "CALL":
        return !front.played.has(man);
      case "COUNT":
        return !front.played.has(man) && !front.shown.has(man);
      case "LOOK":
        return !front.shown.has(man);
    }
  };
  return [...front.declaredAvailable, ...front.pairings.filter(free).map((p) => p.blocker)];
}

/**
 * §2.3's `decideProtection(picture)`: what the line WANTS done to the protection, or `undefined`
 * when it wants nothing. Deterministic, no die. Keep-in is decided first, because whether a slide
 * check changes who is slid depends on how many bodies the pool will hold at the snap.
 *
 * 1. KEEP-IN. Walk the card's `checkRelease` men in card order, and keep each in while fewer than
 *    max(0, |answers| − |perceived pool|) are kept. A man is eligible only if he runs a route and
 *    his route did not convert hot (a card that made his route hot chose the throw as his answer,
 *    and hot is rung 0). A man whose keep-in would leave the call no route, or an empty
 *    progression, is skipped.
 * 2. SLIDE CHECK, on a SLIDE that states `slideCheck` only, and only while
 *    `blitzPickup.slideIsUncontested` holds (without it a slide answers nobody, so a check would
 *    change nothing). If a strict majority of the slide set's sided men sit on the other side, he
 *    wants the slide checked there — but only if that changes who is slid: some extra who still
 *    finds a body has a played side that is the checked side or the called one. The i-th extra
 *    in rush order finds a body iff i is less than the pool at the snap (declared, then the men
 *    kept in, then the windfalls), because every extra ahead of him takes exactly one, slid or in
 *    a contest (`resolvePickups`). A tie, or nobody sided, checks nothing.
 * 3. WANTED iff a slide check is wanted or somebody is kept in.
 *
 * In coaching words: slide to the side with more threats when that changes who is slid; keep a
 * back in only when a man short; never pay a route for nothing; seeing nothing, run it as called.
 */
export function decideProtection(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly scheme: ProtectionCall | undefined;
  readonly front: FrontAccount;
  readonly picture: PressurePictureKind;
  readonly sets: PictureSets;
  /** The routes he will run, after the hot conversions. */
  readonly routes: readonly RouteAssignment[];
  /** The progression, after the hot conversions. */
  readonly readOrder: readonly PlayerId[];
  /** Receivers whose route converted hot on this picture. */
  readonly hotConverted: ReadonlySet<string>;
}): ProtectionWant | undefined {
  const { tunables, scheme, front, picture, sets, routes, readOrder, hotConverted } = args;

  // ---- 1. keep-in -------------------------------------------------------------------------
  const need = Math.max(0, sets.answers.length - perceivedPool(picture, front).length);
  const runners = new Set(routes.map((r) => String(r.receiver)));
  const keptIn: PlayerId[] = [];
  for (const id of scheme?.checkRelease ?? []) {
    if (keptIn.length >= need) break;
    if (!runners.has(String(id)) || hotConverted.has(String(id))) continue;
    const out = new Set([...keptIn, id].map(String));
    const leavesARoute = routes.some((r) => !out.has(String(r.receiver)));
    const leavesARead = readOrder.some((r) => !out.has(String(r)));
    if (!leavesARoute || !leavesARead) continue;
    keptIn.push(id);
  }

  // ---- 2. the slide check -----------------------------------------------------------------
  let checkedTo: RunSide | undefined;
  if (scheme?.kind === "SLIDE" && scheme.slideCheck === true && tunables.blitzPickup.slideIsUncontested) {
    const sided = sets.placed.filter((m) => m.side !== undefined);
    const majority = (["LEFT", "RIGHT"] as const).find(
      (side) => sided.filter((m) => m.side === side).length * 2 > sided.length,
    );
    if (majority !== undefined && majority !== scheme.slideSide) {
      const bodiesAtSnap = front.declaredAvailable.length + keptIn.length + front.unblockedProtectors.length;
      const calledSide = scheme.slideSide;
      const changesWhoIsSlid = front.extras.some(
        (extra, i) => i < bodiesAtSnap && (extra.side === majority || extra.side === calledSide),
      );
      if (changesWhoIsSlid) checkedTo = majority;
    }
  }

  // ---- 3. wanted? -------------------------------------------------------------------------
  if (checkedTo === undefined && keptIn.length === 0) return undefined;
  return checkedTo === undefined ? { keptIn } : { slideSide: checkedTo, keptIn };
}

/**
 * Trigger (b)'s question (§2.2): would the four pictures all lead to the same decisions? The
 * decisions are the hot conversions (every hot route on the call converts or none does, so they
 * differ exactly when one picture answers somebody and another nobody, on a call with a hot
 * route), the wanted slide side and the wanted keep-in set.
 *
 * Asked before the die, so it is answered on the routes and progression AS CALLED. A conversion
 * changes a route's shape, never who runs one, so the keep-in walk sees the same men either way.
 * When they all agree they agree with CALL, which decides nothing, so a read that would turn
 * nothing is not rolled (ADR-005).
 */
export function picturesDecideAlike(args: {
  readonly tunables: Tunables;
  readonly calls: PlayCalls;
  readonly front: FrontAccount;
}): boolean {
  const { tunables, calls, front } = args;
  const { routes, readOrder, protectionScheme } = calls.offense;
  const hot = routes.filter((r) => r.hot !== undefined).map((r) => String(r.receiver));
  const decisions = PRESSURE_PICTURES.map((picture) => {
    const sets = pictureSets(picture, front);
    const converts = sets.answers.length > 0 && hot.length > 0;
    const want = decideProtection({
      tunables,
      scheme: protectionScheme,
      front,
      picture,
      sets,
      routes,
      readOrder,
      hotConverted: new Set(converts ? hot : []),
    });
    return JSON.stringify([converts, want?.slideSide ?? null, (want?.keptIn ?? []).map(String)]);
  });
  return decisions.every((d) => d === decisions[0]);
}

/**
 * §2.3's EFFECTIVE CALL: the call as the line will run it once PROTECTION_ADJUST is made. The
 * kept-in men leave `routes` and `readOrder`, join `protectionScheme.available` after the card's
 * declared men (they are its stated alternative), and leave `checkRelease`; the slide side is the
 * side at the snap. Everything else is the call. With nothing made it is the call itself, the
 * same object, so a play with no adjustment hands every consumer exactly what it handed before.
 *
 * The routes are the CALLED routes minus the kept-in men; the hot conversions are not applied
 * here, because the engine carries those as the routes run (`PreSnapRead.routes`), not as a call.
 * The result is a call the validator accepts: every reader downstream of the pickups (the
 * recovery spots above all, which put a man in `available` in the backfield) reads it as one.
 */
export function effectiveCall(calls: PlayCalls, adjusted: ProtectionWant | undefined): PlayCalls {
  if (adjusted === undefined) return calls;
  const scheme = calls.offense.protectionScheme;
  // Unreachable from `simulatePassPlay`: an adjustment is wanted only on a card that states an
  // option, and an option is stated only on a scheme. A wrong call site is a bug, so say so.
  if (scheme === undefined) throw new Error("effectiveCall: an adjustment on a call with no protection scheme");
  const out = new Set(adjusted.keptIn.map(String));
  const stays = (id: PlayerId): boolean => !out.has(String(id));
  const center = scheme.center === undefined ? {} : { center: scheme.center };
  const available = [...(scheme.available ?? []), ...adjusted.keptIn];
  const left = (scheme.checkRelease ?? []).filter(stays);
  const released = left.length === 0 ? {} : { checkRelease: left };
  const protectionScheme: ProtectionCall =
    scheme.kind === "SLIDE"
      ? {
          kind: "SLIDE",
          slideSide: adjusted.slideSide ?? scheme.slideSide,
          ...center,
          available,
          ...released,
          ...(scheme.slideCheck === true ? { slideCheck: true as const } : {}),
        }
      : { kind: "MAN", ...center, available, ...released };
  return {
    ...calls,
    offense: {
      ...calls.offense,
      routes: calls.offense.routes.filter((r) => stays(r.receiver)),
      readOrder: calls.offense.readOrder.filter(stays),
      protectionScheme,
    },
  };
}
