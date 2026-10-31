/**
 * ADR-090 step 0 — WHERE EVERY MAN STANDS AT THE SNAP, checked over the whole book.
 *
 * The step's proof (ADR-090 §7): every formation against every call gets a spot for every man;
 * no two men stand on one spot unless the call says so; a mirrored call against a mirrored
 * formation draws the mirror picture; the same call draws the same picture. "Every call" is each
 * card of the book and each composed call of v6's catalogue (its pressures and creepers; a line
 * game moves nobody before the snap), bare and wearing every look it can wear, early and late,
 * and under each front look it can wear. Beside the proof, the tables' own values and each
 * beat's rule, and D4 against the owner's August ranges (ADR-066:607-610, ADR-090 §9).
 */
import { describe, expect, it } from "vitest";
import { laneOfX, cellOf, toHalfYard, BALL_X, playPreSnap, onOneSpot } from "../src/snapSpots.js";
import type { PreSnapBeats, SnapInput, SnapSpot } from "../src/snapSpots.js";
import { COMPOSED, V6_COVERAGES } from "../src/coverageCatalogue.js";
import { dutyList, mirrorDefensiveCard, type AnyDefensiveCard } from "../src/defense.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { FORMATIONS, alignedRoles, mirrorFormation, type AnyFormation } from "../src/formations.js";
import { applyFrontLook, legalFrontLooks, type FrontLookDraw } from "../src/frontLooks.js";
import { instantiateDefense } from "../src/instantiate.js";
import { applyLooks, legalLookCombinations, PRESS, SHOW_2 } from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEFENSE_ROLE_GROUP, type DefenseRole, type OffenseRole } from "../src/roles.js";
import { mirrorSide } from "../src/alignment.js";
import { PlaybookError } from "../src/errors.js";
import { DEEP_CHART } from "./fixtures.js";

// --- the book, every way it can be drawn ------------------------------------------------------

const byId = (id: string): AnyDefensiveCard => {
  const card = [...DEFENSIVE_CARDS, ...Object.values(COMPOSED).map((e) => e.call)].find((c) => c.id === id);
  if (card === undefined) throw new Error(`no call ${id}`);
  return card;
};
const formation = (id: string): AnyFormation => {
  const found = FORMATIONS.find((f) => f.id === id);
  if (found === undefined) throw new Error(`no formation ${id}`);
  return found;
};

/** Each distinct set of duties: the book's cards, v6's coverages, and each composed pressure. */
function bookCalls(): readonly AnyDefensiveCard[] {
  const calls = new Map<string, AnyDefensiveCard>();
  for (const card of [...DEFENSIVE_CARDS, ...V6_COVERAGES]) calls.set(card.id, card);
  for (const entry of Object.values(COMPOSED)) {
    if (entry.line === "BOUND" && !calls.has(entry.call.id)) calls.set(entry.call.id, entry.call);
  }
  return [...calls.values()];
}

/** The call bare, then wearing each legal set of coverage looks, early and late where it rotates. */
function wornCalls(card: AnyDefensiveCard): readonly AnyDefensiveCard[] {
  const worn: AnyDefensiveCard[] = [card];
  for (const looks of legalLookCombinations(card)) {
    if (!looks.some((mask) => mask.row === "BY_TIMING")) {
      worn.push(applyLooks(card, { looks }));
      continue;
    }
    for (const timing of ["EARLY", "LATE"] as const) worn.push(applyLooks(card, { looks, timing }));
  }
  return worn;
}

/** No front look, then each the called card can wear: the Mug, the Stem toward each legal side. */
function frontDraws(card: AnyDefensiveCard): readonly (FrontLookDraw | undefined)[] {
  return [
    undefined,
    ...legalFrontLooks(card).flatMap((option): FrontLookDraw[] =>
      option.look === "MUG"
        ? [{ cardId: card.id, look: "MUG" }]
        : option.sides.map((side) => ({ cardId: card.id, look: "STEM", side })),
    ),
  ];
}

