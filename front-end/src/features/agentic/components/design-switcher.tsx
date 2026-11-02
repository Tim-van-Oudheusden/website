import type { JSX } from "react";
import { Link } from "react-router";

import { AGENTIC_PAGE_PATH } from "shared";

import type { AgenticDesign } from "../config/agentic-designs";
import { AGENTIC_DESIGNS } from "../config/agentic-designs";

/** Links to the ten candidate designs (`/agentic?design=<slug>`), the one on screen marked current. */
export function DesignSwitcher({ current }: { current: AgenticDesign }): JSX.Element {
  return (
    <nav aria-label="Page design" className="ag-switcher">
      <p className="ag-switcher-label">
        {"Design: "}
        <strong>{current.name}</strong>
        {` — ${current.blurb}`}
      </p>
      <ol className="ag-switcher-list">
        {AGENTIC_DESIGNS.map((design, index) => (
          <li key={design.slug}>
            <Link
              to={{ pathname: AGENTIC_PAGE_PATH, search: `?design=${design.slug}` }}
              aria-current={design === current ? "true" : undefined}
              className="ag-switch"
            >
              <span aria-hidden="true" className="ag-switch-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="ag-switch-name">{design.name}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
