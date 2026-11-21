# Roadmap

Where the site is heading, as opposed to how it is built. The site exists to show what Tim builds and to
explain how it works, so this roadmap is mostly about content. The code changes it calls for are small
and come last. Dated plans for single features stay in `docs/superpowers/plans/`.

Update this file when an item ships or the direction changes. Each item names the evidence it rests on,
so a reader can check whether it still holds.

## Where things stand (November 2026)

- **Writing has started again.** Two articles came out after a nine-month gap:
  `content/Letting AI agents work in my repository.md` (2026-11-17) and
  `content/The signed build pipeline behind my own OS.md` (2026-11-18). The one before them was
  `content/Introduction.md` (2026-02-08), and the other four are from 2025. The projects keep shipping,
  each on its own schedule. Their current versions are on their release pages, so this file does not
  repeat them: [Dailies](https://github.com/Tim-van-Oudheusden/Dailies/releases/latest),
  [MinimalUI](https://github.com/Tim-van-Oudheusden/MinimalUI/releases/latest) and
  [Pindu launcher](https://github.com/Tim-van-Oudheusden/pindu-launcher/releases/latest). Dailies also
  installs from FlatPark, which picks up each release by itself. Each Pindu launcher release has Flatpak
  bundles and Fedora, Debian and Ubuntu packages. The Pindu launcher page went up on 2026-11-05, and
  the Pindu OS page on 2026-11-16, as the new featured project.
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
| One library for every PC game on Linux | `content/Pindu launcher.md`, and the Pindu launcher repository's README and release notes. Reading Steam, Heroic, Lutris, Bottles and Faugus into one library, and shipping the same app as a Flatpak and as native packages for three distros, are the parts a project page cannot fit. |

Two articles have shipped since this list was written. `The signed build pipeline behind my own OS`
(2026-11-18) is the Pindu OS article. `Letting AI agents work in my repository` (2026-11-17) tells the agent
story through the Pindu launcher repository and mentions this site's setup only in passing, so the first
row, about this site and its `/agentic` page, stays a candidate.

## Ongoing: keep the living pages current

- **On a project release:** update that project page's `updated:` date and any version or install
  details in its body, and check its line on the Now page.
- **Weekly:** compare each project's latest GitHub release with its page's `updated:` date (or `date:`
  when there is none). A release newer than the page means the step above was missed: read the page
  against the release notes. The projects release on their own schedules, so nothing here reminds
  anyone when one ships.
- **Monthly:** reread `content/pages/now.md` and `content/pages/uses.md`, and update their `updated:`
  dates when something changed. A Now page that names a past milestone as "next" reads as abandoned.

## Mid term: let the home page grow with the projects

The home page research (`research/buildwithtim_homepage_benchmark.md`) recommends moving to a bento
grid of projects "once there are ≥5 projects with covers". There are five since 2026-11-16 (Pindu OS,
Pindu launcher, Dailies, Minimal Android Launcher, Obsidian Content Pipeline). The layout is planned in
[`superpowers/plans/2026-11-16-home-project-bento.md`](superpowers/plans/2026-11-16-home-project-bento.md)
(#1276). Two of its three issues shipped on 2026-11-16: the home lead follows `prioritySlot` (#1279), and
the home showcase is a bento grid (#1281). The third, Projects page covers at 16:10 (#1280), was closed
by #1284 without that change. #1284 re-rendered the Obsidian Content Pipeline cover to fit the 4:3 crop,
so the Projects page gallery cards still crop covers to 4:3.

## Out of scope for now

- **Newsletter.** The same research rates it the largest effort (back-end route, storage, consent),
  and only worth it once there is a regular writing cadence for it to announce. RSS already covers
  following the site.
- **Third-party analytics and public counts.** The site does not invent metrics, and empty social
  proof looks worse than none. The cookie-free view counts above are enough to steer the writing.
