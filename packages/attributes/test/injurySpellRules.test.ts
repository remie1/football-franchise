/**
 * ADR-087 AB7: the spell rules copied from calibration (`importer/real/injuryRules.ts`), pinned by the
 * shared made-up fixture `fixtures/injury-spell-rules.json`. Calibration's test of the same name runs the
 * same rows through its originals and pins the same sha256, so a change on one side that the other does
 * not make fails one of the two. Every row is made up (ids g:NN and p:NN, teams T1 to T4).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BODY_KEYWORDS, BODY_PARTS, bodyPart, buildTimelines, COVID, ILLNESS, NON_INJURY, normaliseGameStatus, normaliseName, normalisePracticeStatus,
  reportTextKind, spellsOf,
} from "../src/importer/real/injuryRules.js";
import {
  gameRows, INJURY_REPORT_COLUMNS, INJURY_ROSTER_COLUMNS, INJURY_SCHEDULE_COLUMNS, INJURY_SNAP_COLUMNS, loadInjuryScheduleRows,
  loadInjurySeasonRows, reportRows, rosterRows, snapRows,
} from "../src/importer/real/injuryRows.js";
import { REAL_INJURY_KINDS } from "../src/importer/real/index.js";
import { leakCount, projecting } from "./helpers.js";

const FIXTURE = join(__dirname, "fixtures", "injury-spell-rules.json");
const text = readFileSync(FIXTURE, "utf8");
/** The fixture's sha256: the same value in calibration's `injurySpellRules.test.ts`. */
const FIXTURE_SHA256 = "6c3bd75a32bfa55e989568ea5da4e14fdae007670eb91c51e04c5d9847104869";
/** The `parts` vectors' sha256 (canonical JSON): the same value in franchise's `players.pastInjuries.test.ts`, which holds its own copy. */
const PARTS_VECTORS_SHA256 = "b71e54786cc48840f96d251e7d50b315895d6ce680e8415991cc5b72ed1f85b3";
/**
 * The keyword tables' sha256 (review finding 15): `NON_INJURY`, `COVID`, `ILLNESS` and `BODY_KEYWORDS`, each
 * regex as its source and flags, in order. The same value in calibration's `injurySpellRules.test.ts` (its
 * originals) and franchise's `players.pastInjuries.test.ts` (its copy), so a keyword added to or dropped from
 * any one copy fails that side, even when no vector holds the word.
 */
const KEYWORD_TABLES_SHA256 = "90ed3cdf4d9af6e409f51ccf7c1b8b8aa30429f58999b685ea0b891c14e961d9";

