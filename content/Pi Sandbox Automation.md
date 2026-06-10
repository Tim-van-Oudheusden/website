---
title: Pi Sandbox Automation
description: Automation for running and testing sandboxed workloads with reproducible container and compose configuration.
date: 2026-06-10
tags:
  - Automation
  - Containers
  - Testing
  - Linux
type: project
draft: false
slug: pi-sandbox-automation
coverImage: /images/projects/pi-sandbox-automation.svg
coverImageAlt: Abstract Adwaita editorial artwork showing a small computer board, automation path, and container blocks.
featured: false
projectOrder: 30
status: Shipped
role: Developer
timeframe: 2026
links:
  - type: repo
    label: Repository scripts
    href: https://github.com/Tim-van-Oudheusden/website
outcome: Captured sandbox assumptions in scripts and tests so local automation remains easier to inspect and maintain.
---

# Pi Sandbox Automation

This project captures the automation around local sandbox execution. The repository includes scripts and tests for sandbox setup, compose files, and supporting container configuration.

## Problem

Local automation becomes fragile when setup knowledge only lives in memory. The sandbox work needed repeatable commands and tests that document expected behavior.

## Approach

The project keeps scripts and configuration in the repository, then uses tests to verify important generated files and route assumptions.

## Outcome

The automation is easier to review, easier to rerun, and less dependent on manual setup notes.
