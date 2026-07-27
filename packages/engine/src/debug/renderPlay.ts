/**
 * §17.1 debug printout, rendered PURELY from the event stream.
 *
 * The only inputs are `MatchEventEnvelope[]` and a name lookup — this module
 * cannot see engine internals, and the engine never prints anything itself.
 * Sections outside the pass-play slice (zone coverage, YAC, environmental)
 * simply do not render because no events describe them.
 */
import type { MatchEvent, MatchEventEnvelope, PlayerId, RollDetail } from "@ff/contracts";
import { bandFor } from "../rolls.js";
import { TUNABLES } from "../tunables.js";

export type NameLookup = (id: PlayerId) => string;

const RULE = "=".repeat(71);

export function renderPlay(events: readonly MatchEventEnvelope[], names: NameLookup): string {
  const lines: string[] = [];
  const name = (id: PlayerId): string => names(id);

  lines.push(RULE, "PLAY DEBUG OUTPUT", RULE, "");
  lines.push(...renderPlayCall(events));
  lines.push(...renderLineBattle(events, name));
  lines.push(...renderRoutes(events, name));
  lines.push(...renderQbDecisionMaking(events, name));
  lines.push(...renderThrow(events, name));
  lines.push(...renderCatch(events, name));
  lines.push(...renderResult(events));
  lines.push(RULE);
  return lines.join("\n");
}

// --- sections ---------------------------------------------------------------

function renderPlayCall(events: readonly MatchEventEnvelope[]): string[] {
  const start = firstOfType(events, "PLAY_START");
  const view = start === undefined ? undefined : readPlayStart(start.payload);
  if (view === undefined) return [];
  return [
    "PLAY CALL:",
    `  Offense: ${view.offenseFormation}, "${view.offenseCall}" (Pass)`,
    `  Defense: ${view.defenseFront}, "${view.defenseCall}" (${view.coverage})`,
    "",
    "SITUATION:",
    `  Down ${view.down} & ${view.distance}, ball on ${view.ballOn}`,
    "",
  ];
}

function renderLineBattle(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const matchups = new Map<string, { rusher: PlayerId; blocker: PlayerId; rows: string[] }>();
  for (const { event } of events) {
    if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
    const rusher = event.payload.actors[0];
    const blocker = event.payload.actors[1];
    const opposed = event.payload.opposedRoll;
    if (rusher === undefined || blocker === undefined || opposed === undefined) continue;
    const key = `${String(rusher)}|${String(blocker)}`;
    const entry = matchups.get(key) ?? { rusher, blocker, rows: [] };
    const band = bandFor(TUNABLES.passRush.bands, event.payload.margin);
    entry.rows.push(
      `  │    Tick ${tickLabel(event.tick)}: rush ${event.payload.roll.total} vs. block ${opposed.total}` +
        ` → ${band.label} (${signed(event.payload.margin)})`,
    );
    matchups.set(key, entry);
  }

  const pocket = events.flatMap(({ event }) =>
    event.type === "POCKET_STATUS" ? [`       Tick ${tickLabel(event.tick)}: ${event.payload.status}`] : [],
  );

  if (matchups.size === 0 && pocket.length === 0) return [];

  const out: string[] = ["LINE BATTLE:"];
  for (const entry of matchups.values()) {
    out.push(`  ├─ ${name(entry.blocker)} vs. ${name(entry.rusher)}:`);
    out.push(...entry.rows);
    out.push("  │");
  }
  if (pocket.length > 0) {
    out.push("  └─ POCKET STATUS:", ...pocket);
  }
  out.push("");
  return out;
}

