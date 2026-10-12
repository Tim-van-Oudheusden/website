import type { ExtraProps } from "react-markdown";

type HastElement = NonNullable<ExtraProps["node"]>;
type HastNode = HastElement["children"][number];

const EMBED_ORIGIN = "https://www.youtube-nocookie.com/embed/";

const YOUTUBE_HOSTS: Readonly<Record<string, true>> = {
  "youtube.com": true,
  "www.youtube.com": true,
  "m.youtube.com": true,
  "music.youtube.com": true,
};

/** `/shorts/<id>`, `/embed/<id>`, `/live/<id>` on a YouTube host. */
const YOUTUBE_ID_PATH = /^\/(?:shorts|embed|live)\/([^/]+)\/?$/;

/** `youtu.be/<id>`. */
const SHORT_LINK_PATH = /^\/([^/]+)\/?$/;

/** YouTube video ids are 11 URL-safe base64 characters. */
const VIDEO_ID = /^[\w-]{11}$/;

/** A `t`/`start` value: `90`, `90s`, `1m30s`, `1h2m3s`. */
const START_TIME = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;

/** Whole seconds into the video to start at, or 0 when absent or unreadable. */
function startSecondsOf(url: URL): number {
  const value = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "";
  const match = value === "" ? null : START_TIME.exec(value);

  if (match === null) {
    return 0;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function videoIdOf(url: URL): string | null {
  if (url.hostname === "youtu.be") {
    return SHORT_LINK_PATH.exec(url.pathname)?.[1] ?? null;
  }

  if (YOUTUBE_HOSTS[url.hostname] !== true) {
    return null;
  }

  return url.pathname === "/watch"
    ? url.searchParams.get("v")
    : YOUTUBE_ID_PATH.exec(url.pathname)?.[1] ?? null;
}

/**
 * The privacy-enhanced player URL for a YouTube video link, or null when
 * `href` is not a link to a single YouTube video.
 */
export function youTubeEmbedUrl(href: string): string | null {
  let url: URL | null;

  // `new URL` rather than `URL.parse`: the default Vite target includes Safari 16.4/17, which lack it.
  try {
    url = new URL(href);
  } catch {
    url = null;
  }

  const videoId = url === null ? null : videoIdOf(url);

  if (url === null || videoId === null || !VIDEO_ID.test(videoId)) {
    return null;
  }

  const startSeconds = startSecondsOf(url);

  return startSeconds > 0 ? `${EMBED_ORIGIN}${videoId}?start=${startSeconds}` : `${EMBED_ORIGIN}${videoId}`;
}

function textOf(node: HastNode): string {
  if (node.type === "text") {
    return node.value;
  }

  return node.type === "element" ? node.children.map(textOf).join("") : "";
}

/** The link of a paragraph whose only content is one link, else null. */
function soleLinkOf(paragraph: HastElement): HastElement | null {
  const content = paragraph.children.filter((child) => child.type !== "text" || child.value.trim() !== "");
  const [link] = content;

  return content.length === 1 && link?.type === "element" && link.tagName === "a" ? link : null;
}

/**
 * A player for `embedUrl`, captioned with the original link to the video and
 * titled by the link text (or a generic title when the link holds only an image).
 */
function youTubeFigure(embedUrl: string, link: HastElement): HastElement {
  return {
    type: "element",
    tagName: "figure",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "iframe",
        properties: { src: embedUrl, title: textOf(link).trim() || "YouTube video" },
        children: [],
      },
      { type: "element", tagName: "figcaption", properties: {}, children: [link] },
    ],
  };
}

function embedStandaloneYouTubeLinks(parent: Pick<HastElement, "children">): void {
  parent.children = parent.children.map((child) => {
    if (child.type !== "element") {
      return child;
    }

    const link = child.tagName === "p" ? soleLinkOf(child) : null;
    const href = link?.properties["href"];
    const embedUrl = typeof href === "string" ? youTubeEmbedUrl(href) : null;

    if (link === null || embedUrl === null) {
      embedStandaloneYouTubeLinks(child);

      return child;
    }

    return youTubeFigure(embedUrl, link);
  });
}

/**
 * Rehype plugin: a paragraph holding nothing but a YouTube video link (a bare
 * URL or `[text](url)` on its own line) becomes an embedded player captioned
 * with that link. YouTube links inside prose stay links.
 */
export function rehypeYouTubeEmbeds(): (tree: Pick<HastElement, "children">) => void {
  return embedStandaloneYouTubeLinks;
}
