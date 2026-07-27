# SPEC #8 — USER INTERFACE (`apps/game`)

**Status:** Draft for owner review
**Owner agent:** `ui-layout`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D7; display rules fixed by Spec #6 §8

## 1. PURPOSE & IRON RULES

The UI is the whole game for the player, and structurally it is the *thinnest* domain: a renderer and an input surface, nothing more.

1. **Zero game logic.** If a screen needs a computed number, that computation belongs in a domain package. No exceptions — a "quick calculation in the component" is how a second rules engine gets born.
2. **Perceived data only.** Never render true attributes for anyone, including the user's own roster. What is visible is decided by the franchise perception system, not by the UI.
3. **Honest uncertainty.** No fake precision anywhere: ranges, confidence, qualitative verdicts. At very high confidence a band may be narrow enough to *feel* exact — the system still never claims certainty it lacks.
4. **Low floor, high ceiling.** The lite path and the deep path are both first-class. Nothing is buried that a deep player needs; nothing is mandatory that a lite player would resent.
5. **Match presentation is a renderer over the event stream** (Spec #1 §6.1). It cannot ask the engine for anything the stream doesn't already carry.

## 2. INFORMATION ARCHITECTURE

**The hub** is a desk-and-calendar view, not a dashboard of metrics: today's date, what's next, what's waiting on you, and the advance control. The design notes' framing — "one major indicator: do you want to move forward?" — is taken literally.

**The advance control is the primary interaction** (Spec #5 §13). It occupies the position of importance, shows what it's advancing toward, and returns either an interrupt (a beat, presented as a scene or conversation) or a digest of what staff handled. This is the loop the player performs thousands of times; it gets the most design care in the product.

**Windows** (from the design notes, grouped):

| Group | Windows |
|---|---|
| This week | opponent research, circumstances (weather, stadium, field, crowd, travel, rest), practice, gameplan |
| Squad | roster, depth chart, development, player pages, health, contracts |
| Organization | staff, scouting, facilities, budget, press |
| League | standings, schedule, league news, media rankings, awards (weekly/yearly), transactions |
| Story | storyline tracker (Spec #7 §12), commitments, franchise history |
| Data | aggregated past performance, splits, self-scout |

Windows are reachable directly (search/keyboard) and contextually (from the beat that mentions them). No forced carousel — but a **carousel of "what's live right now"** on the hub surfaces the handful of things currently demanding attention.

## 3. THE INVOLVEMENT TOGGLES ("layer 1")

The single most important UX surface after the advance control (Spec #11 §11.1). A short list of plainly-worded switches — prep, practice, play-calling, in-game decisions, roster moves, scouting, contracts, media, player conversations — each set to *you*, *staff*, or *ask me when it matters*.

**Granularity requirement (from Spec #13):** toggles must be fine-grained enough for the tutorial to unlock them one at a time in narrative sequence. Three coarse presets would break the training campaign. Presets exist *on top of* the fine-grained set, not instead of it.

## 4. MATCH PRESENTATION

Framed as the design notes describe it: **you're on the sideline with a clipboard.** Three entry points, all first-class — play it, spot-manage decision moments only, or simulate from the schedule.

- **Play log:** the event stream rendered as readable football language, one play at a time, at a pace the player controls. This is the primary presentation, and it must read like football, not like a debug trace.
- **Static play diagrams:** X's-and-O's of the called play, with the result annotated. (Stretch, only if cheap: dot-markers stepping through the event stream.)
- **Decision moments:** 4th down, timeouts, challenges, halftime adjustments — surfaced with the information a coach would actually have, including staff recommendations whose quality reflects staff attributes.
- **Post-game:** what your week's prep did, what the opponent adjusted, what your staff observed — the feedback loop that teaches a lite player why the week matters.
- **Debug view (dev builds):** the full mechanics printout from the match design doc §17, rendered from the same stream. Toggleable, developer-facing, never shipped as a player feature.

## 5. THE SCENE SYSTEM

Rooms the player visits: scouting room, practice facility, staff offices, press room, stadium, draft room, owner's box. Data-driven per Charter D7:

```
sceneId → { backdrop asset, character slots (who is actually present, from franchise state), hotspots }
```

Characters appearing are the real entities — your actual scouting director, the actual coordinators — so a scene is a *view of state*, not decoration. Beats and conversations play inside the relevant scene. Art is swappable without code changes via the manifest (Spec #9).

## 6. DISPLAY OF UNCERTAIN INFORMATION

The hardest UI problem in this game, because the pillar depends on it.

- **Attributes:** band + confidence, rendered as a range with a visual weight that communicates certainty. Never a single number for a non-user-controlled player.
- **Comparisons:** the ordinal verdict mechanic (Spec #6 §6) as a first-class UI action — "our staff believes A > B at route running, moderate confidence."
- **Scouting reports:** qualitative prose signed by the scout who wrote it, with their track record visible.
- **Player needs:** qualitative staff language, no meters (Spec #14 decision 1).
- **Fashion:** never a number — evidence sets and in-world voices only (Spec #12 §9).
- **Provenance everywhere:** any belief shown can be traced to who believes it and why.

## 7. DESIGN DIRECTION (brief for the implementer)

**Two registers, per Spec #9 §3.** Register A (working world — tactile, institutional, muted) governs the hub, calendar, staff, scouting, contracts, and all conversations. Register B (broadcast world — near-black, high-contrast, saturated) governs gameday, the play log, standings, news, media rankings, and awards. **If the public can see it, it's B; if only the organization can, it's A.** Never mix registers within one screen. The two share a skeleton (identical type scale, spacing, grid), a portrait treatment, and a derived palette (Spec #9 §3.2).

- **Type:** a characterful display face used with restraint for headers and moments; a highly legible workhorse for dense tables; a monospace/utility face for data, clock, and diagrams. Football's own vernacular — stencil and block-condensed lettering — is available but must be used as seasoning, not theme.
- **Structure encodes meaning:** the week is a real sequence, so sequential devices are legitimate here (unlike most designs); confidence is a real gradient, so visual weight should encode it consistently everywhere.
- **Signature element:** the advance control and its interrupt moment. It's pressed thousands of times and carries the game's suspense — it deserves the boldness budget, and everything else stays quiet.
- **Motion:** restrained, with the budget spent on three moments: the clock advancing, an interrupt arriving, and **the register transition** — cutting to broadcast on gameday entry, settling back into the building afterward.
- **Copy:** plain, active, football-native. Buttons say what happens. Errors say what went wrong and how to fix it. Empty states invite action.

## 8. QUALITY FLOOR

Runs in a local browser tab (v1); responsive down to smaller windows; visible keyboard focus and full keyboard navigation for the power path; reduced motion respected; readable at length (this is a text-heavy game played for hours); no reliance on color alone to convey confidence or status.

## 9. OPEN QUESTIONS FOR OWNER

1. **Density preference:** dense single-screen management (more visible, steeper) or roomier progressive disclosure (calmer, more clicks)? Lean: dense-but-quiet for data windows, roomy for story beats and scenes — the two modes serve different states of mind.
2. **Scene coverage in v1:** a handful of key rooms (scouting, press, practice) with other contexts as plain screens, or full scene coverage before ship? Lean: handful first — scenes are the expensive part, and the system is designed to add them incrementally.
3. **Debug view access:** developer-only build flag, or a hidden power-user toggle in shipped builds (some players would love it, and it's already built)? Lean: hidden toggle — it costs nothing and the audience for this game skews toward wanting it.