function inputOf(formationTemplate: AnyFormation, card: AnyDefensiveCard, front?: FrontLookDraw): SnapInput | undefined {
  const offense = buildOffensiveUnit(formationTemplate.personnel, DEEP_CHART);
  const unit = buildDefensiveUnit(card.personnel, DEEP_CHART);
  const plain = instantiateDefense(card, unit, { formation: formationTemplate, unit: offense });
  const defense = front === undefined ? plain : applyFrontLook(plain, front);
  // A front look this formation makes illegal is not worn (`applyFrontLook`): nothing new to draw.
  if (front !== undefined && defense === plain) return undefined;
  return { formation: formationTemplate, offense, card, defense };
}

interface Case {
  readonly label: string;
  readonly formation: AnyFormation;
  readonly card: AnyDefensiveCard;
  readonly front: FrontLookDraw | undefined;
  readonly input: SnapInput;
  readonly beats: PreSnapBeats;
}

const CASES: readonly Case[] = (() => {
  const cases: Case[] = [];
  for (const base of bookCalls()) {
    for (const card of wornCalls(base)) {
      for (const front of frontDraws(card)) {
        for (const template of FORMATIONS) {
          const input = inputOf(template, card, front);
          if (input === undefined) continue;
          const looks = (card.looks ?? []).map((l) => l.id).join("+");
          const label = `${card.id}${looks ? `+${looks}/${card.coverageDisguise}` : ""}${front ? `+${front.look}` : ""} vs ${template.id}`;
          cases.push({ label, formation: template, card, front, input, beats: playPreSnap(input) });
        }
      }
    }
  }
  return cases;
})();

const find = (label: string): Case => {
  const found = CASES.find((c) => c.label === label);
  if (found === undefined) throw new Error(`no case ${label}`);
  return found;
};

const at = (spot: SnapSpot | undefined): readonly [number, number] => {
  if (spot === undefined) throw new Error("no spot");
  return [spot.x, spot.y];
};

/** The role a picture's player stands in, offense or defense. */
function rolesOf(c: Case): ReadonlyMap<string, string> {
  const roles = new Map<string, string>();
  for (const [role, player] of Object.entries(c.input.offense)) roles.set(String(player), role);
  for (const [role, player] of Object.entries(c.input.defense.byRole)) roles.set(String(player), role);
  return roles;
}

// --- D1 and D2 --------------------------------------------------------------------------------

describe("D1 and D2: the field frame, and a spot's cell on the grid", () => {
  it("rounds to half a yard away from the middle, so a spot and its mirror round alike, never to -0", () => {
    expect(toHalfYard(0.75)).toBe(1);
    expect(toHalfYard(-0.75)).toBe(-1);
    expect(toHalfYard(2.25)).toBe(2.5);
    expect(toHalfYard(-5.25)).toBe(-5.5);
    expect(toHalfYard(10.5)).toBe(10.5);
    expect(Object.is(toHalfYard(-0.2), 0)).toBe(true);
  });

  it("keeps the ball in the middle of the field (question 3, ruled Middle for now)", () => {
    expect(BALL_X).toBe(0);
    for (const c of CASES.slice(0, 50)) expect(c.beats.picture.ballX).toBe(0);
  });

  it("maps across by D2: the middle lane inside 3.5 yards, the H lanes to 13, the W lanes beyond", () => {
    expect([0, 3.4, -3.4].map(laneOfX)).toEqual(["C", "C", "C"]);
    expect([3.5, 13, -3.5, -13].map(laneOfX)).toEqual(["RH", "RH", "LH", "LH"]);
    expect([13.5, 26.5, -13.5, -26.5].map(laneOfX)).toEqual(["RW", "RW", "LW", "LW"]);
  });

  it("maps depth by match-engine §3.2's bands, so every man behind the ball is in the backfield", () => {
    expect([-7, -0.5, 1, 10, 12, 20, 25, 35, 40].map((y) => cellOf({ x: 0, y }).vertical)).toEqual([
      "BACKFIELD",
      "BACKFIELD",
      "SHORT",
      "SHORT",
      "INTERMEDIATE",
      "INTERMEDIATE",
      "DEEP",
      "DEEP",
      "VERY_DEEP",
    ]);
  });
});

// --- beat 1, D3 ---------------------------------------------------------------------------------

