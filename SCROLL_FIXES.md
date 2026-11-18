# Scroll and animation fixes

The original hero controller could enlarge its runway during playback, keep stale frames when reversing, and write scroll positions while the browser was already scrolling. Global smooth-scroll CSS also animated position-restoration calls. These interactions caused jumps, delays, and inconsistent section navigation.

## Changes

- Replaced the hero state machine with a fixed-length native scroll sequence. A single animation-frame scheduler interpolates the artwork without overriding wheel, touch, or keyboard input. Forward and reverse motion derive from the same scroll position.
- Removed the hero canvas's 3× CSS zoom. Canvas resolution is bounded, and geometry is measured on resize rather than on every draw.
- Reserved the hero runway and case-study copy space before JavaScript initializes. Fonts preload and logo containers reserve their height.
- Limited smooth scrolling to explicit section navigation. Reload restoration uses immediate positioning and yields to pointer, wheel, touch, and keyboard input.
- Fixed the header logo's CreateJS listener removal; it had retained its ticker callback after the trace finished.
- Reused a raster alpha mask for the map's thousands of dots. Map rendering stops after selection tweens settle and while the stage is offscreen or the tab is hidden.
- Preserved manual partner selection when leaving and returning to the map. Direct map loads and reloads show its settled state without replaying the entrance sequence.
- Prepared map layout before loading the canvas runtime, and shared one initialization promise between viewport and idle loading.
- Stopped the footer loop offscreen and reused its canvas dimensions instead of reallocating the canvas every frame.
- Fixed active-section tracking after hash navigation and the mobile About boundary that hid the pager arrows. Footer links use the same navigation controller.
- Prevented modal focus changes from moving the page. Reserved scrollbar space and corrected the mobile header width.
- Updated asset versions so the published page fetches the new scripts.

## Verification

Static validation: `python scripts/check.py` passed for 139 files, including complete local asset references, JavaScript syntax, and hosting size limits.

REA controlled browser scenarios exercised these behaviors:

| Scenario | Viewport | Result |
| --- | --- | --- |
| Full page down, footer, and Home | 1440 × 900 | No reversed scroll frames, no hero height changes, zero programmatic scroll calls during manual navigation, no horizontal overflow; videos and offscreen canvases stopped |
| Forward and reverse hero | 390 × 844 | Returned to progress zero with the opening video visible and closing video paused; no hero height changes |
| All seven partner selections | 1440 × 900 | Every selection matched its partner, then rendering paused when settled |
| Gallery, carousel, project dialog, Escape | Desktop and phone | Controls operated; dialogs opened and closed |
| Mobile Map → Cases → About → Cases | 390 × 844 | Pager remained visible and active section updated correctly |
| Narrow phone final reveal | 320 × 568 | Heading and metrics fit; no horizontal overflow |
| Reduced-motion tablet | 1024 × 768 | Static hero, paused hero videos, functioning partner selection |
| Direct map load and reload | 1440 × 900 | Same scroll position before and after reload: 5478 px; map top 89 px, active Map navigation |

Final scenarios recorded no page errors or console errors in their observation windows. A full-page automated traversal still recorded three frames above 50 ms, with an 83 ms maximum; this is bounded browser verification, not a guarantee of frame rate on every device or browser.

The final release smoke test, after asset version updates, passed with zero reversed frames, zero programmatic scroll calls, zero hero height changes, zero layout shift, and no frames above 50 ms during the forward/reverse hero traversal. Its Evidence is `ev_9c225888a327b86bf8dc75911af99089307ac8fa3b0e3ae2bb6169565660d640`. The complete retained test bundle was exported locally to `evidence/scroll-final-evidence.json`.

## Evidence

- Original scroll baseline: `ev_9fca3c6946cca0be2cb83034f8e3739e47d3f0e0459ebed6c82112f40f52ae69`.
- Full-page traversal: `ev_8d0979f1ac134337573615af496e30d1cae15681dbe2dd6faf2ff30bd9a81d3a`.
- Mobile forward/reverse: `ev_3597445afa31b1deb43c3195d3ddaa5b77eae4e9b24efd6e3d4500d60330caa3`.
- Desktop galleries and dialogs: `ev_1fcb97aa45b57a1544803134702a8120477c96082c8a780a6f5dad735e11fa57`.
- Mobile pager and dialog: `ev_11793530068ae07c52fdb92069466271ead292c0800b27a050adc2b70780a454`.
- All seven selections and settled rendering: `ev_c6d4042f0fc2b93974cfd80002d6ccff5a15b6cf4cf5ab729bb8afcb4d50b65f`.
- Narrow phone: `ev_08c67648ae36d14d46db59fb4f56b9a5fecedcd668ddf221eb1bddb796d5b0f4`.
- Reduced-motion tablet: `ev_46551ef6ee74584d292f72b285f42bba670c9e621210c48d26fbd857ba761e57`.
- Stable direct map and reload: `ev_ba9eed7cda148e2a21cb2f07948420f201b029e74177c163e4b833a74451634f`.
