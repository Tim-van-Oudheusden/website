import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "../../../../../../front-end/src/shared/components/ui/card";

interface PrimitiveCase {
  name: string;
  slot: string;
  render: (className?: string) => string;
}

function renderPrimitive(primitive: (props: { className?: string }) => unknown, className?: string): string {
  return renderToStaticMarkup(
    createElement(primitive, { className, children: ["primitive content"] }),
  );
}

const PRIMITIVES: PrimitiveCase[] = [
  { name: "Card", slot: "card", render: (className) => renderPrimitive(Card, className) },
  { name: "CardHeader", slot: "card-header", render: (className) => renderPrimitive(CardHeader, className) },
  { name: "CardTitle", slot: "card-title", render: (className) => renderPrimitive(CardTitle, className) },
  { name: "CardDescription", slot: "card-description", render: (className) => renderPrimitive(CardDescription, className) },
  { name: "CardAction", slot: "card-action", render: (className) => renderPrimitive(CardAction, className) },
  { name: "CardContent", slot: "card-content", render: (className) => renderPrimitive(CardContent, className) },
  { name: "CardFooter", slot: "card-footer", render: (className) => renderPrimitive(CardFooter, className) },
];

describe("Card primitives", () => {
  for (const { name, slot, render } of PRIMITIVES) {
    test(`${name} renders its child content in the ${slot} slot`, () => {
      const html = render();

      expect(html).toContain("primitive content");
      expect(html).toContain(`data-slot="${slot}"`);
    });

    test(`${name} merges a caller className`, () => {
      const html = render("custom-surface");

      expect(html).toContain("custom-surface");
    });
  }
});