/**
 * A MINIMAL, FIXTURE-GRADE PLAY-CARD CORPUS.
 *
 * ================== THIS IS NOT THE PLAYBOOK ==================
 * ADR-006 puts play-card AUTHORING and VALIDITY in franchise (Spec #5), and
 * CALIBRATION-BACKLOG 3a records that the real corpus does not exist. Nothing
 * here claims to be it. These are eleven cards — four dropbacks, three runs,
 * three coverages — that exist so a game can be played at all, and so the loop's
 * macro numbers can be measured against NFL reality for the first time.
 *
 * What makes them fixture-grade rather than a corpus:
 *  - eleven cards, so play-call variety is a rounding error against reality;
 *  - no personnel groupings, no motion, no play action, no screens, no draws,
 *    no option, no empty, no heavy, no goal-line, no two-minute package;
 *  - no blitz, no stunt, no simulated pressure (the engine has no §7.3/§7.4);
 *  - the CENTRE never blocks anybody on a dropback. Protection is 1:1 and the
 *    front is four men, so four tackles and guards account for it and he stands
 *    there. That is a simplification of protection, not of the engine.
 *  - route break zones are stated on every route, which real cards would also
 *    do, but the horizontal spacing is chosen to exercise the §3 grid rather
 *    than to be sound football.
 *
 * The cards take BOTH personnel sets because ADR-006 forbids the engine deriving
 * assignments from a formation string: a `ProtectionAssignment` names the rusher
 * it is answering, so an offensive card cannot be built without knowing who is
 * rushing. That is the design working, not a leak.
 * ============================================================== */
import type { PlayerId } from "@ff/contracts";
import type {
  DefensivePlayCall,
  OffensivePlayCall,
  ProtectionAssignment,
  RunPlayCall,
} from "../types.js";
import type { DefensivePersonnel, OffensivePersonnel } from "./types.js";

function at<T>(items: readonly T[], index: number, what: string): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`@ff/engine: personnel is missing ${what} (index ${index})`);
  }
  return value;
}

/** The four men the front rushes with, in a stable order: LE, DT, DT, RE. */
export function frontFour(defense: DefensivePersonnel): readonly PlayerId[] {
  return [
    at(defense.edges, 0, "left edge"),
    at(defense.interior, 0, "left interior"),
    at(defense.interior, 1, "right interior"),
    at(defense.edges, 1, "right edge"),
  ];
}

/** 1:1 protection, tackles on the edges and guards inside. The centre is free. */
function baseProtection(
  offense: OffensivePersonnel,
  defense: DefensivePersonnel,
): readonly ProtectionAssignment[] {
  const front = frontFour(defense);
  return [
    { blocker: offense.leftTackle, rusher: at(front, 0, "LE") },
    { blocker: offense.leftGuard, rusher: at(front, 1, "DT") },
    { blocker: offense.rightGuard, rusher: at(front, 2, "DT") },
    { blocker: offense.rightTackle, rusher: at(front, 3, "RE") },
  ];
}

export interface PassCard {
  readonly name: string;
  build(offense: OffensivePersonnel, defense: DefensivePersonnel): OffensivePlayCall;
}

export interface RunCard {
  readonly name: string;
  build(offense: OffensivePersonnel, defense: DefensivePersonnel): RunPlayCall;
}

export interface CoverageCard {
  readonly name: string;
  build(offense: OffensivePersonnel, defense: DefensivePersonnel): DefensivePlayCall;
}

// --- dropbacks --------------------------------------------------------------

