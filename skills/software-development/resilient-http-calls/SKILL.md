---
name: resilient-http-calls
description: "Use when writing or reviewing code that calls external HTTP APIs — crawlers, pagination walks, index builders, webhooks: retry policy for transient errors, timeout budgets, and the partial-result / cache-poisoning discipline."
version: 1.0.0
author: Newroz Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  newroz:
    tags: [http, retries, backoff, pagination, caching, reliability, api]
    related_skills: [ci-failure-triage, systematic-debugging, test-driven-development]
---

# Resilient HTTP Calls

## Overview

Every external HTTP call fails sometimes. Code that treats one transient
failure as the end of the work ships truncated results that look complete —
the worst failure mode, because nothing crashes. This skill encodes the
discipline for calls that must survive flaky networks: classify errors,
retry the transient ones in place, and never let a partial result
masquerade as a complete one.

**Core principle:** an error mid-stream must be *visible* in the result's
metadata, not absorbed into a shorter list.

## When to Use

- Writing a crawler, catalog walker, or paginated API consumer
- Writing anything whose output is cached, published, or deployed
- Reviewing code with `httpx.get` / `fetch` / `requests` in a loop
- Diagnosing "the count is sometimes low" bugs
- Don't use for: UI-interactive single requests where the user sees the
  error immediately and simply retries.

## Error Classification

Retry decisions come from the error class, never from a blanket catch:

| Signal | Class | Action |
|---|---|---|
| Timeout, connection reset/refused, DNS | Transient | Retry with backoff |
| 429 Too Many Requests | Transient | Retry; honor `Retry-After` if present |
| 500, 502, 503, 504 | Transient | Retry with backoff |
| 400, 401, 403, 404, 422 | Permanent | Fail now — retrying a 404 four times is four wasted requests |
| 200 with malformed/unparseable body | Transient (usually a proxy/CDN hiccup) | Retry once or twice |

Keep the retryable set explicit in code, e.g.
`RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}` — a named constant a
reviewer can see and a test can reference.

## The Retry Loop

The canonical shape (mirrors `ClawHubSource._fetch_catalog_page` in
`tools/skills_hub.py`):

```python
for attempt in range(1 + MAX_RETRIES):
    try:
        resp = httpx.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        retryable = resp.status_code in RETRYABLE_STATUS_CODES
    except (httpx.HTTPError, json.JSONDecodeError):
        retryable = True
    if not retryable or attempt == MAX_RETRIES:
        return None                      # exhausted or permanent
    delay = BASE_BACKOFF * (2 ** attempt)
    if deadline is not None and time.monotonic() + delay > deadline:
        return None                      # don't sleep past the caller's budget
    time.sleep(delay)
```

Non-negotiables in that shape:

- **Bounded attempts.** 3-4 retries; unbounded retry is a hang.
- **Exponential backoff.** Fixed 0-delay retry hammers a struggling server
  and usually collects the same error 4 times in 40 ms.
- **Per-request timeout always.** A missing timeout turns one dead server
  into a hung worker.
- **Deadline awareness.** If the caller has a wall-clock budget, a backoff
  sleep must not blow through it — check before sleeping.
- **Retries live per-page/per-request**, inside the loop step — not around
  the whole multi-request operation (which would redo completed work).

## Pagination Walks: the Silent-Truncation Trap

A cursor/offset walk has *two* ways to end, and they must not be conflated:

1. **Natural end** — the API says there are no more pages.
2. **Error end** — a page fetch failed (even after retries).

The bug class: `except: break` inside the walk loop makes both look like a
natural end. The walk returns 3,700 of 50,000 items, nothing raises, and
the truncated result flows downstream. This exact bug made a twice-daily
index build flake for weeks.

Required discipline for every walk:

- Track the ending separately: `hit_error` / `hit_deadline` /
  `hit_max_items` flags alongside natural exhaustion.
- **Expose incompleteness to the caller** (e.g. a `last_walk_incomplete`
  attribute or a `(results, complete)` return). A bare shorter list is not
  an error signal.
- Partial results may still be *returned* — callers can often use them —
  but must never be *recorded as complete* (see next section).

## Cache & Persistence Discipline

**Never cache, publish, or deploy a partial result under the key that means
"the complete thing".** A poisoned cache converts one transient network
blip into wrong answers for every consumer until the cache expires.

- Write the cache only on a natural end: not on error, not on deadline,
  not on an early `max_items` stop.
- Same rule one level up: an index/artifact builder must not write its
  output file when a health check fails — a deploy step that tolerates a
  nonzero exit (`|| echo non-fatal`) will happily ship the file that's
  already on disk.

## Consumer-Side Health Floors

Producers retry; consumers verify. Any pipeline that ingests a crawled
result should assert a floor based on known history ("this source has
≥20k entries; fail below that") and refuse to proceed under it. On
failure, the message should distinguish "walk reported incomplete —
transient, re-run" from "walk completed but small — the API surface
changed", using the incompleteness signal exposed above.

## Testing the Failure Paths

The happy path tests itself; write the transient tests deliberately, with
`time.sleep` mocked so backoff costs nothing:

- Page N fails once (503, then a timeout), then succeeds → full result,
  cache written, incompleteness flag false.
- Page N fails past the retry budget → partial result returned, cache NOT
  written, incompleteness flag true.
- Permanent status (404) mid-walk → no retries, no backoff sleeps.

`tests/tools/test_skills_hub_clawhub.py::TestClawHubCatalogWalkRetries` is
the in-repo reference for all three.

## Common Pitfalls

1. **Retrying permanent errors.** A 404/401 retried with backoff wastes
   ~15 s per call and masks a real configuration bug.
2. **`except Exception: break` in a walk loop.** The signature move of
   silent truncation. Ending on an error must set a flag.
3. **Caching whatever came back.** "Cache on return" instead of "cache on
   natural end" is how one blip poisons every consumer.
4. **Retrying the whole operation instead of the failed step.** Redoes
   completed requests, multiplies load, and usually re-fails.
5. **Backoff without a deadline check.** In budgeted contexts, sleeping
   past the deadline trades one failure mode for another.
6. **Health floors quieted instead of investigated.** If a floor fires
   intermittently, the producer is truncating — fix the walk, don't lower
   the floor.
7. **Testing only the happy path.** Untested retry code is usually wrong
   in the direction of retrying too much or flagging too little.

## Verification Checklist

- [ ] Retryable status set is an explicit named constant
- [ ] Retries bounded, exponential backoff, per-request timeout present
- [ ] Backoff respects any caller deadline
- [ ] Walk loops distinguish natural end from error end
- [ ] Incompleteness is exposed to callers, not inferred from length
- [ ] Cache/output written only on complete, healthy results
- [ ] Consumer asserts a history-based floor before shipping
- [ ] Tests cover: transient-then-success, retries-exhausted, permanent error
