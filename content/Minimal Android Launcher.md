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

This project is still in progress; more details will be added as it develops.

[MinimalUI - Introduction](https://youtu.be/pnP0TemZbZI)

## Walkthrough

The introduction video above shows MinimalUI on a keyboard phone. The sections below follow the same path: the list itself, how you move through it, how you find an app by typing, and the icon and artwork that go with it.

## One list, one selected row

The launcher's whole interface is a single list of apps with one selected row, so that list is the brand. The arrow keys move and page through it, Enter opens the selected app, and typing a letter filters it.

## Moving through the list

Everything is driven by the physical keyboard. The up and down arrows move the selected row, paging keys jump a screen at a time, and Enter opens the selected app. There is no grid to aim at and no touch target to hit, which is what makes it comfortable on phones from Zinwa, Clicks and Unihertz.

![MinimalUI on a keyboard phone: the app list with Camera selected, next to the key map for move, page, open and filter](/content-assets/images/minimalui/social-preview.svg)

## Icon

The icon is three rows of that list: a label, the selected pill with its label cut out, and a shorter label. It holds up under the square, squircle and circle masks that Android launchers apply.

![The MinimalUI icon under square, squircle and circle launcher masks](/content-assets/images/minimalui/icon-masks.svg)

## Type to filter

Letters narrow the list as you type, and Enter opens the top match.

![Typing "ca" narrows the list to Calculator, Calendar and Camera, with Calculator selected](/content-assets/images/minimalui/social-portrait-filter.svg)

## Poster

![MinimalUI poster: "A plain list of apps, driven by keys." above a keyboard phone showing the app list and the key map](/content-assets/images/minimalui/poster.svg)

The artwork comes from the [MinimalUI brand folder](https://github.com/Tim-van-Oudheusden/MinimalUI/tree/main/docs/brand) and is licensed under GPL-3.0. Its outlined text is [Roboto](https://github.com/googlefonts/roboto-2), © Google, under the Apache License 2.0.
