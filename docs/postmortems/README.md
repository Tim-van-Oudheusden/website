# Postmortems

A record of what actually happened during a production incident on this site — an outage, a bad deploy, a rollback
that fired (automatic or manual) — written up after the fact. Distinct from
[`docs/reflections/`](../reflections/README.md), which is cross-session knowledge for **agent work** (a tooling
surprise, an environment quirk); a postmortem is about what happened to the **running site**.

There is no alerting backend here (see [`docs/deploy.md`](../deploy.md) and
[`docs/metrics/README.md`](../metrics/README.md)): no incident is paged, so writing one up is always a deliberate,
after-the-fact choice, not a process triggered automatically.

## When to write one

- `website-update.sh`'s automatic rollback fired (`docs/deploy.md` §4) — even though it self-healed, something made
  a published image fail its own health check, which is worth a root cause.
- A manual rollback was needed (the bad image survived past the next update cycle, or you rolled back further than
  one release).
- Any other user-visible downtime or data issue (e.g. the view-count SQLite file, the Cloudflare Tunnel, the pod
  itself), whether or not a rollback was involved.

Writing one is optional for a near-miss that self-healed with no visible impact — use judgement; the bar is "would
the next person investigating a similar symptom want this."

## Blameless

This is a single-maintainer personal site, so "blameless" mostly means: write down what the system did and why,
not who pushed the bad commit. The point is a better root cause and a follow-up, not an audit trail.

## Format

Copy [`TEMPLATE.md`](TEMPLATE.md) to `YYYY-MM-DD-short-slug.md` and fill it in. Evidence over recollection: quote the
actual `journalctl` lines, `/health` and `/metrics` output, or Cloudflare analytics screenshots/numbers you had at
the time, rather than reconstructing them from memory afterward.

If a postmortem's lesson becomes a standing rule, encode it where it will actually be read again (`AGENTS.md`,
`docs/deploy.md`, a test) and link that from the postmortem's **Follow-up** section.

## Index

- No postmortems yet.
