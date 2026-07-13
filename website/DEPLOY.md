# Deploying the Newroz docs site to Vercel

The site is a standard Docusaurus 3 build. It now uses `baseUrl: '/'`, so it
serves from a domain **root** (e.g. `https://newroz.dev/`) rather than a
`/docs/` sub-path.

## One-time Vercel setup

1. Vercel → **New Project** → import `newroz-agent/newroz-agent`.
2. **Root Directory:** `.` — the repo root, **not** `website/`.
3. Everything else comes from **`vercel.json` at the repo root**. Leave the UI
   fields alone.
4. Deploy, then add your custom domain under **Project → Settings → Domains**.

### Why the Root Directory is the repo root, and why that matters

> **Do not "fix" this by setting Root Directory to `website/`.** That was the
> original setting, and it is what broke the site.

Two hard constraints:

- **Vercel reads `vercel.json` from the Root Directory and nowhere else.** With
  the root set to `website/`, a `website/vercel.json` works — but with the root
  at `.`, it is silently ignored. That file used to exist here and did nothing
  at all; it has been deleted, and the real config now lives at the repo root.
- **`scripts/prebuild.mjs` copies `scripts/install.{sh,ps1}` from the repo root**
  into the site so the documented one-liner
  (`curl -fsSL <site>/install.sh | bash`) resolves. Those files live *outside*
  `website/`, so a `website/`-rooted build cannot reach them.

Because the repo root's `package.json` is an npm-workspaces manifest with no
`build` script (and a bare `npm install` there would drag in the web/tui/desktop
workspaces the docs site does not need), the root `vercel.json` scopes both
commands with `--prefix website`. `npm run build` still fires the `prebuild`
lifecycle hook, which is what performs the installer copy.

### Deploys are automatic

The Vercel project is connected to this GitHub repo (`vercel git connect`), so
**every push to `main` builds and deploys by itself**.

There is no longer a `VERCEL_DEPLOY_HOOK` secret or a CI job that pokes Vercel.
That is deliberate: the hook secret was never actually set, so the workflow step
expanded to `curl -X POST ""` and failed on every run — and the live site sat
five days stale, serving pre-rebrand content and 404ing on `/install.sh`, with
nothing but a red X in Actions to say so.

To deploy by hand: `npx vercel --prod` from the repo root.

### Build note

`npm run build` runs `scripts/prebuild.mjs`, which shells out to `python3`
(+ `pyyaml`) to populate the Skills Hub and `llms.txt`. Vercel's build image
has `python3`; if the deps are missing the prebuild degrades gracefully
(empty Skills Hub) rather than failing the build. The build currently emits
broken-link **warnings** for pre-existing zh-Hans translation drift only —
`onBrokenLinks` is intentionally `warn`, so these do not fail the deploy.

## Serving `install.sh` / `install.ps1`

The documented install one-liner is:

```sh
curl -fsSL https://newroz-agent.vercel.app/install.sh | bash
```

For that to work the site must serve the installers from its **root**.
`website/scripts/prebuild.mjs` copies `scripts/install.sh` and
`scripts/install.ps1` into `website/static/` on every `npm run build` and
`npm run start`, so they end up at `build/install.sh` and `build/install.ps1`.

`scripts/` is the single source of truth. The copies in `static/` are
generated and **gitignored** — do not commit them, and do not edit them: a
second copy of a 3000-line installer drifts silently the moment someone
patches only one of them. The prebuild step fails the build outright if the
source scripts are missing, because shipping a site whose documented install
command 404s is worse than a failed deploy.

## Setting the final domain — checklist

Current deploy target is `https://newroz-agent.vercel.app`. Once you point a
custom domain at the project, update every place the URL is duplicated.
Docusaurus derives the absolute `og:image` / `twitter:image` URLs from the
site `url`, so **fixing `url` automatically fixes the social-preview image
URLs** — there is no separate og:image string to edit.

### A. The docs site's own domain (what Vercel serves) — REQUIRED

- `website/docusaurus.config.ts` → `url: 'https://newroz-agent.vercel.app'`
  Set this to the exact domain (scheme + host, no trailing slash).
  This one field drives canonical URLs, sitemap, and og/twitter image URLs.

### B. Cross-references to the docs domain — update if the docs move host

Inside `website/`:
- `website/scripts/prebuild.mjs` → `UNIFIED_INDEX_URL`
  (`https://newroz-agent.vercel.app/api/skills-index.json`) — the live
  skills-index it pulls at build time.
- `website/scripts/generate-llms-txt.py` → `SITE_BASE` and the canonical /
  llms.txt / llms-full.txt URLs it writes into the generated files
  (lines ~12–13, 34, 251–252).
- `website/static/api/model-catalog.json` → `docs` URL.

### C. The install one-liner — now served from the docs site

The installer URLs were swept from the old `newroz-agent.github.io` host to
`https://newroz-agent.vercel.app/install.{sh,ps1}`, so the install host and
the docs site are now the **same** property. When the custom domain lands,
sweep them together:

```sh
# Preview, then replace:
grep -rn "newroz-agent.vercel.app/install\." \
  --exclude-dir={node_modules,.git,.venv,build} .
```

These live in: the 4 `README.*.md` files, `CONTRIBUTING.md`,
`website/docs/**`, `website/i18n/**`, `scripts/install.{sh,ps1,cmd}`
(their own header comments), `newroz_cli/main.py`, `newroz_cli/uninstall.py`,
and `skills/autonomous-ai-agents/newroz-agent/SKILL.md`.

The navbar **Download** / **Home** items and the footer **Desktop Download**
item in `website/docusaurus.config.ts` still point at
`https://newroz-agent.github.io/` — that is the marketing/download property
and is a separate decision.

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
