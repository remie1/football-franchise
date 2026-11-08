/**
 * ADR-087 §12.3.7 (AB7; contracts P8): the stand-ins' real injuries before the league's first day, seeded
 * into the players' injury memory once on the spot path (`seedPastInjuries`), and a copied `real:` kind
 * read as this game's kind there (`realKindOf`, in `heal`). Made-up players and records only: franchise
 * reads no attributes file (Iron Rule 1), so the body-part vectors are this side's own literal copy,
 * pinned by the sha256 the importer's copy pins too.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, attrId, createRng, gameId, getAttr, playerId, teamId,
  type AttributeMap, type CalendarStamp, type FranchiseEvent, type GameParticipation, type InjuryRecord, type PlayerState, type Team,
} from "@ff/contracts";
import { drawInjury, gameInjuries, healWeek, makeInjury, bandFor, seedPastInjuries } from "../src/players/injuries.js";
import { priorOfKind, realKindOf } from "../src/players/injurySpot.js";
import { CONCUSSION_MARK, INJURY_KINDS, REAL_OTHER_KIND, REAL_PART_KINDS, REPEAT_DURABILITY } from "../src/players/injuryTables.js";
import { COVID, ILLNESS, NON_INJURY, REAL_PART_KEYWORDS, realBodyPart } from "../src/players/realParts.js";
import type { PastInjury, PlayerMemory } from "../src/players/types.js";
import { buildStaff, makeSave, readSave, runSeason, PLAYER_STEP_PREFIX, type LeaguePeople } from "../src/index.js";
import { SEASON, league, resolve, startingPeople } from "./playersWorld.js";

/** The `parts` vectors' sha256 (canonical JSON): the same value in attributes' `injurySpellRules.test.ts`, which holds its own copy. */
const PARTS_VECTORS_SHA256 = "b71e54786cc48840f96d251e7d50b315895d6ce680e8415991cc5b72ed1f85b3";
/**
 * The keyword tables' sha256 (review finding 15): `NON_INJURY`, `COVID`, `ILLNESS` and `REAL_PART_KEYWORDS`,
 * each regex as its source and flags, in order. The same value in calibration's `injurySpellRules.test.ts`
 * (the originals) and attributes' (the importer's copy), so a keyword added or dropped here alone fails,
 * even where no vector holds the word.
 */
const KEYWORD_TABLES_SHA256 = "90ed3cdf4d9af6e409f51ccf7c1b8b8aa30429f58999b685ea0b891c14e961d9";

/** This side's own copy of the importer's `parts` vectors (ruling on critic 14). */
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

/** The 17 classes P8's kinds carry, as the importer names them ("/" written "-"). */
const CLASSES = [
  "knee", "ankle", "hamstring", "concussion-head", "shoulder", "groin-hip", "foot-toe", "calf-shin", "achilles", "quad-thigh",
  "back-neck", "hand-wrist", "elbow-arm", "chest-ribs-abdomen", "illness", "other", "unknown",
] as const;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const stamp = (season: number, week: number, phase: CalendarStamp["phase"] = "REGULAR_SEASON", day = 1): CalendarStamp => ({ season, phase, week, day });
const SPOT = { development: true, injuries: true, injuryRisk: "spot" } as const;
const GROUP = { development: true, injuries: true } as const;
const healed = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "INJURY_HEALED" ? [e.payload] : []));
const occurred = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "INJURY_OCCURRED" ? [e.payload] : []));

function makePlayer(id: string, o: { age?: number; durability?: number; history?: InjuryRecord[] } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 60]));
  values["durability"] = o.durability ?? 70;
  return {
    bio: { id: playerId(id), displayName: id, position: "TE", age: o.age ?? 27, heightIn: 74, weightLb: 230, draft: { year: 2020, round: 3, pick: 70 }, creditedSeasons: 6 },
    attributes: { kind: "true", values, traits: new Set(), development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.7, cone: 7.2, vertical: 32, bench: 18 } } },
    condition: { stamina: 100, morale: 0, ...(o.history ? { injuryHistory: o.history } : {}) },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}
