/**
 * ADR-090 step 3's report (ADR-091 §17, step S-a), in plain words where it can be: nothing moved,
 * the engine kept every rule, how often the Mike stemmed and how each stem ended, the dice against
 * their own odds, the quarterback's count, the count read through a game and the sideline's moves,
 * each beside what ADR-091 and ADR-092 filed.
 */
import type { Cadence, StemTiming } from "@ff/contracts";
import {
  CADENCE_ROWS,
  CADENCES,
  GROUP_OF,
  LINE_ROLLS,
  PROBLEM_KINDS,
  PROBLEMS,
  QUARTERS,
  STEM_OUTCOMES,
  STEP3_CALLER,
  TIMINGS,
  type CadenceRow,
  type LineRoll,
  type Odds,
  type Quarter,
  type Step3Golden,
  type Step3Measure,
  type Step3Stems,
  type StemBucket,
  type StemGroup,
  type StemOutcome,
} from "./step3.js";

const n = (value: number): string => value.toLocaleString("en-US");
const tick = (ok: boolean): string => (ok ? "✅ yes" : "❌ no");
const pct = (part: number, whole: number): string => (whole === 0 ? "none" : `${((100 * part) / whole).toFixed(1)}%`);
const one = (value: number): string => value.toFixed(1);
const signed = (value: number): string => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
/** Measured against the odds, in standard errors. */
const z = (o: Odds): string => (o.variance === 0 ? "none to weigh" : signed((o.observed - o.expected) / Math.sqrt(o.variance)));

const LEAGUE_NAME: Readonly<Record<string, string>> = { flat: "flat league", gen: "generated league" };

const OUTCOME_NAME: Readonly<Record<StemOutcome, string>> = {
  ON_TIME: "on time",
  EARLY_SNAPPED: "early, then snapped on movement (caught)",
  EARLY_RECALLED: "early, then re-called by the center",
  EARLY_WORKED: "early, not re-called (works)",
  EARLY_RUN: "early, on a run (no re-call to make; works)",
  CAUGHT: "caught by a late call or a quick count",
  CALLED_OFF: "called off",
};

/** ADR-091 §9.2: every rating at 50, the count read at 50, a plain stem, the offense at home. */
const FILED_9_2: Readonly<Partial<Record<StemOutcome, number>>> = {
  ON_TIME: 62.9,
  EARLY_SNAPPED: 7.1,
  EARLY_RECALLED: 7.7,
  EARLY_WORKED: 2.4,
  CAUGHT: 12.4,
  CALLED_OFF: 7.5,
};

const GROUP_NAME: Readonly<Record<StemGroup, string>> = {
  WORKS: "**the stem works**",
  CAUGHT: "**the stem is caught**",
  WASTED: "**wasted or called off**",
};
const FILED_GROUP_9_2: Readonly<Record<StemGroup, string>> = { WORKS: "65.3%", CAUGHT: "19.5%", WASTED: "15.2%" };

const TIMING_NAME: Readonly<Record<StemTiming, string>> = {
  ON_TIME: "on time",
  EARLY: "early",
  CAUGHT: "caught (a late call, or a quick count)",
  CALLED_OFF: "called off",
};

const ROLL_NAME: Readonly<Record<LineRoll, string>> = {
  stem_timing: "the Mike times the count (made: 0 or better)",
  stem_shift: "a shifting lineman sets (made)",
  snap_on_movement: "the quarterback snaps on movement (early stems)",
  communication: "the center re-calls the blocking (early passes not snapped on)",
  adjustment_notice: "the offensive coordinator sees a stem worked",
  adjustment_read: "the defensive coordinator reads the change",
  habit_drop: "the quarterback drops his habit",
};

const CADENCE_ROW_NAME: Readonly<Record<CadenceRow, string>> = {
  HOME: "the offense at home",
  HOME_SHORT: "at home, third or fourth down with 2 yards or less to go",
  ROAD: "the offense on the road",
  OWED: "at home, a hard count owed after a change of count (ADR-092 D8)",
};
const CADENCE_ROW_FILED: Readonly<Record<CadenceRow, string>> = {
  HOME: "80 / 10 / 10",
  HOME_SHORT: "60 / 10 / 30",
  ROAD: "90 / 10 / 0",
  OWED: "0 / 0 / 100",
};

