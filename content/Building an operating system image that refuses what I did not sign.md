---
title: Building an operating system image that refuses what I did not sign
slug: building-an-operating-system-image-that-refuses-what-i-did-not-sign
description: How Pindu OS goes from one Containerfile to a signed image on a console, with two channels, a reviewed promotion and tests that boot it in a VM
type: article
category: Linux
date: 2026-11-17
draft: true
tags:
  - bootc
  - Fedora
  - cosign
  - Pindu OS
---
# From user to builder
A while back I wrote that [my operating system is a container image, yes, really](/articles/my-operating-system-is-a-container-image-yes-really). Back then I was a happy user. [Bluefin](https://projectbluefin.io/) and [Bazzite](https://bazzite.gg/) built the images, and my computers pulled them. This time I am on the other side. [Pindu OS](/projects/pindu-os) is a Linux for the couch that boots a PC straight into [Pindu launcher](/projects/pindu-launcher), and I build the image it boots.

The project page covers what the console does. This article is about the pipe behind it: how a change becomes an image, why a console only takes an image I signed, and how I check that it still boots, updates and rolls back before anyone gets it. I borrowed a lot. [Universal Blue's image-template](https://github.com/ublue-os/image-template) shaped the repository and [Armada](https://github.com/armada-os/armada) lent the layout of numbered build scripts, as the [README's acknowledgments](https://github.com/Tim-van-Oudheusden/pindu-os#acknowledgments) say.

# One Containerfile, and nothing compiled
The whole system is described by one [`Containerfile`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/Containerfile). It has three working stages:

- `ctx` holds the build scripts and system files. The image stage bind-mounts it, so the scripts never become a layer of the image.
- `launcher` downloads the launcher's release RPM and fails unless its SHA-256 matches the pin.
- `image` starts from Fedora's bootc image, runs the build scripts, and ends with `bootc container lint --fatal-warnings`.

Nothing is compiled in the repository. The base image, the launcher RPM and every tool are [prebuilt inputs](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/architecture.md#inputs). The [build scripts](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/architecture.md#build) are numbered and run in order: repositories, kernel, base packages, session packages, the launcher, system files, os-release, the dev variant and a cleanup. Each package sits in a group with a comment that says why it is there.

The base is the plain [`quay.io/fedora/fedora-bootc:45`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0001-base-image.md), not a Universal Blue image. I looked at `ublue-os/base-main` and at `bazzite-deck`. The first is an intermediate image that neither Bazzite nor Bluefin builds on, and the second is a multi-gigabyte KDE and Steam image I would have had to subtract from. The price of the plain base is that I own the package list. The cleanup script makes that a little safer: [it fails the build](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0001-base-image.md#consequences) if a dependency ever drags in `gnome-shell` or `plasma-workspace`.

# Every pin in one file
Every input of the image is pinned in one file, [`image.env`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/image.env): the base image by digest, the launcher by version and SHA-256, the image builder, the kernel image, and every linter. The scripts, the `Justfile` and the workflows read that file and never write a version themselves. The rule in its header is the one I care about most: a diff of this file explains any change in the image.

I do not bump those pins by hand. [Renovate](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/renovate.json5) opens the pull requests, including a custom rule that moves the launcher's version and checksum together. Before a build, [`just verify-inputs`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/architecture.md#inputs) checks that every digest still resolves, that the base really is a Fedora 45 bootc image, that the kernel image carries Universal Blue's signature and that the RPM matches its checksum.

That check earns its place. On 17 November the daily build [stopped at that step](https://github.com/Tim-van-Oudheusden/pindu-os/actions/runs/44093854219): the registry no longer served the pinned base digest, "manifest unknown". Without a pin, the build would have quietly taken whatever the tag pointed at that morning. With a pin, it stops and tells me.

# Signed, or refused
A console updates itself from a public registry. So the question I kept asking was: what stops someone who can push to the repository, or who tampers with an image on the way, from getting an image onto a console? [Decision 0007](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0007-trust.md) is the answer.

Every pushed digest is signed with a [cosign](https://github.com/sigstore/cosign) key in [`build.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/build.yml). The image carries the public key and a [`policy.json`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/etc/containers/policy.json) that requires that signature for both Pindu OS repositories, and a [registries file](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/system_files/etc/containers/registries.d/pindu-os.yaml) tells the container tools where to find it. The installer points the installed system at its image with `bootc switch --enforce-container-sigpolicy` ([decision 0006](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0006-updates.md)). An image without the signature is refused.

A few details took more thought than I expected:

- **A key, not keyless signing.** Keyless signing with GitHub's identity would have every console trust Fulcio and Rekor and match a workflow identity. A key is what the image-template uses, and it verifies offline. The private key lives in a GitHub environment that only `main` can use, and the only other copy [sits offline](https://github.com/Tim-van-Oudheusden/pindu-os/issues/2).
- **The old signature format, on purpose.** The container tools on the device read cosign's classic signature format, not cosign 3's bundle format, so the workflow signs with `--new-bundle-format=false`. This bit me once. As soon as the build attached its provenance attestations, `cosign verify` looked only at those and failed with "expected key signature, not certificate". The promotion and disk workflows would have refused every image I published. [The fix](https://github.com/Tim-van-Oudheusden/pindu-os/commit/cd9dc65fee286992746ca2329427f78987e6cbc6) passes the same flag everywhere a key signature is verified.
- **`matchRepository`.** The signature is made on the digest. The policy accepts it under any tag of the repository, so promoting an image to `:stable` is a retag, not a second signature.
- **No key, no publish.** If the public key is missing or differs from the one in the image, or the signing secret is absent, `build.yml` [refuses to publish](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/build.yml) at all.

Each image also gets a build provenance attestation, which ties it to a commit, and an SBOM, both [verified in the same run](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0007-trust.md#decision). Nothing on the device checks those, which is why they come on top of the signature and not instead of it.

To be honest about where this stands: the policy was checked against a local registry, where a signed image was accepted by tag and after a retag and an unsigned one was rejected with "A signature was required, but no signature exists". Running the same test on a device against the published images is still [an open issue](https://github.com/Tim-van-Oudheusden/pindu-os/issues/5).

# Two channels and a reviewed promotion
Images are published under [three kinds of tag](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0006-updates.md#decision):

- `:testing` for every build: each push to `main`, once a day to pick up Fedora updates, and on demand.
- `45.YYYYMMDD.N`, an immutable tag on the same digest, so a known-good build always has a name.
- `:stable`, which is never built. It is a `:testing` digest that I promoted.

The promotion is [`promote.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/promote.yml). It runs only by hand, behind a GitHub environment with a required reviewer. It resolves the tag to a digest once, so a build that moves `:testing` halfway cannot swap the image under it. It verifies the signature on that digest, copies it to `:stable` with the digests preserved, and checks that `:stable` now points at exactly that digest. Then it builds the disk images and the installer from the new `:stable`. Rebuilding for stable was the alternative, and I rejected it: the stable image would not be the one that was tested. A retag ships the tested bytes.

The pipeline has [promoted once](https://github.com/Tim-van-Oudheusden/pindu-os/actions/runs/43777903790), as part of [getting every workflow green](https://github.com/Tim-van-Oudheusden/pindu-os/issues/3). That is not a stable release yet. The first one waits for [a boot on real hardware](https://github.com/Tim-van-Oudheusden/pindu-os/issues/6) and [an install, update and rollback on that PC](https://github.com/Tim-van-Oudheusden/pindu-os/issues/7). There is also a gap I want closed before then: nothing stops a launcher bump that never ran on hardware from reaching `:stable`. [Issue #30](https://github.com/Tim-van-Oudheusden/pindu-os/issues/30) makes the promotion refuse a new launcher version until its hardware check is recorded.

On the console side, updates stay out of the way. The stock bootc timer runs `bootc upgrade --apply`, which reboots as soon as an update is downloaded. A console must never do that in the middle of a game, so [a drop-in](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0006-updates.md#decision) replaces it with a plain `bootc upgrade`: download, stage, and take effect on the next boot. The check runs ten minutes after boot and every four hours after that.

# Tests that boot it, update it and roll it back
Every change goes through two layers of tests ([architecture, Tests](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/architecture.md#tests)).

The container tests run inside the built image: the package lists, the launcher's version and libraries, the session script against stub compositors, the user and autologin setup, the signature policy and the update units.

The VM tests boot real disk images in QEMU with KVM and UEFI firmware. The part I like most is how they look inside. The host passes a systemd unit and a script to the guest as credentials on QEMU's SMBIOS table, and the script reports back over a serial port. The image under test is never modified, and the production image is tested without an SSH server, because it does not have one.

- `boot.sh` waits for a session on seat0, the launcher running, sound, a portal that answers, a keyring that opens without a prompt and a screenshot that is not blank. [`pr.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/pr.yml) runs it on every pull request, and `build.yml` runs it again on the digest it just published.
- `install.sh` installs from the ISO unattended onto an empty disk and runs the boot checks on the result. [`disk.yml`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/.github/workflows/disk.yml) runs it after a promotion.
- `update.sh` takes four boots. The guest switches to an image served by a throwaway local registry, the host pushes a newer one, the update service stages it without a reboot, the next boot runs it, and `bootc rollback` returns. For now that one runs locally with [`just test-update`](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/Justfile), not in CI.

Tests only catch what they look at. I tried the image in virt-manager on my Bazzite desktop, with 3D acceleration on, and [the session never came back](https://github.com/Tim-van-Oudheusden/pindu-os/issues/18) after the launcher crashed. greetd restarted it as a greeter, which may not start the session, so it failed with "Access denied" every ten seconds. [The pull request that fixed it](https://github.com/Tim-van-Oudheusden/pindu-os/pull/23) put it plainly: CI never saw it because the VM boot test never ended a session. The boot test now kills the launcher and waits for a new session to come back.

And a VM cannot prove everything. A virtual GPU has no Vulkan, so every VM run exercises the fallback compositor, cage, and not gamescope. That is [a known limit](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/architecture.md#known-limits), and the reason the hardware gate exists.

# Pull requests never meet a secret
The repository is public, so anyone can open a pull request, and a pull request can change the workflows it runs. [Decision 0009](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/decisions/0009-runners.md) keeps that harmless. `pr.yml` runs with `contents: read`, no secrets and no registry login. It still builds both variants and boots them. Building, signing and promoting only happen on `main`, on a schedule or by hand, and the signing key and the promotion each sit behind their own environment. Every action is pinned by commit SHA.

Everything runs on GitHub's standard runners, which works because nothing is compiled. Even that came with a lesson: `ubuntu-26.04` was the plan, but bootc-image-builder [cannot mount the container storage on its kernel](https://github.com/osbuild/osbuild/issues/2579), so [every job moved to `ubuntu-24.04`](https://github.com/Tim-van-Oudheusden/pindu-os/commit/8b400b172dd62b83f8694b69a8b5a896993482a7).

# What changed for me
As a user of Bluefin and Bazzite, a signed image that updates in the background and rolls back from the boot menu felt like magic. As the builder, it is a list of decisions: which base, which pins, which key, which tag, and what a test has to see before I believe it. Each of those is written down as a [decision record](https://github.com/Tim-van-Oudheusden/pindu-os/tree/main/docs/decisions), with the alternatives I turned down and what it costs.

Pindu OS is still early. It has not booted on real hardware, and `:stable` is not something I would point a friend at yet. But the pipe is there, and a console will only ever run what came through it.
