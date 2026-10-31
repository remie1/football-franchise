/**
 * ADR-090 step 0's report, in the owner's words where it can be: the pictures counted, table D4
 * against the August ranges, what a look costs in ground, the offense's spots, and every rule
 * step 0 had to choose where the tables were silent.
 */
import type { DefenseGroup, SnapSpot } from "@ff/playbook";
import { FAR_LOOK_YARDS, type SnapSpotsMeasure, type Tally } from "./measure.js";

const GROUP_NAME: Readonly<Record<DefenseGroup, string>> = {
  LINE: "down linemen",
  BACKERS: "linebackers",
  CORNERS: "outside corners",
  NICKEL_DIME: "slot corners (nickel and dime)",
  SAFETIES: "safeties",
};

const n = (value: number): string => value.toLocaleString("en-US");
const yards = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const tick = (ok: boolean): string => (ok ? "✅ yes" : "❌ no");

/** "4.5 (1,234), 5.5 (12)", keys sorted as numbers where they are numbers. */
function tallyLine(tally: Tally): string {
  const keys = Object.keys(tally).sort((a, b) => {
    const [x, y] = [Number.parseFloat(a), Number.parseFloat(b)];
    return Number.isNaN(x) || Number.isNaN(y) ? a.localeCompare(b) : x - y || a.localeCompare(b);
  });
  return keys.length === 0 ? "none" : keys.map((k) => `${k} (${n(tally[k] ?? 0)})`).join(", ");
}

const depthsOf = (tally: Tally): readonly number[] => Object.keys(tally).map(Number.parseFloat);
const spot = (s: SnapSpot): string => `${yards(s.x)}, ${yards(s.y)}`;

/** The rules the tables did not name, each `CHOSEN — provenance NONE` (ADR-090 §12), in plain words. */
export const CHOSEN_RULES: readonly string[] = [
  "**A lineman who drops into coverage lines up where he would rush from** (his run-fit gap, hand down), so the drop does not show before the snap.",
  "**A linebacker with no run fit stands over the inside receiver** on his zone's side, 4.5 deep.",
  "**A linebacker in man stays at 4.5 deep**, a yard inside his man, whatever the technique says.",
  "**A quarters safety stands where a deep-half safety does**: 12 deep, 9 across.",
  "**An underneath safety (hook, curl or flat) stands over the inside receiver on his zone's side**, 8 deep; on a side with one receiver, halfway between that receiver and the tackle. The design's table said \"over the strong side's inside receiver\", which put Cover 3 Sky's strong safety against Trips over the trips while his flat was on the other side. **One who plays the hole or robs the middle stands in the middle**, 8 deep.",
  "**A prevent deep man stands 15 deep in his lane**: -18, -9, 0, 9 or 18 across.",
  "**A corner with no receiver split out on his side stands 8 yards out from the ball.**",
  "**A slot corner with no slot receiver to his side stands halfway between the outside receiver and the tackle**, or 7 yards out if there is no receiver at all; in a deep zone he stands 7 deep.",
  "**A man covered by a linebacker and a defensive back at once is bracketed**: the linebacker a yard inside him, the back a yard outside.",
  "**Nobody stands on anybody**: when two men would be closer than a yard, a pass rusher keeps his gap, then a man-to-man defender keeps his man, and a zone player steps back a yard until he is clear. The one exception is the one the call asks for: a Mug linebacker walked up behind his tackle.",
  "**A safety or corner who blitzes lines up 5 deep**, over his gap (a safety) or outside the outside receiver (a corner).",
  "**Only a tight end is an inline end** (4.5 out, hand down): a wide receiver next to the tackle uses the slot spot.",
  "**A lone back in the shotgun stands on the weak side**, beside the quarterback; **split backs stand 1.5 yards either side of him**, which the grid counts as the middle lane, not the half lanes the formation names (step 1 lists this difference with every other one).",
  "**A back the formation sets off the middle stands 1.5 yards to that side**: under center at his depth, in the pistol beside the quarterback at 4.",
  "**Stance**: the offensive line, an inline end and every defensive lineman have a hand down; everyone else is up.",
  "**Every Stem ends on time until ADR-091's step S-a** builds its four endings: the line is set in the front it shifted to.",
  "**A creeper the Mug walked up is already up**: he is set at his Mug spot at the snap and does not creep again.",
];

