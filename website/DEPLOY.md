# Deploying the Newroz docs site to Vercel

The site is a standard Docusaurus 3 build. It now uses `baseUrl: '/'`, so it
serves from a domain **root** (e.g. `https://newroz.dev/`) rather than a
`/docs/` sub-path.

## One-time Vercel setup

1. Vercel → **New Project** → import `newroz-agent/newroz-agent`.
2. **Root Directory:** `website`
3. **Framework Preset:** Docusaurus (auto-detected; pinned in `vercel.json`).
4. **Build Command:** `npm run build` (from `vercel.json`)
5. **Output Directory:** `build` (from `vercel.json`)
6. **Install Command:** `npm install` (from `vercel.json`)
7. Deploy, then add your custom domain under **Project → Settings → Domains**.

`vercel.json` (in this directory) already pins the build/output/install
commands and enables `cleanUrls`, so the Vercel UI fields above are just
confirmations.

### Build note

`npm run build` runs `scripts/prebuild.mjs`, which shells out to `python3`
(+ `pyyaml`) to populate the Skills Hub and `llms.txt`. Vercel's build image
has `python3`; if the deps are missing the prebuild degrades gracefully
(empty Skills Hub) rather than failing the build. The build currently emits
broken-link **warnings** for pre-existing zh-Hans translation drift only —
`onBrokenLinks` is intentionally `warn`, so these do not fail the deploy.

## Setting the final domain — checklist

Once you pick the real domain, update every place the URL is duplicated.
Docusaurus derives the absolute `og:image` / `twitter:image` URLs from the
site `url`, so **fixing `url` automatically fixes the social-preview image
URLs** — there is no separate og:image string to edit.

### A. The docs site's own domain (what Vercel serves) — REQUIRED

- `website/docusaurus.config.ts` → `url: 'https://NEWROZ-DOMAIN.example'`
  Set this to the exact Vercel domain (scheme + host, no trailing slash).
  This one field drives canonical URLs, sitemap, and og/twitter image URLs.

### B. Cross-references to the docs domain (still hard-coded to the old
`newroz-agent.github.io/docs`) — update if the docs move off that host

Inside `website/`:
- `website/scripts/prebuild.mjs` → `UNIFIED_INDEX_URL`
  (`https://newroz-agent.github.io/docs/api/skills-index.json`) — the live
  skills-index it pulls at build time.
- `website/scripts/generate-llms-txt.py` → `SITE_BASE` and the canonical /
  llms.txt / llms-full.txt URLs it writes into the generated files
  (lines ~12–13, 34, 251–252).
- `website/static/api/model-catalog.json` → `docs` URL.

### C. The marketing / download site + install host — SEPARATE domain

These point at the download/marketing site and the `install.sh` / `install.ps1`
host, which is a **different** property from the docs site. Only change these
if that property also moves:
- `website/docusaurus.config.ts` navbar **Download** and **Home** items, and
  the footer **Desktop Download** item (`https://newroz-agent.github.io/`).

### D. Repo docs outside `website/` (not touched by this rebrand) — update
when convenient

These live outside `website/` and were left alone per the rebrand scope, but
they hard-code the old docs URL and should be swept when the domain is final:
- `README.md`, `README.es.md`, `README.zh-CN.md`, `README.ur-pk.md`
- `apps/desktop/README.md`
- `scripts/install.sh`, `scripts/install.ps1`

A quick sweep once the domain is chosen:

```sh
# Preview every remaining reference:
grep -rn "newroz-agent.github.io" --include="*.md" --include="*.sh" \
  --include="*.ps1" . | grep -v node_modules
```
