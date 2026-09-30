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
| App | `podman kube play deploy/kube/prod.yaml` — pod `website` (front-end `:3000`, back-end `:3001`) |
| Images | `ghcr.io/tim-van-oudheusden/website/{front-end,back-end}` (`:latest` advances only after green CI) |
| Exposure | Cloudflare Tunnel (edge TLS; origin is plain HTTP) |
| Updates | `website-update.timer` every 5 min: pull `:latest`, replay the pod only when an image changed |
| Secrets | tunnel token lives only on the host (`~/.cloudflared/cloudflared.env`, mode `0600`) |

Prerequisites: Podman 5.x, the `cloudflared` binary, and this repo cloned at
`~/website`. All commands run as the service user (not root).

---

## 1. Deploy the app pod (`prod.yaml`)

The pod is managed by the `podman-kube@.service` systemd **user** template
(`deploy/systemd/podman-kube@.service`) so it reboots with the machine. Install
it and start the pod:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/systemd/podman-kube@.service ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now podman-kube@website.service
curl -fsS http://localhost:3001/health   # {"status":"ok",...}
```

The instance name `website` is the pod's name in `deploy/kube/prod.yaml`; the
template always plays that manifest. `RemainAfterExit=yes` keeps the one-shot
"active" so `website-update.service` can `restart` it to activate a new image,
and `WantedBy=default.target` makes `enable` rebuild the pod on session start.

---

## 2. Cloudflare Tunnel

The connector runs as the rootless Quadlet `cloudflared.container`
(`deploy/cloudflared/`). Its ingress rules are local (`config.yml`) and
published by the host-side token.

```bash
# create a LOCALLY managed tunnel (ingress rules come from config.yml)
cloudflared tunnel create website

# point DNS at the tunnel (repeat for each hostname)
cloudflared tunnel route dns website example.com
cloudflared tunnel route dns website www.example.com

# emit the tunnel credentials and store them host-only, never in the repo/image
mkdir -p ~/.cloudflared
cloudflared tunnel token website | sed 's/^/TUNNEL_TOKEN=/' > ~/.cloudflared/cloudflared.env
chmod 600 ~/.cloudflared/cloudflared.env

# install the Quadlet + ingress config
mkdir -p ~/.config/containers/systemd
cp deploy/cloudflared/cloudflared.container ~/.config/containers/systemd/cloudflared.container
cp deploy/cloudflared/config.yml ~/.cloudflared/config.yml

systemctl --user daemon-reload
systemctl --user enable --now cloudflared.service
```

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

Pull a known-good immutable tag and point the pod manifest at it, then replay:

```bash
podman pull ghcr.io/tim-van-oudheusden/website/front-end:<git-sha>
podman pull ghcr.io/tim-van-oudheusden/website/back-end:<git-sha>

# edit deploy/kube/prod.yaml: replace :latest with :<git-sha> for both images,
# then replay the (now updated) manifest:
systemctl --user restart podman-kube@website.service
```

To return to tracking `:latest`, revert the two image refs in `prod.yaml` and
restart again.

---

## 5. Secret handling

- The tunnel token is the only secret. It lives exclusively in
  `~/.cloudflared/cloudflared.env` (`0600`, host-only).
- It is referenced by the Quadlet via `EnvironmentFile`; it is never inlined,
  never committed, and never baked into an image.
- `deploy/cloudflared/config.yml` is checked in and contains no secret material
  (the `deploy-config.test.ts` test enforces this).