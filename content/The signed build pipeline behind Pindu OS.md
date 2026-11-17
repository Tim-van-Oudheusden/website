---
title: The signed build pipeline behind Pindu OS
slug: the-signed-build-pipeline-behind-pindu-os
description: How a commit becomes a signed operating system image that a console will accept, with pins in one file, two channels and VM tests that boot, update and roll back.
type: article
category: Linux
# TIM: placeholder date, set the real one before merging. Local dev and the e2e pod show drafts, so a
# newer date would put this draft on the home page's recent-posts strip and push published articles off it.
date: 2025-01-01
# TIM: drafts block the site's release job (docs/content-authoring.md); set false or remove before merging.
draft: true
tags:
  - Pindu OS
  - bootc
  - Fedora
  - cosign
  - GitHub Actions
---
# From user to maintainer
A while ago I wrote that [my operating system is a container image, yes, really](/articles/my-operating-system-is-a-container-image-yes-really). Back then I was a happy user: Bazzite on the desktop, Bluefin on the laptop, and somebody else at [Universal Blue](https://universal-blue.org) doing the hard work of building and shipping those images.

With [Pindu OS](/projects/pindu-os) I moved to the other side of that deal. It is my own image on [Fedora bootc](https://bootc-dev.github.io/bootc/), meant to boot a PC straight into [Pindu launcher](/projects/pindu-launcher). The project page covers what it does. This article is about the part you never see as a user: how a commit turns into an image, and why a console should trust that image enough to install it on its own.

<!-- TIM: a sentence or two on why you wanted your own image instead of a Universal Blue variant, in your own words. -->

The short version: one [`Containerfile`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/Containerfile), every input pinned in one file, every published image signed, a device that refuses anything unsigned, two channels with a reviewed step between them, and tests that boot the image in a VM, update it and roll it back.

# Every input in one file
Nothing is compiled in the repository. The base image, the launcher, the optional kernel and every tool that builds or checks the image are prebuilt, and all of them are pinned in [`image.env`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/image.env): container images by digest, the launcher by version and SHA-256. The scripts, the `Justfile` and the workflows read that file and never hard-code a version, so a diff of `image.env` explains any change in the image.

```bash
BASE_IMAGE=quay.io/fedora/fedora-bootc:45@sha256:1989dd92...
LAUNCHER_VERSION=0.4.1
LAUNCHER_SHA256=99602e40...
```

[Renovate](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/renovate.json5) opens the pull requests that move those pins, like [this grouped bump](https://github.com/Tim-van-Oudheusden/pindu-os/pull/21) of the Fedora base and the kernel modules image, or [the launcher going to 0.4.1](https://github.com/Tim-van-Oudheusden/pindu-os/pull/27).

Before every build, [`just verify-inputs`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/Justfile) checks the pins against the outside world: every image digest still resolves to an amd64 image, the base really is a Fedora 45 bootc image, the kernel modules image carries Universal Blue's signature, and the launcher RPM on GitHub Releases matches its SHA-256.

That check has already earned its place. The scheduled builds on [16 November](https://github.com/Tim-van-Oudheusden/pindu-os/actions/runs/43870292730) and [17 November](https://github.com/Tim-van-Oudheusden/pindu-os/actions/runs/44093854219) both stopped at "Verify the pinned inputs", because the pinned Fedora base digest answered `manifest unknown`: the registry no longer served it. In between, Renovate's [bump](https://github.com/Tim-van-Oudheusden/pindu-os/pull/21) had moved the pin to a new digest, and a day later that one was gone too. Nothing was built and nothing was published. The [runbook](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#what-a-build-publishes) lists exactly this failure, with the fix: merge or trigger the Renovate bump.

<!-- TIM: how you feel about a daily build that fails whenever Fedora prunes a digest; is a daily red build acceptable, or is this a follow-up? -->

# Pull requests never touch a secret
The repository is public, so anyone can open a pull request, and a pull request can change the workflows it runs. The rule from [decision 0009](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0009-runners.md) is simple: code from a pull request never runs in a job that holds a secret or a write token.

- [`pr.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/pr.yml) lints, builds both variants and boot-tests them, with a read-only token, no secrets and no registry login.
- [`build.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/build.yml) only runs on `main`, on a schedule or by hand. The signing key lives in a `signing` environment that only `main` may use.
- Every action is pinned by commit SHA, every workflow starts from read-only permissions, and `just lint` runs [actionlint](https://github.com/rhysd/actionlint) and [zizmor](https://github.com/zizmorcore/zizmor) over the workflows.

All of it runs on GitHub's standard `ubuntu-24.04` runners. Not on 26.04: bootc-image-builder cannot mount the container storage on its 7.0 kernel ([osbuild#2579](https://github.com/osbuild/osbuild/issues/2579)).

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

The interesting choices are in [decision 0007](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0007-trust.md):

- **A key, not keyless signing.** Keyless signing through GitHub's OIDC identity would make every device trust the keys of Sigstore's Fulcio and Rekor and match the workflow's identity. A key is what Universal Blue's image template uses, and it verifies offline.
- **`matchRepository`.** The signature is made on the digest and names the repository, not a tag. With this setting the same signature is valid under `:testing`, `:stable` and every version tag, so promoting a build never needs the key.
- **The classic signature format.** The container tools on the device read cosign's classic format, not cosign 3's new bundle format ([container-libs#388](https://github.com/containers/container-libs/issues/388)), so `build.yml` signs with `--new-bundle-format=false`.

That last flag caught me out once. After the first publish, verifying the image the documented way failed with `no matching attestations: expected key signature, not certificate`. The image was signed fine, but `build.yml` also pushes GitHub's [build provenance and SBOM attestations](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/build.yml), and cosign 3 found those keyless attestations first and never looked at the key signature. The check inside `build.yml` only passed because it ran before the attestations existed; promotion and the disk images, which verify later, would have refused every published image. [PR #9](https://github.com/Tim-van-Oudheusden/pindu-os/pull/9) added the flag everywhere a key signature is verified.

The policy itself was checked against a local registry with a throwaway key: a signed image was accepted by tag and after a retag, and an unsigned one was rejected with "A signature was required, but no signature exists" ([decision 0007](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0007-trust.md)). The same check against the published images on a real VM is still [an open issue](https://github.com/Tim-van-Oudheusden/pindu-os/issues/5), so I am not going to claim more than that yet.

The part that keeps me honest is the key itself. Devices trust exactly the key in their current image. If it leaks, the [runbook](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#signing-key-person) has a rotation: add the new public key next to the old one and publish that image signed with the old key, so devices learn the new one. If the private key is lost instead, devices in the field cannot be moved over at all; they have to be reinstalled.

# Two channels and a button with a reviewer
`build.yml` runs on every push to `main` that changes more than docs, once a day to pick up Fedora updates, and by hand. Each run pushes two tags for each variant ([decision 0006](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0006-updates.md)):

- `:testing`, the moving tag testers follow;
- an immutable `45.YYYYMMDD.N`, copied with `skopeo copy --preserve-digests` so it is the same manifest, not a second push that could differ.

Getting to `:stable` is a separate workflow, [`promote.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/promote.yml), and it rebuilds nothing. It resolves the tag to a digest once, so a build that moves `:testing` halfway cannot swap the image under it, verifies the signature on that digest, copies it to `:stable` and checks that `:stable` now points at the same digest. It runs in a `promote` environment that needs my approval, then builds the qcow2, raw and installer images from the new `:stable`. Taking a bad release back means promoting the previous version tag.

The point of a retag over a rebuild is that `:stable` is byte for byte the image that was tested. A rebuild, even from the same commit, would pull whatever Fedora published that morning.

The workflow has [run once so far](https://github.com/Tim-van-Oudheusden/pindu-os/actions/runs/43777903790): both variants promoted, and the disk images built and tested.

<!-- TIM: the Pindu OS project page says there is no stable release yet. Was this run a pipeline test, or the first real :stable? Adjust this paragraph accordingly. -->

# Tests that boot, update and roll back
Checking files inside an image only gets you so far. The tests I care about most boot the image in QEMU.

The [boot test](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/guest/boot.sh) runs on every pull request, and again in `build.yml` on a disk built from the **published digest**, not from the local build. Inside the guest it checks that the console user gets a session on its own, the launcher runs, PipeWire and WirePlumber are up, the keyring opens without a prompt, the launcher may start the rollback unit and nothing else, and the session comes back after the launcher is killed. The host takes a screenshot as well.

The [update test](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/update.sh) spans four boots. It starts a throwaway registry on the host and serves the image as N, then builds N+1 with one marker file and pushes it once the guest runs N. [Inside the guest](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/guest/update.sh) the update service has to stage N+1 **without** rebooting, because the stock service reboots as soon as it has downloaded and Pindu OS [replaces that](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/usr/lib/systemd/system/bootc-fetch-apply-updates.service.d/10-stage-only.conf) so a console never restarts in the middle of a game. The next boot has to run N+1, and a rollback, started the way the launcher's system panel starts it, has to bring N back. Unlike the boot test, this one is not in a workflow yet: it runs locally as `just test-update` ([runbook, "Local checks"](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#local-checks)).

A third test, [`tests/vm/install.sh`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/tests/vm/install.sh), installs from the installer ISO onto an empty disk. The [disk images workflow](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/disk.yml) runs it, together with the boot test on the qcow2, on every set of disk images it builds.

<!-- TIM: the update test only runs locally. Worth saying why, or filing an issue to put it in a workflow? -->

What these tests cannot prove is gamescope. A virtual GPU has no Vulkan, so in a VM the session falls back to cage ([runbook, "Testing on hardware"](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/runbook.md#testing-on-hardware)). The first boot on a real PC is [its own issue](https://github.com/Tim-van-Oudheusden/pindu-os/issues/6), and so is the [first install, update and rollback](https://github.com/Tim-van-Oudheusden/pindu-os/issues/7) on hardware.

# What I learned building it
<!-- TIM: your reflection. Some prompts from the sources, use or drop:
- Going from Universal Blue user to doing the same work yourself: what you now appreciate about what they do.
- Whether the amount of process (pins, signatures, environments, reviewed promotion) feels right for a one-person project.
- What you would tell someone who wants to build their own bootc image. -->

Everything above is in the open: the [repository](https://github.com/Tim-van-Oudheusden/pindu-os), the [decisions](https://github.com/Tim-van-Oudheusden/pindu-os/tree/main/docs/decisions) behind it and every [workflow run](https://github.com/Tim-van-Oudheusden/pindu-os/actions). If you build your own image and spot something I got wrong, the [issues](https://github.com/Tim-van-Oudheusden/pindu-os/issues) are open.
