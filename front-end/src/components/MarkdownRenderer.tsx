import * as React from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import "highlight.js/styles/github.css";

export interface MarkdownRendererProps {
  /** Raw markdown string (frontmatter already stripped). */
  content: string;
}

/** Custom component overrides for react-markdown. */
const components: Components = {
  a({ href, children, ...rest }) {
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...rest}
      >
        {children}
      </a>
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
};

/**
 * Renders a markdown string to styled HTML using react-markdown.
 *
 * Wraps output in prose classes for typography styling.
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists).
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps): React.JSX.Element {
  return (
    <article className="prose dark:prose-invert max-w-none">
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
