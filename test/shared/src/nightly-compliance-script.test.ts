import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/nightly-compliance.sh");

let workDir: string;
let stubDir: string;
let contentDir: string;
let argsLog: string;
let releasesDir: string;
let curlLog: string;

// Stub `bun`: `bun audit` prints an advisory and exits 1 when STUB_AUDIT_FAIL=1,
// or when it is not run from the repository root, whose lockfile it reads.
// Every invocation's arguments are appended, one per line, to $STUB_ARGS_LOG.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$@" >> "$STUB_ARGS_LOG"
if [ "$1" = audit ]; then
  if [ ! -f scripts/nightly-compliance.sh ] || [ "\${STUB_AUDIT_FAIL:-0}" = 1 ]; then
    echo "high: fastify vulnerable to something - https://github.com/advisories/GHSA-xxxx"
    exit 1
  fi
  echo "No vulnerabilities found"
  exit 0
fi
exit 0
`,
  );

  chmodSync(stubPath, 0o755);
}

// Stub `curl` as the GitHub API: a request for /repos/<owner>/<repo>/releases/latest
// answers 200 with $STUB_RELEASES/<owner>__<repo>.json, the HTTP status in
// <owner>__<repo>.status with an error body, or 404 (no release) when neither
// exists. STUB_CURL_FAIL=1 fails like a network error. Every URL is appended to
// $STUB_CURL_LOG.
function writeCurlStub(): void {
  const stubPath = join(stubDir, "curl");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
out=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -H|-w|--max-time) shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
printf '%s\\n' "$url" >> "$STUB_CURL_LOG"
if [ "\${STUB_CURL_FAIL:-0}" = 1 ]; then
  echo "curl: (6) Could not resolve host: api.github.com" >&2
  exit 6
fi
repo="\${url#https://api.github.com/repos/}"
repo="\${repo%/releases/latest}"
fixture="$STUB_RELEASES/\${repo//\\//__}"
if [ -f "$fixture.json" ]; then
  cat "$fixture.json" > "$out"
  printf 200
elif [ -f "$fixture.status" ]; then
  echo '{"message":"API rate limit exceeded"}' > "$out"
  cat "$fixture.status"
else
  echo '{"message":"Not Found"}' > "$out"
  printf 404
fi
`,
  );

  chmodSync(stubPath, 0o755);
}

/** A project page whose repo link points at github.com/<repo>. */
function writeProjectPage(name: string, repo: string, dates: string): void {
  writeFileSync(
    join(contentDir, `${name}.md`),
    [
      "---",
      `title: ${name}`,
      dates,
      "type: project",
      "links:",
      "  - type: repo",
      "    label: Source repository",
      `    href: https://github.com/${repo}`,
      "---",
      "",
    ].join("\n"),
  );
}

/** The latest release of <repo> as the GitHub API returns it. */
function writeRelease(repo: string, tag: string, publishedAt: string): void {
  writeFileSync(
    join(releasesDir, `${repo.replace("/", "__")}.json`),
    JSON.stringify({ tag_name: tag, name: tag, draft: false, prerelease: false, published_at: publishedAt }),
  );
}

