# Agentic Tab: Live Hive Metrics Design

Issue: #1046. Research: [`research/hive_metrics_api.md`](../../../research/hive_metrics_api.md). Every Hive claim below
is cited there to Hive's source or to a read-only check on the server. Companion specs:
[`2026-11-02-agentic-canyon-animation-design.md`](2026-11-02-agentic-canyon-animation-design.md) and
[`2026-11-02-agentic-tab-pairings.md`](2026-11-02-agentic-tab-pairings.md). This section stands on its own and works
without the canyon above it.

![Metrics section wireframe, desktop](../../assets/agentic/metrics-wireframe.svg)

Revised after the PR #1047 review. Hive has a read-only **widget token**. The checks on the server showed:

- Hive's auth is on.
- The production website pod already reaches Hive.

So this design uses no owner credential, needs no sidecar, and changes nothing in the network. The widget token was
minted and stored on the server on 2026-11-02 (see Decisions). PR throughput comes from this repo's public GitHub
data instead of Hive.

## Product goal

Show visitors what Hive is doing on this server right now, using numbers Hive already computes, refreshed at least
every 5 minutes. The section backs the rest of the tab ("agents help build this site") with live evidence. It never
shows anything that would leak private work, spend or infrastructure.

Voice (`BRANDING.md` §5): every number is real and labelled with what it counts and when it was measured. If Hive is
down, the page says so.

## Research answer in short

| Question | Answer |
| --- | --- |
| Does Hive expose an API for its metrics? | Yes, JSON over HTTP (research Q1). |
| Does it serve rendered graphs? | No. Hive's own dashboard draws inline SVG in the browser (Q2). |
| Can the dashboard be embedded? | No. Every page sends `X-Frame-Options: DENY`, and on the server `/api/snapshot` is 404 (Q2, Q6). |
| Screenshot instead? | Rejected: it needs an owner session, and pixels can leak repository names (Q7c). |
| Can the browser call Hive directly? | No. There is no CORS, and Hive is not on the internet. Fetch server-side (Q1). |
| Read-only credential | The **widget token** (`X-Hive-Widget-Token`). It authenticates exactly `GET /api/widget/summary` and nothing else (Q1). The running `stable` image lists the route (Q6). |
| Anonymous data | `/api/health`, `/api/contribute/metrics`, `/api/contribute/run-stats` answer 200 without credentials on the server (Q6). |
| Network | No change: from inside the production back-end container, `host.containers.internal:3001/api/health` returns 200 (Q6). |
| Freshness | The widget `history` gains one point per governor eval (300 s by default). The contributor series are hourly (Q4, Q6). |
| PR throughput | Hive serves it only with the owner token. Computed instead from this repo's public GitHub PRs, attributed with `scripts/pr-source.ts`'s rule (decision 2026-11-02). |

**Decision:** the website back-end fetches the widget summary, the anonymous Hive endpoints and this repo's public PR
list. It caches them and serves an allowlisted summary at `GET /api/hive/metrics`. The front-end polls that and draws
its own charts. There is no iframe, no screenshot, and no change to Hive or to the pod network.

## Architecture

```mermaid
flowchart LR
    subgraph host["homeserver (rootless podman)"]
        hive["Hive gateway<br/>*:3001"]
        subgraph pod["pod website"]
            backend["back-end<br/>GET /api/hive/metrics<br/>cache 60 s / 180 s"]
        end
    end
    browser["Visitor's browser<br/>polls every 60 s"]
    hive -- "GET /api/widget/summary<br/>(widget token)" --> backend
    hive -- "GET /api/health, /api/contribute/*<br/>(anonymous)" --> backend
    github["api.github.com<br/>public PR list"] -- "GET, anonymous, 180 s" --> backend
    browser -- "/api/* via cloudflared" --> backend
```

The widget token can read one endpoint and nothing else. So the internet-facing back-end can hold it. If the
back-end is compromised, the attacker gets the same numbers this page already publishes, plus the fields we drop
(below). They get no mutation and no other route. The earlier sidecar existed only to keep an owner-equivalent token
out of the back-end. No owner token is involved now, so the sidecar is gone.

## Data

### Upstream calls (back-end only, GET, fixed URLs, no visitor input)

| Hive endpoint | Auth | Fields kept | Refresh |
| --- | --- | --- | --- |
| `GET /api/health` | none | `status === "ok"` → `online` | 60 s |
| `GET /api/widget/summary` | `X-Hive-Widget-Token` | `history[]`: `t`, `govMode`, `govIssues`, `govPrs`, `govHold`, `actionableCount`, `openPrCount`, `mergeableCount`. `agents[]`: count of all agents and of `state === "running"` | 60 s |
| `GET /api/contribute/metrics` | none | `collected_at`, `tasks_done[]`, `fleet_size[]` (hourly, 7 days) | 180 s |
| `GET /api/contribute/run-stats` | none | `window_days`, `total`, per backend: `backend`, `completed`, `failed`, `abandoned`, `duration_p50_s`, `duration_p95_s` | 180 s |