describe("beat 1, table D3: the offense lines up", () => {
  const offenseOf = (id: string) => find(`DEF_NICKEL_COVER_3_SKY vs ${id}`).beats.offense;

  it("puts the line on the ball a yard and a half apart, and the quarterback where he takes the snap", () => {
    const gun = offenseOf("GUN_TRIPS_RT");
    expect((["LT", "LG", "C", "RG", "RT"] as const).map((r) => at(gun[r]))).toEqual([
      [-3, -0.5],
      [-1.5, -0.5],
      [0, -0.5],
      [1.5, -0.5],
      [3, -0.5],
    ]);
    expect(gun.C?.stance).toBe("DOWN");
    expect(at(gun.QB)).toEqual([0, -5]);
    expect(at(offenseOf("I_FORM_PRO_RT").QB)).toEqual([0, -1]);
  });

  it("spaces Trips Right from the sideline in, and puts the lone gun back on the weak side", () => {
    const trips = offenseOf("GUN_TRIPS_RT");
    expect(at(trips.X)).toEqual([-18, -0.5]);
    expect(at(trips.Z)).toEqual([18, -0.5]);
    expect(at(trips.SLOT)).toEqual([11, -1.5]);
    expect(at(trips.TE_Y)).toEqual([8.5, -1.5]);
    expect(at(trips.RB)).toEqual([-1.5, -5]);
  });

  it("attaches a tight end on the line to his tackle at 4.5, hand down, and never a receiver", () => {
    const ace = offenseOf("SINGLEBACK_ACE_RT");
    expect(ace.TE_Y).toEqual({ x: 4.5, y: -0.5, stance: "DOWN" });
    // Gun Bunch's point man is on the line in an H lane and is not attached to anybody.
    expect(offenseOf("GUN_BUNCH_RT").Z).toEqual({ x: 11, y: -0.5, stance: "UP" });
  });

  it("stacks the I behind a quarterback under center, and splits two gun backs either side of him", () => {
    const i = offenseOf("I_FORM_PRO_RT");
    expect(at(i.FB)).toEqual([0, -4.5]);
    expect(at(i.RB)).toEqual([0, -7]);
    const split = offenseOf("GUN_SPLIT_BACKS_RT");
    expect(at(split.RB)).toEqual([-1.5, -5]);
    expect(at(split.FB)).toEqual([1.5, -5]);
  });

  it("puts a pistol back seven yards deep behind a quarterback at four", () => {
    const pistol: AnyFormation = { ...formation("GUN_DOUBLES_RT"), id: "PISTOL_DOUBLES_RT", quarterback: "PISTOL" };
    const c = inputOf(pistol, byId("DEF_NICKEL_COVER_3_SKY"));
    if (c === undefined) throw new Error("no input");
    const offense = playPreSnap(c).offense;
    expect(at(offense.QB)).toEqual([0, -4]);
    expect(at(offense.RB)).toEqual([0, -7]);
  });

  it("maps every receiver and lone back to his formation's lane; split backs are the one difference", () => {
    const differences: string[] = [];
    for (const template of [...FORMATIONS, ...FORMATIONS.map(mirrorFormation)]) {
      const c = inputOf(template, byId(template.personnel === "22" ? "DEF_GOAL_LINE_MAN" : "DEF_NICKEL_COVER_3_SKY"));
      if (c === undefined) throw new Error("no input");
      const offense = playPreSnap(c).offense;
      expect(Object.keys(offense), template.id).toHaveLength(11);
      for (const { role, alignment } of alignedRoles(template)) {
        const lane = laneOfX(at(offense[role])[0]);
        if (lane !== alignment.lane) differences.push(`${template.id} ${role} ${alignment.lane}->${lane}`);
      }
    }
    // D3 seats a gun back a yard and a half from the quarterback, which D2 counts as the middle
    // lane; the formation calls the split backs' lanes LH and RH. Listed here, as step 1 will list
    // every difference between a mapped cell and the grid's.
    expect(differences).toEqual([
      "GUN_SPLIT_BACKS_RT RB LH->C",
      "GUN_SPLIT_BACKS_RT FB RH->C",
      "GUN_SPLIT_BACKS_LT RB RH->C",
      "GUN_SPLIT_BACKS_LT FB LH->C",
    ]);
  });
});

// --- the proof over the whole book -------------------------------------------------------------