const QUARTER_NAME: Readonly<Record<Quarter, string>> = { "1": "1st quarter", "2": "2nd", "3": "3rd", "4": "4th", OT: "overtime" };

/** ADR-092 §7, every rating at 50, stems on 15 in 100 snaps: count read, works, caught, wasted, hard counts. */
const FILED_7: Readonly<Record<"1" | "2" | "3" | "4" | "whole" | "old", readonly [number, number, number, number, number]>> = {
  "1": [41, 62.4, 22.9, 14.7, 9.7],
  "2": [50, 65.1, 19.2, 15.7, 13.7],
  "3": [55, 66.9, 17.0, 16.1, 15.8],
  "4": [54, 66.2, 17.3, 16.5, 17.7],
  whole: [50, 65.2, 19.0, 15.8, 14.4],
  old: [50, 65.4, 20.0, 14.6, 7.3],
};

const groupCount = (b: StemBucket, group: StemGroup): number =>
  STEM_OUTCOMES.filter((o) => GROUP_OF[o] === group).reduce((a, o) => a + b.outcomes[o], 0);

function goldenRows(golden: readonly Step3Golden[]): string[] {
  const rows = [
    "| league | games | events kept | records taken off | pinned before any picture existed | canonical digest the same | byte digest the same |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const g of golden) {
    const pin = g.pinned;
    rows.push(
      pin === undefined
        ? `| ${g.league} | ${n(g.games)} | ${n(g.events)} | ${n(g.stripped)} | a part of the league; the pins are for all 50 | | |`
        : `| ${g.league} | ${n(g.games)} | ${n(g.events)} | ${n(g.stripped)} | ${n(pin.events)} events | ${tick(g.canonicalFold === pin.canonicalFold && g.events === pin.events)} | ${tick(g.byteFold === pin.byteFold)} |`,
    );
  }
  return rows;
}

function rateRows(stems: readonly Step3Stems[]): string[] {
  const rows = [
    "| league | games | snaps (passes, runs) | snaps a team-game | stem snaps | in 100 snaps | in 100 dropbacks | in 100 runs | a team-game |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const s of stems) {
    const snaps = s.passSnaps + s.runSnaps;
    rows.push(
      `| ${LEAGUE_NAME[s.league]} | ${n(s.games)} | ${n(snaps)} (${n(s.passSnaps)}, ${n(s.runSnaps)}) | ${one(snaps / (2 * s.games))} | ${n(s.all.stems)} | ${one((100 * s.all.stems) / snaps)} | ${one((100 * s.pass.stems) / s.passSnaps)} | ${one((100 * s.run.stems) / s.runSnaps)} | ${(s.all.stems / (2 * s.games)).toFixed(2)} |`,
    );
  }
  return rows;
}

function endingRows(stems: readonly Step3Stems[]): string[] {
  const cols: { readonly head: string; readonly bucket: StemBucket }[] = stems.flatMap((s) => [
    { head: `${LEAGUE_NAME[s.league]} (${n(s.all.stems)})`, bucket: s.all },
    { head: `its offense at home (${n(s.home.stems)})`, bucket: s.home },
    { head: `on the road (${n(s.road.stems)})`, bucket: s.road },
  ]);
  const rows = [
    `| how the stem ended | ${cols.map((c) => c.head).join(" | ")} | ADR-091 §9.2: every man at 50, the offense at home |`,
    `|---|${cols.map(() => "---|").join("")}---|`,
  ];
  for (const o of STEM_OUTCOMES) {
    const filed = FILED_9_2[o];
    rows.push(`| ${OUTCOME_NAME[o]} | ${cols.map((c) => pct(c.bucket.outcomes[o], c.bucket.stems)).join(" | ")} | ${filed === undefined ? "(passes only)" : `${one(filed)}%`} |`);
  }
  for (const g of ["WORKS", "CAUGHT", "WASTED"] as const) {
    rows.push(`| ${GROUP_NAME[g]} | ${cols.map((c) => `**${pct(groupCount(c.bucket, g), c.bucket.stems)}**`).join(" | ")} | **${FILED_GROUP_9_2[g]}** |`);
  }
  return rows;
}

