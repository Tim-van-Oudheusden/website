// The site's one content edge (#1358). The top bar's row, the home sections and the page layouts that line up with
// the logo all take their inline padding from here, so the logo, page text and section headings start on one line.

/** Inline padding between the viewport and the content edge. */
export const SITE_CONTENT_GUTTER_CLASSES = "px-6 sm:px-10 lg:px-12";

/** Centred content column: the shared max width, padded in to the content edge. */
export const SITE_CONTENT_CONTAINER_CLASSES = `mx-auto w-full max-w-screen-xl ${SITE_CONTENT_GUTTER_CLASSES}`;

/**
 * For a well (a rounded surface) inside the content column: it reaches past the content edge by a fixed amount,
 * less than the gutter, and pads its text back onto the edge.
 */
export const SITE_WELL_BLEED_CLASSES = "-mx-4 px-4 sm:-mx-6 sm:px-6";
