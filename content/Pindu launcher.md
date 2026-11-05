---
title: Pindu launcher
description: A native GNOME game library that gathers every PC game on your machine in one place, with a fullscreen mode for the couch, inspired by Cartridges and OpenGamepadUI.
date: 2026-11-05
tags:
  - Linux
  - GNOME
  - Flatpak
  - Rust
  - Gaming
type: project
draft: false
slug: pindu-launcher
coverImage: /images/projects/pindu-launcher.webp
coverImageAlt: The Pindu launcher icon, a blue fish whose body and stem form the letter P on a dark blue tile, above the name Pindu launcher, the tagline "Play all your games" and a link to the repository on a deep blue background.
socialImage: images/pindu-launcher/social-preview.png
featured: false
projectOrder: 12
status: In Progress
role: Full-stack developer
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/pindu-launcher
info: A native GNOME library for every PC game on your machine, with a fullscreen controller mode, inspired by Cartridges and OpenGamepadUI
---

# Pindu launcher

![Pindu launcher banner: the fish icon, the name Pindu launcher, the tagline "Play all your games" and "Every PC game on your machine in one GNOME library", beside a column of game cover tiles](/content-assets/images/pindu-launcher/readme-banner.svg)

A native GNOME game library that gathers every PC game on your machine in one place, with a fullscreen mode for the couch, inspired by Cartridges and OpenGamepadUI.

Play all your games. That is the whole idea behind Pindu launcher. On Linux, your games end up spread over Steam, Heroic, Lutris, Bottles and whatever you installed yourself, each with a library of its own. Pindu launcher puts all of them in one library, whichever launcher installed them. Browse your covers, pick up where you left off and start any game with one click, or switch to the fullscreen mode and do the same from the couch with a controller.

## Every launcher, one library

Pindu launcher reads the games from Steam, Heroic, Lutris, Bottles and Faugus Launcher, native or as a Flatpak, and lists them side by side with games installed as apps, Flatpaks included, and games you add by hand. From Heroic that means your Epic Games, GOG, Amazon and sideloaded games, installed or not. When a launcher's files change, the library resyncs on its own.

The launchers stay in charge. A store game starts through its own launcher, which keeps its settings, its updates and its playtime. Pindu launcher only reads the launchers' files, never writes to them and never reads their credentials.

![Every launcher, one library: the sources Steam, Heroic, Lutris, Bottles, Faugus, games installed as apps and games added by hand, above the library with a Jump Back In row and the covers of SuperTuxKart, Hedgewars and SuperTux](/content-assets/images/pindu-launcher/every-launcher-one-library.webp)

## Windows games too

Not every game comes from a launcher. Add a Windows game, or its installer, by hand and it runs with Proton through [umu](https://github.com/Open-Wine-Components/umu-launcher), in a prefix of its own. You can download GE-Proton and Proton-CachyOS builds from Preferences, and turn on MangoHud or GameMode for each game separately.

## Pick up where you left off

Play History shows when you played and for how long, including the playtime your launchers recorded, so a game you played in Steam last week turns up next to one you tracked in Pindu launcher today. Jump Back In, at the top of the library, brings your recent games one click away.

The rest of the library stays tidy too. Search, sort and filter by installed, not installed, favourite, Windows or native. Star your favourites, group games into collections of your own, like Strategy or Racing, and hide the games you never play.

![Pick up where you left off: Play History with SuperTuxKart and Hedgewars played today and six more games this week, each with its date, playtime and launcher, in front of the library](/content-assets/images/pindu-launcher/pick-up-where-you-left-off.webp)

## Your artwork

Covers, banners and logos come from your launchers or from your own files. If you want more, Pindu launcher can fetch them from [SteamGridDB](https://www.steamgriddb.com) with your own API key, which stays in the system keyring.

## A fullscreen mode for the couch

Press `F11`, start the app with `--fullscreen`, or turn on Start in Fullscreen Mode in Preferences, and Pindu launcher becomes a controller-first game library with a Home, the library and game pages. Move with the D-pad or the left stick, open with A and go back with B. The hint bar at the bottom names the buttons that work on each screen, drawn with glyphs for the controller you hold. Search has an on-screen keyboard, and moving around plays navigation sounds.

Quick Access, behind a click of the right stick or the Steam Deck's "…" button, switches the design. Panorama and Ribbon ship with the app, and you can add your own CSS on top. For a real couch setup, the fullscreen mode runs inside [gamescope](https://github.com/ValveSoftware/gamescope): a game takes over the screen when it opens, and Pindu launcher comes back when the game quits.

Both modes are views over the same library, so nothing has to be set up twice.

## At home on GNOME

Pindu launcher is built from stock GTK 4 and libadwaita widgets, so it looks and behaves like the rest of GNOME, in the light or the dark style. You don't even need to open it to start a game: type the game's name in the Activities overview of GNOME Shell.

It is offline and private as well. The library works without a network, and Pindu launcher only goes online for the artwork and the Proton builds you ask for. Your collections, favourites, hidden games, games added by hand and tracked playtime can be exported to a file as a backup, and imported again.

![At home on GNOME: the Hedgewars game page in the dark style, with its banner, a Play button and its launcher, playtime and dates, next to the promises Offline and private and Backups](/content-assets/images/pindu-launcher/at-home-on-gnome.webp)

## Under the hood

Pindu launcher is written in Rust with GTK 4 and libadwaita through gtk4-rs, and its layouts are written in Blueprint. Everything that can be decided without GTK, like the importers, the launch plans, playtime, Proton and the art cache, lives in a core crate that is tested with plain `cargo test`. The desktop and fullscreen shells never read files or start processes themselves: they show the same models and pass what you do back to the services, which is why the fullscreen mode could be a second view of the same library instead of a second app.

## Trying it yourself

Pindu launcher is in early development. Version 0.1.0 is tagged, but there is no release download and no Flathub listing yet. It runs on Linux as a Flatpak on the GNOME 51 runtime, and it is free and open source under GPL-3.0-or-later. For now, you either install the development bundle that every [CI run](https://github.com/Tim-van-Oudheusden/pindu-launcher/actions/workflows/ci.yml) uploads, or build it from source; the [installation steps](https://github.com/Tim-van-Oudheusden/pindu-launcher#installing) explain both.

Store games start through their launcher and always work. Games that start as a program on your computer, like desktop entries, Flatpak games, Faugus games and native games added by hand, need you to give the app access to the host with a `flatpak override`. That access lets Pindu launcher run any command outside its sandbox, so the app never asks for it itself: until you grant it, those games explain what is missing, and Preferences shows the command. Progress is tracked in the [milestones](https://github.com/Tim-van-Oudheusden/pindu-launcher/milestones), and bug reports are welcome in the [issues](https://github.com/Tim-van-Oudheusden/pindu-launcher/issues).

## The artwork

The icon is a cheerful blue fish whose body and stem form a P, on a dark blue tile. The banner, the icon and the code come from the [Pindu launcher repository](https://github.com/Tim-van-Oudheusden/pindu-launcher) and are licensed under GPL-3.0-or-later. The banner's outlined text is [Adwaita Sans](https://gitlab.gnome.org/GNOME/adwaita-fonts), under the SIL Open Font License 1.1.

The screenshots show a demo library of free and open-source games. Their art comes from each game's own Flathub listing, under that game's licence, as listed in the [screenshot credits](https://github.com/Tim-van-Oudheusden/pindu-launcher/blob/main/data/screenshots/CREDITS.md).
