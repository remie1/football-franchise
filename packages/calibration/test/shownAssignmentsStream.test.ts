/**
 * ADR-067 §B / ADR-069 — THE SHOWN/PLAYED DIFF IS EMPTY ON EVERY PLAY OF THE CORPUS THAT WORE
 * NO MASK, AND NON-EMPTY ON EVERY PLAY THAT DID.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * `PLAY_START.defense` carries both `assignments` (what was played) and `shownAssignments` (what
 * the offence saw before the snap). ADR-067 §B's inertness claim is that, with §A building both
 * from one source, the diff between them is empty on every play — and that this is CHECKED BY A
 * RUN, not asserted. This is the run.
 *
 * It reads the stream, not the call: the property under test is what a consumer reconstructing a
 * play can compute, so the check goes where that consumer would look.
 *
 * ============================ EVERY PLAY, BOTH KINDS ============================
 *
 * The shown state rides on `PLAY_START` rather than `PRESNAP_READ` precisely so that the sample is
 * every play rather than the ones that happened to draw a recognition roll (backlog entry 168).
 * So the population is counted per kind and each must be non-empty: a corpus that produced no runs
 * would quietly reduce "every play" to "every dropback", and a payload missing the field would read
 * as an empty diff. A play whose `shownAssignments` is absent is a failure, not a skip.
 *
 * ============================ THE NAME AGAINST THE DIFF (ADR-069) ============================
 *
 * ADR-068 step 1 made two CARDS lie, so this test named them. ADR-069 moved the lie to a mask
 * drawn over any card, and since ADR-071 the call names it as a LOOK in `PLAY_START.defense.tags`.
 * So the check is now the name against the diff, in both directions, on every play: a play that
 * names a look must show
 * something other than it plays (a mask that changed nothing is a disguise counted that never
 * happened), and a play that names none must show exactly what it plays (a divergence nobody
 * named is the authoring slip ADR-067 §A built this test to catch). Every mask in the catalogue
 * must turn up, on dropbacks and on runs, or the corpus did not exercise it.
 *
 * ============================ PARTITIONED BY THE KIND OF LOOK (ADR-073 §3.5) ============================
 *
 * From caller v7 a call can also wear a FRONT look (the Mug or the Stem, ADR-073 §2.5). It moves no
 * coverage duty, so it shows in `shownRush`, not in `shownAssignments`. So the check is made per
 * kind, each against its own diff: a COVERAGE LOOK ⇔ `shownAssignments` differs from `assignments`,
 * and a FRONT LOOK ⇔ `shownRush` differs from `rush` as `front_look_rate` defines it (playbook's
 * `shownRushDiffers`, entry by entry, `move` never read). The catalogue check counts coverage looks
 * only, and a LOOK of neither kind is a failure. It runs on the default caller and on v7, which
 * must wear both front looks, on dropbacks and on runs, or the front half compared nothing.
 *
 * ============================ DETERMINISM ============================
 *
 * One batch seed, `generateSeeds`'d into one seed per fixture. Re-run with the batch seed and digest
 * cited in any failure message to reproduce it.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, ShownRusher } from "@ff/contracts";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { COVERAGE_MASKS, FRONT_LOOKS, shownRushDiffers } from "@ff/playbook";
import type { CallerVersion } from "../src/caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";

const BATCH_SEED = "adr-067:shown-assignments-stream";

/** The two kinds of LOOK, by id, from playbook's catalogues (ADR-069; ADR-073 §2.5). */
const COVERAGE_LOOK_IDS: ReadonlySet<string> = new Set(COVERAGE_MASKS.map((m) => m.id));
const FRONT_LOOK_IDS: ReadonlySet<string> = new Set<string>(FRONT_LOOKS);

interface GameFold {
  /** Plays that wore a coverage mask, by kind — required to differ in `shownAssignments`. */
  readonly maskedPass: number;
  readonly maskedRun: number;
  /** Coverage looks only (ADR-073 §3.5): a front look's id never enters this set. */
  readonly masksSeen: ReadonlySet<string>;
  /** Plays that wore a front look, by kind — required to differ in `shownRush`. */
  readonly frontPass: number;
  readonly frontRun: number;
  readonly frontLooksSeen: ReadonlySet<string>;
  readonly passPlays: number;
  readonly runPlays: number;
  /** Plays whose played `assignments` list was non-empty — the diff had something to compare. */
  readonly withAssignments: number;
  readonly failures: readonly string[];
}

