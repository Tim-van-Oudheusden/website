/** A role's date range: the visible label and its spoken form for `aria-label`. */
export interface ExperienceRange {
  /** "2024 — Present", "2018 — 2024", "Jul — Dec 2017". */
  label: string;
  /** "2024 to Present", "2018 to 2024", "July to December 2017". */
  spoken: string;
}

// "YYYY-MM" names a calendar month; format in UTC so no time zone shifts it.
const SHORT_MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

/** Format a "YYYY-MM" start and end (`null` = current role) the way Brittany Chiang's experience list does. */
export function formatExperienceRange(start: string, end: string | null): ExperienceRange {
  const startYear = start.slice(0, 4);

  if (end === null) {
    return { label: `${startYear} — Present`, spoken: `${startYear} to Present` };
  }

  const endYear = end.slice(0, 4);

  if (startYear !== endYear) {
    return { label: `${startYear} — ${endYear}`, spoken: `${startYear} to ${endYear}` };
  }

  const startMonth = new Date(`${start}-01T00:00:00Z`);
  const endMonth = new Date(`${end}-01T00:00:00Z`);

  return {
    label: `${SHORT_MONTH.format(startMonth)} — ${SHORT_MONTH.format(endMonth)} ${endYear}`,
    spoken: `${LONG_MONTH.format(startMonth)} to ${LONG_MONTH.format(endMonth)} ${endYear}`,
  };
}

/** Roles newest first by their "YYYY-MM" start (the format sorts as text). */
export function sortNewestFirst<Role extends { start: string }>(roles: readonly Role[]): Role[] {
  return [...roles].sort((left, right) => right.start.localeCompare(left.start));
}
