interface MatchMediaResult {
  matches: boolean;
}

type MatchMediaFn = (query: string) => MatchMediaResult;

export function resolveAnchorScrollBehavior(matchMedia: MatchMediaFn | null): ScrollBehavior {
  if (matchMedia === null) {
    return "auto";
  }

  const reducedMotionPreference = matchMedia("(prefers-reduced-motion: reduce)");

  if (reducedMotionPreference.matches) {
    return "auto";
  }

  return "smooth";
}
