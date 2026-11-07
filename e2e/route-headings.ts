/**
 * One URL for each route `front-end/src/App.tsx` declares, with a heading that page renders. Plain
 * data, away from the spec, so `test/front-end/src/App.test.tsx` can hold it to the route table.
 */
export const ROUTE_HEADINGS = [
  ["/", "Experience"],
  ["/projects", "Projects"],
  ["/projects/dailies", "Dailies"],
  ["/agentic", "Agentic"],
  ["/articles", "Articles"],
  ["/articles/introduction", "Introduction"],
  ["/tags/flatpak", "Articles tagged Flatpak"],
  ["/now", "Now"],
  ["/uses", "Uses"],
  ["/no-such-page", "Page not found"],
] as const;
