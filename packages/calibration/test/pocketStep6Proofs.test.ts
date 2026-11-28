/**
 * ADR-089 step 6: THE STRUCTURAL PROOFS S-11 TO S-20 AS FOLD-TIME CHECKS (step-6 plan §8.2 R-3; §3.2
 * K2, commit (9)), on constructed plays that pass and plays that fail.
 *
 * No step-6 game can be played before the lift (the engine refuses every tree carrying `pocket.outs`
 * while P9 to P12 and P20 are out of contracts), so each proof is held here on plays built in the
 * engine's step-6 shape (`s6Fixtures.ts`, and the plays below where a proof reads more than the
 * readers' fixtures carry), read with a built arm's own tunables (`buildStep6Arm` with its own
 * petitions true, never played). Every option of the owner's three questions is read where a proof
 * turns on it (the spent checklist's five, the scramble start's two, a caught catch's two), so no
 * answer is privileged. Each proof is bound to the arms that carry its part: the side with the part
 * reads its rule, the side without it reads that the stream carries none of its records.
 */
import type { PlayerState } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { buildStep6Arm, STEP6_ARM_DEFS, step6ArmDef, type Step6ArmId } from "../src/pocket/arms.js";
import { dropOfCall } from "../src/pocket/freeRun.js";
import { OUTS_PARTS, RECOMMENDED_OUTS_OPTIONS, SPENT_CHECKLISTS, STEP6_PETITIONS_GRANTED, type OutsOptions } from "../src/pocket/rules.js";
import type { S5CleanExpiry, S5Dropback, S5Pick } from "../src/pocket/s5Stream.js";
import {
  checkS6Play,
  deadlineChoiceOf,
  DRILL_BANDS,
  emptyStep6LeagueFolds,
  horizonSackAfterEscape,
  indexed,
  partsOfOuts,
  S6_PROOF_IDS,
  S6_PROOFS,
  SPENT_OUTCOMES,
  spentBranchS6,
  type Step6LeagueFolds,
} from "../src/pocket/s6Checks.js";
import { S6_AGREE_ARMS, armsOfProof } from "../src/pocket/s6Grade.js";
import { outsOf, readS6Play } from "../src/pocket/s6Stream.js";
import { dropbacksOf } from "../src/pocket/throwClass.js";
import { containedThen, deadlinePlay, drill, editDecisions, editHit, mapBody, pocketThrowaway, scramblePlay } from "./s6EngineShaped.js";
import {
  BLOCKED_CATCH_SACK,
  check,
  constructedGame,
  CONTAINED_THEN_SPENT_HOLD,
  DEADLINE_THROWAWAY,
  decision,
  LABEL_RULE_SACK,
  LATE_DEADLINE_THROWAWAY,
  NOBODY_CATCH_SACK,
  onePlay,
  pursuit,
  SHED_THEN_SACK,
  status,
  threat,
  throwaway,
  thrown,
  tick,
  type PlaySpec,
} from "./s6Fixtures.js";

// --- the arms' trees (built with their own petitions true, never played) -------------------------------

const trees = new Map<string, Tunables>();
/** A step-6 arm's tunables under `options` (the recommended answers unless given). */
function treeOf(id: Step6ArmId, options: Partial<OutsOptions> = {}): Tunables {
  const o: OutsOptions = { ...RECOMMENDED_OUTS_OPTIONS, ...options };
  const key = `${id} ${o.spentChecklist} ${o.scrambleStart} ${o.seen}`;
  const known = trees.get(key);
  if (known !== undefined) return known;
  const t = buildStep6Arm(step6ArmDef(id)!, o, STEP6_PETITIONS_GRANTED).tunables;
  trees.set(key, t);
  return t;
}
const H0 = treeOf("H0");
const DROP = dropOfCall("Quick Outs");

// --- reading one play's proofs ---------------------------------------------------------------------------

interface ReadOptions {
  readonly x5?: { readonly cleanExpiries?: readonly Partial<S5CleanExpiry>[]; readonly picks?: readonly Partial<S5Pick>[]; readonly floorSeconds?: number };
  readonly players?: ReadonlyMap<string, PlayerState>;
}

/** One play through `checkS6Play` under `tunables`: its dropback, its step-6 reading, a step-5 reading if given, its events. */
function proofsOn(spec: PlaySpec, tunables: Tunables, o: ReadOptions = {}): Step6LeagueFolds {
  const L = emptyStep6LeagueFolds();
  const events = onePlay(spec);
  const d = dropbacksOf(constructedGame("g", [spec]))[0];
  const s6 = readS6Play(events, tunables);
  if (d === undefined || s6 === undefined) throw new Error("the play is not a step-6 dropback");
  const x5 =
    o.x5 === undefined
      ? undefined
      : ({
          playId: d.playId,
          floorSeconds: o.x5.floorSeconds ?? 0,
          cleanExpiries: (o.x5.cleanExpiries ?? []).map((e) => ({ trigger: "reads", best: undefined, pool: 0, belowBar: 0, targetOpenness: undefined, ...e })),
          picks: (o.x5.picks ?? []).map((p) => ({ band: "SOUND", offered: [], todayUrgency: 0, ...p })),
        } as unknown as S5Dropback);
  checkS6Play(L, tunables, d, s6, x5, indexed(events), o.players === undefined ? {} : { players: o.players });
  return L;
}

