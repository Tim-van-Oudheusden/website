# Server Deployment Runbook

Single-host, rootless-Podman deployment of the website. Everything is driven by
`podman kube play`; exposure is via a Cloudflare Tunnel (no inbound ports);
updates are a GHCR pull-timer. No secrets belong in this repo or in any image.

Related decisions: see the epic #270 (pure Podman + Cloudflare Tunnel).

---

## Topology

| Concern | Choice |
|---|---|
| Host | one physical machine, rootless Podman (systemd **user** units) |
| App | `podman kube play --network pasta:--host-lo-to-ns-lo deploy/kube/prod.yaml` — pod `website`, published on loopback only: front-end `127.0.0.1:8300`, back-end `127.0.0.1:8301` (in-pod ports 3000/3001) |
| Images | `ghcr.io/tim-van-oudheusden/website/{front-end,back-end}` (private; `:latest` advances only after green CI) |
| Exposure | Cloudflare Tunnel (edge TLS; origin is plain HTTP, unreachable from the LAN) |
| Updates | `website-update.timer` every 5 min: pull `:latest`, replay the pod only when an image changed |
| Secrets | tunnel token: `~/.config/cloudflared/cloudflared.env` (`0600`); GHCR pull token: `~/.config/containers/auth.json` (`0600`) |

Prerequisites: Podman 5.x with a `pasta` build that supports
`--host-lo-to-ns-lo` (check `pasta --help | grep host-lo-to-ns-lo`), user lingering (`loginctl enable-linger`). All
commands run as the service user (not root). The `cloudflared` binary is
optional — §2 shows how to run it from the image on immutable hosts.

The host needs no clone of this repo: only `deploy/kube/prod.yaml` and
`deploy/systemd/website-update.sh` are read at run time, from `WEBSITE_REPO`
(default `~/Git/website`). A minimal host keeps just those two files at the
same relative paths, e.g. under `~/.config/website`.

---

## 0. GHCR pull credentials

The images are private. Create a **classic** PAT with only `read:packages`
(GHCR rejects fine-grained tokens), then log in with an auth file that
survives reboots (the default `$XDG_RUNTIME_DIR` one is tmpfs; podman falls
back to `~/.config/containers/auth.json` when reading):

```bash
podman login --authfile ~/.config/containers/auth.json -u <github-user> ghcr.io
chmod 600 ~/.config/containers/auth.json
```

If `CONTAINER_HOST` is exported in your shell, prefix `env -u CONTAINER_HOST`
so the login is written locally rather than via the remote socket.

---

## 1. Deploy the app pod (`prod.yaml`)

The pod is managed by the `podman-kube@.service` systemd **user** template
(`deploy/systemd/podman-kube@.service`) so it reboots with the machine. Install
it and start the pod:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/systemd/podman-kube@.service ~/.config/systemd/user/
```

The unit locates the manifest via `WEBSITE_REPO` (default `%h/Git/website` —
the repository at `~/Git/website`). `website-update.service` reads its helper
from the same variable, so if the files live elsewhere override **both** units
with identical drop-ins:

```bash
for unit in podman-kube@.service website-update.service; do
  mkdir -p ~/.config/systemd/user/$unit.d
  printf '[Service]\nEnvironment=WEBSITE_REPO=%%E/website\n' \
    > ~/.config/systemd/user/$unit.d/override.conf
done
```

Then enable and start the pod:

```bash
systemctl --user daemon-reload
systemctl --user enable --now podman-kube@website.service
curl -fsS http://127.0.0.1:8301/health   # back-end: {"status":"ok",...}
curl -fsS http://127.0.0.1:8300/health   # front-end: {"status":"ok",...}
```

The instance name `website` is the pod's name in `deploy/kube/prod.yaml`; the
template always plays that manifest. `RemainAfterExit=yes` keeps the one-shot
"active" so `website-update.service` can `restart` it to activate a new image,
and `WantedBy=default.target` makes `enable` rebuild the pod on session start.

The front-end container runs a small Bun server (`front-end/server/`). It
serves the build, and for `/articles/<slug>` it fetches that article from the
back-end over the pod's loopback (`127.0.0.1:3001`, 2 s timeout) to inject
link-preview (Open Graph) tags and `BlogPosting` structured data (JSON-LD). If
the back-end is down, pages still load, just without previews. Check a preview
on the host:

```bash
curl -s http://127.0.0.1:8300/articles/introduction | grep 'og:'
```

A URL that names no page gets the app shell with status `404` and
`<meta name="robots" content="noindex" />`, so search engines drop it instead
of indexing a "not found" page. That covers a path no client route matches
(`/blog/foo`) and an article or project slug the back-end answers with a `404`
(removed content, or a slug from the other section). If the back-end is down or
rate-limits the lookup, the page is still served as a `200`, so an outage never
de-indexes real pages. Check on the host:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8300/articles/no-such-article   # 404
```

