import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";

import { Badge } from "@/shared/components/ui/badge";

import type { ExperienceEntry } from "../config/experience";
import { headingIdFor } from "../config/home-sections";
import { formatExperienceRange, sortNewestFirst } from "../lib/experience-dates";
import type { HomeExperienceSection } from "../types/home-section";

import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";

/** Arrow that rests 1px low and nudges up-right on link hover or keyboard focus. */
const LINK_ARROW_CLASSES = "ml-1 inline-block size-4 translate-y-px transition-transform duration-150 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 group-focus-visible/link:translate-x-1 group-focus-visible/link:-translate-y-1 motion-reduce:transition-none";

/**
 * Hover card and stretched link, measured from the content column: they start just right of the rail
 * (#584 D2; the 48px column gap from 1024px leaves 14px of card before the text) and bleed 24px right
 * and 16px up and down.
 */
const CARD_AREA_CLASSES = "lg:-inset-y-4 lg:-right-6 lg:-left-3.5";

function RoleDates({ start, end }: { start: string; end: string | null }): JSX.Element {
  const { label, spoken } = formatExperienceRange(start, end);
  const [from = label, to = ""] = label.split(" — ");

  return (
    <header
      aria-label={spoken}
      className="relative z-10 mt-1 mb-2 text-xs font-semibold tracking-wide uppercase text-(--adw-dark-2) dark:text-(--adw-light-5) sm:col-span-2"
    >
      <time dateTime={start}>{from}</time>
      {" — "}
      {end === null ? to : <time dateTime={end}>{to}</time>}
    </header>
  );
}