export const PASS_CARDS: readonly PassCard[] = [
  {
    name: "Y Cross",
    build(offense, defense) {
      const [x, z, slot] = [
        at(offense.receivers, 0, "X"),
        at(offense.receivers, 1, "Z"),
        at(offense.receivers, 2, "slot"),
      ];
      return {
        kind: "PASS",
        name: "Y Cross",
        formation: "Shotgun Trips Right",
        readSystem: "FULL_FIELD",
        routes: [
          { receiver: x, routeName: "Go", depthClass: "DEEP", airYards: 24, breakZone: { horizontal: "LW", vertical: "DEEP" } },
          { receiver: z, routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 14, breakZone: { horizontal: "C", vertical: "INTERMEDIATE" } },
          { receiver: offense.tightEnd, routeName: "Shallow Cross", depthClass: "QUICK", airYards: 5, breakZone: { horizontal: "RH", vertical: "SHORT" } },
          { receiver: slot, routeName: "Sit", depthClass: "SHORT", airYards: 8, breakZone: { horizontal: "RW", vertical: "SHORT" } },
        ],
        readOrder: [z, x, slot, offense.tightEnd],
        protection: baseProtection(offense, defense),
      };
    },
  },
  {
    name: "Stick",
    build(offense, defense) {
      const [x, , slot] = [
        at(offense.receivers, 0, "X"),
        at(offense.receivers, 1, "Z"),
        at(offense.receivers, 2, "slot"),
      ];
      return {
        kind: "PASS",
        name: "Stick",
        formation: "Shotgun Trey Right",
        readSystem: "CONCEPT",
        routes: [
          { receiver: slot, routeName: "Stick", depthClass: "SHORT", airYards: 6, breakZone: { horizontal: "RH", vertical: "SHORT" } },
          { receiver: offense.tightEnd, routeName: "Flat", depthClass: "QUICK", airYards: 3, breakZone: { horizontal: "RW", vertical: "SHORT" } },
          { receiver: x, routeName: "Go", depthClass: "DEEP", airYards: 24, breakZone: { horizontal: "LW", vertical: "DEEP" } },
        ],
        readOrder: [slot, offense.tightEnd, x],
        protection: baseProtection(offense, defense),
      };
    },
  },
  {
    name: "Four Verticals",
    build(offense, defense) {
      const [x, z, slot] = [
        at(offense.receivers, 0, "X"),
        at(offense.receivers, 1, "Z"),
        at(offense.receivers, 2, "slot"),
      ];
      return {
        kind: "PASS",
        name: "Four Verticals",
        formation: "Shotgun 2x2",
        readSystem: "FULL_FIELD",
        routes: [
          { receiver: x, routeName: "Go", depthClass: "DEEP", airYards: 22, breakZone: { horizontal: "LW", vertical: "DEEP" } },
          { receiver: slot, routeName: "Seam", depthClass: "DEEP", airYards: 20, breakZone: { horizontal: "LH", vertical: "DEEP" } },
          { receiver: offense.tightEnd, routeName: "Seam", depthClass: "DEEP", airYards: 20, breakZone: { horizontal: "RH", vertical: "DEEP" } },
          { receiver: z, routeName: "Go", depthClass: "DEEP", airYards: 22, breakZone: { horizontal: "RW", vertical: "DEEP" } },
        ],
        readOrder: [slot, offense.tightEnd, x, z],
        protection: baseProtection(offense, defense),
      };
    },
  },
  {
    name: "Quick Slants",
    build(offense, defense) {
      const [x, z, slot] = [
        at(offense.receivers, 0, "X"),
        at(offense.receivers, 1, "Z"),
        at(offense.receivers, 2, "slot"),
      ];
      return {
        kind: "PASS",
        name: "Quick Slants",
        formation: "Shotgun Trips Left",
        readSystem: "HALF_FIELD",
        routes: [
          { receiver: x, routeName: "Slant", depthClass: "QUICK", airYards: 6, breakZone: { horizontal: "LH", vertical: "SHORT" } },
          { receiver: slot, routeName: "Slant", depthClass: "QUICK", airYards: 6, breakZone: { horizontal: "C", vertical: "SHORT" } },
          { receiver: z, routeName: "Slant", depthClass: "QUICK", airYards: 6, breakZone: { horizontal: "RH", vertical: "SHORT" } },
          { receiver: offense.runningBack, routeName: "Flat", depthClass: "QUICK", airYards: 2, breakZone: { horizontal: "RW", vertical: "SHORT" } },
        ],
        readOrder: [x, slot, z, offense.runningBack],
        protection: baseProtection(offense, defense),
      };
    },
  },
];

// --- designed runs ----------------------------------------------------------

