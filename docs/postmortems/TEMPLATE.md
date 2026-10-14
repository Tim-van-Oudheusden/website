<!--
Copy this file to docs/postmortems/YYYY-MM-DD-short-slug.md and fill it in.
See docs/postmortems/README.md for when to write one and the blameless framing.
Delete this comment block once copied.
-->

# <Short, specific title: what broke, not just "incident">

**Date:** <YYYY-MM-DD> &nbsp;&nbsp; **Author:** <who wrote this up>

## Summary

One or two sentences: what broke, for how long, and who/what was affected (if known).

## Impact

What a visitor would have seen, and for how long. Be explicit about what you *don't* know: `/metrics` is in-memory
and resets on restart (`docs/deploy.md` §1), so request counts during the incident may be unrecoverable once the
back-end has restarted since. Note which sources you actually had (Cloudflare analytics, `journalctl`, a manual
check) rather than estimating without saying so.

## Timeline

All times in UTC. Pull exact timestamps from `journalctl --user -u website-update.service` /
`-u podman-kube@website.service` where possible rather than reconstructing them from memory.

| Time | Event |
| --- | --- |
| | Detected — how, and by whom/what (automatic rollback health check, a manual check, a visitor report) |
| | Mitigated — what stopped the user-visible impact |
| | Resolved — what fixed the underlying cause |

## Detection

How this was noticed. If `website-update.sh`'s automatic rollback fired, say so and paste the relevant
`journalctl` lines (look for `still rejected:` if it kept retrying, per `docs/deploy.md` §4). If it was noticed some
other way (manual check, visitor report, Cloudflare dashboard), say what the gap was between the issue starting and
it being noticed — that gap is itself a finding worth a follow-up if it's long, since there's no alerting backend to
shorten it automatically.

## Root cause

What actually caused it — not just the proximate trigger. "A new image failed its `/health` check" is the trigger;
the root cause is *why* the image was unhealthy.

## Resolution

What fixed it. If the automatic rollback in `website-update.sh` already recovered the service, say so explicitly and
focus the rest of this section on the fix that let a corrected image ship — the rollback having fired is not itself
the resolution. If a manual rollback from `docs/deploy.md` §4 was needed, note why the automatic path didn't cover
it (bad image survived past the next update cycle, rolling back further than one release, etc.).

## Follow-up

- [ ] Link any filed GitHub issue(s) for the underlying fix
- [ ] If a lesson here should become a standing rule, say where it was encoded (a test, `AGENTS.md`, `docs/deploy.md`)
      or file a follow-up issue if it hasn't been yet
- [ ] Add this postmortem to the index in `docs/postmortems/README.md`