function renderRoutes(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const routeNames = new Map<string, string>();
  const timeline = new Map<string, string[]>();
  for (const { event } of events) {
    if (event.type !== "ROUTE_STATUS") continue;
    const key = String(event.payload.receiver);
    routeNames.set(key, event.payload.route);
    const rows = timeline.get(key) ?? [];
    rows.push(`${tickLabel(event.tick)} ${event.payload.phase}(${event.payload.openness})`);
    timeline.set(key, rows);
  }

  const releases = new Map<string, MatchEventEnvelope>();
  const coverages = new Map<string, MatchEventEnvelope>();
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "CHECK") continue;
    const receiver = event.payload.actors[0];
    if (receiver === undefined) continue;
    if (event.payload.checkKind === "release_vs_press") releases.set(String(receiver), envelope);
    if (event.payload.checkKind === "man_coverage") coverages.set(String(receiver), envelope);
  }

  if (timeline.size === 0) return [];

  const out: string[] = ["ROUTE DEVELOPMENT:"];
  for (const [key, rows] of timeline) {
    const receiverId = key as unknown as PlayerId;
    out.push(`  ├─ ${name(receiverId)} (${routeNames.get(key) ?? "?"}):`);

    const release = releases.get(key);
    if (release === undefined) {
      out.push("  │    Release: no press (off coverage)");
    } else if (release.event.type === "CHECK") {
      const payload = release.event.payload;
      const defender = payload.actors[1];
      const off = actorLabel(payload.roll, "OFF");
      const def = actorLabel(payload.opposedRoll, "DEF");
      out.push("  │    Release vs. Press:");
      out.push(`  │      ${off}:  ${formatRoll(payload.roll)}`);
      if (payload.opposedRoll !== undefined) {
        out.push(`  │      ${def}:  ${formatRoll(payload.opposedRoll)}`);
      }
      out.push(
        `  │      Result: ${winnerText(payload.margin, off, def)} → ` +
          `${bandFor(TUNABLES.release.bands, payload.margin).label}` +
          (defender === undefined ? "" : ` (vs. ${name(defender)})`),
      );
    }

    const coverage = coverages.get(key);
    if (coverage !== undefined && coverage.event.type === "CHECK") {
      const payload = coverage.event.payload;
      const band = bandFor(TUNABLES.manCoverage.bands, payload.margin);
      const off = actorLabel(payload.roll, "OFF");
      const def = actorLabel(payload.opposedRoll, "DEF");
      out.push(`  │    Man coverage (break at tick ${tickLabel(coverage.event.tick)}):`);
      out.push(`  │      ${off}:  ${formatRoll(payload.roll)}`);
      if (payload.opposedRoll !== undefined) {
        out.push(`  │      ${def}:  ${formatRoll(payload.opposedRoll)}`);
      }
      out.push(
        `  │      Result: ${winnerText(payload.margin, off, def)} → ${band.label}` +
          ` → base openness ${band.openness}`,
      );
    }

    out.push(`  │    Openness track: ${rows.join(" → ")}`);
    out.push("  │");
  }
  out.push("");
  return out;
}

function renderQbDecisionMaking(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const out: string[] = [];
  for (const { event } of events) {
    if (event.type === "QB_READ") {
      const p = event.payload;
      out.push(`  ├─ Read (Tick ${tickLabel(event.tick)}): ${name(p.target)}`);
      out.push(`  │    Actual openness: ${p.actualOpenness}`);
      out.push(`  │    Awareness variance: ${formatRoll(p.varianceRoll)}`);
      out.push(`  │    Perceived openness: ${p.perceivedOpenness}`);
      const window = p.effectiveOpenness - p.perceivedOpenness;
      out.push(
        `  │    Effective openness: ${p.effectiveOpenness}` +
          (window === 0 ? " (no tight-window adjustment)" : ` (window modifier ${signed(window)})`),
      );
      out.push("  │");
    } else if (event.type === "CHECK" && event.payload.checkKind === "qb_decision") {
      const p = event.payload;
      const band = bandFor(TUNABLES.qb.decision.bands, p.margin);
      out.push(`  ├─ Decision quality (Tick ${tickLabel(event.tick)}):`);
      out.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      out.push(`  │    Result: ${band.label} (${signed(p.margin)})`);
      out.push("  │");
    } else if (event.type === "QB_DECISION") {
      const p = event.payload;
      const target = p.target === undefined ? "" : ` → ${name(p.target)}`;
      // ADR-005: no bracket when no decision-quality roll ran. A bare HOLD means
      // "there was nothing to decide", not "he decided badly".
      const tier = p.tier === undefined ? "" : ` [${p.tier}]`;
      out.push(`  ├─ Tick ${tickLabel(event.tick)}: ${p.choice}${target}${tier}`);
    }
  }
  if (out.length === 0) return [];
  return ["QB DECISION-MAKING:", ...out, ""];
}