describe("every formation against every call (ADR-090 §7, step 0's proof)", () => {
  it("draws the book many ways: every call, look, timing and front look against every formation", () => {
    expect(CASES.length).toBeGreaterThan(4000);
    expect(new Set(CASES.map((c) => c.card.id)).size).toBe(bookCalls().length);
    expect(CASES.some((c) => c.front?.look === "MUG")).toBe(true);
    expect(CASES.some((c) => c.front?.look === "STEM")).toBe(true);
    expect(CASES.some((c) => c.card.coverageDisguise === "LATE_ROTATION")).toBe(true);
  });

  it("gives a spot to all twenty-two men, each player once", () => {
    for (const c of CASES) {
      const { offense, defense } = c.beats.picture;
      expect(offense, c.label).toHaveLength(11);
      expect(defense, c.label).toHaveLength(11);
      const players = [...offense, ...defense].map((s) => String(s.player));
      expect(new Set(players).size, c.label).toBe(22);
      expect(new Set(defense.map((s) => String(s.player))), c.label).toEqual(
        new Set(Object.values(c.input.defense.byRole).map(String)),
      );
    }
  });

  it("keeps the offense behind the ball and the defense across it, inside the sidelines, on the half-yard grid", () => {
    for (const c of CASES) {
      const { offense, defense } = c.beats.picture;
      for (const s of offense) expect(s.y, c.label).toBeLessThanOrEqual(-0.5);
      for (const s of defense) expect(s.y, c.label).toBeGreaterThanOrEqual(1);
      for (const s of [...offense, ...defense]) {
        expect(Math.abs(s.x), c.label).toBeLessThan(26.65);
        expect(toHalfYard(s.x), c.label).toBe(s.x);
        expect(toHalfYard(s.y), c.label).toBe(s.y);
      }
    }
  });

  it("never puts two men on one spot unless the call says so: a Mug backer behind his lineman, a quarterback under center", () => {
    const allowed = new Map<string, number>();
    for (const c of CASES) {
      const roles = rolesOf(c);
      const mugged = c.front?.look === "MUG";
      const all = [...c.beats.picture.offense, ...c.beats.picture.defense];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          if (a === undefined || b === undefined || !onOneSpot(a, b)) continue;
          const pair = [roles.get(String(a.player)), roles.get(String(b.player))].sort().join("~");
          const qb = pair === "C~QB" && c.formation.quarterback === "UNDER_CENTER";
          const mug = mugged && /^(DT_L~LB_W|DT_R~LB_M|DT_L~LB_M|DT_R~LB_W|LB_M~NT)$/.test(pair) && a.x === b.x;
          expect(qb || mug, `${c.label}: ${pair} at (${a.x}, ${a.y}) and (${b.x}, ${b.y})`).toBe(true);
          allowed.set(qb ? "QB" : "MUG", (allowed.get(qb ? "QB" : "MUG") ?? 0) + 1);
        }
      }
    }
    // Both exceptions are drawn, so the test would see one go wrong.
    expect(allowed.get("QB")).toBeGreaterThan(0);
    expect(allowed.get("MUG")).toBeGreaterThan(0);
  });

  it("draws the same picture from the same call, and leaves the call as it found it", () => {
    for (const c of CASES.filter((_, i) => i % 7 === 0)) {
      const before = JSON.stringify(c.input);
      expect(playPreSnap(c.input), c.label).toEqual(c.beats);
      expect(JSON.stringify(c.input), c.label).toBe(before);
    }
  });
});

// --- mirror symmetry -------------------------------------------------------------------------------

const OFFENSE_MIRROR: Partial<Record<OffenseRole, OffenseRole>> = { LT: "RT", RT: "LT", LG: "RG", RG: "LG" };
const DEFENSE_MIRROR: Partial<Record<DefenseRole, DefenseRole>> = {
  DE_L: "DE_R",
  DE_R: "DE_L",
  DT_L: "DT_R",
  DT_R: "DT_L",
  LB_W: "LB_S",
  LB_S: "LB_W",
  CB_L: "CB_R",
  CB_R: "CB_L",
};