function whyTheyDiffer(stems: readonly Step3Stems[]): string[] {
  const out: string[] = [];
  for (const s of stems) {
    const k = s.all.stems;
    if (k === 0) continue;
    const film = s.sideline.film;
    out.push(
      `- **The ${LEAGUE_NAME[s.league]}.** The Mike's own ratings put ${signed(s.timingTerms.mikeSum / k)} on his timing roll on average (at 50, +20.0); ` +
        `the count read's term ${signed(s.timingTerms.countReadTermSum / k)} (at 50, 0), from an average count read of ${one(s.all.countReadSum / k)} at the stem snaps; ` +
        `his average target ${one(s.timingTerms.targetSum / k)} (50, plus 15 on a quick count and 10 on a hard count). ` +
        `The film read starts each game at ${one(film.count === 0 ? 0 : film.readSum / film.count)} on average, from a ceiling of ${one(film.count === 0 ? 0 : film.ceilingSum / film.count)} (at 50: 34, from 68).`,
    );
  }
  return out;
}

function oddsRows(stems: readonly Step3Stems[]): string[] {
  const head = stems.map((s) => `${LEAGUE_NAME[s.league]}: measured | the dice's odds | apart, in standard errors`).join(" | ");
  const rows = [`| the Mike's timing | ${head} |`, `|---|${stems.map(() => "---|---|---|").join("")}`];
  for (const t of TIMINGS) {
    rows.push(`| ${TIMING_NAME[t]} | ${stems.map((s) => `${n(s.timingOdds[t].observed)} | ${one(s.timingOdds[t].expected)} | ${z(s.timingOdds[t])}`).join(" | ")} |`);
  }
  return rows;
}

function rollRows(stems: readonly Step3Stems[]): string[] {
  const head = stems.map((s) => `${LEAGUE_NAME[s.league]}: thrown | made | the dice's odds | apart`).join(" | ");
  const rows = [`| roll | ${head} |`, `|---|${stems.map(() => "---|---|---|---|").join("")}`];
  for (const k of LINE_ROLLS) {
    rows.push(
      `| ${ROLL_NAME[k]} | ${stems
        .map((s) => {
          const o = s.rollOdds[k];
          return `${n(o.thrown)} | ${n(o.observed)} | ${one(o.expected)} | ${z(o)}`;
        })
        .join(" | ")} |`,
    );
  }
  rows.push(
    `| a shifting lineman misses by 20 or more (caught moving) | ${stems
      .map((s) => `${n(s.shiftCaughtOdds.thrown)} | ${n(s.shiftCaughtOdds.observed)} | ${one(s.shiftCaughtOdds.expected)} | ${z(s.shiftCaughtOdds)}`)
      .join(" | ")} |`,
  );
  return rows;
}

function cadenceRows(stems: readonly Step3Stems[]): string[] {
  const head = stems.map((s) => `${LEAGUE_NAME[s.league]}: stems | normal / quick / hard count`).join(" | ");
  const rows = [`| the snap | ADR-091 D1: normal / quick / hard count, in 100 | ${head} |`, `|---|---|${stems.map(() => "---|---|").join("")}`];
  for (const r of CADENCE_ROWS) {
    rows.push(
      `| ${CADENCE_ROW_NAME[r]} | ${CADENCE_ROW_FILED[r]} | ${stems
        .map((s) => {
          const row = s.cadenceRows[r];
          const total = CADENCES.reduce((a, c) => a + row[c], 0);
          return `${n(total)} | ${CADENCES.map((c: Cadence) => (total === 0 ? "none" : one((100 * row[c]) / total))).join(" / ")}`;
        })
        .join(" | ")} |`,
    );
  }
  return rows;
}

function quarterRows(s: Step3Stems): string[] {
  const rows = [
    "| | stems | count read | works | caught | wasted or called off | hard counts among them | ADR-092 §7 (stems on 15 in 100): read, works, caught, wasted, hard counts |",
    "|---|---|---|---|---|---|---|---|",
  ];
  const line = (name: string, b: StemBucket, filed: readonly number[] | undefined): string =>
    `| ${name} | ${n(b.stems)} | ${b.stems === 0 ? "none" : one(b.countReadSum / b.stems)} | ${pct(groupCount(b, "WORKS"), b.stems)} | ${pct(groupCount(b, "CAUGHT"), b.stems)} | ${pct(groupCount(b, "WASTED"), b.stems)} | ${pct(b.cadences.HARD_COUNT, b.stems)} | ${filed === undefined ? "" : `${String(filed[0])}, ${one(filed[1]!)}%, ${one(filed[2]!)}%, ${one(filed[3]!)}%, ${one(filed[4]!)}%`} |`;
  for (const q of QUARTERS) {
    const b = s.byQuarter[q];
    if (q === "OT" && b.stems === 0) continue;
    rows.push(line(QUARTER_NAME[q], b, q === "OT" ? undefined : FILED_7[q]));
  }
  rows.push(line("**whole game**", s.all, FILED_7.whole));
  rows.push(`| at the old rate, about 4 in 100 (ADR-092 §7's last column) | | | | | | | ${FILED_7.old.map((v, i) => (i === 0 ? String(v) : `${one(v)}%`)).join(", ")} |`);
  return rows;
}

