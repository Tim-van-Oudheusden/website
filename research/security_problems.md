# Security Problems

Date: 2026-02-08  
Source baseline: `security_concerns.md`

This file lists concrete project instances of the vulnerability categories identified in `security_concerns.md`.

## Findings

| ID | Affected file(s) and line(s) | Category (from `security_concerns.md`) | Specific problem | Severity |
|---|---|---|---|---|
| SP-001 | `front-end/vite.config.ts:42` | Vite build / A05 Security Misconfiguration | Production build emits source maps (`sourcemap: true`), which can expose readable implementation details in production deployments. | Medium |
| SP-002 | `back-end/src/index.ts:6` | Fastify / A05 Security Misconfiguration | Back-end binds to `0.0.0.0` by default, exposing service on all interfaces unless deployment network controls are strict. | Medium |
| SP-003 | `back-end/src/index.ts:9`, `back-end/src/index.ts:21`, `back-end/src/index.ts:35`, `back-end/src/index.ts:43` | Fastify / A05 Security Misconfiguration | No explicit security middleware registration for headers/hardening (`@fastify/helmet`) before route registration. | Medium |
| SP-004 | `back-end/src/index.ts:21`, `back-end/src/index.ts:35`, `back-end/src/index.ts:43` | Fastify / A09 + abuse resilience concerns | Public routes are registered without request throttling/rate limiting, allowing easier brute-force or flood-style abuse. | Medium |
| SP-005 | `front-end/src/components/MarkdownRenderer.tsx:59`, `front-end/src/components/MarkdownRenderer.tsx:61` | react-markdown + rehype/highlight / A03 Injection | Markdown is processed with `rehype-highlight` but without a sanitization stage; this is a latent XSS risk if markdown trust boundary changes to untrusted input. | High |
| SP-006 | `back-end/src/content.ts:3`, `back-end/src/content.ts:72`, `back-end/src/content.ts:115`, `bun.lock:850`, `bun.lock:948` | gray-matter / A06 Vulnerable and Outdated Components | `gray-matter` relies on `js-yaml@3.14.2` (transitive), which is in an advisory range for known prototype-pollution issues. | High (context-dependent) |
| SP-007 | `back-end/Dockerfile:10`, `front-end/Dockerfile:10` | Bun runtime + monorepo / A08 Software and Data Integrity Failures | Dependency install uses `bun install --frozen-lockfile || bun install`; fallback path permits lockfile drift and less deterministic dependency resolution. | Medium |
| SP-008 | `front-end/Dockerfile:35` | Bun runtime + monorepo / A08 Software and Data Integrity Failures | Production image installs runtime server package via unpinned `bun add serve`, introducing mutable supply-chain input during image builds. | Medium |

## Notes

- `back-end/src/content-routes.ts:20` and `back-end/src/content-routes.ts:39` already include path traversal protection for image file access.
- `bun audit` currently reports no known vulnerabilities, but this does not remove architectural/configuration risks listed above.
- Potential future ticket for SP-006 (removed from current beads backlog):
  Migrate frontmatter parsing off the `gray-matter`/`js-yaml@3.x` path while preserving current content parsing behavior and test expectations.
