import { useEffect } from "react";

import { recordView } from "@/shared/lib/record-view";

/**
 * Fires the view beacon once a resolved slug is available, and again each
 * time it changes; a `null` slug (still loading, not found, or errored)
 * records nothing.
 */
export function useRecordView(slug: string | null): void {
  useEffect(() => {
    if (slug !== null) {
      recordView(slug);
    }
  }, [slug]);
}
