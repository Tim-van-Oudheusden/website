---
title: Pindu OS
description: An image-based Linux for the couch that turns a PC into a game console, booting straight into Pindu launcher, built on Fedora bootc.
date: 2026-11-15
tags:
  - Linux
  - Fedora
  - bootc
  - Gaming
type: project
draft: false
slug: pindu-os
coverImage: /images/projects/pindu-os.webp
coverImageAlt: The Pindu OS icon, a glowing blue fish whose body and stem form the letter P on a dark blue rounded square, above the name Pindu OS, the tagline "Boot straight into your games" and "An image-based Linux for the couch, built on Fedora bootc" on a deep blue background.
socialImage: images/pindu-os/social-preview.png
featured: true
projectOrder: 5
status: In Progress
role: Developer
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/pindu-os
info: An image-based Linux on Fedora bootc that turns a PC into a game console, booting straight into Pindu launcher's fullscreen mode
---

# Pindu OS

![Pindu OS banner: the fish icon, the name Pindu OS, the tagline "Boot straight into your games" and "An image-based Linux for the couch, built on Fedora bootc", beside a tilted screen with a row of game tiles](/content-assets/images/pindu-os/readme-banner.webp)

An image-based Linux for the couch that turns a PC into a game console, built on Fedora bootc.

Boot straight into your games. That is the whole idea behind Pindu OS. Switch on the PC under your television and it starts, signs in by itself and shows your games, ready for a controller. There is no login screen and no desktop to find your way through. What you see is [Pindu launcher](/projects/pindu-launcher) in its fullscreen mode, with every game on the machine in one library.

## Straight to your games

Pindu OS boots, logs in by itself and starts Pindu launcher fullscreen inside [gamescope](https://github.com/ValveSoftware/gamescope), the compositor Valve made for the Steam Deck. Under gamescope a game takes over the screen when it opens, and the launcher comes back when the game quits. Where gamescope cannot start, like in a virtual machine or on a GPU without Vulkan, the session falls back to [cage](https://github.com/cage-kiosk/cage) and still shows the launcher.

## Updates that stay out of the way

The whole system is one image, built on GitHub and downloaded from a container registry as a whole. An update downloads in the background and takes effect the next time the console starts. It never restarts the PC by itself, so it never interrupts a game.

Every update also keeps the previous version on disk. If an update goes wrong, the boot menu starts the version before it, and you are back where you were.

## Signed and closed by default

Every published image carries the project's signature, and a console refuses an update without it. Each image also comes with a build provenance attestation, which ties it to a commit in the repository, and a list of everything in it.

The console image has no SSH server, no sudo and no password. A separate dev image adds them for test machines, together with a shell and debugging tools. Secure Boot can stay on, because the image ships Fedora's own kernel.

## Nothing hidden in the build

Pindu OS is Fedora 45's bootc base image plus a package list, the launcher's release RPM, a session script and a handful of configuration files. Nothing is compiled in the repository: one `Containerfile` runs a handful of numbered scripts, and every input is pinned in one file, so a change to that file explains any change in the image.

Every change is linted, built and checked from inside the image, then booted in a virtual machine, where the tests assert on the running session: the launcher is up, sound works and the screen is not blank. Other tests install from the installer image onto an empty disk, and stage an update, boot it and roll it back.

## Trying it yourself

Pindu OS is in early development. The image builds, boots in a virtual machine and passes its tests there, and testing builds are published. It has not been checked on real hardware yet, and there is no stable release until installing, updating and rolling back have been walked through on a PC.

To try it, you need a 64-bit Intel or AMD PC with UEFI firmware, an AMD or Intel GPU, a network cable, a USB stick and a controller. The installer is unattended and erases every disk in the PC, so only use a PC you mean to give to it. NVIDIA graphics, setup screens for Wi-Fi and Bluetooth, and preinstalled game stores are not there yet. The [install guide](https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/install.md) has every step, including how to try it in a virtual machine, and the [roadmap](https://github.com/Tim-van-Oudheusden/pindu-os#roadmap) says what comes next. Pindu OS is free and open source under GPL-3.0-or-later.

## The artwork

![The Pindu OS icon: a glowing blue fish whose body and stem form the letter P, on a dark blue rounded square](/content-assets/images/pindu-os/icon.webp)

The icon is a cheerful blue fish whose body and stem form a P, glowing on a dark blue rounded square. The icon and the banner come from the [Pindu OS repository](https://github.com/Tim-van-Oudheusden/pindu-os/tree/main/docs/brand), and the cover and the link-preview image are rendered from the brand source there. All of them are licensed under GPL-3.0-or-later, and the text in them is set in [Inter](https://github.com/rsms/inter), under the SIL Open Font License 1.1.
