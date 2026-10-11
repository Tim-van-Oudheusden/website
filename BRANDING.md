# Branding: Build with Tim

## 1. Name and domain

- **Name:** Build with Tim
- **Domain:** [buildwithtim.dev](https://buildwithtim.dev)

## 2. Slogan and hero line

The `start` section of the home page reads its slogan and hero line from here, verbatim.

| | Text |
|---|---|
| **Slogan** | Build with Tim. |
| **Hero line** | I'm Tim, a software engineer. I build small, self-hosted tools and write down how they work. |

Chosen by Tim from the candidates in
[`research/buildwithtim_homepage_benchmark.md` §5](research/buildwithtim_homepage_benchmark.md) (candidate #1, with the
surname dropped from the hero line).

## 3. Positioning

Build with Tim is Tim van Oudheusden's site for the things he builds and the write-ups that explain them: open-source
projects, Linux on the desktop, the tools that make his work easier, and the occasional personal reflection. It is
written for people who like to see how something was made and why, so they can build along or borrow the parts that
fit their own setup.

## 4. Content pillars

The site publishes two kinds of content: **articles** and **projects**. Both are markdown files in `content/`.

**Articles** use the categories in `ARTICLE_CATEGORIES` (`shared/src/index.ts`):

| Category | What goes there | Example on the site |
|---|---|---|
| `Introduction` | What the site is and how to find your way around | Introduction |
| `Linux` | Linux on the desktop, packaging, and the OS itself | My operating system is a container image, yes, really |
| `Work` | Tools and workflows that make day-to-day work easier | Making my work easier with notes in Obsidian |
| `Personal Life` | Personal reflections outside of tech | Yoga Nidra, a way to be at peace in chaos |

**Projects** are open-source builds, each shown with its status (`PROJECT_STATUSES`: `Planned`, `In Progress`, `Shipped`, `Archived`) and links to the
source. Each project page is structured as Problem, Approach and Outcome.

To add a category, change `ARTICLE_CATEGORIES` first, then update this table.

## 5. Voice

- **Honest.** No invented metrics, testimonials, follower counts or compatibility claims. State only what is true.
  If the site is young, say so instead of padding it.
- **First person, plain words.** Write the way Tim explains something to a colleague: what he built, why, and what he
  would do differently.
- **Show the work.** Prefer a real project, file or command over an abstract claim.

## 6. Visual identity

### Colours

Colour tokens live in [`front-end/src/index.css`](front-end/src/index.css). The shadcn theme variables
(`--background`, `--primary`, …) map onto them. Every design change is checked in both light and dark mode, and every
text and UI pair must meet WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text, UI boundaries and focus rings.

- **Light mode:** a warm beige page (`#f3efe5`), white wells, near-black text and a blue accent.
- **Dark mode:** [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT licence). A warm near-black page
  (`#1c1b1a`), wells one step lighter (`#282726`), warm off-white text (`#cecdc3`), paper-white headings (`#fffcf0`)
  and a light blue accent (`#92bfdb`, Flexoki blue-200, for text, focus rings and fills; the same hue as the light
  accent). The black buttons, the floating-nav indicator and the logo invert to paper with dark text.

**Why Flexoki:** it is designed as ink on paper, and the light theme already is that: the light page `#f3efe5` is
almost Flexoki's `base-50` (`#f2f0e5`). Its warm grey ramp gives dark mode the same character without painting
surfaces brown, and its values are published and tuned for reading. The alternatives (Gruvbox, Zenburn, Solarized) and
the contrast numbers are in [`research/dark_theme_warm_palette.md`](research/dark_theme_warm_palette.md).

Reference sites are copied for layout, spacing, type scale and interaction, **never for colour**.

The `--adw-*` prefix on the custom properties is historical. The colours do not follow GNOME Adwaita, whose palette
is meant for app icons and illustrations, not web UI.

### Typography

- **Typeface:** Source Sans 3 (weights 400, 500, 600, 700), loaded from Google Fonts in `front-end/src/index.css`.
- **Fallback stack:** `"Source Sans Pro", "Segoe UI", "Helvetica Neue", Arial, sans-serif` (the `--font-sans` token).

### Design references

- **Main inspiration:** [kentcdodds.com](https://kentcdodds.com/), for the overall home-page structure, the blog
  recommendations, and the project showcase. Measured notes:
  [`research/kentcdodds_blog_recommendations_and_flagship_training.md`](research/kentcdodds_blog_recommendations_and_flagship_training.md).
- **Experience section:** [brittanychiang.com](https://brittanychiang.com/#experience), for the experience timeline.
  Measured notes: [`research/brittanychiang_experience_section.md`](research/brittanychiang_experience_section.md).

## 7. Home page map

The home page is one continuous scroll with a floating section nav. Section order and purpose, as planned in the home
redesign epic (#576):

| # | Nav label | Purpose |
|---|---|---|
| 1 | start | Slogan and hero line from §2, with a call to action into the page |
| 2 | for you | Three recommended articles, each with its social image |
| 3 | for devs | Showcase of open-source projects, linking to their source on GitHub |
| 4 | about me | Who Tim is: a photo on the right and short facts in a brick-style block |
| 5 | what's new | The latest articles, pulled from `content/` |
| 6 | experience | Work history as a vertical timeline |
| 7 | socials | Where to find Tim (GitHub, LinkedIn) |
