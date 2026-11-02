# Hive metrics API: showing live Hive graphs on the website

Date: 2026-11-02

## Question

The new "agentic" tab shows live Hive metrics and graphs. They must refresh at
least every 5 minutes. Hive runs on the same server as the website, on port
3001. What HTTP surface does Hive offer for this? What is safe to publish? How
does the website pod reach it? Which integration should we build?

## Method and version analysed

- Source: the untracked clone at `hive/`.
  `git -C hive log -1 --format='%H %cd'` →
  `df6fadca961a2ee684dae1476ce7dffdae68287d Wed Oct 14 17:32:34 2026 +0000`.
  `git -C hive remote -v` → `origin https://github.com/hivecommons/hive`.
  Paths below are relative to `hive/` unless they start with `deploy/`,
  `docs/`, `back-end/` or `shared/`. Those four are paths in this repo.
- That clone is 19 days older than Hive at
  [`e60f06f`](https://github.com/hivecommons/hive/tree/e60f06f268d875ff68435658614f5a571fe561b8)
  (2026-11-02), and it predates the read-only widget token (#12147 upstream).
  Widget-token claims below cite `e60f06f`. The server runs
  `ghcr.io/hivecommons/hive:stable`, and its `/api/openapi.json` lists
  `/api/widget/summary` and `/api/widget/token` (Q6).
- Podman docs: [podman-run(1)](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
  (the `--network` section is the same text in
  [podman-kube-play(1)](https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html)),
  [pasta(1)](https://passt.top/builds/latest/web/passt.1.html), and the
  [kube play support matrix](https://github.com/containers/podman/blob/main/docs/kubernetes_support.md).
- Podman behaviour was tested on the workstation (hostname `bazzite`,
  podman 5.8.9, pasta `0^20261002.gcba3570`). The read-only server checks
  were run on the Hive and website host (`homeserver`, 192.168.2.7); see Q6.
  The PR #1047 review comment raised the widget token, the anonymous
  endpoints and the server facts. Each was re-checked against the source or
  the live host before it went into this note.

## Architecture in one paragraph

The live v2 dashboard is a Go HTTP server (`src/pkg/dashboard/`) with an
embedded single-page app (`src/pkg/dashboard/static/index.html`). A Node
auth/rewrite proxy (`src/proxy/server.js`) sits in front of it
(`dashboard/README.md:3-5`). In the container deployment the Go API listens on
3002 and the Node proxy on 3001 (`src/deploy/entrypoint.sh:5-6`,
`src/proxy/server.js:11-13`). An nginx gateway publishes host port 3001 and
proxies to `hive:3001` (`src/deploy/quadlet/hive-gateway.container:66-73`,
`src/deploy/nginx.conf:10-11`). The root `dashboard/server.js` is a legacy
Node dashboard. "v2 production does not start `dashboard/server.js`"
(`dashboard/README.md:13`).

---

## Q1. HTTP API for metrics and graph data

### Framework and port

| Layer | Framework | Port | Bind | Source |
|---|---|---|---|---|
| Go dashboard API | `net/http` `ServeMux` with Go 1.22 method patterns (`"GET /api/status"`) | `dashboard.port`. Code default **3002**; env `DASHBOARD_PORT` overrides | `":<port>"`, all interfaces | `src/pkg/dashboard/server.go:1400-1419`, `src/pkg/config/config.go:6330,6440-6441,6060-6065` |
| Node auth proxy | Express + `http-proxy-middleware` | `HIVE_PROXY_PORT`, default **3001** | `app.listen(PROXY_PORT)` with no host, so all interfaces | `src/proxy/server.js:11-13,1280-1282` |
| nginx gateway (Quadlet/Compose) | nginx | host `3001:3001`, all interfaces | `PublishPort=3001:3001` | `src/deploy/quadlet/hive-gateway.container:68-73`, `src/docker-compose.yaml:18` |
| Legacy Node dashboard | Express | `HIVE_DASHBOARD_PORT`, default 3001 | `127.0.0.1` by default | `dashboard/server.js:110-117,3237` |

Whether 3001 is "the default" depends on the deployment:

- Container deployment: 3001 is the proxy/gateway default, and the Go API sits
  on 3002.
- Source run: `src/hive.yaml.example:794-795` sets `dashboard.port: 3001`, so a
  source run serves the **Go server directly** on 3001. The Quadlet notes this
  clash (`src/deploy/quadlet/hive.container:208-215`).

Which of these answers on the server's 3001 is unverified; see Q6.

### Authentication model

- The Go `authenticate` middleware lets `isPublicPath` routes through
  anonymously (`src/pkg/dashboard/server.go:1676-1682`). Everything else needs
  a dashboard token, a session, or a trusted proxy header.
- **Open spoke:** with no `auth_token` and no `authorized_users`, every
  anonymous request is promoted to **owner**
  (`src/pkg/dashboard/server.go:1688-1723`). `src/hive.yaml.example:799` says:
  "Optional — omit to allow unauthenticated access".
- **Node proxy:** a request carrying `Authorization: Bearer <HIVE_DASHBOARD_TOKEN>`
  makes the proxy inject `X-Hive-Internal`, which is owner-equivalent. Anonymous
  GETs are forwarded with no trust material
  (`src/proxy/server.js:688-694,983-999,1006-1023`). `?token=` query auth is
  rejected (`src/pkg/dashboard/server.go:1684-1687`).
- **One read-only token exists: the widget token** (added after the analysed
  clone, present at `e60f06f`). The owner mints it with
  `POST /api/widget/token` and revokes it with `DELETE`. It is `hwt_` plus
  hex, and Hive stores only its SHA-256 (`src/pkg/dashboard/widget_token.go:35-37,103,139`
  at `e60f06f`). It is sent as `X-Hive-Widget-Token`. It authenticates
  exactly `GET`/`HEAD /api/widget/summary` and nothing else
  (`widget_token.go:166-175`, admitted in `authenticate` at
  `server.go:2213-2216`). The Node proxy strips only `X-Hive-User`,
  `X-Hive-Role` and `X-Hive-Internal` (`src/proxy/server.js:1028-1041,1273-1275`),
  so the widget header reaches Go through the gateway.
  `/api/widget/summary` returns `{hiveId, history, agents[{name,state}]}`
  (`widget_token.go:185-213`). `history` is `historyPayload()`: the governor
  eval ring of 200 `EvalSnapshot`s, plus an optional seed file
  (`api.go:908-928`, `src/pkg/governor/governor.go:41-58,227`).
- Apart from the widget token, the only scoped credential is
  `HIVE_METRICS_TOKEN`, and it is valid for `/metrics` only
  (`src/pkg/dashboard/metrics_prometheus.go:26-34,69-85`). Every other
  metric route needs the owner-equivalent dashboard token.
- Read-only identities exist only as device-flow login sessions for
  `authorized_users` entries with a `:read` role (`src/hive.yaml.example:800`).
  [INFERENCE] Sessions last about 30 days ("a 30-day session",
  `src/pkg/dashboard/server.go:1696-1697`), so a server-to-server client would
  need an interactive GitHub login roughly once a month.
- Public paths relevant here (`src/pkg/dashboard/server.go:2004-2118`):
  - `/api/health*` and `/api/livez`
  - `/metrics`, still bearer-gated
  - `/snapshot` and `/api/snapshot*`
  - `/api/leaderboard*`, `/api/cards/*`, `/cards/*`, `/share/*`
  - `/api/contribute/*`, `/contribute*`, `/leaderboard*`
  - `/api/style`, `/api/themes`, `/api/theme.css`

### Routes that return metrics, stats or graph data

The full list of 244 GET routes came from the `HandleFunc("GET …")`
registrations in `src/pkg/dashboard/*.go`. The hand-maintained index is
`src/docs/api-reference.md`. These are the routes relevant to metrics:

| Path (GET) | Auth | Returns | Source |
|---|---|---|---|
| `/api/health` | Public | `{"status":"ok"}`, or 503 `{"status":"starting"}` | `server.go:1312,2832-2844` |
| `/api/status` | Dashboard auth | Full `StatusPayload` plus `webhooks`. Accepts `?fields=a,b` / `?omit=a,b` on top-level keys, and gzip | `server.go:1325,3294-3370`, `docs/api-reference.md:18` |
| `/api/status/summary` | Dashboard auth | `{timestamp,statusSeq,statusInstance,hiveId,agents[{name,state,paused,backend,model,effort,restarts,needsLogin}],governor{mode},budget}` | `server.go:1326,3383-3421` |
| `/api/events` | Dashboard auth | **SSE**. First frame is the full status JSON; later frames are pushed on change | `server.go:1331,3432-3486` |
| `/api/widget` | Dashboard auth | Compact summary: mode, issue/PR counts, running/paused/busy counts, agents (name/state/next kick), `prThroughput7d{opened,merged,closed}`, version | `api.go:106,1039-1145` |
| `/api/pr-throughput?hours=N&repo=o/r&role=` | Dashboard auth | `PRThroughput`: totals, `buckets[{t,opened,merged,closed,ttm_p50,ttm_p90}]`, `metrics{opened_per_day,merged_per_day,median/p90 TTM,merge_ratio,net_backlog_change,trend}`, `series[{t,hive,human,other}]`, `merged_by_agent`, `top_repos`, `closed_reasons` | `api.go:79`, `api_pr_throughput.go:33-134`, `pr_throughput_counters.go:111-116` |
| `/api/trend/history` | Dashboard auth | `[]TrendHistoryEntry{t,govIssues,govPrs,govTotal,govHold,overview*,beadsWorkers,beadsSupervisor,repos{name:{issues,prs}},system{diskPct,memPct,cpuPct}}`. At most 8640 points, at most one per 5 min | `api.go:153,1355-1357`, `server.go:1157-1201` |
| `/api/timeseries?series=token\|fact\|cost` | Dashboard auth | Token sparkline `[{t,tokenInput,tokenOutput,tokenCacheRead,tokenCacheCreate,tokenMessages,tokens{agent:n},tokenModels{model:n}}]` (288 points, about 24 h at 5 min). Fact history. Cost history `[{t,usd,agents{},models{}}]` | `api.go:155,1367-1383`, `server.go:1090-1149` |
| `/api/cost/history` | Dashboard auth | Same as `timeseries?series=cost` | `api.go:150,1351-1353` |
| `/api/cost`, `/api/repo-cost`, `/api/tokens` | Dashboard auth | Estimated cost and token tables | `api.go:146-149` |
| `/api/history`, `/api/trends?range=day\|week&hours=` | Dashboard auth | Governor `EvalSnapshot[]{t,govMode,govIssues,govPrs,…,repos,agentStats}` (ring of 200, plus a seed file); `trends` adds `tokenHistory` | `api.go:75-76,813-884`, `src/pkg/governor/governor.go:41-58,218` |
| `/api/timeline`, `/api/lifecycle-timeline` | Dashboard auth | Kick history plus mode timeline; PR lifecycle rows | `api.go:77-78,886-940` |
| `/api/overview/history?since=` | Dashboard auth | Overview KPI history | `api.go:154,1359-1365` |
| `/api/budget/history`, `/api/swarm/history` | Dashboard auth | Budget and swarm series | `api.go:152`, `swarm.go:313` |
| `/api/snapshot` | **Public**, but only when `hub.auto_snapshot: true` (404 otherwise) | **The whole cached `StatusPayload`**, `Cache-Control: public, max-age=60` | `api_snapshot.go:16-33` |
| `/api/leaderboard`, `/api/leaderboard/swarm` | Public | Contributor and agent leaderboard; swarm records | `contribute_leaderboard.go:81-88`, `swarm.go:318` |
| `/api/contribute/metrics`, `/api/contribute/run-stats` | Public (`/api/contribute/` prefix) | Contributor-fleet metrics (the volunteer "contribute" feature, not this hive's own work) | `api_contribute.go:169,187`, `server.go:2055-2065` |
| `/metrics` | Opt-in via `HIVE_METRICS_ENABLED`, bearer `HIVE_METRICS_TOKEN` (403 if unset) | **Prometheus text exposition** | `server.go:1315-1324`, `metrics_prometheus.go:14-85` |

All paths in this table are under `src/pkg/dashboard/` unless they include a
directory.

Trimmed `StatusPayload` (`src/pkg/dashboard/server.go:401-508`):

```jsonc
{
  "overviewTotals": { "issues": {"forge":10,"tracked":3,"held":0,"outside":7}, "prs": {...} },
  "actionableNow": {...}, "timestamp": "…", "statusSeq": 42, "statusInstance": "…", "hiveId": "…",
  "agents": [ { "name","displayName","description","role","session","state","busy","paused",
                "pausedBy","pausedReason","loginURL","cli","model","doing","lastKickAt","nextKickAt",
                "liveSummary","detailSummary","statusEvidence","conditionMessage","restarts", … } ],
  "governor": { "active", "mode": "busy", "issues", "prs", "thresholds": {"quiet","busy","surge"}, "nextAgents": [] },
  "tokens": { "lookbackHours": 24, "sessions": [{"id","agent","model","total"}],
              "totals": {"input","output","cacheRead","cacheCreate","messages","sessions"},
              "byAgent": {}, "byModel": {}, "byAgentModel": {} },
  "repos": [ { "name","full":"owner/repo","issues","prs","actionableIssues":[…],"openPrs":[…],
               "heldIssues":[…],"heldPrs":[…],"pausedBy","pauseReason", … } ],
  "beads": {"workers","supervisor"}, "planning": {...}, "runs": {...},
  "budget": { "BUDGET_WEEKLY","BUDGET_USED","USD_USED","BURN_RATE_HOURLY", … },
  "acmmLevel": 4, "systemResources": {...}, "deepHealth": {...}, "ghRateLimits": {...},
  "hold": {"items": […]}, "advisoryDigest": …, "githubBaseURL": "…", "security": {...}, …
}
```

Prometheus series (`src/pkg/dashboard/metrics_prometheus.go:48-66`). Every
series is an all-time cumulative counter labelled with `hive_id` plus
`model`/`agent`:

- `hive_estimated_cost_usd{model}`, `…_by_agent{agent}`, `…_total`
- `hive_model_input_tokens_total`, `hive_model_output_tokens_total`
- `hive_prs_by_model_total{model,outcome}`, `hive_pr_rework_by_model`
- `hive_reviews_by_model_pair_total`, `hive_review_outcome_prs`,
  `hive_review_outcome_median_hours_to_merge`
- `hive_pr_followup_*`

The proxy forwards only `/api/*` to Go (`src/proxy/server.js:1065`), and every
other unknown path falls through to the SPA `index.html`
(`src/proxy/server.js:1271-1278`). [INFERENCE] So `/metrics` answers only on the
Go port: 3002 in containers, where 3002 is not published
(`src/deploy/quadlet/hive.container:174-180`), or 3001 on a source run.

### CORS, caching and push

- **CORS:** none. No `Access-Control-Allow-Origin` appears in any non-test
  dashboard Go file; the search returned no hits. The SSE handler says "No CORS
  header — SSE is same-origin only" (`src/pkg/dashboard/server.go:3442-3443`).
  A browser on the website origin therefore cannot call Hive directly. A
  server-side proxy is required anyway.
- **Caching:**
  - The Node proxy sets `Cache-Control: no-store, no-cache, must-revalidate`
    and `Pragma: no-cache` on every response (`src/proxy/server.js:977-978`).
  - nginx adds the same on `/api/` (`src/deploy/nginx.conf:78-79`).
  - Only `/api/snapshot` and `/snapshot` set `public, max-age=60`
    (`src/pkg/dashboard/api_snapshot.go:31,113`).
  - [INFERENCE] Whether the upstream `max-age=60` survives the proxy depends on
    http-proxy header copy order. Do not rely on Hive's caching headers; cache
    in the website back-end.
- **Push:** SSE on `/api/events` (`server.go:3432-3486`, max-clients cap at
  3447-3451). The SPA connects with `new EventSource('/api/events')`
  (`src/pkg/dashboard/static/index.html:30480`). There are also WebSockets for
  contribute and campaign jams (`api_contribute.go:133`, `api.go:105`), which
  are not relevant here.
- **OpenMetrics/Prometheus:** yes, `/metrics` as above. It is off by default and
  token-gated.

## Q2. What the Hive dashboard renders

There is no chart library. A search of `index.html` for
Chart.js/uPlot/d3/ECharts/Apex/Recharts found none, and the page loads no
external `<script src>`. Charts are hand-built inline SVG strings, HTML/CSS
bars, and one canvas.

| Panel (docs) | Graphs | Data source | Rendering |
|---|---|---|---|
| Overview (`src/docs/dashboard-sections.md:34-79`) | KPI tiles with trend sparklines; "Issues by band" / "PRs by band" as donut, pie, bar, line or histogram (user choice) | `/api/status` (+ SSE), `/api/trend/history` | `renderSparkline` builds `<svg><polyline>` (`index.html:9615-9660`); `renderOverviewDonutSVG` (15323); `renderOverviewBar` uses `div.overview-hbar` (15257); chart switch in `renderOverviewCharts` (15981-16014) |
| Governor + PRs by model (`dashboard-sections.md:81-128`) | Mode, cadence table, budget bar, pressure sparklines | `/api/status`, `/api/history`, `/api/trends?range=week` (`index.html:10510-10515`), `/api/trend/history` (9878), `/api/budget/history` (16751), `/api/governor/pr-models` | SVG sparklines; `renderBudgetBar` (16851) |
| Throughput (`dashboard-sections.md:247-266`) | Opened/merged/closed tiles with sparklines; 8 metric sparklines (velocity, TTM p50/p90, merge ratio, net backlog, trends) | `/api/pr-throughput?hours=…&role=…` (`index.html:19804`) | `renderPRThroughput` (19752-19797), SVG sparklines |
| Lifecycle Timeline (`dashboard-sections.md:227-245`) | PR rows | `/api/lifecycle-timeline?limit=50` (`index.html:19467`) | HTML |
| Tokens (`dashboard-sections.md:268-286`) | Totals, by model/agent, burn rate | `/api/status` `tokens`, `/api/timeseries?series=token` | HTML + SVG sparklines |
| Cost (`dashboard-sections.md:288-307`) | Estimated $, per-model mini sparklines, cost per merged PR | `/api/cost` (`index.html:18743`), `/api/repo-cost` (18735), `/api/cost/history` (9849) | HTML + SVG sparklines |
| System gauges | Disk/mem/cpu | `status.systemResources` + `/api/trend/history` | `renderSystemGauges` (24468) |
| Knowledge | Fact graph | `/api/knowledge/graph` (`index.html:21155`) | **canvas** (`getContext('2d')`, 21211) |
| Swarm | History/leaderboard | `/api/swarm/history` (`index.html:13530`) | HTML |

Client refresh constants:

| Data | Interval | Source |
|---|---|---|
| Status expected | every 30 s, stale after 3 polls | `index.html:24598-24599` |
| History | 30 s | `index.html:10575` |
| Cost | 60 s | `index.html:18181` |
| Timeline | 60 s | `index.html:30671` |
| Trends | 15 min | `index.html:30660` |

**Rendered graph endpoints:** none for metrics. The only server-rendered images
are leaderboard/player/achievement **social cards** (SVG):
`/api/cards/leaderboard/{contributors|swarm|teams}.svg`, which are public
(`src/pkg/dashboard/social_cards.go:99-117,148-160`). They show
contributors, not hive throughput.

**Embedding (iframe):**

- Every route sends `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`.
  This is set in Go (`server.go:1488-1501`) and again in the Node proxy
  (`src/proxy/server.js:948-975`).
- The **only** frameable document is `/snapshot`, and only when
  `dashboard.snapshot_frame_ancestors` lists exact HTTPS origins. Wildcards and
  paths are rejected (`src/pkg/config/config.go:5443-5448`,
  `src/hive.yaml.example:796-798`).
- `/snapshot` also needs `hub.auto_snapshot: true`. Without it the page returns
  a "Snapshot is not currently published" redirect page
  (`api_snapshot.go:43-58`).
- The snapshot is rebuilt when older than `hub.snapshot_interval_min`. Values
  below 5 become 15 (`api_snapshot.go:70-80`).
- The rebuild shells out to `node /opt/hive/dashboard/build-snapshot.mjs` and
  writes to `/data/snapshots` (`api_snapshot.go:126-175`). Those are container
  paths, so [INFERENCE] a source run without `/opt/hive` cannot build it.
- The builder bakes `/api/status`, `/api/config`, `/api/audit`,
  `/api/contributors`, `/api/knowledge` and more into the HTML using the owner
  token (`dashboard/build-snapshot.mjs:83-100`, `api_snapshot.go:162-169`).

## Q3. Data sensitivity and a public allowlist

| Field(s) | Why unsafe | Source |
|---|---|---|
| `repos[].full/name`, `actionableIssues`, `openPrs`, `heldIssues/heldPrs` (titles, authors, labels, assignees), `pausedBy`, `pauseReason`, `upstream` | Can name private repos, issue titles and GitHub usernames | `server.go:908-959`; tooltips print title/author/assignees (`index.html:16016-16029`) |
| `trend/history[].repos`, `history[].repos`, `pr-throughput.top_repos`, `?repo=` | Per-repo names | `server.go:1179-1180`, `governor.go:56`, `api_pr_throughput.go:69` |
| `agents[].doing`, `liveSummary`, `detailSummary`, `structuredStatus`, `statusEvidence`, `conditionMessage`, `pausedReason`, `govReason` | Free text derived from agent sessions and prompts; can quote private code or issues | `server.go:667,685-696` |
| `agents[].session`, `loginURL`, `pausedBy`, `tokens.sessions[].id` | Session identifiers, login URLs, user names | `server.go:638,656,660,898-906` |
| `budget.*USD*`, `COIN*`, `/api/cost*`, `cost/history`, `hive_estimated_cost_usd*` | Spending. The code calls cost/agent series "business-sensitive" | `server.go:1032-1060`, `metrics_prometheus.go:70-74` |
| `hiveId`, `githubBaseURL`, `githubApp*`, `hubBanner`, `platform`, `security`, `deepHealth`, `ghRateLimits`, `api_budget`, `webhooks`, `systemResources`, `releaseLineLag` | Instance identifiers, hostnames/URLs, security posture, host load | `server.go:401-508` |
| `hold.items`, `planning.issues`, `planning.waiting_on_human`, `advisoryDigest`, `hiveAdvice`, `fleetReport`, `hiddenAgents` | Issue references, plan titles, internal findings | `server.go:961-1030,1081-1086` |
| `/api/config*`, `/api/audit`, `/api/prompt-history`, `/api/agents/{name}/log`, `/api/pane/{agent}` | Raw config, audit trail, prompts, terminal output | `api.go:42-57,107-110` |

Proposed **public allowlist** for the owner-token routes. This was the first
draft. The Recommendation now uses only the widget and anonymous routes, and
the metrics spec holds the current contract. The website back-end would build
this DTO, and nothing else would be forwarded:

```ts
interface HivePublicMetrics {
  generatedAt: string;            // from status.timestamp
  online: boolean;                // /api/health status === "ok"
  governorMode: "idle" | "quiet" | "busy" | "surge";   // status.governor.mode
  acmmLevel: number;              // status.acmmLevel
  agents: { total: number; running: number; busy: number; paused: number };      // counts only
  work: { openIssues: number; openPRs: number; actionable: number; held: number }; // overviewTotals sums
  throughput7d: {                 // /api/pr-throughput?hours=168
    opened: number; merged: number; closed: number;
    mergedPerDay: number; medianTimeToMergeHours: number | null; p90TimeToMergeHours: number | null;
    mergeRatio: number | null;
    buckets: { t: string; opened: number; merged: number; closed: number }[];
    hiveShare: { t: string; hive: number; human: number; other: number }[];  // series
  };
  tokens24h: { input: number; output: number; cacheRead: number;
               series: { t: number; total: number }[] };   // /api/timeseries?series=token, totals only
  queueTrend: { t: number; issues: number; prs: number }[]; // /api/trend/history govIssues/govPrs, thinned to ≤96 pts
}
```

Excluded on purpose: every per-repo, per-agent free-text, per-session,
per-user and cost field.

Two values are optional and need an explicit owner decision:

- Agent display names and roles (`agents[].displayName/role`) are operator
  config. [INFERENCE] They are usually generic, like "scanner".
- Per-model token totals (`tokens.byModel`) contain public model IDs only.
  [INFERENCE] They read as low-risk, but they reveal which providers you pay.

## Q4. Freshness and request cost

| Data | How often it changes | Cost per request | Source |
|---|---|---|---|
| `StatusPayload` (`/api/status`, `/summary`, `/api/snapshot`, SSE) | Rebuilt in the governor eval loop. Default `eval_interval_s` 300, adaptive up to `eval_interval_max_s` 1800, webhook mode 900. Also rebuilt on config reload or mutation | Served from memory under an RLock. `/api/status` also computes overview bands per request and JSON/gzip-encodes a large payload. `?fields=` filtering re-marshals the whole payload first | `src/cmd/hive/main.go:1632,7154,7344-7346,2969-2996`, `src/pkg/config/config.go:2104-2107,6332-6334`, `server.go:3294-3370` |
| Trend/cost/fact histories | Appended at most once per 5 min; ring of 8640 points (about 30 days) | Memory copy plus encoding. Large: up to 8640 entries | `server.go:1143-1149,1199-1203` |
| Token sparkline | About every 5 min, 288 points (about 24 h) | Memory | `server.go:1101-1102` |
| Metrics collector, activity, repo-cost | Collected every 5 min; fleet stats every 30 min | Background job, not per request | `src/pkg/dashboard/metrics_collector.go:21`, `collect/activity_collector.go:53`, `collect/repo_cost_collector.go:30`, `collect/fleet_stats_collector.go:21` |
| `/api/pr-throughput` and `/api/widget` | Audit events as they happen | **Heavy:** each call scans the on-disk audit log, including rotated and compressed backups (retention 90 days), then buckets it | `api_pr_throughput.go:124-147`, `audit.go:28,319-331`, `api.go:1099-1102`; same concern noted for repo-cost in `src/cmd/hive/main.go:2945-2951` |
| `/api/health` | — | Trivial | `server.go:2832-2844` |

Hive's own cached-status contract is `Cache-Control: public, max-age=60`
(`api_snapshot.go:31`). The user docs say the trend samples come "on each
status refresh, roughly every few minutes" (`src/docs/dashboard-sections.md:59`).
The data changes on a 5-minute scale, so a 60 s cache for live values and a
5-minute cache for histories and throughput lose almost nothing.

## Q5. Networking

### How Hive is deployed

There are three paths in the source.

1. **Legacy v1 host install.** `install.sh` installs `systemd/hive.service`
   (`User=dev`, `ExecStart=/usr/local/bin/supervisor.sh`), a tmux agent
   supervisor with no HTTP dashboard (`install.sh:1-16,104-127`,
   `systemd/hive.service`). The only web-facing unit there is
   `ttyd-hive.service` on `127.0.0.1:7681`.
   `systemd/hive-snapshot.service` and `.timer` fetch
   `HIVE_DASHBOARD_URL=http://localhost:3001` every 15 minutes and push a
   static snapshot to `kubestellar/docs` (Q7 option d).
2. **v2 standalone containers.** Podman Quadlet or Compose: `hive.container`
   plus `hive-gateway.container` on `hive.network`. Only the gateway publishes
   a port: `PublishPort=3001:3001`, "binding all interfaces rather than
   loopback" (`src/deploy/quadlet/hive-gateway.container:66-73`). Hive's own
   3001 and 3002 stay inside the network (`src/deploy/quadlet/hive.container:125-127,174-180`).
   Compose matches with `"3001:3001"` (`src/docker-compose.yaml:18`).
3. **Source run.** The Go binary uses `dashboard.port: 3001` from
   `src/hive.yaml.example:794-795` and binds `:3001` on all interfaces
   (`server.go:1402-1410`).

[INFERENCE] The website's own manifest says the host already uses 3000/3001
for "other services" (`deploy/kube/prod.yaml:8-12`). That fits path 2 or 3.
Both bind **all interfaces**, not 127.0.0.1. Check on the server with
`ss -ltnp 'sport = :3001'`. The legacy `dashboard/server.js` would bind
127.0.0.1.

### Website pod network today

- Rootless `podman kube play --replace --network pasta:--host-lo-to-ns-lo …/prod.yaml`
  (`deploy/systemd/podman-kube@.service:34-36`). The reason is that cloudflared
  should appear as 127.0.0.1 for `CF-Connecting-IP` trust (#479,
  `docs/deploy.md:132-138`).
- Host ports are published on loopback only: front-end `127.0.0.1:8300`,
  back-end `127.0.0.1:8301` (`deploy/kube/prod.yaml:27-30,60-63`).
- The back-end listens on **3001 inside the pod**: `HOST=0.0.0.0`
  (`deploy/kube/prod.yaml:54-55`) and `BACKEND_PORT = 3001`
  (`shared/src/index.ts:25`, `back-end/src/core/server-config.ts:6-8`).
  Inside the pod, `localhost:3001` is the website back-end, not Hive.
- `dev.yaml` publishes the back-end on host `127.0.0.1:3001`
  (`deploy/kube/dev.yaml:52-55`). That collides with Hive on 3001 on any
  machine that runs both.
- cloudflared forwards only `^/api` and `^/content-assets` to 8301, and
  everything else to 8300 (`deploy/cloudflared/config.yml:14-21`). A new
  back-end route under `/api/…` is public automatically.

### Options to reach host:3001 from the pod

**1. `host.containers.internal` (the default with pasta).**

- Podman passes `--map-guest-addr 169.254.1.2` by default "to make the
  `host.containers.internal` /etc/hosts entry work and allow connections to the
  host". The default is also `--no-map-gw`
  ([podman-run(1), `--network pasta`](https://docs.podman.io/en/latest/markdown/podman-run.1.html)).
- `--map-guest-addr` redirects to "the host's global address"
  ([pasta(1)](https://passt.top/builds/latest/web/passt.1.html)). It reaches
  services bound to 0.0.0.0 or the LAN IP, **not** services bound to 127.0.0.1.
- **Change required:** none in the network, if Hive listens on all interfaces
  (paths 2 and 3).
- **Trade-off:** none new. The pod can already reach every host service bound
  to the global address. That is default podman behaviour.

**2. `pasta -T` forward from the pod to host loopback.**

- pasta `-T/--tcp-ns` forwards "from target namespace to init namespace" and
  supports remapping like `22:23`
  ([pasta(1)](https://passt.top/builds/latest/web/passt.1.html)). Podman: "-T,5201:
  … using the loopback interface"
  ([podman-run(1)](https://docs.podman.io/en/latest/markdown/podman-run.1.html)).
- Use a remap. Port 3001 is taken in the pod by the back-end:
  `--network pasta:--host-lo-to-ns-lo,-T,13001:3001`, then call
  `http://127.0.0.1:13001`.
- **Change required:** one edit to the `ExecStart` in
  `deploy/systemd/podman-kube@.service:36`. Mirror it in the dev workflow if
  dev should reach Hive.
- **Trade-off:** the narrowest grant. Exactly one host-loopback port is opened
  to the pod. It works even if Hive binds 127.0.0.1. Any process in the pod
  (front-end too) can reach that port.

**3. `--map-gw` / `--map-host-loopback`.**

- These map the gateway or another address to the **host loopback**
  ([pasta(1)](https://passt.top/builds/latest/web/passt.1.html)).
- **Trade-off:** exposes **every** loopback-only host service to the pod. That
  includes ttyd `127.0.0.1:7681` on a legacy install, which is a writable,
  unauthenticated shell (`systemd/ttyd-hive.service`). Avoid.

**4. `hostNetwork: true` in the kube YAML.**

- Supported by kube play
  ([support matrix](https://github.com/containers/podman/blob/main/docs/kubernetes_support.md)).
- **Breaks here:**
  - The back-end binds `0.0.0.0:3001` and would collide with Hive on host
    3001.
  - Loopback-only `hostIP` publishing (`prod.yaml:8-12`) and the
    `--host-lo-to-ns-lo` client-IP trust (#479) both lose their meaning.
- **Trade-off:** removes all network isolation. Rejected.

**5. Join Hive's `hive.network`** (path 2 only).

- `kube play --network hive` would let the pod resolve `hive:3001` and
  `hive:3002`.
- **Trade-off:** the pod becomes a peer of the credential-holding Hive
  container, with direct access to Go 3002 and ttyd 7681. The Hive notes say
  "every member of a netavark network can reach every port of every other
  member" (`src/deploy/quadlet/hive-gateway.container:17-25`). It also drops
  pasta and therefore the #479 client-IP behaviour. Rejected.

**Live verification of options 1 and 2** on this workstation:

- Host listeners: `python3 -m http.server` on `0.0.0.0:39001` and on
  `127.0.0.1:39002`.
- Probe: a `python:3.12-slim` container, run both with `podman run` and with
  `podman kube play` using a Pod that has a loopback `hostIP` port, mirroring
  `prod.yaml`.

Output from `kube play --network pasta:--host-lo-to-ns-lo` (the current prod
flags):

```
169.254.1.2	host.containers.internal host.docker.internal
http://host.containers.internal:39001/ -> 200
http://host.containers.internal:39002/ -> ERR URLError <urlopen error [Errno 111] Connection refused>
http://127.0.0.1:13002/ -> ERR URLError <urlopen error [Errno 111] Connection refused>
```

Output from `kube play --network pasta:--host-lo-to-ns-lo,-T,13002:39002`:

```
169.254.1.2	host.containers.internal host.docker.internal
http://host.containers.internal:39001/ -> 200
http://host.containers.internal:39002/ -> ERR URLError <urlopen error [Errno 111] Connection refused>
http://127.0.0.1:13002/ -> 200
```

`podman run` with the same two network strings gave identical results.

## Q6. Live check

The first run was on `bazzite`, the workstation. Nothing listens on 3001
there (`curl` was refused, `ss` showed nothing, and there are no `hive*`
units).

### On the server (`homeserver`, 192.168.2.7, 2026-11-02)

Read-only GETs only, with no credentials sent. Nothing was minted or changed.

- **Deployment is path 2, v2 Quadlets** (Q5). These rootless user units are
  active: `hive.service`, `hive-gateway.service`, `hive-network.service` and
  `hive-data-volume.service`, next to `podman-kube@website.service`,
  `website-update.timer` and `cloudflared.service`. The containers are `hive`
  (`ghcr.io/hivecommons/hive:stable`), `hive-gateway` (nginx),
  `hive-contributor-omp-…`, `website-front-end` and `website-back-end`.
- **Bind:** `ss -ltnp` shows `*:3001` held by `rootlessport`, so the gateway
  listens on all interfaces. The website listens on `127.0.0.1:8300` and
  `127.0.0.1:8301` (pasta).
- **HTTP status from the host to `http://127.0.0.1:3001`:**

  | Path | Status |
  |---|---|
  | `/api/health` | 200 |
  | `/api/status` | 401, so auth is on and the hardening step is already done |
  | `/api/widget/summary` without a token | 401 |
  | `/api/widget/summary` with a well-formed but wrong `X-Hive-Widget-Token` | 401 |
  | `/api/contribute/metrics`, `/api/contribute/run-stats`, `/api/contribute/effective-models`, `/api/leaderboard` | 200, anonymous |
  | `/api/snapshot` | 404 |
  | `/api/version` | `{"error":"unauthorized"}` |

- `/api/openapi.json` lists `/api/widget`, `/api/widget/summary` and
  `/api/widget/token`. The running `stable` image therefore has the widget
  token.
- **From inside the production website pod** (`podman exec website-back-end`,
  pod played with `--network pasta:--host-lo-to-ns-lo`, per the unit's
  `ExecStart`):
  - `host.containers.internal` resolves to `169.254.1.2`.
  - `fetch("http://host.containers.internal:3001/api/health")` returns 200.
  - `/api/widget/summary` without a token returns 401.

  This settles Q5: the pod reaches Hive with **no network change**.

Anonymous payload shapes. Only the keys were inspected:

- `/api/contribute/metrics`:
  - `{bucket:"hour", collected_at, queue_depth[168], tasks_done[168], fleet_size[168], per_user_done{login: [...]}}`.
    The arrays are hourly integers over 7 days.
  - The series count work done by the contributor agents ("clankers")
    connected to this hive (`src/pkg/dashboard/contribute_metrics.go:13-25`
    at `e60f06f`).
  - `per_user_done` is keyed by GitHub login, so it must be dropped.
- `/api/contribute/run-stats`: `{total, window_days, backends[{backend,total,completed,failed,abandoned,duration_p50_s,duration_p95_s,scenarios,chrome_idle_share}], models[{model,runs,failure_rate,verified_pr_share}]}`.
  Percentiles are per backend and cannot be summed across backends.
- `/api/contribute/effective-models`: `{window, filter, min_merged_prs, ranked[{model, backend, runs, prs, merged_prs, first_pass_merge_rate, …}], insufficient, coverage}`.
- `/api/leaderboard`:
  - `agents[]` (all `is_agent: true` here) with `github_username`,
    `avatar_url`, `tasks_completed`, `tasks_failed`, `trust_tier`, …
  - `leaderboard[]`: the human contributors.

The original commands for telling the three deployment paths apart:

```bash
ss -ltnp 'sport = :3001'                                   # process + bind address
curl -sS -m 5 -i http://127.0.0.1:3001/api/health          # public; {"status":"ok"}
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/status   # 401 ⇒ auth on; 200 ⇒ OPEN spoke (owner for anyone)
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/snapshot # 404 ⇒ auto_snapshot off
```

## Q7. Options matrix

| | (a) Back-end proxy + cache, own charts | (b) iframe `/snapshot` | (c) Screenshot / HTML snapshot | (d) Hive pushes / static export |
|---|---|---|---|---|
| Feasibility evidence | JSON endpoints exist (Q1). No CORS, so a server-side fetch is the only way anyway. Reachable via `host.containers.internal` or `-T` (Q5, tested). cloudflared already exposes `/api/*` | Only `/snapshot` is frameable, and only with `snapshot_frame_ancestors` plus `hub.auto_snapshot`. Needs `/opt/hive` container paths (Q2). Hive is not on the internet: needs a new cloudflared ingress to 3001 | No Hive support. Needs headless Chromium on the server with an owner session. `/snapshot` HTML is the closest built-in | `build-snapshot.mjs` and `publish-snapshot*.sh` exist but push full dashboard HTML to the `kubestellar/docs` repo every 15 min (`systemd/hive-snapshot.timer`) |
| Effort | Medium: one back-end route with an allowlist DTO and cache, one network/env change, front-end charts | Low in code, medium in ops: Hive config, a public tunnel route, plus auth hardening on a now-public Hive | High: browser runtime, image pipeline, auth | Medium–high: a new exporter or changes in Hive (out of repo) |
| Security | Best. Hive stays private. Only allowlisted aggregates leave. The read-only widget token covers `/api/widget/summary`; other non-public routes would need the owner-equivalent `HIVE_DASHBOARD_TOKEN` (Q1), so the recommendation stays within the widget and anonymous routes | Worst. `/snapshot` bakes status, config, audit, contributors and knowledge into public HTML (Q2/Q3). It also puts Hive's port 3001 (and `/api/snapshot`, the full status, unauthenticated) on the internet | Pixels can still leak repo names and titles. Bot holds an owner session | Same leak as (b) unless a custom allowlisted exporter is written |
| Visual control | Full: site styling, theming, accessibility | None: Hive's theme in a frame | Static image | Depends on exporter |
| Freshness | Configurable: 60 s live, 5 min history | Rebuild ≥5 min (values <5 become 15) plus 60 s cache | Capture interval | ≥15 min as shipped. Fails the "≤5 min" requirement unless changed |

## Recommendation

This section was revised after the PR #1047 review and the server checks in
Q6. The earlier version had the back-end hold the owner-equivalent dashboard
token. That is no longer needed.

Build **(a)**: the website back-end fetches Hive server-side, caches it and
serves an allowlisted DTO. The front-end renders its own charts.

**Credential: the read-only widget token, nothing else.**

- Tim mints it once in Hive (`POST /api/widget/token`, an owner action).
  It authenticates only `GET /api/widget/summary` (Q1), so the
  internet-facing back-end can hold it directly. No sidecar is needed.
- Deliver it as `HIVE_WIDGET_TOKEN` through `env.valueFrom.secretKeyRef` with
  `optional: true`. Podman skips an optional reference whose secret is missing
  ([`pkg/specgen/generate/kube/kube.go:1195-1208` at `ced99ac`](https://github.com/podman-container-tools/podman/blob/ced99ac5c929edcd146e80be45f690605b4aa2b4/pkg/specgen/generate/kube/kube.go#L1195-L1208)),
  so the pod still starts without the secret. The widget part then reports
  unavailable.
- The owner `HIVE_DASHBOARD_TOKEN` is not used anywhere.

**Upstream endpoints.** Server-side only, GET only, no visitor input forwarded:

| Endpoint | Auth | Fields to keep | Cache TTL |
|---|---|---|---|
| `GET /api/health` | none | `status === "ok"` | 60 s |
| `GET /api/widget/summary` | `X-Hive-Widget-Token` | `history[]`: `t`, `govMode`, `govIssues`, `govPrs`, `govTotal`, `govHold`, `govActive`, `actionableCount`, `openPrCount`, `mergeableCount`. `agents[]`: counts per `state`. Drop `hiveId`, `history[].repos`, `agentStats`, `agents_kicked`, agent names | 60 s |
| `GET /api/contribute/metrics` | none | `collected_at`, `tasks_done[]`, `fleet_size[]`, `queue_depth[]`. Drop `per_user_done` (GitHub logins) and any `per_user_*` | 180 s |
| `GET /api/contribute/run-stats` | none | `window_days`, `total`, per backend `{backend, total, completed, failed, abandoned, duration_p50_s, duration_p95_s}`. Show percentiles per backend only | 180 s |

Optional, needs an owner decision:

- `/api/contribute/effective-models` (per-model runs, PRs, merged PRs,
  first-pass merge rate). It reveals which providers are paid for.
- `/api/leaderboard` `agents[]` (agent account usernames and avatars, tasks
  completed).

Dropped from the earlier recommendation because they need the owner token:

- `/api/status`
- `/api/pr-throughput`: PR throughput, who merged, time to merge
- `/api/timeseries`: tokens
- `/api/trend/history`
- the ACMM level

Getting them would need either an owner-token sidecar or Hive widening the
widget scope upstream.

Still not consumed: `/api/snapshot`, `/api/events`, `/metrics`, cost
endpoints.

**Website endpoint.**

- Add `GET /api/hive/metrics` to the Fastify back-end. A single-flight
  in-memory cache with the TTLs above sits in front.
- On an upstream failure it serves the last good value, marked stale.
- Upstream load is independent of visitor count: 2 calls per minute, plus 2
  calls every 3 minutes.

**Network: no change** (verified from inside the production pod, Q6).

- Set `HIVE_BASE_URL=http://host.containers.internal:3001` in
  `deploy/kube/prod.yaml`.
- Do not use `-T`, `hostNetwork`, `--map-gw` or `hive.network`.

**Poll interval.**

- Front-end: every **60 s** while the tab is visible.
- Worst case from Hive to screen: about 150 s for the widget data and about
  270 s for the hourly contributor series. Both are under 5 minutes.
- `history` itself gains one point per governor eval (300 s by default, Q4).
  Hourly series gain one point per hour.