function foldGame(gameLabel: string, events: readonly MatchEventEnvelope[]): GameFold {
  let maskedPass = 0;
  let maskedRun = 0;
  const masksSeen = new Set<string>();
  let frontPass = 0;
  let frontRun = 0;
  const frontLooksSeen = new Set<string>();
  let passPlays = 0;
  let runPlays = 0;
  let withAssignments = 0;
  const failures: string[] = [];

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "PLAY_START") continue;
    const payload = event.payload as {
      readonly kind?: unknown;
      readonly defense?: {
        readonly call?: unknown;
        readonly assignments?: unknown;
        readonly shownAssignments?: unknown;
        readonly rush?: unknown;
        readonly shownRush?: unknown;
        readonly tags?: readonly { readonly kind?: unknown; readonly id?: unknown }[];
      };
    };
    // PLAY_START also opens special-teams plays, which carry no defensive call.
    if (payload.kind === "PASS_PLAY_V1") passPlays += 1;
    else if (payload.kind === "RUN_PLAY_V1") runPlays += 1;
    else continue;

    const where = `game ${gameLabel} play ${String(event.playId)} (${String(payload.kind)})`;
    const played = payload.defense?.assignments;
    const shown = payload.defense?.shownAssignments;
    if (!Array.isArray(shown)) {
      failures.push(`${where}: defense.shownAssignments is missing from PLAY_START`);
      continue;
    }
    if (Array.isArray(played) && played.length > 0) withAssignments += 1;
    const tags = payload.defense?.tags;
    if (!Array.isArray(tags)) {
      failures.push(`${where}: defense.tags is missing from PLAY_START ([] means a vanilla call)`);
      continue;
    }
    const lookIds = tags.filter((tag) => tag.kind === "LOOK").map((tag) => String(tag.id));
    const unknown = lookIds.filter((id) => !COVERAGE_LOOK_IDS.has(id) && !FRONT_LOOK_IDS.has(id));
    if (unknown.length > 0) {
      failures.push(`${where}: names a LOOK that is neither a coverage look nor a front look: ${unknown.join("+")}`);
      continue;
    }

    // The coverage half (ADR-069): a coverage LOOK ⇔ `shownAssignments` differs.
    const looks = lookIds.filter((id) => COVERAGE_LOOK_IDS.has(id));
    if (looks.length > 0) {
      if (payload.kind === "PASS_PLAY_V1") maskedPass += 1;
      else maskedRun += 1;
      for (const id of looks) masksSeen.add(id);
      if (isDeepStrictEqual(shown, played)) {
        failures.push(
          `${where}: ${String(payload.defense?.call)} wore ${looks.join("+")} but showed what it played`,
        );
      }
    } else if (!isDeepStrictEqual(shown, played)) {
      failures.push(
        `${where}: shown differs from played and no coverage look is named\n  shown:  ${JSON.stringify(shown)}\n` +
          `  played: ${JSON.stringify(played)}`,
      );
    }

    // The front half (ADR-073 §3.5): a front LOOK ⇔ `shownRush` differs from `rush`, as
    // `front_look_rate` compares them.
    const rush = payload.defense?.rush;
    const shownRush = payload.defense?.shownRush;
    if (!Array.isArray(rush) || !Array.isArray(shownRush)) {
      failures.push(`${where}: defense.rush or defense.shownRush is missing from PLAY_START`);
      continue;
    }
    const fronts = lookIds.filter((id) => FRONT_LOOK_IDS.has(id));
    const rushDiffers = shownRushDiffers(rush as readonly ShownRusher[], shownRush as readonly ShownRusher[]);
    if (fronts.length > 0) {
      if (payload.kind === "PASS_PLAY_V1") frontPass += 1;
      else frontRun += 1;
      for (const id of fronts) frontLooksSeen.add(id);
      if (!rushDiffers) {
        failures.push(
          `${where}: ${String(payload.defense?.call)} wore the front look ${fronts.join("+")} but showed the rush it played`,
        );
      }
    } else if (rushDiffers) {
      failures.push(
        `${where}: the shown rush differs from the played one and no front look is named\n` +
          `  shown:  ${JSON.stringify(shownRush)}\n  played: ${JSON.stringify(rush)}`,
      );
    }
  }
  return {
    maskedPass,
    maskedRun,
    masksSeen,
    frontPass,
    frontRun,
    frontLooksSeen,
    passPlays,
    runPlays,
    withAssignments,
    failures,
  };
}

