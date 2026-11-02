# Agentic Tab: Pairing the Canyon and the Metrics

Issue: #1046. The canyon ([`2026-11-02-agentic-canyon-animation-design.md`](2026-11-02-agentic-canyon-animation-design.md))
and the live metrics ([`2026-11-02-agentic-hive-metrics-design.md`](2026-11-02-agentic-hive-metrics-design.md)) are
separate designs and ship separately. Each works on its own. This note lists optional ways to make them read as one
page, ranked by how much they couple the two. Each is its own small issue after both base designs ship, so dropping
one costs nothing.

## Recommended

| # | Pairing | What it does | Coupling | Why |
| --- | --- | --- | --- | --- |
| 1 | **Bedrock hand-off** | The last stratum card (Agents · Hive) ends with "This layer is live ↓", an in-page link to the metrics section. The honey bedrock colour (`#BE9207`) becomes the accent of the "Agents running" tile and the contributor bars. | None at runtime: one link and one shared colour token | The story ends on Hive and the metrics start on Hive. This is the cheapest way to make the scroll feel continuous. |
| 2 | **Night-to-page fade** | The canyon's night sky fades into `--site-page-bg` over its last ~30svh (already in the canyon spec), and the metrics section's first row starts inside that fade. | Layout only | Avoids a hard edge between a fixed-palette scene and a themed section, in both light and dark mode. |
| 3 | **Stars are tasks** | At night, the number of stars equals the tasks contributor agents completed in the last 24 hours (sum of the last 24 `contributors.tasksPerHour` buckets), capped at ~60. Without metrics, the scene shows its default stars. | Canyon reads one number from the metrics API | A real number hidden in the art, true to `BRANDING.md` ("no invented metrics"). It uses the anonymous data, so it works even before the widget token exists. Degrades silently. |

## Worth trying, with care

| # | Pairing | What it does | Risk |
| --- | --- | --- | --- |
| 4 | **Bees over the canyon** | One small cartoon bee per running agent (`hive.agents.running`) drifts over the gorge at night. | Motion budget (must stop under reduced motion). It needs the widget token, so the canyon depends on live data being reachable. |
| 5 | **Honeycomb tiles** | The four KPI tiles use a hexagon outline (CSS `clip-path`) echoing the bedrock pattern. | Hexagons waste space on phones and make text fitting harder; keep rectangles below `sm`. |
| 6 | **Stratum colours on metric cards** | Each metric card gets a 4 px top edge in the colour of the stratum it relates to (Delivery → magenta-700 for the queue, Agents → honey for agent counts). | Weak mapping for some cards; needs a 3:1 check against both wells. |

## Not recommended

- **Water level = backlog.** Letting the open-work count set the final water level breaks the scroll mechanic (the
  water must be driven by scroll alone, or the reveal thresholds stop matching the text).
- **Sun position = server clock.** Fun once, confusing after: the scroll already owns time of day.
- **Embedding Hive's own dashboard styling.** Hive's dashboard cannot be framed (research Q2), and copying its look
  would undo the "clear departure, same family" balance.
