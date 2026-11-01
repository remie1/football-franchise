/**
 * Type-level helpers for ADR-093's contracts tests (F1 to F7). Not a test file: vitest does not run
 * it, and `pnpm --filter @ff/contracts typecheck` compiles it with the tests that import it. It
 * lands with F1, which every other petition builds on, so each test file can import it whichever
 * petitions are held.
 *
 * A pin is written `true as Is<A, B>`. When A and B are the same type the cast is `true as true`;
 * when they differ it is `true as false`, which does not compile (TS2352). So a pin fails the
 * typecheck the moment an edit loosens or tightens the type it names.
 */

/** The keys of T that may be left out. */
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

/** The keys of T that take `undefined` as a value (`exactOptionalPropertyTypes` gives none unless written in). */
export type UndefinedKeys<T> = { [K in keyof T]-?: undefined extends Required<T>[K] ? K : never }[keyof T];

/** `true` when A and B are the same type, `false` otherwise. */
export type Is<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * The helpers' own check, so no pin can pass by a helper that says `true` of everything (or
 * `boolean`, which `true as` would also take): each line fails to compile if a helper stops telling
 * two types apart.
 */
const SAME: readonly true[] = [
  true as Is<"A", "A">,
  true as Is<OptionalKeys<{ a: 1; b?: 2 }>, "b">,
  true as Is<OptionalKeys<{ a: 1 }>, never>,
  true as Is<UndefinedKeys<{ a: 1; b?: 2; c: 3 | undefined }>, "c">,
];
const DIFFERENT: readonly false[] = [
  false as Is<"A", "A" | "B">,
  false as Is<"A" | "B", "A">,
  false as Is<OptionalKeys<{ a: 1; b?: 2 }>, never>,
  false as Is<UndefinedKeys<{ b?: 2 }>, "b">,
];
void [SAME, DIFFERENT];