The template plays the pod with `--network pasta:--host-lo-to-ns-lo`. With
that option, connections to the loopback-published ports arrive on the pod's
own loopback. The back-end therefore sees cloudflared as `127.0.0.1`, which is
the only peer it trusts for `CF-Connecting-IP`. On kube play's default bridge
network (`podman-default-kube-network`) it would see a pod-network address
(`10.89.x.x`) instead, and every visitor would share one rate-limit bucket
(#479). To check that per-client keying
works on the host:

```bash
for i in $(seq 1 55); do
  curl -s -o /dev/null -w '%{http_code}\n' -H "CF-Connecting-IP: 192.0.2.$i" http://127.0.0.1:8301/api/hello
done | sort | uniq -c   # all 200; the same IP 55 times yields 429s after 50
```

### Content view counts

The back-end counts article and project opens without cookies or visitor data.
The site POSTs `/api/views/<slug>` when an article or project is shown; only
slugs that exist in the content are counted. `/views` returns only the slug,
so article and project slugs appear mixed together in the same list. Counts are stored per slug and day in SQLite at
`VIEWS_DB_PATH` (`/data/views.sqlite` in the pod). `/data` is a `hostPath`
volume, which `kube play` creates next to the manifest
(`deploy/kube/website-data/`, git-ignored), so counts survive pod replays and
image updates. Read them on the host; `/views` answers loopback callers only
and the tunnel does not forward it:

```bash
curl -s http://127.0.0.1:8301/views   # [{"slug":"introduction","date":"2026-10-08","count":3}, ...]
```

### Request and process metrics

The back-end serves Prometheus text at `/metrics`. Like `/views`, it answers
loopback callers only (anyone else gets `404`) and the tunnel does not forward
it. It exposes:

- `http_requests_total` (counter, by `method`, `route`, `status`) and
  `http_request_duration_seconds` (histogram, by `method`, `route`). `route` is
  the matched route pattern, such as `/api/content/:slug`, not the raw path.
  A series appears only after its route has been hit.
- `process_uptime_seconds`, `process_resident_memory_bytes`,
  `nodejs_heap_size_used_bytes` and `nodejs_heap_size_total_bytes` (unlabeled
  gauges).

Everything is held in memory, so the counters reset when the back-end restarts.
Scrape it on the host:

```bash
curl -s http://127.0.0.1:8301/metrics
```

---

## 2. Cloudflare Tunnel

The connector runs as the rootless Quadlet `cloudflared.container`
(`deploy/cloudflared/`). Its ingress rules are local (`config.yml`) and
published by the host-side token. Host-side files live in
`~/.config/cloudflared/` (directory `0700`).

On hosts without the binary (e.g. Fedora CoreOS), run it from the image. The
image runs as uid 65532 (`nonroot`); `keep-id` maps that to your user so it can
write the login cert and tunnel credentials into `~/.config/cloudflared`. No
`-t`: a TTY would append `\r` to the token piped into the env file below.

```bash
install -d -m 700 ~/.config/cloudflared
alias cloudflared='podman run --rm -i --userns=keep-id:uid=65532,gid=65532 -v ~/.config/cloudflared:/home/nonroot/.cloudflared:z docker.io/cloudflare/cloudflared:latest'
```

```bash
# one-time browser auth; pick the zone that will serve the site
cloudflared tunnel login

# create a LOCALLY managed tunnel (ingress rules come from config.yml)
cloudflared tunnel create website

# point DNS at the tunnel (repeat for each hostname)
cloudflared tunnel route dns website example.com
cloudflared tunnel route dns website www.example.com

# emit the tunnel credentials and store them host-only, never in the repo/image
cloudflared tunnel token website | sed 's/^/TUNNEL_TOKEN=/' > ~/.config/cloudflared/cloudflared.env
chmod 600 ~/.config/cloudflared/cloudflared.env

# install the Quadlet + ingress config
mkdir -p ~/.config/containers/systemd
cp deploy/cloudflared/cloudflared.container ~/.config/containers/systemd/cloudflared.container
cp deploy/cloudflared/config.yml ~/.config/cloudflared/config.yml

systemctl --user daemon-reload
systemctl --user start cloudflared.service
```

Quadlet units are generated: `[Install]` starts them at boot, and
`systemctl --user enable` does not apply. To install the Quadlet before a token
exists, `systemctl --user mask cloudflared.service` keeps it from starting (and
failing on the missing env file) at boot; `unmask` it once the env file exists.

Check the rules against the installed config without a tunnel (with the alias,
cloudflared finds `config.yml` in its mounted `~/.cloudflared`; a native binary
needs `--config ~/.config/cloudflared/config.yml` after `tunnel`):

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://example.com/api/health   # → http://127.0.0.1:8301
```

`AutoUpdate=registry` only acts when podman's user auto-update timer runs. It
is not enabled by default; enabling it updates **every** container carrying
the `io.containers.autoupdate` label on the host, not just cloudflared:

```bash
systemctl --user enable --now podman-auto-update.timer
```

Without it, update cloudflared manually: `podman pull
docker.io/cloudflare/cloudflared:latest && systemctl --user restart cloudflared.service`.

Bot mitigation is configured in the Cloudflare dashboard (Super Bot Fight Mode
/ a WAF rule scoped to these hostnames). There is no CLI step in this repo for
it — it is a dashboard operation, and the tunnel's ingress config excludes no
paths by design (Cloudflare handles bot scoring at the edge).

---

## 3. Update pull-timer

Install the units that advance `:latest` and (only when an image changed)
replay the pod:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/systemd/website-update.service ~/.config/systemd/user/
cp deploy/systemd/website-update.timer ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now website-update.timer
```

The timer fires every 5 minutes (`Persistent=true`). The service compares the
image digest before/after each pull and restarts `podman-kube@website` only when
a digest changed — the common "no new image" cycle causes zero downtime.

---

## 4. Rollback

**Automatic:** `website-update.sh` already guards against this for the common
case. Before pulling, it tags whatever image is currently running as a local
`:rollback` reference; after replaying the pod on a digest change, it polls
both containers' `/health` endpoints for ~20s. If either never comes up
healthy, it re-tags `:rollback` onto `:latest`, replays the pod again, and
exits non-zero — check `systemctl --user status website-update.service` /
`journalctl --user -u website-update.service` after an incident to see
whether this already happened.

The rolled-back digest is then remembered as rejected, in
`${XDG_STATE_HOME:-~/.local/state}/website-update/rejected-<image>`. Until a
new digest is pushed, later ticks keep the rollback image, skip the replay, and
exit non-zero with `still rejected: <image>:latest <digest>` in the journal.
They don't redeploy the bad image every 5 minutes. To retry the same digest
(for example after fixing something on the host), delete that file.

**Manual:** needed when the bad image has survived past the next update cycle
(so the local `:rollback` tag has been overwritten by a newer pull) or when
rolling back further than one release. Pull a known-good immutable tag and
point the pod manifest at it, then replay:

```bash
podman pull ghcr.io/tim-van-oudheusden/website/front-end:<git-sha>
podman pull ghcr.io/tim-van-oudheusden/website/back-end:<git-sha>

# edit ${WEBSITE_REPO}/deploy/kube/prod.yaml: replace :latest with :<git-sha> for both images,
# then replay the (now updated) manifest:
systemctl --user restart podman-kube@website.service
```

To return to tracking `:latest`, revert the two image refs in `prod.yaml` and
restart again.

Once the incident is over, consider writing it up — see
[`docs/postmortems/README.md`](postmortems/README.md), especially if the
automatic rollback above fired or a manual rollback was needed.

---

## 5. Secret handling

- The tunnel token lives exclusively in `~/.config/cloudflared/cloudflared.env`
  (`0600`, host-only). It is referenced by the Quadlet via `EnvironmentFile`;
  it is never inlined, never committed, and never baked into an image.
- The GHCR pull token (classic PAT, `read:packages` only) lives exclusively in
  `~/.config/containers/auth.json` (`0600`, host-only).
- `deploy/cloudflared/config.yml` is checked in and contains no secret material
  (the `deploy-config.test.ts` test enforces this).