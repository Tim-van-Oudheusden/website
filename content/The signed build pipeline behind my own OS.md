---
title: The signed build pipeline behind my own OS
slug: the-signed-build-pipeline-behind-my-own-os
description: How a commit becomes a signed operating system image that a console will accept, with pins in one file, two channels and VM tests that boot, update and roll back.
type: article
category: Linux
date: 2026-11-18
draft: false
tags:
  - bootc
  - containers
  - Github
  - Actions
  - Fedora
---
# From user to maintainer
A while ago I wrote that [my operating system is a container image, yes, really](/articles/my-operating-system-is-a-container-image-yes-really). Bazzite on the desktop, Bluefin on the laptop, and somebody else at [Universal Blue](https://universal-blue.org) doing the hard work of building and shipping those images. I still am a happy user of both till this day

Yet I created [Pindu OS](/projects/pindu-os) and with that I moved to the other side of that deal. It is my own image on [Fedora bootc](https://bootc-dev.github.io/bootc/), meant to boot a PC straight into [Pindu launcher](/projects/pindu-launcher). A simple project that is mostly intended for personal use, and more importantly to learn and understand the technology, so I can contribute back to what I love. 

This article is about the part you never see as an end user: how a commit turns into an image, and why a console should trust that image enough to install it on its own.

# Every input in one file
Nothing is compiled in this repository. Instead, the base image, launcher, optional kernel, and all tools used to build and validate the image are prebuilt (I don't have the hardware to build my own kernel in a reasonable time anyway 💀).

Everything is pinned in [`image.env`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/image.env):

- **Container images** are pinned by digest.
- **The launcher** is pinned by version and SHA-256 checksum.

The scripts, `Justfile`, and GitHub Actions workflows all read their versions from `image.env` rather than hard-coding them. This keeps everything consistent and makes changes easy to track: a diff of `image.env` shows exactly which components have changed.

```bash
BASE_IMAGE=quay.io/fedora/fedora-bootc:45@sha256:1989dd92...
LAUNCHER_VERSION=0.4.1
LAUNCHER_SHA256=99602e40...
```

[Renovate](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/renovate.json5) opens the pull requests that move those pins, like [this grouped bump](https://github.com/Tim-van-Oudheusden/pindu-os/pull/21) of the Fedora base and the kernel modules image, or [the launcher going to 0.4.1](https://github.com/Tim-van-Oudheusden/pindu-os/pull/27).

Before every build, [`just verify-inputs`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/Justfile) checks the pins against the outside world: every image digest still resolves to an amd64 image, the base really is a Fedora 45 bootc image, the kernel modules image carries Universal Blue's signature, and the launcher RPM on GitHub Releases matches its SHA-256.

# Pull requests never touch a secret
The repository is public, so anyone can open a pull request, and a pull request can change the workflows it runs. The rule for this is quite simple: code from a pull request never runs in a job that holds a secret or a write token.

- [`pr.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/pr.yml) lints, builds both variants and boot-tests them, with a read-only token, no secrets and no registry login.
- [`build.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/build.yml) only runs on `main`, on a schedule or by hand. The signing key lives in a `signing` environment that only `main` may use.
- Every action is pinned by commit SHA, every workflow starts from read-only permissions, and `just lint` runs [actionlint](https://github.com/rhysd/actionlint) and [zizmor](https://github.com/zizmorcore/zizmor) over the workflows.

# Signed, and a device that says no
Every image `build.yml` pushes gets signed with [cosign](https://github.com/sigstore/cosign), on its digest, with a key I made once and keep offline ([runbook, "Signing key"](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#signing-key-person)). The public half is committed as [`cosign.pub`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/cosign.pub) and baked into the image. If that file is missing, or differs from the copy in the image, `build.yml` refuses to publish at all.

A signature only matters if something checks it. On the device that is the container signature policy, [`policy.json`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/etc/containers/policy.json):

```json
"ghcr.io/tim-van-oudheusden/pindu-os": [
    {
        "type": "sigstoreSigned",
        "keyPath": "/etc/pki/containers/pindu-os.pub",
        "signedIdentity": { "type": "matchRepository" }
    }
]
```

Together with a [`registries.d` entry](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/etc/containers/registries.d/pindu-os.yaml) that tells the container tools to look for the signature next to the image, this makes every pull from the Pindu OS repositories require my signature. Everything else keeps the base image's policy, which a [container test](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/container/trust.sh) checks rule by rule.

# Two channels and a button with a reviewer
`build.yml` runs on every push to `main` that changes more than docs, once a day to pick up Fedora updates, and by hand. Each run pushes two tags for each variant:

- `:testing`, the moving tag testers follow;
- an immutable `45.YYYYMMDD.N`, copied with `skopeo copy --preserve-digests` so it is the same manifest, not a second push that could differ.

Getting to `:stable` is a separate workflow, [`promote.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/promote.yml), and it rebuilds nothing. It resolves the tag to a digest once, so a build that moves `:testing` halfway cannot swap the image under it, verifies the signature on that digest, copies it to `:stable` and checks that `:stable` now points at the same digest. It runs in a `promote` environment that needs my approval, then builds the qcow2, raw and installer images from the new `:stable`. Taking a bad release back means promoting the previous version tag.

The point of a retag over a rebuild is that `:stable` is byte for byte the image that was tested. A rebuild, even from the same commit, would pull whatever Fedora published that morning.

# Tests that boot, update and roll back
Checking files inside an image only gets you so far. The tests I care about most boot the image in QEMU.

The [boot test](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/guest/boot.sh) runs on every pull request, and again in `build.yml` on a disk built from the **published digest**, not from the local build. Inside the guest it checks that the console user gets a session on its own, the launcher runs, PipeWire and WirePlumber are up, the keyring opens without a prompt, the launcher may start the rollback unit and nothing else, and the session comes back after the launcher is killed. The host takes a screenshot as well.

The [update test](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/update.sh) verifies the full update and rollback process across four boots.

It starts by launching a temporary container registry on the host and serving the current image as version N. Once the guest is running N, the test builds and pushes an updated image (N+1) containing a marker file to distinguish it from the original.

[Inside the guest](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/guest/update.sh), the update service must download and stage N+1 **without rebooting**. By default, the update service reboots automatically after downloading an update, but Pindu OS [overrides this behavior](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/usr/lib/systemd/system/bootc-fetch-apply-updates.service.d/10-stage-only.conf) to prevent the console from unexpectedly restarting in the middle of a game.

On the next boot, the guest must be running N+1. The test then triggers a rollback using the same mechanism as the launcher's system panel and verifies that the guest returns to N.

Unlike the boot test, the update test is not yet part of a GitHub Actions workflow (haven't fully figured that one out yet). For now, it runs locally using `just test-update` (see the [runbook's "Local checks" section](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#local-checks)).

A third test, [`tests/vm/install.sh`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/install.sh), verifies that Pindu OS can be installed from the installer ISO onto an empty disk. The [disk images workflow](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/disk.yml) runs this test alongside the boot test, which checks the resulting qcow2 image, every time a new set of disk images is built.

# What I learned building it
I'm going to be honest, I have poked around in the source code of Bazzite and Bluefin, and it felt like some arcane knowledge. But part of that was the gigantic monocontainerfile monstrosity Bazzite was using. They've made some great improvements in splitting it up, and now it has become much more understandable. By the time I got to working on my own repository that arcane feeling had already mostly left, and setting it up was honestly not that hard.

Now I fully acknowledge that I skimmed over the hard parts, however that is also the beauty of this technology. I don't need to build my own kernel, I can just import one. I like to describe it with a simple quote: I'm standing on the shoulders of giants. And this has kind of always been the case with container work in my professional live as well, why build your own when you can just `FROM: alpine:latest`?
