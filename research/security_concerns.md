# Security Concerns

Date: 2026-02-08

## Scope

Project stack reviewed:
- Bun runtime + workspace package management
- Fastify back-end
- React 19 + Vite + Tailwind front-end
- TypeScript monorepo/workspaces
- `gray-matter` markdown/frontmatter parsing
- `react-markdown` + `remark-gfm` + `rehype-highlight`
- `radix-ui` + shadcn UI wrappers
- `highlight.js`

## Current Project Signals

- `bun audit` (run on 2026-02-08) reports no known advisories at current lock state.
- Production front-end build currently emits source maps: `front-end/vite.config.ts:42`.
- Markdown is rendered via `react-markdown` + `rehype-highlight`: `front-end/src/components/MarkdownRenderer.tsx:59`.
- Back-end binds `0.0.0.0` by default: `back-end/src/index.ts:6`.
- Content image route already has path traversal containment checks: `back-end/src/content-routes.ts:20` and `back-end/src/content-routes.ts:39`.
- Lockfile currently includes `js-yaml@3.14.2` via `gray-matter` (`bun pm why js-yaml`).

## OWASP Top 10 Mapping (Most Relevant)

| OWASP 2021 | How it applies here | Severity | Likelihood | Recommended mitigation |
|---|---|---|---|---|
| A03 Injection | Markdown rendering pipeline can become an XSS sink if raw HTML parsing is enabled or unsafe URL/HTML transforms are added. | High | Medium | Keep `react-markdown` defaults, do not add `rehype-raw` for untrusted content, add explicit URI policy tests. |
| A05 Security Misconfiguration | Production source maps and missing default security header middleware can expose internals or weaken browser protections. | Medium | Medium | Disable production source maps unless needed, add `@fastify/helmet`, define CSP strategy. |
| A06 Vulnerable and Outdated Components | `gray-matter` pulls `js-yaml@3.14.2`; known `js-yaml` prototype-pollution advisory exists for versions before 4.1.1. | High (if untrusted input) | Low currently (trusted repo content) | Migrate off vulnerable parser chain or constrain/verify frontmatter source trust boundary. |
| A08 Software and Data Integrity Failures | Monorepo/workspace dependency chain can be impacted by compromised packages or install scripts. | High | Medium | Enforce lockfile integrity review, CI audit gates, provenance checks, prefer minimal dependency footprint. |
| A09 Security Logging and Monitoring Failures | Logging exists, but no explicit security event classification, abuse detection, or alerting baseline. | Medium | Medium | Add structured security logs for rejected paths, unusual request rates, and parser failures; feed to monitoring. |

## Technology-Specific Concerns

| Technology | Concern | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| Bun runtime / package manager | Supply-chain risk via transitive dependencies and install-time scripts in npm ecosystem. | High | Medium | Run `bun audit` in CI, gate lockfile changes in review, use trusted registries and provenance controls. |
| Fastify | No built-in rate limiting in current app routes; abuse/DoS risk on public endpoints. | Medium | Medium | Add `@fastify/rate-limit` globally (with route exceptions only where justified). |
| Fastify | No explicit security-header middleware currently configured. | Medium | Medium | Add `@fastify/helmet` with explicit CSP and frame protections. |
| Fastify validation | Fastify warns schema definitions use `new Function()` under validation/serialization pipeline; user-provided schemas are unsafe. | High | Low | Keep schemas static in source control only; never compile untrusted schemas at runtime. |
| Fastify CORS | Fastify CORS plugin warns that `RegExp` or function-based dynamic origins can enable DoS if misused. | Medium | Low currently | If CORS is added later, use strict allowlists and avoid expensive dynamic origin logic. |
| React 19 | XSS risk if `dangerouslySetInnerHTML` is introduced for untrusted content. | High | Low currently | Keep JSX escaping model; if raw HTML is required, sanitize server-side and client-side before render. |
| Vite | `VITE_*` variables are intentionally exposed to client bundles; accidental secret placement is a common leak path. | High | Medium | Never store secrets in `VITE_*`; keep secrets server-side only. |
| Vite build | `sourcemap: true` in production build can disclose source internals. | Medium | Medium | Set `build.sourcemap` to `false` in production, or serve maps only to authenticated error tooling. |
| gray-matter | Depends on legacy `js-yaml` line; known prototype pollution advisory exists for `<4.1.1`. | High (if input untrusted) | Low currently | Upgrade parsing chain (or replace parser), and restrict markdown/frontmatter input to trusted repo-controlled files. |
| react-markdown | Security guidance warns that changing `urlTransform` or using unsafe plugins can open XSS vectors. | High | Medium | Keep default URL handling, add tests against `javascript:` payloads, avoid unsafe plugin transforms. |
| rehype-highlight + highlight.js | `rehype-highlight` security note recommends combining with `rehype-sanitize` for untrusted input; `highlight.js` warns on unescaped HTML. | High (if untrusted markdown) | Medium | Add sanitization layer if content trust changes; reject raw HTML blocks from external authors. |
| Tailwind / Radix / shadcn | Primarily presentational, but still subject to dependency-level supply-chain or stale-version risks. | Medium | Medium | Keep versions current, include UI deps in audit/SBOM process, minimize optional packages. |

## Prioritized Actions

1. Add `security_concerns.md` to ongoing security review workflow and keep it updated with lockfile changes.
2. Decide trust boundary for markdown content explicitly (repo-trusted only vs user-submitted).  
3. If markdown may become untrusted, add sanitization controls before/within rendering pipeline.
4. Add Fastify hardening baseline: rate limiting + helmet headers.
5. Disable production source maps by default.
6. Plan migration away from parser chain that includes `js-yaml@3.14.2`.
7. Add CI policy gates: `bun audit`, dependency update cadence, and lockfile review checks.

## Primary Sources

- OWASP Top 10 2021 (A03/A05/A06/A08/A09):  
  https://owasp.org/Top10/
- OWASP A03 Injection:  
  https://owasp.org/Top10/A03_2021-Injection/
- OWASP A05 Security Misconfiguration:  
  https://owasp.org/Top10/A05_2021-Security_Misconfiguration/
- OWASP A06 Vulnerable and Outdated Components:  
  https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/
- OWASP A08 Software and Data Integrity Failures:  
  https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/
- OWASP A09 Security Logging and Monitoring Failures:  
  https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/
- Fastify validation and serialization notes:  
  https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- Fastify CORS warning on `RegExp`/function origins and DoS risk:  
  https://github.com/fastify/fastify-cors
- Fastify rate limiting plugin:  
  https://github.com/fastify/fastify-rate-limit
- Fastify helmet plugin:  
  https://github.com/fastify/fastify-helmet
- React DOM `dangerouslySetInnerHTML` caution:  
  https://legacy.reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
- Vite env variable exposure (`VITE_`):  
  https://vite.dev/guide/env-and-mode
- Vite build sourcemap option:  
  https://vite.dev/config/build-options#build-sourcemap
- react-markdown security notes:  
  https://github.com/remarkjs/react-markdown
- rehype-highlight security note:  
  https://github.com/rehypejs/rehype-highlight
- highlight.js security wiki:  
  https://github.com/highlightjs/highlight.js/wiki/security
- OSV advisory (js-yaml prototype pollution):  
  https://osv.dev/vulnerability/GHSA-8j8c-7jfh-h6hx
- Bun audit command reference:  
  https://bun.sh/docs/pm/cli/audit
