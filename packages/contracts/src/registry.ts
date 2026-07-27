/**
 * The attribute registry. Attributes are DATA, not fields — this is what makes
 * calibration's kill/merge/split recommendations a migration instead of a refactor.
 * Dev-time scaffolding; freezes for ship (Spec #1 §2).
 */
import type { AttrId, CoachAttrId, TraitId, PositionGroup } from "./ids.js";
import { attrId, coachAttrId, traitId } from "./ids.js";

export type AttrCategory = "physical" | "skill" | "mental" | "knowledge";

export interface AttributeDefinition {
  id: AttrId;
  name: string;
  description: string;
  positionGroups: PositionGroup[];
  category: AttrCategory;
  status: "active" | "deprecated";
  introducedIn: number;
  deprecatedIn?: number;
}

export interface AttributeRegistry {
  schemaVersion: number;
  attributes: Record<string, AttributeDefinition>;
}

export const ATTR_SCALE = { min: 0, max: 99 } as const;

export type AttributeMap = Partial<Record<string, number>>;

/** The ONLY sanctioned attribute read path. Never hard-code attribute fields. */
export function getAttr(map: AttributeMap, id: AttrId, fallback = 50): number {
  const v = map[id as unknown as string];
  return typeof v === "number" ? v : fallback;
}

export function setAttr(map: AttributeMap, id: AttrId, value: number): AttributeMap {
  const clamped = Math.max(ATTR_SCALE.min, Math.min(ATTR_SCALE.max, Math.round(value)));
  return { ...map, [id as unknown as string]: clamped };
}

/** Contributes Rating/5 to a roll, per the match design doc. */
export function attrMod(map: AttributeMap, id: AttrId, fallback = 50): number {
  return Math.round(getAttr(map, id, fallback) / 5);
}

const A = (
  id: string, name: string, groups: PositionGroup[], category: AttrCategory, description = ""
): AttributeDefinition => ({
  id: attrId(id), name, description, positionGroups: groups,
  category, status: "active", introducedIn: 1,
});

const ALL: PositionGroup[] = ["QB","RB","FB","WR","TE","OL","DL","LB","DB","ST"];
const SKILL: PositionGroup[] = ["RB","FB","WR","TE"];
const FRONT: PositionGroup[] = ["OL","DL"];

/** v0 registry, populated from match-engine.md §4. */
export const ATTRIBUTE_REGISTRY_V1: AttributeRegistry = {
  schemaVersion: 2,
  attributes: Object.fromEntries([
    // Universal
    A("speed","Speed",ALL,"physical"),
    A("acceleration","Acceleration",ALL,"physical"),
    A("agility","Agility",ALL,"physical"),
    A("strength","Strength",ALL,"physical"),
    A("stamina","Stamina",ALL,"physical","Recovery rate and fatigue resistance"),
    A("awareness","Awareness",ALL,"mental"),
    A("reaction","Reaction",ALL,"mental"),
    A("durability","Durability",ALL,"physical"),
    // QB
    A("footballIQ","Football IQ",["QB"],"knowledge"),
    A("decisionMaking","Decision Making",["QB"],"mental"),
    A("accuracy","Accuracy",["QB"],"skill"),
    A("armStrength","Arm Strength",["QB"],"physical"),
    A("touch","Touch",["QB"],"skill"),
    A("pocketPatience","Pocket Patience",["QB"],"mental"),
    A("poise","Poise",["QB"],"mental"),
    A("improvisation","Improvisation",["QB"],"skill"),
    A("release","Release",["QB"],"skill"),
    A("mobility","Mobility",["QB"],"physical"),
    // OL
    A("passBlock","Pass Block",["OL","TE","FB"],"skill"),
    A("runBlock","Run Block",["OL","TE","FB","WR"],"skill"),
    A("anchor","Anchor",["OL"],"physical"),
    A("footwork","Footwork",["OL"],"skill"),
    A("sustain","Sustain",["OL","TE","FB"],"skill"),
    A("pullSkill","Pulling",["OL"],"skill"),
    // DL
    A("passRush","Pass Rush",["DL","LB"],"skill"),
    A("runStuff","Run Stuff",["DL","LB"],"skill"),
    A("powerMove","Power Move",["DL","LB"],"skill"),
    A("finesseMove","Finesse Move",["DL","LB"],"skill"),
    A("firstStep","First Step",["DL","LB"],"physical"),
    A("blockShed","Block Shed",["DL","LB"],"skill"),
    A("pursuit","Pursuit",["DL","LB","DB"],"physical"),
    // LB / DB
    A("tackling","Tackling",["DL","LB","DB","ST"],"skill"),
    A("playRecognition","Play Recognition",["LB","DB"],"mental"),
    A("zoneCoverage","Zone Coverage",["LB","DB"],"skill"),
    A("manCoverage","Man Coverage",["LB","DB"],"skill"),
    A("instincts","Instincts",["LB","DB"],"mental"),
    A("press","Press",["DB"],"skill"),
    A("ballSkills","Ball Skills",["DB","WR","TE"],"skill"),
    // Receiving
    A("routeRunning","Route Running",["WR","TE","RB"],"skill"),
    A("releaseWR","Release",["WR","TE"],"skill"),
    A("catching","Catching",SKILL,"skill"),
    A("catchInTraffic","Catch in Traffic",SKILL,"skill"),
    A("spectacularCatch","Spectacular Catch",SKILL,"skill"),
    A("yac","YAC",SKILL,"skill"),
    // Rushing
    A("vision","Vision",["RB","FB"],"mental"),
    A("elusiveness","Elusiveness",["RB","WR","TE"],"skill"),
    A("power","Power",["RB","FB"],"physical"),
    A("ballSecurity","Ball Security",SKILL,"skill"),
    A("jumping","Jumping",["WR","TE","RB","DB","LB"],"physical","Vertical explosiveness; contested-catch and high-point term (ADR-003)"),
    A("patience","Patience",["RB"],"mental"),
    // Blocking-adjacent front
    A("gapDiscipline","Gap Discipline",FRONT.concat(["LB"]),"knowledge"),
    // Personality (Spec #14)
    A("volatility","Volatility",ALL,"mental","Rate morale moves in BOTH directions"),
  ].map((d) => [d.id as unknown as string, d])),
};

export interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  positionGroups: PositionGroup[];
}

export type TraitSet = ReadonlySet<string>;

const T = (id: string, name: string, groups: PositionGroup[], description = ""): TraitDefinition =>
  ({ id: traitId(id), name, description, positionGroups: groups });

export const TRAIT_REGISTRY_V1: Record<string, TraitDefinition> = Object.fromEntries([
  T("ballHawk","Ball Hawk",["DB","LB"]),
  T("clutch","Clutch",ALL),
  T("highMotor","High Motor",["DL","LB"]),
  T("passSwatter","Pass Swatter",["DL"]),
  T("pressSpecialist","Press Specialist",["DB"]),
  T("reliableHands","Reliable Hands",["WR","TE","RB"]),
  T("routeTechnician","Route Technician",["WR","TE"]),
  T("shutdown","Shutdown",["DB"]),
  T("powerRunner","Power Runner",["RB","FB"]),
  T("homeRunHitter","Home Run Hitter",["RB","WR"]),
  T("runStuffer","Run Stuffer",["DL","LB"]),
  T("quickTwitch","Quick Twitch",["DL"]),
  T("pocketAwareness","Pocket Awareness",["QB"]),
  T("improviser","Improviser",["QB"]),
  T("brickWall","Brick Wall",["OL"]),
  T("roadGrader","Road Grader",["OL"]),
].map((t) => [t.id as unknown as string, t]));

/** Registry migrations: how a kill/merge/split ships (Spec #1 §2). */
export type RegistryMigrationOp =
  | { op: "add"; attr: AttributeDefinition; defaultFrom?: { sources: AttrId[]; method: "mean" | "max" } }
  | { op: "deprecate"; id: AttrId }
  | { op: "rename"; from: AttrId; to: AttrId };

export interface RegistryMigration {
  fromVersion: number;
  toVersion: number;
  ops: RegistryMigrationOp[];
}

export function applyMigration(map: AttributeMap, m: RegistryMigration): AttributeMap {
  let out: AttributeMap = { ...map };
  for (const op of m.ops) {
    if (op.op === "rename") {
      const k = op.from as unknown as string;
      if (k in out) { out[op.to as unknown as string] = out[k]; delete out[k]; }
    } else if (op.op === "deprecate") {
      delete out[op.id as unknown as string];
    } else if (op.op === "add" && op.defaultFrom) {
      const vals = op.defaultFrom.sources
        .map((s) => out[s as unknown as string])
        .filter((v): v is number => typeof v === "number");
      if (vals.length) {
        out[op.attr.id as unknown as string] =
          op.defaultFrom.method === "max"
            ? Math.max(...vals)
            : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
  }
  return out;
}

/**
 * ADR-003: adds `jumping` so the contested-catch formula (match-engine.md §11.3)
 * has the term the doc specifies on both sides of the roll. Existing rosters seed
 * from the mean of `spectacularCatch` and `ballSkills` until the attributes
 * pipeline derives it from combine vertical jump (a Family A source).
 */
export const MIGRATION_V1_TO_V2: RegistryMigration = {
  fromVersion: 1,
  toVersion: 2,
  ops: [{
    op: "add",
    attr: ATTRIBUTE_REGISTRY_V1.attributes["jumping"]!,
    defaultFrom: { sources: [attrId("spectacularCatch"), attrId("ballSkills")], method: "mean" },
  }],
};

/** Coach attributes live in a separate namespace (Spec #11 §3). */
export interface CoachAttributeDefinition {
  id: CoachAttrId; name: string; description: string;
  timescale: "game" | "season" | "career";
}
const C = (id: string, name: string, timescale: "game"|"season"|"career", description = ""):
  CoachAttributeDefinition => ({ id: coachAttrId(id), name, description, timescale });

export const COACH_ATTRIBUTE_REGISTRY_V1: Record<string, CoachAttributeDefinition> =
  Object.fromEntries([
    C("gamePlanning","Game Planning","game"),
    C("inGameAdjustment","In-Game Adjustment","game"),
    C("situationalJudgment","Situational Judgment","game"),
    C("playCalling","Play Calling","game"),
    C("schemeDesign","Scheme Design","game"),
    C("development","Development","season"),
    C("teaching","Teaching","season","Playbook install rate"),
    C("motivation","Motivation","season"),
    C("culture","Culture","season"),
    C("talentEvaluation","Talent Evaluation","season"),
    C("playerTrust","Player Trust","season","Engagement director: disclosure depth"),
    C("readAccuracy","Read Accuracy","season","Engagement director: report correctness"),
    C("intervention","Intervention","season"),
    C("staffDevelopment","Staff Development","career"),
    C("mediaHandling","Media Handling","career"),
    C("gravity","Gravity","career","Free-agent attraction"),
    C("politics","Politics","career"),
    C("trendReceptivity","Trend Receptivity","career","Owner/president: fashion appetite"),
    C("schemeOrthodoxy","Scheme Orthodoxy","career","HC: commitment to own system"),
  ].map((c) => [c.id as unknown as string, c]));