export function renderSnapSpots(m: SnapSpotsMeasure): string {
  const lines: string[] = [];
  const out = (line = ""): void => {
    lines.push(line);
  };

  const backersOk = depthsOf(m.backersNotRushing).every((y) => y >= 4 && y <= 7);
  const press = m.manDepths.filter((r) => r.technique === "PRESS");
  const off = m.manDepths.filter((r) => r.technique === "OFF");
  const pressOk = press.every((r) => r.depth >= 1 && r.depth <= 2);
  const offOk = off.every((r) => r.depth >= 5 && r.depth <= 8);
  const techniques = Object.keys(m.technique).map(Number);
  const lineOk = techniques.every((t) => t >= 0 && t <= 9) && Object.keys(m.lineDepths).every((k) => k === "1 DOWN");
  const lev = (help: string, shade: string): number =>
    m.leverage.filter((r) => r.help === help && r.shade === shade).reduce((a, r) => a + r.men, 0);
  const levTotal = (help: string): number => m.leverage.filter((r) => r.help === help).reduce((a, r) => a + r.men, 0);
  const withHelp = "a safety in the deep middle";
  const noHelp = "nobody in the deep middle";
  const bracket = "bracketed with a backer";
  // Head up is right only on a man in the middle of the field (a back behind the quarterback),
  // who has no inside to shade to.
  const leverageOk =
    lev(withHelp, "outside") === levTotal(withHelp) &&
    lev(noHelp, "outside") === 0 &&
    lev(bracket, "outside") === levTotal(bracket);
  const sharedOk = m.otherSharedSpots.length === 0;

  out("# ADR-090 step 0: where every man stands at the snap");
  out();
  out(
    "*Written by `pnpm --filter @ff/calibration snap-spots`. No seed: the pictures are tables read off the call, and no die is rolled. " +
      "Step 0 changes no game: nothing in play calls this code yet; step 1 publishes the picture and the viewer draws it.*",
  );
  out();
  out("## 1. What was drawn");
  out();
  out(
    `- **${n(m.pictures)} pictures**: ${m.calls} calls (the book's cards, v6's coverages, and the composed pressures and creepers), ` +
      `worn ${m.wornCalls} ways (bare, and in every set of coverage looks each can wear, early and late where a safety rotates), ` +
      `under no front look, the Mug (${n(m.mugPictures)} pictures) or the Stem (${n(m.stemPictures)}), against each of the ${m.formations} formations.`,
  );
  out(
    `- **All 22 men in every picture, each once:** ${tick(m.incomplete.length === 0)}${m.incomplete.length === 0 ? "" : ` (${m.incomplete.length} short: ${m.incomplete.slice(0, 5).join("; ")})`}.`,
  );
  out(
    `- **Nobody stands on anybody** (closer than a yard both ways) except the two the calls ask for: the quarterback under center behind his center ` +
      `(${n(m.quarterbackBehindCenter)}), and a Mug linebacker walked up behind his tackle (${n(m.mugBackerBehindTackle)}). ` +
      `Anyone else: ${sharedOk ? "none ✅" : `❌ ${m.otherSharedSpots.length}: ${m.otherSharedSpots.slice(0, 5).join("; ")}`}.`,
  );
  out(
    "- **Mirror symmetry and same call, same picture** are proved by the playbook's tests (`packages/playbook/test/snapSpots.test.ts`), " +
      "over these pictures and their mirror images; the mirror test names the few men it leaves out, and why.",
  );
  out();
  out("## 2. Table D4 against the owner's August ranges");
  out();
  out("| what | August range (`ADR-066:607-610`) | the table | drawn in the book (yards: men) | inside? |");
  out("|---|---|---|---|---|");
  out(
    `| down lineman | technique 0 to 9 | 1 yard off the ball, hand down; A gap a 1, B a 3, C a 5, D a 9; an edge rusher a step wider (a C-gap end is a 6) | technique ${tallyLine(m.technique)} | ${tick(lineOk)} |`,
  );
  out(
    `| linebacker, not rushing | 4 to 7 deep | 4.5 (a step back to 5.5 if a man is in his spot) | ${tallyLine(m.backersNotRushing)} | ${tick(backersOk)} |`,
  );
  out(
    `| press, man to man | 1 to 2 | 1 | ${press.map((r) => `${GROUP_NAME[r.group]} ${yards(r.depth)} (${n(r.men)})`).join(", ")} | ${tick(pressOk)} |`,
  );
  out(
    `| off, man to man | 5 to 8 | outside corner 7, slot corner 5, safety 7 | ${off.map((r) => `${GROUP_NAME[r.group]} ${yards(r.depth)} (${n(r.men)})`).join(", ")} | ${tick(offOk)} |`,
  );
  out(
    `| leverage | flips with where the help is | a yard outside his man with a safety in the deep middle, a yard inside with nobody there; outside when a linebacker brackets him | ` +
      `with a safety in the middle: outside ${n(lev(withHelp, "outside"))} of ${n(levTotal(withHelp))}; with nobody: inside ${n(lev(noHelp, "inside"))} of ${n(levTotal(noHelp))}, ` +
      `head up ${n(lev(noHelp, "head up"))} (a back straight behind the quarterback, who has no inside); bracketed: outside ${n(lev(bracket, "outside"))} of ${n(levTotal(bracket))} | ${tick(leverageOk)} |`,
  );
  out();
  out(
    "Today's book presses every outside corner it puts in man, so the table's 7 yards off for an outside corner is drawn only by a test card (it stands at 7, outside his man). " +
      `Linebackers who rush line up at ${tallyLine(m.backersRushing)}: 2.5 walked up for a blitz the call shows, 4.5 for one it disguises. ` +
      "A Mug walks them up to 1.5 as a look (section 4).",
  );
  out();
  out(
    "**The NFL's tracking data (the Big Data Bowl)** could not be checked: its terms of use and its files are on operations.nfl.com and www.kaggle.com, " +
      "which this environment's network does not reach, and the files need a Kaggle account. So this report checks the table against the August ranges alone, " +
      "as ADR-090 §9 allows. Allowing those two sites would let a later step compare against real snap-frame spots, if the terms allow it.",
  );
  out();
  out("## 3. Where the defense lines up across the book (aligned spots, before any look)");
  out();
  out("| group | depth in yards (men) |");
  out("|---|---|");
  for (const group of ["LINE", "BACKERS", "CORNERS", "NICKEL_DIME", "SAFETIES"] as const) {
    out(`| ${GROUP_NAME[group]} | ${tallyLine(m.alignedDepths[group])} |`);
  }
  out();
  out("## 4. What a look costs in ground");
  out();
  out(
    "For each man a look moves: how far his shown spot is from the spot his real job would line him up at, and how far he still is from it when the ball is snapped. " +
      "An early rotation has finished before the snap; a late one, a corner look and the Mug are held until the snap; every Stem ends on time until ADR-091 step S-a. " +
      "Nothing reads this ground yet: step 4 makes it cost time after the snap.",
  );
  out();
  out("| look | who it moves | men moved | shown spot from his real spot (average, most) | still to cover at the snap (average, most) |");
  out("|---|---|---|---|---|");
  const looks = [...m.looks].sort((a, b) => a.look.localeCompare(b.look) || a.group.localeCompare(b.group));
  for (const row of looks) {
    out(
      `| ${row.look} | ${GROUP_NAME[row.group]} | ${n(row.men)} | ${row.shownMean.toFixed(1)}, ${row.shownMax.toFixed(1)} | ${row.atSnapMean.toFixed(1)}, ${row.atSnapMax.toFixed(1)} |`,
    );
  }
  out();
  if (m.farLooks.length === 0) {
    out(`No look shows a man more than ${FAR_LOOK_YARDS} yards from his real spot.`);
  } else {
    out(
      `**Shown more than ${FAR_LOOK_YARDS} yards from his real spot:** ` +
        [...m.farLooks]
          .sort((a, b) => b.yards - a.yards)
          .map((f) => `${f.look} over ${f.call}, ${f.role}, up to ${f.yards.toFixed(1)}`)
          .join("; ") +
        ". A look picks each safety's half from the card, before it knows the formation (`masks.ts`, `strongSafetySide`): " +
        "from the side of his man when the card names one, else from his run fit. Nothing reads this ground yet; " +
        "step 4, which makes it cost time after the snap, should look at these first.",
    );
  }
  out();
  out("## 5. The offense (beat 1, table D3)");
  out();
  out(
    "Across from the ball (negative is the offense's left) and back from the line of scrimmage, in yards. " +
      "The line is the same in every formation: tackles at -3 and 3, guards at -1.5 and 1.5, the center at 0, all half a yard off the ball, hands down.",
  );
  out();
  out("| formation | quarterback | backs and receivers |");
  out("|---|---|---|");
  for (const row of m.offense) {
    const qb = row.spots.find((s) => s.role === "QB");
    const others = row.spots.filter((s) => !["QB", "LT", "LG", "C", "RG", "RT"].includes(s.role));
    out(
      `| ${row.formation} | ${qb === undefined ? "?" : spot(qb.spot)} | ${others.map((s) => `${s.role} ${spot(s.spot)}${s.spot.stance === "DOWN" ? " (hand down)" : ""}`).join("; ")} |`,
    );
  }
  out();
  out(
    `**The grid (D2).** ${n(m.lanesCompared)} backs and receivers mapped from their spots to the engine's lanes; ` +
      `${m.laneDifferences.length} differ from the lane their formation names: ${m.laneDifferences.length === 0 ? "none" : m.laneDifferences.join("; ")}. ` +
      "Step 1 lists every such difference before anything reads the picture (ADR-090 §7).",
  );
  out();
  out("## 6. Rules step 0 had to choose");
  out();
  out(
    "The design's tables (D3, D4, D5) are used value for value. The book asked for some jobs they do not name; each rule below is `CHOSEN`, a placeholder like the tables, until formations author their own splits and ratings move men.",
  );
  out();
  for (const rule of CHOSEN_RULES) out(`- ${rule}`);
  out();
  return lines.join("\n");
}