export const RUN_CARDS: readonly RunCard[] = [
  {
    name: "Inside Zone Left",
    build(offense, defense) {
      const front = frontFour(defense);
      return {
        kind: "RUN",
        name: "Inside Zone Left",
        formation: "Singleback Ace",
        scheme: "ZONE",
        designedGap: "B",
        designedSide: "LEFT",
        carrier: offense.runningBack,
        blocking: [
          { blocker: offense.leftTackle, defender: at(front, 0, "LE"), gap: "C", side: "LEFT" },
          { blocker: offense.leftGuard, defender: at(front, 1, "DT"), gap: "B", side: "LEFT", doubleTeamWith: offense.center },
          { blocker: offense.rightGuard, defender: at(front, 2, "DT"), gap: "A", side: "RIGHT" },
          { blocker: offense.rightTackle, defender: at(front, 3, "RE"), gap: "C", side: "RIGHT" },
        ],
        perimeter: [
          { blocker: at(offense.receivers, 0, "X"), defender: at(defense.corners, 0, "CB1"), blockType: "STALK" },
          { blocker: at(offense.receivers, 1, "Z"), defender: at(defense.corners, 1, "CB2"), blockType: "STALK" },
          { blocker: offense.tightEnd, defender: at(defense.linebackers, 0, "LB1"), blockType: "LEAD" },
        ],
      };
    },
  },
  {
    name: "Power Right",
    build(offense, defense) {
      const front = frontFour(defense);
      return {
        kind: "RUN",
        name: "Power Right",
        formation: "Singleback Heavy Right",
        scheme: "GAP",
        designedGap: "A",
        designedSide: "RIGHT",
        carrier: offense.runningBack,
        blocking: [
          { blocker: offense.leftTackle, defender: at(front, 0, "LE"), gap: "C", side: "LEFT" },
          { blocker: offense.leftGuard, defender: at(front, 1, "DT"), gap: "A", side: "LEFT" },
          { blocker: offense.rightGuard, defender: at(front, 2, "DT"), gap: "A", side: "RIGHT", doubleTeamWith: offense.center },
          { blocker: offense.rightTackle, defender: at(front, 3, "RE"), gap: "C", side: "RIGHT" },
        ],
        perimeter: [
          { blocker: offense.tightEnd, defender: at(defense.linebackers, 0, "LB1"), blockType: "LEAD" },
          { blocker: at(offense.receivers, 0, "X"), defender: at(defense.corners, 0, "CB1"), blockType: "STALK" },
        ],
      };
    },
  },
  {
    name: "Outside Zone Right",
    build(offense, defense) {
      const front = frontFour(defense);
      return {
        kind: "RUN",
        name: "Outside Zone Right",
        formation: "Shotgun Single Back",
        scheme: "ZONE",
        designedGap: "C",
        designedSide: "RIGHT",
        carrier: offense.runningBack,
        blocking: [
          { blocker: offense.leftTackle, defender: at(front, 0, "LE"), gap: "C", side: "LEFT" },
          { blocker: offense.leftGuard, defender: at(front, 1, "DT"), gap: "A", side: "LEFT" },
          { blocker: offense.rightGuard, defender: at(front, 2, "DT"), gap: "A", side: "RIGHT" },
          { blocker: offense.rightTackle, defender: at(front, 3, "RE"), gap: "C", side: "RIGHT", doubleTeamWith: offense.center },
        ],
        perimeter: [
          { blocker: at(offense.receivers, 0, "X"), defender: at(defense.corners, 0, "CB1"), blockType: "STALK" },
          { blocker: at(offense.receivers, 1, "Z"), defender: at(defense.corners, 1, "CB2"), blockType: "STALK" },
          { blocker: offense.tightEnd, defender: at(defense.linebackers, 1, "LB2"), blockType: "LEAD" },
        ],
      };
    },
  },
];

// --- coverages --------------------------------------------------------------

