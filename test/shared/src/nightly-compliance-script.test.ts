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

// Stub `curl`: answers a GitHub "latest release" request from
// $STUB_RELEASES/<owner>/<repo>.status (an HTTP code, or `unreachable` to fail
// like a network error) and <repo>.json (the body). A repository with no
// .status file answers 404, as GitHub does for one without releases. Every
// requested URL is appended to $STUB_CURL_LOG.
function writeCurlStub(): void {
  const stubPath = join(stubDir, "curl");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
out=""
url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -w|-H|--max-time) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
printf '%s\\n' "$url" >> "$STUB_CURL_LOG"
repo="\${url#https://api.github.com/repos/}"
repo="\${repo%/releases/latest}"
status_file="$STUB_RELEASES/$repo.status"
if [ ! -f "$status_file" ]; then
  echo '{"message":"Not Found"}' > "$out"
  printf 404
  exit 0
fi
status="$(cat "$status_file")"
if [ "$status" = unreachable ]; then
  echo "curl: (6) Could not resolve host: api.github.com" >&2
  exit 6
fi
cp "$STUB_RELEASES/$repo.json" "$out"
printf '%s' "$status"
`,
  );

  chmodSync(stubPath, 0o755);
}

function stubRelease(repo: string, status: number | "unreachable", body: object = {}): void {
  mkdirSync(join(releasesDir, repo, ".."), { recursive: true });
  writeFileSync(join(releasesDir, `${repo}.status`), String(status));
  writeFileSync(join(releasesDir, `${repo}.json`), JSON.stringify(body));
}

function writeProjectPage(file: string, repo: string, dates: string): void {
  writeFileSync(
    join(contentDir, file),
    [
      "---",
      `title: ${file}`,
      dates,
      "type: project",
      "links:",
      "  - type: repo",
      "    label: Source repository",
      `    href: https://github.com/${repo}`,
      "---",
      "",
      "Hello.",
      "",
    ].join("\n"),
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
  curlLog = join(workDir, "curl-urls.log");
  mkdirSync(stubDir);
  mkdirSync(contentDir);
  writeFileSync(join(contentDir, "Published.md"), "---\ntitle: Published\n---\n\nHello.\n");
  writeFileSync(curlLog, "");
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
        "| Project release lookup | ✅ pass |",
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

  describe("project pages against their latest GitHub release", () => {
    const repo = "Tim-van-Oudheusden/MinimalUI";
    const release = { tag_name: "v0.1.5", published_at: "2026-11-14T10:11:56Z" };

    test("fails and names the page, its date and the newer release", () => {
      writeProjectPage("Minimal Android Launcher.md", repo, "date: 2026-06-10\nupdated: 2026-10-26");
      stubRelease(repo, 200, release);

      const { status, report } = runScript();

      expect(status).toBe(1);
      expect(report).toMatch(/Project pages current with releases \| ❌ fail/);
      expect(report).toMatch(/Project release lookup \| ✅ pass/);

      expect(report).toContain(
        "`Minimal Android Launcher.md` is dated 2026-10-26, but Tim-van-Oudheusden/MinimalUI released v0.1.5 on 2026-11-14",
      );

      expect(readFileSync(curlLog, "utf8")).toBe(
        "https://api.github.com/repos/Tim-van-Oudheusden/MinimalUI/releases/latest\n",
      );
    });

    // The page date is `updated:`, or `date:` when there is none; a release on
    // the page's own day counts as covered.
    test.each([
      ["a release on the day of updated:", "date: 2026-06-10\nupdated: 2026-11-14", 0],
      ["updated: after the release", "date: 2026-06-10\nupdated: 2026-11-15", 0],
      ["updated: before the release, date: after it", "updated: 2026-11-13\ndate: 2026-11-20", 1],
      ["only date:, on the day of the release", "date: 2026-11-14", 0],
      ["only date:, before the release", "date: 2026-11-13", 1],
      ["only publishDate:, on the day of the release", "publishDate: 2026-11-14", 0],
    ])("compares the release day with the page: %s", (_name, dates, expected) => {
      writeProjectPage("Page.md", repo, dates);
      stubRelease(repo, 200, release);

      const { status, report } = runScript();

      expect(status).toBe(expected);

      expect(report).toMatch(
        expected === 0 ? /Project pages current with releases \| ✅ pass/ : /Project pages current with releases \| ❌ fail/,
      );
    });

    test("passes a repository with no releases", () => {
      writeProjectPage("Website.md", "Tim-van-Oudheusden/website", "date: 2026-06-10");

      const { status, report } = runScript();

      expect(status).toBe(0);
      expect(report).toMatch(/Project pages current with releases \| ✅ pass/);
      expect(report).toMatch(/Project release lookup \| ✅ pass/);
      expect(readFileSync(curlLog, "utf8")).toContain("/repos/Tim-van-Oudheusden/website/releases/latest");
    });

    // A lookup that fails says nothing about the page, so it must not read as
    // a stale page, nor as a pass.
    // The reason in the note is what tells a rate limit from an outage.
    test.each([
      ["the network is unreachable", "unreachable" as const, {}, "curl exited 6"],
      ["the API refuses the request", 403, { message: "API rate limit exceeded" }, "HTTP 403"],
      ["the release has no publish date", 200, { tag_name: "v0.1.5" }, "no tag or publish date in the response"],
      ["the release has no tag", 200, { published_at: "2026-11-14T10:11:56Z" }, "no tag or publish date in the response"],
    ])("fails the lookup row, not the page row, when %s", (_name, httpStatus, body, reason) => {
      writeProjectPage("Minimal Android Launcher.md", repo, "date: 2026-06-10\nupdated: 2026-10-26");
      stubRelease(repo, httpStatus, body);

      const { status, report } = runScript();

      expect(status).toBe(1);
      expect(report).toMatch(/Project release lookup \| ❌ fail/);
      expect(report).toMatch(/Project pages current with releases \| ✅ pass/);
      expect(report).toContain(`could not read the latest release of Tim-van-Oudheusden/MinimalUI (${reason})`);
    });

    test("checks every project page even after one fails", () => {
      writeProjectPage("A.md", repo, "date: 2026-10-26");
      writeProjectPage("B.md", "Tim-van-Oudheusden/Dailies", "date: 2026-10-26");
      stubRelease(repo, "unreachable");
      stubRelease("Tim-van-Oudheusden/Dailies", 200, { tag_name: "v0.3.3", published_at: "2026-11-18T22:41:53Z" });

      const { report } = runScript();

      expect(report).toContain("`B.md` is dated 2026-10-26, but Tim-van-Oudheusden/Dailies released v0.3.3 on 2026-11-18");
    });

    test("only looks up the first github.com repo link of a project page", () => {
      writeFileSync(
        join(contentDir, "Article.md"),
        `---\ntitle: Article\ndate: 2026-01-01\nlinks:\n  - type: repo\n    href: https://github.com/${repo}\n---\n`,
      );

      writeFileSync(
        join(contentDir, "Elsewhere.md"),
        "---\ntitle: Elsewhere\ndate: 2026-01-01\ntype: project\nlinks:\n  - type: repo\n    href: https://gitlab.com/someone/thing\n---\n",
      );

      writeFileSync(
        join(contentDir, "Two links.md"),
        [
          "---",
          "title: Two links",
          "date: 2026-01-01",
          "type: project",
          "links:",
          "- label: Install guide",
          "  href: https://github.com/Tim-van-Oudheusden/pindu-os/blob/main/docs/install.md",
          "  type: docs",
          "- label: Source",
          '  href: "https://github.com/Tim-van-Oudheusden/pindu-os/"',
          "  type: repo # the code",
          "- type: repo",
          "  href: https://github.com/Tim-van-Oudheusden/other",
          "---",
          "",
        ].join("\n"),
      );

      runScript();

      expect(readFileSync(curlLog, "utf8")).toBe(
        "https://api.github.com/repos/Tim-van-Oudheusden/pindu-os/releases/latest\n",
      );
    });

    // GitHub answers 404 for `<repo>.git`, which reads as "no releases": the
    // page would pass without ever being compared.
    test("looks up a repo link that ends in .git without the suffix", () => {
      writeProjectPage("Minimal Android Launcher.md", `${repo}.git`, "date: 2026-06-10\nupdated: 2026-10-26");
      stubRelease(repo, 200, release);

      const { status, report } = runScript();

      expect(status).toBe(1);
      expect(report).toMatch(/Project pages current with releases \| ❌ fail/);
      expect(readFileSync(curlLog, "utf8")).toBe(`https://api.github.com/repos/${repo}/releases/latest\n`);
    });

    test("skips github.com links that are not a repo link to a repository's root", () => {
      writeFileSync(
        join(contentDir, "Not a repo.md"),
        [
          "---",
          "title: Not a repo",
          "date: 2026-01-01",
          "type: project",
          "links:",
          "  - type: docs",
          "    href: https://github.com/Tim-van-Oudheusden/handbook",
          "  - type: repo",
          "    href: https://github.com/Tim-van-Oudheusden/website/tree/main/content",
          "---",
          "",
        ].join("\n"),
      );

      const { status } = runScript();

      expect(status).toBe(0);
      expect(readFileSync(curlLog, "utf8")).toBe("");
    });
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
