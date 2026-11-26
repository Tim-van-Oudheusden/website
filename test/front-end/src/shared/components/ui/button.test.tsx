import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../../../../../../front-end/src/shared/components/ui/button";

function classTokens(html: string): string[] {
  return /class="([^"]*)"/.exec(html)?.[1]?.split(" ") ?? [];
}

describe("Button press feedback", () => {
  test("scales a button to 0.97 while pressed, over a short ease-out transition", () => {
    const tokens = classTokens(renderToStaticMarkup(createElement(Button, null, "Send")));

    expect(tokens).toContain("active:scale-[0.97]");
    expect(tokens).toContain("duration-150");
    expect(tokens).toContain("ease-out");
    expect(tokens).toContain("transition-[color,background-color,border-color,box-shadow,scale]");
  });

  test("gives an asChild link the same press feedback", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { asChild: true }, createElement("a", { href: "/articles" }, "Articles")),
    );

    expect(html).toStartWith("<a ");
    expect(classTokens(html)).toContain("active:scale-[0.97]");
  });

  test("a disabled button takes no pointer input, so it cannot be pressed", () => {
    const tokens = classTokens(renderToStaticMarkup(createElement(Button, { disabled: true }, "Send")));

    expect(tokens).toContain("disabled:pointer-events-none");
  });
});
