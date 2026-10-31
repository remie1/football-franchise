/**
 * DEAD MONEY (ADR-088 R4 part 2), as ADR-085 K3's `DeadMoneyCharge`.
 *
 * nflverse's contract file has no rows for players a team has already let go, so their leftover
 * cap charges come from OverTheCap's team pages instead: each season's "Dead Money" table, one row
 * per charge. The pages are kept in the snapshot folder (`otc/<code>.html`, gitignored, Q7) with a
 * sha256 manifest beside them.
 *
 * Names on the page are real. They are only used here, to find the stand-in of a let-go player who
 * is on a roster today; everyone else gets a made-up placeholder id (`gone-<team id>-<n>`, the stand-in team id), so nothing
 * real leaves this module. OverTheCap does not say why a charge exists, so `reason` is
 * "RELEASED" throughout (a traded player's charge looks the same; see the provenance flag).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { playerId, teamId, type DeadMoneyCharge } from "@ff/contracts";
import type { Download } from "./snapshot.js";
import type { SealedTable } from "./standins.js";

/** OverTheCap's page name for each real team. */
export const OTC_PAGE: Readonly<Record<string, string>> = {
  BAL: "baltimore-ravens", CIN: "cincinnati-bengals", CLE: "cleveland-browns", PIT: "pittsburgh-steelers",
  HOU: "houston-texans", IND: "indianapolis-colts", JAX: "jacksonville-jaguars", TEN: "tennessee-titans",
  BUF: "buffalo-bills", MIA: "miami-dolphins", NE: "new-england-patriots", NYJ: "new-york-jets",
  DEN: "denver-broncos", KC: "kansas-city-chiefs", LAC: "los-angeles-chargers", LV: "las-vegas-raiders",
  CHI: "chicago-bears", DET: "detroit-lions", GB: "green-bay-packers", MIN: "minnesota-vikings",
  ATL: "atlanta-falcons", CAR: "carolina-panthers", NO: "new-orleans-saints", TB: "tampa-bay-buccaneers",
  DAL: "dallas-cowboys", NYG: "new-york-giants", PHI: "philadelphia-eagles", WAS: "washington-commanders",
  ARI: "arizona-cardinals", LA: "los-angeles-rams", SEA: "seattle-seahawks", SF: "san-francisco-49ers",
};

export const OTC_URL = "https://overthecap.com/salary-cap";

/** One row of a page's dead-money table. Real name: importer-internal. */
export interface DeadMoneyRow {
  readonly season: number;
  readonly name: string;
  readonly amount: number;
}

const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();

/**
 * The dead-money rows of one team page. Each season is a `<div ... id="y<season>">` block; its
 * dead money is the table under the "Dead Money" heading. Where the TOTAL row is above the rows' sum,
 * the difference becomes a row with no name (`gone-<team id>-rest`), so team totals match the page.
 */
export function parseDeadMoney(html: string): DeadMoneyRow[] {
  const out: DeadMoneyRow[] = [];
  const starts = [...html.matchAll(/id="y(\d{4})"/g)].map((m) => ({ season: Number(m[1]), at: m.index }));
  starts.forEach((s, i) => {
    const block = html.slice(s.at, starts[i + 1]?.at ?? html.length);
    const h = block.indexOf("<h5>Dead Money</h5>");
    if (h < 0) return;
    const table = block.slice(h, block.indexOf("</table>", h));
    let sum = 0;
    for (const tr of table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
      const cells = [...tr[1]!.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((c) => text(c[1]!));
      if (cells.length < 2) continue;
      const amount = Number(cells[1]!.replace(/[$,]/g, ""));
      if (cells[0] === "TOTAL") {
        // Every page's TOTAL runs ~$0.4-1.2M above its rows; the gap is kept as one unnamed charge.
        if (amount < sum - 1) throw new Error(`dead money ${s.season}: rows sum to ${sum}, TOTAL says ${amount}`);
        if (amount > sum + 1) out.push({ season: s.season, name: "", amount: amount - sum });
        continue;
      }
      out.push({ season: s.season, name: cells[0]!, amount });
      sum += amount;
    }
  });
  return out;
}

/** Names compared loosely: case, punctuation and Jr./Sr./II-V ignored. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[.'’,-]/g, " ").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, " ").replace(/\s+/g, " ").trim();
}

export function buildDeadMoney(input: {
  readonly season: number;
  /** Real team code -> that team's rows. */
  readonly rows: Readonly<Record<string, readonly DeadMoneyRow[]>>;
  /** Real team code -> stand-in team id. */
  readonly teamOf: (code: string) => string;
  readonly sealed: SealedTable;
  /** gsis id -> real full name, from this season's rosters. */
  readonly realNames: ReadonlyMap<string, string>;
}): { charges: DeadMoneyCharge[]; matched: number; placeholders: number; unitemized: number } {
  // A name that two players share matches neither.
  const byName = new Map<string, string | null>();
  for (const [gsis, name] of input.realNames) {
    const s = input.sealed[gsis];
    if (s === undefined) continue;
    const k = nameKey(name);
    byName.set(k, byName.has(k) && byName.get(k) !== s.id ? null : s.id);
  }
  const charges: DeadMoneyCharge[] = [];
  let matched = 0;
  let unitemized = 0;
  const gone = new Set<string>();
  for (const code of Object.keys(input.rows).sort()) {
    const team = input.teamOf(code);
    const placeholder = new Map<string, string>();
    for (const r of input.rows[code]!) {
      if (r.season < input.season || r.amount <= 0) continue;
      const k = nameKey(r.name);
      let player: string;
      if (k === "") {
        player = `gone-${team}-rest`;
        unitemized += r.amount;
      } else if (byName.get(k) != null) {
        player = byName.get(k)!;
        matched++;
      } else {
        if (!placeholder.has(k)) placeholder.set(k, `gone-${team}-${String(placeholder.size + 1).padStart(2, "0")}`);
        player = placeholder.get(k)!;
        gone.add(player);
      }
      charges.push({ team: teamId(team), player: playerId(player), season: r.season, amount: r.amount, reason: "RELEASED" });
    }
  }
  return { charges, matched, placeholders: gone.size, unitemized };
}

export interface OtcManifest {
  readonly fetchedAt: string;
  readonly files: Readonly<Record<string, { readonly url: string; readonly bytes: number; readonly sha256: string }>>;
}

/** Fetch the 32 team pages into `<dir>/otc/` (a snapshot folder) with a manifest. */
export async function fetchOtcPages(dir: string, now: Date, download: Download): Promise<OtcManifest> {
  await mkdir(join(dir, "otc"), { recursive: true });
  const files: Record<string, OtcManifest["files"][string]> = {};
  for (const [code, page] of Object.entries(OTC_PAGE)) {
    const url = `${OTC_URL}/${page}`;
    const body = await download(url);
    await writeFile(join(dir, "otc", `${code}.html`), body);
    files[code] = { url, bytes: body.byteLength, sha256: createHash("sha256").update(body).digest("hex") };
  }
  const manifest = { fetchedAt: now.toISOString(), files };
  await writeFile(join(dir, "otc", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** OverTheCap turns away requests without a browser-like user agent. */
export const otcDownload: Download = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

export async function readOtcRows(dir: string): Promise<Record<string, DeadMoneyRow[]>> {
  const out: Record<string, DeadMoneyRow[]> = {};
  for (const code of Object.keys(OTC_PAGE)) out[code] = parseDeadMoney(await readFile(join(dir, "otc", `${code}.html`), "utf8"));
  return out;
}