type Row = Record<string, unknown>;
interface Fixture {
  readonly seasons: readonly number[];
  readonly rows: { readonly schedules: Row[]; readonly rosters: Row[]; readonly reports: Row[]; readonly snaps: Row[] };
  readonly expected: { readonly spells: readonly Row[]; readonly coverage: readonly Row[] };
  readonly parts: readonly { readonly text: string; readonly slug: string; readonly part: string }[];
  readonly kinds: readonly string[];
  readonly statuses: { readonly game: readonly { raw: string | null; want: string }[]; readonly practice: readonly { raw: string | null; want: string }[] };
  readonly names: readonly { raw: string; want: string }[];
}
const fixture = JSON.parse(text) as Fixture;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** The importer's own `parts` vectors, as literals (ruling on critic 14: each side holds its copy, pinned by one sha256). */
const PARTS: readonly { readonly text: string; readonly slug: string; readonly part: string }[] = [
  { text: "Knee", slug: "knee", part: "knee" }, { text: "Left Knee", slug: "left-knee", part: "knee" },
  { text: "Right ACL", slug: "right-acl", part: "knee" }, { text: "Ankle", slug: "ankle", part: "ankle" },
  { text: "Ankle, knee", slug: "ankle-knee", part: "ankle" }, { text: "Hamstring", slug: "hamstring", part: "hamstring" },
  { text: "Hamstring, Achilles", slug: "hamstring-achilles", part: "hamstring" }, { text: "Achilles", slug: "achilles", part: "achilles" },
  { text: "Concussion", slug: "concussion", part: "concussion/head" }, { text: "Head", slug: "head", part: "concussion/head" },
  { text: "Shoulder", slug: "shoulder", part: "shoulder" }, { text: "AC joint", slug: "ac-joint", part: "shoulder" },
  { text: "Groin", slug: "groin", part: "groin/hip" }, { text: "Hip", slug: "hip", part: "groin/hip" },
  { text: "Foot", slug: "foot", part: "foot/toe" }, { text: "Toe", slug: "toe", part: "foot/toe" },
  { text: "Calf", slug: "calf", part: "calf/shin" }, { text: "Fibula", slug: "fibula", part: "calf/shin" },
  { text: "Quad", slug: "quad", part: "quad/thigh" }, { text: "Thigh", slug: "thigh", part: "quad/thigh" },
  { text: "Back", slug: "back", part: "back/neck" }, { text: "Neck", slug: "neck", part: "back/neck" },
  { text: "Hand", slug: "hand", part: "hand/wrist" }, { text: "Thumb", slug: "thumb", part: "hand/wrist" },
  { text: "Wrist", slug: "wrist", part: "hand/wrist" }, { text: "Elbow", slug: "elbow", part: "elbow/arm" },
  { text: "Biceps", slug: "biceps", part: "elbow/arm" }, { text: "Chest", slug: "chest", part: "chest/ribs/abdomen" },
  { text: "Pectoral", slug: "pectoral", part: "chest/ribs/abdomen" }, { text: "Ribs", slug: "ribs", part: "chest/ribs/abdomen" },
  { text: "Abdomen", slug: "abdomen", part: "chest/ribs/abdomen" }, { text: "Illness", slug: "illness", part: "illness" },
  { text: "Not injury related", slug: "not-injury-related", part: "unknown" }, { text: "Personal", slug: "personal", part: "unknown" },
  { text: "Rest", slug: "rest", part: "unknown" }, { text: "COVID-19", slug: "covid-19", part: "unknown" },
  { text: "Eye", slug: "eye", part: "other" }, { text: "Reserve Injured Reserve", slug: "reserve-injured-reserve", part: "other" },
  { text: "Reserve Physically Unable to Perform", slug: "reserve-physically-unable-to-perform", part: "other" },
];

/** The fixture's rows as the snapshot's files: one schedules file, and each season's three. */
function files(): Record<string, Row[]> {
  const out: Record<string, Row[]> = { schedules: fixture.rows.schedules };
  for (const y of fixture.seasons) {
    out[`rosters${y}`] = fixture.rows.rosters.filter((r) => r.season === y);
    out[`injuries${y}`] = fixture.rows.reports.filter((r) => r.season === y);
    out[`snaps${y}`] = fixture.rows.snaps.filter((r) => r.season === y);
  }
  return out;
}

/** The copy run on the fixture, through the importer's loaders and the column lists it reads. */
async function copied() {
  const read = projecting(files());
  const games = gameRows(await loadInjuryScheduleRows("made-up", read), fixture.seasons);
  const spells: Row[] = [];
  const coverage: Row[] = [];
  for (const y of fixture.seasons) {
    const raw = await loadInjurySeasonRows("made-up", y, read);
    const built = buildTimelines({
      games, rosters: rosterRows(raw.rosters, y, `rosters${y}`), reports: reportRows(raw.reports, y, `injuries${y}`), snaps: snapRows(raw.snaps, y, `snaps${y}`),
    });
    for (const t of built.timelines) {
      for (const sp of spellsOf(t)) {
        spells.push({
          season: sp.season, team: sp.team, gsis: sp.gsisId, startIndex: sp.startIndex, startWeek: sp.startWeek, onset: sp.onset, afterBye: sp.afterBye,
          cls: sp.cls, firstKind: sp.firstKind, ir: sp.ir, bodyPart: sp.bodyPart, gamesMissed: sp.gamesMissed, weeksOut: sp.weeksOut, end: sp.end, censored: sp.censored,
        });
      }
    }
    coverage.push(...built.coverage.filter((c) => c.season === y).map((c) => ({ ...c })));
  }
  return { spells, coverage };
}

