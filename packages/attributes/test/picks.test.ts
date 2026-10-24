import { describe, it, expect } from "vitest";
import { teamId } from "@ff/contracts";
import { PICKS_SOURCE, REAL_TEAM_SLOTS, tradedPicks } from "../src/importer/real/index.js";

const teams = REAL_TEAM_SLOTS.map((_, i) => ({ id: teamId(`T${String(i + 1).padStart(2, "0")}`) }));
const code = (id: string) => REAL_TEAM_SLOTS[Number(id.slice(1)) - 1];

describe("traded picks (ADR-088 R5, Q6)", () => {
  const picks = tradedPicks(teams);

  it("gives every traded pick exactly one owner, never its own team", () => {
    const keys = picks.map((p) => `${p.draft}/${p.round}/${String(p.originalTeam)}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of picks) expect(p.owner).not.toBe(p.originalTeam);
  });

  it("stays within the source's rounds and drafts", () => {
    for (const p of picks) {
      expect((PICKS_SOURCE.rounds as readonly number[]).includes(p.round)).toBe(true);
      expect(p.draft).toBeGreaterThanOrEqual(2027);
      expect(p.kind).toBe("REGULAR");
    }
  });

  it("maps real teams to their slots (the Rams' LAR is nflverse's LA)", () => {
    const rams = picks.filter((p) => code(String(p.originalTeam)) === "LA").map((p) => [p.draft, p.round, code(String(p.owner))]);
    expect(rams).toEqual([[2027, 1, "CLE"], [2027, 3, "KC"], [2028, 2, "CLE"], [2029, 3, "CLE"]]);
    expect(picks.filter((p) => code(String(p.owner)) === "NYJ" && p.draft === 2027 && p.round === 1)).toHaveLength(2);
  });

  it("keeps conditions in the source's words", () => {
    expect(picks.find((p) => code(String(p.originalTeam)) === "GB")!.condition).toMatch(/Less favorable of own and GB/);
  });
});
