# Citadel website recreation

A portable static recreation of https://citadelgroup.org/#map, retaining the reference's typography, imagery, video hero, scroll animation, galleries, case study dialogs, partner map, leadership section, and partner directory.

## Run locally

Requires Node.js. No dependency installation or compilation is needed.

```sh
npm run dev
```

Open http://localhost:4173 or http://localhost:4173/#map.

The complete website is in `dist/`. It can also be served by any standard static web server. `scripts/serve.mjs` supports video range requests.

## Source and provenance

The recreation uses public frontend HTML, CSS, JavaScript, and media from the user-selected reference. These retain the original Citadel branding and content. WordPress metadata, analytics, challenge scripts, and the original agency footer link were removed. Internal asset references are served locally; partner and project links retain their original external destinations.

`scripts/mirror.py` documents the asset localization process. `evidence/asset-manifest.json` records reference asset URLs and hashes; `evidence/inspection.md` records the REA observations and validation results.

This is a static frontend recreation. WordPress editing and backend services are outside its scope.
