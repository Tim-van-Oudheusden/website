import type { JSX, SVGProps } from "react";

/**
 * LinkedIn's [in] bug, unaltered.
 * Source: the `inbug-blue-48` symbol on https://brand.linkedin.com/downloads (the [in] Logo download ships PNG only).
 * Monochrome via `currentColor`; decorative, so the link around it carries the name.
 */
export function LinkedInIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="m44.4 0h-40.9c-1.9 0-3.5 1.5-3.5 3.5v41.1c0 1.9 1.6 3.4 3.5 3.4h40.9c1.9 0 3.5-1.5 3.6-3.5v-41c0-2-1.6-3.5-3.6-3.5zm-30.2 40.9h-7.1v-22.9h7.1v22.9zm-3.5-26c-2.3 0-4.1-1.8-4.1-4.1s1.8-4.1 4.1-4.1 4.1 1.8 4.1 4.1c0 2.2-1.8 4.1-4.1 4.1zm30.2 26h-7.1v-11.1c0-2.7 0-6.1-3.7-6.1s-4.3 2.9-4.3 5.9v11.3h-7.1v-22.9h6.8v3.1h0.1c1-1.8 3.3-3.7 6.7-3.7 7.2 0 8.5 4.7 8.5 10.9v12.6z" />
    </svg>
  );
}
