// Below `lg` the page is one column: the article first, the article list after it.
// From `lg` the list is a sticky left sidebar; from `xl` the TOC is a fixed right rail.
export const ARTICLES_PAGE_LAYOUT_CLASSES = {
  container: "flex w-full min-h-0 flex-1 flex-col bg-[var(--adw-page-brown-bg)] lg:flex-row",
  sidebar: "order-last w-full min-h-0 overflow-y-auto bg-[var(--adw-page-brown-bg)] lg:order-none lg:sticky lg:top-[4.2rem] lg:h-[calc(100dvh-4.2rem)] lg:basis-[var(--articles-sidebar-width)] lg:min-w-[var(--articles-sidebar-width)] lg:shrink-0",
  content: "bg-[var(--adw-page-brown-bg)] min-h-[20rem] min-w-0 flex-1 px-5 pt-6 pb-16 sm:px-8 sm:pt-8 lg:px-10 lg:pb-24",
  contentWithToc: "mx-auto w-full max-w-[120rem] xl:pr-[var(--articles-content-toc-gap)]",
  locationTrailAlign: "mx-auto w-full max-w-[40rem]",
  toc: "hidden xl:block rounded-lg xl:fixed xl:right-8 xl:top-[5.25rem] xl:w-[clamp(12rem,17vw,15.5rem)] xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto bg-[var(--site-section-well-bg)]",
  inlineToc: "mb-10 xl:hidden",
  panelBox: "border-border bg-[var(--site-section-well-bg)] rounded-lg border px-4 py-3",
  cover: "mb-10 aspect-[1200/630] w-full overflow-hidden rounded-xl border border-border",
} as const;

export const ARTICLES_PAGE_TYPOGRAPHY_CLASSES = {
  pageTitle: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  sidebarTriggerLabel: "truncate text-sm font-medium",
  sidebarArticleButton: "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
  sidebarSelectedArticleState: "bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5)]",
  articleEyebrow: "text-muted-foreground text-sm font-semibold uppercase tracking-[0.12em]",
  articleTitle: "mt-3 text-[2.125rem] leading-[1.12] sm:text-[2.75rem] xl:text-[3.25rem] font-semibold tracking-tight text-balance",
  articleDescription: "text-muted-foreground mt-4 text-lg sm:text-xl leading-relaxed text-pretty",
  articleMeta: "text-muted-foreground mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium",
  articleBodyMeasure: "mx-auto w-full max-w-[40rem]",
  articleTagBadge: "bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] font-bold [a&]:hover:bg-[var(--adw-dark-5)]/90 dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)] dark:[a&]:hover:bg-[var(--adw-light-1)]/90",
  // On the wrapper around the shared MarkdownRenderer: article-only rhythm on
  // top of its prose styles (`[&>.prose]` outranks the renderer's own size
  // classes). Markdown `#` is a section heading here; the page title is the
  // article's only big heading.
  articleProse: [
    "[&>.prose]:text-[1.0625rem] [&>.prose]:leading-[1.75] sm:[&>.prose]:text-[1.125rem]",
    "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-balance",
    "prose-h1:mt-16 prose-h1:mb-4 prose-h1:text-[1.75rem] prose-h1:leading-tight sm:prose-h1:text-[1.875rem]",
    "prose-h2:mt-12 prose-h2:mb-3 prose-h2:text-[1.4375rem] prose-h2:leading-snug",
    "prose-h3:mt-10 prose-h3:mb-2 prose-h3:text-[1.1875rem] prose-h3:leading-snug",
    "[&>.prose>:first-child]:mt-0 prose-li:my-1.5 prose-hr:my-14",
    "prose-a:underline-offset-[3px] prose-a:decoration-[1.5px]",
    "prose-blockquote:border-l-[3px] prose-blockquote:pl-5 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:[&_p]:before:content-none prose-blockquote:[&_p]:after:content-none",
    "[&_[data-callout-type]]:my-8 [&_[data-callout-type]]:rounded-lg [&_[data-callout-type]]:border-l-4 [&_[data-callout-type]]:px-5 [&_[data-callout-type]]:py-4",
    "prose-code:before:content-none prose-code:after:content-none prose-code:rounded-md prose-code:border prose-code:border-border prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-normal",
    "prose-pre:my-8 prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:px-5 prose-pre:py-4 prose-pre:text-[0.875rem] prose-pre:leading-relaxed [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
    "prose-img:my-8 prose-img:mx-auto prose-img:rounded-xl prose-img:border prose-img:border-border",
  ].join(" "),
  tocTitle: "text-sm font-semibold tracking-tight",
  tocList: "mt-3 border-l border-border",
  tocItem: "-ml-px border-l-2 py-1 pl-3 transition-[border-color] duration-300 ease-out motion-reduce:transition-none",
  tocItemCurrent: "border-[var(--adw-dark-4)] dark:border-[var(--adw-light-2)]",
  tocItemIdle: "border-transparent",
  tocLink: "block text-sm font-medium leading-snug transition-colors duration-300 ease-out motion-reduce:transition-none hover:text-foreground",
  tocLinkActive: "text-[var(--adw-dark-4)] dark:text-[var(--adw-light-2)]",
  tocLinkInactive: "text-[var(--adw-toc-inactive)]",
  inlineTocSummary: "flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-tight [&::-webkit-details-marker]:hidden",
} as const;

// Motion. Everything sits behind `motion-safe:` so `prefers-reduced-motion:
// reduce` never hides or moves content, even before any script runs. Only
// opacity and translate change, so nothing shifts layout.
export const ARTICLES_PAGE_MOTION_CLASSES = {
  pageEnter: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-[cubic-bezier(.17,.67,.2,1)]",
  // On the MarkdownRenderer wrapper: body blocks marked `data-reveal="pending"`
  // (below the fold, set by useArticleMotion) wait hidden; `shown` fades them in.
  revealBlocks: [
    "motion-safe:[&>.prose>[data-reveal=pending]]:opacity-0 motion-safe:[&>.prose>[data-reveal=pending]]:translate-y-4",
    "motion-safe:[&>.prose>[data-reveal=shown]]:transition-[opacity,translate] motion-safe:[&>.prose>[data-reveal=shown]]:duration-700 motion-safe:[&>.prose>[data-reveal=shown]]:ease-[cubic-bezier(.17,.67,.2,1)]",
    "print:[&>.prose>*]:opacity-100! print:[&>.prose>*]:translate-none!",
  ].join(" "),
} as const;

export const ARTICLES_PAGE_TEXT = {
  tocHeading: "In this article",
} as const;
