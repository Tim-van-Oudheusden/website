# Third-party skills

Every skill in this folder except `github-issue-flow` comes from
[emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, licence below), installed in #1359.

- **Upstream commit:** `64eb3deb9a5fbfa041faf783e0bc3fd635872e9c` (2026-11-15). `skills-lock.json` at the
  repository root records the same commit and a hash per skill.
- **Installed with:** `npx skills@1.9.0 add emilkowalski/skills -a claude-code --copy -y -s <names>`, as copies, not
  symlinks.
- **Installed:** `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `remove-animations`,
  `find-animation-opportunities`, `choreograph`, `animation-performance`, `mobile-native`, `break-ui`,
  `apple-design`.
- **Left out:** `animate-expo`, `write-swift`, `gestures` and `ask-sonner` (not this stack), and the skills added
  upstream after the review that picked the list: `animation-vocabulary`, `ask-emil`, `learn-taste`,
  `pick-ui-library` and `prototype`.

These files are instructions agents follow, so they are a supply-chain surface. They were read before they were
committed: none of them asks an agent to weaken a check, touch secrets or reach outside the repository. Review an
update the same way: diff the new upstream commit against the one above before copying it in, and record the new
commit here.

The site's own motion rules, which these skills informed, are in [`BRANDING.md`](../../BRANDING.md) §6, "Motion".

## Licence

```text
MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
