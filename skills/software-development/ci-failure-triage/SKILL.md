---
name: ci-failure-triage
description: "Use when a CI workflow run fails or flakes: classify flaky vs deterministic first, find the first real error in the logs, then fix the root cause or harden the pipeline — never blind-rerun."
version: 1.0.0
author: Newroz Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  newroz:
    tags: [ci, github-actions, flaky-tests, triage, debugging, pipelines]
    related_skills: [systematic-debugging, resilient-http-calls, test-driven-development]
---

# CI Failure Triage

## Overview

A red CI run is evidence, not an instruction to click "re-run". Re-running
without a diagnosis destroys the evidence and, for flaky failures, guarantees
the failure comes back on a schedule. Triage classifies the failure first;
the classification decides everything that follows.

**Core principle:** classify before you touch anything — *deterministic*
(fails every time on this commit) or *flaky* (same commit, mixed outcomes).
The two classes have opposite fixes and opposite re-run rules.

## When to Use

- A GitHub Actions (or any CI) run failed and you're asked to fix it
- A scheduled workflow alternates success/failure with no code change
- A PR check is red and you need to decide: fix, rerun, or escalate
- Don't use for: designing new pipelines from scratch (that's ordinary
  implementation work), or local-only test failures (use
  systematic-debugging directly).

## Phase 1 — Read the Logs, Find the FIRST Real Error

1. Pull the failed job's log, not the summary. CLI: `gh run list
   --workflow=<file>.yml --limit 10` then `gh run view <run-id> --log-failed`.
   Done when: you are looking at raw step output, not the annotation banner.
2. Scan from the top of the failing step for the first error, warning, or
   suspicious count — not the last line. Exit-code lines
   (`Process completed with exit code N`) are the echo, never the cause.
   Done when: you can quote the one line where behavior first diverged from
   a healthy run.
3. Note every number the log reports (item counts, durations, retry
   mentions). Anomalous counts ("crawled 3,753 of expected 50,000") localize
   the fault better than stack traces. Done when: each reported count is
   marked expected / unexpected.

## Phase 2 — Classify: Deterministic or Flaky

Run history is the classifier — check it before reading any code:

```
gh run list --workflow=<file>.yml --limit 20 \
  --json databaseId,conclusion,headSha,createdAt
```

| Pattern in history | Class | Meaning |
|---|---|---|
| Same commit: mixed success/failure | **Flaky** | Nondeterminism — network, external API, timing, shared state |
| Fails every run since commit X | **Deterministic** | Commit X (or a dependency bump it pulled) broke it |
| Fails only on schedule, passes on push | **Environment-shaped** | Cron path differs: auth, cache state, data volume |
| All workflows red at once | **Infrastructure** | Runner/provider outage — verify on the provider status page |

Done when: you've named the class and can cite the runs that prove it.

## Phase 3 — Fix by Class

### Deterministic
Reproduce locally with the exact CI command (in this repo:
`scripts/run_tests.sh <file>` — it matches CI's env), then apply
systematic-debugging. The CI part of the work is done only when the same
command passes locally for the same reason CI will pass.

### Flaky
A blind re-run is not a fix — the failure returns on schedule. Find the
nondeterminism and remove it:

1. Locate the unprotected external interaction: an HTTP call without
   retries, a paginated walk that silently stops on one failed page, a
   race on shared state, a time/timezone assumption.
2. Harden it at the source — bounded retries with backoff for transient
   errors only, and never persist or cache a partial result (see
   resilient-http-calls for the full discipline).
3. Keep any health check that caught the flake. The check did its job;
   fix the flakiness, don't lower the floor to silence it.

Done when: the hardening is committed with a test that simulates the
transient failure, and only then is a re-run meaningful.

### Environment-shaped
Diff the two paths (triggering event, secrets/permissions available, cache
warmth, data volume at that hour) until you find the variable that differs;
then make the failing path explicit in the workflow rather than relying on
the accident that the other path works.

## Pipeline Hardening Checklist

Apply while you're in the workflow file — each prevents a whole class of
future 3 a.m. failures:

- `timeout-minutes` on every job: a hang should fail fast, not burn the
  6-hour default.
- Health floors on generated artifacts (counts, sizes) that fail the build
  *before* the artifact is uploaded or deployed.
- Never let a step swallow exit codes (`|| echo non-fatal`) on a path that
  later publishes the step's output.
- Pin action versions by SHA; pin tool versions in install steps.
- Alerting on scheduled workflows: a watchdog (freshness probe, issue
  opener) so a silently stuck cron is noticed within hours, not weeks.

## Common Pitfalls

1. **Re-running before classifying.** A green re-run of a flaky job proves
   nothing and erases the failing evidence. Classify first.
2. **Reading only the last log lines.** The first divergence is upstream;
   the tail is usually cleanup noise.
3. **Fixing the assertion instead of the cause.** Lowering a health floor
   or deleting a failing check converts a loud failure into a silent
   regression.
4. **Treating an intermittent count-shortfall as an API change.** Same
   commit, mixed outcomes = transient truncation, not a contract change.
5. **Reproducing with a different command than CI runs.** Match the exact
   entrypoint, env, and versions, or the local green is meaningless.
6. **Declaring victory on one green run.** For a fixed flake, state the
   expected pass rate and watch the next several scheduled runs.

## Verification Checklist

- [ ] First real error line identified and quoted
- [ ] Failure classified (deterministic / flaky / environment / infra) with run-history evidence
- [ ] Root cause named — not just the failing step
- [ ] Fix targets the cause; no health check weakened to pass
- [ ] Flaky fixes include a test simulating the transient failure
- [ ] Local repro used the exact CI command
- [ ] Subsequent scheduled/pushed runs monitored, not just one re-run