describe("the copied spell rules on the shared made-up fixture (ADR-087 AB7)", () => {
  it("read the fixture both sides pin", () => {
    expect(sha256(text)).toBe(FIXTURE_SHA256);
  });

  it("give exactly the fixture's spells and coverage, through the importer's loaders and columns", async () => {
    const got = await copied();
    expect(got.spells).toEqual(fixture.expected.spells);
    expect(got.coverage).toEqual(fixture.expected.coverage);
    // Every case the fixture holds is in the spells: a bye inside and before, IR straight on, the roster lag, both
    // censored ends, illness and the non-football list, both early onsets, an unclear one after a bye.
    const s = fixture.expected.spells;
    expect(s.length).toBe(23);
    expect(new Set(s.map((x) => x.end))).toEqual(new Set(["RETURNED", "SEASON_END", "LEFT"]));
    expect(new Set(s.map((x) => x.onset))).toEqual(new Set(["AFTER_PLAYED", "BEFORE_SEASON", "UNCLEAR"]));
    expect(new Set(s.map((x) => x.cls))).toEqual(new Set(["FOOTBALL", "ILLNESS", "NFI"]));
  });

  it("read each file's columns only: every listed column is in the fixture's rows (the superset)", () => {
    const has = (rows: Row[], cols: readonly string[]) => cols.filter((c) => rows.some((r) => !Object.hasOwn(r, c))).length;
    expect(has(fixture.rows.schedules, INJURY_SCHEDULE_COLUMNS), "schedule columns missing").toBe(0);
    expect(has(fixture.rows.rosters, INJURY_ROSTER_COLUMNS), "roster columns missing").toBe(0);
    expect(has(fixture.rows.reports, INJURY_REPORT_COLUMNS), "report columns missing").toBe(0);
    expect(has(fixture.rows.snaps, INJURY_SNAP_COLUMNS), "snap columns missing").toBe(0);
  });

  it("read status and name texts as calibration does", () => {
    for (const v of fixture.statuses.game) expect(normaliseGameStatus(v.raw), String(v.raw)).toBe(v.want);
    for (const v of fixture.statuses.practice) expect(normalisePracticeStatus(v.raw), String(v.raw)).toBe(v.want);
    for (const v of fixture.names) expect(normaliseName(v.raw), v.raw).toBe(v.want);
  });

  it("class each parts text as the fixture does, the slug as development.ts writes a copied kind; the vectors are the pinned ones", () => {
    const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    expect(PARTS).toEqual(fixture.parts);
    expect(sha256(JSON.stringify(PARTS))).toBe(PARTS_VECTORS_SHA256);
    for (const p of PARTS) {
      expect(bodyPart(p.text), p.text).toBe(p.part);
      expect(slug(p.text), p.text).toBe(p.slug);
      // Read back from its slug ("-" as " "), a copied kind gives the same class (franchise's `realKindOf` relies on it).
      expect(bodyPart(p.slug.replace(/-/g, " ")), p.slug).toBe(p.part);
      expect(reportTextKind(p.text) === "FOOTBALL" || p.part === "illness" || p.part === "unknown", p.text).toBe(true);
    }
  });

  it("have the keyword tables the other two copies have, word for word (review finding 15)", () => {
    const re = (r: RegExp) => [r.source, r.flags];
    const tables = JSON.stringify({ nonInjury: re(NON_INJURY), covid: re(COVID), illness: re(ILLNESS), parts: BODY_KEYWORDS.map(([part, r]) => [part, ...re(r)]) });
    expect(sha256(tables)).toBe(KEYWORD_TABLES_SHA256);
  });

  it("have the 17 kinds the block may carry: real: and each class, \"/\" written \"-\"", () => {
    expect(fixture.kinds).toEqual(BODY_PARTS.map((p) => `real:${p.replace(/\//g, "-")}`));
    expect([...REAL_INJURY_KINDS]).toEqual(fixture.kinds);
  });
});

