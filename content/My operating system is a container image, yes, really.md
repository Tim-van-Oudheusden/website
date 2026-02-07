---
title: My operating system is a container image, yes, really
socialImage: images/cover.png
publishDate: 2025-04-13
---
# The discovery
We all have our opinions on the directions of Windows the last couple of years. As a Software Engineer, mine were... not that positive. So I jumped ship to Linux in late 2022, and as most do I started trying various spins a.k.a. "distro hopping", from KDE neon, to Arch, to Linux Mint, until I eventually discovered [Fedora](https://fedoraproject.org/). In a nutshell, Fedora is known to be a balance between the "bleeding edge" (a.k.a. the latest features and updates) and the more "conservative" Linux spins. Or, in other words, you get the shiny new stuff after it's been tested decently. 

I daily drove the default [Fedora Workstation](https://fedoraproject.org/workstation/) for over a year on both my desktop as well as my [Framework 13](https://frame.work/) laptop. And while I think the workstation is completely fine for a casual user, as a software engineer and casual gamer I kept having small issues and annoyances. 

At this point I didn't really want to leave the Fedora ecosystem I had become accustomed to, nor did I see any merit in the alternatives. That is until I discovered the [Universal Blue](https://universal-blue.org/#about) project. A project based on Fedora that:

>[!quote]
>*...builds a diverse set of [continuously delivered](https://en.wikipedia.org/wiki/Continuous_delivery) operating system images using [bootc](https://github.com/bootc-dev/bootc). **That's nerdspeak for the ultimate Linux client**: the reliability of a Chromebook, but with the flexibility and power of a traditional Linux desktop.*

# Okay, but what is this? 
One of my specializations as a Software Engineer is DevOps. In my daily work I manage multiple docker containers and deployments. A container will usually contain an application build in some programming language, and require dependencies from other software in order to function. And all this time I never considered that in theory, this same concept can be applied to an actual operating system. 

Well that theory is no longer a theory, and it is here. As you might know, to build an aforementioned docker container, it usually consists of several "layers". Each layer represents a set of file changes or instructions in a `Dockerfile`, such as installing a package or copying files. Layers are stacked on top of each other, with each new layer only containing the differences from the previous one. Which promotes efficiency and reduces redundancy. 

All images (read: operating systems) under Universal Blue are setup in the same way. With the base layer usually being a version of the Linux kernel. And the layers on top defining the identity of that particular image.

# Why this matters
In the Linux world there is often overlap between packages, and this is where problems arise, as one program might need a different version of a package than another program. For Universal Blue, this issue doesn't exist. Every image has a default set of software packages (the "layers") that is decided and tested for every release. And as the user you don't get to change this. Everything that is not included is either run via [Flatpaks](https://flatpak.org/), in a [Distrobox](https://distrobox.it/) or optionally "layered" on top (but heavily discouraged). 

Want to use Brave as a browser instead of Firefox? No problem, just install the flatpak version. Really want some software but it's only available on Ubuntu? No problem, just install it in an Ubuntu distrobox and export the app to your desktop. Everything just works, and nothing breaks. And even if something slips by the testing and makes it into the release? No problem, the two previous builds are always available to be chosen on boot, or you can just "rebase" to a specific version that works best for you.

# What do I use?
There are two images/projects that I personally use. [Bazzite](https://bazzite.gg/) for my desktop, and [Bluefin](https://projectbluefin.io/) for my Framework 13 laptop. Both have [built-in](https://frame.work/linux) support for Framework laptops and generally run nice on AMD or Intel hardware, which I have. 

## Bazzite
Bazzite has been trending in the handheld market as a great alternative to [SteamOS](https://store.steampowered.com/steamos) for handhelds that run on Windows by default. But it is much more than just a handheld image. It comes packed with general fixes for running games under Linux, and has built-in emulation and streaming to TV options that can be configured within about 5 to 15 minutes. For a casual gamer like me, it has been a wonderful plug-and-play experience requiring zero deep Linux knowledge. And any advanced stuff I wish to try out can all be done under the aforementioned Distrobox.

## Bluefin
I personally run the Bluefin developer experience. An image that comes with a cloud native approach to development, all pre-configured for your convenience. Because, while running JetBrains or Visual Studio Code under Linux is quite easy, integrating everything with each other can be a real PITA. Luckily, Bluefin does all the nasty stuff for you. And since [devcontainers](https://containers.dev/) have come a long way since its infancy a couple years ago, there is no longer a need for "layering" those pesky development packages, for the ones under us working with a multitude of programming languages. 

# Conclusion
I have been on the nasty side of both Windows and Linux. Searching for that one random setting deeply hidden inside the control panel. Opening Regedit and seemingly changing a random value just so some `.exe` works properly with your version of Windows. Or trying 10 different commands from Reddit to get a Linux program to work.

With Universal Blue, all these tiny annoyances have disappeared, seriously. My only issue since I have switched is one application displaying a giant cursor, which isn't even an issue with my OS, but a well known bug that recently got a fix about a month ago. I just get to do my work and play some games from time to time, without getting features forced on to me like [Windows recall](https://www.pcworld.com/article/2684191/windows-recall-is-now-one-step-away-from-a-true-public-release.html) or spending the evening on the command line fixing stuff (looking at you Arch Linux users).