function sidelineRows(stems: readonly Step3Stems[]): string[] {
  const rows = [`| | ${stems.map((s) => LEAGUE_NAME[s.league]).join(" | ")} | filed |`, `|---|${stems.map(() => "---|").join("")}---|`];
  const row = (name: string, cell: (s: Step3Stems) => string, filed: string): void => {
    rows.push(`| ${name} | ${stems.map(cell).join(" | ")} | ${filed} |`);
  };
  const perTeamGame = (s: Step3Stems, count: number): string => (count / (2 * s.games)).toFixed(2);
  row("film reads (one for each offense, each game)", (s) => n(s.sideline.film.count), "");
  row(
    "the film read: ceiling, share, read (averages)",
    (s) => {
      const f = s.sideline.film;
      return f.count === 0 ? "none" : `${one(f.ceilingSum / f.count)}, ${(f.shareSum / f.count).toFixed(2)}, ${one(f.readSum / f.count)} (${one(f.readMin)} to ${one(f.readMax)})`;
    },
    "ADR-092 §4: 68, 0.5, 34 for a quarterback at 50 and a staff at 50",
  );
  row(
    "halftime: the count read before and after (averages)",
    (s) => {
      const h = s.sideline.halftime;
      return h.count === 0 ? "none" : `${one(h.beforeSum / h.count)} to ${one(h.afterSum / h.count)} (${n(h.count)})`;
    },
    "§5.2: a quarter of the gap to the ceiling, with every coordinator at 50",
  );
  row("stems that worked against the offense, a team-game", (s) => perTeamGame(s, s.sideline.stemsWorked), "");
  row(
    "the offensive coordinator looks back at a drive in which one worked, a team-game",
    (s) => perTeamGame(s, s.sideline.notices),
    "",
  );
  row(
    "**he sees it and changes his count, a team-game**",
    (s) => `**${perTeamGame(s, s.sideline.changes)}**`,
    "§10 P4: 1.5 to 3.5 a game (computed 2.4), at 15 stems in 100 snaps",
  );
  row("the defensive coordinator reads the change", (s) => (s.sideline.changes === 0 ? "none" : `${n(s.sideline.dcReads)} (${pct(s.sideline.dcReads, s.sideline.changes)})`), "§5.4: 50 in 100 at even ratings");
  row("hard counts ordered on the next snaps (three at home)", (s) => n(s.sideline.hardCountsOrdered), "");
  row(
    "the quarterback told to drop his habit: told, dropped",
    (s) => `${n(s.sideline.habitsRolled)}, ${n(s.sideline.habitsDropped)}`,
    "§5.4: 71 in 100 at Discipline 50",
  );
  row(
    "the count read before and after a change (averages)",
    (s) => (s.sideline.changes === 0 ? "none" : `${one(s.sideline.readBeforeSum / s.sideline.changes)} to ${one(s.sideline.readAfterSum / s.sideline.changes)}`),
    "",
  );
  return rows;
}