| GitHub endpoint | Auth | Fields used | Refresh |
| --- | --- | --- | --- |
| `GET https://api.github.com/repos/Tim-van-Oudheusden/website/pulls?state=all&sort=updated&direction=desc&per_page=100` | none (public repo) | `created_at`, `merged_at`, `closed_at`, `head.ref`, `body` | 180 s |

About the GitHub call:

- **Pages:** it follows pages until a PR's `updated_at` is older than the 7-day window, at most 3 pages. Any PR
  opened, merged or closed in the window was updated in it. On 2026-11-02, 60 PRs were updated in the last 7 days:
  one page.
- **Rate limit:** unauthenticated requests get 60 per hour per IP
  ([GitHub docs](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)). 20 refreshes an
  hour fit even at 2 pages. On a 403/429 with `x-ratelimit-remaining: 0`, it keeps the last value and waits until
  `x-ratelimit-reset`.
- **Attribution:** `head.ref` and `body` are read only to attribute each PR with the rule the repo already uses for
  its AI audit trail and PR acceptance metric (`scripts/pr-source.ts`, moved to `shared/` so the back-end can import
  it). They are never forwarded.
- **Why not Hive:** this replaces Hive's owner-only `/api/pr-throughput`, so the throughput charts use public data
  about this repo and need no Hive credential.

Dropped on purpose:

- From the widget summary:
  - `hiveId` (instance identifier).
  - `history[].repos` (repository names).
  - `history[].agentStats` and `agents_kicked` (agent names and internals).
  - `agents[].name`.
- From the contributor metrics: `per_user_done` and any `per_user_*` series (keyed by GitHub login).
- From run-stats: `models[]`, `scenarios` and `chrome_idle_share`.

Not requested:

- `/api/contribute/effective-models` and `/api/leaderboard` (left out, decided 2026-11-02).
- Everything that needs the owner token: `/api/status`, `/api/pr-throughput`, `/api/timeseries`,
  `/api/trend/history`, cost.
- `/api/snapshot`, `/api/events` and `/metrics`.

### Public contract

`HivePublicMetrics` lives in `shared/`, so the back-end route and the front-end type-check against one definition.
It holds only counts, durations, modes and timestamps:

```ts
type GovernorMode = "idle" | "quiet" | "busy" | "surge";   // Hive sends IDLE/QUIET/BUSY/SURGE (hive/src/pkg/governor/governor.go:19-22)

interface HivePublicMetrics {
  online: boolean;                                // /api/health
  hive: {                                         // /api/widget/summary; null without a working widget token
    mode: GovernorMode;                           // latest history point
    agents: { total: number; running: number };
    work: { issues: number; prs: number; held: number; actionable: number; mergeable: number };  // latest point
    history: { t: string; mode: GovernorMode; issues: number; prs: number; held: number }[];
  } | null;
  contributors: {                                 // /api/contribute/*; null when unavailable
    collectedAt: string;
    tasksPerHour: number[];                       // 168 hourly buckets, oldest first, aligned with fleetSize
    fleetSize: number[];
    runs7d: { total: number; backends: { backend: string; completed: number; failed: number; abandoned: number;
              p50Seconds: number | null; p95Seconds: number | null }[] };
  } | null;
  repo: {                                         // this repo's public GitHub PRs, last 7 days; null when unavailable
    from: string; to: string;
    days: { t: string; opened: number; merged: number; closedUnmerged: number }[];   // 7 UTC days, oldest first
    mergedBySource: { t: string; hive: number; claudeCode: number; dependabot: number; other: number }[];
    medianHoursToMerge: number | null; p90HoursToMerge: number | null;            // merged in window, created → merged
  } | null;
}

interface HiveMetricsResponse {
  state: "live" | "stale" | "unavailable";
  fetchedAt: string | null;                       // when the back-end last got a good upstream answer
  metrics: HivePublicMetrics | null;
}
```

The builder picks fields into fresh objects. It never deletes fields from Hive's payload. It rejects any upstream
value that is not the expected primitive. `hive`, `contributors` and `repo` fail independently: a missing widget
token blanks `hive`, and the other two still show.

### Freshness and failure