/**
 * The role a mirrored card gives a role's duty to, as `mirrorDefensiveCard` does: its partner
 * when the card has one (the Will and the Sam swap in a base front), else itself (a nickel's
 * lone Will stays the Will and plays his own duty, mirrored).
 */
const mirrorRole = (card: AnyDefensiveCard, role: DefenseRole): DefenseRole => {
  const partner = DEFENSE_MIRROR[role];
  return partner !== undefined && card.duties[partner] !== undefined ? partner : role;
};

const mirrored = (spot: SnapSpot | undefined): SnapSpot | undefined =>
  spot === undefined
    ? undefined
    : {
        ...spot,
        x: 0 - spot.x,
        ...(spot.moving === undefined ? {} : { moving: { ...spot.moving, dx: 0 - spot.moving.dx } }),
      };

/**
 * A BACK man target is "the n-th back from the left" (`backfieldRoles`), which a mirror does not
 * keep when the backs stand in different lanes: the mirrored Cover 1 has its Mike on the other
 * back. The picture follows the call, so those men are left out of the comparison, by name.
 */
function backTargets(template: AnyFormation, card: AnyDefensiveCard): ReadonlySet<DefenseRole> {
  const lanes = new Set(alignedRoles(template).filter((e) => e.alignment.spot === "BACKFIELD").map((e) => e.alignment.lane));
  if (lanes.size < 2) return new Set();
  return new Set(
    dutyList(card).flatMap(({ role, duty }) => (duty.kind === "MAN" && duty.target.kind === "BACK" ? [role] : [])),
  );
}

/**
 * The Mug walks up the Will and the Mike BY NAME (ADR-073 §2.5): the inside backers, by job.
 * `mirrorDefensiveCard` swaps the Will and the Sam as left and right, so in a front with both the
 * mirrored Will carries the Sam's duty, and a Mug over him walks up the outside backer, or throws
 * with no run fit to show him at. No game mirrors a card, so that Mug has no mirror image to
 * compare with: the case is left out, by name. Its aligned beat is the bare call's, compared.
 */
const mugsByName = (c: Case): boolean =>
  c.front?.look === "MUG" && c.card.duties.LB_W !== undefined && c.card.duties.LB_S !== undefined;

describe("mirror symmetry", () => {
  it("draws the mirror picture for the mirrored call against the mirrored formation", () => {
    let compared = 0;
    let leftOut = 0;
    for (const c of CASES) {
      if (mugsByName(c)) {
        leftOut += 1;
        continue;
      }
      const card = mirrorDefensiveCard(c.card);
      const front: FrontLookDraw | undefined =
        c.front === undefined
          ? undefined
          : c.front.look === "MUG"
            ? { cardId: card.id, look: "MUG" }
            : { cardId: card.id, look: "STEM", ...(c.front.side === undefined ? {} : { side: mirrorSide(c.front.side) }) };
      const input = inputOf(mirrorFormation(c.formation), card, front);
      expect(input, `${c.label}: the mirrored front look is not worn`).toBeDefined();
      if (input === undefined) continue;
      const flipped = playPreSnap(input);
      for (const role of Object.keys(c.beats.offense) as OffenseRole[]) {
        expect(flipped.offense[role], `${c.label} ${role}`).toEqual(mirrored(c.beats.offense[OFFENSE_MIRROR[role] ?? role]));
      }
      const skip = new Set([...backTargets(c.formation, c.card)].map((r) => mirrorRole(c.card, r)));
      for (const beat of ["aligned", "shown", "atSnap"] as const) {
        for (const role of Object.keys(flipped[beat]) as DefenseRole[]) {
          if (skip.has(role)) continue;
          expect(flipped[beat][role], `${c.label} ${beat} ${role}`).toEqual(
            mirrored(c.beats[beat][mirrorRole(c.card, role)]),
          );
          compared += 1;
        }
      }
    }
    expect(compared).toBeGreaterThan(100_000);
    expect(leftOut).toBeLessThan(CASES.length / 10);
  });
});

// --- beat 2: D4 and D5 ------------------------------------------------------------------------------

