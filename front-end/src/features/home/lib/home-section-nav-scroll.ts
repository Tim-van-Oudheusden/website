interface MatchMediaResult {
  matches: boolean;
}

type MatchMediaFn = (query: string) => MatchMediaResult;

export function resolveAnchorScrollBehavior(matchMedia: MatchMediaFn): ScrollBehavior {
  const reducedMotionPreference = matchMedia("(prefers-reduced-motion: reduce)");

  if (reducedMotionPreference.matches) {
    return "auto";
  }

  return "smooth";
}