export function renderStep3(m: Step3Measure): string {
  const out: string[] = [];
  out.push("# ADR-090 step 3: the stem at the line, and the count read (ADR-091 step S-a)");
  out.push("");
  out.push(
    `_Written by \`pnpm --filter @ff/calibration snap-spots -- --step 3\`. The golden games (50 in each test league, ADR-089 plan §0) for the proof, and both leagues' base corpora (ADR-089 step 0, seed set 1: the flat league's 496 games and the generated league's 2027 season of 272) for the numbers, all with the default caller (${STEP3_CALLER}) under today's rules (\`legacy\`), read back from their event streams alone._`,
  );
  out.push("");
  out.push(
    "On a snap whose defense wears a Stem, the Mike now calls it at the line. The quarterback answers with his count (normal, quick, or a hard count, at home only). The Mike's timing decides how it ends: on time, early, caught, or called off. On an on-time stem each shifting lineman sets, or is caught still moving; on an early one the quarterback may have the ball snapped while the line moves, and on a pass the center may re-call the blocking. Between snaps the sideline's count read moves: the film read at kickoff, a little more every snap, the staff's notes at halftime, and the offensive coordinator's change of count after a drive in which a stem worked against him.",
  );
  out.push("");
  out.push(
    "All of it is written into the play's record and drawn on the snap picture, and **nothing after the snap reads any of it at this step** (ADR-091 §10's arm T), so every game is the game it was. The effects come at step S-b, once the pocket fix has finished measuring; under the pocket fix's rules (`pocket-1`) none of this runs, as agreed with that work.",
  );
  out.push("");

  out.push("## 1. Nothing moved");
  out.push("");
  out.push(
    "With this step's records taken off (the `STEM` and `SIDELINE_ADJUSTMENT` events and the `CHECK`s of the seven new kinds, ADR-089's strip list, risk K11) and step 1's picture as before, every game is the game it was: the same events, every number the same. The offense's count is echoed nowhere else in the stream (the `STEM` carries it), so there is nothing more to take off.",
  );
  out.push("");
  out.push(...goldenRows(m.golden));
  out.push("");
  out.push(
    "The test suite checks the same pins for all seven callers and both leagues (28 folds), the real season's pinned path (`realSeasonSeam.test.ts`), and every `pocket-1` arm's pins byte for byte, with nothing taken off.",
  );
  out.push("");

  out.push("## 2. The engine kept every rule");
  out.push("");
  out.push("Read back from the streams of both base corpora, every stem snap and every snap's sideline:");
  out.push("");
  out.push(`| the rule | ${m.stems.map((s) => LEAGUE_NAME[s.league]).join(" | ")} |`);
  out.push(`|---|${m.stems.map(() => "---|").join("")}`);
  for (const k of PROBLEM_KINDS) {
    out.push(`| ${PROBLEMS[k]} | ${m.stems.map((s) => (s.problems[k].length === 0 ? "✅ kept" : `❌ ${n(s.problems[k].length)} broken`)).join(" | ")} |`);
  }
  const broken = m.stems.flatMap((s) => PROBLEM_KINDS.flatMap((k) => s.problems[k].map((p) => `${s.league} ${k}: ${p}`)));
  if (broken.length > 0) {
    out.push("");
    for (const why of broken.slice(0, 20)) out.push(`- ${why}`);
    if (broken.length > 20) out.push(`- and ${n(broken.length - 20)} more`);
  }
  out.push("");

  out.push("## 3. How often the Mike stems");
  out.push("");
  out.push(...rateRows(m.stems));
  out.push("");
  out.push(
    "Today's caller wears the Stem as ADR-073 left it: a front look on one legal call in ten, and the Stem one of two looks (ADR-091 §7.4: about 4 snaps in 100, about 2.5 a team-game at the 62 snaps a team-game it assumed; these games have more snaps, so a few more stems a game at the same rate). The league's rate of 15 in 100 (about 9 a game, D15) and each coordinator's own rate (D16) come with step S-b.",
  );
  out.push("");

  out.push("## 4. How the stems ended");
  out.push("");
  out.push(...endingRows(m.stems));
  out.push("");
  out.push(
    "ADR-091 §9.2's figures are for every man rated 50 and the count read at 50; neither league is that, so the shares are set against the dice's own odds for these men in §5, which is the test that the formulas are built as filed. What moves the leagues off §9.2:",
  );
  out.push("");
  out.push(...whyTheyDiffer(m.stems));
  out.push("");
  out.push(
    "On a run the center has no re-call to make (ADR-091 §6), so an early stem the quarterback did not snap on works, as on time. §9.2's table is for passes; the groups compare across both.",
  );
  out.push("");

  out.push("## 5. The dice against their own odds");
  out.push("");
  out.push(
    "Each roll is a d100 plus whole modifiers against a target, and its record carries both, so the chance of each result on each snap is exact (the faces of the die, counted). Summed over the snaps, that is what the dice should give for these men. A measured count within about 2 standard errors of it is the dice behaving; D3's table (the Mike's timing by margin and count) is restated in the report from the ADR, so this also checks the engine's reading of it.",
  );
  out.push("");
  out.push(...oddsRows(m.stems));
  out.push("");
  out.push(...rollRows(m.stems));
  out.push("");
  const gaps = m.stems.flatMap((s) =>
    [...TIMINGS.map((t) => s.timingOdds[t]), ...LINE_ROLLS.map((k) => s.rollOdds[k]), s.shiftCaughtOdds]
      .filter((o) => o.variance > 0)
      .map((o) => Math.abs(o.observed - o.expected) / Math.sqrt(o.variance)),
  );
  const largest = gaps.reduce((a, g) => Math.max(a, g), 0);
  const beyond2 = gaps.filter((g) => g > 2).length;
  out.push(
    `${n(gaps.length)} comparisons; the largest is ${largest.toFixed(2)} standard errors apart, and ${beyond2 === 0 ? "none is" : beyond2 === 1 ? "one is" : `${n(beyond2)} are`} more than 2 apart. Chance alone puts about one comparison in twenty more than 2 apart and about one in four hundred more than 3, so ${largest > 3 ? "**a gap beyond 3 is a finding to look into**" : "the dice behave as filed"}.`,
  );
  out.push("");

  out.push("## 6. The quarterback's count");
  out.push("");
  out.push("Asked only on a stem snap (nothing else reads the count yet, ADR-005), from ADR-091 D1's mix:");
  out.push("");
  out.push(...cadenceRows(m.stems));
  out.push("");
  const thin = m.stems.flatMap((s) =>
    CADENCE_ROWS.filter((r) => {
      const total = CADENCES.reduce((a, c) => a + s.cadenceRows[r][c], 0);
      // An owed hard count is drawn from no mix, so a thin row there is no noise.
      return r !== "OWED" && total > 0 && total < 100;
    }).map((r) => `${CADENCE_ROW_NAME[r]} in the ${LEAGUE_NAME[s.league]} (${n(CADENCES.reduce((a, c) => a + s.cadenceRows[r][c], 0))} stems)`),
  );
  if (thin.length > 0) {
    out.push(`Few stems fall in some rows, where each stem moves a share by several points: ${thin.join("; ")}.`);
    out.push("");
  }

  out.push("## 7. The count read through a game");
  out.push("");
  out.push(
    "How well the defense knew the offense's count at each stem snap (`STEM.countRead`, 0 to 100), and how the stems ended, by quarter. ADR-092 §7's figures are for every man at 50 and stems on 15 in 100 snaps (its last column, the old rate of about 4 in 100, is today's rate); its ceiling is 68 where a quarterback is rated 50.",
  );
  for (const s of m.stems) {
    out.push("");
    out.push(`**The ${LEAGUE_NAME[s.league]}.**`);
    out.push("");
    out.push(...quarterRows(s));
  }
  out.push("");
  out.push(
    "**ADR-092's P2** (filed for its arm with every coordinator at 50, which is this step's): the caught share in first quarters exceeds the second half's by 3 to 9 points (computed 5.7 at 15 stems in 100). It is graded at step S-b, at the league's rate; at today's rate it reads:",
  );
  out.push("");
  for (const s of m.stems) {
    const q1 = s.byQuarter["1"];
    const second = [s.byQuarter["3"], s.byQuarter["4"]];
    const stems2 = second.reduce((a, b) => a + b.stems, 0);
    const caught2 = second.reduce((a, b) => a + groupCount(b, "CAUGHT"), 0);
    if (q1.stems === 0 || stems2 === 0) continue;
    const q1Share = (100 * groupCount(q1, "CAUGHT")) / q1.stems;
    const share2 = (100 * caught2) / stems2;
    out.push(
      `- the ${LEAGUE_NAME[s.league]}: caught on ${one(q1Share)}% of first-quarter stems and ${one(share2)}% of second-half stems, ${one(q1Share - share2)} points apart${q1Share - share2 >= 3 && q1Share - share2 <= 9 ? ", inside P2's range" : ", outside P2's range"}.`,
    );
  }
  out.push("");

  out.push("## 8. The sideline");
  out.push("");
  out.push(...sidelineRows(m.stems));
  out.push("");
  out.push(
    "Every coordinator is at 50 until the weekly plan reaches the game (ADR-092 R1, step S-b2), and every staff's film share is one half (§4.4). At today's rate a defense stems about 2.5 times a team-game, so the offensive coordinator has fewer stems to answer than §10's P4 assumed (15 in 100 snaps); P4 is graded at step S-b, at the league's rate.",
  );
  out.push("");
  return out.join("\n");
}
