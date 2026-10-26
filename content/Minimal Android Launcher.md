---
title: Minimal Android Launcher
description: A minimal Android launcher for keyboard-centric phones from Zinwa, Clicks and Unihertz, inspired by MinUI and Cannoli.
date: 2026-06-10
tags:
  - Android
  - Launcher
type: project
draft: false
slug: minimal-android-launcher
coverImage: /images/projects/minimal-android-launcher.webp
coverImageAlt: The MinimalUI wordmark, a cross and the hive logo on black fading into an amber honeycomb, with both project links and the tagline "A plain list of apps, driven by keys."
socialImage: images/minimalui/social-preview.png
featured: true
projectOrder: 10
status: In Progress
role: Full-stack developer
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/MinimalUI
info: A minimal launcher for Zinwa, Clicks and Unihertz keyboard-centric phones, inspired by MinUI and Cannoli
---

# Minimal Android Launcher

![MinimalUI banner: the list-glyph icon, the MinimalUI wordmark and a three-row list with Calendar selected](/content-assets/images/minimalui/readme-banner.svg)

A minimal Android launcher for keyboard-centric phones from Zinwa, Clicks and Unihertz, inspired by MinUI and Cannoli.

Less on screen, more room for everything else. That is the whole idea behind MinimalUI. No icons and no transition animations, just black and white text and a keyboard to drive it. I made a short walkthrough video that shows every part of it in under two minutes, and this page walks through the same steps in writing.

[MinimalUI - Walkthrough](https://youtu.be/pnP0TemZbZI)

## One list

When you press the home key, you land on a single list of apps. Your favourites come first, marked with a star, then the apps you opened last, and then every app from A to Z. The up and down keys move one row at a time, and left and right turn a whole screen at once, so even a long list of apps is only a few key presses away.

The bottom row of every screen names the keys that work there, like `☰ MENU` on the left and `⏎ OPEN` on the right of the home screen. You never have to remember a shortcut, and tapping a hint does the same as pressing its key if you do want to use the touchscreen.

![MinimalUI on a keyboard phone: the app list with Camera selected, next to the key map for move, page, open and filter](/content-assets/images/minimalui/social-preview.svg)

## Type to filter

On a phone with a real keyboard, the fastest way to find an app is to start typing its name. Each letter narrows the list and selects the first match, so `cam` followed by Enter opens the camera. When you come back from an app, it is still selected and your filter is still there, so opening it again takes a single key press.

![Typing "ca" narrows the list to Calculator, Calendar and Camera, with Calculator selected](/content-assets/images/minimalui/social-portrait-filter.svg)

## One key away

The menu key opens the menu of the selected app: App info, Uninstall, Add to favourites, Add to collection, Add to group, Rename and Hide, and, when there are recently used apps, Remove from recently used and Clear recently used. Make an app a favourite and it rises to the top of the list, marked with a star; on a favourite the menu offers Remove from favourites instead, and on a hidden app Unhide.

## Groups sort themselves

You don't have to organise anything to get some structure. Every app lands in a group based on the category its developer declared, like Games, Audio, Images, Maps, Productivity or Social, and apps that declared nothing end up in Other. The Groups row sits at the very bottom of the list, so pressing up from the first app reaches it straight away. You can also make groups of your own from the app menu.

## Collections are yours

Where groups sort themselves, collections are entirely up to you. A collection is a named list of apps, kept in the order you choose, like the "Morning" collection in the video with Weather, Calendar, Messages and Music. Once you have a collection, a Collections row shows up on the home screen to open them.

## Call things what you like

Rename any app to whatever makes sense to you. The new name is used everywhere: in the list, when filtering, and in collections and groups. In the video, Notes becomes Journal, and from then on typing `jo` finds it.

## Hide what you don't need

Most phones come with apps you will never open but can't uninstall. Hiding an app takes it off the list, out of your favourites and out of every collection and group. It is not gone though: type its name and it still turns up, in grey, and the Hidden apps setting lists everything you hid so you can bring it back.

## Settings, kept small

MinimalUI hides Android's status bar and shows a small pill in the top right corner instead, with the Wi-Fi, the battery and the time. The settings are kept just as small: choose whether the pill shows the clock and the battery percentage, how many recently used apps appear at the top of the list (off, 3, 5 or 15), save or restore your setup, and find your hidden apps. Enter or the left and right keys change the selected value. An About row at the bottom shows the version and the commit the app was built from.

Export setup saves your favourites, collections, groups, renames, hidden apps, recently used apps and settings to one file, wherever you pick in Android's file picker: the phone's Downloads, an SD card or a cloud drive's folder. Import setup brings them back from such a file, and asks before it replaces anything. Neither needs a permission or the network, because the picker only hands MinimalUI the one file you chose.

## Trying it yourself

MinimalUI is still in alpha. It runs on Android 9 or newer, and it is free and open source under GPL-3.0. Releases are published as APK files on the [releases page](https://github.com/Tim-van-Oudheusden/MinimalUI/releases), and after installing you pick MinimalUI as your default home app in Android's settings. A newer release installs over the one you have and keeps your setup, but switching between a debug build and a release needs an uninstall, which erases it, and a new phone starts empty too, so use Export setup first and Import setup once MinimalUI is installed again. No phone is officially supported until someone has tested it on one, so if you try it on yours, the [devices list](https://github.com/Tim-van-Oudheusden/MinimalUI/blob/main/DEVICES.md) explains how to report how it went.

## The artwork

The icon is three rows of that same list: a label, the selected pill with its label cut out, and a shorter label. It holds up under the square, squircle and circle masks that Android launchers apply.

![The MinimalUI icon under square, squircle and circle launcher masks](/content-assets/images/minimalui/icon-masks.svg)

![MinimalUI poster: "A plain list of apps, driven by keys." above a keyboard phone showing the app list and the key map](/content-assets/images/minimalui/poster.svg)

The artwork comes from the [MinimalUI brand folder](https://github.com/Tim-van-Oudheusden/MinimalUI/tree/main/docs/brand) and is licensed under GPL-3.0. Its outlined text is [Roboto](https://github.com/googlefonts/roboto-2), © Google, under the Apache License 2.0.
