import { cn } from "cn";
import type { JSX, ReactElement, ReactNode } from "react";
import { Children, isValidElement, memo, useMemo } from "react";
import Markdown from "react-markdown";
import type { Components, ExtraProps } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import remarkGfm from "remark-gfm";

import {
  extractMarkdownHeadingsWithOffsets,
  normalizeMarkdownHeadingText,
  slugifyHeadingText,
  TOC_MAX_DEPTH,
} from "@/shared/lib/markdown-headings";

export interface MarkdownRendererProps {
  /** Raw markdown string (frontmatter already stripped). */
  content: string;
}

interface ParsedObsidianCallout {
  type: string;
  title: string;
  bodyNodes: ReactNode[];
}

/** Source start point of a rendered hast node (`node.position.start`); generated nodes have none. */
type HastPoint = NonNullable<NonNullable<ExtraProps["node"]>["position"]>["start"];

const OBSIDIAN_CALLOUT_MARKER_PATTERN = /^\s*\[!([a-z0-9_-]+)\](?:[ \t]+([^\n]+))?(?:\n([\s\S]*))?$/i;

function flattenNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child: ReactNode) => flattenNodeText(child)).join("");
  }

  if (isValidElement(node)) {
    const elementProps = node.props as { children: ReactNode; alt: string | undefined };

    if (
      (node.type === "img" || elementProps.children === null)
      && typeof elementProps.alt === "string"
      && elementProps.alt.length > 0
    ) {
      return elementProps.alt;
    }

    return flattenNodeText(elementProps.children);
  }

  return "";
}

