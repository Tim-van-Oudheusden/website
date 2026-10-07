import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { HomeProjectShowcase } from "../../../../../../front-end/src/features/home/components/home-project-showcase";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeProjectsSection } from "../../../../../../front-end/src/features/home/types/home-section";
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

function project(slug: string, projectOrder: number, featured: boolean): ProjectFrontmatter & { body: string } {
  return {
    title: slug,
    description: `About ${slug}.`,
    date: "2026-06-10",
    tags: [],
    type: "project",
    draft: false,
    slug,
    socialImage: null,
    coverImage: `/images/projects/${slug}.svg`,
    coverImageAlt: `${slug} artwork`,
    featured,
    projectOrder,
    prioritySlot: null,
    status: "Shipped",
    role: "Developer",
    created: "2026",
    links: [],
    info: null,
    body: "",
  };
}

const FOR_DEVS_SECTION = HOME_SECTIONS.find((section): section is HomeProjectsSection => section.variant === "projects");

function mountShowcase(loader: ContentLoader): FakeMount {
  if (FOR_DEVS_SECTION === undefined) {
    throw new Error("Expected a projects home section");
  }

  return mountIntoBody(
    createElement(MemoryRouter, null, createElement(HomeProjectShowcase, { section: FOR_DEVS_SECTION, loader })),
  );
}

function texts(mount: FakeMount, nodeName: string): string[] {
  return queryFakeElements(mount.container, (el) => el.nodeName === nodeName).map((el) => el.textContent);
}

describe("HomeProjectShowcase", () => {
  test("shows a loading note, then the featured project first and the rest after it", async () => {
    const mount = mountShowcase(createMemoryContentLoader([
      project("pipeline", 20, false),
      project("launcher", 10, true),
      project("sandbox", 30, false),
    ]));

    try {
      expect(mount.container.textContent).toContain("Loading projects...");

      await act(async () => {
        await settleMicrotasks();
      });

      expect(texts(mount, "H3")).toEqual(["launcher", "pipeline", "sandbox"]);
      expect(mount.container.textContent).toContain("Start with launcher, then explore the rest on GitHub.");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("shows an error note when the projects cannot be loaded", async () => {
    const mount = mountShowcase({
      ...createMemoryContentLoader([]),
      listProjects: () => Promise.reject(new Error("offline")),
    });

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(mount.container.textContent).toContain("Projects could not be loaded right now.");
      expect(texts(mount, "H3")).toEqual([]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
