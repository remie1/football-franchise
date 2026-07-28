import { describe, expect, it } from "vitest";
import {
  backfieldRoles,
  eligibleRoles,
  laneSide,
  laneWidth,
  mirrorAlignment,
  receiverNumbering,
} from "../src/alignment.js";
import type { AlignedRole } from "../src/alignment.js";
import {
  GUN_BUNCH_RT,
  GUN_TRIPS_RT,
  I_FORM_PRO_RT,
  SINGLEBACK_ACE_RT,
  alignedRoles,
  mirrorFormation,
} from "../src/formations.js";

describe("lanes", () => {
  it("puts the wide and hash lanes on their sides and the centre on neither", () => {
    expect(laneSide("LW")).toBe("LEFT");
    expect(laneSide("LH")).toBe("LEFT");
    expect(laneSide("C")).toBe("MIDDLE");
    expect(laneSide("RH")).toBe("RIGHT");
    expect(laneSide("RW")).toBe("RIGHT");
  });

  it("measures width outward from the centre", () => {
    expect(laneWidth("C")).toBe(0);
    expect(laneWidth("LH")).toBe(1);
    expect(laneWidth("RW")).toBe(2);
  });
});

describe("the end-man-on-the-line rule", () => {
  it("makes off-the-ball and backfield players eligible", () => {
    const eligible = eligibleRoles(alignedRoles(SINGLEBACK_ACE_RT));
    expect(eligible).toEqual(expect.arrayContaining(["X", "Z", "SLOT", "TE_Y", "RB"]));
    expect(eligible).toHaveLength(5);
  });

  it("covers a lineman-adjacent receiver when a team-mate is outside him on the line", () => {
    const aligned: readonly AlignedRole[] = [
      { role: "TE_Y", alignment: { spot: "LINE", lane: "RH", outsideRank: 1 } },
      { role: "Z", alignment: { spot: "LINE", lane: "RW", outsideRank: 0 } },
    ];
    expect(eligibleRoles(aligned)).toEqual(["Z"]);
  });

  it("uncovers the same tight end when the receiver plays off the ball", () => {
    const aligned: readonly AlignedRole[] = [
      { role: "TE_Y", alignment: { spot: "LINE", lane: "RH", outsideRank: 1 } },
      { role: "Z", alignment: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 } },
    ];
    expect(eligibleRoles(aligned)).toEqual(["TE_Y", "Z"]);
  });
});

describe("receiver numbering", () => {
  it("counts outside in, per side", () => {
    const numbering = receiverNumbering(alignedRoles(GUN_TRIPS_RT));
    expect(numbering.RIGHT).toEqual(["Z", "SLOT", "TE_Y"]);
    expect(numbering.LEFT).toEqual(["X"]);
  });

  it("numbers a bunch by rank rather than by lane, since all three share a lane", () => {
    const numbering = receiverNumbering(alignedRoles(GUN_BUNCH_RT));
    expect(numbering.RIGHT).toEqual(["Z", "SLOT", "TE_Y"]);
  });

  it("excludes backs, who are named as backs and never numbered", () => {
    const aligned = alignedRoles(I_FORM_PRO_RT);
    expect(receiverNumbering(aligned).RIGHT).toEqual(["Z", "TE_Y"]);
    expect(backfieldRoles(aligned)).toEqual(["RB", "FB"]);
  });
});

describe("mirroring", () => {
  it("is an involution on an alignment", () => {
    const alignment = { spot: "OFF_LINE", lane: "LH", outsideRank: 2 } as const;
    expect(mirrorAlignment(mirrorAlignment(alignment))).toEqual(alignment);
  });

  it("flips a formation's lanes and strength but keeps role names", () => {
    const flipped = mirrorFormation(GUN_TRIPS_RT);
    expect(flipped.strength).toBe("LEFT");
    expect(flipped.alignments.X?.lane).toBe("RW");
    expect(flipped.alignments.Z?.lane).toBe("LW");
    expect(receiverNumbering(alignedRoles(flipped)).LEFT).toEqual(["Z", "SLOT", "TE_Y"]);
  });

  it("returns the original when mirrored twice", () => {
    const twice = mirrorFormation(mirrorFormation(GUN_TRIPS_RT));
    expect(twice.alignments).toEqual(GUN_TRIPS_RT.alignments);
    expect(twice.strength).toBe(GUN_TRIPS_RT.strength);
    expect(twice.id).toBe(GUN_TRIPS_RT.id);
  });
});
