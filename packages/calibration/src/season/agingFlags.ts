/**
 * ADR-087 §12.1 (step AB3): the aging options on the command line, shared by `season`,
 * `career-check` and `player-checks`, and how a run records and restores them.
 *
 * The flags:
 *  - `--aging position|ability`: how the players age (franchise `PlayerStepsConfig.aging`, default
 *    `position`). Acts only with development on.
 *  - `--ability-curves D|B`: the fitted set on the ability path (default `D`, variant D as fitted with
 *    slow smarts; `B` is variant B's whole set, AB9-T2).
 *  - `--technique-knee`: TECHNIQUE's steeper slope from 31 (§12.2.5; AB9-T3).
 *  - `--smarts-snaps <n>`: smarts from snaps, points per 1,000 snaps, in place of the set's (AB9-T4, O2: 0.225).
 *  - `--ability-rules`: the shorthand. Today it sets `--aging ability` alone; AB5 adds
 *    `--injury-risk spot` and AB8 `--retirement choice` to it, as §12.1 has it set all three.
 *
 * The three tuning flags need the ability path (`--aging ability` or `--ability-rules`). A value the
 * flags do not take is refused, so a misspelling never plays the position path silently. The options
 * are kept only when they are not the default (`--aging position` and `--ability-curves D` are the
 * defaults and are dropped), so a run at the defaults passes exactly what it passed before AB3, and
 * its cache keys are unchanged.
 *
 * Calibration may not import franchise's own type for these (ADR-078 R1's named surface), so the
 * shape is written out here; it is the franchise `AgingOptions` shape, field for field.
 */

/** The aging options as the season runner takes them (franchise `AgingOptions`). */
export interface AgingSwitches {
  readonly aging?: "position" | "ability";
  readonly abilityCurves?: "D" | "B";
  readonly techniqueKnee?: boolean;
  readonly smartsSnaps?: number;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** The flags as typed, before `settleAging` checks them. */
export interface AgingFlags extends Mutable<AgingSwitches> {
  /** `--ability-rules` was given. */
  abilityRules?: boolean;
}

/**
 * Reads one aging flag at `arg` into `into`, taking its value from `next`; false when `arg` is not
 * one of them. Values are checked here.
 */
export function readAgingFlag(arg: string, next: () => string, into: AgingFlags): boolean {
  if (arg === "--aging") {
    const v = next();
    if (v !== "position" && v !== "ability") throw new SyntaxError(`--aging is position or ability, not ${JSON.stringify(v)}`);
    into.aging = v;
  } else if (arg === "--ability-curves") {
    const v = next();
    if (v !== "D" && v !== "B") throw new SyntaxError(`--ability-curves is D or B, not ${JSON.stringify(v)}`);
    into.abilityCurves = v;
  } else if (arg === "--technique-knee") into.techniqueKnee = true;
  else if (arg === "--smarts-snaps") {
    const text = next();
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v) || v < 0) throw new SyntaxError(`--smarts-snaps is points per 1,000 snaps, 0 or more, not ${JSON.stringify(text)}`);
    into.smartsSnaps = v;
  } else if (arg === "--ability-rules") into.abilityRules = true;
  else return false;
  return true;
}

/**
 * The flags checked and settled: `--ability-rules` read as `--aging ability` (refused beside
 * `--aging position`), the tuning flags refused off the ability path, and the defaults dropped.
 */
export function settleAging(flags: AgingFlags): AgingSwitches {
  if (flags.abilityRules === true && flags.aging === "position") throw new SyntaxError("--ability-rules sets --aging ability; drop --aging position");
  const aging = flags.abilityRules === true ? "ability" : flags.aging;
  const tuning = [
    flags.abilityCurves !== undefined ? "--ability-curves" : undefined,
    flags.techniqueKnee === true ? "--technique-knee" : undefined,
    flags.smartsSnaps !== undefined ? "--smarts-snaps" : undefined,
  ].filter((f): f is string => f !== undefined);
  if (aging !== "ability" && tuning.length > 0) throw new SyntaxError(`${tuning.join(", ")} act only on the ability path; add --aging ability (or --ability-rules)`);
  if (aging !== "ability") return {};
  return {
    aging: "ability",
    ...(flags.abilityCurves === "B" ? { abilityCurves: "B" as const } : {}),
    ...(flags.techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(flags.smartsSnaps !== undefined ? { smartsSnaps: flags.smartsSnaps } : {}),
  };
}

/**
 * A short name for the options, for cache keys and file names: `ability`, `ability-B`,
 * `ability-knee`, `ability-smarts0.225` and their joins; undefined at the defaults.
 */
export function agingLabel(o: AgingSwitches): string | undefined {
  if (o.aging !== "ability") return undefined;
  return ["ability", o.abilityCurves === "B" ? "B" : "", o.techniqueKnee === true ? "knee" : "", o.smartsSnaps !== undefined ? `smarts${o.smartsSnaps}` : ""]
    .filter(Boolean).join("-");
}

/**
 * The aging options a save or a checkpoint recorded (franchise `PlayerMemory.switches`, which the
 * players' steps write only when not the default), so a run that carries on plays under the same
 * rules. A record without them (a save from before AB3, or one made at the defaults) carries on at the
 * defaults. A value the options do not take is refused.
 */
export function agingFromRecord(switches: Readonly<Record<string, unknown>> | undefined): AgingSwitches {
  if (switches === undefined) return {};
  const { aging, abilityCurves, techniqueKnee, smartsSnaps } = switches;
  if (aging !== undefined && aging !== "position" && aging !== "ability") throw new Error(`the save's aging is ${JSON.stringify(aging)}, which this version does not know`);
  if (abilityCurves !== undefined && abilityCurves !== "D" && abilityCurves !== "B") throw new Error(`the save's abilityCurves is ${JSON.stringify(abilityCurves)}, which this version does not know`);
  if (techniqueKnee !== undefined && typeof techniqueKnee !== "boolean") throw new Error(`the save's techniqueKnee is ${JSON.stringify(techniqueKnee)}, not true or false`);
  if (smartsSnaps !== undefined && !(typeof smartsSnaps === "number" && Number.isFinite(smartsSnaps) && smartsSnaps >= 0)) {
    throw new Error(`the save's smartsSnaps is ${JSON.stringify(smartsSnaps)}, not a number of points 0 or more`);
  }
  return settleAging({
    ...(aging === undefined ? {} : { aging }),
    ...(abilityCurves === undefined ? {} : { abilityCurves }),
    ...(techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(smartsSnaps === undefined ? {} : { smartsSnaps }),
  });
}

/** Do two sets of options play the same rules (both settled)? */
export function sameAging(a: AgingSwitches, b: AgingSwitches): boolean {
  return agingLabel(a) === agingLabel(b);
}