describe("no named cases in the copy, the new importer files, their tests or the fixture (§3.3; critic 2; review findings 4 and 6)", () => {
  /** Runs of two or more capitalised words (each with a lower-case letter, so codes like ACL do not count). */
  const RUN = /\p{Lu}(?=[\p{L}'.-]*\p{Ll})[\p{L}'.-]+(?: \p{Lu}(?=[\p{L}'.-]*\p{Ll})[\p{L}'.-]+)+/gu;
  /** Runs of two or more words in capitals alone (a name written in capitals; RUN does not see these). */
  const CAPS = /(?<![\p{L}\d_])\p{Lu}{2,}(?: \p{Lu}{2,})+(?![\p{L}\d_])/gu;
  /** The runs these files may hold: report and practice texts, one rule's name, and the made-up names' spellings. */
  const ALLOWED = new Set([
    "Did Not Participate In Practice", "Full Participation", "Limited Participation", "Iron Rule", "Left Foot", "Left Knee",
    "Reserve Injured Reserve", "Reserve Physically Unable", "Made-Up Player", "Madé Úp Player", "Some Other Made Up Name",
  ]);
  /** The made-up names the files use, whole (review finding 4: an exact list, not a prefix, so nothing can follow one unseen). */
  const MADE_UP = /^Made Up(?: Player(?: (?:Seventeen(?: Jr\.)?|Eighteen|TwentyThree|TwentyFour|Other))?)?$/;
  /** The capitals-only runs these files may hold: the files' own headings. */
  const CAPS_ALLOWED = new Set(["THE SPELL RULES", "THE INJURIES SNAPSHOT", "THE STAND", "PAST INJURIES"]);
  /**
   * The importer's new files, the fixture, and the tests that hold rows written as the snapshot's columns
   * (review finding 6). Franchise's `realParts.ts` is scanned by franchise's own test, and calibration's two
   * files by calibration's: no package reads another's sources.
   */
  const FILES = [
    "src/importer/real/injuryRules.ts", "src/importer/real/injuryRows.ts", "src/importer/real/injurySpells.ts", "src/importer/real/injurySnapshot.ts",
    "src/importer/real/injuriesMain.ts", "src/importer/real/injuriesCommand.ts", "src/importer/real/pastInjuries.ts", "test/fixtures/injury-spell-rules.json",
    "test/helpers.ts", "test/injurySpells.test.ts", "test/standinInjuries.test.ts", "test/injurySpellRules.test.ts",
  ];
  it("holds no capitalised run outside the allowlist, and nothing shaped like a named case (counted, never shown)", () => {
    for (const f of FILES) {
      const t = readFileSync(join(__dirname, "..", f), "utf8");
      const outside = (t.match(RUN) ?? []).filter((r) => !ALLOWED.has(r) && !MADE_UP.test(r)).length;
      expect(outside, `capitalised runs outside the allowlist in ${f}`).toBe(0);
      expect((t.match(CAPS) ?? []).filter((r) => !CAPS_ALLOWED.has(r)).length, `capitals-only runs outside the allowlist in ${f}`).toBe(0);
      expect(leakCount(t, /[A-Z][a-z]+ [A-Z][a-z'.-]+ \(?[A-Z]{2,3} (19|20)\d\d/), `named cases in ${f}`).toBe(0);
      expect(leakCount(t, /\d{2}-\d{7}/), `gsis-like ids in ${f}`).toBe(0);
      expect(leakCount(t, /[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/), `pfr-like ids in ${f}`).toBe(0);
    }
  });

  it("sees a name after the made-up prefix, and a name in capitals (made-up planted texts)", () => {
    const count = (t: string) => ({
      runs: (t.match(RUN) ?? []).filter((r) => !ALLOWED.has(r) && !MADE_UP.test(r)).length,
      caps: (t.match(CAPS) ?? []).filter((r) => !CAPS_ALLOWED.has(r)).length,
    });
    // Joined at run time, so this file's own scan does not see them.
    const words = (...w: string[]) => w.join(" ");
    expect(count("// Made Up Player Seventeen Jr. and Made Up Player")).toEqual({ runs: 0, caps: 0 });
    expect(count(`// ${words("Made Up Player", "Pretend", "Surname")}`)).toEqual({ runs: 1, caps: 0 });
    expect(count(`// ${words("PRETEND", "SURNAME")}`)).toEqual({ runs: 0, caps: 1 });
  });
});