function renderThrow(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const thrown = firstOfType(events, "THROW");
  if (thrown === undefined) return [];
  const out: string[] = [
    "THROW EXECUTION:",
    `  ├─ Throw type: ${thrown.payload.throwType} to ${name(thrown.payload.target)}`,
    "  │",
  ];

  // Rendered in design-doc order (§17.1): lane first, then ball placement —
  // regardless of the order the engine happened to roll them in.
  const lane: string[] = [];
  const accuracy: string[] = [];
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    const p = event.payload;
    if (p.checkKind === "passing_lane") {
      const defender = p.actors[0];
      lane.push(`  ├─ Passing lane${defender === undefined ? "" : ` (${name(defender)})`}:`);
      lane.push(`  │    ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      lane.push(`  │    Result: ${p.margin >= 0 ? "DEFLECTED" : "ball passes cleanly"} (${signed(p.margin)})`);
      lane.push("  │");
    }
    if (p.checkKind === "accuracy") {
      const band = bandFor(TUNABLES.throwExec.accuracy.bands, p.margin);
      accuracy.push("  └─ Accuracy:");
      accuracy.push(`       ${formatRoll(p.roll)} vs. target ${p.target ?? "-"}`);
      accuracy.push(`       Result: ${band.label} (${signed(p.margin)}) [${p.tier}]`);
      accuracy.push(
        `       Placement effects: catch ${signed(band.catchMod)}, defender contest ${signed(band.defenderContestMod)}`,
      );
    }
  }
  out.push(...lane, ...accuracy, "");
  return out;
}

/**
 * ADR-004: the roll lives on the CHECK and the outcome references it by
 * `rollRef`. The renderer performs that join rather than reading a RollDetail
 * off the summary event — there is no longer one there to read.
 */
function renderCatch(events: readonly MatchEventEnvelope[], name: NameLookup): string[] {
  const checksByRollLabel = new Map<string, Extract<MatchEvent, { type: "CHECK" }>>();
  for (const { event } of events) {
    if (event.type !== "CHECK") continue;
    if (event.payload.checkKind !== "catch" && event.payload.checkKind !== "contested_catch") continue;
    checksByRollLabel.set(event.payload.roll.rngLabel, event);
  }

  const out: string[] = [];
  for (const { event } of events) {
    if (event.type !== "CATCH_RESOLUTION") continue;
    const resolution = event.payload;
    const check = checksByRollLabel.get(resolution.rollRef);
    if (check !== undefined) {
      const p = check.payload;
      const contested = p.checkKind === "contested_catch";
      const band = contested
        ? bandFor(TUNABLES.catching.contested.bands, p.margin)
        : bandFor(TUNABLES.catching.routine.bands, p.margin);
      out.push(`  ├─ Catch type: ${contested ? "CONTESTED" : "ROUTINE"}`);
      out.push(`  ├─ ${actorLabel(p.roll, "OFF")}: ${formatRoll(p.roll)}`);
      if (p.opposedRoll !== undefined) {
        out.push(`  ├─ ${actorLabel(p.opposedRoll, "DEF")}: ${formatRoll(p.opposedRoll)}`);
      }
      if (p.target !== undefined) out.push(`  ├─ vs. target ${p.target}`);
      out.push(`  ├─ Result: ${band.label} (${signed(p.margin)}) [${p.tier}]`);
    } else {
      out.push(`  ├─ Catch type: ${resolution.catchType} (roll ${resolution.rollRef} not in this stream)`);
    }
    out.push(`  └─ ${name(resolution.receiver)}: ${resolution.caught ? "CAUGHT" : "INCOMPLETE"}`);
  }
  if (out.length === 0) return [];
  return ["CATCH RESOLUTION:", ...out, ""];
}

function renderResult(events: readonly MatchEventEnvelope[]): string[] {
  const result = firstOfType(events, "PLAY_RESULT");
  if (result === undefined) return [];
  const p = result.payload;
  const out = ["PLAY RESULT:", `  ├─ Yards: ${p.yards}`, `  ├─ Turnover: ${p.turnover ? "YES" : "NO"}`];
  if (p.score !== undefined) out.push(`  ├─ Score: ${p.score}`);
  out.push(`  └─ Clock runoff: ${p.clockRunoff}s`, "");
  return out;
}

// --- formatting helpers -----------------------------------------------------

export function formatRoll(roll: RollDetail): string {
  const parts = roll.modifiers.map((m) => ` ${m.value < 0 ? "-" : "+"} ${Math.abs(m.value)} (${m.source})`);
  return `${roll.die} ${roll.raw}${parts.join("")} = ${roll.total}  [${roll.rngLabel}]`;
}

/**
 * The row label for a roll, taken from the ROLLING ENTITY rather than from the
 * nominal role of the check (B2). Resolvers prefix every attribute modifier
 * with the actor's own `bio.position`, so the first attribute-backed modifier
 * carries it: a tight end's release roll reads "TE", a linebacker in man
 * coverage reads "MLB". Falls back to the generic side when a roll has no
 * attribute modifier at all.
 */
function actorLabel(roll: RollDetail | undefined, fallback: string): string {
  const attrMod = roll?.modifiers.find((m) => m.attr !== undefined);
  const first = attrMod?.source.split(" ")[0];
  return first === undefined || first === "" ? fallback : first;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function winnerText(margin: number, offenseLabel: string, defenseLabel: string): string {
  if (margin === 0) return "even";
  return margin > 0
    ? `${offenseLabel} wins by ${margin}`
    : `${defenseLabel} wins by ${Math.abs(margin)}`;
}

function tickLabel(tick: number | undefined): string {
  return tick === undefined ? "-" : tick.toFixed(1);
}

function firstOfType<T extends MatchEvent["type"]>(
  events: readonly MatchEventEnvelope[],
  type: T,
): Extract<MatchEvent, { type: T }> | undefined {
  for (const { event } of events) {
    if (event.type === type) return event as Extract<MatchEvent, { type: T }>;
  }
  return undefined;
}

// --- PLAY_START is `unknown` in contracts; read it defensively --------------

interface PlayStartView {
  readonly offenseCall: string;
  readonly offenseFormation: string;
  readonly defenseCall: string;
  readonly defenseFront: string;
  readonly coverage: string;
  readonly down: number;
  readonly distance: number;
  readonly ballOn: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function readPlayStart(payload: unknown): PlayStartView | undefined {
  const root = asRecord(payload);
  if (root === undefined) return undefined;
  const offense = asRecord(root["offense"]) ?? {};
  const defense = asRecord(root["defense"]) ?? {};
  const situation = asRecord(root["situation"]) ?? {};
  return {
    offenseCall: asString(offense["call"], "?"),
    offenseFormation: asString(offense["formation"], "?"),
    defenseCall: asString(defense["call"], "?"),
    defenseFront: asString(defense["front"], "?"),
    coverage: asString(defense["coverage"], "?"),
    down: asNumber(situation["down"], 0),
    distance: asNumber(situation["distance"], 0),
    ballOn: asNumber(situation["ballOn"], 0),
  };
}
