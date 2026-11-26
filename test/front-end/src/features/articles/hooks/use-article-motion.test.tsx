import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import type { ReactElement } from "react";

import { useArticleMotion } from "../../../../../../front-end/src/features/articles/hooks/use-article-motion";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

afterEach(() => {
  window.location.hash = "";
});

function MotionProbe(): ReactElement {
  const motion = useArticleMotion();

  return <output data-slot="page-enter">{String(motion.pageEnter)}</output>;
}

function pageEnterOf(mount: FakeMount): string {
  return findBySlot(mount.container, "page-enter").textContent;
}

describe("useArticleMotion", () => {
  test("enables the page enter when nothing rules motion out", () => {
    const mount = mountIntoBody(<MotionProbe />);

    try {
      expect(pageEnterOf(mount)).toBe("true");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("a heading deep link skips the page enter", () => {
    window.location.hash = "#deep-heading";
    const mount = mountIntoBody(<MotionProbe />);

    try {
      expect(pageEnterOf(mount)).toBe("false");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
