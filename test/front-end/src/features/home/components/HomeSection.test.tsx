import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { MouseEvent } from "react";
import type { createRoot as createRootValue, Root } from "react-dom/client";
type CreateRootFn = typeof createRootValue;
import { renderToStaticMarkup } from "react-dom/server";
import { headingIdFor, HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import { HomeSection } from "../../../../../../front-end/src/features/home/components/home-section";
import { HomeSectionDefault } from "../../../../../../front-end/src/features/home/components/home-section-default";
import { HomeSectionShell } from "../../../../../../front-end/src/features/home/components/home-section-shell";
import type { HomeSectionDefinition, HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";
import {
  installFakeDom,
  queryFakeElements,
  uninstallFakeDom,
  type FakeDocument,
  type FakeElement,
} from "../../../test/fake-dom";

function findHomeSection(sectionId: HomeSectionId): HomeSectionDefinition {
  const section = HOME_SECTIONS.find((candidateSection) => candidateSection.id === sectionId);

  if (section === undefined) {
    throw new Error(`Expected ${sectionId} section in homepage config`);
  }

  return section;
}

function renderSection(sectionId: HomeSectionId): string {
  return renderToStaticMarkup(
    createElement(HomeSection, { section: findHomeSection(sectionId) }),
  );
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = 0;

  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }

  return count;
}

// react-dom/client is the only deferred import: react-dom captures `canUseDOM`
// at module load, so the fake DOM globals must be installed before it evaluates
// (module loading boundary, not a runtime-selected specifier).
let createRoot: CreateRootFn;

beforeAll(async () => {
  installFakeDom();
  ({ createRoot } = await import("react-dom/client"));
});

afterAll(() => {
  uninstallFakeDom();
});

function renderDefaultSectionContainer(
  section: HomeSectionDefinition,
  onCtaActivate: ((sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void) | undefined,
): { container: FakeElement; root: Root } {
  const fakeDocument = document as unknown as FakeDocument;
  const container = fakeDocument.createElement("div");

  fakeDocument.body.appendChild(container);
  const root = createRoot(container as unknown as Element);

  act(() => {
    root.render(createElement(HomeSectionDefault, { section, onCtaActivate }));
  });

  return { container, root };
}

function clickElement(container: FakeElement, target: FakeElement): void {
  act(() => {
    container.dispatch("click", {
      type: "click",
      target,
      currentTarget: target,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    });
  });
}

describe("HomeSection", () => {
  test("renders the start hero with its bottom-right anchored portrait", () => {
    const html = renderSection("start");

    expect(html).toContain('data-testid="start-portrait"');
    expect(html).toContain('src="/images/me.png"');
    expect(html).toMatch(/class="[^"]*absolute right-0 bottom-0/);
  });

  test("renders the start CTA linking to its configured target section", () => {
    const html = renderSection("start");
    const ctaTargetId = findHomeSection("start").ctaTargetId;

    expect(ctaTargetId).toBeDefined();
    expect(html).toContain("Discover");
    expect(html).toContain(`href="#${ctaTargetId}"`);
  });

  test("declares the hero as an explicit variant, not an id string match", () => {
    expect(findHomeSection("start").variant).toBe("start");
  });

  test("does not render a default-variant section with the start id as the hero", () => {
    const html = renderToStaticMarkup(
      createElement(HomeSection, {
        section: {
          id: "start",
          label: "start",
          heading: "Plain section",
          body: "Not the hero.",
          bgColor: "var(--adw-page-brown-bg)",
          contentDirection: "row",
          variant: "default",
        },
      }),
    );

    expect(html).not.toContain('data-testid="start-portrait"');
    expect(html).toContain("Plain section");
  });

  test("renders each configured section's real heading and body copy", () => {
    for (const section of HOME_SECTIONS) {
      const html = renderSection(section.id);
      // React escapes apostrophes as &#x27; in server markup.
      const text = html.replaceAll("&#x27;", "'");

      expect(text).toContain(section.heading);
      expect(text).toContain(section.body);
    }
  });

  test("renders the for-you section through its carousel variant", () => {
    const html = renderSection("for-you");

    expect(html).toContain("For you");
  });

  test("renders the footer as a semantic footer with site identification", () => {
    const html = renderSection("footer");

    expect(html).toContain("<footer");
    expect(html).toContain("Reboot With Me");
  });

  test("renders a copyright line in the footer", () => {
    const html = renderSection("footer");

    expect(html).toMatch(/©/);
    expect(html).toContain(String(new Date().getFullYear()));
  });

  test("renders a genuine social link (GitHub) without invented channels", () => {
    const html = renderSection("footer");

    expect(html).toContain("https://github.com/Tim-van-Oudheusden/website");
    expect(html).not.toContain("privacy");
    expect(html).not.toContain("terms");
    expect(html).not.toContain("mastodon");
    expect(html).not.toContain("linkedin");
  });

  test("derives the heading id from the section id via one seam", () => {
    expect(headingIdFor("start")).toBe("start-heading");
    expect(headingIdFor("community-and-docs")).toBe("community-and-docs-heading");
    expect(headingIdFor("footer")).toBe("footer-heading");
  });

  test("renders exactly one frame and one heading per section id", () => {
    for (const section of HOME_SECTIONS) {
      const html = renderSection(section.id);
      const headingId = headingIdFor(section.id);

      expect(countOccurrences(html, `id="${section.id}"`)).toBe(1);
      expect(html).toContain(`aria-labelledby="${headingId}"`);
      expect(countOccurrences(html, `id="${headingId}"`)).toBe(1);
    }
  });

  test("renders the shell background image when the section defines one", () => {
    const html = renderToStaticMarkup(
      createElement(
        HomeSectionShell,
        {
          section: {
            id: "proof",
            label: "Proof",
            heading: "Proof",
            body: "Body",
            bgColor: "white",
            bgImage: "/images/proof-bg.png",
            contentDirection: "column",
          },
          children: "content",
        },
      ),
    );

    expect(html).toContain("background-image:url(/images/proof-bg.png)");
    expect(html).toContain("background-size:cover");
    expect(html).toContain("background-position:center");
  });

  test("omits the background image styles when the section has no bgImage", () => {
    const html = renderToStaticMarkup(
      createElement(
        HomeSectionShell,
        {
          section: {
            id: "proof",
            label: "Proof",
            heading: "Proof",
            body: "Body",
            bgColor: "white",
            contentDirection: "column",
          },
          children: "content",
        },
      ),
    );

    expect(html).not.toContain("background-image");
  });

  test("renders the default variant CTA as an anchor to its target section", () => {
    const html = renderToStaticMarkup(
      createElement(HomeSectionDefault, {
        section: {
          id: "for-devs",
          label: "For devs",
          heading: "For devs",
          body: "Body",
          bgColor: "white",
          ctaLabel: "See the tools",
          ctaTargetId: "for-you",
          contentDirection: "column",
        },
      }),
    );

    expect(html).toContain('href="#for-you"');
    expect(html).toContain("See the tools");
  });

  test("omits the CTA when either the label or the target is missing", () => {
    const base = {
      id: "for-devs" as HomeSectionId,
      label: "For devs",
      heading: "For devs",
      body: "Body",
      bgColor: "white",
      contentDirection: "column" as const,
    };

    const labelOnly = renderToStaticMarkup(
      createElement(HomeSectionDefault, { section: { ...base, ctaLabel: "See the tools" } }),
    );

    expect(labelOnly).not.toContain("<a ");

    const targetOnly = renderToStaticMarkup(
      createElement(HomeSectionDefault, { section: { ...base, ctaTargetId: "for-you" } }),
    );

    expect(targetOnly).not.toContain("<a ");
  });
});

describe("HomeSectionDefault interaction", () => {
  test("invokes onCtaActivate with the target section id and the anchor element on CTA click", () => {
    const ctaActivations: { sectionId: HomeSectionId; targetTag: string; href: string | null }[] = [];
    const { container } = renderDefaultSectionContainer(
      {
        id: "start",
        label: "Start",
        heading: "Start",
        body: "Body text",
        bgColor: "white",
        contentDirection: "row",
        ctaLabel: "Get started",
        ctaTargetId: "for-you",
      },
      (sectionId, event) => {
        ctaActivations.push({
          sectionId,
          targetTag: event.currentTarget.tagName,
          href: event.currentTarget.getAttribute("href"),
        });
      },
    );

    const anchors = queryFakeElements(container, (element) => element.tagName === "A");

    expect(anchors.length).toBe(1);
    const anchor = anchors[0];

    if (anchor === undefined) {
      throw new Error("Expected a CTA anchor");
    }

    clickElement(container, anchor);
    expect(ctaActivations).toEqual([{ sectionId: "for-you", targetTag: "A", href: "#for-you" }]);
  });
});