function baseRush(defense: DefensivePersonnel): DefensivePlayCall["rush"] {
  return [
    { rusher: at(defense.edges, 0, "LE"), move: "SPEED", alignment: "EDGE" },
    { rusher: at(defense.interior, 0, "DT"), move: "POWER", alignment: "INTERIOR" },
    { rusher: at(defense.interior, 1, "DT"), move: "POWER", alignment: "INTERIOR" },
    { rusher: at(defense.edges, 1, "RE"), move: "FINESSE", alignment: "EDGE" },
  ];
}

export const COVERAGE_CARDS: readonly CoverageCard[] = [
  {
    name: "Cover 1 Press",
    build(offense, defense) {
      return {
        name: "Cover 1 Press",
        front: "Nickel Even",
        assignments: [
          { kind: "MAN", defender: at(defense.corners, 0, "CB1"), covers: at(offense.receivers, 0, "X"), technique: "PRESS" },
          { kind: "MAN", defender: at(defense.corners, 1, "CB2"), covers: at(offense.receivers, 1, "Z"), technique: "OFF" },
          { kind: "MAN", defender: at(defense.corners, 2, "NB"), covers: at(offense.receivers, 2, "slot"), technique: "OFF" },
          { kind: "MAN", defender: at(defense.linebackers, 0, "LB1"), covers: offense.tightEnd, technique: "PRESS" },
          { kind: "MAN", defender: at(defense.linebackers, 1, "LB2"), covers: offense.runningBack, technique: "OFF" },
          { kind: "ZONE", defender: at(defense.safeties, 0, "FS"), zone: { horizontal: "C", vertical: "DEEP" } },
          { kind: "ZONE", defender: at(defense.safeties, 1, "SS"), zone: { horizontal: "C", vertical: "INTERMEDIATE" } },
        ],
        rush: baseRush(defense),
      };
    },
  },
  {
    name: "Cover 3 Spot Drop",
    build(_offense, defense) {
      return {
        name: "Cover 3 Spot Drop",
        front: "Nickel Even",
        assignments: [
          { kind: "ZONE", defender: at(defense.corners, 0, "CB1"), zone: { horizontal: "LW", vertical: "DEEP" } },
          { kind: "ZONE", defender: at(defense.corners, 1, "CB2"), zone: { horizontal: "RW", vertical: "DEEP" } },
          { kind: "ZONE", defender: at(defense.safeties, 0, "FS"), zone: { horizontal: "C", vertical: "DEEP" } },
          { kind: "ZONE", defender: at(defense.corners, 2, "NB"), zone: { horizontal: "RH", vertical: "SHORT" } },
          { kind: "ZONE", defender: at(defense.linebackers, 0, "LB1"), zone: { horizontal: "C", vertical: "SHORT" } },
          { kind: "ZONE", defender: at(defense.linebackers, 1, "LB2"), zone: { horizontal: "LH", vertical: "SHORT" } },
          { kind: "ZONE", defender: at(defense.safeties, 1, "SS"), zone: { horizontal: "C", vertical: "INTERMEDIATE" } },
        ],
        rush: baseRush(defense),
      };
    },
  },
  {
    name: "Cover 2 Man",
    build(offense, defense) {
      return {
        name: "Cover 2 Man",
        front: "Nickel Even",
        assignments: [
          { kind: "MAN", defender: at(defense.corners, 0, "CB1"), covers: at(offense.receivers, 0, "X"), technique: "PRESS" },
          { kind: "MAN", defender: at(defense.corners, 1, "CB2"), covers: at(offense.receivers, 1, "Z"), technique: "PRESS" },
          { kind: "MAN", defender: at(defense.corners, 2, "NB"), covers: at(offense.receivers, 2, "slot"), technique: "OFF" },
          { kind: "MAN", defender: at(defense.linebackers, 0, "LB1"), covers: offense.tightEnd, technique: "OFF" },
          { kind: "MAN", defender: at(defense.linebackers, 1, "LB2"), covers: offense.runningBack, technique: "OFF" },
          { kind: "ZONE", defender: at(defense.safeties, 0, "FS"), zone: { horizontal: "LW", vertical: "DEEP" } },
          { kind: "ZONE", defender: at(defense.safeties, 1, "SS"), zone: { horizontal: "RW", vertical: "DEEP" } },
        ],
        rush: baseRush(defense),
      };
    },
  },
];
