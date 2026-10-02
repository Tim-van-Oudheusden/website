import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { createRoot as createRootValue, Root } from "react-dom/client";
type CreateRootFn = typeof createRootValue;
import { renderToStaticMarkup } from "react-dom/server";
import {
  calculateCardTiltAngles,
  resolvePagedCarouselScrollLeft,
  ValuePillarsCarousel,
} from "../../../../../../front-end/src/features/home/components/value-pillars-carousel";
import {
  installFakeDom,
  queryFakeElements,
  triggerFakeResizeObservers,
  triggerWindowEvent,
  uninstallFakeDom,
  type FakeDocument,
  type FakeElement,
  type FakeNode,
} from "../../../test/fake-dom";

function renderCarousel(): string {
  return renderToStaticMarkup(
    createElement(ValuePillarsCarousel, {
      headingId: "test-heading",
      heading: "Test heading",
      body: "Test body",
      inWhiteWell: true,
    }),
  );
}

const PAGE_STEP_ARGS = {
  cardOffsetLefts: [48, 378, 708, 1038, 1368],
  viewportWidth: 1000,
  trackPaddingLeft: 48,
};

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

function renderCarouselContainer(): { container: FakeElement; root: Root } {
  const fakeDocument = document as unknown as FakeDocument;
  const container = fakeDocument.createElement("div");
  fakeDocument.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  act(() => {
    root.render(
      createElement(ValuePillarsCarousel, {
        headingId: "values-heading",
        heading: "Values",
        body: "Why we do what we do.",
      }),
    );
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

function parentElementOf(node: FakeNode): FakeElement {
  const parent = node.parentNode;
  if (parent?.nodeType !== 1) {
    throw new Error("Expected an element parent");
  }
  return parent as FakeElement;
}

describe("ValuePillarsCarousel", () => {
  test("renders the intro heading and body copy", () => {
    const html = renderCarousel();

    expect(html).toContain('id="test-heading"');
    expect(html).toContain("Test heading");
    expect(html).toContain("Test body");
  });

  test("resolves next-page navigation to card-aligned offsets", () => {
    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 48,
        direction: 1,
        ...PAGE_STEP_ARGS,
      }),
    ).toBe(990);

    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 990,
        direction: -1,
        ...PAGE_STEP_ARGS,
      }),
    ).toBe(0);
  });

  test("resolves clamped navigation at the first and last pages", () => {
    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 0,
        direction: -1,
        cardOffsetLefts: [48, 378],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(0);

    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 330,
        direction: 1,
        cardOffsetLefts: [48, 378],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(330);
  });
  test("resolves empty card lists to the current scroll position", () => {
    for (const direction of [1, -1] as const) {
      expect(
        resolvePagedCarouselScrollLeft({
          currentScrollLeft: 123,
          direction,
          cardOffsetLefts: [],
          viewportWidth: 1000,
          trackPaddingLeft: 48,
        }),
      ).toBe(123);
    }
  });

  test("resolves a single card to its padded offset, clamped at zero", () => {
    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 0,
        direction: 1,
        cardOffsetLefts: [48],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(0);

    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 0,
        direction: 1,
        cardOffsetLefts: [200],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(152);

    // A card offset inside the track padding clamps to zero.
    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 0,
        direction: -1,
        cardOffsetLefts: [20],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(0);
  });

  test("resolves a zero card step to the current scroll position", () => {
    expect(
      resolvePagedCarouselScrollLeft({
        currentScrollLeft: 77,
        direction: 1,
        cardOffsetLefts: [48, 48],
        viewportWidth: 1000,
        trackPaddingLeft: 48,
      }),
    ).toBe(77);
  });

  test("steps one card per page in a narrow viewport", () => {
    const narrow = {
      cardOffsetLefts: [0, 330, 660],
      viewportWidth: 300,
      trackPaddingLeft: 0,
    };
    // floor((300 + 1) / 330) = 0, so the page size clamps to one card.
    expect(resolvePagedCarouselScrollLeft({ currentScrollLeft: 0, direction: 1, ...narrow })).toBe(330);
    expect(resolvePagedCarouselScrollLeft({ currentScrollLeft: 330, direction: -1, ...narrow })).toBe(0);
    expect(resolvePagedCarouselScrollLeft({ currentScrollLeft: 660, direction: 1, ...narrow })).toBe(660);
  });
});

describe("calculateCardTiltAngles", () => {
  const CARD = { width: 300, height: 400 };

  test("returns zero tilt at the card centre, without signed zeros", () => {
    const angles = calculateCardTiltAngles({ pointerX: 150, pointerY: 200, ...CARD });
    // `toBe` is identity-based: -0 would fail, so this pins the signed-zero
    // normalisation as well as the zero tilt at the centre.
    expect(angles.rotateX).toBe(0);
    expect(angles.rotateY).toBe(0);
  });

  test("returns the maximum tilt at the corners", () => {
    expect(calculateCardTiltAngles({ pointerX: 300, pointerY: 0, ...CARD })).toEqual({ rotateX: 4, rotateY: 4 });
    expect(calculateCardTiltAngles({ pointerX: 0, pointerY: 400, ...CARD })).toEqual({ rotateX: -4, rotateY: -4 });
  });

  test("returns zero tilt for zero or negative card sizes", () => {
    expect(calculateCardTiltAngles({ pointerX: 150, pointerY: 200, width: 0, height: 400 })).toEqual({ rotateX: 0, rotateY: 0 });
    expect(calculateCardTiltAngles({ pointerX: 150, pointerY: 200, width: 300, height: -5 })).toEqual({ rotateX: 0, rotateY: 0 });
  });

  test("clamps out-of-bounds pointers to the maximum tilt", () => {
    expect(calculateCardTiltAngles({ pointerX: 600, pointerY: -400, ...CARD })).toEqual({ rotateX: 4, rotateY: 4 });
    expect(calculateCardTiltAngles({ pointerX: -300, pointerY: 800, ...CARD })).toEqual({ rotateX: -4, rotateY: -4 });
  });

  test("scales with a custom maximum tilt", () => {
    expect(calculateCardTiltAngles({ pointerX: 300, pointerY: 0, ...CARD, maxTiltDegrees: 10 })).toEqual({ rotateX: 10, rotateY: 10 });
  });
});

