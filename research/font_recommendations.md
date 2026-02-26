# Font Recommendations

## Scope and method
- Interpreted "most popular personal websites" as highly ranked individual-led personal-development sites from Feedspot's 2026 list.
- Used the ranked entries as the popularity sample and then inspected each site's live CSS/HTML font declarations.

## Findings

| Personal website | Popularity signal | Font findings |
| --- | --- | --- |
| James Clear (`jamesclear.com`) | Ranked #4 in Feedspot's 2026 personal development list | Adobe Typekit fonts: `europa` (sans) and `minion-pro` (serif). |
| Mark Manson (`markmanson.net`) | Ranked #8 | Uses `Montserrat` (sans) and `Source Serif Pro` (serif). |
| Seth's Blog (`seths.blog`) | Ranked #9 | Uses `Source Sans Pro` (sans) and `PT Serif` (serif). |
| Tony Robbins Blog (`tonyrobbins.com/blog`) | Ranked #21 | Uses `SuisseIntl` as main sans, plus `IBM Plex Sans` and `IBM Plex Mono` assets. |

## Pattern observed
- High-traffic personal sites in this sample consistently use a clean sans-serif for primary UI/body text.
- Several pair that sans with a serif for long-form reading or editorial emphasis.
- The sans choices trend toward humanist/geometric families with strong readability at medium sizes.

## Recommendation
Adopt `Source Sans 3` as the default site-wide font stack.

Why:
- It matches the dominant pattern found in the sample (`Source Sans Pro`/similar readable sans families).
- It keeps a modern, editorial-friendly tone for a personal website without feeling corporate.
- It is broadly available via web delivery and has strong fallback behavior.

Recommended stack:

```css
"Source Sans 3", "Source Sans Pro", "Segoe UI", "Helvetica Neue", Arial, sans-serif
```

Optional future enhancement:
- For article-heavy pages, test a serif companion (for example `PT Serif`) for long-form body text only.

## Sources
- Feedspot, "100 Best Personal Development Blogs in 2026": https://bloggers.feedspot.com/personal_development_blogs/
- James Clear Typekit stylesheet: https://use.typekit.net/tqf2ebt.css
- James Clear theme CSS: https://jamesclear.com/wp-content/themes/jamesclear/dist/css/app-796cc56bcd.css
- Mark Manson homepage (inline `@font-face` declarations): https://markmanson.net/
- Seth's Blog main theme CSS: https://seths.blog/wp-content/themes/godin/css/main.css?ver=1744718606
- Tony Robbins CSS chunk (`SuisseIntl`/`IBM Plex` declarations): https://www.tonyrobbins.com/_next/static/chunks/fd3777eaa0bc1088.css
