/**
 * THE DRAFT CLASS MAKER (ADR-086 §3, D2; attributes.md §5 "rookie-class generator").
 *
 * Each spring, about 900 made-up college players: about 260 are drafted, several hundred more sign
 * undrafted to fill 90-man offseason rosters, and the rest go home. Each prospect is made the way a
 * league player is (generate.ts): a hidden talent, measurements from his position's body, ratings on
 * ADR-079's absolute scale. Prospects are 21 to 23 and carry draft status "PROSPECT".
 *
 * The position mix follows a roster's shape; each class's overall strength and its depth at each
 * position wobble a little from year to year. Same seed and draft year → the same class.
 *
 * Growth is ADR-087's: once its development fields exist, the class gives each prospect his growth
 * rate (from its own random stream, so adding it moves no name or rating here).
 */
import { createRng, playerId, type DraftClass, type PlayerState, type Position, type Rng } from "@ff/contracts";
import type { Measurements } from "./derive.js";
import { gauss, measure, overallAt, rateAttributes } from "./generate.js";
import { drawName } from "./names.js";
import { POSITION_ORDER, ROSTER_SHAPE, ROSTER_SIZE } from "./shape.js";

/** Prospects in a class. */
export const DRAFT_CLASS_SIZE = 900;
/**
 * Prospect talent, on the generator's talent scale (a team's first-string slot is centred at 0.6).
 * CHOSEN, provenance NONE; D7 tunes it so a top-10 pick usually starts and most 7th-rounders do not stick.
 */
export const PROSPECT_TALENT = { mean: -0.9, sd: 0.9 } as const;
/** How much a class's strength, and its depth at one position, wobble from year to year (talent units). */
export const CLASS_WOBBLE = { overall: 0.1, position: 0.15 } as const;

export interface GenerateDraftClassInput {
  readonly seed: string;
  /** The draft's year. */
  readonly draft: number;
  readonly size?: number;
  /** Names already in the league, so a prospect never shares one. Not changed. */
  readonly usedNames?: ReadonlySet<string>;
}

export interface GeneratedDraftClass {
  readonly draftClass: DraftClass;
  readonly players: PlayerState[];
  /** Combine numbers, by player id: public and exact (ADR-086 Q3). Moves to `PlayerBio.combine` with ADR-087 P2. */
  readonly combine: Readonly<Record<string, Measurements>>;
  /** Each prospect's overall at his position, by player id (attributes' `overallAt`), for boards and depth. */
  readonly overall: Readonly<Record<string, number>>;
}

/** Positions in proportion to a 53-man roster. */
function drawPosition(rng: Rng): Position {
  let x = rng.next() * ROSTER_SIZE;
  for (const p of POSITION_ORDER) {
    x -= ROSTER_SHAPE[p];
    if (x < 0) return p;
  }
  return POSITION_ORDER[POSITION_ORDER.length - 1]!;
}

export function generateDraftClass(input: GenerateDraftClassInput): GeneratedDraftClass {
  const size = input.size ?? DRAFT_CLASS_SIZE;
  const root = createRng(input.seed, `attributes:draft-class/${input.draft}`);
  const used = new Set(input.usedNames ?? []);
  const yearLevel = CLASS_WOBBLE.overall * gauss(root.fork("year"));
  const depth: Partial<Record<Position, number>> = {};
  for (const p of POSITION_ORDER) depth[p] = CLASS_WOBBLE.position * gauss(root.fork(`depth/${p}`));

  const players: PlayerState[] = [];
  const combine: Record<string, Measurements> = {};
  const overall: Record<string, number> = {};
  for (let i = 0; i < size; i++) {
    const rng = root.fork(`prospect/${i}`);
    const position = drawPosition(rng);
    const talent = PROSPECT_TALENT.mean + yearLevel + depth[position]! + PROSPECT_TALENT.sd * gauss(rng);
    const m = measure(rng, position, talent);
    const ratings = rateAttributes(rng, position, talent, m);
    const id = playerId(`d:${input.draft}:${String(i).padStart(4, "0")}`);
    combine[String(id)] = m;
    overall[String(id)] = overallAt(position, ratings);
    players.push({
      bio: {
        id,
        displayName: drawName(rng, used),
        position,
        age: 21 + rng.int(0, 2),
        heightIn: m.heightIn,
        weightLb: m.weightLb,
        draft: "PROSPECT",
      },
      attributes: { kind: "true", values: ratings, traits: new Set<string>() },
      condition: { stamina: 100, morale: 0 },
      // ADR-079 Q7: no personality yet.
      personality: { needs: {}, type: "quiet" },
    });
  }
  return { draftClass: { draft: input.draft, prospects: players.map((p) => p.bio.id) }, players, combine, overall };
}
