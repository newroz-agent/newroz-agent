# Langfuse Observability Plugin

This plugin ships bundled with Newroz but is **opt-in** — it only loads when
you explicitly enable it.

## Enable

Pick one:

```bash
# Interactive: walks you through credentials + SDK install + enable
newroz tools  # → Langfuse Observability

# Manual
pip install langfuse
newroz plugins enable observability/langfuse
```

## Required credentials

Set these in `~/.newroz/.env` (or via `newroz tools`):

```bash
NEWROZ_LANGFUSE_PUBLIC_KEY=pk-lf-...
NEWROZ_LANGFUSE_SECRET_KEY=sk-lf-...
NEWROZ_LANGFUSE_BASE_URL=https://cloud.langfuse.com   # or your self-hosted URL
```

Without the SDK or credentials the hooks no-op silently — the plugin fails
open.

## Verify

```bash
newroz plugins list                 # observability/langfuse should show "enabled"
newroz chat -q "hello"              # then check Langfuse for a "Newroz turn" trace
```

## Optional tuning

```bash
NEWROZ_LANGFUSE_ENV=production       # environment tag
NEWROZ_LANGFUSE_RELEASE=v1.0.0       # release tag
NEWROZ_LANGFUSE_SAMPLE_RATE=0.5      # sample 50% of traces
NEWROZ_LANGFUSE_MAX_CHARS=12000      # max chars per field (default: 12000)
NEWROZ_LANGFUSE_DEBUG=true           # verbose plugin logging
```

## Disable

```bash
newroz plugins disable observability/langfuse
```
