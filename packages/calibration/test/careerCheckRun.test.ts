/**
 * The 20-season check one seed at a time (ADR-087 D5b, `careerCheckRun.ts`): the arms, the seed
 * sets, the fingerprint, the codec a checkpoint keeps the people in (the coaching world among them),
 * and a seed stopped after a
 * season's checkpoint and carried on from it (on made-up seasons here, a coach-style seed among
 * them; on the real walk, three switched-on seasons, with FF_CAREER_RESUME=1).
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StaffState } from "@ff/contracts";
import { buildLeague, buildStaff, runSeason, type SeasonRun } from "@ff/franchise";
import type { CapCheckInput } from "../src/season/capCheck.js";
import {
  armInput, CAREER_FINGERPRINT_LEAVES_OUT, CAREER_SEED_SETS, careerCachePaths, careerFingerprint, CareerCheckStopped, COACH_STYLE_LINEUPS,
  CAREER_CHECK_VERSION, decodePeople, decodeState, encodePeople, encodeState, listCareerBuilds, peopleDifference, readCareerRecords, runCareerSeed,
  seedOf, stateDifference, withHeadCoachLineups, writeWhole,
} from "../src/season/careerCheckRun.js";
import { CAREER_ROWS_VERSION } from "../src/season/careerCheck.js";
import type { SeasonPeople } from "../src/season/realSeason.js";
import { readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];

const hook = vi.hoisted(() => ({ runSeason: undefined as undefined | ((input: never) => unknown) }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    runSeason: (input: Parameters<typeof real.runSeason>[0]) =>
      hook.runSeason === undefined ? real.runSeason(input) : (hook.runSeason as (i: typeof input) => SeasonRun)(input),
  };
});

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];
const REPO = join(__dirname, "..", "..", "..");

/** Each season answered with no games and the people handed back unchanged. */
const madeUp = (i: SeasonInput): SeasonRun => ({
  state: { season: i.season, standings: [] } as unknown as SeasonRun["state"],
  calendar: { season: i.season, phase: "OFF_SUMMER", week: 6, day: 7 }, events: [], complete: true, people: i.people!,
});
function withMadeUpSeasons<T>(body: () => T): T {
  hook.runSeason = madeUp as never;
  try { return body(); } finally { hook.runSeason = undefined; }
}
const scratch = () => mkdtempSync(join(tmpdir(), "career-check-"));

describe("the arms and the seeds", () => {
  it("both, development, and the two coach-style arms", () => {
    expect(armInput("both")).toEqual({ players: { development: true, injuries: true } });
    expect(armInput("development")).toEqual({ players: { development: true, injuries: false } });
    expect(armInput("incumbent").players).toEqual({ development: true, injuries: true });
    expect(armInput("form").players).toEqual({ development: true, injuries: true });
    expect(armInput("both").staffTransform).toBeUndefined();
  });

  it("a coach-style arm sets every sitting head coach's leanings, and no one else's", () => {
    const staff = buildStaff(buildLeague("career-check-staff"), { firstSeason: 2026, lineups: true }).world.staff;
    const sitting = (s: StaffState) => { const j = s.career[s.career.length - 1]; return j?.role === "HEAD_COACH" && j.lastSeason === undefined && j.ended === undefined && j.team !== undefined; };
    const handedIn = JSON.stringify(staff);
    for (const arm of ["incumbent", "form"] as const) {
      const changed = armInput(arm).staffTransform!(staff);
      expect(changed).toHaveLength(staff.length);
      const heads = changed.filter(sitting);
      expect(heads.length).toBe(32);
      for (const h of heads) expect(h.lineup).toEqual(COACH_STYLE_LINEUPS[arm]);
      changed.forEach((s, i) => { if (s.role !== "HEAD_COACH" && !sitting(s)) expect(s).toBe(staff[i]); });
    }
    // The staff handed in is not changed.
    withHeadCoachLineups(staff, COACH_STYLE_LINEUPS.form);
    expect(JSON.stringify(staff)).toBe(handedIn);
  });

  it("the seed sets: four tuning seeds, twelve grade seeds, counted from 1", () => {
    expect(CAREER_SEED_SETS.tune).toEqual(["d5b-t1", "d5b-t2", "d5b-t3", "d5b-t4"]);
    expect(CAREER_SEED_SETS.grade).toHaveLength(12);
    expect(seedOf("grade", 1)).toBe("d5b-g1");
    expect(seedOf("grade", 12)).toBe("d5b-g12");
    expect(() => seedOf("tune", 5)).toThrow(RangeError);
    expect(() => seedOf("tune", 0)).toThrow(RangeError);
    expect(() => careerCachePaths("/x", "both", "../evil", 20)).toThrow(SyntaxError);
    expect(careerCachePaths("/x", "form", "d5b-t2", 20)).toEqual({ rows: "/x/form-d5b-t2-20.json", checkpoint: "/x/form-d5b-t2-20.checkpoint.json" });
  });
});