- **Back-end:**
  - A single-flight in-memory cache: 60 s for health and the widget summary, 180 s for the contributor endpoints and
    GitHub.
  - Each upstream call has a 5 s timeout. A failed call keeps the last good value for its part.
  - `state` is `live` when every part is fresh, `stale` when any part is older than 10 minutes, and `unavailable`
    when nothing has ever been fetched.
  - The response has `Cache-Control: public, max-age=30`. Existing rate limiting applies.
- **Front-end:**
  - Polls every 60 s while the tab is visible (Page Visibility API).
  - When the tab becomes visible again, it fetches at once if the last fetch is over 60 s old.
  - A failed poll keeps the last data on screen and marks it stale.
- **Worst-case delay** from Hive changing a value to the visitor seeing it:
  - Widget data: 60 s (cache) + 30 s (HTTP cache) + 60 s (poll) = 150 s.
  - Contributor series and GitHub: 180 s + 30 s + 60 s = 270 s.

  Both are under the 5-minute requirement.
- **Upstream load** does not depend on visitor count. Hive gets 2 calls per minute plus 2 every 3 minutes, all cheap;
  the heavy audit-log routes from the first draft are not called. GitHub gets about 20 calls an hour.

## Layout

The section follows the canyon. Without the canyon, it sits at the top of the page. It uses the normal page background
and the site's wells, so it follows light and dark mode like every other page.

1. **Header row.** Heading "The hive, live". One sentence: Hive is the agent system that files, claims and lands work
   in this repo, and these numbers come from the instance running on this server and from this repo's public pull
   requests. A status pill shows one of `Live · updated 40 s ago`, `Stale · last update 14:05`, or `Offline`.
2. **KPI tiles** (four `Card`s, 2×2 on phones, 4 across from `lg`), all from the latest widget history point:
   - **Agents running:** `running / total`.
   - **Open work:** issues + PRs, with held as a sub-line.
   - **Ready to merge:** `mergeable` PRs, with `actionable` as a sub-line.
   - **Governor mode:** idle / quiet / busy / surge, with a one-line meaning ("how hard Hive is working the queue").
3. **Queue** (wide card): lines for issues, PRs and held over the span the history covers. The title states the
   measured span ("last 17 hours"), computed from the first and last `t`, never assumed.
4. **Governor mode** (card beside it): one horizontal band over the same span, split into segments coloured by mode,
   with a legend. Mode changes are rare, so this reads as a timeline of how busy the hive was.
5. **Contributor agents, last 7 days** (wide card):
   - Bars of tasks completed per hour, total in the caption.
   - A sub-line with the current fleet size ("1 contributor agent connected").
   - Caption: these are tasks done by contributor agents connected to this hive.
6. **Runs by backend, last 7 days** (card beside it): one row per backend with a stacked bar
   (completed / failed / abandoned) and that backend's p50 and p95 run time. Percentiles are per backend and are
   never summed or averaged across backends (research Q6).
7. **Pull requests on this repo, last 7 days** (wide card, from `repo`): bars per day for opened, merged and closed
   unmerged. Median and p90 time from opening to merge sit beside them.
8. **Who wrote the merged work** (card beside it): a 100 % bar per day split into Hive, Claude Code in CI,
   Dependabot and other, plus the 7-day Hive share as one number (e.g. "Hive wrote 41 of 55 merged PRs").
   - The split is by author, using the repo's attribution rule: Hive's signature line in the PR body, then the
     `claude/` and `dependabot/` branch prefixes. It is not by who clicked merge.
   - The caption says so and links to `docs/metrics/README.md`.
9. **Footnote:**
   - What Hive is, with a link to <https://github.com/hivecommons/hive>.
   - How it works on this repo, with a link to `docs/multi-agent.md` on GitHub.
   - That repository names, agent names, cost and logs are deliberately not published.

Each part degrades on its own:

- If `hive` is null, tiles 2 and charts 3–4 are replaced by one line: "Live queue data is not connected right
  now."
- If `contributors` or `repo` is null, only its cards are replaced by such a line.
- If all three are null, the section shows a short explanation instead of empty charts.

### Charts

- Hand-rolled inline SVG components with no chart library. The site has none, and Hive's dashboard does the same
  (research Q2). Four primitives: `LineSeries`, `ModeBand`, `BarSeries` (plain/grouped/stacked), `StackedRow`.
- Colours:
  - Series use site tokens first: `--site-accent` for the headline series, the `--ink`/`--paper` ramp for secondary
    series.
  - Categorical series use Flexoki accents: 600 in light mode, 400 in dark mode. Each is checked at 3:1 against
    `--site-section-well-bg` (WCAG 1.4.11).
  - Governor modes run cool to warm: idle = base grey, quiet = blue, busy = orange, surge = red.
  - Colour is never the only cue: legends label every series, and mode segments carry text where they fit.