describe("ValuePillarsCarousel interaction", () => {
  test("scrolls the track by one page on next and previous clicks", () => {
    const { container, root } = renderCarouselContainer();
    const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
    expect(articles.length).toBe(5);
    // The scroller is the grandparent of the articles (scroller > flex row > article).
    const scroller = parentElementOf(parentElementOf(articles[0] as FakeNode));
    articles.forEach((article, index) => {
      article.offsetLeft = index * 330;
    });

    scroller.clientWidth = 1000;

    const buttons = queryFakeElements(container, (element) => element.tagName === "BUTTON");
    const nextButton = buttons.find((button) => button.getAttribute("aria-label") === "Next cards");
    const previousButton = buttons.find((button) => button.getAttribute("aria-label") === "Previous cards");
    expect(nextButton).toBeDefined();
    expect(previousButton).toBeDefined();

    clickElement(container, nextButton!);
    expect(scroller.scrollCalls).toEqual([{ left: 990, behavior: "smooth" }]);
    expect(scroller.scrollLeft).toBe(990);

    clickElement(container, previousButton!);
    expect(scroller.scrollCalls).toEqual([
      { left: 990, behavior: "smooth" },
      { left: 0, behavior: "smooth" },
    ]);
    expect(scroller.scrollLeft).toBe(0);

    act(() => {
      root.unmount();
    });
  });

  test("tilts the card toward the pointer on mousemove", () => {
    const { container } = renderCarouselContainer();
    const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
    const article = articles[0];
    if (article === undefined) {
      throw new Error("Expected a card article");
    }
    const card = article.childNodes[0] as FakeElement;
    card.rect = { width: 300, height: 400 };

    act(() => {
      container.dispatch("mousemove", {
        type: "mousemove",
        target: card,
        currentTarget: card,
        clientX: 300,
        clientY: 0,
      });
    });

    expect(card.style["transform"]).toBe("perspective(900px) rotateX(4deg) rotateY(4deg)");
  });

  test("resets the card tilt when the pointer leaves", () => {
    const { container } = renderCarouselContainer();
    const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
    const article = articles[0];
    if (article === undefined) {
      throw new Error("Expected a card article");
    }
    const card = article.childNodes[0] as FakeElement;
    card.rect = { width: 300, height: 400 };

    act(() => {
      container.dispatch("mousemove", {
        type: "mousemove",
        target: card,
        currentTarget: card,
        clientX: 300,
        clientY: 0,
      });
    });

    act(() => {
      container.dispatch("mouseout", {
        type: "mouseout",
        target: card,
        currentTarget: card,
        relatedTarget: null,
      });
    });

    expect(card.style["transform"]).toBe("perspective(900px) rotateX(0deg) rotateY(0deg)");
  });

  test("measures the card description height into a css variable on mount", () => {
    const { container } = renderCarouselContainer();
    const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
    const article = articles[0];
    if (article === undefined) {
      throw new Error("Expected a card article");
    }
    const card = article.childNodes[0] as FakeElement;

    // The fake element's default scrollHeight is 0, so the mount effect
    // exposes the measured height as 0px.
    expect(card.style["--value-pillar-description-height"]).toBe("0px");
  });

  test("updates the description height when the description element is resized", () => {
    const { container, root } = renderCarouselContainer();
    const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
    const article = articles[0];
    if (article === undefined) {
      throw new Error("Expected a card article");
    }
    const card = article.childNodes[0] as FakeElement;
    const description = queryFakeElements(card, (element) => element.tagName === "P")[0]!;
    description.scrollHeight = 120;

    act(() => {
      triggerFakeResizeObservers();
    });

    expect(card.style["--value-pillar-description-height"]).toBe("120px");
    act(() => {
      root.unmount();
    });
  });

  test("falls back to the window resize listener when ResizeObserver is unavailable", () => {
    const globals = globalThis as Record<string, unknown>;
    const savedResizeObserver = globals["ResizeObserver"];
    delete globals["ResizeObserver"];
    try {
      const { container, root } = renderCarouselContainer();
      const articles = queryFakeElements(container, (element) => element.tagName === "ARTICLE");
      const article = articles[0];
      if (article === undefined) {
        throw new Error("Expected a card article");
      }
      const card = article.childNodes[0] as FakeElement;
      const description = queryFakeElements(card, (element) => element.tagName === "P")[0]!;
      description.scrollHeight = 90;

      act(() => {
        triggerWindowEvent("resize");
      });

      expect(card.style["--value-pillar-description-height"]).toBe("90px");

      act(() => {
        root.unmount();
      });

      // After unmount the resize listener is removed, so a further resize
      // must not re-measure the (now detached) description.
      description.scrollHeight = 130;
      act(() => {
        triggerWindowEvent("resize");
      });
      expect(card.style["--value-pillar-description-height"]).toBe("90px");
    } finally {
      globals["ResizeObserver"] = savedResizeObserver;
    }
  });
});
