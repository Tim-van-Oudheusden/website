// Article dates are calendar days ("2025-10-02"), which `Date` parses as UTC midnight:
// format in UTC so a reader west of Greenwich doesn't see the previous day.
const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const ORDINAL_RULES = new Intl.PluralRules("en-US", { type: "ordinal" });

const ORDINAL_SUFFIXES: Record<Intl.LDMLPluralRule, string> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};

/** Format an article date as "October 2nd, 2025". */
export function formatArticleDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getUTCDate();

  return `${MONTH_FORMAT.format(date)} ${String(day)}${ORDINAL_SUFFIXES[ORDINAL_RULES.select(day)]}, ${String(date.getUTCFullYear())}`;
}