/** Seeds made-up men alone, outside a league (the spot path, 2026). */
const seedMen = (players: readonly PlayerState[]) => seedPastInjuries<{ readonly players: readonly PlayerState[]; readonly playerMemory?: PlayerMemory }>({ players }, SPOT, 2026);
const durability = (p: PlayerState) => getAttr(p.attributes.values, attrId("durability")) + ((p.attributes.development?.carry as Record<string, number> | undefined)?.["durability"] ?? 0);

/** Made-up past injuries for a few of the test league's men: a team's starter, a backup and a street free agent. */
const PAST: Readonly<Record<string, InjuryRecord[]>> = {
  "T01-QB-0": [
    { kind: "real:knee", weeks: 5, since: stamp(SEASON - 3, 4), healed: stamp(SEASON - 3, 9) },
    { kind: "real:concussion-head", weeks: 2, since: stamp(SEASON - 1, 11), healed: stamp(SEASON - 1, 13) },
  ],
  "T02-WR-1": [{ kind: "real:other", weeks: 12, since: stamp(SEASON - 2, 6), healed: stamp(SEASON - 2, 18) }],
  "FA-RB-0": [{ kind: "real:hamstring", weeks: 1, since: stamp(SEASON - 1, 16), healed: stamp(SEASON - 1, 17) }],
};
/** What the memory holds for them once seeded. */
const SEEDED: Readonly<Record<string, PastInjury[]>> = {
  "T01-QB-0": [
    { kind: "knee-mcl", band: "LONG", at: stamp(SEASON - 3, 4), healed: stamp(SEASON - 3, 9) },
    { kind: "concussion", band: "SHORT", at: stamp(SEASON - 1, 11), healed: stamp(SEASON - 1, 13) },
  ],
  "T02-WR-1": [{ kind: "other", band: "MAJOR", at: stamp(SEASON - 2, 6), healed: stamp(SEASON - 2, 18) }],
  "FA-RB-0": [{ kind: "hamstring", band: "SHORT", at: stamp(SEASON - 1, 16), healed: stamp(SEASON - 1, 17) }],
};
function withPast(people: LeaguePeople, past: Readonly<Record<string, InjuryRecord[]>> = PAST): LeaguePeople {
  for (const id of Object.keys(past)) expect(people.players.some((p) => String(p.bio.id) === id), id).toBe(true);
  return { ...people, players: people.players.map((p) => (past[String(p.bio.id)] ? { ...p, condition: { ...p.condition, injuryHistory: past[String(p.bio.id)]! } } : p)) };
}
/** Each seeded entry as many times as the memory holds it. */
const seededCount = (memory: Record<string, readonly PastInjury[]> | undefined) =>
  Object.entries(SEEDED).flatMap(([id, want]) => want.map((w) => (memory?.[id] ?? []).filter((h) => JSON.stringify(h) === JSON.stringify(w)).length));