describe("ADR-067 §B / ADR-069 / ADR-073 §3.5: PLAY_START publishes the shown state, and the look it names", () => {
  it.each([
    ["the default caller", undefined],
    ["caller v7", "v7"],
  ] as const satisfies readonly (readonly [string, CallerVersion | undefined])[])(
    "each shown/played diff is non-empty exactly on the plays that name a look of its kind, over a " +
      "non-empty population of each kind of play and of each coverage mask (%s)",
    (_label, callerVersion) => {
      const league = buildFlatLeague({ teams: 8 });
      const index = indexLeague(league);
      const fixtures = buildFixtures(index, {
        kind: "SYNTHETIC_ROUND_ROBIN",
        rounds: 1,
        season: 2024,
      });
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);

      let maskedPass = 0;
      let maskedRun = 0;
      const masksSeen = new Set<string>();
      let frontPass = 0;
      let frontRun = 0;
      const frontLooksSeen = new Set<string>();
      let passPlays = 0;
      let runPlays = 0;
      let withAssignments = 0;
      const failures: string[] = [];
      for (const [i, fixture] of fixtures.entries()) {
        const seed = seeds.seeds[i];
        if (seed === undefined) continue;
        const { observation } = runOneGame({
          built: buildFixture(index, fixture),
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          ...(callerVersion === undefined ? {} : { callerVersion }),
        });
        const fold = foldGame(seed, observation.events);
        maskedPass += fold.maskedPass;
        maskedRun += fold.maskedRun;
        for (const id of fold.masksSeen) masksSeen.add(id);
        frontPass += fold.frontPass;
        frontRun += fold.frontRun;
        for (const id of fold.frontLooksSeen) frontLooksSeen.add(id);
        passPlays += fold.passPlays;
        runPlays += fold.runPlays;
        withAssignments += fold.withAssignments;
        failures.push(...fold.failures);
      }

      const corpus =
        `${callerVersion ?? "the default caller"}, batch "${BATCH_SEED}", digest ${seeds.digest}, ` +
        `${String(fixtures.length)} games, ${String(passPlays)} pass + ${String(runPlays)} run plays, ` +
        `${String(frontPass)} + ${String(frontRun)} wearing a front look`;

      expect(
        failures,
        `${String(failures.length)} plays broke the shown/played rule (${corpus}):\n` +
          failures.slice(0, 10).join("\n"),
      ).toEqual([]);

      // Non-vacuity. An empty diff over no plays, or over plays with no coverage to diff, is not a
      // pass — it is the shape this register keeps cataloguing.
      expect(passPlays, `no PASS_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(runPlays, `no RUN_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(maskedPass, `no dropback wore a mask in ${corpus}`).toBeGreaterThan(0);
      expect(maskedRun, `no run wore a mask in ${corpus}`).toBeGreaterThan(0);
      expect([...masksSeen].sort(), `a mask in the catalogue never turned up in ${corpus}`).toEqual(
        COVERAGE_MASKS.map((m) => m.id).sort(),
      );
      // The front half was compared: v7 wears both front looks here, on dropbacks and on runs. (The
      // default caller is checked by the same partition; while it is v4 it wears no front look.)
      if (callerVersion === "v7") {
        expect(frontPass, `no dropback wore a front look in ${corpus}`).toBeGreaterThan(0);
        expect(frontRun, `no run wore a front look in ${corpus}`).toBeGreaterThan(0);
        expect([...frontLooksSeen].sort(), `a front look never turned up in ${corpus}`).toEqual([...FRONT_LOOKS].sort());
      }
      expect(
        withAssignments,
        `no play in ${corpus} carried a non-empty assignments list, so the diff compared nothing`,
      ).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});
