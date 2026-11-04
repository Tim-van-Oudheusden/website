import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";

import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../src/test/fake-dom";

let useDocumentTitle: (pageTitle: string | null) => void;

beforeAll(async () => {
  await initFakeDomHarness();
  useDocumentTitle = (await import("../../../../../front-end/src/shared/hooks/use-document-title")).useDocumentTitle;
});

afterAll(() => {
  uninstallFakeDom();
});

function Page({ title }: { title: string | null }): null {
  useDocumentTitle(title);

  return null;
}

describe("useDocumentTitle", () => {
  test("titles the page as the server does, and follows the title when it changes", () => {
    const mount = mountIntoBody(createElement(Page, { title: "Now" }));

    expect(document.title).toBe("Now | Build with Tim");

    act(() => {
      mount.root.render(createElement(Page, { title: "Uses" }));
    });

    expect(document.title).toBe("Uses | Build with Tim");

    unmountFakeDomRoot(mount);
  });

  test("falls back to the site name when the page has no title of its own", () => {
    const mount = mountIntoBody(createElement(Page, { title: null }));

    expect(document.title).toBe("Build with Tim");

    unmountFakeDomRoot(mount);
  });
});
