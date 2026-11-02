import type { JSX } from "react";

import type { HiveStatusView } from "../lib/hive-view-model";

/**
 * "Live · updated 40 s ago", "Stale · last update 14:05" or "Offline". Only the state word is a polite live region,
 * so a screen reader hears live → stale → offline, not every refresh of the age. The design colours the dot by
 * `data-status`.
 */
export function HiveStatusPill({ status }: { status: HiveStatusView }): JSX.Element {
  const { detail } = status;

  return (
    <p className="ag-status" data-status={status.kind}>
      <span aria-hidden="true" className="ag-status-dot" />
      <span>
        <span aria-live="polite">{status.label}</span>
        {detail !== null && (
          <>
            {` · ${detail.prefix} `}
            <time dateTime={detail.at} title={detail.title}>{detail.text}</time>
          </>
        )}
      </span>
    </p>
  );
}
