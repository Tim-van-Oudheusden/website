---
title: Pindu OS
description: A Linux for the couch that boots a PC straight into Pindu launcher and updates as one signed image, built on Fedora bootc and inspired by Universal Blue and Armada.
date: 2026-11-16
tags:
  - Linux
  - Gaming
  - bootc
  - Fedora
type: project
draft: false
slug: pindu-os
coverImage: /images/projects/pindu-os.webp
coverImageAlt: The Pindu OS icon, a glowing blue fish whose body and stem form the letter P on a dark blue tile, beside the name Pindu OS and above the tagline "Boot straight into your games", on a light blue background. Below them, a television shows Pindu launcher's fullscreen Home with a row of game tiles.
socialImage: images/pindu-os/social-preview.png
featured: true
projectOrder: 5
status: In Progress
role: Full-stack developer
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/pindu-os
  - type: docs
    label: Install guide
    href: https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/install.md
info: A Linux that boots a PC straight into Pindu launcher and updates as one signed image, built on Fedora bootc
---

# Pindu OS

![Pindu OS banner: the fish icon, the name Pindu OS, the tagline "Boot straight into your games" and "An image-based Linux for the couch, built on Fedora bootc", beside a television showing Pindu launcher's fullscreen Home](/content-assets/images/pindu-os/readme-banner.webp)

A Linux for the couch that boots a PC straight into Pindu launcher and updates as one signed image, built on Fedora bootc and inspired by Universal Blue and Armada.

Boot straight into your games. That is the whole idea behind Pindu OS. [Pindu launcher](/projects/pindu-launcher) already has a fullscreen mode for the couch, but on a normal desktop you still start the PC, log in and open the app before it feels like a console. Pindu OS takes those steps away. You press the power button, and the next thing you see is your library, ready for a controller.

It is in early development. The image builds, boots in a virtual machine and passes its tests there, but it has not run on a real PC yet. This page says what it does today and what is still missing.

## Straight to your games

There is no login screen and no desktop. When the PC starts, [greetd](https://sr.ht/~kennylevinsen/greetd/) signs the console's one user in by itself and starts the session. The session runs Pindu launcher fullscreen inside [gamescope](https://github.com/ValveSoftware/gamescope), the compositor Valve wrote for the Steam Deck. A game takes over the screen when it opens, and the launcher comes back when the game quits. If the session ever stops, it starts again.

gamescope needs a GPU with Vulkan. Where it cannot start, in a virtual machine for example, the session falls back to [cage](https://github.com/cage-kiosk/cage) after two failed attempts and still shows the launcher.

![From the power button straight to your games: four steps from power on, through signing in by itself and gamescope with cage as the fallback, to Pindu launcher, above the promises no login screen, no desktop, no password and starts again if it stops](/content-assets/images/pindu-os/straight-to-your-games.webp)

## Updates that stay out of the way

Pindu OS is an image-based Linux. The whole system is one container image, built on Fedora 45 with [bootc](https://bootc-dev.github.io/bootc/), and a console replaces that image as a whole instead of updating packages one at a time. I have run my own computers this way for a while, and wrote about it in [My operating system is a container image, yes, really](/articles/my-operating-system-is-a-container-image-yes-really).

The console looks for an update ten minutes after it starts and every four hours while it is on. An update downloads in the background and takes effect the next time the console starts. It never restarts by itself, so it never interrupts a game.

## Always a way back

Every update keeps the previous version on disk. If a new version does not start, or does not behave, the boot menu starts the previous one again.

![Updates wait for the next start, and there is always a way back: the version before is kept on disk, the console keeps running its current version, and the next version is staged after downloading in the background, above the notes one image for the whole system and unsigned updates are refused](/content-assets/images/pindu-os/always-a-way-back.webp)

## Signed, and closed by default

Every published image carries the project's signature, made with [cosign](https://github.com/sigstore/cosign), and a console refuses an update without it. Each image also comes with a build provenance attestation, which ties it to a commit in the repository, and a list of its contents. Secure Boot can stay on, because the image ships Fedora's own kernel.

The console image has no SSH server, no sudo and no password. A separate dev image adds them for test machines, together with a shell and debugging tools.

## Under the hood

The whole system is described by one `Containerfile` and a handful of numbered scripts. Nothing is compiled in the repository. The Fedora base image, the launcher's release RPM and every tool are prebuilt inputs, pinned in one file by digest or by version and checksum, so a diff of that file explains any change in the image.

Every change is linted, built and checked from inside the image. Then the image is booted in QEMU, where the tests look at the running session: a signed-in user, a running launcher, sound, and a screenshot that is not blank. Two more tests install from the installer onto an empty disk, and take an update and roll it back. All of it runs on GitHub's standard runners, and code from a pull request never runs in a job that holds a secret.

Pindu OS reinvents as little as it can. [Universal Blue](https://universal-blue.org)'s image template shaped the repository, [Armada](https://github.com/armada-os/armada) lent the layout of numbered build scripts, and the [Open Gaming Collective](https://opengamingcollective.org) kernel is a build option for later. Pindu OS is an independent project, not affiliated with or endorsed by any of them.

![Built in the open, pinned, tested and signed: four steps from pinned inputs in one file, through one Containerfile build on Fedora bootc and tests in the image and in QEMU, to an image published with a cosign signature, above the notes nothing compiled here, GitHub-hosted runners, and provenance and an SBOM](/content-assets/images/pindu-os/built-in-the-open.webp)

## Trying it yourself

Pindu OS is free and open source under GPL-3.0-or-later. Test builds are published as `ghcr.io/tim-van-oudheusden/pindu-os:testing`, but there is no stable release and no installer to download yet. For now you build a disk image or the installer from the repository: the [README](https://github.com/Tim-van-Oudheusden/pindu-os#building) has the commands, and the [install guide](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/install.md) covers installing, updates, rollback and trying it in a virtual machine.

> [!warning] The installer erases the PC
> It is unattended. Once it boots, it wipes every disk in the machine and installs without asking a single question. Unplug any disk you want to keep before you start.

A console needs a 64-bit Intel or AMD PC with UEFI firmware, an AMD or Intel GPU, a network cable and a controller. NVIDIA graphics are not supported yet, Wi-Fi and Bluetooth have no setup screens, and no game stores are preinstalled. In a virtual machine the launcher runs in the fallback compositor, so it looks the same but games will not perform.

## What comes next

1. **First boot on hardware.** The dev image on a PC with an AMD or Intel GPU, to check gamescope where a virtual machine cannot.
2. **First stable release.** Install from the installer on a PC, take one update and roll back once.
3. **Ready for games.** Game stores, a system panel in the launcher for power, network, Bluetooth and updates, a boot splash, and variants for handhelds and NVIDIA graphics.

Progress is tracked in the [issues](https://github.com/Tim-van-Oudheusden/pindu-os/issues), and bug reports are welcome there.

## The artwork

The icon is a glowing blue fish whose body and stem form a P, on a dark blue tile. It is the Pindu launcher fish in a glossier style. The icon, the banner and the code come from the [Pindu OS repository](https://github.com/Tim-van-Oudheusden/pindu-os) and are licensed under GPL-3.0-or-later. The text in the images is set in [Inter](https://github.com/rsms/inter), under the SIL Open Font License 1.1. The television on the cover and the banner shows a screenshot of Pindu launcher with a real library, and the game art in it belongs to each game's publisher.