/** Every calibration source file the walk reaches from `careerCheckRun.ts` through relative imports, repository-relative. */
function walkImports(): Set<string> {
  const src = join(REPO, "packages", "calibration", "src");
  const seen = new Set<string>();
  const stack = [join(src, "season", "careerCheckRun.ts")];
  const imports = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g;
  while (stack.length > 0) {
    const file = stack.pop()!;
    const rel = relative(REPO, file).split("\\").join("/");
    if (seen.has(rel)) continue;
    seen.add(rel);
    for (const m of readFileSync(file, "utf8").matchAll(imports)) {
      const target = normalize(join(dirname(file), m[1]!.replace(/\.js$/, ".ts")));
      if (existsSync(target) && target.endsWith(".ts")) stack.push(target);
    }
  }
  return seen;
}

describe("the fingerprint", () => {
  const base = { repoRoot: REPO, leagueSha256: "a".repeat(64), engineRules: "legacy", callerVersion: "v7" };
  it("covers every package's source, the league file, the engine rules and the caller (the arm is in each file's name)", () => {
    const fp = careerFingerprint(base);
    expect(fp.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(fp.files).toBeGreaterThan(100);
    expect(careerFingerprint(base).fingerprint).toBe(fp.fingerprint);
    for (const change of [{ leagueSha256: "b".repeat(64) }, { engineRules: "pocket-1.s2" }, { callerVersion: "v6" }]) {
      expect(careerFingerprint({ ...base, ...change }).fingerprint).not.toBe(fp.fingerprint);
    }
    const paths = careerCachePaths("/c", "both", "s", 20);
    expect(careerCachePaths("/c", "form", "s", 20).rows).not.toBe(paths.rows);
  });

  it("leaves out only files the walk never reaches: the grader, the command, the real-NFL side", () => {
    const reached = walkImports();
    // The walk's own pieces are reached, the usage and group pieces of careers/ among them.
    for (const f of ["season/careerCheck.ts", "season/capCheck.ts", "season/draftCheck.ts", "careers/usage.ts", "careers/groups.ts"]) {
      expect(reached).toContain(`packages/calibration/src/${f}`);
    }
    for (const f of CAREER_FINGERPRINT_LEAVES_OUT) {
      expect(existsSync(join(REPO, f))).toBe(true);
      expect(reached.has(f)).toBe(false);
    }
    expect(CAREER_FINGERPRINT_LEAVES_OUT).toContain("packages/calibration/src/season/careerGrade.ts");
    expect(CAREER_FINGERPRINT_LEAVES_OUT).toContain("packages/calibration/src/season/careerCheckMain.ts");
    expect(CAREER_FINGERPRINT_LEAVES_OUT).not.toContain("packages/calibration/src/careers/usage.ts");
  });

  it("a change to a file left out keeps the fingerprint; a change to the walk's source moves it", () => {
    const root = scratch();
    try {
      for (const f of [...CAREER_FINGERPRINT_LEAVES_OUT, "packages/calibration/src/season/careerCheck.ts"]) {
        mkdirSync(dirname(join(root, f)), { recursive: true });
        writeFileSync(join(root, f), "export {};");
      }
      const one = careerFingerprint({ ...base, repoRoot: root });
      expect(one.files).toBe(1);
      writeFileSync(join(root, "packages/calibration/src/season/careerGrade.ts"), "export {}; // a band set");
      writeFileSync(join(root, "packages/calibration/src/careers/nflCareers.ts"), "export const x = 1;");
      expect(careerFingerprint({ ...base, repoRoot: root }).fingerprint).toBe(one.fingerprint);
      writeFileSync(join(root, "packages/calibration/src/season/careerCheck.ts"), "export {}; // the reader");
      expect(careerFingerprint({ ...base, repoRoot: root }).fingerprint).not.toBe(one.fingerprint);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("changes when a source file changes", () => {
    const root = scratch();
    try {
      mkdirSync(join(root, "packages", "one", "src", "deep"), { recursive: true });
      mkdirSync(join(root, "packages", "two"), { recursive: true });
      writeFileSync(join(root, "packages", "one", "src", "a.ts"), "export const a = 1;");
      writeFileSync(join(root, "packages", "one", "src", "deep", "b.json"), "{}");
      const one = careerFingerprint({ ...base, repoRoot: root });
      expect(one.files).toBe(2);
      writeFileSync(join(root, "packages", "one", "src", "deep", "b.json"), "{ }");
      expect(careerFingerprint({ ...base, repoRoot: root }).fingerprint).not.toBe(one.fingerprint);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the cache's files", () => {
  it("a whole file or none: each write through a temporary name of its own, none left behind", () => {
    const dir = scratch();
    try {
      const path = join(dir, "both-s-2.json");
      writeWhole(path, "one");
      writeWhole(path, "two");
      expect(readFileSync(path, "utf8")).toBe("two");
      expect(readdirSync(dir)).toEqual(["both-s-2.json"]);
      // A write that cannot land leaves no temporary file.
      expect(() => writeWhole(join(dir, "missing", "x.json"), "x")).toThrow();
      expect(readdirSync(dir)).toEqual(["both-s-2.json"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lists each build's folder and its finished rows by arm", () => {
    const dir = scratch();
    try {
      expect(listCareerBuilds(join(dir, "none"))).toEqual([]);
      mkdirSync(join(dir, "0123456789abcdef"));
      mkdirSync(join(dir, "not-a-build"));
      for (const f of ["both-a-20.json", "both-b-20.json", "form-a-20.json", "both-c-20.checkpoint.json", "both-d-20.json.1.0.0.tmp"]) {
        writeFileSync(join(dir, "0123456789abcdef", f), "{}");
      }
      expect(listCareerBuilds(dir)).toEqual([{ fingerprint: "0123456789abcdef", rows: { both: 2, form: 1 } }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the codec", () => {
  it("brings back Sets, Maps, undefined properties, NaN, the infinities and -0, and an object that looks like a tag", () => {
    const value = {
      set: new Set(["a", "b"]), map: new Map<unknown, unknown>([["k", { v: 1 }], [2, new Set([3])]]), gone: undefined,
      list: [1, undefined, null, -0, NaN, Infinity, -Infinity], tagLike: { $set: [1] }, nested: { deep: [{ x: "y" }] },
    };
    const text = JSON.stringify(encodeState(value));
    const back = decodeState(JSON.parse(text));
    expect(stateDifference(back, value)).toBeNull();
    expect(Object.keys(back as object)).toContain("gone");
    expect(Object.is((back as { list: number[] }).list[3], -0)).toBe(true);
    // The differences it finds.
    expect(stateDifference({ a: 1 }, { a: 1, b: undefined })).toBe("${keys}");
    expect(stateDifference([0], [-0])).toBe("$[0]");
    expect(stateDifference(new Set([1, 2]), new Set([2, 1]))).toBe("$<set>[0]");
  });

  it("refuses what it cannot keep", () => {
    expect(() => encodeState({ when: new Date(0) })).toThrow(/\$\.when is a Date/);
    expect(() => encodeState({ f: () => 1 })).toThrow(/function/);
  });

  it("keeps the coaching world as it is: staffs, pool, contracts, the views and the GMs the first day seats, the staff one array", () => {
    const league = buildLeague("career-check-coaching");
    const world = buildStaff(league, { firstSeason: 2026, lineups: true }).world;
    const start = { teams: league.teams, players: [], picks: [], classes: [], freeAgents: [], staff: world.staff, coaching: { world } } as unknown as SeasonPeople;
    // The season's first day, with the coaches' and the meeting's steps: the views are seated and every team gets its GM.
    const run = runSeason({
      league, season: 2026, seed: "career-check-coaching/2026", people: start, coaching: {}, meeting: {},
      resolve: () => { throw new Error("no game is played on the first day"); },
      stopAfter: { season: 2026, phase: "TRAINING_CAMP", week: 1, day: 1 },
    });
    const people = run.people!;
    expect(people.coaching!.relationships!.length).toBeGreaterThan(100);
    expect(people.staff!.filter((s) => s.role === "GM")).toHaveLength(32);
    for (const p of [start, people]) {
      expect(p.staff).toBe(p.coaching!.world.staff);
      const encoded = encodePeople(p);
      expect(encoded.sharedStaff).toBe(true);
      const back = decodePeople(JSON.parse(JSON.stringify(encoded.people)), encoded.sharedStaff);
      expect(peopleDifference(back, p)).toBeNull();
      expect(stateDifference(back.coaching, p.coaching)).toBeNull();
      expect(back.staff).toBe(back.coaching!.world.staff);
      expect(Object.keys(back)).toEqual(Object.keys(p));
    }
    // The staff is written once: under `staff`, a null in its place.
    expect((encodePeople(people).people as { staff: unknown }).staff).toBeNull();
    // Two lists of the same coaches are kept as two (and read back as two).
    const apart = { ...people, staff: [...people.staff!] };
    const encoded = encodePeople(apart);
    expect(encoded.sharedStaff).toBe(false);
    const back = decodePeople(JSON.parse(JSON.stringify(encoded.people)), false);
    expect(peopleDifference(back, apart)).toBeNull();
    expect(back.staff).not.toBe(back.coaching!.world.staff);
    // The state check sees a shared staff come back apart, and the decoder refuses a file that says it shares with no world.
    expect(peopleDifference(apart, people)).toBe("$.staff<shared with coaching.world.staff>");
    expect(() => decodePeople(encodeState({ ...apart, coaching: undefined }), true)).toThrow(/no coaching world/);
  }, 300_000);

  it("keeps the league file's people as they are (traits are Sets)", () => {
    const people = { players: file.league.players.slice(0, 200), teams: file.league.teams, contracts: (file.contracts ?? []).slice(0, 200) };
    const back = decodeState(JSON.parse(JSON.stringify(encodeState(people))));
    expect(stateDifference(back, people)).toBeNull();
    expect((back as typeof people).players[0]!.attributes.traits).toBeInstanceOf(Set);
  });
});

describe("one seed: the cache and the checkpoint (made-up seasons)", () => {
  const league = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "f".repeat(64) };
  it("a seed stopped after its second season's checkpoint carries on from it, and gives the unbroken seed's rows", () => {
    const dirA = scratch(), dirB = scratch();
    try {
      const opts = { file, league, seed: "resume-made-up", arm: "both" as const, seasons: 3, fingerprint: "0123456789abcdef" };
      const straight = withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirA }));
      expect(straight.from).toBe("run");
      expect(straight.record.seconds).toHaveLength(3);
      const paths = careerCachePaths(dirB, "both", "resume-made-up", 3);
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirB, stopAfter: 2 }))).toThrow(CareerCheckStopped);
      expect(existsSync(paths.checkpoint)).toBe(true);
      expect(existsSync(paths.rows)).toBe(false);
      const cp = JSON.parse(readFileSync(paths.checkpoint, "utf8")) as { version: number; seasonsDone: number; seconds: number[]; people: unknown; sharedStaff: boolean };
      expect(cp.version).toBe(CAREER_CHECK_VERSION);
      expect(cp.seasonsDone).toBe(2);
      expect(cp.seconds).toHaveLength(2);
      // The coaching world rides in the checkpoint's people, its staff written once.
      expect(cp.sharedStaff).toBe(true);
      const kept = decodePeople(cp.people, cp.sharedStaff);
      expect(kept.coaching!.world.staff.length).toBeGreaterThan(32 * 5);
      expect(kept.staff).toBe(kept.coaching!.world.staff);
      const resumed = withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirB }));
      expect(resumed.from).toBe("resumed");
      expect(JSON.stringify(resumed.record.rows)).toBe(JSON.stringify(straight.record.rows));
      expect(resumed.record.rows.version).toBe(CAREER_ROWS_VERSION);
      expect(resumed.record.seconds).toHaveLength(3);
      expect(existsSync(paths.checkpoint)).toBe(false);
      // Once written, the rows come from the cache.
      const cached = runCareerSeed({ ...opts, cacheDir: dirB });
      expect(cached.from).toBe("cache");
      expect(JSON.stringify(cached.record)).toBe(JSON.stringify(resumed.record));
      const read = readCareerRecords(dirB, "both", ["resume-made-up", "missing-seed"], 3);
      expect([...read.records.keys()]).toEqual(["resume-made-up"]);
      expect(read.missing).toEqual(["missing-seed"]);
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  }, 300_000);

  it("a coach-style seed resumed after a checkpoint gives a head coach the carousel seated the arm's leanings, as the unbroken seed does", () => {
    const dirA = scratch(), dirB = scratch();
    const sittingHead = (s: StaffState, team?: string) => {
      const j = s.career[s.career.length - 1];
      return j !== undefined && j.level === "NFL" && j.role === "HEAD_COACH" && j.lastSeason === undefined && j.ended === undefined
        && j.team !== undefined && (team === undefined || String(j.team) === team);
    };
    const NATURAL = { incumbent: 20, veteran: 60, form: 70 };
    const T01 = file.league.teams.find((t) => String(t.id) === "T01")!.id;
    /**
     * Made-up seasons with a made-up carousel: in the first season T01's head coach is fired and a
     * man from the pool seated with leanings of his own, as franchise seats one; the people handed
     * in each season are kept.
     */
    const carousel = (handed: SeasonInput[]) => (i: SeasonInput): SeasonRun => {
      handed.push(i);
      let p = i.people!;
      if (i.season === file.season && p.coaching !== undefined) {
        const world = p.coaching.world;
        const fired = world.staff.find((s) => sittingHead(s, "T01"))!;
        const hired = world.staff.find((s) => s.teamId === undefined && s.retiredAfter === undefined && s.career.length > 0 && !sittingHead(s))!;
        const staff = world.staff.map((s): StaffState => {
          if (s === fired) {
            const { teamId: _t, ...rest } = s;
            return { ...rest, career: s.career.map((j, k) => (k === s.career.length - 1 ? { ...j, lastSeason: i.season, ended: "FIRED" as const } : j)) } as StaffState;
          }
          if (s === hired) {
            return {
              ...s, role: "HEAD_COACH", teamId: T01, lineup: { ...NATURAL },
              career: [...s.career, { level: "NFL", role: "HEAD_COACH", team: T01, employer: "T01", firstSeason: i.season + 1, seasons: [] }],
            };
          }
          return s;
        });
        p = { ...p, staff, coaching: { ...p.coaching, world: { ...world, staff } } };
      }
      return { ...madeUp(i), people: p };
    };
    const withCarousel = <T>(handed: SeasonInput[], body: () => T): T => {
      hook.runSeason = carousel(handed) as never;
      try { return body(); } finally { hook.runSeason = undefined; }
    };
    try {
      const opts = { file, league, seed: "resume-coach-arm", arm: "incumbent" as const, seasons: 3, fingerprint: "0123456789abcdef" };
      const straightHanded: SeasonInput[] = [];
      const straight = withCarousel(straightHanded, () => runCareerSeed({ ...opts, cacheDir: dirA }));
      expect(straightHanded).toHaveLength(3);
      // Stopped after season 1's checkpoint: the new man is seated there with his own leanings.
      const stoppedHanded: SeasonInput[] = [];
      expect(() => withCarousel(stoppedHanded, () => runCareerSeed({ ...opts, cacheDir: dirB, stopAfter: 1 }))).toThrow(CareerCheckStopped);
      expect(stoppedHanded).toHaveLength(1);
      const paths = careerCachePaths(dirB, "incumbent", "resume-coach-arm", 3);
      const cp = JSON.parse(readFileSync(paths.checkpoint, "utf8")) as { seasonsDone: number; people: unknown; sharedStaff: boolean };
      expect(cp.seasonsDone).toBe(1);
      const kept = decodePeople(cp.people, cp.sharedStaff);
      const keptHead = kept.staff!.find((s) => sittingHead(s, "T01"))!;
      expect(keptHead.lineup).toEqual(NATURAL);
      const newHead = String(keptHead.id);
      // Carried on: season 2 starts with the arm's leanings on him (and on every sitting head coach), both views one array.
      const resumedHanded: SeasonInput[] = [];
      const resumed = withCarousel(resumedHanded, () => runCareerSeed({ ...opts, cacheDir: dirB }));
      expect(resumed.from).toBe("resumed");
      expect(resumedHanded.map((h) => h.season)).toEqual([file.season + 1, file.season + 2]);
      for (const [h, unbroken] of [[resumedHanded[0]!, straightHanded[1]!], [resumedHanded[1]!, straightHanded[2]!]] as const) {
        const staff = h.people!.staff!;
        expect(staff).toBe(h.people!.coaching!.world.staff);
        const seated = staff.find((s) => String(s.id) === newHead)!;
        expect(sittingHead(seated, "T01")).toBe(true);
        expect(seated.lineup).toEqual(COACH_STYLE_LINEUPS.incumbent);
        const heads = staff.filter((s) => sittingHead(s));
        expect(heads).toHaveLength(32);
        expect(heads.every((s) => JSON.stringify(s.lineup) === JSON.stringify(COACH_STYLE_LINEUPS.incumbent))).toBe(true);
        // The same people the unbroken seed handed that season.
        expect(peopleDifference(h.people!, unbroken.people!)).toBeNull();
      }
      expect(JSON.stringify(resumed.record.rows)).toBe(JSON.stringify(straight.record.rows));
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  }, 300_000);

  it("refuses a checkpoint made for another seed, arm, length or build", () => {
    const dir = scratch();
    try {
      const opts = { file, league, seed: "resume-other", arm: "both" as const, seasons: 2, fingerprint: "0123456789abcdef", cacheDir: dir };
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, stopAfter: 1 }))).toThrow(CareerCheckStopped);
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, fingerprint: "fedcba9876543210" }))).toThrow(/another fingerprint/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 300_000);
});

// --- the real walk, three switched-on seasons (about 12 minutes) ---------------------------------

const RESUME = process.env.FF_CAREER_RESUME === "1";

describe.skipIf(!RESUME)("one seed on the real walk: stopped after season 2 and resumed, against three seasons unbroken (FF_CAREER_RESUME=1)", () => {
  it("gives the unbroken walk's rows, and the checkpoint's people come back as the same objects", () => {
    const dirA = scratch(), dirB = scratch();
    const league = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "real" };
    const opts = { file, league, seed: "d5b-resume", arm: "both" as const, seasons: 3, fingerprint: "resume-proof-0001" };
    const log = (what: string) => (season: number, seconds: number) => console.log(`${what} ${season}: ${seconds.toFixed(0)} s`);
    try {
      const straight = runCareerSeed({ ...opts, cacheDir: dirA, onSeason: log("unbroken") });
      expect(() => runCareerSeed({ ...opts, cacheDir: dirB, stopAfter: 2, onSeason: log("stopped") })).toThrow(CareerCheckStopped);
      const paths = careerCachePaths(dirB, "both", "d5b-resume", 3);
      const text = readFileSync(paths.checkpoint, "utf8");
      const file = JSON.parse(text) as { people: unknown; sharedStaff: boolean };
      const people = decodePeople(file.people, file.sharedStaff);
      expect(people.coaching).toBeDefined();
      expect(people.staff).toBe(people.coaching!.world.staff);
      const again = encodePeople(people);
      expect(peopleDifference(decodePeople(JSON.parse(JSON.stringify(again.people)), again.sharedStaff), people)).toBeNull();
      const resumed = runCareerSeed({ ...opts, cacheDir: dirB, onSeason: log("resumed") });
      expect(resumed.from).toBe("resumed");
      expect(JSON.stringify(resumed.record.rows)).toBe(JSON.stringify(straight.record.rows));
      console.log(`rows ${JSON.stringify(straight.record.rows).length} bytes, identical; checkpoint ${text.length} bytes`);
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  }, 3_600_000);
});
