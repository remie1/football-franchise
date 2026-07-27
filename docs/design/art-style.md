# SPEC #9 — ART STYLE & ASSET PIPELINE

**Status:** Draft for owner review — **§3 requires an owner decision before assets are generated**
**Owner agent:** `art-director`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D8

## 1. WHAT THIS DOMAIN OWNS

Image generation happens outside the repo (AI-generated under strict guideline is the chosen process). This domain owns the **system that keeps it consistent**: the locked style guide, the versioned prompt-template library, the asset manifest the scene system consumes, and consistency review. The art director agent never generates images; it governs how they're made and admitted.

## 2. ASSET CLASSES

| Class | Purpose | Volume (v1) | Consistency risk |
|---|---|---|---|
| Scene backdrops | rooms the player visits (scouting room, press room, practice facility, staff office, draft room, stadium) | ~6–10 | **highest** — a room must look like the same room every visit |
| Character portraits | staff, players, agents, media, ownership | hundreds → thousands | **highest by volume** — style drift is obvious when two portraits sit side by side |
| Environment/atmosphere | weather, time of day, stadium exteriors, city establishing shots | ~20 | moderate |
| UI iconography | window icons, status glyphs, confidence marks | ~40 | low but must feel of-a-piece |
| Diagram assets | field, hash marks, route/X-O glyphs | ~20 | must be functional first, styled second |

**Portraits are the hard problem.** Volume is unbounded (every generated player across decades), and demographic representation must be broad and natural without stereotyping. The pipeline must produce them at scale, on-style, and coherently with a player's actual bio (age, position, era).

## 3. AESTHETIC DIRECTION — **DECIDED: THE TWO-REGISTER SPLIT (A + B)**

The game runs **two visual registers**, and the divide between them is deliberate and large.

- **Register A — The Working World.** Grounded, tactile, mid-century-institutional: legal pads, laminated call sheets, corkboard, painted cinderblock, film-room dark, muted oxidized-green / oatmeal / oxblood / warm-grey palette, matte surfaces, film grain. Everything that is *your job*: offices, staff, scouting, practice, contracts, the draft room, conversations, the calendar, the advance loop.
- **Register B — The Broadcast World.** Near-black, high contrast, saturated accent, hard rim light, bold condensed type, screen glow, motion energy. Everything that is *football as the public consumes it*: gameday presentation, the play log, scoreboard and standings, media rankings, news, press coverage, highlights and recaps, awards.

**Why the split is right and not a compromise:** it is diegetic. A is the world the coach lives in; B is the world that watches him. Broadcast aesthetics aren't a generic default here — they are the literal visual language through which football reaches the public, so using them *only* for public-facing surfaces makes them meaningful rather than borrowed. It also delivers an emotional rhythm that matches the real job: six days of quiet, tactile work, then one day of noise and light. The familiarity of B is a feature in its place — the owner's point that a user should sometimes get to slip into an easy, expected experience — precisely because it is bounded.

### 3.1 Register map (boundary rules)

| Surface | Register | Note |
|---|---|---|
| Hub, calendar, advance loop, digests | A | the game's home |
| Staff, scouting, practice, development, health | A | |
| Contracts, cap, trades, draft room | A | |
| Conversations, story beats, scenes | A | even when the topic is a broadcast event |
| **The press room as a place** | **A** | it's a room in your building |
| **The resulting coverage** | **B** | the story that airs is a public artifact |
| Gameday: play log, scoreboard, in-game decisions | B | |
| Post-game recap, highlights, box score | B | |
| Standings, schedule, league news, media rankings, awards | B | |
| Post-game *staff debrief* | A | you're back in the building |

Rule of thumb: **if the public can see it, it's B; if only the organization can, it's A.**

### 3.2 Binding the two together (so it reads as one product)

Two registers risk looking like two products. Four bindings prevent that:

1. **Shared skeleton.** Identical type scale, spacing system, and layout grid across both. Only surface treatment changes — never structure.
2. **Shared portrait treatment.** One illustrated portrait style (Direction C's stylization) used in *both* registers. Portraits become the connective tissue and the thing that reads as "this game" in either world — while also solving the volume-consistency problem (Spec #9 §2).
3. **Inherited palette.** Register B's saturated accents derive from A's palette pushed to full chroma — an oxidized green becomes an electric green, oxblood becomes a hot red — rather than defaulting to the standard broadcast neon. B should look like *our* broadcast, not any broadcast.
4. **Deliberate transitions.** Crossing registers is a designed moment, not a jump cut mid-screen: entering gameday cuts to broadcast; returning after the game settles back into the quiet building. The transition is where the two-world premise gets *felt*, and it's worth spending motion budget on (Spec #8 §7 allots motion to exactly two moments — this is now the second).

**Never mix registers within a single screen.** A screen belongs to one world.

## 4. THE STYLE GUIDE (structure to be filled once §3 is decided)

Palette (4–6 named hex values plus team-color injection rules); lighting and time-of-day rules; camera framing conventions per class (portrait crop, room eye-line, establishing distance); material and texture vocabulary; era rules (how a 1990s-set flashback or a 2040s simulated season differs); what is explicitly **out of bounds** (visual clichés, logo-adjacent marks, real-league trade dress).

## 5. PROMPT TEMPLATE LIBRARY

Versioned templates per asset class with slot variables:

```
portrait.v3 → { role, ageBand, build, era, framing, mood }
scene.v2    → { room, timeOfDay, occupancy, season, mood }
```

Every generated asset records the template ID and version that produced it. When drift appears, the fix is a template revision plus a regeneration list — not hand-patching individual images. Templates are content, not code, and live in `assets/style/`.

## 6. ASSET MANIFEST (the contract with the UI)

```
{ id, class, path, dimensions, slots?, templateId, templateVersion, guideVersion, generatedAt, reviewStatus }
```

The scene system resolves `sceneId → backdrop + character slots` through this manifest (Spec #8 §5), so **art is swappable without code changes** — the requirement that makes placeholder-first viable.

## 7. PLACEHOLDER-FIRST WORKFLOW

v1 ships AI-generated placeholders that *conform to the locked guide*. The guide is written so that future replacement art — commissioned, or regenerated with better tools — can conform to the same spec. Placeholder is a quality level, not a separate style.

**Consistency review:** new assets are checked against the guide before `reviewStatus: approved`. Drift is documented as a template defect, not fixed per-image.

## 8. LEGAL & CONTENT GUARDRAILS

- **No real-league trade dress.** No NFL team marks, logos, uniform designs, or wordmarks — including in shipped fictional mode, and including "close enough" imitations. Team visual identity is generated (color pairs, marks, wordmarks) alongside the fictional league.
- **No real-person likenesses.** Development builds may import real names for calibration, but no portrait is ever generated to resemble a real player, and shipped builds are fictional throughout.
- **Representation:** portrait generation must produce broad, natural demographic variety across roles including staff and ownership, without tying appearance to attributes or personality types.
- Generated-asset provenance is recorded in the manifest.

## 9. OPEN QUESTIONS FOR OWNER

1. ~~Aesthetic direction~~ — **decided: the two-register split (§3).**
2. ~~Portrait treatment~~ — **decided by implication: illustrated, shared across both registers (§3.2 binding 2).** Remaining sub-question: how stylized? (near-realistic illustration vs. strong geometric simplification). Lean: moderate — enough stylization to hold consistency at volume, enough likeness to read as a specific person.
3. **Team identity generation:** hand-author a set of fictional franchises with fixed identities, or generate names/colors/marks procedurally per save? Lean: hand-authored core set for familiarity, procedural for expansion and relocation.