/** The proofs that faulted, with their counts. */
const faulted = (L: Step6LeagueFolds): Readonly<Record<string, number>> => Object.fromEntries(Object.entries(L.faults).filter(([, f]) => f.n > 0).map(([p, f]) => [p, f.n]));
/** A proof's first faults, joined. */
const why = (L: Step6LeagueFolds, proof: string): string => (L.faults[proof]?.first ?? []).join(" | ");

/** A roster holding only the quarterback "qb", every rating at the registry's fallback (50): the deadline pick's restated ranking reads him. */
const FLAT_QB: ReadonlyMap<string, PlayerState> = new Map([["qb", { bio: { id: "qb", position: "QB" }, attributes: { values: {} } } as unknown as PlayerState]]);
const at50 = (): number => 50;

/** The deadline pick's play under H0, its band the margin's unless given. */
const deadlineAt = (choice: "THROWAWAY" | "RUN", margin: number, o: Omit<Parameters<typeof deadlinePlay>[2], "tunables"> = {}): PlaySpec => deadlinePlay(choice, margin, { tunables: H0, ...o });

// --- the proofs and the arms they bind (R-3) --------------------------------------------------------------

describe("the proofs, each bound to the arms that carry its part (R-3)", () => {
  it("names S-11 to S-20 with S-11c, each with the part it reads and the clause it answers", () => {
    expect([...S6_PROOF_IDS]).toEqual(["S-11", "S-11c", "S-12", "S-13", "S-14", "S-15", "S-16", "S-17", "S-18", "S-19", "S-20"]);
    for (const p of S6_PROOF_IDS) for (const part of S6_PROOFS[p].parts) expect(OUTS_PARTS, `${p} ${part}`).toContain(part);
    expect(S6_PROOFS["S-14"].parts).toEqual([]);
    expect(S6_PROOFS["S-11"].clause).toBe("s6.oneEscape");
    expect(S6_PROOFS["S-11c"].clause).toBe("s6.oneEscapeClean");
    expect(S6_PROOFS["S-12"].clause).toBe("s6.horizonSacks");
    expect(S6_PROOFS["S-13"].clause).toBe("s6.behindLine");
    expect(S6_PROOFS["S-14"].clause).toBe("s6.readersAgree");
  });

  it("every built arm's outs block turns on exactly its recipe's parts, under every option of the three questions", () => {
    for (const spentChecklist of SPENT_CHECKLISTS) {
      for (const def of STEP6_ARM_DEFS) {
        const t = treeOf(def.id, { spentChecklist });
        expect(partsOfOuts(outsOf(t)), `${def.id} ${spentChecklist}`).toEqual([...def.step6.parts]);
        expect(outsOf(t)?.escapeCap?.whenSpent ?? spentChecklist, def.id).toBe(spentChecklist);
      }
    }
    expect(partsOfOuts(undefined)).toEqual([]);
  });

  it("binds each proof to the arms whose recipe carries one of its parts, and S-14 to the agreement arms", () => {
    const carrying = (parts: readonly string[]): string[] => STEP6_ARM_DEFS.filter((d) => parts.some((p) => (d.step6.parts as readonly string[]).includes(p))).map((d) => d.id);
    for (const p of S6_PROOF_IDS) expect(armsOfProof(p), p).toEqual(p === "S-14" ? S6_AGREE_ARMS : carrying(S6_PROOFS[p].parts));
    expect(armsOfProof("S-19")).toEqual(["H0", "H8", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HBN", "HB2L", "HF3", "HF4", "HF5"]);
    expect(armsOfProof("S-11")).toEqual(["H0", "H3", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HB3", "HB2L", "HF1", "HF2", "HF3", "HF4", "HF5"]);
    expect(S6_AGREE_ARMS).toEqual(STEP6_ARM_DEFS.filter((d) => d.graded.includes("s6.readersAgree")).map((d) => d.id));
    expect(S6_AGREE_ARMS).toContain("H0");
    expect(S6_AGREE_ARMS).toContain("H12");
  });

  it("restates the spent case's branch and the outcomes each branch allows (2.3)", () => {
    const cap = (whenSpent: OutsOptions["spentChecklist"]) => ({ maxPerPlay: 1 as const, whenSpent });
    expect(SPENT_CHECKLISTS.map((w) => spentBranchS6(cap(w), 1))).toEqual(["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30", "HOLD"]);
    expect(spentBranchS6(cap("SECOND_ESCAPE"), 2)).toBe("HOLD");
    expect(SPENT_OUTCOMES).toEqual({ HOLD: ["HOLD"], TODAYS_PATH: ["THROWAWAY", "HOLD", "NONE"], SECOND_ESCAPE: ["ESCAPE"], BELOW_30: ["THROW", "HOLD"] });
  });

  it("restates the deadline pick's ranking: two options at urgency 0, THROWAWAY first on a tie, the band's rank clamped to them", () => {
    const sound = deadlineChoiceOf(H0, 1, at50, 5);
    const rushed = deadlineChoiceOf(H0, 1, at50, -3);
    const panicked = deadlineChoiceOf(H0, 1, at50, -30);
    expect([sound.band, rushed.band, panicked.band]).toEqual(["SOUND", "RUSHED", "PANICKED"]);
    // Two options: the band's first and second ranks take each one, and PANICKED's third clamps to the second.
    expect(new Set([sound.choice, rushed.choice])).toEqual(new Set(["THROWAWAY", "RUN"]));
    expect(panicked.choice).toBe(rushed.choice);
    // Every rating at the appeal baseline zeroes both options' terms: a run margin of 0 is a tie, broken
    // to THROWAWAY, and a margin of 1 ranks RUN first, which SOUND's first rank takes.
    const baseline = H0.pocketMovement.appealBaseline;
    const tie = deadlineChoiceOf(H0, 0, () => baseline, 5);
    expect([tie.tie, tie.choice]).toEqual([true, "THROWAWAY"]);
    const ahead = deadlineChoiceOf(H0, 1, () => baseline, 5);
    expect([ahead.tie, ahead.choice]).toEqual([false, "RUN"]);
    expect(deadlineChoiceOf(H0, 1, () => baseline, -3).choice).toBe("THROWAWAY");
    expect(DRILL_BANDS).toEqual(["TRAILING", "EVEN", "IN_FRONT"]);
  });
});

// --- S-11 and S-11c: the one escape a play -----------------------------------------------------------------

describe("S-11 and S-11c: under the cap, no escape roll once his one escape is spent", () => {
  it("a forced roll after the spent escape faults both, under every checklist that spends a contained roll", () => {
    for (const spentChecklist of ["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30"] as const) {
      const L = proofsOn(containedThen([{ at: 2, clean: false }]), treeOf("H0", { spentChecklist }));
      expect(faulted(L), spentChecklist).toEqual({ "S-11": 1, "S-11c": 1 });
      expect(why(L, "S-11")).toBe("g:play:1 t2: a forced escape roll with his escape spent");
      expect(L.checked["S-11"]).toBe(1);
    }
  });

  it("CONTAINED_DOES_NOT_SPEND: a contained roll leaves his escape, so a second roll is no fault", () => {
    const L = proofsOn(containedThen([{ at: 2, clean: false }]), treeOf("H0", { spentChecklist: "CONTAINED_DOES_NOT_SPEND" }));
    expect(faulted(L)).toEqual({});
    // A won escape spends it under every checklist: a forced roll after it faults.
    const won = proofsOn(containedThen([{ at: 2, clean: false, band: "ESCAPED" }, { at: 3, clean: false }]), treeOf("H0", { spentChecklist: "CONTAINED_DOES_NOT_SPEND" }));
    expect(faulted(won)["S-11"]).toBe(1);
  });

  it("a clean roll after the spent escape faults S-11c only, but the one second clean roll SECOND_ESCAPE allows", () => {
    const one = containedThen([{ at: 3, clean: true }]);
    const hold = proofsOn(one, treeOf("H0", { spentChecklist: "HOLD" }));
    expect(faulted(hold)).toEqual({ "S-11c": 1 });
    expect(why(hold, "S-11c")).toBe("g:play:1 t3: a clean escape roll with his escape spent (HOLD)");
    expect(faulted(proofsOn(one, treeOf("H0", { spentChecklist: "SECOND_ESCAPE" })))).toEqual({});
    const two = proofsOn(containedThen([{ at: 3, clean: true }, { at: 3.5, clean: true }]), treeOf("H0", { spentChecklist: "SECOND_ESCAPE" }));
    expect(faulted(two)).toEqual({ "S-11c": 1 });
    expect(why(two, "S-11c")).toBe("g:play:1 t3.5: a clean escape roll with his escape spent (SECOND_ESCAPE)");
  });

  it("reads nothing on an arm without the cap: H1, the throwaway rule alone, takes any number of rolls", () => {
    const L = proofsOn(containedThen([{ at: 2, clean: false }, { at: 3, clean: true }]), treeOf("H1"));
    expect(L.checked["S-11"]).toBe(0);
    expect(L.checked["S-11c"]).toBe(0);
    expect(faulted(L)["S-11"] ?? 0).toBe(0);
  });
});

// --- S-12: the horizon -----------------------------------------------------------------------------------

/** An escape at 5.5 s whose deadline (7.0 s) is past the clock's last tick, the play ending at 6.0 s with no run, throw or throwaway: a horizon sack after the escape. */
const HORIZON_SACK: PlaySpec = {
  yards: -7,
  body: [
    tick(0.5),
    status("CLEAN"),
    tick(5.5),
    threat("de1", "TRAVELLING", { etaTick: 5.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t5.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t5.5", { band: "ESCAPED", margin: 4 }),
    pursuit(5.5, 7, "g:play:1/scramble/t5.5"),
    threat("de1", "RESET"),
    decision("SCRAMBLE", { direction: "LEFT" }),
    tick(6),
  ],
};

describe("S-12: no horizon sack after an escape with the part, and no play past the last tick but a live scramble's", () => {
  it("with the part, a late escape plays on past the clock to its deadline (2.5)", () => {
    const L = proofsOn(LATE_DEADLINE_THROWAWAY, H0);
    expect(faulted(L)).toEqual({});
    expect(L.counts["pastLastTick"]).toBe(1);
    expect(L.counts["lateEscapes"]).toBe(1);
    expect(L.checked["S-12"]).toBe(1);
  });

  it("with the part, a horizon sack after the escape faults, and so does a play past its deadline", () => {
    const d = dropbacksOf(constructedGame("g", [HORIZON_SACK]))[0]!;
    expect(horizonSackAfterEscape(d)).toBe(true);
    const L = proofsOn(HORIZON_SACK, H0);
    expect(faulted(L)).toEqual({ "S-12": 1 });
    expect(why(L, "S-12")).toBe("g:play:1: a horizon sack after the escape at 5.5 s");
    expect(L.counts["horizonSacks"]).toBe(1);
    const past = proofsOn({ ...LATE_DEADLINE_THROWAWAY, body: [...LATE_DEADLINE_THROWAWAY.body.slice(0, -3), tick(7), ...LATE_DEADLINE_THROWAWAY.body.slice(-3)] }, H0);
    expect(why(past, "S-12")).toContain("the play runs to 7 s, past the last tick 6 s, past its deadline 6.5 s");
  });

  it("without the part, a horizon sack is counted, never faulted, and a play past the last tick faults", () => {
    const H3 = treeOf("H3");
    const L = proofsOn(editDecisions(HORIZON_SACK, (p) => ({ choice: p["choice"] })), H3);
    expect(faulted(L)).toEqual({});
    expect(L.counts["horizonSacks"]).toBe(1);
    const late = proofsOn(LATE_DEADLINE_THROWAWAY, H3);
    expect(why(late, "S-12")).toBe("g:play:1: the play runs to 6.5 s, past the last tick, without the part");
  });
});

// --- S-13: the scramble start ------------------------------------------------------------------------------

describe("S-13: a scramble run's yards and zone events by the start rule", () => {
  it("ZERO_GAIN_ONLY: a run of 0 or less ends at minus the drop, its zone events the run as played (summing to 0)", () => {
    expect(DROP).toBe(5);
    const ok = proofsOn(scramblePlay(-DROP), H0);
    expect(faulted(ok)).toEqual({});
    expect(ok.counts["behindLine"]).toBe(1);
    expect(ok.checked["S-13"]).toBe(1);
    expect(why(proofsOn(scramblePlay(-2), H0), "S-13")).toBe("g:play:1: a failed scramble of -2 yards, not minus the drop 5 (ZERO_GAIN_ONLY)");
    expect(why(proofsOn(scramblePlay(-DROP, { zones: [2] }), H0), "S-13")).toBe("g:play:1: a failed scramble's zone events sum to 2, not the run as played, 0 (ZERO_GAIN_ONLY)");
    // A gain is read as played.
    expect(faulted(proofsOn(scramblePlay(7, { marker: true }), H0))).toEqual({});
  });

  it("EVERY_RUN: no run past minus the drop, a run of 0 or less summing its zones to its yards plus the drop", () => {
    const every = treeOf("H0", { scrambleStart: "EVERY_RUN" });
    expect(faulted(proofsOn(scramblePlay(-2, { zones: [3] }), every))).toEqual({});
    expect(why(proofsOn(scramblePlay(-2, { zones: [0] }), every), "S-13")).toBe("g:play:1: a scramble run of -2 yards whose zone events sum to 0, not 3 (EVERY_RUN)");
    expect(why(proofsOn(scramblePlay(-6, { zones: [-1] }), every), "S-13")).toContain("a scramble run of -6 yards, past minus the drop 5 (EVERY_RUN)");
    // H2L plays the other start: EVERY_RUN under the recommended answers.
    expect(outsOf(treeOf("H2L"))?.scrambleStart).toBe("EVERY_RUN");
    expect(faulted(proofsOn(scramblePlay(-2, { zones: [3] }), treeOf("H2L")))).toEqual({});
  });

  it("without the part no run ends behind the line", () => {
    const H1 = treeOf("H1");
    expect(why(proofsOn(scramblePlay(-2, { marker: false, drills: [], direction: null }), H1), "S-13")).toBe("g:play:1: a scramble run of -2 yards, behind the line, without the scramble start");
    expect(faulted(proofsOn(scramblePlay(0, { marker: false, drills: [], direction: null }), H1))["S-13"] ?? 0).toBe(0);
  });
});

// --- S-15: P10's flag, the OUT_OF_POCKET cause and the real throwaway rule ---------------------------------

describe("S-15: P10's flag on every throwaway of a play that reads a position, OUT_OF_POCKET only from the deadline pick, the real rule in the pocket", () => {
  it("the deadline pick's throwaway carries the flag true and names its pick; an in-pocket throwaway the flag false", () => {
    expect(faulted(proofsOn(DEADLINE_THROWAWAY, H0))).toEqual({});
    expect(faulted(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false }), H0))).toEqual({});
    expect(faulted(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false }), treeOf("H1")))).toEqual({});
  });

  it("faults a missing flag, a flag on the wrong cause, and a flag on a play that reads no position", () => {
    const noFlag = mapBody(DEADLINE_THROWAWAY, (b) => (b.type === "THROWAWAY" ? [throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t6:deadline" })] : [b]));
    expect(why(proofsOn(noFlag, H0), "S-15")).toBe("g:play:1 t6: a throwaway with no outsideTackleBox on a play that reads a position");
    expect(why(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: true }), H0), "S-15")).toBe("g:play:1 t2: outsideTackleBox true on a POCKET_DURESS throwaway");
    // H3 (the cap alone) reads no position: the stream carries no flag.
    expect(faulted(proofsOn(pocketThrowaway("POCKET_DURESS"), treeOf("H3")))).toEqual({});
    expect(why(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false }), treeOf("H3")), "S-15")).toBe("g:play:1 t2: outsideTackleBox on a play that reads no position");
  });

  it("faults an OUT_OF_POCKET throwaway with no pick before it, naming another roll, or on a tree without the pick", () => {
    const noPick = mapBody(DEADLINE_THROWAWAY, (b) => (b.type === "CHECK" && (b.payload as { roll: { rngLabel: string } }).roll.rngLabel.endsWith(":deadline") ? [] : [b]));
    expect(why(proofsOn(noPick, H0), "S-15")).toBe("g:play:1 t6: an OUT_OF_POCKET throwaway with no deadline pick on its tick before it");
    const other = mapBody(DEADLINE_THROWAWAY, (b) => (b.type === "THROWAWAY" ? [throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t1.5", outsideTackleBox: true })] : [b]));
    expect(why(proofsOn(other, H0), "S-15")).toBe("g:play:1 t6: an OUT_OF_POCKET throwaway naming g:play:1/movement/t1.5, not its pick g:play:1/movement/t6:deadline");
    // H1 (the throwaway rule alone) has no deadline pick.
    const h1 = proofsOn(DEADLINE_THROWAWAY, treeOf("H1"));
    expect(why(h1, "S-15")).toBe("g:play:1 t6: an OUT_OF_POCKET throwaway without the deadline pick");
    expect(why(h1, "S-18")).toBe("g:play:1: 1 deadline pick(s) without the part");
  });

  it("under the real rule, an in-pocket throwaway only on a tick the rule allows: a route at its break, no contest on the tick", () => {
    const H1 = treeOf("H1");
    expect(why(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false, route: false }), H1), "S-15")).toBe("g:play:1 t2: a POCKET_DURESS throwaway the real rule does not allow (floor 0 s)");
    expect(why(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false, contest: true }), H1), "S-15")).toContain("a POCKET_DURESS throwaway the real rule does not allow");
    // The drop floor is the step-5 reading's.
    expect(why(proofsOn(pocketThrowaway("POCKET_DURESS", { flag: false }), H1, { x5: { floorSeconds: 2.5 } }), "S-15")).toBe("g:play:1 t2: a POCKET_DURESS throwaway the real rule does not allow (floor 2.5 s)");
    // Without the rule (H3) today's throwaway is not read against it.
    expect(faulted(proofsOn(pocketThrowaway("POCKET_DURESS", { route: false }), treeOf("H3")))).toEqual({});
  });
});