- Motion: on data change, values move with a 300 ms transform/opacity transition behind `motion-safe:`. There is no
  entrance animation.

### Accessibility

- Each chart is a `<figure>` with a `<figcaption>`. The SVG has `role="img"` and an `aria-label` that states the
  takeaway (e.g. "Open PRs over the last 17 hours: between 4 and 9, now 6").
- A `<details>` "Show data" element under each chart holds the numbers as a `<table>`.
- No `aria-live` on the charts, since a 60 s poll would be noise. Only the status pill is `aria-live="polite"`, and it
  announces state changes (live → stale → offline), not every refresh.
- Relative times use `<time datetime>`, with the absolute time in `title`.

## Configuration and deployment

| Setting | Where | Value |
| --- | --- | --- |
| `HIVE_BASE_URL` | back-end env, `deploy/kube/prod.yaml` | `http://host.containers.internal:3001` (verified from the production pod, research Q6) |
| `HIVE_WIDGET_TOKEN` | back-end env via `valueFrom.secretKeyRef` (`name: hive-widget-token`, `key: token`, `optional: true`) | The secret exists on the server: a Kubernetes Secret YAML with `stringData.token`, created with `podman secret create hive-widget-token -` on 2026-11-02. A throwaway `kube play` pod resolved it and got 200 from `/api/widget/summary`. It is never in the repo. Without it the pod still starts and `hive` is null |
| `PR_STATS_REPOSITORY` | back-end constant, not env | `Tim-van-Oudheusden/website`. The public repo whose PRs feed `repo` |
| Network flag | `deploy/systemd/podman-kube@.service` | unchanged |
| Dev | `deploy/kube/dev.yaml` | `HIVE_BASE_URL` unset → the route serves a checked-in fixture in development only. The dev pod publishes the back-end on host `127.0.0.1:3001`, which collides with Hive on a machine that runs both; the server runs only prod |

Not used (research Q5): `-T` port forwards, `hostNetwork`, `--map-gw` / `--map-host-loopback`, and joining
`hive.network`.

## Testing and verification

TDD per `AGENTS.md`.

- **Builder (pure):** built from recorded responses, the output keeps exactly the allowlisted fields. The fixtures
  carry canaries, and none may appear in the serialised output:
  - a repo in `history[].repos`, agent names, `hiveId`, and a `per_user_done` login;
  - in the GitHub fixture: a PR title, body text, a branch name and a user login.
- **Builder (rules):**
  - Modes are lower-cased, and unknown modes are rejected.
  - `running` counts only `state === "running"`. On the server, states seen on 2026-11-02 were `running`, `paused`
    and `stopped`.
  - History `t` is epoch milliseconds and becomes ISO strings.
  - The latest point drives the tiles.
  - Malformed numbers become `null`/empty, never `NaN`, and never fail the whole object.
- **Repo activity (pure):**
  - PRs are bucketed into 7 UTC days by `created_at`, `merged_at` and `closed_at` (closed and not merged).
  - PRs outside the window are ignored.
  - Attribution matches `scripts/pr-source.ts` for each source.
  - Median and p90 cover only PRs merged in the window, and are `null` with none.
- **Route** (Fastify `inject`, fake fetch and clock):
  - The URLs requested are exactly the five above, as GET.
  - GitHub paging stops at the window edge or after 3 pages.
  - A GitHub rate-limit response keeps the last value until `x-ratelimit-reset`.
  - The widget header is sent only to the widget route.
  - TTLs are 60 s and 180 s.
  - One failing upstream keeps its last value.
  - No token → `hive: null` and the contributor part still served.
  - Nothing ever fetched → `unavailable`.
  - Never 500.
  - `Cache-Control: public, max-age=30`.
- **Front-end:**
  - The polling reducer keeps data on error and marks it stale.
  - Polling pauses while hidden and resumes on visible.
  - Each chart renders its summary `aria-label` and data table.
  - The section renders the live, stale, offline, widget-missing and unavailable states.
  - Run-time percentiles appear per backend only.
- **E2E:** with the dev fixture, four tiles and eight figures appear. With the route stubbed to `unavailable`, the
  explanation shows and no empty chart does.
- **On the server after deploy:** `curl -s https://buildwithtim.dev/api/hive/metrics` shows `state: "live"`.
  Grepping the response for a repository name, `hiveId`, `github_username` or `usd` finds nothing.

## Decisions (Tim, 2026-11-02)

1. **Widget token:** minted, and stored on the server as the podman secret `hive-widget-token` (see Configuration).
2. **PR throughput and who wrote the merged work:** computed from this repo's public GitHub PRs (`repo` above).
3. **Optional anonymous extras** (`/api/contribute/effective-models`, `/api/leaderboard`): left out.
