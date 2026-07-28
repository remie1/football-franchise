/**
 * A STABLE DIGEST OVER A PLAIN VALUE — the measured half of batch provenance.
 *
 * `BatchProvenance.tunablesVersion` is a LABEL a caller asserts. `runBatch` already refuses an
 * unnamed patch (§6, "tuning amnesia with extra steps"), but no refusal can catch the other
 * direction: two reports both labelled `DEFAULT_TUNABLES` while `DEFAULT_TUNABLES` itself moved
 * underneath them. A label cannot detect a change to the thing it labels.
 *
 * So the batch also records a digest of the tunables it ACTUALLY RAN. It is observed rather than
 * asserted, which means no caller can get it wrong, and it is the one dimension of a baseline's
 * identity that is self-verifying.
 *
 * Lives here rather than in `report/` so `harness/` never imports `report/`: the report reads the
 * batch, not the other way round.
 */

/**
 * Canonical text for a plain value.
 *
 * Object keys are sorted, so the digest is a property of the value and not of construction order.
 * `undefined` members are dropped, so an explicitly-absent optional and an absent one agree.
 * `-0` normalises to `0`. Non-finite numbers are MARKED rather than collapsed to `null` the way
 * `JSON.stringify` does — a tunable that has become `NaN` is exactly what a digest is for.
 *
 * Functions are recorded by name and arity only; a body cannot be hashed. `Tunables` is a tree of
 * numbers today, and should one ever become a function this digest goes blind to its contents.
 * This sentence is the notice.
 */
export function canonicalise(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) return `#${String(value)}`;
      return Object.is(value, -0) ? "0" : String(value);
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "bigint":
      return `${value.toString()}n`;
    case "undefined":
      return "undefined";
    case "function": {
      const fn = value as (...args: never[]) => unknown;
      return `<fn ${fn.name}/${fn.length}>`;
    }
    case "symbol":
      return `<symbol ${String(value)}>`;
    case "object": {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter((entry) => entry[1] !== undefined)
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(",")}}`;
    }
    default:
      // Unreachable: `typeof` has eight results and all eight are handled above. Present because
      // a digest that silently returned `undefined` for a value it did not recognise would hash
      // two different tunables trees to the same string, which is the one failure mode a digest
      // must not have.
      return `<unrecognised ${String(typeof value)}>`;
  }
}

/** FNV-1a over the canonical form. Same family as `digestSeeds`, so both read alike in a header. */
export function stableDigest(value: unknown): string {
  const text = canonicalise(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}