describe("the mapping table and realKindOf (§5.1)", () => {
  it("holds this side's own parts vectors, pinned by the importer's sha256, and classes each text as calibration does", () => {
    expect(sha256(JSON.stringify(PARTS))).toBe(PARTS_VECTORS_SHA256);
    for (const p of PARTS) {
      expect(realBodyPart(p.text), p.text).toBe(p.part);
      expect(realBodyPart(p.slug.replace(/-/g, " ")), p.slug).toBe(p.part);
    }
    expect(REAL_PART_KEYWORDS.map(([part]) => part)).toHaveLength(14);
  });

  it("maps each class to a kind the game draws, and the rest to \"other\", which no draw has", () => {
    for (const [cls, kind] of Object.entries(REAL_PART_KINDS)) {
      expect(Object.hasOwn(INJURY_KINDS, kind), `${cls} → ${kind}`).toBe(true);
      expect(CLASSES as readonly string[]).toContain(cls);
    }
    expect(Object.keys(REAL_PART_KINDS)).toEqual(CLASSES.filter((c) => c !== "other" && c !== "unknown"));
    expect(REAL_OTHER_KIND).toBe("other");
    expect(Object.hasOwn(INJURY_KINDS, REAL_OTHER_KIND)).toBe(false);
    // CHOSEN (critic 19): a real knee goes to knee-mcl, never acl.
    expect(REAL_PART_KINDS.knee).toBe("knee-mcl");
    for (const cls of CLASSES) expect(realKindOf(`real:${cls}`), cls).toBe(REAL_PART_KINDS[cls] ?? REAL_OTHER_KIND);
  });

  it("reads a copied injury's text kind by its body part: for every parts vector, the table's kind for its class", () => {
    for (const p of PARTS) expect(realKindOf(`real:${p.slug}`), p.slug).toBe(REAL_PART_KINDS[p.part.replace(/\//g, "-")] ?? REAL_OTHER_KIND);
    // A kind not starting real: comes back as it is, the game's own and any other.
    for (const kind of [...Object.keys(INJURY_KINDS), "other", "Real:knee", "realknee", ""]) expect(realKindOf(kind)).toBe(kind);
    expect(realKindOf("real:")).toBe(REAL_OTHER_KIND);
  });

  it("has the keyword tables the originals and the importer's copy have, word for word (review finding 15)", () => {
    const re = (r: RegExp) => [r.source, r.flags];
    const tables = JSON.stringify({ nonInjury: re(NON_INJURY), covid: re(COVID), illness: re(ILLNESS), parts: REAL_PART_KEYWORDS.map(([part, r]) => [part, ...re(r)]) });
    expect(sha256(tables)).toBe(KEYWORD_TABLES_SHA256);
  });

  it("holds no capitalised run outside a short list in its copied keywords or this test, and nothing shaped like an id (counted, never shown)", () => {
    const RUN = /\p{Lu}(?=[\p{L}'.-]*\p{Ll})[\p{L}'.-]+(?: \p{Lu}(?=[\p{L}'.-]*\p{Ll})[\p{L}'.-]+)+/gu;
    const CAPS = /(?<![\p{L}\d_])\p{Lu}{2,}(?: \p{Lu}{2,})+(?![\p{L}\d_])/gu;
    // The parts vectors' report texts and one rule's name, exactly (review findings 4 and 6).
    const allowed = new Set(["Iron Rule", "Left Knee", "Reserve Injured Reserve", "Reserve Physically Unable"]);
    for (const f of ["src/players/realParts.ts", "test/players.pastInjuries.test.ts"]) {
      const t = readFileSync(join(__dirname, "..", f), "utf8");
      expect((t.match(RUN) ?? []).filter((r) => !allowed.has(r)).length, `capitalised runs outside the list in ${f}`).toBe(0);
      expect((t.match(CAPS) ?? []).length, `capitals-only runs in ${f}`).toBe(0);
      expect((t.match(/\d{2}-\d{7}/g) ?? []).length, `gsis-like ids in ${f}`).toBe(0);
      expect((t.match(/[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/g) ?? []).length, `pfr-like ids in ${f}`).toBe(0);
    }
  });
});

describe("seedPastInjuries (§5.2)", () => {
  it("seeds each man's records once, mapped and banded, oldest first, on the spot path with injuries on only", () => {
    const people = withPast(startingPeople());
    const seeded = seedPastInjuries(people, SPOT, SEASON);
    expect(seeded.playerMemory!.injuries).toEqual(SEEDED);
    expect(seeded.playerMemory).toEqual({ ...seeded.playerMemory!, injuries: SEEDED });
    expect(seeded.players).toBe(people.players);
    // The group path, injuries off, or a memory already there: the same object back.
    for (const config of [GROUP, { ...GROUP, injuryRisk: "group" as const }, { development: true, injuryRisk: "spot" as const }, { injuries: false, injuryRisk: "spot" as const }, {}]) {
      expect(seedPastInjuries(people, config, SEASON), JSON.stringify(config)).toBe(people);
    }
    expect(seedPastInjuries(seeded, SPOT, SEASON)).toBe(seeded);
    // Nobody with a history: nothing made.
    const none = startingPeople();
    expect(seedPastInjuries(none, SPOT, SEASON)).toBe(none);
    expect(() => seedPastInjuries(people, { injuries: true, injuryRisk: "spots" as never }, SEASON)).toThrow(/injuryRisk is "group" or "spot"/);
  });

  it("refuses a record healed on or after the season's first day", () => {
    const late = withPast(startingPeople(), { "T01-QB-0": [{ kind: "real:ankle", weeks: 1, since: stamp(SEASON - 1, 1, "OFF_SUMMER"), healed: stamp(SEASON, 1, "TRAINING_CAMP") }] });
    expect(() => seedPastInjuries(late, SPOT, SEASON)).toThrow(/T01-QB-0 has a past injury healed on or after the season's first day/);
    // A season later than the record: seeded.
    expect(seedPastInjuries(late, SPOT, SEASON + 1).playerMemory!.injuries["T01-QB-0"]).toHaveLength(1);
  });
});

describe("test 3: seeded once in the season walk, and a save, a resume or a later season does not double it", () => {
  const base = { league, season: SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
  const campDay1: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
  const straight = runSeason({ ...base, people: withPast(startingPeople()), players: SPOT });

  it("holds the seeded entries from the first day (with free agents on the street that day), each once, at the year's end", () => {
    const first = runSeason({ ...base, people: withPast(startingPeople()), players: SPOT, stopAfter: campDay1 });
    expect(first.people!.freeAgents.length).toBeGreaterThan(0);
    for (const [id, want] of Object.entries(SEEDED)) expect(first.people!.playerMemory!.injuries[id]!.slice(0, want.length), id).toEqual(want);
    expect(seededCount(straight.people!.playerMemory!.injuries)).toEqual(Object.values(SEEDED).flat().map(() => 1));
    // No event for them: nothing in the stream is stamped before the season.
    expect(straight.events.every((e) => e.at.season >= SEASON)).toBe(true);
    // Franchise never writes the record.
    for (const [id, records] of Object.entries(PAST)) expect(straight.people!.players.find((p) => String(p.bio.id) === id)?.condition.injuryHistory ?? records).toEqual(records);
  });

  it("stopped at week 9, saved, read back and carried on, gives the straight season, seeded once", () => {
    const first = runSeason({ ...base, people: withPast(startingPeople()), players: SPOT, stopAfter: week9 });
    const people = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    expect(loaded.development!.people.playerMemory).toEqual(people.playerMemory);
    const second = runSeason({
      ...base, people: { ...loaded.development!.people, staff: people.staff! }, players: loaded.development!.people.playerMemory!.switches!,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
    expect(seededCount(second.people!.playerMemory!.injuries)).toEqual(Object.values(SEEDED).flat().map(() => 1));
  });

  it("carries the memory into the next season without seeding again", () => {
    const next = runSeason({ ...base, season: SEASON + 1, people: straight.people!, players: SPOT, stopAfter: { season: SEASON + 1, phase: "REGULAR_SEASON", week: 2, day: 7 } });
    const counts = seededCount(next.people!.playerMemory!.injuries);
    // A man who retired or was let go may have been forgotten (AB8); nobody holds a seeded entry twice.
    expect(counts.every((n) => n <= 1)).toBe(true);
    expect(counts.filter((n) => n === 1).length).toBeGreaterThan(0);
  });

  it("seeds with mood on too, before mood's first step", () => {
    const built = buildStaff(league, { firstSeason: SEASON, historySeasons: 2, lineups: true });
    const start = withPast({ ...startingPeople(), staff: built.world.staff, coaching: { world: built.world } });
    const run = runSeason({ ...base, people: start, players: SPOT, coaching: {}, meeting: {}, mood: {}, stopAfter: campDay1 });
    for (const [id, want] of Object.entries(SEEDED)) expect(run.people!.playerMemory!.injuries[id]!.slice(0, want.length), id).toEqual(want);
  });
});

describe("test 4 (franchise): the group path seeds nothing and records a copied kind as it is", () => {
  const base = { league, season: SEASON, seed: league.seed, resolve, through: "YEAR" as const, stopAfter: { season: SEASON, phase: "REGULAR_SEASON" as const, week: 4, day: 7 } };

  it("plays the same group season with or without the past injuries, none of them in the memory", () => {
    const withRecords = runSeason({ ...base, people: withPast(startingPeople()), players: GROUP });
    const without = runSeason({ ...base, people: startingPeople(), players: GROUP });
    expect(JSON.stringify(withRecords.events)).toBe(JSON.stringify(without.events));
    expect(seededCount(withRecords.people!.playerMemory!.injuries).every((n) => n === 0)).toBe(true);
    expect(JSON.stringify(withRecords.people!.playerMemory)).toBe(JSON.stringify(without.people!.playerMemory));
  });

  it("records a copied real: kind as it is when he heals on the group path", () => {
    const p = makePlayer("g1");
    const hurt: PlayerState = { ...p, condition: { ...p.condition, injury: { ...makeInjury(p, "real:left-knee", 1, "GAME", stamp(SEASON, 2)), band: "SHORT" } } };
    const r = healWeek({ at: stamp(SEASON, 9, "REGULAR_SEASON", 7), players: [hurt], history: { g1: [{ kind: "knee-mcl", band: "SHORT", at: stamp(SEASON - 1, 3), healed: stamp(SEASON - 1, 5) }] } });
    expect(r.history.g1!.at(-1)).toEqual({ kind: "real:left-knee", band: "SHORT", at: stamp(SEASON, 2), healed: stamp(SEASON, 9, "REGULAR_SEASON", 7) });
    expect(healed(r.events)).toEqual([{ player: p.bio.id, lasting: [] }]);
  });
});

describe("test 5: a seeded concussion gives a repeat-weighted next one", () => {
  /** AB6's hand-built prior: a concussion long ago (healed in 2020), as `players.spotLengths.test.ts` has it. */
  const OLD_CONCUSSION: PastInjury = { kind: "concussion", band: "SHORT", at: { season: 2020, phase: "REGULAR_SEASON", week: 3, day: 7 }, healed: { season: 2020, phase: "REGULAR_SEASON", week: 5, day: 7 } };
  const record: InjuryRecord = { kind: "real:concussion-head", weeks: 2, since: OLD_CONCUSSION.at, healed: OLD_CONCUSSION.healed! };

  it("is memory's concussion, prior 1, and draws exactly as the hand-built prior-1 case at the same seed", () => {
    const man = makePlayer("c1", { history: [record] });
    const seeded = seedMen([man]);
    expect(seeded.playerMemory!.injuries).toEqual({ c1: [OLD_CONCUSSION] });
    const history = seeded.playerMemory!.injuries.c1!;
    expect(priorOfKind(history, "concussion")).toBe(1);
    // The same uniforms, one draw at a time: the seeded history and the hand-built one.
    let concussions = 0;
    for (let i = 0; i < 3_000; i++) {
      const draw = (h: readonly PastInjury[]) => drawInjury(createRng("ab7-t5", String(i)), 50, "GAME", "TE", { age: 26, history: h, healingByAge: true });
      const a = draw(history), b = draw([OLD_CONCUSSION]);
      expect(a).toEqual(b);
      if (a?.kind === "concussion") concussions++;
    }
    expect(concussions).toBeGreaterThan(20);
    // Through a game's draws too: the same events.
    const men = Array.from({ length: 300 }, (_, i) => makePlayer(`m${i}`, { history: [record] }));
    const memory = seedMen(men).playerMemory!.injuries;
    const handBuilt = Object.fromEntries(men.map((p) => [String(p.bio.id), [OLD_CONCUSSION]]));
    const team: Pick<Team, "id" | "depthChart"> = { id: teamId("T1"), depthChart: { TE: men.map((p) => p.bio.id) } };
    const reports: GameParticipation[] = men.map((p) => ({ player: p.bio.id, team: teamId("T1"), snaps: { offense: 1e7, defense: 0, special: 0 }, contests: [] }));
    const run = (h: Record<string, PastInjury[]>) =>
      occurred(gameInjuries({ game: gameId("G5"), at: stamp(2026, 5, "REGULAR_SEASON", 7), reports, players: men, history: h, seed: "ab7-t5-game", injuryRisk: "spot", teams: [team] }).events);
    const seededDraws = run(memory);
    expect(JSON.stringify(seededDraws)).toBe(JSON.stringify(run(handBuilt)));
    expect(seededDraws.some((e) => e.kind === "concussion")).toBe(true);
    expect(JSON.stringify(seededDraws)).not.toBe(JSON.stringify(run({})));
  });
});

describe("test 6: a copied injury heals as the game's kind on the spot path (§5.3)", () => {
  const since = stamp(2026, 2);
  const at = stamp(2026, 9, "REGULAR_SEASON", 7);
  const SEEDED_CONCUSSION: PastInjury = { kind: "concussion", band: "SHORT", at: stamp(2024, 3), healed: stamp(2024, 5) };
  const SEEDED_OTHER: PastInjury = { kind: "other", band: "LONG", at: stamp(2024, 3), healed: stamp(2024, 9) };
  /** One man whose copied injury (`kind`, a SHORT one) heals this week, with `past` in his memory. */
  const heal = (kind: string, past: PastInjury[], injuryRisk?: "spot") => {
    const p = makePlayer("h1", { age: 25, durability: 70 });
    const hurt: PlayerState = { ...p, condition: { ...p.condition, injury: { ...makeInjury(p, kind, 1, "GAME", since), band: "SHORT" } } };
    return healWeek({ at, players: [hurt], history: { h1: past }, ...(injuryRisk ? { injuryRisk } : {}) });
  };

  it("counts a copied concussion and a seeded one as one kind: entry concussion, prior 1, the repeat's durability and no concussion mark", () => {
    const r = heal("real:concussion", [SEEDED_CONCUSSION], "spot");
    expect(r.history.h1).toEqual([SEEDED_CONCUSSION, { kind: "concussion", band: "SHORT", at: since, healed: at }]);
    expect(durability(r.players[0]!)).toBe(70 - REPEAT_DURABILITY.SHORT);
    expect(healed(r.events)).toEqual([{ player: playerId("h1"), lasting: [{ attr: attrId("durability"), from: 70, to: 70 - REPEAT_DURABILITY.SHORT }] }]);
    // A mark would have taken CONCUSSION_MARK's point too.
    expect(CONCUSSION_MARK.ratings?.durability).toBe(-1);
    // With no seeded one: no prior, nothing taken.
    const first = heal("real:concussion", [], "spot");
    expect(first.history.h1).toEqual([{ kind: "concussion", band: "SHORT", at: since, healed: at }]);
    expect(durability(first.players[0]!)).toBe(70);
  });

  it("on the group path records the copied kind as it is, prior 0", () => {
    const r = heal("real:concussion", [SEEDED_CONCUSSION]);
    expect(r.history.h1).toEqual([SEEDED_CONCUSSION, { kind: "real:concussion", band: "SHORT", at: since, healed: at }]);
    expect(durability(r.players[0]!)).toBe(70);
  });

  it("gives a copied list kind and a seeded \"other\" no repeat", () => {
    const r = heal("real:reserve-injured-reserve", [SEEDED_OTHER], "spot");
    expect(r.history.h1).toEqual([SEEDED_OTHER, { kind: "other", band: "SHORT", at: since, healed: at }]);
    expect(durability(r.players[0]!)).toBe(70);
    expect(healed(r.events)).toEqual([{ player: playerId("h1"), lasting: [] }]);
  });

  it("counts a copied knee against a seeded knee-mcl, and an injury of the game's own kind as before", () => {
    const knee: PastInjury = { kind: "knee-mcl", band: "LONG", at: stamp(2024, 3), healed: stamp(2024, 9) };
    const r = heal("real:left-knee", [knee], "spot");
    expect(r.history.h1!.at(-1)!.kind).toBe("knee-mcl");
    expect(durability(r.players[0]!)).toBe(70 - REPEAT_DURABILITY.SHORT);
    // The game's own kinds on the spot path: as AB6 left them.
    const own = heal("ankle", [{ kind: "ankle", band: "SHORT", at: stamp(2024, 3), healed: stamp(2024, 5) }], "spot");
    expect(own.history.h1!.at(-1)!.kind).toBe("ankle");
    expect(durability(own.players[0]!)).toBeLessThan(70);
    // An open entry for this very injury is closed, not doubled.
    const open = heal("real:concussion", [SEEDED_CONCUSSION, { kind: "concussion", band: "SHORT", at: since }], "spot");
    expect(open.history.h1).toEqual([SEEDED_CONCUSSION, { kind: "concussion", band: "SHORT", at: since, healed: at }]);
    expect(bandFor(2)).toBe("SHORT");
  });
});
