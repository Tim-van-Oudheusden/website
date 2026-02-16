interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IndicatorMetrics {
  translateX: number;
  translateY: number;
  width: number;
  height: number;
}

export function calculateIndicatorMetrics(
  containerRect: RectLike,
  activeItemRect: RectLike,
): IndicatorMetrics {
  return {
    translateX: activeItemRect.left - containerRect.left,
    translateY: activeItemRect.top - containerRect.top,
    width: activeItemRect.width,
    height: activeItemRect.height,
  };
}
