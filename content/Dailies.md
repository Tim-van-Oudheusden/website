---
title: Dailies
description: A GNOME app that gathers daily guessing games like Wordle, Connections and Worldle in one window, inspired by Cartridges and Bazaar.
date: 2026-10-16
tags:
  - Linux
  - GNOME
  - Flatpak
  - Python
type: project
draft: false
slug: dailies
coverImage: /images/projects/dailies.webp
coverImageAlt: The Dailies icon, a desk-calendar card with a grid of blue and orange tiles, above the name Dailies and the tagline "Play your daily guessing games in one place" on a soft pastel background.
socialImage: images/dailies/social-preview.png
featured: false
projectOrder: 15
status: In Progress
role: Full-stack developer
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/Dailies
info: A GNOME app for daily guessing games like Wordle, Connections and Worldle, inspired by Cartridges and Bazaar
---

# Dailies

![The Dailies icon: a tear-off desk-calendar card whose page is a grid of blue and orange guessing-game tiles](/content-assets/images/dailies/icon.svg)

A GNOME app that gathers daily guessing games like Wordle, Connections and Worldle in one window, inspired by Cartridges and Bazaar.

Play your daily guessing games in one place. That is the whole idea behind Dailies. Wordle was only the start, and now there is a daily puzzle for words, maps, songs, films and almost anything else, each on its own website. Dailies keeps them together in one native app, so you don't need a row of bookmarks to get through your morning games. I made a short introduction video that shows it in under a minute, and this page walks through the same steps in writing.

[Dailies - Introduction](https://www.youtube.com/watch?v=LrEyWpnOZiE)

## One home for your daily games

Dailies lists more than a hundred guessing games, from Wordle to Worldle. Every game is a tile with the glyph of its category, its name, its category and how hard it is: Easy, Medium or Hard. Dailies is not a game itself and doesn't copy any game. Opening a tile takes you to the game's own website, exactly as its publisher made it.

## Sorted into ten categories

The sidebar sorts the games into ten categories: Words, Numbers & Logic, Movies & TV, Geography, Video Games, Pictures & Colors, Trivia, Music, Sports and Food. To find one game, press `Ctrl` `F` and start typing. The search looks in the section you have open and forgives a typo in longer searches. If you only play in your own language, you can hide the games in other languages.

## Your favourites, all together

Star the games you play every day, or press `Ctrl` `D`, and they come together under Favorites at the top of the sidebar, in the order you choose. Starred something by accident? You can undo it. Once you have played a game, you can mark it as done today, by hand or automatically, so you can see at a glance what is still left. Your favourites can be exported to a file and imported on another computer.

![The Favorites section of Dailies with eight starred games, among them Wordle, Connections and Worldle, each with its category and a difficulty badge](/content-assets/images/dailies/favorites.png)

## See what's popular this week

Under This Week, two shelves show what other people are playing. Popular lists the games that are popular right now, and Trending the ones that are on the rise. Both are worked out every Monday from the [Tranco](https://tranco-list.eu) rank of each game's website, and Dailies picks up the new shelves the next time it refreshes, without needing an update.

![The Popular shelf for this week, with Wordle, Connections, Strands and The Mini Crossword in the first row](/content-assets/images/dailies/popular.png)

## Light or dark, it follows your style

Dailies is a native GNOME app, built with GTK 4 and libadwaita. It follows the light or dark style and the accent colour you picked for your desktop, so it looks like the rest of your apps instead of like a website in a window.

![The Words category of Dailies in the dark style, with Absurdle, Antiwordle, Betweenle and Blossom in the first row](/content-assets/images/dailies/dark-style.png)

## Play right inside Dailies

Games open in a built-in browser that remembers your logins and streaks between sessions. It has back, forward and reload buttons, and the header bar always shows the page title and the website it comes from. If you would rather play in your own browser, the Open games setting has three choices: the built-in browser, your default browser, or a command of your choice. Music games play their sound inside Dailies too.

![Absurdle being played in the built-in browser, with back, forward and reload buttons and the page title and website in the header bar](/content-assets/images/dailies/built-in-browser.png)

## Simple and private

Dailies opens each game's own website, nothing more. You don't need an account, because there is nothing to sign up for. There is no tracking, and your favourites stay on your device. It also works offline: a copy of the game list is built in, and updating it from GitHub is a bonus rather than a requirement. The only things Dailies downloads are the game list and the game pages you open.

## Adding a game

Missing a game? The [Add a game](https://github.com/Tim-van-Oudheusden/Dailies/issues/new?template=new-game.yml) form on GitHub is all you need. Each suggestion is checked automatically, and once I approve it, the game is added to the game list. Dailies picks it up the next time it refreshes, just like the weekly shelves.

## Trying it yourself

Dailies is still early, so releases are numbered 0.x. It is free and open source under GPL-3.0-or-later, available in English and Dutch, and runs on Linux as a Flatpak. It isn't on Flathub yet, so you download it from the [releases page](https://github.com/Tim-van-Oudheusden/Dailies/releases/latest) instead: there is a bundle for x86_64 and one for aarch64. The bundle needs the GNOME runtime from Flathub, and the [installation steps](https://github.com/Tim-van-Oudheusden/Dailies#installing) explain how to add it.

## The artwork

The icon is a tear-off desk-calendar card whose page is a guessing game's grid of tiles, so it shows both a daily page and the guessing games in one picture. The tiles are blue and orange instead of green and yellow, to keep it clearly apart from Wordle.

The icon and the screenshots come from the [Dailies repository](https://github.com/Tim-van-Oudheusden/Dailies) and are licensed under GPL-3.0-or-later.
