import { describe, it, expect } from "vitest";
import { buildDeadMoney, nameKey, OTC_PAGE, parseDeadMoney, REAL_TEAM_SLOTS } from "../src/importer/real/index.js";

const row = (name: string, amount: string) =>
  `<tr><td class="player-information"><div class="name"><a href="/player/x/1/">${name}</a></div></td><td>${amount}</td></tr>`;
const table = (rows: string[], total: string) =>
  `<h4>Non-Active Roster Cap Charges</h4><h5>Dead Money</h5><table class="salary-cap-table non-active"><thead><tr><th>Name</th><th>Cap Number</th></tr></thead>` +
  `<tbody>${rows.join("")}<tr><td><strong>TOTAL</strong></td><td><strong>${total}</strong></td></tr></tbody></table>`;
const page =
  `<div class="salary-cap-container" id="y2026"><table><tr><td>Active player</td><td>$9,000,000</td></tr></table>` +
  table([row("Alpha Real Jr.", "$10,000,000"), row("Beta Real", "$500,000"), row("Beta Real", "$250,000")], "$11,000,000") +
  `<h5>Practice Squad</h5><table><tr><td>Practice player</td><td>$1</td></tr></table></div>` +
  `<div class="salary-cap-container" id="y2027">` + table([row("Alpha Real Jr.", "$4,000,000")], "$4,000,000") + `</div>` +
  `<div class="salary-cap-container" id="y2028"><h4>Non-Active Roster Cap Charges</h4></div>`;

describe("dead money from OverTheCap (ADR-088 R4, ADR-085 K3)", () => {
  const rows = parseDeadMoney(page);

  it("reads each season's dead-money table only, keeping the gap to TOTAL as an unnamed row", () => {
    expect(rows).toEqual([
      { season: 2026, name: "Alpha Real Jr.", amount: 10_000_000 },
      { season: 2026, name: "Beta Real", amount: 500_000 },
      { season: 2026, name: "Beta Real", amount: 250_000 },
      { season: 2026, name: "", amount: 250_000 },
      { season: 2027, name: "Alpha Real Jr.", amount: 4_000_000 },
    ]);
  });

  it("refuses a page whose rows add up to more than its TOTAL", () => {
    expect(() => parseDeadMoney(`<div id="y2026">${table([row("A", "$500")], "$400")}</div>`)).toThrow(/TOTAL/);
  });

  it("names a let-go player by stand-in id when he is on a roster today, else by a placeholder", () => {
    const built = buildDeadMoney({
      season: 2026,
      rows: { MIA: rows },
      teamOf: (code) => `T${String(REAL_TEAM_SLOTS.indexOf(code) + 1).padStart(2, "0")}`,
      sealed: { g1: { id: "r:7", name: "Made Up" }, g2: { id: "r:8", name: "Also Made" } },
      realNames: new Map([["g1", "Alpha Real"], ["g2", "Someone Else"]]),
    });
    expect(built.charges.map((c) => [c.team, c.player, c.season, c.amount])).toEqual([
      ["T10", "r:7", 2026, 10_000_000],
      ["T10", "gone-T10-01", 2026, 500_000],
      ["T10", "gone-T10-01", 2026, 250_000],
      ["T10", "gone-T10-rest", 2026, 250_000],
      ["T10", "r:7", 2027, 4_000_000],
    ]);
    expect(built).toMatchObject({ matched: 2, placeholders: 1, unitemized: 250_000 });
    // Nothing real leaves: no charge carries a name.
    expect(JSON.stringify(built.charges)).not.toMatch(/Real/);
  });

  it("matches neither of two players who share a name", () => {
    const built = buildDeadMoney({
      season: 2026, rows: { MIA: [{ season: 2026, name: "Beta Real", amount: 1 }] }, teamOf: () => "T10",
      sealed: { g1: { id: "r:1", name: "x" }, g2: { id: "r:2", name: "y" } },
      realNames: new Map([["g1", "Beta Real"], ["g2", "Beta Real II"]]),
    });
    expect(built.charges[0]!.player).toBe("gone-T10-01");
  });

  it("compares names loosely and knows a page for every team", () => {
    expect(nameKey("Lonnie Johnson Jr.")).toBe(nameKey("lonnie johnson"));
    expect(nameKey("Nick Westbrook-Ikhine")).toBe("nick westbrook ikhine");
    expect(Object.keys(OTC_PAGE).sort()).toEqual([...REAL_TEAM_SLOTS].sort());
  });
});
