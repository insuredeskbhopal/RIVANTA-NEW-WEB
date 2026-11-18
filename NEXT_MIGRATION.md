# Next.js migration verification

The site now uses Next.js App Router and React server-rendered section components. All 138 original assets and 11 source markup fragments remain byte-identical. The original browser controllers initialize after React hydration.

## Checks

- Production Next.js build and static export completed.
- Asset hashes, original fragments, JavaScript syntax, and exported resource references passed.
- Real video playback, native scrolling, hero reversal, footer and Home passed.
- All seven map partners, photo gallery, case-study carousel, dialogs, Escape, and mobile section paging passed.
- No page errors or console errors were recorded in the final functional scenarios.

## Visual comparison

Sixteen desktop and phone views cover every main page section. Captures use the same Chrome version, dimensions, deterministic partner ordering, frozen video/CSS clocks, and settled carousel geometry. Real video and scroll behavior were checked separately.

| View | Pixels differing | Maximum channel difference |
| --- | ---: | ---: |
| desktop-hero | 0 | 0 / 255 |
| desktop-about | 4 | 1 / 255 |
| desktop-cases | 1 | 1 / 255 |
| desktop-map | 0 | 0 / 255 |
| desktop-principals | 0 | 0 / 255 |
| desktop-directory | 3 | 1 / 255 |
| desktop-footer | 14 | 1 / 255 |
| phone-hero | 0 | 0 / 255 |
| phone-map | 0 | 0 / 255 |
| phone-cases | 19 | 1 / 255 |
| desktop-network | 3 | 1 / 255 |
| phone-about | 0 | 0 / 255 |
| phone-network | 0 | 0 / 255 |
| phone-principals | 0 | 0 / 255 |
| phone-directory | 0 | 0 / 255 |
| phone-footer | 0 | 0 / 255 |

Across 13,001,280 compared pixels, 44 differed, each by only one RGB channel step (1/255). Ten views were strictly pixel-identical. No visible layout or geometry change was found.

**Literal zero-pixel identity was not established.** The strict comparison retains these differences instead of suppressing them. Repeat captures of the unchanged original also produced small rasterization and timing differences; browser rendering variance is a plausible explanation. The source assets and CSS were not altered to compensate for screenshot noise.

The machine-readable strict results are in `verification/visual-comparison.json`. Functional REA Evidence IDs are in `verification/interaction-checks.json`. Full captures and image diffs remain in the local, ignored `evidence/next-migration/` directory.

## Rendering adjustments

Only nonvisual HTML integration changes were required: browser-equivalent newline normalization, whitespace removal inside the head, and omission of empty sources on hidden modal image placeholders. There are no added layout wrappers around the original sections.

## Running the project

Use `npm ci` and `npm run dev`. `npm run build` creates `out/`; `npm start` serves the production export. The existing private Site is deployed from that export.