// --- S-16: the drill -----------------------------------------------------------------------------------------

describe("S-16: every scramble_drill CHECK after an ESCAPED roll on its tick, once per receiver, with the rep's ratings", () => {
  it("passes the drill on its roll with the coverage rep's ratings, one die per receiver", () => {
    const L = proofsOn(scramblePlay(-DROP, { drills: [drill(), drill({ receiver: "wr2", defender: "cb2", band: "TRAILING" })] }), H0);
    expect(faulted(L)).toEqual({});
    expect(L.counts["drill.reps"]).toBe(2);
    expect(L.counts["drill.EVEN"]).toBe(1);
    expect(L.counts["drill.TRAILING"]).toBe(1);
  });

  it("faults the readers' fixture's drill (no ratings), a second die for one receiver, a label, a band and a roll that are not the rule's", () => {
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [drill({ attrs: [] })] }), H0), "S-16")).toBe("g:play:1 t1.5 g:play:1/movement/t1.5:drill:wr1: a drill CHECK whose ratings are not a coverage rep's ()");
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [drill(), drill({ defender: "cb2" })] }), H0), "S-16")).toBe("g:play:1 t1.5 g:play:1/movement/t1.5:drill:wr1: a second drill for wr1 on one escape");
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [drill({ label: "g:play:1/movement/t1.5:drill:wr2" })] }), H0), "S-16")).toBe("g:play:1 t1.5 g:play:1/movement/t1.5:drill:wr2: a drill label that does not end with its receiver wr1");
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [drill({ band: "AHEAD" })] }), H0), "S-16")).toContain("a drill band AHEAD");
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [drill({ rollRef: "g:play:1/scramble/t1" })] }), H0), "S-16")).toContain("a drill CHECK naming g:play:1/scramble/t1, not its roll g:play:1/scramble/t1.5");
    // A drill after a roll that did not escape.
    expect(why(proofsOn(scramblePlay(3, { band: "CONTAINED", direction: null }), H0), "S-16")).toContain("a drill CHECK with no ESCAPED roll before it on its tick");
  });

  it("without the drill, no scramble_drill CHECK", () => {
    expect(why(proofsOn(scramblePlay(-DROP), treeOf("H3")), "S-16")).toBe("g:play:1: 1 scramble_drill CHECK(s) without the drill");
    expect(faulted(proofsOn(scramblePlay(-DROP, { drills: [], marker: false }), treeOf("H9")))["S-16"] ?? 0).toBe(0);
    expect(faulted(proofsOn(scramblePlay(-DROP), treeOf("H9")))["S-16"] ?? 0).toBe(0);
  });
});

