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

The host needs no clone of this repo. At run time it reads three files from
`WEBSITE_REPO` (default `~/Git/website`), at their repo paths, e.g. under
`~/.config/website`:

| File | How it gets to the host |
| --- | --- |
| `deploy/kube/prod.yaml` | Copied once by hand for the first play. After that the update timer installs main's copy from the back-end image (§3). |
| `deploy/systemd/website-update.sh` | Copied by hand. The timer reports when it differs from main's (§3). |
| `deploy/systemd/validate-manifest.ts` | Copied by hand, same as the script. |

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
with identical drop-ins. `podman-kube@` also needs the matching
`WorkingDirectory`. `kube play` resolves the manifest's relative
`hostPath: website-data` against its working directory, not the manifest's, and
systemd does not expand `${WEBSITE_REPO}` in `WorkingDirectory` (#1087):

```bash
for unit in podman-kube@.service website-update.service; do
  mkdir -p ~/.config/systemd/user/$unit.d
  printf '[Service]\nEnvironment=WEBSITE_REPO=%%E/website\n' \
    > ~/.config/systemd/user/$unit.d/override.conf
done
printf 'WorkingDirectory=%%E/website/deploy/kube\n' \
  >> ~/.config/systemd/user/podman-kube@.service.d/override.conf
```

Before the first start, create the back-end's data directory and give it to
the container's user. The back-end runs as the image's unprivileged `bun` user
(uid 1000) and writes its view counts to `website-data/` next to the manifest
(see [Content view counts](#content-view-counts)). Under rootless Podman that
uid maps to a subordinate host uid, and a directory `kube play` creates for a
missing `hostPath` belongs to your own user with mode `0755`. The back-end
then cannot create its database and exits at startup. `podman unshare` runs
`chown` inside the pod's user namespace, where uid 1000 is the container's
`bun` (adjust the path if `WEBSITE_REPO` points elsewhere; it must be the
`website-data/` inside the unit's `WorkingDirectory`):

```bash
mkdir -p ~/Git/website/deploy/kube/website-data
podman unshare chown 1000:1000 ~/Git/website/deploy/kube/website-data
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
link-preview (Open Graph) tags and `BlogPosting` structured data (JSON-LD).
The fixed pages get a title, description, canonical URL and preview tags too:
`/agentic` and `/projects` from text in `shared`, `/articles` from the
introduction article, and `/now` and `/uses` from their frontmatter. If the
back-end is down, pages still load, just without previews. Check a preview
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
de-indexes real pages. Each lookup that fails this way, including those for
`/sitemap.xml`, `/llms.txt` and `/feed.xml`, writes one line to the front-end
container's log (`podman logs website-front-end`) such as
`[front-end-server] back-end content item lookup unavailable: TimeoutError: …`.
A refused or timed-out connection never reaches the back-end, so its request
log and `/metrics` cannot show it. Check on the host:

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

#### Backing up and restoring view counts

`website-data/` holds the pod's only state, and nothing backs it up. It is
git-ignored inside the checkout, so `git clean -fdx` there, or replacing the
checkout with a fresh clone, deletes every count.

To back it up, take a copy from the running back-end. SQLite's `VACUUM INTO`
writes a consistent copy while the back-end keeps counting, and refuses to
overwrite an existing file. Then copy it out of the container:

```bash
podman exec website-back-end bun -e 'import { Database } from "bun:sqlite"; new Database("/data/views.sqlite").run("VACUUM INTO '\''/data/views-backup.sqlite'\''")'
mkdir -p ~/backups
podman cp website-back-end:/data/views-backup.sqlite ~/backups/views-$(date +%F).sqlite
podman exec website-back-end rm /data/views-backup.sqlite
```

To restore, stop the update timer first so it cannot replay the pod halfway
through. Remove any journal left beside the old database, since SQLite would
apply it to the restored file. Then copy the backup in as uid 1000, as in §1:

```bash
systemctl --user stop website-update.timer
systemctl --user stop podman-kube@website.service
data=~/Git/website/deploy/kube/website-data
podman unshare rm -f "$data"/views.sqlite-*
podman unshare cp ~/backups/views-<date>.sqlite "$data/views.sqlite"
podman unshare chown 1000:1000 "$data/views.sqlite"
systemctl --user start podman-kube@website.service
systemctl --user start website-update.timer
curl -s http://127.0.0.1:8301/views   # the restored counts
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

### Hive metrics

`GET /api/hive/metrics` feeds the Agentic tab. The back-end fetches, caches and
trims these sources; the browser never calls them:

- Hive's gateway on the host, at `HIVE_BASE_URL`
  (`http://host.containers.internal:3001`): `/api/health`,
  `/api/contribute/metrics` and `/api/contribute/run-stats` (no auth), and
  `/api/widget/summary` with the `X-Hive-Widget-Token` header. The pod reaches
  the host's `*:3001` outbound; no port is published for it.
- GitHub's public REST API: this repository's pull requests, unauthenticated.

`HIVE_WIDGET_TOKEN` is Hive's read-only widget token. `prod.yaml` reads it from
the podman secret `hive-widget-token` (key `token`) with `optional: true`, so
the pod still starts without it; the route then skips the widget call and
answers `hive: null`. The secret was created on the host on 2026-11-02 as a
Kubernetes Secret YAML piped straight into podman, so the token is never in
the repo or on disk (paste the token at the prompt):

```bash
read -rs HIVE_TOKEN
printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: hive-widget-token\nstringData:\n  token: %s\n' "$HIVE_TOKEN" \
  | podman secret create hive-widget-token -
unset HIVE_TOKEN
```

To rotate it, revoke the old token in Hive (`DELETE /api/widget/token`), mint
a new one, then replace the secret and replay the pod:

```bash
podman secret rm hive-widget-token
# create it again as above, with the new token
systemctl --user restart podman-kube@website.service
```

Check it end to end. Expect `"live"`; `"stale"` means a cached answer is over
10 minutes old, and `"unavailable"` means no source has answered yet:

```bash
curl -s https://buildwithtim.dev/api/hive/metrics | jq .state
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
a digest changed — the common "no new image" cycle causes zero downtime. Each
replay logs `image changed: <image>:latest <old digest> -> <new digest>`, and
CI pushes every image under its `:<git-sha>` tag too, so the journal shows which
commit went live.

**The manifest comes with the back-end image (#1088).** CI builds both images
from one commit, and the back-end image carries that commit's `deploy/` files
under `/opt/website/deploy`. When the back-end digest changes, the service:

1. copies `prod.yaml` out of the new image. An image built before #1088 has
   none, and the installed manifest stays;
2. checks it with the host's `validate-manifest.ts`, run by `bun` from the
   *previously running* back-end image with no network, so the new image
   supplies the manifest but none of the code that judges it. The check refuses:
   - another pod name, or any annotations;
   - host network, PID or IPC;
   - images outside `ghcr.io/tim-van-oudheusden/website/`;
   - privileged containers, privilege escalation or added capabilities. Like
     host network, PID and IPC, `privileged` and `allowPrivilegeEscalation`
     pass only when absent or exactly `false`: podman reads `!!bool "true"` as
     true where Bun reads a string (#1118);
   - a pod-level `securityContext`, or a container `securityContext` key other
     than `privileged`, `allowPrivilegeEscalation`, `capabilities`,
     `readOnlyRootFilesystem` and `runAsNonRoot` (so no `seLinuxOptions`,
     `runAsUser`, `procMount` or `seccompProfile`);
   - a volume mount with `mountPropagation`;
   - host ports not bound to `127.0.0.1`;
   - volumes other than the `website-data` hostPath or an `emptyDir`;
   - secrets other than `hive-widget-token`;
   - a list field (`containers`, `initContainers`, `volumes`, `ports`,
     `volumeMounts`, `env`, `capabilities.add`) given as anything but a list,
     which the check would otherwise skip unseen (#1117);
   - any key, at any depth, outside the check's two key lists. The check does
     not guess what an unknown key means: podman matches keys ignoring case and
     reads tagged and explicit keys that Bun reads as something else (#1118,
     #1210), and fields such as `subPath` or `volumeDevices` have no rule of
     their own;
3. installs it over `${WEBSITE_REPO}/deploy/kube/prod.yaml` and replays.

A new field in `prod.yaml` therefore also needs adding to `INERT_KEYS` in
`validate-manifest.ts`, once it is known to ask nothing of the host, and the
host copy needs updating before that manifest ships.

A manifest that fails the check logs `manifest REJECTED` and the reasons, and
rejects the new images like a failed health check (§4), without replaying. On a
first deploy, with no previous back-end image to run the check with, or without
a host copy of `validate-manifest.ts`, the installed manifest stays.

The service never installs its own script, the checker or the units from an
image: a broken updater could not roll itself back. When a host copy differs
from main's copy in the image, the journal says
`drift: <file> differs from main's copy in the image`. Copy that file from
the repo by hand (and `systemctl --user daemon-reload` for a unit).

---

## 4. Rollback

**Automatic:** `website-update.sh` already guards against this for the common
case. Before pulling, it tags whatever image is currently running as a local
`:rollback` reference; after replaying the pod on a digest change, it polls
both containers' `/health` endpoints for ~20s. If the replay itself fails
(`podman kube play` could not start a container) or either container never
comes up healthy, it re-tags `:rollback` onto `:latest`, puts back the manifest
it replaced (if it installed one this run, from
`${XDG_STATE_HOME:-~/.local/state}/website-update/prod.yaml.previous`), replays
the pod again, and exits non-zero — check
`systemctl --user status website-update.service` /
`journalctl --user -u website-update.service` after an incident to see
whether this already happened. Each image rolled back is logged as
`rejected: <image>:latest <digest>`.

The rollback replay runs the re-tagged image because both containers in
`prod.yaml` set `imagePullPolicy: IfNotPresent`. Without it, `kube play` pulls
a `:latest` image whenever the registry digest differs from the local one, so
the replay would start the rejected image again (#948). The same setting means
a pod restart or a reboot runs whatever image is local. Only the timer pulls a
new image, and it health-checks what it deploys. On a host with no local
image, the first play still pulls one.

The rolled-back digest is then remembered as rejected, in
`${XDG_STATE_HOME:-~/.local/state}/website-update/rejected-<image>`. Until a
new digest is pushed, later ticks keep the rollback image, skip the replay, and
exit non-zero with `still rejected: <image>:latest <digest>` in the journal.
They don't redeploy the bad image every 5 minutes. To retry the same digest
(for example after fixing something on the host), delete that file.

That file can outlive the image it rejected (after `podman rmi`, `podman system
reset`, or a host rebuild that kept `~/.local/state`). Then there is no previous
image to hold the rejected digest back with, so it stays on `:latest`. The tick
logs `no previously running <image> image to hold back <digest>`, doesn't
replay the pod even when the other image changed, and exits non-zero. It keeps
doing so until a new digest is pushed or the file is deleted.

**Manual:** needed when the bad image has survived past the next update cycle
(so the local `:rollback` tag has been overwritten by a newer pull) or when
rolling back further than one release. Pull a known-good immutable tag and
point the pod manifest at it, then replay:

```bash
# Stop the timer first: a new back-end image would otherwise install main's
# manifest over the pinned one.
systemctl --user stop website-update.timer

podman pull ghcr.io/tim-van-oudheusden/website/front-end:<git-sha>
podman pull ghcr.io/tim-van-oudheusden/website/back-end:<git-sha>

# edit ${WEBSITE_REPO}/deploy/kube/prod.yaml: replace :latest with :<git-sha> for both images,
# then replay the (now updated) manifest:
systemctl --user restart podman-kube@website.service
```

To return to tracking `:latest`, revert the two image refs in `prod.yaml`,
restart again, and `systemctl --user start website-update.timer`.

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
- The Hive widget token (read-only) lives exclusively in the podman secret
  `hive-widget-token`; see [Hive metrics](#hive-metrics).
- `deploy/cloudflared/config.yml` is checked in and contains no secret material
  (the `deploy-config.test.ts` test enforces this).