function runScript(env: Record<string, string> = {}): { status: number | null; report: string; log: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: workDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      CONTENT_DIR: contentDir,
      GITHUB_SHA: "abc1234",
      STUB_ARGS_LOG: argsLog,
      STUB_RELEASES: releasesDir,
      STUB_CURL_LOG: curlLog,
      ...env,
    },
  });

  return { status: result.status, report: result.stdout, log: result.stderr };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "nightly-compliance-"));
  stubDir = join(workDir, "bin");
  contentDir = join(workDir, "content");
  argsLog = join(workDir, "bun-args.log");
  releasesDir = join(workDir, "releases");
  curlLog = join(workDir, "curl.log");
  mkdirSync(stubDir);
  mkdirSync(contentDir);
  mkdirSync(releasesDir);
  writeFileSync(join(contentDir, "Published.md"), "---\ntitle: Published\n---\n\nHello.\n");
  writeBunStub();
  writeCurlStub();
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/nightly-compliance.sh", () => {
  test("passes and reports every check when dependencies are clean and no drafts are published", () => {
    const { status, report } = runScript();

    expect(status).toBe(0);

    expect(report).toBe(
      [
        "# Nightly compliance",
        "",
        "Commit: `abc1234`",
        "",
        "| Check | Result |",
        "| ----- | ------ |",
        "| Dependency audit (high+) | ✅ pass |",
        "| Draft leak guard | ✅ pass |",
        "| Project pages current with releases | ✅ pass |",
        "",
      ].join("\n"),
    );
  });

  test("fails when the dependency audit finds high-severity advisories", () => {
    const { status, report, log } = runScript({ STUB_AUDIT_FAIL: "1" });

    expect(status).toBe(1);
    expect(report).toMatch(/Dependency audit.*fail/);
    expect(log).toContain("GHSA-xxxx");
  });

  // A dropped threshold or a malformed --ignore entry (e.g. an empty
  // `--ignore=`) would change what the audit reports without failing it.
  test("audits at the high threshold and passes ignored advisories as well-formed IDs", () => {
    runScript();

    const [command, ...flags] = readFileSync(argsLog, "utf8").trimEnd().split("\n");

    expect(command).toBe("audit");
    expect(flags).toContain("--audit-level=high");

    const ignores = flags.filter((f) => f !== "--audit-level=high");

    for (const flag of ignores) {
      expect(flag).toMatch(/^--ignore=(GHSA(-[23456789cfghjmpqrvwx]{4}){3}|CVE-\d{4}-\d{4,})$/);
    }

    // Read from the script, because entries are meant to go when a fix ships.
    const list = /^AUDIT_IGNORE=\((.*)\)$/m.exec(readFileSync(scriptPath, "utf8"))?.[1];

    expect(list).toBeDefined();
    expect(ignores).toEqual((list ?? "").split(/\s+/).filter(Boolean).map((id) => `--ignore=${id}`));
  });

  test("fails and names the file when content contains a draft", () => {
    writeFileSync(join(contentDir, "Unfinished.md"), "---\ntitle: Unfinished\ndraft: true\n---\n");

    const { status, report, log } = runScript();

    expect(status).toBe(1);
    expect(report).toMatch(/Draft leak guard.*fail/);
    expect(log).toContain("Unfinished.md");
  });

  // The front-matter parser drops a trailing ` # comment` from an unquoted
  // value, so `draft: true # wip` is a draft; `true#wip` is the string "true#wip".
  // It also trims a key's leading indent, so ` draft: true` is a top-level draft.
  test.each([
    "draft: true # not ready yet",
    "draft: true\t# wip",
    "draft: true \r",
    " draft: true",
    "\tdraft: true # wip",
  ])(
    "fails on a draft line the parser reads as true: %p",
    (line) => {
      writeFileSync(join(contentDir, "Unfinished.md"), `---\ntitle: Unfinished\n${line}\n---\n`);

      const { status, report, log } = runScript();

      expect(status).toBe(1);
      expect(report).toMatch(/Draft leak guard.*fail/);
      expect(log).toContain("Unfinished.md");
    },
  );

  test("passes a draft value the parser reads as text, not true", () => {
    writeFileSync(join(contentDir, "Hashed.md"), "---\ntitle: Hashed\ndraft: true#wip\n---\n");

    const { status, report } = runScript();

    expect(status).toBe(0);
    expect(report).toMatch(/Draft leak guard.*pass/);
  });

  test("runs every check even when an earlier one fails", () => {
    writeFileSync(join(contentDir, "Unfinished.md"), "---\ndraft: true\n---\n");

    const { status, report } = runScript({ STUB_AUDIT_FAIL: "1" });

    expect(status).toBe(1);
    expect(report).toMatch(/Dependency audit.*fail/);
    expect(report).toMatch(/Draft leak guard.*fail/);
  });

  test("fails and says what to update when a project's latest release is newer than its page", () => {
    writeProjectPage("Launcher", "owner/launcher", "date: 2026-06-10\nupdated: 2026-10-26");
    writeRelease("owner/launcher", "v0.1.5", "2026-11-14T09:30:00Z");

    const { status, report } = runScript();

    expect(status).toBe(1);
    expect(report).toMatch(/Project pages current with releases.*fail/);
    expect(report).toContain("- `Launcher.md` is dated 2026-10-26; owner/launcher v0.1.5 was released 2026-11-14");
    expect(readFileSync(curlLog, "utf8")).toBe("https://api.github.com/repos/owner/launcher/releases/latest\n");
  });

  test("compares the release with date: when the page has no updated:", () => {
    writeProjectPage("Launcher", "owner/launcher", "date: 2026-11-01");
    writeRelease("owner/launcher", "v1.0.0", "2026-11-02T00:10:00Z");

    const { status, report } = runScript();

    expect(status).toBe(1);
    expect(report).toContain("- `Launcher.md` is dated 2026-11-01; owner/launcher v1.0.0 was released 2026-11-02");
  });

  // Release day against page day: a page updated the day of the release is current.
  test.each([
    ["updated the day of the release", "date: 2026-06-10\nupdated: 2026-11-14", "2026-11-14T23:59:59Z"],
    ["updated after the release", "date: 2026-06-10\nupdated: '2026-11-20'", "2026-11-14T09:30:00Z"],
    ["whose updated: is newer than its date:", "date: 2026-11-01\nupdated: 2026-11-20 # notes read", "2026-11-14T09:30:00Z"],
  ])("passes a project page %s", (_, dates, publishedAt) => {
    writeProjectPage("Launcher", "owner/launcher", dates);
    writeRelease("owner/launcher", "v0.1.5", publishedAt);

    const { status, report } = runScript();

    expect(status).toBe(0);
    expect(report).toMatch(/Project pages current with releases.*pass/);
    expect(report).not.toContain("Launcher.md");
  });

  test("passes a project whose repository has no release", () => {
    writeProjectPage("Operating system", "owner/os", "date: 2026-11-16");

    const { status, report } = runScript();

    expect(status).toBe(0);
    expect(report).toMatch(/Project pages current with releases.*pass/);
    expect(readFileSync(curlLog, "utf8")).toBe("https://api.github.com/repos/owner/os/releases/latest\n");
  });

  test("looks up only the repo link of project pages", () => {
    writeFileSync(
      join(contentDir, "Article.md"),
      "---\ntitle: Article\ndate: 2026-01-01\ntype: article\nlinks:\n  - type: repo\n    href: https://github.com/owner/article\n---\n",
    );

    writeFileSync(
      join(contentDir, "Docs.md"),
      "---\ntitle: Docs\ndate: 2026-01-01\ntype: project\nlinks:\n  - type: docs\n    href: https://github.com/owner/docs\n  - type: repo\n    href: https://github.com/owner/code\n---\n",
    );

    runScript();

    expect(readFileSync(curlLog, "utf8")).toBe("https://api.github.com/repos/owner/code/releases/latest\n");
  });

  // An unanswered lookup says nothing about the page, so it must not read as stale.
  test.each([
    ["an API error", "403", {}, "HTTP 403"],
    ["a network error", null, { STUB_CURL_FAIL: "1" }, "curl exit 6"],
  ])("fails as a lookup failure, not a stale page, on %s", (_, httpStatus, env, reason) => {
    writeProjectPage("Launcher", "owner/launcher", "date: 2026-11-01");

    if (httpStatus !== null) {
      writeFileSync(join(releasesDir, "owner__launcher.status"), httpStatus);
    }

    const { status, report } = runScript(env);

    expect(status).toBe(1);
    expect(report).toMatch(/Project pages current with releases.*fail/);
    expect(report).toContain(`- \`Launcher.md\`: could not look up the latest release of owner/launcher (${reason})`);
    expect(report).not.toContain("is dated");
  });
});

describe(".github/workflows/nightly-compliance.yml", () => {
  test("runs the compliance script nightly and on demand with read-only permissions", () => {
    const workflow = readFileSync(resolve(rootPath, ".github/workflows/nightly-compliance.yml"), "utf8");

    expect(workflow).toMatch(/schedule:\s*\n\s*- cron:/);
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toMatch(/permissions:\s*\n\s*contents: read/);
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("scripts/nightly-compliance.sh");
  });
});