// --- S-17: the direction ---------------------------------------------------------------------------------------

describe("S-17: the first decision after each roll on its tick names the side by the roll's outcome", () => {
  it("passes an escape's SCRAMBLE with its side, a contained roll's HOLD with its side and a catch's decision with none", () => {
    expect(faulted(proofsOn(scramblePlay(-DROP), H0))).toEqual({});
    expect(faulted(proofsOn(CONTAINED_THEN_SPENT_HOLD, H0))).toEqual({});
    expect(faulted(proofsOn(SHED_THEN_SACK, H0))).toEqual({});
  });

  it("faults a SCRAMBLE or a HOLD with no side, a catch that names one, and a side on a decision no roll opened", () => {
    expect(why(proofsOn(scramblePlay(-DROP, { direction: null }), H0), "S-17")).toBe("g:play:1 t1.5 ESCAPED: the escape's decision is SCRAMBLE with side undefined, not a SCRAMBLE with LEFT or RIGHT");
    const noSide = editDecisions(CONTAINED_THEN_SPENT_HOLD, (p, i) => (i === 0 ? { choice: p["choice"] } : p));
    expect(why(proofsOn(noSide, H0), "S-17")).toBe("g:play:1 t1.5 CONTAINED: the contained roll's decision is HOLD with side undefined, not a HOLD with its side");
    const catchSide = editDecisions(SHED_THEN_SACK, (p) => ({ ...p, direction: "LEFT" }));
    expect(why(proofsOn(catchSide, H0), "S-17")).toBe("g:play:1 t1.5 CAUGHT_SHED: a catch's decision names a side");
    const later = editDecisions(CONTAINED_THEN_SPENT_HOLD, (p, i) => (i === 1 ? { ...p, direction: "RIGHT" } : p));
    expect(why(proofsOn(later, H0), "S-17")).toBe("g:play:1 t3: a HOLD decision names a side, and it is no roll's first decision");
  });

  it("without the part, no decision names a side", () => {
    expect(why(proofsOn(scramblePlay(-DROP, { drills: [] }), treeOf("H1")), "S-17")).toBe("g:play:1: 1 decision(s) with a side without the part");
    expect(faulted(proofsOn(scramblePlay(-DROP, { drills: [], direction: null }), treeOf("H3")))["S-17"] ?? 0).toBe(0);
  });
});

