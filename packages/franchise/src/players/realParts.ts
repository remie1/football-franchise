/**
 * A copied injury's body-part class (ADR-087 §12.3.7, AB7): what `realKindOf` (`injurySpot.ts`) reads when
 * a stand-in's copied current injury carries a kind made of report text (`real:left-knee`, say) rather
 * than one of P8's 17 classes. The rules are calibration's (`injuries/classify.ts` `reportTextKind` and
 * `bodyPart`, the class whose keyword matches earliest in the text), COPIED, since franchise imports no
 * other domain (Iron Rule 1). The copy is pinned by its own literal vectors in
 * `test/players.pastInjuries.test.ts`, whose sha256 is the one the importer's copy pins too
 * (`PARTS_VECTORS_SHA256`), so the two cannot drift apart unseen.
 */

/** The 17 classes, as calibration names them ("/" between parts). */
export type RealBodyPart =
  | "knee" | "ankle" | "hamstring" | "concussion/head" | "shoulder" | "groin/hip" | "foot/toe" | "calf/shin" | "achilles" | "quad/thigh"
  | "back/neck" | "hand/wrist" | "elbow/arm" | "chest/ribs/abdomen" | "illness" | "other" | "unknown";

const NON_INJURY = /not injury|non-injury|non injury|\brest\b|\bresting\b|personal|coach|team decision|did not travel|suspen|load management|family|birth|bereavement|ramp up|no game status|expected to (be available|play)/;
const COVID = /covid/;
const ILLNESS = /illness|\bill\b|\bsick|\bflu\b/;

/** Each class's keywords, in calibration's order (the earliest match in the text wins, not the first listed). */
export const REAL_PART_KEYWORDS: readonly (readonly [Exclude<RealBodyPart, "illness" | "other" | "unknown">, RegExp])[] = [
  ["achilles", /achilles/],
  ["concussion/head", /concussion|\bhead\b/],
  ["hamstring", /hamstring/],
  ["knee", /knee|\bacl\b|\bmcl\b|\bpcl\b|patell|menisc/],
  ["ankle", /ankle/],
  ["foot/toe", /\bfoot\b|\bfeet\b|\btoes?\b|heel|plantar|lisfranc|\barch\b/],
  ["calf/shin", /\bcalf|calves|\bshin|fibula|tibia|\bleg\b/],
  ["quad/thigh", /\bquad|thigh/],
  ["groin/hip", /groin|\bhips?\b|adductor|abductor|glute|pelvi/],
  ["shoulder", /shoulder|collarbone|clavicle|rotator|scapula|labrum|\bac joint/],
  ["hand/wrist", /\bhands?\b|wrist|finger|thumb|forearm|knuckle/],
  ["elbow/arm", /elbow|bicep|tricep|\barm\b/],
  ["back/neck", /\bback\b|spine|lumbar|\bdisc\b|stinger|\bneck\b|cervical/],
  ["chest/ribs/abdomen", /chest|pectoral|\bpec\b|\bribs?\b|abdom|oblique|\bcore\b|sternum|hernia|kidney|liver|spleen|lung/],
];

/** classify.ts `reportTextKind`, copied. */
export function realTextKind(text: string | null): "FOOTBALL" | "ILLNESS" | "NON_INJURY" | "COVID" | "NONE" {
  if (text === null) return "NONE";
  const t = text.trim().toLowerCase();
  if (t === "") return "NONE";
  if (COVID.test(t)) return "COVID";
  if (ILLNESS.test(t)) return "ILLNESS";
  if (NON_INJURY.test(t)) return "NON_INJURY";
  return "FOOTBALL";
}

/** classify.ts `bodyPart`, copied: the class whose keyword matches earliest in the text. */
export function realBodyPart(text: string | null): RealBodyPart {
  const kind = realTextKind(text);
  if (kind === "NONE" || kind === "NON_INJURY" || kind === "COVID") return "unknown";
  if (kind === "ILLNESS") return "illness";
  const t = (text ?? "").toLowerCase();
  let best: RealBodyPart = "other";
  let at = Number.POSITIVE_INFINITY;
  for (const [part, re] of REAL_PART_KEYWORDS) {
    const m = re.exec(t);
    if (m !== null && m.index < at) {
      at = m.index;
      best = part;
    }
  }
  return best;
}
