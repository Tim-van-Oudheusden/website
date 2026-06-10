---
title: Personal Website Platform
description: A full-stack personal website for articles, projects, and long-form markdown content.
date: 2026-06-10
tags:
  - React
  - Fastify
  - Tailwind CSS
  - Content
type: project
draft: false
slug: personal-website-platform
coverImage: /images/projects/personal-website-platform.svg
coverImageAlt: Abstract Adwaita editorial artwork showing a browser window, content cards, and blue-green accent shapes.
featured: true
projectOrder: 10
status: Shipped
role: Full-stack developer
timeframe: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/website
outcome: Built a maintainable home for articles, projects, and experiments with shared route and content contracts.
---

# Personal Website Platform

This project is the full-stack platform behind this website. It combines a React front end, a Fastify back end, and a shared TypeScript package so routes, content types, and API contracts stay aligned.

## Problem

I wanted a personal site that could grow from a homepage and articles into a broader system for projects, recommendations, and experiments without turning every page into a one-off implementation.

## Approach

The implementation keeps content in markdown, exposes it through a small content API, and renders it with reusable page components and shared design tokens.

## Outcome

The site now has a clearer foundation for publishing long-form articles and credibility-focused project pages from the same content pipeline.
