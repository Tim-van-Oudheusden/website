import * as React from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import "highlight.js/styles/github.css";
import { cn } from "@/shared/lib/utils";

export interface MarkdownRendererProps {
  /** Raw markdown string (frontmatter already stripped). */
  content: string;
}

function flattenNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => flattenNodeText(child)).join("");
  }

  if (React.isValidElement(node)) {
    const elementProps = node.props as { children?: React.ReactNode };
    return flattenNodeText(elementProps.children);
  }

  return "";
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const resolveHeadingId = React.useMemo(() => {
    const slugCounts = new Map<string, number>();

    return (rawHeadingText: string): string => {
      const baseSlug = slugifyHeading(rawHeadingText);
      if (baseSlug.length === 0) {
        return "";
      }

      const currentCount = slugCounts.get(baseSlug) ?? 0;
      slugCounts.set(baseSlug, currentCount + 1);
      if (currentCount === 0) {
        return baseSlug;
      }

      return `${baseSlug}-${currentCount}`;
    };
  }, [content]);

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
    h1({ children, className, ...rest }) {
      const headingText = flattenNodeText(children);
      const id = resolveHeadingId(headingText);
      return (
        <h1 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h1>
      );
    },
    h2({ children, className, ...rest }) {
      const headingText = flattenNodeText(children);
      const id = resolveHeadingId(headingText);
      return (
        <h2 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h2>
      );
    },
    h3({ children, className, ...rest }) {
      const headingText = flattenNodeText(children);
      const id = resolveHeadingId(headingText);
      return (
        <h3 id={id} className={cn(className, "scroll-mt-[5.25rem]")} {...rest}>
          {children}
        </h3>
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
  }), [resolveHeadingId]);

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
