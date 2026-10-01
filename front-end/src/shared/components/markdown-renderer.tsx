import * as React from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import "highlight.js/styles/github.css";
import { cn } from "@/shared/lib/utils";
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
  bodyNodes: React.ReactNode[];
}

const OBSIDIAN_CALLOUT_MARKER_PATTERN = /^\s*\[!([a-z0-9_-]+)\](?:[ \t]+([^\n]+))?(?:\n([\s\S]*))?$/i;

function flattenNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
     return node.map((child: React.ReactNode) => flattenNodeText(child)).join("");
   }

  if (React.isValidElement(node)) {
    const elementProps = node.props as { children?: React.ReactNode; alt?: string };
  if (
       (node.type === "img" || elementProps.children === null)
      && typeof elementProps.alt === "string"
      && elementProps.alt.length > 0
    ) {
      return elementProps.alt ?? "";
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

function parseObsidianCallout(children: React.ReactNode): ParsedObsidianCallout | null {
  const blockquoteChildren = React.Children
    .toArray(children)
    .filter((child) => !(typeof child === "string" && child.trim().length === 0));
  const firstNode = blockquoteChildren[0];
  if (!React.isValidElement(firstNode) || firstNode.type !== "p") {
    return null;
  }

  const firstParagraphElement = firstNode as React.ReactElement<{ children?: React.ReactNode }>;
  const firstParagraphChildren = React.Children.toArray(firstParagraphElement.props.children);
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

  const calloutBodyNodes: React.ReactNode[] = [];
  if (flattenNodeText(adjustedFirstParagraphChildren).trim().length > 0) {
    calloutBodyNodes.push(React.cloneElement(firstParagraphElement, {
      key: "callout-body-first-paragraph",
      children: adjustedFirstParagraphChildren,
    }));
  }

  calloutBodyNodes.push(...blockquoteChildren.slice(1));

  return {
    type,
    title,
    bodyNodes: calloutBodyNodes,
  };
}

/**
 * Renders a markdown string to styled HTML using react-markdown.
 *
 * Wraps output in prose classes for typography styling.
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists).
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps): React.JSX.Element {
  const headingIdByOffset = React.useMemo(() => {
    const entries = extractMarkdownHeadingsWithOffsets(content, TOC_MAX_DEPTH);
    return {
      byOffset: new Map(entries.map((entry) => [entry.startOffset, entry.id])),
      byLineColumn: new Map(entries.map((entry) => [`${entry.startLine}:${entry.startColumn}`, entry.id])),
    };
  }, [content]);

  function resolveHeadingIdFromPosition(
    headingText: string,
    position?: {
      offset?: number | undefined;
      line?: number | undefined;
      column?: number | undefined;
    },
 ): string {
    if (position?.offset !== undefined) {
      const resolvedId = headingIdByOffset.byOffset.get(position.offset);
      if (resolvedId !== undefined) {
        return resolvedId;
      }
    }

    if (position?.line !== undefined && position.column !== undefined) {
      const resolvedId = headingIdByOffset.byLineColumn.get(`${position.line}:${position.column}`);
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

  const components = React.useMemo<Components>(() => ({
    a({ href, children, ...rest }) {
      const isExternal = href?.startsWith("http") === true;
      let externalLinkProps: {
        target?: string;
        rel?: string;
      } = {};
      if (isExternal) {
        externalLinkProps = { target: "_blank", rel: "noopener noreferrer" };
      }

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
      const id = resolveHeadingIdFromPosition(headingText, node?.position?.start);
      return (
        <h1 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h1>
      );
    },
    h2({ children, className, node, ...rest }) {
      const headingText = normalizeMarkdownHeadingText(flattenNodeText(children));
      const id = resolveHeadingIdFromPosition(headingText, node?.position?.start);
      return (
        <h2 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h2>
      );
    },
    h3({ children, className, node, ...rest }) {
      const headingText = normalizeMarkdownHeadingText(flattenNodeText(children));
      const id = resolveHeadingIdFromPosition(headingText, node?.position?.start);
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
