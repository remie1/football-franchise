/**
 * ADR-090 step 1's report, in plain words where it can be: nothing moved, every play carries a whole
 * picture, and where each man starts against the square the engine plays him in today.
 */
import { CELL_JOBS, ENGINE_CELL_RULE, type CellJob } from "./cells.js";
import { STEP1_CALLER, type Step1League, type Step1Measure } from "./step1.js";

const n = (value: number): string => value.toLocaleString("en-US");
const tick = (ok: boolean): string => (ok ? "✅ yes" : "❌ no");
const share = (part: number, whole: number): string => (whole === 0 ? "none" : `${n(part)} (${((100 * part) / whole).toFixed(1)}%)`);

const JOB_NAME: Readonly<Record<CellJob, string>> = {
  PASSER: "the quarterback",
  PROTECTION: "men in protection (the line, and a back or tight end kept in)",
  ROUTE: "route runners",
  RUSH: "rushers",
  MAN: "man defenders",
  ZONE: "zone defenders",
};

/** Why each kind of man starts where he does against the engine's square: the reading every row of §3 needs. */
const WHY: Readonly<Record<CellJob, string>> = {
  PASSER:
    "The engine's backfield square is the middle lane behind the line; he stands there under center or in the gun.",
  PROTECTION:
    "The line stands in the middle lane, behind the ball. A tight end or back kept in to block who lines up more than 3.5 yards across stands in a half lane (table D2), where the engine still puts him in the middle.",
  ROUTE:
    "He starts on or behind the line, which §3.2's bands count as the backfield (it ends at the line), and the engine puts him where his route breaks. So the band matches only on a route that breaks behind the line (a swing or a flat), and the lane matches when the route breaks in the lane he lines up in.",
  RUSH:
    "The engine puts every rusher in the backfield square for the whole play, where he is going. He starts a yard downfield of the ball, the defense's side of the line (the short band), inside in the middle lane or outside in a half lane.",
  MAN:
    "The engine puts him on his man's break square. He starts across from his man (press 1 yard, off 5 to 7), short of where the route takes them both.",
  ZONE:
    "The engine puts him on his zone's landmark. He starts short of it (a deep third at 7 yards, a deep half at 12, an underneath zone at 4.5 to 8), and a man who shows one look and plays another starts where the look puts him.",
};

function inertRows(leagues: readonly Step1League[]): string[] {
  const rows = ["| league | games | events | pinned before any picture existed | canonical digest the same | byte digest the same |", "|---|---|---|---|---|---|"];
  for (const l of leagues) {
    const pin = l.pinned;
    rows.push(
      pin === undefined
        ? `| ${l.league} | ${n(l.games)} | ${n(l.events)} | a part of the league; the pins are for all 50 | | |`
        : `| ${l.league} | ${n(l.games)} | ${n(l.events)} | ${n(pin.events)} events | ${tick(l.canonicalFold === pin.canonicalFold && l.events === pin.events)} | ${tick(l.byteFold === pin.byteFold)} |`,
    );
  }
  return rows;
}

