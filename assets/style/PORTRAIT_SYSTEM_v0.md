# PORTRAIT SYSTEM v0 — Parameterized Appearance

**Purpose:** generate lifelike, on-style, endlessly consistent portraits at volume, for thousands of generated players and staff across decades of simulated time.
**Status:** pre-lock; realism level pending the §4 test.

## 1. THE GOVERNING RULE

**Portraits are generated from parameters, never from a person.**

Appearance is a set of attributes on a player record — skin tone, face shape, build, hair, facial hair, age band, era — sampled deterministically from that player's seed. The generator receives parameter values. It never receives a real person's name, team, number, or a reference image of one, and no generated portrait is ever paired with a real identity.

**Why this is the architecture, not just the legal answer:**

- **Legal.** Right of publicity protects identifiable individuals. In *Hart v. EA* and *Keller v. EA*, avatars that were not photographs were still unprotected because each matched a specific athlete's position, height, weight, home state, number, and appearance *in combination*. Identifiability is the trigger, not fidelity. NFL player likenesses are licensed collectively through the NFLPA; approximating them to avoid that license is the precise conduct the doctrine targets.
- **General physical characteristics are not the problem.** A 6'5", 250 lb, 27-year-old tight end with locs describes thousands of people. The hazard is the *identifying combination* — appearance plus the real person's specific context. Our pipeline never assembles that combination, because appearance comes from a seed and the shipping league is fictional.
- **Practical.** Shipping builds are fictional (Spec #4 §5). A pipeline that targets real people produces assets we cannot ship, and would have to be rebuilt.
- **Consistency dividend.** Deterministic appearance means the same player looks identical in every save load, at every age, forever — and appearance becomes auditable data in the manifest rather than a folder of one-off images.

Development builds that import real names for calibration generate **no portraits at all** (Spec #9 §8).

## 2. APPEARANCE PARAMETER SCHEMA

Derived deterministically from `PlayerId` + world seed; stored on the player record; feeds the prompt template's slots.

```ts
interface Appearance {
  skinTone: 1..10;              // broad, evenly sampled
  faceShape: "round"|"square"|"long"|"oval"|"heart"|"diamond";
  featureWeight: "fine"|"average"|"heavy";
  build: "lean"|"athletic"|"thick"|"massive";   // constrained by position + height/weight
  hair: { style: string; length: string; color: string; recession: 0..3 };
  facialHair: "none"|"stubble"|"mustache"|"goatee"|"full"|"chinstrap";
  eyeColor: string;
  ageBand: "rookie"|"prime"|"veteran"|"late";   // advances with career; portrait regenerates
  distinguishing?: string[];    // scar, glasses, tattoos-visible-at-neck, etc. (sparse)
  era: number;                  // grooming/photography conventions of the season
}
```

**Rules:** sampling is broad and even across skin tone and features, never correlated with attributes, personality, or position beyond what physics demands (build follows height/weight). Age bands regenerate the portrait as a career progresses — the same face, older, which is a strong long-franchise texture effect.

## 3. THE PROMPT TEMPLATE (`portrait.v2`)

**The core disambiguation (learned from the v1 field test):** the *photographic treatment* is period; the *person* is present-day. v1 conflated them and produced subjects in period costume with period grooming. State the split explicitly — generators respond to direct disambiguation far better than to negation.

**Second lesson:** negative prompts are weak. The v1 test produced a jersey number despite `jersey numbers` being negated. **Positively specify the apparel you want** instead of negating what you don't.

```
STYLE:
institutional headshot photography in the manner of mid-century athletic-department
archives — muted desaturated palette of oxidized green, oatmeal, oxblood and warm grey;
single warm practical light source; heavy shadow; matte surfaces; painted cinderblock;
fine film grain; 35mm; natural imperfection; no gloss; no lens flare.

ERA DISAMBIGUATION (required, verbatim):
The photographic treatment is period. The subject is not.
Present-day person: contemporary grooming, contemporary athletic apparel,
modern facility. Photographed today, on film.

SUBJECT:
a team-issued headshot of a {ageBand} American football {role},
{skinTone} skin, {faceShape} face, {featureWeight} features, {build} build,
{hair.length} {hair.color} hair in a {hair.style}, {facialHair},
{distinguishing},
wearing {apparel — see role table}, neutral expression, direct to camera,
plain painted cinderblock wall behind

FRAMING:
tight head-and-shoulders, flat frontal light, institutional ID photo,
identical crop and distance every time

NEGATIVE (secondary defense only):
vintage jersey, retro uniform, period clothing, letterman, 1970s hairstyle,
sepia, faded vintage photograph, logos, team marks, numbers, text,
celebrity resemblance, glamour lighting, dramatic grade
```

### 3.1 Apparel by role (positively specified; also a UI dividend)

| Role | Apparel |
|---|---|
| Player | plain modern performance tee or compression top, technical fabric, solid color, unmarked |
| Position coach / coordinator | modern quarter-zip or performance polo, solid color, unmarked |
| Head coach | modern quarter-zip, solid color |
| Scout | plain modern polo or button-down |
| Front office / president | modern dress shirt, no tie |
| Agent / media | modern business casual |

Because apparel encodes role, staff and players are distinguishable at a glance in any list — a free legibility win.

### 3.2 `hair.style` and `era`

`hair.style` must be sampled from **contemporary** styles (textured crop, fade, taper, twists, locs, braids, buzz, longer swept, etc.), never period ones. The `era` parameter governs *subject* grooming and apparel conventions only — it never touches the photographic treatment, which stays locked at `guideVersion`. A 2045 simulated season shifts grooming; the film grain and cinderblock stay exactly the same. This is what lets fifty simulated seasons feel continuous while still aging.

### 3.3 Two authoring notes from the test

- Don't pair `friendly smile` with `neutral expression` — they contradict, and the generator picks one arbitrarily. `neutral expression` is the locked framing; expression is not a slot.
- **Author appearance from the seed, not from a photograph.** Using a real player's image to fill the parameter slots produces a description that traces back to an individual, which is the one thing §1 exists to avoid — even when, as in the v1 test, the generic descriptors ("light skin, oval face, athletic build") produce someone unrecognizable. Sample the parameters; let the generator meet them.

## 4. THE REALISM TEST (run this)

Same parameter set, four stylization levels, to settle the open question in Spec #9 §9.2. Use one fixed parameter combination for all four so you're judging treatment, not subject:

> *Test subject: prime-age American football offensive lineman, medium-deep skin tone, square face, heavy features, massive build, short black hair, full beard.*

**L1 — Photoreal.** Add: `photographic, 85mm portrait lens, natural skin texture, fine film grain`
**L2 — Photoreal-stylized.** Add: `photographic with subtle painterly treatment, softened skin detail, slightly graphic shadow shapes`
**L3 — Rendered illustration.** Add: `digital painted portrait, visible brush structure, simplified planes, controlled palette`
**L4 — Flat illustration.** Add: `flat vector illustration, five-color palette, hard shapes, no gradients, geometric simplification`

**Judge on:** (a) does it hold up in a grid of 20 at a glance; (b) does it sit comfortably against Register A's tactile backdrops; (c) does it read as a specific individual without reading as anyone real; (d) can you generate 500 of these without visible drift.

Prediction: L1 is the most impressive singly and the most brittle at volume — photoreal faces drift and occasionally converge on famous ones. L2 or L3 likely wins. But run it; samples beat prediction.

## 5. CONSISTENCY WORKFLOW

1. Lock the global style string and framing — never vary them per portrait.
2. Generate 3–5 canonical portraits, then drive everything from them as style references (`--sref`, IP-Adapter, Firefly style reference). This holds a look far better than prompt wording.
3. One generation seed per `PlayerId`, recorded in the manifest — regenerating is reproducible.
4. Magnific at **low creativity** for upscaling; high creativity reintroduces drift.
5. Review in grids of 20+, never individually.
6. Any portrait that reads as a recognizable real person is rejected and reseeded — a standing review criterion, not a one-time check.
