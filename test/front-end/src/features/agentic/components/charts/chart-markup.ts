/** What a reader (or screen reader) gets from a rendered chart figure. */
export interface ChartFigureParts {
  caption: string;
  imageLabel: string;
  legend: string[];
  dataSummary: string;
  tableRows: string[][];
}

function text(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
}

/** The first capture group of every match of `pattern` (which must be global). */
function captures(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => match[1] ?? "");
}

function only(html: string, pattern: RegExp, what: string): string {
  const [first, ...rest] = captures(html, pattern);

  if (first === undefined || rest.length > 0) {
    throw new Error(`Expected exactly one ${what}, found ${String(rest.length + (first === undefined ? 0 : 1))} in ${html}`);
  }

  return first;
}

/** Parses the static markup of one chart: the figure, its caption, the SVG image, the legend and the data table. */
export function chartFigureParts(html: string): ChartFigureParts {
  const figure = only(html, /^<figure[^>]*>([\s\S]*)<\/figure>$/g, "<figure> wrapping the chart");
  const svgTag = only(figure, /(<svg[^>]*>)/g, "<svg>");

  if (!svgTag.includes('role="img"')) {
    throw new Error(`The chart's <svg> has no role="img": ${svgTag}`);
  }

  const details = only(figure, /<details[^>]*>([\s\S]*)<\/details>/g, "<details> data table");
  const outsideTable = figure.replace(/<details[^>]*>[\s\S]*<\/details>/, "");

  return {
    caption: text(only(figure, /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g, "<figcaption>")),
    imageLabel: only(svgTag, /aria-label="([^"]*)"/g, "aria-label on the <svg>").replace(/&#x27;/g, "'"),
    legend: captures(outsideTable, /<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/g).map(text),
    dataSummary: text(only(details, /<summary[^>]*>([\s\S]*?)<\/summary>/g, "<summary>")),
    tableRows: captures(only(details, /<table[^>]*>([\s\S]*)<\/table>/g, "<table>"), /<tr[^>]*>([\s\S]*?)<\/tr>/g).map((row) =>
      captures(row, /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g).map(text)),
  };
}
