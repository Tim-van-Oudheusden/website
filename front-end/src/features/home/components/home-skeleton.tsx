import type { JSX } from "react";

/** The static fill of a loading placeholder: a neutral token, no shimmer or pulse. */
export const SKELETON_FILL_CLASSES = "rounded-md bg-muted";

/**
 * Text that has not loaded yet: `lines` line boxes, each as tall as the surrounding type's line height and holding a
 * bar at about the text's height; the last bar is shorter, like the end of a paragraph or a short single line. Place
 * it inside an element with the real text's type classes so the heights match.
 */
export function SkeletonText({ lines }: { lines: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="flex h-[1lh] items-center">
          <div className={`h-[0.75em] ${index === lines - 1 ? "w-2/3" : "w-full"} ${SKELETON_FILL_CLASSES}`} />
        </div>
      ))}
    </>
  );
}
