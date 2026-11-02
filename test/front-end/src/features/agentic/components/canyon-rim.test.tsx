import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { ProjectFrontmatter } from "shared";
import { SITE_NAME } from "shared";

import { CanyonRim } from "../../../../../../front-end/src/features/agentic/components/canyon-rim";
import type { ContentLoader } from "../../../../../../front-end/src/shared/lib/content-loader";
import { createMemoryContentLoader } from "../../../../../../front-end/src/shared/lib/content-loader";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, mountIntoBody, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

function project(slug: string, title: string): ProjectFrontmatter & { body: string } {
  return {
    title,
    description: `About ${title}.`,
    date: "2026-06-10",
    tags: [],
    type: "project",
    draft: false,
    slug,
    socialImage: null,
    coverImage: `/images/projects/${slug}.svg`,
    coverImageAlt: `${title} artwork`,
    featured: false,
    projectOrder: 0,
    prioritySlot: null,
    status: null,
    role: null,
    created: null,
    links: [],
    info: null,
    body: "",
  };
}

async function mountLoadedRim(loader: ContentLoader): Promise<FakeMount> {
  const mount = mountIntoBody(createElement(MemoryRouter, null, createElement(CanyonRim, { loader })));

  await act(async () => {
    await settleMicrotasks();
  });

  return mount;
}

describe("CanyonRim", () => {
  test("names the site and links to every project page", async () => {
    const mount = await mountLoadedRim(createMemoryContentLoader([
      project("minimal-android-launcher", "Minimal Android Launcher"),
      project("obsidian-content-pipeline", "Obsidian Content Pipeline"),
    ]));

    try {
      const links = queryFakeElements(mount.container, (el) => el.nodeName === "A");

      expect(mount.container.textContent).toContain(SITE_NAME);

      expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
        ["Minimal Android Launcher", "/projects/minimal-android-launcher"],
        ["Obsidian Content Pipeline", "/projects/obsidian-content-pipeline"],
      ]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("renders nothing, not an error box, when the project list fails", async () => {
    const mount = await mountLoadedRim({
      ...createMemoryContentLoader([]),
      listProjects: () => Promise.reject(new Error("offline")),
    });

    try {
      expect(mount.container.childNodes).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("renders nothing when there are no projects", async () => {
    const mount = await mountLoadedRim(createMemoryContentLoader([]));

    try {
      expect(mount.container.childNodes).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
