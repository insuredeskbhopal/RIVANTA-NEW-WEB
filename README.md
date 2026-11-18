# Citadel — Next.js

Requires Node.js 20.9 or newer.

Run `npm ci`, then `npm run dev`. Open http://localhost:3000.

For production, run `npm run build`, then `npm start`.
The static export is generated in `out/`. `npm start` serves it on port 3000; `npm run preview` uses port 4174.

Source folders:

- `app/`: Next.js layout and page.
- `components/site/`: section components and client runtime.
- `content/`: required page markup and document attributes.
- `lib/`: server-side markup renderer.
- `public/`: styles, JavaScript, fonts, images, and videos.
- `scripts/serve.mjs`: production export preview server.

Edit text in the matching `content/` fragment. Styles and interactive controllers are under `public/wp-content/themes/citadel-construction-group/assets/`.

Scrolling uses GSAP ScrollSmoother and ScrollTrigger in `components/site/SiteRuntime.jsx`. Desktop smoothing is 0.8 seconds; touch smoothing is 0.12 seconds. Reduced-motion preferences disable smoothing. The header and case-study dialogs stay outside the transformed content, and ScrollTrigger pins the hero over its existing runway.
