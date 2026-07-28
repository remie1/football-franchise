/**
 * ALIGNMENT — where a skill role stands before the snap, and what follows from it.
 *
 * WHY THIS FILE IS THE POINT OF THE PACKAGE.
 * `CALIBRATION-BACKLOG.md` entry 8: "nothing on a play card says which side of the
 * field a route runs to, so every silent route shares a lane". The engine cannot
 * fix that — ADR-006 forbids it reading a formation string, and rightly. The fix
 * has to be a card that STATES horizontal placement, and a card can only state it
 * coherently if it knows where the man started. That is this file.
 *
 * Two things are derived here and nowhere else:
 *
 *  1. **Eligibility.** Only the end man on each side of the line is an eligible
 *     receiver; a lineman-covered receiver is not. This is the football rule
 *     ADR-006 assigns to the playbook in so many words ("Trips Right implies 11
 *     personnel is football"), and it is checked at authoring time.
 *  2. **Receiver numbering.** #1 is outermost, #2 next in, and so on, per side.
 *     Defensive cards name their man assignments this way, because a defence that
 *     has not seen the offence's personnel cannot name `TE_U` — but it can always
 *     say "you have #2 to the field". That is what closes the loop between an
 *     offence-agnostic defensive card and a specific offensive formation.
 *
 * WHAT IS NOT MODELLED, stated so nobody infers it: no yard-level splits, no
 * motion, no shifts, no tackle-eligible, no unbalanced line. A player occupies one
 * lane, and the engine's §3 grid has five of them.
 */
import type { HorizontalZone, RunSide } from "@ff/contracts";
import type { OffenseSkillRole } from "./roles.js";

/** §3.1's lanes, left sideline to right sideline. Index order is load-bearing. */
export const LANES: readonly HorizontalZone[] = ["LW", "LH", "C", "RH", "RW"];

export function laneIndex(lane: HorizontalZone): number {
  const index = LANES.indexOf(lane);
  /* istanbul ignore next — unreachable while HorizontalZone is a closed union. */
  if (index < 0) throw new Error(`@ff/playbook: unknown lane ${String(lane)}`);
  return index;
}

/** The centre lane belongs to neither side; only a backfield role may occupy it. */
export function laneSide(lane: HorizontalZone): RunSide | "MIDDLE" {
  if (lane === "LW" || lane === "LH") return "LEFT";
  if (lane === "RW" || lane === "RH") return "RIGHT";
  return "MIDDLE";
}

/** How far outside `lane` is, 0 at the centre and 2 at either sideline. */
export function laneWidth(lane: HorizontalZone): number {
  return Math.abs(laneIndex(lane) - laneIndex("C"));
}

/**
 * Where a skill role stands.
 *
 * A DISCRIMINATED UNION RATHER THAN FLAGS, deliberately. `{ onLine: boolean;
 * backfield: boolean }` admits `{ onLine: true, backfield: true }`, which is not a
 * thing, and the type would then need a validator rule to say so. Here it needs
 * none: a `BACKFIELD` alignment cannot carry an `outsideRank` because backs are not
 * numbered, and that is a compile error rather than a convention (Charter §4.1).
 *
 * `outsideRank` counts eligible-receiver order on that side, outside in, across
 * both LINE and OFF_LINE players: 0 is the widest man, 1 the next in. It is not a
 * split in yards; it is an ORDER, which is all the §3 grid can consume.
 */
export type Alignment =
  | {
      /** On the line of scrimmage. Only the innermost-ranked such man is covered. */
      readonly spot: "LINE";
      readonly lane: HorizontalZone;
      readonly outsideRank: number;
    }
  | {
      /** Off the ball but outside the tackle box — slot, wing, flexed end. */
      readonly spot: "OFF_LINE";
      readonly lane: HorizontalZone;
      readonly outsideRank: number;
    }
  | {
      /** Behind the quarterback or offset next to him. Always eligible, never numbered. */
      readonly spot: "BACKFIELD";
      readonly lane: HorizontalZone;
    };

/** Where the quarterback is. Affects nothing mechanical yet; stated so cards can. */
export type QuarterbackSpot = "UNDER_CENTER" | "SHOTGUN" | "PISTOL";

/** One formation's five skill alignments, keyed by role. */
export type AlignmentMap<R extends OffenseSkillRole> = { readonly [K in R]: Alignment };

export function isOnLine(alignment: Alignment): boolean {
  return alignment.spot === "LINE";
}

