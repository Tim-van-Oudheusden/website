export const ARTICLES_PAGE_LAYOUT_CLASSES = {
  container: "flex w-full min-h-0 flex-1 flex-col bg-[var(--adw-page-brown-bg)] md:flex-row",
  sidebar: "w-full min-h-0 overflow-y-auto bg-[var(--adw-page-brown-bg)] md:sticky md:top-[4.2rem] md:h-[calc(100dvh-4.2rem)] md:basis-[var(--articles-sidebar-width)] md:min-w-[var(--articles-sidebar-width)] md:shrink-0",
  content: "bg-[var(--adw-page-brown-bg)] min-h-[20rem] min-w-0 flex-1 p-4 sm:p-6 lg:p-8",
  contentWithToc: "mx-auto w-full max-w-[120rem] md:pr-[var(--articles-content-toc-gap)]",
  locationTrailAlign: "mx-auto w-full max-w-[75ch]",
  toc: "hidden md:block rounded-lg md:fixed md:right-6 lg:right-8 md:top-[5.25rem] md:w-[clamp(12rem,17vw,15.5rem)] md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto bg-[var(--site-section-well-bg)]",
  panelBox: "border-border bg-[var(--site-section-well-bg)] rounded-lg border px-4 py-3",
} as const;

export const ARTICLES_PAGE_TYPOGRAPHY_CLASSES = {
  pageTitle: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  sidebarTriggerLabel: "truncate text-sm font-medium",
  sidebarArticleButton: "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
  sidebarSelectedArticleState: "bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5)]",
  articleTitle: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  articleDescription: "text-muted-foreground mt-2 max-w-[65ch] text-base sm:text-lg leading-relaxed",
  articleBodyMeasure: "mx-auto w-full max-w-[75ch]",
  articleTagBadge: "bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] font-bold [a&]:hover:bg-[var(--adw-dark-5)]/90 dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)] dark:[a&]:hover:bg-[var(--adw-light-1)]/90",
  tocTitle: "text-[calc(0.875rem+4pt)] font-bold tracking-tight",
  tocLink: "block text-sm font-medium leading-relaxed transition-colors hover:text-foreground",
  tocLinkActive: "text-[var(--adw-dark-4)] dark:text-[var(--adw-light-2)]",
  tocLinkInactive: "text-[var(--adw-toc-inactive)]",
} as const;

export const ARTICLES_PAGE_TEXT = {
  tocHeading: "In this article",
} as const;