// --- S-18: the deadline pick ------------------------------------------------------------------------------------

describe("S-18: the deadline pick at the pursuit's deadline, once a play, its band and choice the restated ranking's", () => {
  it("passes a pick of either option on the band whose rank takes it, the quarterback read from the rosters as played", () => {
    for (const choice of ["THROWAWAY", "RUN"] as const) {
      const margin = [5, -3].find((m) => deadlineChoiceOf(H0, 1, at50, m).choice === choice);
      expect(margin, choice).toBeDefined();
      const L = proofsOn(deadlineAt(choice, margin!), H0, { players: FLAT_QB });
      expect(faulted(L), choice).toEqual({});
      expect(L.counts[`deadline.${choice}`]).toBe(1);
      expect(L.counts["deadline.unrestated"]).toBeUndefined();
      // The other band's rank takes the other option: the pick's choice is not the restated ranking's.
      const wrong = proofsOn(deadlineAt(choice, margin === 5 ? -3 : 5), H0, { players: FLAT_QB });
      expect(why(wrong, "S-18"), choice).toBe(`g:play:1 t3: the pick took ${choice}, the restated ranking ${choice === "RUN" ? "THROWAWAY" : "RUN"}`);
    }
    // With no roster to read him, the pick is counted unrestated, never faulted.
    const unread = proofsOn(deadlineAt("THROWAWAY", 5), H0);
    expect(unread.counts["deadline.unrestated"]).toBe(1);
    expect(faulted(unread)["S-18"] ?? 0).toBe(0);
  });

  it("faults a pick off the deadline, two picks, a THROW on its tick, a pick that is no option, and a band not the margin's", () => {
    expect(why(proofsOn(deadlineAt("THROWAWAY", 5, { at: 2.5 }), H0), "S-18")).toBe("g:play:1 t2.5: a deadline pick off the pursuit's deadline 3");
    const twice = deadlineAt("THROWAWAY", 5, { also: [check("pocket_movement", "g:play:1/movement/t3:deadline", { band: "SOUND", margin: 5 })] });
    expect(why(proofsOn(twice, H0), "S-18")).toContain("g:play:1: 2 deadline picks on one play");
    expect(why(proofsOn(deadlineAt("THROWAWAY", 5, { also: [thrown("wr1")] }), H0), "S-18")).toContain("g:play:1 t3: a THROW on the deadline pick's tick");
    expect(why(proofsOn(deadlineAt("RUN", 5, { tail: [decision("SCRAMBLE")] }), H0), "S-18")).toBe("g:play:1 t3: a RUN pick with no SCRAMBLE run on its tick");
    expect(why(proofsOn(deadlineAt("RUN", 5, { tail: [decision("HOLD")] }), H0), "S-18")).toBe("g:play:1 t3: the deadline pick's decision is HOLD, not THROWAWAY or SCRAMBLE");
    expect(why(proofsOn(deadlineAt("THROWAWAY", 5, { band: "RUSHED" }), H0, { players: FLAT_QB }), "S-18")).toBe("g:play:1 t3: the pick's band RUSHED, restated SOUND");
    const unnamed = deadlineAt("THROWAWAY", 5, { tail: [decision("THROWAWAY"), throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t1.5", outsideTackleBox: true })] });
    expect(why(proofsOn(unnamed, H0), "S-18")).toBe("g:play:1 t3: a THROWAWAY pick with no OUT_OF_POCKET throwaway naming it");
  });

  it("without the part, no deadline pick", () => {
    expect(why(proofsOn(deadlineAt("THROWAWAY", 5), treeOf("H3")), "S-18")).toBe("g:play:1: 1 deadline pick(s) without the part");
    expect(proofsOn(scramblePlay(-DROP), treeOf("H3")).checked["S-18"]).toBe(0);
    expect(proofsOn(scramblePlay(-DROP), treeOf("H11")).checked["S-18"]).toBe(1);
  });
});

// --- S-19: the caught escape as contact ----------------------------------------------------------------------------

describe("S-19: a caught escape's contest has its QB_HIT, seen by the answer", () => {
  it("SEEN: passes the shed catch, the blocked catcher's sack and the label rule's sack", () => {
    for (const spec of [SHED_THEN_SACK, BLOCKED_CATCH_SACK, LABEL_RULE_SACK, NOBODY_CATCH_SACK]) {
      const L = proofsOn(spec, H0);
      expect(faulted(L)).toEqual({});
      expect(L.checked["S-19"]).toBe(1);
    }
    expect(proofsOn(LABEL_RULE_SACK, H0).counts["labelRuleSacks"]).toBe(1);
    expect(proofsOn(BLOCKED_CATCH_SACK, H0).counts["contestsAtEscape"]).toBe(1);
  });

  it("UNSEEN_IF_UNREGISTERED: a catch by a man still in his block is unseen, an ARRIVED catcher's seen", () => {
    const unseen = treeOf("H0", { seen: "UNSEEN_IF_UNREGISTERED" });
    expect(outsOf(unseen)?.caughtSeen).toBe("UNSEEN_IF_UNREGISTERED");
    expect(why(proofsOn(BLOCKED_CATCH_SACK, unseen), "S-19")).toBe("g:play:1 t1.5: QB_HIT seen true, the answer UNSEEN_IF_UNREGISTERED gives false");
    expect(faulted(proofsOn(editHit(BLOCKED_CATCH_SACK, "g:play:1/contest/t1.5:catch", { seen: false }), unseen))).toEqual({});
    expect(faulted(proofsOn(SHED_THEN_SACK, unseen))).toEqual({});
    // And SEEN faults the unseen one.
    expect(why(proofsOn(editHit(BLOCKED_CATCH_SACK, "g:play:1/contest/t1.5:catch", { seen: false }), H0), "S-19")).toBe("g:play:1 t1.5: QB_HIT seen false, the answer SEEN gives true");
  });

  it("faults a contest with no QB_HIT, a QB_HIT off the roll's phase, tick or approach, and a shed catch with no contest", () => {
    const ref = "g:play:1/contest/t1.5:catch";
    expect(why(proofsOn(editHit(SHED_THEN_SACK, ref, null), H0), "S-19")).toBe(`g:play:1 t1.5: the caught escape's contest ${ref} has no QB_HIT`);
    // The reader reads a shed from the hit's phase, so a phase that is neither SHED nor SACK reads as a sack at the roll.
    expect(why(proofsOn(editHit(SHED_THEN_SACK, ref, { phase: "HURRY" }), H0), "S-19")).toBe("g:play:1 t1.5: QB_HIT phase HURRY on a CAUGHT_SACKED roll");
    expect(why(proofsOn(editHit(SHED_THEN_SACK, ref, { contactSeconds: 2 }), H0), "S-19")).toBe("g:play:1 t1.5: QB_HIT contactSeconds 2, not the roll's tick");
    expect(why(proofsOn(editHit(SHED_THEN_SACK, ref, { approach: "BLOCKED" }), H0), "S-19")).toBe("g:play:1 t1.5: QB_HIT approach BLOCKED for a catcher ARRIVED");
    expect(why(proofsOn(editHit(BLOCKED_CATCH_SACK, ref, { approach: "FRONT" }), H0), "S-19")).toBe("g:play:1 t1.5: QB_HIT approach FRONT for a catcher not ARRIVED (in his block)");
    // A shed with no contest cannot be read: the shed is the contest's.
    const noContest = mapBody(SHED_THEN_SACK, (b) => (b.type === "CHECK" && (b.payload as { checkKind: string }).checkKind === "arrival_contest" && (b.payload as { roll: { rngLabel: string } }).roll.rngLabel === ref ? [] : [b]));
    expect(faulted(proofsOn(noContest, H0))["S-19"] ?? 0).toBe(0);
  });

  it("without the part, no contest or QB_HIT follows a catch", () => {
    const H7 = treeOf("H7");
    expect(why(proofsOn(SHED_THEN_SACK, H7), "S-19")).toBe("g:play:1 t1.5: a contest or QB_HIT after a catch without the part");
    expect(why(proofsOn(BLOCKED_CATCH_SACK, H7), "S-19")).toBe("g:play:1 t1.5: a contest or QB_HIT after a catch without the part");
    expect(faulted(proofsOn(NOBODY_CATCH_SACK, H7))).toEqual({});
  });
});

// --- S-20: the spent case at a clean expiry --------------------------------------------------------------------------

const SPENT_AT_3 = (outcome: string, picks: readonly Partial<S5Pick>[] = []): ReadOptions => ({ x5: { cleanExpiries: [{ tick: 3, outcome: outcome as S5CleanExpiry["outcome"] }], picks } });

describe("S-20: a clean expiry with his escape spent runs the answer's branch", () => {
  it("the contained roll spends the escape, and the clean expiry at 3.0 s holds: HOLD, TODAYS_PATH and BELOW_30 allow it, SECOND_ESCAPE does not", () => {
    const by: Record<string, Readonly<Record<string, number>>> = {};
    for (const spentChecklist of SPENT_CHECKLISTS) by[spentChecklist] = faulted(proofsOn(CONTAINED_THEN_SPENT_HOLD, treeOf("H0", { spentChecklist }), SPENT_AT_3("HOLD")));
    expect(by).toEqual({ HOLD: {}, TODAYS_PATH: {}, SECOND_ESCAPE: { "S-20": 1 }, BELOW_30: {}, CONTAINED_DOES_NOT_SPEND: { "S-20": 1 } });
    expect(why(proofsOn(CONTAINED_THEN_SPENT_HOLD, treeOf("H0", { spentChecklist: "SECOND_ESCAPE" }), SPENT_AT_3("HOLD")), "S-20")).toBe("g:play:1 t3: the spent case's HOLD under SECOND_ESCAPE (branch SECOND_ESCAPE: ESCAPE)");
    // CONTAINED_DOES_NOT_SPEND: the contained roll leaves his escape, so the expiry is read as one with the escape open.
    expect(why(proofsOn(CONTAINED_THEN_SPENT_HOLD, treeOf("H0", { spentChecklist: "CONTAINED_DOES_NOT_SPEND" }), SPENT_AT_3("HOLD")), "S-20")).toBe("g:play:1 t3: a HOLD on a clean expiry with his escape open");
    const hold = proofsOn(CONTAINED_THEN_SPENT_HOLD, H0, SPENT_AT_3("HOLD"));
    expect(hold.counts["spent.HOLD.HOLD"]).toBe(1);
    expect(hold.checked["S-20"]).toBe(1);
  });

  it("each branch's outcomes: a throwaway is today's path, a throw is BELOW_30's, an escape SECOND_ESCAPE's while one is left", () => {
    const at = (spentChecklist: OutsOptions["spentChecklist"], outcome: string, picks: readonly Partial<S5Pick>[] = []) => faulted(proofsOn(CONTAINED_THEN_SPENT_HOLD, treeOf("H0", { spentChecklist }), SPENT_AT_3(outcome, picks)))["S-20"] ?? 0;
    expect([at("HOLD", "THROWAWAY"), at("TODAYS_PATH", "THROWAWAY"), at("TODAYS_PATH", "NONE"), at("BELOW_30", "THROWAWAY")]).toEqual([1, 0, 0, 1]);
    expect([at("BELOW_30", "THROW"), at("HOLD", "THROW"), at("TODAYS_PATH", "THROW")]).toEqual([0, 1, 1]);
    expect([at("SECOND_ESCAPE", "ESCAPE", [{ tick: 3, option: "ESCAPE" }]), at("HOLD", "ESCAPE", [{ tick: 3, option: "ESCAPE" }])]).toEqual([0, 1]);
    expect(why(proofsOn(CONTAINED_THEN_SPENT_HOLD, H0, SPENT_AT_3("ESCAPE", [{ tick: 3, option: "ESCAPE" }])), "S-20")).toBe("g:play:1 t3: an escape offered with his escape spent (HOLD, branch HOLD)");
    // A clean pick that moves is a step, not the spent case.
    const moved = proofsOn(CONTAINED_THEN_SPENT_HOLD, H0, SPENT_AT_3("THROWAWAY", [{ tick: 3, option: "MOVE" }]));
    expect(faulted(moved)).toEqual({});
    expect(Object.keys(moved.counts).filter((k) => k.startsWith("spent."))).toEqual([]);
  });

  it("with his escape open, a clean expiry neither holds nor throws away under the break-out", () => {
    const open = (outcome: string): ReadOptions => ({ x5: { cleanExpiries: [{ tick: 1, outcome: outcome as S5CleanExpiry["outcome"] }] } });
    expect(why(proofsOn(CONTAINED_THEN_SPENT_HOLD, H0, open("THROWAWAY")), "S-20")).toBe("g:play:1 t1: a THROWAWAY on a clean expiry with his escape open");
    expect(faulted(proofsOn(CONTAINED_THEN_SPENT_HOLD, H0, open("THROW")))).toEqual({});
    // Without the cap S-20 reads nothing.
    expect(proofsOn(CONTAINED_THEN_SPENT_HOLD, treeOf("H1"), SPENT_AT_3("HOLD")).checked["S-20"]).toBe(0);
  });
});

// --- the counts beside the clauses ---------------------------------------------------------------------------------

describe("the counts a step-6 play adds", () => {
  it("counts each part's affected plays, the rolls by band and pocket, the sacks by origin and the deadline picks", () => {
    const L = emptyStep6LeagueFolds();
    for (const spec of [scramblePlay(-DROP), DEADLINE_THROWAWAY, SHED_THEN_SACK, BLOCKED_CATCH_SACK]) {
      const events = onePlay(spec);
      checkS6Play(L, H0, dropbacksOf(constructedGame("g", [spec]))[0]!, readS6Play(events, H0)!, undefined, indexed(events), {});
    }
    expect(L.counts["s6Plays"]).toBe(4);
    expect(L.counts["sacks"]).toBe(3);
    expect(L.counts["sacks.failedScramble"]).toBe(1);
    expect(L.counts["sacks.caughtEscape"]).toBe(1);
    expect(L.counts["acted.failedScrambleSack"]).toBe(1);
    expect(L.counts["acted.deadlinePick"]).toBe(1);
    expect(L.counts["acted.caughtAsContact"]).toBe(2);
    expect(L.counts["acted.direction"]).toBe(2);
    expect(L.counts["acted.any"]).toBe(4);
    expect(L.counts["deadline.THROWAWAY"]).toBe(1);
    expect(L.counts["throwaways.OUT_OF_POCKET.PRESSURED"] ?? L.counts["throwaways.OUT_OF_POCKET.CLEAN"]).toBe(1);
    expect(Object.entries(L.counts).filter(([k]) => k.startsWith("rolls.outcome.")).reduce((a, [, v]) => a + v, 0)).toBe(4);
    expect(L.counts["contestsAtEscape"]).toBe(2);
    // No play faults (S-16 reads the engine-shaped drill, S-13 the drop).
    expect(faulted(L)).toEqual({});
  });
});
