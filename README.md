# Citadel — Next.js

The complete existing website migrated to **Next.js 16.4.6 App Router and React 19.3.1**. The original section markup, styles, fonts, images, videos, map, carousels, dialogs, and scroll controllers are preserved.

## Run

Requires Node.js 20.9 or newer. Node.js 24 was used for verification.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Production

```sh
npm run build
npm run check
npm start
```

The build creates a complete static export in `out/`. `npm start` serves that export on port 3000. `npm run preview` uses port 4174. The site also runs on Vercel or any host that supports Next.js static exports.

## Project structure

| Location | Purpose |
| --- | --- |
| `app/layout.jsx` | Original document language, body classes, head resources, and client runtime entry |
| `app/page.jsx` | Home page assembled from React section components |
| `components/site/Sections.jsx` | Header, hero, About, network, case studies, partner map, principals, directory, and footer components |
| `components/site/SiteRuntime.jsx` | Starts the existing interactive controllers after React hydration |
| `lib/site-markup.js` | Converts the preserved source fragments to server-rendered React elements without adding layout wrappers |
| `content/*.html` | Original editable HTML fragments, including SVGs and inline map data |
| `public/wp-content/` | All original assets at their existing URLs |
| `content/assets-manifest.json` | SHA-256 checks for the 138 preserved assets |
| `next.config.mjs` | Static-export configuration |

Edit section content in the matching `content/` fragment. Styles and interactive controllers are under `public/wp-content/themes/citadel-construction-group/assets/`.

The React renderer normalizes browser line endings, omits invisible whitespace in the document head, and omits empty image sources in hidden modal placeholders. These adjustments allow clean hydration while preserving the rendered design. The original CSS cascade and media rendering are retained.

## Verification

- `npm run build`: production compilation and static generation.
- `npm run check`: byte checks for preserved assets and markup, JavaScript syntax, and exported resource availability.
- `scripts/compare-visuals.py`: REA browser captures and strict, per-pixel comparison of sixteen desktop/mobile states against the preserved original.
- `scripts/scroll-qa.js`: development-only scroll telemetry through `/?qa=scroll` on the static preview server.

Comparison artifacts and the untouched pre-migration snapshot are stored locally under `evidence/`, which is excluded from Git and deployment. See `NEXT_MIGRATION.md` for the visual and interaction verification results and their limits.

The original importer, `scripts/mirror.py`, is archival and is not part of the Next.js build. The one-time extraction script is also not required to run or build the project.

The preservation manifests record the migration baseline. Update them deliberately when making later content or design changes.
