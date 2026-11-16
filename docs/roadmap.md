# Roadmap

Where the site is heading, as opposed to how it is built. The site exists to show what Tim builds and to
explain how it works, so this roadmap is mostly about content. The code changes it calls for are small
and come last. Dated plans for single features stay in `docs/superpowers/plans/`.

Update this file when an item ships or the direction changes. Each item names the evidence it rests on,
so a reader can check whether it still holds.

## Where things stand (November 2026)

- **Writing has stopped.** The newest article is `content/Introduction.md` (published 2026-02-08), and the
  other four are from 2025. The projects meanwhile keep shipping: Dailies is at 0.3.2 and MinimalUI at
  v0.1.5 (both released 2026-11-14), the Pindu launcher page went up on 2026-11-05, and the Pindu OS
  page went up on 2026-11-15 as the new featured project.
- **The site itself is mature.** It has RSS with projects in the feed, link previews, an updated date
  in the feed, sitemap and JSON-LD, the Agentic tab, and coverage and mutation gates. Most recent
  changes to `main` are tests and CI, not anything a reader sees.
- **There is a reader signal.** The back-end counts article and project views per slug and day without
  cookies or visitor data ([`deploy.md`](deploy.md#content-view-counts)). Those counts are the
  signal for deciding what to write next. No other analytics are planned.

## Near term: write up what has shipped

These are candidate articles, roughly in order of how much material already exists. Each one is a
first-person article by Tim, written in Obsidian as described in
[`content-authoring.md`](content-authoring.md). The list is a backlog to pick from, not a schedule.

| Article | What it can draw on |
|---|---|
| How AI agents help build this site | [`multi-agent.md`](multi-agent.md), [`risk-tiers.md`](risk-tiers.md), [`metrics/README.md`](metrics/README.md), [`reflections/`](reflections/README.md), [`postmortems/`](postmortems/README.md), and the live `/agentic` page it would link to |
| Building Dailies: a GNOME app for daily guessing games | `content/Dailies.md`, and the Dailies repository's `docs/architecture.md` and `docs/plans/`. The in-app browser with a separate session per game and the weekly popularity data are the parts a project page cannot fit. |
| A launcher for keyboard phones | `content/Minimal Android Launcher.md`, and MinimalUI's `docs/usage.md` and `DEVICES.md`. Asking owners of each phone to report how it went is a story in itself. |
| Self-hosting this site with rootless Podman and a Cloudflare Tunnel | [`deploy.md`](deploy.md) and the architecture diagram in the README. This follows on from the existing container-OS article. |
| What mutation testing caught that coverage did not | The `stryker/` configs here, and the mutant tables and PIT baseline in the Dailies and MinimalUI repositories |

Pindu launcher and Pindu OS are in early development; each gets an article once it has a release to
point at.

## Ongoing: keep the living pages current

- **On a project release:** update that project page's `updated:` date and any version or install
  details in its body, and check its line on the Now page.
- **Monthly:** reread `content/pages/now.md` and `content/pages/uses.md`, and update their `updated:`
  dates when something changed. A Now page that names a past milestone as "next" reads as abandoned.

## Mid term: let the home page grow with the projects

The home page research (`research/buildwithtim_homepage_benchmark.md`) recommends moving to a bento
grid of projects "once there are ≥5 projects with covers". There are five today (Pindu OS, Minimal
Android Launcher, Pindu launcher, Dailies, Obsidian Content Pipeline), so the bento layout is now
being planned from that research in
[#1276](https://github.com/Tim-van-Oudheusden/website/issues/1276).

## Out of scope for now

- **Newsletter.** The same research rates it the largest effort (back-end route, storage, consent),
  and only worth it once there is a regular writing cadence for it to announce. RSS already covers
  following the site.
- **Third-party analytics and public counts.** The site does not invent metrics, and empty social
  proof looks worse than none. The cookie-free view counts above are enough to steer the writing.