describe("beat 2, tables D4 and D5, against the owner's August ranges (ADR-066:607-610)", () => {
  const rushers = (c: Case): ReadonlySet<string> => new Set(c.input.defense.call.rush.map((r) => String(r.rusher)));
  const aligned = (c: Case) =>
    (Object.entries(c.beats.aligned) as [DefenseRole, SnapSpot][]).map(([role, spot]) => ({
      role,
      spot,
      player: c.input.defense.byRole[role],
    }));

  it("stands every backer who does not rush 4 to 7 yards deep (August: linebacker depth 4 to 7)", () => {
    for (const c of CASES) {
      for (const { role, spot, player } of aligned(c)) {
        if (DEFENSE_ROLE_GROUP[role] !== "BACKERS" || rushers(c).has(String(player))) continue;
        expect(spot.y, `${c.label} ${role}`).toBeGreaterThanOrEqual(4);
        expect(spot.y, `${c.label} ${role}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it("presses at 1 yard and plays off at 5 for a slot defender (August: press 1-2, off 5-8)", () => {
    const depths = new Set<string>();
    for (const c of CASES) {
      for (const a of c.input.defense.call.assignments) {
        if (a.kind !== "MAN") continue;
        const role = (Object.entries(c.input.defense.byRole) as [DefenseRole, unknown][]).find(([, p]) => p === a.defender)?.[0];
        if (role === undefined) continue;
        const group = DEFENSE_ROLE_GROUP[role];
        if (group !== "CORNERS" && group !== "NICKEL_DIME") continue;
        const y = at(c.beats.aligned[role])[1];
        depths.add(`${group} ${a.technique} ${y}`);
        if (a.technique === "PRESS") expect(y, `${c.label} ${role}`).toBe(1);
        else expect(y, `${c.label} ${role}`).toBe(group === "CORNERS" ? 7 : 5);
      }
    }
    // Today's book presses every outside corner it puts in man; the table's off depth for him
    // is drawn by the next test.
    expect([...depths].sort()).toEqual(["CORNERS PRESS 1", "NICKEL_DIME OFF 5", "NICKEL_DIME PRESS 1"]);
  });

  it("plays an outside corner off at 7 when a card asks for it, still outside with help in the middle", () => {
    const cover1 = byId("DEF_NICKEL_COVER_1");
    const corner = cover1.duties.CB_L;
    if (corner?.kind !== "MAN") throw new Error("Cover 1's left corner is not in man");
    const off: AnyDefensiveCard = { ...cover1, id: "TEST_COVER_1_OFF", duties: { ...cover1.duties, CB_L: { ...corner, technique: "OFF" } } };
    const input = inputOf(formation("GUN_DOUBLES_RT"), off);
    if (input === undefined) throw new Error("no input");
    expect(at(playPreSnap(input).aligned.CB_L)).toEqual([-19, 7]);
  });

  it("keeps every down lineman inside the 0 to 9 technique range, a hand down, a yard off the ball", () => {
    for (const c of CASES) {
      for (const { role, spot } of aligned(c)) {
        if (DEFENSE_ROLE_GROUP[role] !== "LINE") continue;
        expect(spot, `${c.label} ${role}`).toMatchObject({ y: 1, stance: "DOWN" });
        expect(Math.abs(spot.x), `${c.label} ${role}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it("lines a dropping lineman up where he would rush from, so the drop does not show", () => {
    expect(find("DEF_NICKEL_FIRE_ZONE vs GUN_SPREAD_RT").beats.aligned.DE_R).toEqual(
      find("DEF_NICKEL_COVER_3_SKY vs GUN_SPREAD_RT").beats.aligned.DE_R,
    );
  });

  it("walks a backer up to 2.5 for a called blitz and keeps a disguised one at 4.5", () => {
    expect(at(find("DEF_NICKEL_DOUBLE_A_BLITZ vs GUN_DOUBLES_RT").beats.aligned.LB_W)).toEqual([-1, 2.5]);
    expect(at(find("DEF_NICKEL_FIRE_ZONE vs GUN_DOUBLES_RT").beats.aligned.LB_W)).toEqual([-2.5, 4.5]);
  });

  it("shades a man defender away from his help: outside with a safety in the middle, inside with none", () => {
    // Cover 1 has its free safety in the post: the corner on X (at -18) plays outside him.
    expect(at(find("DEF_NICKEL_COVER_1 vs GUN_DOUBLES_RT").beats.aligned.CB_L)).toEqual([-19, 1]);
    // Cover 0 has nobody deep: inside.
    expect(at(find("DEF_NICKEL_COVER_0_BLITZ vs GUN_DOUBLES_RT").beats.aligned.CB_L)).toEqual([-17, 1]);
  });

  it("brackets a man covered by a backer and a corner: the backer a yard inside him, the corner outside", () => {
    // Goal Line Man: the Will and the right corner both have the Y, inline at 4.5.
    const goalLine = find("DEF_GOAL_LINE_MAN vs GOAL_LINE_RT").beats.aligned;
    expect(at(goalLine.LB_W)).toEqual([3.5, 4.5]);
    expect(at(goalLine.CB_R)).toEqual([5.5, 1]);
  });

  it("puts a flat safety on a one-receiver side at the apex, not over the corner's man", () => {
    // Cover 3 Sky's strong safety plays the left flat; against Trips Right the left has only X.
    expect(at(find("DEF_NICKEL_COVER_3_SKY vs GUN_TRIPS_RT").beats.aligned.S_S)).toEqual([-10.5, 8]);
  });

  it("stands a safety who plays the hole in the middle, not over a slot to his run fit's side", () => {
    // Cover 1's strong safety has the #3 to the right; against Doubles there is none, and his
    // fallback is the hole.
    expect(at(find("DEF_NICKEL_COVER_1 vs GUN_DOUBLES_RT").beats.aligned.S_S)).toEqual([0, 8]);
    // Against Trips he has his man: outside him, with the free safety in the post.
    expect(at(find("DEF_NICKEL_COVER_1 vs GUN_TRIPS_RT").beats.aligned.S_S)).toEqual([9.5, 7]);
  });

  it("stands a two-high safety 12 deep and 9 out, and a single-high one 13 deep in the middle", () => {
    const twoHigh = find("DEF_NICKEL_COVER_2 vs GUN_DOUBLES_RT").beats.aligned;
    expect([at(twoHigh.S_F), at(twoHigh.S_S)]).toEqual([
      [-9, 12],
      [9, 12],
    ]);
    expect(at(find("DEF_NICKEL_COVER_1 vs GUN_DOUBLES_RT").beats.aligned.S_F)).toEqual([0, 13]);
  });

  it("steps a zone player back a yard rather than stand on a man defender's spot", () => {
    // Goal Line Man against Gun Bunch: the Will has the bunch's tight end; the Sam, with no
    // second tight end to cover, falls back to his zone over the same ground and gives a yard.
    const bunch = find("DEF_GOAL_LINE_MAN vs GUN_BUNCH_RT").beats.aligned;
    expect(at(bunch.LB_W)).toEqual([5, 4.5]);
    expect(at(bunch.LB_S)).toEqual([5.5, 5.5]);
  });
});

// --- beats 3 and 6 -------------------------------------------------------------------------------

describe("beats 3 and 6: the looks, and the last movement into the snap", () => {
  const sky = byId("DEF_NICKEL_COVER_3_SKY");
  const draw = (card: AnyDefensiveCard, id: string, front?: FrontLookDraw): PreSnapBeats => {
    const input = inputOf(formation(id), card, front);
    if (input === undefined) throw new Error("front look not worn");
    return playPreSnap(input);
  };

  it("holds a late Show 2 to the snap: both safeties at the deep halves, though one plays the middle", () => {
    const late = draw(applyLooks(sky, { looks: [SHOW_2], timing: "LATE" }), "GUN_TRIPS_RT");
    expect(at(late.aligned.S_F)).toEqual([0, 13]);
    expect([at(late.shown.S_F), at(late.shown.S_S)]).toEqual([
      [9, 12],
      [-9, 12],
    ]);
    expect([at(late.atSnap.S_F), at(late.atSnap.S_S)]).toEqual([
      [9, 12],
      [-9, 12],
    ]);
  });

  it("finishes an early rotation before the snap: the safeties are at their played spots", () => {
    const early = draw(applyLooks(sky, { looks: [SHOW_2], timing: "EARLY" }), "GUN_TRIPS_RT");
    expect(at(early.shown.S_S)).toEqual([-9, 12]);
    expect(early.atSnap).toEqual(early.aligned);
  });

  it("holds a corner look until the snap whatever the safeties' timing", () => {
    const early = draw(applyLooks(sky, { looks: [SHOW_2, PRESS], timing: "EARLY" }), "GUN_DOUBLES_RT");
    expect([at(early.atSnap.CB_L), at(early.atSnap.CB_R)]).toEqual([
      [-19, 1],
      [19, 1],
    ]);
    expect(early.atSnap.S_F).toEqual(early.aligned.S_F);
  });

  it("keeps the Mug's backers walked up at 1.5 in the A gaps, each behind his tackle", () => {
    const mug = draw(sky, "GUN_DOUBLES_RT", { cardId: sky.id, look: "MUG" });
    expect([at(mug.atSnap.LB_W), at(mug.atSnap.LB_M)]).toEqual([
      [-1, 1.5],
      [1, 1.5],
    ]);
    expect([at(mug.atSnap.DT_L), at(mug.atSnap.DT_R)]).toEqual([
      [-1, 1],
      [1, 1],
    ]);
  });

  it("ends every Stem on time until ADR-091 builds its endings: shown one gap over, set in its played front", () => {
    const stem = draw(sky, "GUN_DOUBLES_RT", { cardId: sky.id, look: "STEM", side: "LEFT" });
    expect(stem.shown.DT_R).not.toEqual(stem.aligned.DT_R);
    expect(stem.atSnap).toEqual(stem.aligned);
  });

  it("moves the creeper forward at three yards a second from his aligned spot", () => {
    const creeper = draw(byId("DEF_NICKEL_COVER_3_SKY+CREEPER"), "SINGLEBACK_ACE_RT");
    expect(creeper.atSnap.LB_W).toEqual({
      ...creeper.aligned.LB_W,
      moving: { dx: 0, dy: -1, yardsPerSecond: 3 },
    });
    expect(creeper.atSnap.LB_M?.moving).toBeUndefined();
  });

  it("moves nobody else: a man who shows what he plays is at his aligned spot when the ball is snapped", () => {
    for (const c of CASES) {
      const creeps = new Set(
        c.card.pressure === "CREEPER"
          ? c.input.defense.call.rush.map((r) => String(r.rusher)).filter((p) => {
              const role = (Object.entries(c.input.defense.byRole) as [DefenseRole, unknown][]).find(([, q]) => String(q) === p)?.[0];
              return role !== undefined && DEFENSE_ROLE_GROUP[role] !== "LINE";
            })
          : [],
      );
      for (const [role, spot] of Object.entries(c.beats.atSnap) as [DefenseRole, SnapSpot][]) {
        if (creeps.has(String(c.input.defense.byRole[role]))) continue;
        if (c.beats.shown[role] !== undefined && at(c.beats.shown[role]).join() !== at(c.beats.aligned[role]).join()) continue;
        expect(spot, `${c.label} ${role}`).toEqual(c.beats.aligned[role]);
      }
    }
  });
});

// --- loud, not forgiving -----------------------------------------------------------------------------

describe("what the beats refuse", () => {
  it("refuses a picture of one card drawn over another card's instance", () => {
    const input = inputOf(formation("GUN_TRIPS_RT"), byId("DEF_NICKEL_COVER_3_SKY"));
    if (input === undefined) throw new Error("no input");
    expect(() => playPreSnap({ ...input, card: byId("DEF_NICKEL_COVER_2") })).toThrow(PlaybookError);
  });

  it("refuses a dropping lineman with no run fit to line up over: there is no default spot", () => {
    const sky = byId("DEF_NICKEL_COVER_3_SKY");
    const dropper: AnyDefensiveCard = {
      ...sky,
      id: "TEST_DROPPER_NO_FIT",
      duties: { ...sky.duties, DE_R: { kind: "ZONE", responsibility: "HOOK_CURL", zone: { horizontal: "RH", vertical: "SHORT" }, laneSpan: 0, depthSpan: 1 } },
    };
    const input = inputOf(formation("GUN_TRIPS_RT"), dropper);
    if (input === undefined) throw new Error("no input");
    expect(() => playPreSnap(input)).toThrow(/drops with no run fit/);
  });
});
