interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The container's border box (from `getBoundingClientRect`) and the box metrics the element reports. */
interface ContainerBox extends RectLike {
  clientLeft: number;
  clientTop: number;
  clientWidth: number;
  clientHeight: number;
  offsetWidth: number;
  offsetHeight: number;
}

/** Distances from each edge of the container's padding box to the active item's box. */
export interface IndicatorInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function calculateIndicatorInsets(container: ContainerBox, activeItemRect: RectLike): IndicatorInsets {
  // Both rects are border boxes; the overlay fills the padding box, which starts one border width in.
  const left = activeItemRect.left - container.left - container.clientLeft;
  const top = activeItemRect.top - container.top - container.clientTop;
  // clientWidth/clientHeight round to whole pixels; offset minus client leaves the borders, so subtract those
  // from the fractional border box instead.
  const paddingBoxWidth = container.width - (container.offsetWidth - container.clientWidth);
  const paddingBoxHeight = container.height - (container.offsetHeight - container.clientHeight);

  return {
    top,
    right: paddingBoxWidth - left - activeItemRect.width,
    bottom: paddingBoxHeight - top - activeItemRect.height,
    left,
  };
}

export function indicatorClipPath({ top, right, bottom, left }: IndicatorInsets): string {
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 9999px)`;
}
