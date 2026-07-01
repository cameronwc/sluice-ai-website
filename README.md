# Sluice — marketing site

A premium, WebGL-powered marketing site for **Sluice**, the self-hostable AI
governance control plane. Built with Vite + TypeScript + Three.js.

## Highlights

- **WebGL "sluice gate" hero** — thousands of GPU-driven data particles flow
  left→right; sensitive tokens (amber→red) are caught and dissolved at a glowing
  filter gate while clean data (teal→emerald) funnels through. Interactive mouse
  parallax, DPR-capped for 60fps, pauses off-screen, and gracefully falls back to
  a CSS gradient when WebGL is unavailable or `prefers-reduced-motion` is set.
- **Scroll-reveal** animations via `IntersectionObserver` (no heavy deps).
- **Live product mockups** — the audit log, policy packs, MCP governance, and
  risk rollups are real HTML/CSS, not screenshots.

## Local development

Requires Node 18+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # type-check + production build → dist/
pnpm preview   # serve the built dist/ locally
```

## Sections

Sticky nav · WebGL hero · three positioning wedges · the problem ·
"one brain, three ways in" architecture diagram · features grid ·
MCP/agent-governance spotlight · product preview (audit / policy / risk) ·
Sluice-vs-incumbents comparison · pricing · compliance strip · final CTA · footer.

## Deploying to GitHub Pages

This repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds on every push to `main` and deploys to GitHub Pages.

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages → Build and deployment** and set
   **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The site publishes at
   `https://<user>.github.io/<repo>/`.

### Base path

Vite's `base` must match the Pages sub-path. It's read from the `BASE_PATH` env
var and defaults to `/sluice-ai-website/`. The workflow sets it automatically to
`/<repo-name>/`. For a user/organization page or a custom domain, build with
`BASE_PATH=/`:

```bash
BASE_PATH=/ pnpm build
```

A `.nojekyll` file is included so GitHub Pages serves the Vite `assets/`
directory verbatim.

## Stack

- [Vite](https://vitejs.dev) 5 · TypeScript 5 (strict)
- [Three.js](https://threejs.org) — custom GLSL shaders for the hero
- Inter (variable) via rsms.me
- Zero runtime UI frameworks; hand-written CSS with the brand system.

## License

MIT.
