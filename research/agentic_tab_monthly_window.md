# Agentic tab: a 30-day window instead of 7 days

Date: 2026-11-19

## Question

Can the live metrics on the Agentic tab (`/agentic`) cover the last month
(about 30 days) instead of the last week? What has to change in the
bucket size, axis ticks and point count of the charts?

This note is research only. No code was changed. It lives in `research/` with
a snake_case name, like [`hive_metrics_api.md`](hive_metrics_api.md), the
research the tab was built from.

## Method

- Read this repo's code end to end. Paths are cited as `file:line`.
- Hive source: a sparse clone of
  [`hivecommons/hive`](https://github.com/hivecommons/hive) at
  [`d30c434`](https://github.com/hivecommons/hive/tree/d30c4343aab5410f51959de05b823ea7e4d37dc1)
  (default branch `v5`, 2026-11-19). Hive links below point at that commit.
  The server runs `ghcr.io/hivecommons/hive:stable`
  ([`hive_metrics_api.md:23-25`](hive_metrics_api.md)), which may be older
  than `d30c434`. The two behaviours this note relies on were therefore also
  checked against the live server (next point).
- Read-only, anonymous GETs to the live Hive on `homeserver`
  (`http://192.168.2.7:3001`, 2026-11-19):
  - `/api/contribute/run-stats?days=7` → `{"total":53,"window_days":7}`
  - `?days=30` → `{"total":209,"window_days":30}`
  - `?days=0` (the whole live log) → `{"total":252,"window_days":0}`
  - `/api/contribute/metrics` → `collected_at 2026-11-19T17:00:00Z`, with
    `tasks_done` 168 entries long
- GitHub PR volume for this repo, from `gh api search/issues` and `gh pr list`
  on 2026-11-19:
  - PRs updated in the last 7 days: 32. In the last 30 days: 216.
  - PRs created per month: Sep 6, Oct 296, Nov (so far) 152.
  - Most PRs created in any rolling 30 days since 2026-09-01: **340** (window
    ending 2026-11-05). Most in any rolling 7 days: 142.
- GitHub limits from the official REST docs (links inline). ECharts behaviour
  from the installed `echarts@6.1.0` package and the
  [ECharts option reference](https://echarts.apache.org/en/option.html).

## How the tab works today

The browser never calls Hive or GitHub. It polls `GET /api/hive/metrics`
every 60 s. The back-end fetches each upstream, caches it and copies only
allowlisted fields into the response
([`docs/metrics/README.md:181-212`](../docs/metrics/README.md)).

| Layer | File | What it does |
|---|---|---|
| Upstream fetch + cache | `back-end/src/features/hive/hive-upstream.ts:13-17,26-30,154-214` | Fixed URLs. Health and widget are cached 60 s; contributor endpoints and GitHub 180 s. GitHub is called without a token (headers at `:20-24`), with at most 3 pages of 100 |
| Hive builder | `back-end/src/features/hive/hive-public-metrics.ts:82-122,162-200` | `hive.history` (governor evaluations); `contributors.tasksPerHour` / `fleetSize` / `runs7d` |
| PR builder | `back-end/src/features/hive/repo-pr-activity.ts:25-33,90-162` | Buckets PRs into `WINDOW_DAYS = 7` UTC days. `needsNextPage` stops paging at the window start |
| Route | `back-end/src/features/hive/register-hive-metrics-route.ts:31-57` | Builds the response from each part's last good answer |
| Contract | `shared/src/index.ts:277-321` | `HivePublicMetrics` |
| View model | `front-end/src/features/agentic/lib/hive-view-model.ts:155-257` | Labels, totals and spans |
| Formats | `front-end/src/features/agentic/lib/hive-metrics-format.ts:39-51,79-103` | `formatUtcDay`, `formatHour`, `formatHourSpan`, `formatSpan` |
| Charts | `front-end/src/features/agentic/pipeline/pipeline-charts.ts:73-92,199-267,339-377,462-492` | ECharts options for each chart |
| Stations | `front-end/src/features/agentic/pipeline/pipeline-stations.tsx:52,85,143,192-238,249-278,315-336`, `pipeline-view.tsx:25-27` | Where each chart sits on the page, and its text |
| Chart host | `front-end/src/features/agentic/components/echart.tsx:1-12` | ECharts core with Bar, Line, Sankey, Grid, Legend, MarkPoint and Tooltip on a canvas. `front-end/package.json:17` pins `echarts` `6.1.0` |

## Where "7 days" is set or assumed

There is no single constant. The window comes from three places, two of them
upstream.

| # | Place | 7-day assumption |
|---|---|---|
| 1 | `repo-pr-activity.ts:27-33` | `WINDOW_DAYS = 7`; `windowStart` is today's UTC midnight minus 6 days. Used for buckets (`:97-100`) and paging (`:154-162`) |
| 2 | `hive-upstream.ts:16-17` | `MAX_GITHUB_PAGES = 3` (300 PRs) is sized for a 7-day window |
| 3 | Hive `/api/contribute/metrics` | Always 168 hourly buckets. **The back-end does not choose this**; see Upstream limits |
| 4 | Hive `/api/contribute/run-stats` | Defaults to `days=7`. The back-end calls it without `?days` (`hive-upstream.ts:196`) |
| 5 | `shared/src/index.ts:293,298,310,314` | Field `runs7d`. Comments "168 today", "last 7 days", "7 UTC days" |
| 6 | `hive-public-metrics.ts:26,162,184-198` | `RunsPart = …["runs7d"]` |
| 7 | `register-hive-metrics-route.ts:53` | Comment: "The 7-day window ends when…" |
| 8 | `hive-view-model.ts:57,70,79,103` | Doc comments: "last 7 days", "last week" |
| 9 | `hive-metrics-format.ts:79-82` | `formatHourSpan` says "last week" only when `count === 7 * 24` |
| 10 | `pipeline-charts.ts:199-267` | `tasksChart` labels each day start with its weekday ("Mon"). Weekdays repeat four times in 30 days |
| 11 | `pipeline-charts.ts:280-282,351,397-400,466` | Chart labels and captions: "last 7 days", "over 7 days" |
| 12 | `pipeline-charts.ts:361-368,476-483` | Grouped bars `barMaxWidth 16` and stacked `barMaxWidth 28`, sized for 7 categories |
| 13 | `pipeline-stations.tsx:192-238,249-257` | Text: "agent runs, last 7 days", "No runs in the last 7 days.", "in 7 days", `weekOfPrs` ("pull requests, 7 days"), kicker "7 UTC days" |
| 14 | `pipeline-view.tsx:25-27` | "PRs opened in 7 days", "merged in 7 days" |
| 15 | `back-end/src/features/hive/hive-metrics-dev-fixture.ts:65` | Dev fixture uses `runs7d` |
| 16 | Docs | `docs/metrics/README.md:198-202`; `docs/superpowers/specs/2026-11-02-agentic-hive-metrics-design.md:78-79,88,140-142,197-204,275` |

The governor queue and mode charts (`queueChart` and `modeChart`, from
`hive.history`) have no 7-day window. Their span is computed from the data
and labelled with `formatSpan` (`hive-view-model.ts:155-174`). See the
section on the widget history below.

## Upstream limits (primary sources)

### Hive `/api/contribute/metrics`: fixed 7 days (the blocking constraint)

- The hourly series is a ring of `metricsRetentionBuckets = 168` buckets:
  "168 hours == 7 days. Old buckets fall off the front of the ring"
  ([`contribute_metrics.go:53-57`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/contribute_metrics.go#L53-L57)).
  Loading from disk trims to the same cap (`capRing`,
  [`:148-155`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/contribute_metrics.go#L148-L155)).
- The handler reads no query parameters. It returns the snapshot as it is
  ([`:630-650`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/contribute_metrics.go#L630-L650)).
- The live server matches: 168 entries (Method).

**So Hive cannot serve 30 days of tasks per hour or fleet size.** There are
two ways to get them:

1. **Accumulate in the website back-end.** Each 180 s fetch carries the last
   168 hours, ending at `collected_at`. Store them by hour; a newer fetch
   overwrites the same hour. The first fetch fills 7 days, so 30 days of
   history exists **23 days after deploy**. Any outage longer than 7 days
   leaves a gap that cannot be refilled.
2. **Change Hive** to raise `metricsRetentionBuckets` to 720. Hive is a
   separate project, and the comment says the cap is kept small on purpose
   ("keeping the on-disk file and the JSON payload trivially small"). Hive's
   own ring would then fill over 30 days, and the change has to reach the
   `stable` image first. [INFERENCE] This is slower and less certain than
   option 1.

### Hive `/api/contribute/run-stats`: 30 days already supported

- `?days=N` is accepted for `0 ≤ N ≤ 365`, default 7, `0` = the whole live
  log
  ([`task_run_log.go:389-400`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/task_run_log.go#L389-L400)).
  The response echoes `window_days`
  ([`:422`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/task_run_log.go#L422)).
- Caveat: it reads only the live log, never the rotated file
  ([`:311-314`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/task_run_log.go#L311-L314)).
  The log rotates at 10 MB to a single `.1` file
  ([`:19-22`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/task_run_log.go#L19-L22)).
  After a rotation, a 30-day answer can quietly cover fewer days.
- Live check: `days=30` gives 209 runs and the whole log has 252, so today's
  log reaches back more than 30 days. **Unknown:** how fast the log grows
  toward 10 MB. At about 7 runs a day [INFERENCE] that is far off, but it is
  not measured.
- Run counts and percentiles are aggregates over the window. They cannot be
  split into days.

### Hive `/api/widget/summary` history: not a weekly window

- `history` is the governor's evaluation ring, `evalHistoryCapacity = 200`
  ([`governor.go:229-233`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/governor/governor.go#L229-L233)),
  plus an optional seed file
  ([`api.go:944-962`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/api.go#L944-L962)).
- At the default evaluation interval of 300 s that is about 17 hours
  ([`hive_metrics_api.md:321`](hive_metrics_api.md)). The page already
  labels whatever span it gets ("last 33 hours").
- A 30-day queue history would also have to be accumulated (about 8,640
  points at 5 minutes, which would need downsampling). This is outside the
  "last week" question. List it only if the queue chart should also become
  monthly.

### GitHub pull list: the history is there; the request budget is not

- `GET /repos/{owner}/{repo}/pulls` takes `state`, `sort` (`updated`),
  `direction`, `per_page` (**max 100**) and `page`. It has no `since` filter
  ([REST docs: List pull requests](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests)).
  The pull list has no retention limit: closed PRs stay listed. The 14-day
  limit people quote is for the traffic APIs, which this tab does not use.
- Unauthenticated requests: "The primary rate limit for unauthenticated
  requests is 60 requests per hour", counted per originating IP
  ([REST docs: Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)).
  Authenticated requests: 5,000 per hour.
- A conditional request answered with `304` does not count against the
  primary rate limit, but only when it is "made while correctly authorized
  with an `Authorization` header"
  ([REST docs: Best practices, conditional requests](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests)).
- Budget at 30 days, with today's design (refresh every 180 s = 20 refreshes
  an hour, `hive-upstream.ts:29-30`):
  - At the measured peak, 340 PRs in 30 days need **4 pages**. Today's cap of
    3 pages (`hive-upstream.ts:16-17`) would cut off the oldest days and
    undercount them without any error.
  - 4 pages × 20 refreshes = **80 requests an hour, over the 60 allowed**.
    Even 3 pages (60 an hour) uses the whole budget for the server's IP.
  - Today's 7-day window needs 1–2 pages (peak: 142 PRs in 7 days), so 20–40
    requests an hour.
  - When the limit is hit, `rateLimitReset` (`hive-upstream.ts:72-79`) holds
    off further calls and the part goes `stale`. That is safe, but the page
    would show stale data on a regular schedule.
- So the 30-day PR window needs one of:
  - (a) **incremental sync**: keep PRs by number. Each refresh fetches pages
    sorted by `updated` only back to the last successful sync, which is
    usually 1 page. Do a full re-sync now and then, for example hourly
    (4–5 pages). That is about 25 requests an hour and needs no secret.
  - (b) a **read-only token** for public repos plus ETags: 5,000 an hour and
    free `304`s. This adds a secret to `deploy/kube/prod.yaml`, which today
    holds only `HIVE_WIDGET_TOKEN` (`:69`; `back-end/src/core/server-config.ts:18-35`).
  - (c) a **longer cache TTL** for GitHub, for example 900 s: 4 pages × 4
    refreshes = 16 an hour. This breaks the documented promise that changes
    show up in under 5 minutes (`docs/metrics/README.md:207-212`).

## Storage and caching

- Today every part is fetched live and kept only in memory: the last good
  answer of each part (`hive-upstream.ts:111-152`). A restart loses
  everything, which is fine as long as every upstream can serve the whole
  window.
- The back-end already has persistent storage to build on:
  - `bun:sqlite` in `back-end/src/features/views/view-store.ts:1-40`, with
    day-bucketed rows and an upsert
  - stored on the `views-data` hostPath volume at `/data`
    (`deploy/kube/prod.yaml:95-103`)

  A `contributor_hours (hour TEXT PRIMARY KEY, tasks INTEGER, fleet INTEGER)`
  table fits the same pattern and stores no visitor data. Keeping only counts
  keeps the allowlist promise in `docs/metrics/README.md:231-235`. The PR
  incremental sync (a) can also stay in memory: a cold start just does one
  full sync.
- Ramp-up: tasks and fleet need 23 days after deploy to reach 30 days.
  Everything else (PRs, runs) has 30 days on the first fetch.

## The graphs

Installed library: ECharts `6.1.0` (`front-end/package.json:17`; `bun.lock:699`).

| Chart | Today | At 30 days | Recommendation |
|---|---|---|---|
| Tasks per hour (`tasksChart`) | 168 bars; a tick and weekday label where each day starts (`pipeline-charts.ts:205-236`) | 720 hourly bars. On a phone the panel is roughly 280 px wide (rail `2.75rem` at `pipeline.css:549`, `4.5rem` from 48 rem at `:600-602`), so each bar is under 0.4 px. The weekday label alone ("Mon") is ambiguous with four Mondays, and the forced day-start interval turns off `hideOverlap`, so 30 labels would collide | **Daily buckets: 30 bars**, about 9 px each on a phone. Ticks once a week, labelled with the date ("17 Nov"); the tooltip shows the full day. Keep the peak marker, now the peak day. Fleet becomes the daily maximum or mean (to be decided). Sum hours by UTC day, matching the PR charts, or the visitor's local day, as `formatHour` does today (to be decided) |
| PRs per UTC day (`pullRequestsChart`) | 7 days × 3 grouped bars, `barMaxWidth 16` (`:361-368`) | 90 bars, about 3 px each on a phone; the category labels thin out at uneven steps (`hideOverlap: true`, `:80`) | **30 daily points, as stacked bars or 3 lines.** A `LineChart` is already registered (`echart.tsx:2`). Weekly ticks through `axisLabel.interval`/`axisTick.interval` ([ECharts: xAxis.axisLabel.interval](https://echarts.apache.org/en/option.html#xAxis.axisLabel.interval)) |
| Merged by author (`authorsChart`) | 7 stacked bars, `barMaxWidth 28` | 30 stacked bars, fine | Same weekly ticks |
| Outcomes Sankey, runs by backend | Totals for the window | Totals for 30 days | Only the text changes |
| Queue, mode | Span set by the data | Unchanged | Unchanged unless accumulated (see the widget history section) |

- **Weekly aggregation** (4–5 bars) would hide day-to-day shape. It also
  needs a rule for the partial week at the start of the window. Daily is the
  right density for 30 days. Weekly fits a 90-day or longer view.
- **Performance:** ECharts switches bars to large mode only past
  `largeThreshold: 400` (`node_modules/.bun/echarts@6.1.0/node_modules/echarts/lib/chart/bar/BaseBarSeries.js:157-158`).
  With 30 daily points, each chart has at most 90 bars, so performance does
  not matter. Even 720 hourly bars would draw quickly on canvas; they would
  just be unreadable. Line `sampling` defaults to `'none'` (`LineSeries.js:141`),
  which is fine at 30 points.
- **Payload:** the PR part grows from 7 to 30 entries in each of `days` and
  `mergedBySource`, about 2–3 KB uncompressed [INFERENCE]. Daily
  `tasks`/`fleet` (30 entries) would be *smaller* than today's 2 × 168
  hourly. Hourly at 30 days would be 2 × 720 integers, about 6 KB
  [INFERENCE]. Either way it is negligible next to a 60 s poll with
  `max-age=30`.
- **Accessibility:** every chart already comes with a data table
  (`PipelineChart.table`, `pipeline-charts.ts:10-14`). At 30 daily rows those
  tables are still usable. At 720 hourly rows they are not, which is one more
  reason for daily buckets.

## Test and contract impact (to list, not change)

Contract (`shared/src/index.ts:290-320`):

- `contributors.tasksPerHour` / `fleetSize` become daily series, or a new
  field next to them.
- `runs7d` needs a new name, for example `runs`, with the window carried in
  the data, such as `windowDays`.
- `repo.days` / `mergedBySource` go from 7 to 30 entries.
- Consumers: `hive-public-metrics.ts`, `hive-metrics-dev-fixture.ts`,
  `hive-view-model.ts`, `pipeline-*`.

Tests that encode 7 days (all under `test/`):

| File | Lines | Assertion |
|---|---|---|
| `back-end/src/features/hive/repo-pr-activity.test.ts` | 56, 73, 125, 176 | 7 UTC days ending today; events outside the window; paging stops at the window start |
| `back-end/src/features/hive/register-hive-metrics-route.test.ts` | 25, 228-257 | Exact GitHub URL; expects pages 1–3 or 1–2 |
| `back-end/src/features/hive/hive-public-metrics.test.ts` | 85-93, 227 | The allowlist of field paths includes `.contributors.runs7d.*`; fixture `runs7d` |
| `back-end/src/features/hive/hive-upstream.test.ts` | whole file | Upstream URLs and cache timings (the run-stats URL gains `?days=30`) |
| `front-end/src/features/agentic/lib/hive-view-model.test.ts` | 112, 131-134, 168 | `[168, "last week"]` span; `runs7d`; totals for the week |
| `front-end/src/features/agentic/pipeline/pipeline-charts.test.ts` | 61, 67, 86, 109-118, 144 | Weekday labels where each day starts, with 168 hourly buckets |
| `front-end/src/features/agentic/pipeline/pipeline-view.test.tsx` | 47, 49, 80-81, 127, 132-157 | "PRs opened in 7 days", "merged in 7 days", "1 pull request, 7 days", "No PRs were merged in the last 7 days", "76 runs in 7 days." |
| `front-end/src/features/agentic/pipeline/pipeline-model.ts` | 8, 26 | Fixture: "one week of PRs", `runs7d` |
| `front-end/src/features/agentic/pages/agentic-page.test.tsx`, `test/front-end/src/features/home/components/HomeAgentic.test.tsx` | — | Not read in detail; check for window text |

The repo's TDD rule (AGENTS.md) means each behaviour change starts as a new
failing test. Existing tests change only where the specified behaviour
changes (7 → 30). They must not be edited just to make them pass.

## Verdict

**Feasible with caveats.**

- **PR charts and runs: feasible now.**
  - Runs: add `?days=30`.
  - PRs: a 30-day window plus a new fetch strategy. Today's unauthenticated
    3-page design either truncates (peak of 340 PRs is more than 300) or goes
    over 60 requests an hour.
- **Tasks per hour and fleet: blocked upstream.** Hive keeps exactly 168
  hourly buckets and has no parameter for more
  ([`contribute_metrics.go:53-57`](https://github.com/hivecommons/hive/blob/d30c4343aab5410f51959de05b823ea7e4d37dc1/src/pkg/dashboard/contribute_metrics.go#L53-L57)).
  30 days needs either local accumulation (a 23-day ramp, gaps that cannot
  be filled after outages longer than 7 days) or an upstream Hive change.

## Options

1. **Mixed windows, no storage.**
   - PRs and runs go to 30 days, with PR incremental sync (a) and 30 daily
     points with weekly ticks.
   - Tasks per hour stays 7 days hourly and says so ("last week").
   - Pros: smallest change, no ramp-up, no secret.
   - Cons: two timescales on one page, which needs clear labels for each
     station.
2. **Everything 30 days, with back-end accumulation (recommended).**
   - Option 1, plus a `bun:sqlite` table of hourly contributor counts on the
     existing `/data` volume, seeded from the current 168 hours. It is served
     as 30 **daily** buckets.
   - The view model labels the real span ("last 12 days") until the table
     fills. The span logic already does this for the queue history
     (`formatSpan`).
   - Pros: one consistent monthly view; the right density on phones.
   - Cons: the most code; 23-day ramp-up; a new persistent table (a schema
     on a hostPath volume).
3. **Upstream Hive change plus a token.**
   - Raise Hive's ring to 720 buckets.
   - Use a read-only GitHub token with ETags.
   - Pros: least logic in this repo.
   - Cons: depends on another project's review and `stable` release; Hive
     says the small ring is deliberate; adds a secret; Hive's own ring still
     needs 30 days to fill.

**Recommendation: option 2.**

- Roll it out in two PRs (two issues): first the parts that work now (PRs
  and runs, daily points, weekly ticks), then the accumulated contributor
  series.
- Use incremental PR sync, so no secret is needed and requests stay around
  25 an hour.

Unknowns:

- Daily maximum vs mean for fleet size.
- UTC vs local day for the tasks buckets.
- How fast the Hive run log grows toward the 10 MB rotation.
- Whether other software on the server's IP also spends the unauthenticated
  GitHub budget.
