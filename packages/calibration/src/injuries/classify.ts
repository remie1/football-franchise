/**
 * Classifiers for the injury measurement (ADR-087 §5, build step E): what a roster status, an
 * injury-report text and a listed position mean for counting injuries.
 *
 * Pure tables and small functions; no I/O. Each table says what it is read from and how sure the
 * reading is, because nflverse publishes no legend for the roster codes and the report's injury
 * field is free text typed by 32 different teams.
 */

/** The position groups the measurement reports by (the build brief's list). */
export type PositionGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K/P" | "OTHER";

export const POSITION_GROUPS: readonly PositionGroup[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K/P"];

/**
 * Listed position → group. nflverse's weekly rosters already list coarse positions (DB, OL, DL,
 * LB, ...); the finer ones are mapped too so a snap-count position can be read the same way.
 * Edge rushers are split by how teams list them: a 4-3 end is DL, a 3-4 outside linebacker LB.
 */
const GROUP_OF: Readonly<Record<string, PositionGroup>> = {
  QB: "QB",
  RB: "RB", HB: "RB", FB: "RB",
  WR: "WR",
  TE: "TE",
  OL: "OL", T: "OL", OT: "OL", G: "OL", OG: "OL", C: "OL",
  DL: "DL", DE: "DL", DT: "DL", NT: "DL",
  LB: "LB", OLB: "LB", ILB: "LB", MLB: "LB",
  DB: "DB", CB: "DB", S: "DB", FS: "DB", SS: "DB",
  K: "K/P", P: "K/P", LS: "K/P",
};

export function positionGroup(position: string | null): PositionGroup {
  if (position === null) return "OTHER";
  return GROUP_OF[position.trim().toUpperCase()] ?? "OTHER";
}

/**
 * What a weekly-roster row says about the player that week, for counting injuries.
 *
 * - ACTIVE / INACTIVE: on the 53, dressed or not for the game.
 * - IR: a reserve/injured list (with or without "designated to return"); see `rosterKind` for the
 *   2019-2020 rows that carry no code.
 * - PUP: physically unable to perform (a football injury, usually from last season or camp).
 * - NFI: non-football injury or illness: the reports' nearest thing to "away from football".
 * - COVID: the 2020-2021 COVID-19 reserve lists, including 2020's opt-outs. Not an injury.
 * - SUSPENDED, NOT_WITH_TEAM (holdouts, exempt lists), OTHER_RESERVE (codes with no clear meaning),
 *   PRACTICE_SQUAD, OFF_ROSTER (cut, traded, retired, future contracts), UNKNOWN.
 */
export type RosterKind =
  | "ACTIVE" | "INACTIVE" | "IR" | "PUP" | "NFI" | "COVID" | "SUSPENDED" | "NOT_WITH_TEAM"
  | "OTHER_RESERVE" | "PRACTICE_SQUAD" | "OFF_ROSTER" | "UNKNOWN";

/**
 * Reserve-list description codes (`status_description_abbr`) → kind. The 2022+ codes follow
 * `ingest/sources/rosterStatus.ts`, which records the named cases each rests on. Added here for
 * 2019-2021, read from named cases in those seasons' files (2026-10-24):
 * - R59 Reserve/COVID-19: Lamar Jackson BAL 2020 w12, Aaron Rodgers GB 2021 w9 (both COVID-positive).
 * - R62 Reserve/COVID-19 opt-out: C.J. Mosley NYJ, Dont'a Hightower NE, Laurent Duvernay-Tardif KC,
 *   Marquise Goodwin PHI, all 2020 w8-17 (their opt-outs; w1-7 they are status NWT).
 */
const RESERVE_CODE_KIND: Readonly<Record<string, RosterKind>> = {
  R01: "IR", R48: "IR",
  R04: "PUP", R47: "PUP",
  R05: "NFI", R49: "NFI",
  R59: "COVID", R62: "COVID",
  R30: "SUSPENDED", R33: "SUSPENDED", R40: "SUSPENDED",
  R02: "OFF_ROSTER", R23: "OFF_ROSTER",
  R03: "NOT_WITH_TEAM",
};

/**
 * Coarse `status` values that carry the meaning on their own. RSN, RSR, SUS, NWT and PUP appear
 * only in 2019-2020, before description codes were filled in: RSN is the non-football list
 * (Trent Williams WAS 2019 w11-17, his illness), RSR the COVID-19 list (Cam Newton NE 2020 w4-5),
 * SUS suspended (Vontaze Burfict OAK 2019 w5-17), NWT not with the team (2019 holdouts, 2020
 * opt-outs before their R62 code).
 */
const COARSE_KIND: Readonly<Record<string, RosterKind>> = {
  ACT: "ACTIVE",
  INA: "INACTIVE",
  PUP: "PUP",
  RSN: "NFI",
  RSR: "COVID",
  SUS: "SUSPENDED",
  NWT: "NOT_WITH_TEAM",
  EXE: "NOT_WITH_TEAM", E01: "NOT_WITH_TEAM", E14: "NOT_WITH_TEAM",
  DEV: "PRACTICE_SQUAD",
  CUT: "OFF_ROSTER", RET: "OFF_ROSTER", TRC: "OFF_ROSTER", TRD: "OFF_ROSTER", TRT: "OFF_ROSTER",
  UFA: "OFF_ROSTER", RFA: "OFF_ROSTER",
};

/**
 * The kind of one roster row. A RES row is read by its description code. A RES row with no code
 * (all of 2019, and 2020 before week 8) or a non-reserve code (A01, I01) is read as injured
 * reserve: those are the seasons' IR lists (Calvin Ridley ATL 2019 w15-17, Saquon Barkley NYG
 * 2020 w3-7), though they also hold the few reserve players of other kinds, which cannot be told
 * apart there. A RES row with an unclassified code (R06, R27, R34, ...) is OTHER_RESERVE.
 *
 * An injured-reserve code beside ACT or INA (a designated-to-return player in his practice
 * window, a handful a season) still reads as IR: he is not on the 53 yet.
 */
export function rosterKind(status: string | null, code: string | null): RosterKind {
  const s = (status ?? "").trim().toUpperCase();
  const c = (code ?? "").trim().toUpperCase();
  const byCode = RESERVE_CODE_KIND[c];
  if (s === "RES") {
    if (byCode !== undefined) return byCode;
    if (c === "" || c === "A01" || c === "I01" || c === "I02") return "IR";
    return "OTHER_RESERVE";
  }
  if ((s === "ACT" || s === "INA") && (byCode === "IR" || byCode === "COVID")) return byCode;
  return COARSE_KIND[s] ?? "UNKNOWN";
}

/** On the 53-man roster that week (dressed or not). */
export function onRoster(kind: RosterKind): boolean {
  return kind === "ACTIVE" || kind === "INACTIVE";
}

/**
 * What an injury-report text is. FOOTBALL: a body part. ILLNESS: an illness (an away-from-football
 * cause in ADR-087's terms). NON_INJURY: rest, personal, coach's decision and the like: the report
 * lists them, but nobody is hurt. COVID: COVID-19 (2020-2021). NONE: no text.
 */
export type ReportTextKind = "FOOTBALL" | "ILLNESS" | "NON_INJURY" | "COVID" | "NONE";

const NON_INJURY = /not injury|non-injury|non injury|\brest\b|\bresting\b|personal|coach|team decision|did not travel|suspen|load management|family|birth|bereavement|ramp up|no game status|expected to (be available|play)/;
const COVID = /covid/;
const ILLNESS = /illness|\bill\b|\bsick|\bflu\b/;

export function reportTextKind(text: string | null): ReportTextKind {
  if (text === null) return "NONE";
  const t = text.trim().toLowerCase();
  if (t === "") return "NONE";
  if (COVID.test(t)) return "COVID";
  // "Player was ill this morning. Fully expected to play." is an illness note, not a no-injury note
  if (ILLNESS.test(t)) return "ILLNESS";
  if (NON_INJURY.test(t)) return "NON_INJURY";
  return "FOOTBALL";
}

/** Body-part classes. The report names a body part, never a diagnosis: "Knee" is an ACL tear and a bruise alike. */
export type BodyPart =
  | "knee" | "ankle" | "hamstring" | "concussion/head" | "shoulder" | "groin/hip" | "foot/toe"
  | "calf/shin" | "achilles" | "quad/thigh" | "back/neck" | "hand/wrist" | "elbow/arm"
  | "chest/ribs/abdomen" | "illness" | "other" | "unknown";

/**
 * Keywords for each class. The class whose keyword appears EARLIEST in the text wins, so "back,
 * ankle, knee" reads as back and "left Knee" as knee.
 */
const BODY_KEYWORDS: readonly (readonly [Exclude<BodyPart, "illness" | "other" | "unknown">, RegExp])[] = [
  ["achilles", /achilles/],
  ["concussion/head", /concussion|\bhead\b/],
  ["hamstring", /hamstring/],
  ["knee", /knee|\bacl\b|\bmcl\b|\bpcl\b|patell|menisc/],
  ["ankle", /ankle/],
  ["foot/toe", /\bfoot\b|\bfeet\b|\btoes?\b|heel|plantar|lisfranc|\barch\b/],
  ["calf/shin", /\bcalf|calves|\bshin|fibula|tibia|\bleg\b/],
  ["quad/thigh", /\bquad|thigh/],
  ["groin/hip", /groin|\bhips?\b|adductor|abductor|glute|pelvi/],
  ["shoulder", /shoulder|collarbone|clavicle|rotator|scapula|labrum|\bac joint/],
  ["hand/wrist", /\bhands?\b|wrist|finger|thumb|forearm|knuckle/],
  ["elbow/arm", /elbow|bicep|tricep|\barm\b/],
  ["back/neck", /\bback\b|spine|lumbar|\bdisc\b|stinger|\bneck\b|cervical/],
  ["chest/ribs/abdomen", /chest|pectoral|\bpec\b|\bribs?\b|abdom|oblique|\bcore\b|sternum|hernia|kidney|liver|spleen|lung/],
];

/** The body-part class of a report text (`unknown` when there is none). */
export function bodyPart(text: string | null): BodyPart {
  const kind = reportTextKind(text);
  if (kind === "NONE" || kind === "NON_INJURY" || kind === "COVID") return "unknown";
  if (kind === "ILLNESS") return "illness";
  const t = (text ?? "").toLowerCase();
  let best: BodyPart = "other";
  let at = Number.POSITIVE_INFINITY;
  for (const [part, re] of BODY_KEYWORDS) {
    const m = re.exec(t);
    if (m !== null && m.index < at) {
      at = m.index;
      best = part;
    }
  }
  return best;
}
