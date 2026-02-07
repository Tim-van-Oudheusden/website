---
title: Apt-get out of my life, hello flatpak
socialImage: images/cover.png
publishDate: 2025-07-02
---
# No, don't embrace the terminal
At the beginning of my software development career, long before I transitioned to Linux, I was introduced to the terminal. It started with some simple git command's and expanded into various other branches. As a developer you get used to it. Yet this is the very pitfall that has plagued the Linux desktop experience for the past few decades. 

Let me start by saying I can't fault the Linux ecosystem for a lack of funding for advertising, or Microsoft's [predatory behavior](https://www.justice.gov/atr/us-v-microsoft-proposed-findings-fact-0) and [Embrace, extend, and extinguish](https://en.wikipedia.org/wiki/Embrace,_extend,_and_extinguish) mentality. However, I will criticize it for misunderstanding the average user. Whether you blame pop culture or not, the terminal is a hostile place for the majority of the population. 
A loud minority of switchers to Linux will tell you that they love "the control" and "seeing every detail" with the terminal. Be not mistaken, for this is not representative of the majority consensus.

While I might agree that using the terminal to install software is not very difficult, it is still a big barrier of entry. And additionally, it does not leave a good first impression. I wouldn't want my mother to type `sudo apt install <package>` and neither should you. Yet this is **still** the recommended way to install for a very large section of software on Linux.

# Flatpak, the Linux version of phone apps
One thing I have always enjoyed about phones is the ease of use of applications on it. Just open the app store, search for the application, and click install. Or better yet, just follow the hyperlink from a website which automatically redirects you to the page of the application in the app store. The only restriction for whether the application works is the version of your phone. And I guarantee that most people will never even get to the point of having a phone that is too old. Especially for commonly used applications that offer support for multiple older versions.

[Flatpak](https://flatpak.org/) is rapidly reaching that same threshold. It is sand-boxed by design and has it's own dependencies bundled with it. For the majority of use cases it really is just a simple "click install button". And because it is sand-boxed, it is also secure by design. A Linux solution to an issue that plagues Windows to this day, with users installing various `.exe` files that can have viruses or other nasty consequences.

# The last obstacle for Flatpaks
While flatpaks are great, the storefronts that offer them on Linux usually aren't. 
The problems start when users are presented with a "Flatpak version" and a ".rpm version" or a ".deb version", they won't know the difference and will often choose the default. 
Additionally, some flatpak versions of applications are just poorly packaged, or just outright unverified. Yet many storefront's either have no moderation or a very strict moderation on this. In the end this boils down to a philosophical discussion about Linux, neutrality and opinionated vs unopinionated approaches. And while these discussion are worth having, they are not very fruitful for the experience of the average Joe.

## Don't reinvent a wheel that is not broken
In my opinion, the success of Linux now depends on following models that are proven to work. And the working model is the iOS App Store and Google Playstore. And right now, the Linux version of this model is unfolding. 

I currently run [Bluefin](https://projectbluefin.io/) on my laptop (read more about this in [[My operating system is a container image, yes, really]]), a Flatpak centered OS. The last couple of weeks, it has adopted a *Flatpak only* app store called [Bazaar](https://github.com/kolunmi/bazaar). It features a storefront with app recommendations and categories that can be personalized based on the type of user. So regular users might see office related software products, gamers might see game related software products etc. Much like how there are app recommendations in the iOS App Store and Google Playstore. For other apps, there is a search button, and hyperlink support from the browser is in the works. Installed apps can easily be managed just like you would on Android or iOS.

Additionally, because it can be configured by the maintainers, many pitfall applications can be disabled until a proper flatpak is available. For example, [Bazzite](https://bazzite.gg/) is a gaming oriented OS that ships with Steam by default, it will prevent users from installing the steam flatpak (for now) because it still has issues with VR headsets and because it is already installed to begin with. 
For me, this new app store has really made installing an application on my laptop as easy as on my phone.

# How Flatpaks and Flathub will help the Linux ecosystem
The last real pain point in the Linux ecosystem is making sure creators can get paid for their creations. Whether you like it or not, money is a very good incentive for developers to put effort into developing and maintaining software on Linux. This has led to many popular applications having their Flatpak variants be maintained by a community effort, often introducing various bugs and issues along with it. Jorge Castro, a pioneer of [Universal Blue](https://universal-blue.org/) and Bluefin, and a Linux veteran, has a [very good video](https://www.youtube.com/watch?v=W7KHqVrh25Q) where he explains his plans for the new app store. In short, there will be a big donate button next to the install button, allowing end users easy access to support the creator. And in turn, this will pave the way for a proper payment system in the Flatpak ecosystem.

# A vision slowly becoming a reality
As an active member of the community, the operating systems under Universal Blue have really made using Linux as easy as using my phone. Most questions I see in the forums are entering into unexplored niches instead of installation failures or broken systems. For the majority of the users everything just works, and this is in thanks to the many contributors that do all the hard work for the end user. And with an increase in Flatpak adoption, this is only going to get better. 
Additionally, under Universal Blue your Flatpaks and OS will just update when you reboot your system, much like the auto-update feature on phones. I'd argue that it is even easier because you don't even notice it, unlike installing a system update on your phone. 

# A closing note
The new app store, [Bazaar](https://github.com/kolunmi/bazaar), is a volunteer effort by a sole developer named [Kolunmi](https://github.com/kolunmi). If this article inspired you to try out and install a universal blue image, and you end up liking the store, consider [donating to Kolunmi](https://ko-fi.com/kolunmi) and the [maintainers of universal blue](https://github.com/ublue-os).