/** Everyone not on the line is a back for the seven-on-the-line rule, quarterback included. */
export function isBack(alignment: Alignment): boolean {
  return alignment.spot !== "LINE";
}

export function alignmentSide(alignment: Alignment): RunSide | "MIDDLE" {
  return laneSide(alignment.lane);
}

export interface AlignedRole {
  readonly role: OffenseSkillRole;
  readonly alignment: Alignment;
}

/**
 * THE END-MAN-ON-THE-LINE RULE.
 *
 * Off-the-ball and backfield players are always eligible. A player ON the line is
 * eligible only if no other on-line skill player is outside him on his side — the
 * man inside is "covered up" and may not go downfield. Real offences bookkeep this
 * constantly (it is why the flanker plays off the ball when the tight end is
 * attached), and a corpus that ignores it authors plays that would draw a flag.
 */
export function eligibleRoles(aligned: readonly AlignedRole[]): readonly OffenseSkillRole[] {
  const outermostOnLine = new Map<RunSide | "MIDDLE", AlignedRole>();
  for (const entry of aligned) {
    if (entry.alignment.spot !== "LINE") continue;
    const side = alignmentSide(entry.alignment);
    const current = outermostOnLine.get(side);
    if (current === undefined || rankOf(entry.alignment) < rankOf(current.alignment)) {
      outermostOnLine.set(side, entry);
    }
  }
  return aligned
    .filter((entry) => {
      if (entry.alignment.spot !== "LINE") return true;
      return outermostOnLine.get(alignmentSide(entry.alignment))?.role === entry.role;
    })
    .map((entry) => entry.role);
}

function rankOf(alignment: Alignment): number {
  return alignment.spot === "BACKFIELD" ? Number.POSITIVE_INFINITY : alignment.outsideRank;
}

/**
 * Receiver numbering, per side, outside in — the vocabulary defensive cards use.
 *
 * Backfield players are excluded because they are not numbered: a defence says
 * "you have the back", never "you have #4". Ineligible (covered) linemen-adjacent
 * receivers are excluded too, because a defence does not assign a man to somebody
 * who cannot legally catch the ball.
 */
export function receiverNumbering(
  aligned: readonly AlignedRole[],
): Readonly<Record<RunSide, readonly OffenseSkillRole[]>> {
  const eligible = new Set<OffenseSkillRole>(eligibleRoles(aligned));
  const bySide = (side: RunSide): readonly OffenseSkillRole[] =>
    aligned
      .filter(
        (entry) =>
          entry.alignment.spot !== "BACKFIELD" &&
          alignmentSide(entry.alignment) === side &&
          eligible.has(entry.role),
      )
      .slice()
      .sort((a, b) => rankOf(a.alignment) - rankOf(b.alignment))
      .map((entry) => entry.role);
  return { LEFT: bySide("LEFT"), RIGHT: bySide("RIGHT") };
}

/** Backfield roles in alignment order, left to right. The `BACK` man target resolves here. */
export function backfieldRoles(aligned: readonly AlignedRole[]): readonly OffenseSkillRole[] {
  return aligned
    .filter((entry) => entry.alignment.spot === "BACKFIELD")
    .slice()
    .sort((a, b) => laneIndex(a.alignment.lane) - laneIndex(b.alignment.lane))
    .map((entry) => entry.role);
}

// --- mirroring --------------------------------------------------------------

const MIRRORED_LANE: Readonly<Record<HorizontalZone, HorizontalZone>> = {
  LW: "RW",
  LH: "RH",
  C: "C",
  RH: "LH",
  RW: "LW",
};

export function mirrorLane(lane: HorizontalZone): HorizontalZone {
  return MIRRORED_LANE[lane];
}

export function mirrorSide(side: RunSide): RunSide {
  return side === "LEFT" ? "RIGHT" : "LEFT";
}

/**
 * The same formation to the other side. Roles keep their names — X does not become
 * Z — because a mirrored card is the same PLAY, and renaming would make two cards
 * out of one for the tendency model to double-count.
 */
export function mirrorAlignment(alignment: Alignment): Alignment {
  if (alignment.spot === "BACKFIELD") {
    return { spot: "BACKFIELD", lane: mirrorLane(alignment.lane) };
  }
  return {
    spot: alignment.spot,
    lane: mirrorLane(alignment.lane),
    outsideRank: alignment.outsideRank,
  };
}