export function renderStep1(m: Step1Measure): string {
  const c = m.cells;
  const out: string[] = [];
  out.push("# ADR-090 step 1: the snap picture on every play");
  out.push("");
  out.push(
    `_Written by \`pnpm --filter @ff/calibration snap-spots -- --step 1\`. The golden games (50 in the flat league and 50 in the generated one, ADR-089 plan §0), played with the default caller (${STEP1_CALLER}), read back from their event streams alone._`,
  );
  out.push("");
  out.push(
    "Step 1 draws where every man stands at the snap on every play and publishes it on the play's start record (`PLAY_START`, field `snap`). The play-caller draws it with the playbook, the calls carry it into the simulation and the simulation copies it out; nothing in play reads it yet. This report checks three things: nothing moved; every play carries a whole picture; and where each man starts against the square the engine plays him in today, with every difference listed (ADR-090 §3, §7).",
  );
  out.push("");

  out.push("## 1. Nothing moved");
  out.push("");
  out.push(
    "With the picture taken off the start record, every game is the game it was: the same events, every number the same. The pins were measured at e23bf69, before any picture existed (ADR-089 plan §0), and the picture is taken off by ADR-089's strip list, whose one entry is this step's (`PLAY_START.payload.snap`, risk K11).",
  );
  out.push("");
  out.push(...inertRows(m.leagues));
  out.push("");
  out.push(
    "The test suite checks the same pins for all seven callers and both leagues, and the real season's pinned path (`goldenDigests.*.test.ts`, `realSeasonSeam.test.ts`).",
  );
  out.push("");

  out.push("## 2. Every play carries a whole picture");
  out.push("");
  out.push("| | |");
  out.push("|---|---|");
  out.push(`| games | ${n(c.games)} |`);
  out.push(`| plays | ${n(c.plays)} (${n(c.passPlays)} passes, ${n(c.runPlays)} runs) |`);
  out.push(`| plays with a picture | ${share(c.pictures, c.plays)} |`);
  out.push(`| pictures not whole | ${n(c.broken.length)} |`);
  out.push("");
  out.push(
    "Whole means eleven different men on each side, each on his own team and on his own side of the ball (nobody lines up offside), with every man the call names in it: the quarterback, the route runners and the blockers, the rushers and the coverage men.",
  );
  if (c.broken.length > 0) {
    out.push("");
    for (const why of c.broken.slice(0, 20)) out.push(`- ${why}`);
    if (c.broken.length > 20) out.push(`- and ${n(c.broken.length - 20)} more`);
  }
  out.push("");

  out.push("## 3. Where each man starts, against the square the engine plays him in today");
  out.push("");
  out.push(
    "The engine's field is a grid, five lanes across by five bands deep (match-engine §3). Today it puts every man in one square for the whole play: the quarterback, the men in protection and the rushers in the backfield square (the middle lane, behind the line), a route runner where his route breaks, a man defender where his man's route breaks, and a zone defender on his zone's landmark. A snap spot falls in a square by table D2: the middle lane under 3.5 yards across, the half lanes to 13, the wide lanes beyond; the bands by depth, as routes are banded.",
  );
  out.push("");
  out.push(
    "So most differences are by design: the engine's square is where a man plays, and the snap spot is where he starts. **Nothing reads the picture at step 1, so none of them moves a number.** They are what a later step changes when it reads a man's spot instead of his square: step 2 reads the rushers' spots (the pocket fix's free runners).",
  );
  out.push("");
  out.push("Pass plays only: on a run the engine puts nobody in a square (it plays gaps), so a run has no square to compare.");
  out.push("");
  out.push("| who | the engine's square today | men | same square | same lane | same band |");
  out.push("|---|---|---|---|---|---|");
  for (const job of CELL_JOBS) {
    const row = c.byJob[job];
    out.push(
      `| ${JOB_NAME[job]} | ${ENGINE_CELL_RULE[job]} | ${n(row.men)} | ${share(row.sameCell, row.men)} | ${share(row.sameLane, row.men)} | ${share(row.sameBand, row.men)} |`,
    );
  }
  out.push("");
  out.push(
    `Not compared: ${n(c.manWithNoRoute)} man defenders whose man stayed in to block (he runs no route, so he breaks to no square), and nobody else. ` +
      (c.routesWithNoBreakCell === 0
        ? "Every route stated where it breaks."
        : `${n(c.routesWithNoBreakCell)} routes stated no break square (a hot route the card left one off); the engine plays those in its default lane, and so does this check.`),
  );
  out.push("");
  out.push("### Why they differ");
  out.push("");
  for (const job of CELL_JOBS) out.push(`- **${JOB_NAME[job][0]!.toUpperCase()}${JOB_NAME[job].slice(1)}.** ${WHY[job]}`);
  out.push("");
  out.push("### Every difference");
  out.push("");
  out.push("Squares are written lane/band: lanes LW, LH, C, RH, RW from the offense's left; bands BACKFIELD, SHORT, INTERMEDIATE, DEEP, VERY_DEEP.");
  for (const job of CELL_JOBS) {
    const rows = c.differences.filter((d) => d.job === job);
    out.push("");
    out.push(`**${JOB_NAME[job][0]!.toUpperCase()}${JOB_NAME[job].slice(1)}** (${rows.length === 0 ? "none differ" : `${n(rows.reduce((a, d) => a + d.men, 0))} men in ${n(rows.length)} pairs`}).`);
    if (rows.length === 0) continue;
    out.push("");
    out.push("| the engine's square | his snap square | men |");
    out.push("|---|---|---|");
    for (const d of rows) out.push(`| ${d.engine} | ${d.snap} | ${n(d.men)} |`);
  }
  out.push("");
  return out.join("\n");
}
