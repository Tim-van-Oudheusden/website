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

### Colours: warm paper and ink

Both themes are warm. Light mode is a beige page (`#f3efe5`) with white wells, near-black text and blue accents. Dark
mode uses [Flexoki](https://stephango.com/flexoki) (MIT, by Steph Ango), a palette "inspired by analog inks and warm
shades of paper": a warm black page (`#100f0f`), one step lighter wells and cards (`#1c1b1a`), off-white text
(`#cecdc3`, headings `#e6e4d9`) and Flexoki's blues, reds, greens and yellows for accents. Its brown-grey undertone
gives dark mode the same character as the beige light theme. Black call-to-action buttons and the logo invert to a
paper fill with black text in dark mode.

The tokens live in [`front-end/src/index.css`](front-end/src/index.css). Their `--adw-*` names are historical (the
site started from GNOME's libadwaita colours), and the shadcn theme variables (`--background`, `--primary`, …) map onto
them. The research behind the dark palette, with contrast ratios and the schemes it was chosen over, is in
[`research/dark_theme_warm_palette.md`](research/dark_theme_warm_palette.md).

**Rules:** every text and UI colour pair meets WCAG 2.2 AA in both themes (4.5:1 for body text, 3:1 for large text,
UI boundaries and focus rings); `test/front-end/src/shared/styles/dark-theme-palette.test.ts` checks the dark tokens.
Every design change is checked in both light and dark mode. Reference sites are copied for layout, spacing, type scale
and interaction, **never for colour**.

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