function formatCalloutTitle(type: string): string {
  return type
    .split(/[-_]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function parseObsidianCallout(children: ReactNode): ParsedObsidianCallout | null {
  // Children.toArray is required here: react-markdown hands over nested/fragmented children and
  // the flattened, keyed list is re-rendered as callout body nodes.
  // eslint-disable-next-line @eslint-react/no-children-to-array -- see comment above
  const blockquoteChildren = Children.toArray(children)
    .filter((child) => !(typeof child === "string" && child.trim().length === 0));
  const firstNode = blockquoteChildren[0];

  if (!isValidElement(firstNode) || firstNode.type !== "p") {
    return null;
  }

  const firstParagraphElement = firstNode as ReactElement<{ children: ReactNode }>;
  // eslint-disable-next-line @eslint-react/no-children-to-array -- flattens the paragraph text to detect the marker
  const firstParagraphChildren = Children.toArray(firstParagraphElement.props.children);

  if (firstParagraphChildren.length === 0 || typeof firstParagraphChildren[0] !== "string") {
    return null;
  }

  const markerMatch = OBSIDIAN_CALLOUT_MARKER_PATTERN.exec(firstParagraphChildren[0]);

  if (markerMatch === null) {
    return null;
  }

  const matchedType = markerMatch[1];

  if (matchedType === undefined) {
    return null;
  }

  const type = matchedType.toLowerCase();
  const title = markerMatch[2]?.trim() ?? formatCalloutTitle(type);
  const markerRemainder = markerMatch[3]?.trim() ?? "";

  const adjustedFirstParagraphChildren = firstParagraphChildren.slice(1);

  if (markerRemainder.length > 0) {
    adjustedFirstParagraphChildren.unshift(markerRemainder);
  }

  const calloutBodyNodes: ReactNode[] = [];

  if (flattenNodeText(adjustedFirstParagraphChildren).trim().length > 0) {
    calloutBodyNodes.push(
      <p key="callout-body-first-paragraph" {...firstParagraphElement.props}>
        {adjustedFirstParagraphChildren}
      </p>,
    );
  }

  calloutBodyNodes.push(...blockquoteChildren.slice(1));

  return {
    type,
    title,
    bodyNodes: calloutBodyNodes,
  };
}

interface HeadingIdLookup {
  byOffset: Map<number, string>;
  byLineColumn: Map<string, string>;
}

function resolveHeadingIdFromPosition(
  headingIds: HeadingIdLookup,
  headingText: string,
  position: HastPoint | undefined,
): string {
  if (position?.offset !== undefined) {
    const resolvedId = headingIds.byOffset.get(position.offset);

    if (resolvedId !== undefined) {
      return resolvedId;
    }
  }

  if (position !== undefined) {
    const resolvedId = headingIds.byLineColumn.get(`${position.line}:${position.column}`);

    if (resolvedId !== undefined) {
      return resolvedId;
    }
  }

  // A lookup miss means this rendered heading was not part of the extracted
  // set, so the TOC has no link for it; inventing a position-suffixed id
  // here would silently diverge. Stay deterministic and make it loud.
  console.error(
    `[markdown-renderer] heading id lookup missed for "${headingText}"; TOC link may be absent.`,
  );

  return slugifyHeadingText(headingText) || "section";
}

/**
 * Renders a markdown string to styled HTML using react-markdown.
 *
 * Wraps output in prose classes for typography styling.
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists).
 */
export const MarkdownRenderer = memo(({
  content,
}: MarkdownRendererProps): JSX.Element => {
  const headingIdByOffset = useMemo((): HeadingIdLookup => {
    const entries = extractMarkdownHeadingsWithOffsets(content, TOC_MAX_DEPTH);

    return {
      byOffset: new Map(entries.map((entry) => [entry.startOffset, entry.id])),
      byLineColumn: new Map(entries.map((entry) => [`${entry.startLine}:${entry.startColumn}`, entry.id])),
    };
  }, [content]);

  const components = useMemo<Components>(() => ({
    a({ href, children, ...rest }) {
      const isExternal = href?.startsWith("http") === true;
      const externalLinkProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

      return (
        <a
          href={href}
          {...externalLinkProps}
          {...rest}
        >
          {children}
        </a>
      );
    },
    h1({ children, className, node, ...rest }) {
      const headingText = normalizeMarkdownHeadingText(flattenNodeText(children));
      const id = resolveHeadingIdFromPosition(headingIdByOffset, headingText, node?.position?.start);

      return (
        <h1 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h1>
      );
    },
    h2({ children, className, node, ...rest }) {
      const headingText = normalizeMarkdownHeadingText(flattenNodeText(children));
      const id = resolveHeadingIdFromPosition(headingIdByOffset, headingText, node?.position?.start);

      return (
        <h2 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h2>
      );
    },
    h3({ children, className, node, ...rest }) {
      const headingText = normalizeMarkdownHeadingText(flattenNodeText(children));
      const id = resolveHeadingIdFromPosition(headingIdByOffset, headingText, node?.position?.start);

      return (
        <h3 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h3>
      );
    },
    blockquote({ children, className, ...rest }) {
      const callout = parseObsidianCallout(children);

      if (callout === null) {
        return (
          <blockquote className={className} {...rest}>
            {children}
          </blockquote>
        );
      }

      return (
        <div
          data-callout-type={callout.type}
          className="my-6 rounded-md border border-[var(--adw-light-4)] bg-[var(--adw-light-2)] px-4 py-3 text-[var(--adw-dark-4)] dark:border-[var(--adw-dark-1)] dark:bg-[var(--adw-dark-3)] dark:text-[var(--adw-light-2)]"
        >
          <p className="m-0 text-sm font-semibold tracking-wide">{callout.title}</p>
          {callout.bodyNodes.length > 0 && (
            <div className="mt-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
              {callout.bodyNodes}
            </div>
          )}
        </div>
      );
    },
    img({ src, alt, ...rest }) {
      return (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          className="rounded-md"
          {...rest}
        />
      );
    },
    code({ className, children, ...rest }) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },
  }), [headingIdByOffset]);

  return (
    <article className="prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </Markdown>
    </article>
  );
});
