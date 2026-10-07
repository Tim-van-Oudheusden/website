import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createElement } from "react";

import { HomeExperience } from "../../../../../../front-end/src/features/home/components/home-experience";
import type { ExperienceEntry } from "../../../../../../front-end/src/features/home/config/experience";
import type { HomeExperienceSection } from "../../../../../../front-end/src/features/home/types/home-section";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

function entry(overrides: Partial<ExperienceEntry>): ExperienceEntry {
  return {
    start: "2019-09",
    end: "2020-02",
    title: "Software Engineer",
    company: "Achmea",
    companyUrl: "https://www.achmea.nl/",
    description: "Implementation and deployment of an internal IT monitoring system.",
    skills: [],
    ...overrides,
  };
}

function section(entries: ExperienceEntry[]): HomeExperienceSection {
  return {
    id: "experience",
    label: "experience",
    heading: "Experience",
    body: "Where I have worked.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "experience",
    entries,
    profileUrl: "https://www.linkedin.com/in/tim-vanoudheusden",
  };
}

/** Mounts the section, hands its top-level list rows to `check`, and unmounts. */
function withRows(entries: ExperienceEntry[], check: (rows: FakeElement[], mount: FakeMount) => void): void {
  const mount = mountIntoBody(createElement(HomeExperience, { section: section(entries) }));

  try {
    const [list] = queryFakeElements(mount.container, (el) => el.nodeName === "OL");

    if (list === undefined) {
      throw new Error("Expected an ordered list of roles");
    }

    check(list.children, mount);
  } finally {
    unmountFakeDomRoot(mount);
  }
}

function first(root: FakeElement, nodeName: string): FakeElement | undefined {
  return queryFakeElements(root, (el) => el.nodeName === nodeName)[0];
}

describe("HomeExperience", () => {
  test("lists roles newest first in an ordered list, the current one running to the present", () => {
    withRows([
      entry({ start: "2019-09", end: "2020-02", company: "Achmea" }),
      entry({ start: "2024-10", end: null, company: "Gemeente Tilburg", title: "Senior Software Engineer" }),
      entry({ start: "2021-02", end: "2021-07", company: "Ericsson" }),
    ], (rows) => {
      expect(rows.map((row) => row.nodeName)).toEqual(["LI", "LI", "LI"]);
      expect(rows[0]?.textContent).toContain("Gemeente Tilburg");
      expect(rows[0]?.textContent).toContain("2024 — Present");
      expect(rows[1]?.textContent).toContain("Ericsson");
      expect(rows[2]?.textContent).toContain("Achmea");
    });
  });

  test("keeps each position on its own row, grouping consecutive positions at one company together", () => {
    withRows([
      entry({ start: "2021-09", end: "2022-08", company: "DebitRoom", title: "Software Engineer" }),
      entry({ start: "2023-10", end: null, company: "Gemeente Tilburg", title: "Medior" }),
      entry({ start: "2022-09", end: "2023-04", company: "DebitRoom", title: "Cloud Engineer" }),
    ], (groups) => {
      const titles = ["Cloud Engineer", "Software Engineer", "Medior"];
      const positions = groups.map((group) => (first(group, "OL")?.children ?? []).map((row) => titles.find((title) => row.textContent.includes(title))));

      expect(positions).toEqual([["Medior"], ["Cloud Engineer", "Software Engineer"]]);
    });
  });

  test("spells the date range out for screen readers and marks it up as times", () => {
    withRows([entry({ start: "2021-02", end: "2021-07" })], ([row]) => {
      if (row === undefined) {
        throw new Error("Expected a row");
      }

      const header = first(row, "HEADER");
      const times = queryFakeElements(row, (el) => el.nodeName === "TIME").map((el) => el.getAttribute("datetime") ?? el.getAttribute("dateTime"));

      expect(header?.getAttribute("aria-label")).toBe("February to July 2021");
      expect(times).toEqual(["2021-02", "2021-07"]);
    });
  });

  test("links the title to the company site in a new tab, named by title and company", () => {
    withRows([entry({})], ([row]) => {
      const link = row === undefined ? undefined : first(row, "A");

      expect(link?.getAttribute("href")).toBe("https://www.achmea.nl/");
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link?.getAttribute("aria-label")).toBe("Software Engineer at Achmea (opens in a new tab)");
    });
  });

  test("shows the title as plain text when the company has no site", () => {
    withRows([entry({ companyUrl: null })], ([row]) => {
      expect(row === undefined ? [] : queryFakeElements(row, (el) => el.nodeName === "A")).toEqual([]);
      expect(row?.textContent).toContain("Software Engineer · Achmea");
    });
  });

  test("lists the skills under a 'Technologies used' label", () => {
    withRows([entry({ skills: ["Docker", "Azure DevOps"] })], ([row]) => {
      const skills = row === undefined ? undefined : queryFakeElements(row, (el) => el.getAttribute("aria-label") === "Technologies used")[0];

      expect(skills?.nodeName).toBe("UL");
      expect(skills?.children.map((item) => item.textContent)).toEqual(["Docker", "Azure DevOps"]);
    });
  });

  test("links to the full LinkedIn profile", () => {
    withRows([entry({ companyUrl: null })], (_rows, mount) => {
      const profile = queryFakeElements(mount.container, (el) => el.nodeName === "A" && el.getAttribute("href") === "https://www.linkedin.com/in/tim-vanoudheusden")[0];

      expect(profile?.textContent).toContain("View full profile on LinkedIn");
      expect(profile?.getAttribute("target")).toBe("_blank");
    });
  });
});
