# PROMPT PACK v0 — Art Direction Comparison Test

**Purpose:** generate real comparison images for the Spec #9 §3 decision (A / B / C) using your own tools.
**Status:** pre-lock. Once a direction is chosen, the winner's strings become the basis of the locked style guide, and this file is superseded by versioned per-class templates.

## How to use

1. Pick a generator (Midjourney, Flux, SDXL, Firefly, Nano Banana, whatever you prefer).
2. For each direction, run the **three test images** below: one scene, one portrait, one atmosphere.
3. Keep the seed fixed within a direction so you're comparing style, not luck.
4. Judge on three questions: *Could I look at this for 200 hours? Does it look like a football game nobody else made? Will portrait #900 still look like portrait #1?*

**Format:** `[GLOBAL STYLE] + [SUBJECT] + [FRAMING] + [NEGATIVE]`. The global style string is the thing that must stay identical across every asset in a direction — that's what makes hundreds of images feel like one world.

---

## DIRECTION A — The Coach's Office

**GLOBAL STYLE (A):**
> mid-century institutional interior photography, 1970s American athletic department, muted desaturated palette of oxidized green, oatmeal, oxblood and warm grey, single warm practical light source, heavy shadow, matte surfaces, worn wood and painted cinderblock, fine film grain, 35mm, natural imperfection, no gloss, no lens flare

**A1 — Scene backdrop (scouting room):**
> [GLOBAL STYLE A] + an empty windowless scouting room, long table stacked with manila folders and index cards, corkboard wall covered in pinned player cards, a projector on a rolling cart, styrofoam coffee cups, fluorescent tube overhead partially out — wide eye-level shot, room composed with empty center space for characters to be placed, nothing centered, no people

**A2 — Character portrait (position coach, ~50s):**
> [GLOBAL STYLE A] + a team-issued headshot of a middle-aged American football position coach against a plain painted cinderblock wall, polo shirt, whistle lanyard, weathered face, neutral expression, direct to camera — tight head-and-shoulders crop, flat frontal lighting, institutional ID photo feel

**A3 — Atmosphere (practice facility, dawn):**
> [GLOBAL STYLE A] + an empty practice field at dawn, blocking sleds, chalk hash marks, low fog, chain-link fence, floodlight towers off — wide establishing shot, horizon low, no people

**NEGATIVE (A):** glossy, neon, cinematic teal-orange grade, lens flare, modern glass architecture, stock-photo smiling, logos, team marks, jersey numbers, text

---

## DIRECTION B — Broadcast Modern

**GLOBAL STYLE (B):**
> contemporary sports broadcast graphics aesthetic, near-black background, high contrast, one saturated accent color, hard rim lighting, glass and metal, screen glow, motion-blur energy, crisp digital rendering, bold condensed sans typography space

**B1 — Scene backdrop (studio-style war room):**
> [GLOBAL STYLE B] + a dark data war room, wall of glowing screens showing abstract charts, glass table reflecting light, dramatic backlight — wide shot, center space kept clear, no people, no readable text

**B2 — Character portrait (coordinator, ~40s):**
> [GLOBAL STYLE B] + a dramatic broadcast-style portrait of an American football coordinator, dark background, hard rim light on one side, intense expression, athletic quarter-zip — tight crop, high contrast, no logos

**B3 — Atmosphere (stadium night):**
> [GLOBAL STYLE B] + a modern stadium exterior at night, saturated accent lighting, wet pavement reflections, dramatic sky — wide establishing shot, no crowds, no signage

**NEGATIVE (B):** vintage, film grain, pastel, hand-drawn, clutter, real team logos, readable text

---

## DIRECTION C — Illustrated Editorial

**GLOBAL STYLE (C):**
> flat editorial illustration, limited five-color palette, hard shapes with no gradients, subtle paper-grain texture, confident geometric simplification, mid-century sports-print sensibility, thick intentional negative space, screenprint feel

**C1 — Scene backdrop (press room):**
> [GLOBAL STYLE C] + a press conference room reduced to flat shapes, podium, curtain backdrop, folding chairs in rows, microphones — wide flat composition, center kept clear for figures, no people, no text

**C2 — Character portrait (scouting director, ~60s):**
> [GLOBAL STYLE C] + a flat illustrated portrait of an older American football scouting director, geometric simplification of features, three tones plus outline, neutral background — head-and-shoulders, front-facing, consistent crop

**C3 — Atmosphere (bus at night):**
> [GLOBAL STYLE C] + a team bus on a dark highway seen from outside, flat shapes, two-tone night palette, glowing windows — wide, minimal, no people visible

**NEGATIVE (C):** photorealism, 3D render, gradients, painterly brushwork, cartoon mascot style, chibi, text, logos

---

## Consistency workflow (once a direction is locked)

1. **Freeze the global style string.** It becomes `guideVersion: 1` and never varies casually — changes are versioned events with a regeneration list.
2. **Style reference locking.** Generate 3–5 "canonical" images, then use them as style references (Midjourney `--sref`, Flux/SDXL IP-Adapter, Firefly style reference) for everything after. This matters far more than prompt wording for holding a look across hundreds of assets.
3. **Portrait slots** (Spec #9 §5): `portrait.v1 → {role, ageBand, build, era, framing, mood}` — the global style and framing stay locked; only the slots vary. Never let the generator restyle a portrait.
4. **Magnific:** use for consistent upscale at low creativity settings — high creativity reintroduces style drift, which defeats the purpose.
5. **Record provenance** in the manifest: `templateId`, `templateVersion`, `guideVersion`, seed. Drift becomes a template defect with a known blast radius rather than a mystery.
6. **Batch review:** judge portraits in grids of 20+, never individually. Drift is invisible one at a time and obvious in a grid.

## Your other tools

- **Remotion** is a strong fit later for the stretch-goal dot-replay of the match event stream — it's React-based, so it shares the UI stack, and a play could be rendered from the same typed events. Also useful for producing diagram assets programmatically (fields, hash marks, route glyphs) rather than generating them, which is better: functional art should be code, not images.
- **Claude Design** is a good place to iterate on the hub and window layouts once the direction is locked.
- **Photoshop** matters most for the manifest-level work: standardizing portrait crops, applying a consistent grain/paper texture pass, and batch-processing so generated assets land on-spec.