function RoleTitle({ role }: { role: ExperienceEntry }): JSX.Element {
  const text = (
    <>
      {role.title}
      {" · "}
      {/* The company and arrow stay together so the arrow never wraps onto a line alone. */}
      <span className="inline-block">
        {role.company}
        {role.companyUrl === null ? null : <ArrowUpRight aria-hidden="true" className={LINK_ARROW_CLASSES} />}
      </span>
    </>
  );

  return (
    <h3 className="text-base leading-snug font-medium text-(--adw-dark-5) dark:text-(--adw-light-1)">
      {role.companyUrl === null
        ? text
        : (
            <a
              href={role.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${role.title} at ${role.company} (opens in a new tab)`}
              className="group/link inline-flex items-baseline leading-tight transition-colors duration-150 hover:text-(--adw-accent-color) focus-visible:text-(--adw-accent-color) lg:focus-visible:outline-none motion-reduce:transition-none"
            >
              {/* Stretched link: from 1024px the whole card is clickable and shows the focus ring. */}
              <span
                aria-hidden="true"
                className={cn("absolute hidden rounded-md group-focus-visible/link:ring-2 group-focus-visible/link:ring-(--adw-accent-color) lg:block", CARD_AREA_CLASSES)}
              />
              <span>{text}</span>
            </a>
          )}
    </h3>
  );
}

function RoleRow({ role, lastInGroup }: { role: ExperienceEntry; lastInGroup: boolean }): JSX.Element {
  const current = role.end === null;

  return (
    <li data-role="" className={cn("group relative pl-6 sm:pl-0", lastInGroup ? "" : "mb-12")}>
      {/*
        This role's stretch of the timeline rail: in the column gap from 640px, on the far left below. It lives
        outside the dimmed row, so it never fades. The current role's stretch is a thicker accent line (#584 D1).
      */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1.5 left-0 -translate-x-1/2 rounded-full transition-colors duration-150 motion-reduce:transition-none sm:left-[calc(25%-0.5rem)] md:left-[calc(25%-0.25rem)] lg:left-[calc(25%-0.75rem)]",
          lastInGroup ? "bottom-0" : "-bottom-10",
          current
            ? "w-[3px] bg-(--adw-accent-color)"
            : "w-px bg-(--adw-light-4) group-focus-within:bg-(--adw-accent-color) lg:group-hover:bg-(--adw-accent-color) dark:bg-white/20",
        )}
      />
      <div className="grid pb-1 transition-opacity duration-150 motion-reduce:transition-none sm:grid-cols-8 sm:gap-8 md:gap-4 lg:gap-x-12">
        <RoleDates start={role.start} end={role.end} />
        {/* Its own stacking context, so the card (-z-10) sits behind the text but above the section. */}
        <div className="relative z-10 sm:col-span-6">
          <div
            aria-hidden="true"
            className={cn(
              "absolute -z-10 hidden rounded-md transition motion-reduce:transition-none lg:block lg:group-focus-within:bg-(--adw-view-bg-color)/60 lg:group-focus-within:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] lg:group-focus-within:drop-shadow-lg lg:group-hover:bg-(--adw-view-bg-color)/60 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] lg:group-hover:drop-shadow-lg dark:lg:group-focus-within:bg-white/5 dark:lg:group-hover:bg-white/5",
              CARD_AREA_CLASSES,
            )}
          />
          <RoleTitle role={role} />
          <p className="mt-2 text-sm leading-normal whitespace-pre-line text-(--adw-dark-2) dark:text-(--adw-light-5)">
            {role.description}
          </p>
          {role.skills.length === 0
            ? null
            : (
                <ul aria-label="Technologies used" className="mt-2 flex flex-wrap">
                  {role.skills.map((skill) => (
                    <li key={skill} className="mt-2 mr-1.5">
                      <Badge className="rounded-full border-transparent bg-[color-mix(in_oklab,var(--adw-accent-color)_10%,transparent)] px-3 py-1 text-xs leading-5 font-medium text-(--adw-accent-color)">
                        {skill}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      </div>
    </li>
  );
}

/** Split newest-first roles into runs of consecutive positions at the same company. */
function groupByCompany(roles: readonly ExperienceEntry[]): ExperienceEntry[][] {
  const groups: ExperienceEntry[][] = [];

  for (const role of roles) {
    const current = groups.at(-1);

    if (current?.[0]?.company === role.company) {
      current.push(role);
    } else {
      groups.push([role]);
    }
  }

  return groups;
}

interface HomeExperienceProps {
  section: HomeExperienceSection;
}

/**
 * Home 'experience' section: Brittany Chiang-style work history with a
 * vertical timeline rail. Each position is its own row; consecutive positions
 * at one company share a panel (#584). From 1024px, hovering or focusing a
 * role lifts it onto a card and dims the others; the pointer in a gap between
 * roles dims nothing.
 */
export function HomeExperience({ section }: HomeExperienceProps): JSX.Element {
  const groups = groupByCompany(sortNewestFirst(section.entries));

  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 md:max-w-3xl lg:max-w-296">
        <div className="flex flex-col gap-3">
          <h2
            id={headingIdFor(section.id)}
            className="text-[1.875rem] leading-tight sm:text-[2.5rem] text-(--adw-dark-5) dark:text-(--adw-light-1)"
          >
            {section.heading}
          </h2>
          <p className="text-lg leading-relaxed text-(--adw-dark-2) dark:text-(--adw-light-5)">{section.body}</p>
        </div>
        <div className="max-w-3xl">
          <ol className="lg:[&:has([data-role]:focus-within)_[data-role]:not(:focus-within)>div]:opacity-50 lg:[&:has([data-role]:hover)_[data-role]:not(:hover)>div]:opacity-50">
            {groups.map((group, index) => (
              <li
                key={`${group[0]?.company ?? ""}-${group[0]?.start ?? ""}`}
                // Every company keeps the same side padding (pulled back out with a negative margin) so all rows align;
                // only a company with several positions shows the panel.
                className={cn(
                  "-mx-4 px-4 sm:-mx-6 sm:px-6",
                  index === groups.length - 1 ? "" : "mb-12",
                  group.length > 1
                    ? "rounded-2xl bg-(--adw-light-1)/50 py-6 ring-1 ring-black/5 ring-inset dark:bg-white/[0.03] dark:ring-white/10"
                    : "",
                )}
              >
                <ol>
                  {group.map((role, roleIndex) => (
                    <RoleRow key={`${role.company}-${role.start}`} role={role} lastInGroup={roleIndex === group.length - 1} />
                  ))}
                </ol>
              </li>
            ))}
          </ol>
          <a
            href={section.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View full profile on LinkedIn (opens in a new tab)"
            className="group/link mt-12 inline-block leading-tight font-semibold text-(--adw-dark-5) transition-colors duration-150 hover:text-(--adw-accent-color) focus-visible:text-(--adw-accent-color) dark:text-(--adw-light-1) motion-reduce:transition-none"
          >
            View full profile on
            {" "}
            <span className="inline-block">
              LinkedIn
              <ArrowUpRight aria-hidden="true" className={LINK_ARROW_CLASSES} />
            </span>
          </a>
        </div>
      </div>
    </HomeSectionFrame>
  );
}
