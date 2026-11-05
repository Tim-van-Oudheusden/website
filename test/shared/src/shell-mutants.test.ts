import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Hand mutants for the shell scripts, which no mutation-testing tool covers.
// Each row changes one string in a script and names the test file that must
// fail on the result. A row whose mutant survives marks a branch that runs but
// that no assertion pins (#924, #939). Add a row when a hand mutation run finds
// one and a test kills it; see docs/testing.md "Mutation testing".

const rootPath = resolve(import.meta.dirname, "../../..");

interface ShellMutant {
  /** What a test must notice: the behaviour the mutant breaks, and where it came from. */
  name: string;
  /** Repo-relative script the mutant is applied to. */
  file: string;
  /** Text replaced; it must occur exactly once in `file`. */
  from: string;
  to: string;
  /** Repo-relative test file that must fail with the mutant applied. */
  killedBy: string;
}

const UPDATE_SCRIPT = "deploy/systemd/website-update.sh";
const UPDATE_TEST = "test/shared/src/website-update-script.test.ts";
const MERGE_QUEUE_SCRIPT = "scripts/merge-queue.sh";
const MERGE_QUEUE_TEST = "test/shared/src/merge-queue-script.test.ts";
const TIER_SCRIPT = "scripts/tier-classify.sh";
const TIER_TEST = "test/shared/src/tier-classifier-script.test.ts";
const REVIEW_SCRIPT = "scripts/pr-review-check.sh";
const REVIEW_TEST = "test/shared/src/pr-review-script.test.ts";
const COVERAGE_SCRIPT = "scripts/coverage-check.sh";
const COVERAGE_TEST = "test/shared/src/coverage-check-script.test.ts";
const QUALITY_SCRIPT = "scripts/quality-report.sh";
const QUALITY_TEST = "test/shared/src/quality-report-script.test.ts";
const NIGHTLY_SCRIPT = "scripts/nightly-compliance.sh";
const NIGHTLY_TEST = "test/shared/src/nightly-compliance-script.test.ts";
const AUTO_ISSUE_SCRIPT = "scripts/auto-issue.sh";
const AUTO_ISSUE_TEST = "test/shared/src/auto-issue-script.test.ts";
const APPLY_SCRIPT = "scripts/apply-review-suggestions.sh";
const APPLY_TEST = "test/shared/src/apply-review-suggestions-script.test.ts";
const E2E_SCRIPT = "scripts/e2e.sh";
const E2E_TEST = "test/shared/src/e2e-script.test.ts";
const PROD_ASSETS_SCRIPT = "scripts/prod-assets.sh";
const PROD_ASSETS_TEST = "test/shared/src/prod-assets-script.test.ts";
const REVIEW_TYPES = "build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test";

const MUTANTS: readonly ShellMutant[] = [
  {
    name: "a still-rejected image with no local :latest before the pull is not rolled back to a stale :rollback (#924)",
    file: UPDATE_SCRIPT,
    from: `    if [[ -n "\${before[$name]}" && "\${before[$name]}" != "\${after[$name]}" ]]; then`,
    to: `    if [[ "\${before[$name]}" != "\${after[$name]}" ]]; then`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path only tags back images that had a local :latest (#939)",
    file: UPDATE_SCRIPT,
    from: `    if [[ -n "\${before[$name]}" ]]; then\n      restore_rollback "$name"\n    fi\n  done\n  exit 1`,
    to: `      restore_rollback "$name"\n  done\n  exit 1`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path says why it skips the pod restart (#939)",
    file: UPDATE_SCRIPT,
    from: `  echo "skipping pod restart: a rejected image has nothing to roll back to" >&2\n`,
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path exits non-zero",
    file: UPDATE_SCRIPT,
    from: `  done\n  exit 1\nfi`,
    to: `  done\n  exit 0\nfi`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay only rolls back images that had a local :latest before the pull",
    file: UPDATE_SCRIPT,
    from: `    if [[ -n "\${before[$name]}" ]]; then\n      restore_rollback "$name"\n      reject "$name"`,
    to: `    if true; then\n      restore_rollback "$name"\n      reject "$name"`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay records the new digest as rejected",
    file: UPDATE_SCRIPT,
    from: `    reject "$name" "\${after[$name]}"\n`,
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay restarts the pod on the rolled-back images",
    file: UPDATE_SCRIPT,
    from: `echo "replaying podman-kube@website.service with rolled-back image(s)" >&2\nsystemctl --user restart podman-kube@website.service`,
    to: `echo "replaying podman-kube@website.service with rolled-back image(s)" >&2`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "only an image with a local :latest is tagged as :rollback before the pull",
    file: UPDATE_SCRIPT,
    from: `  if [[ -n "\${before[$name]}" ]]; then\n    podman tag "$ref:latest" "$ref:rollback"`,
    to: `  if true; then\n    podman tag "$ref:latest" "$ref:rollback"`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a still-rejected digest makes the run exit non-zero",
    file: UPDATE_SCRIPT,
    from: "    still_rejected=1\n",
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "an unchanged run still exits non-zero while a digest is rejected",
    file: UPDATE_SCRIPT,
    from: `  echo "images unchanged; skipping pod restart"\n  exit "$still_rejected"`,
    to: `  echo "images unchanged; skipping pod restart"\n  exit 0`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "land warns when it cannot read the issues a merged PR closes (#994)",
    file: MERGE_QUEUE_SCRIPT,
    from: `    echo "::warning title=Merge queue::could not read the issues #\${number} closes; close them by hand"\n`,
    to: "    :\n",
    killedBy: MERGE_QUEUE_TEST,
  },
  {
    name: "next fails instead of reporting an empty queue when listing PRs fails (#994)",
    file: MERGE_QUEUE_SCRIPT,
    from: `| "\\(.number) \\(.headRefOid)"')"`,
    to: `| "\\(.number) \\(.headRefOid)"' || true)"`,
    killedBy: MERGE_QUEUE_TEST,
  },
  {
    name: "the draft leak guard fails instead of passing when grep cannot read the content directory (#1024)",
    file: "scripts/draft-leak-guard.sh",
    from: "    exit 2\n",
    to: "    exit 0\n",
    killedBy: "test/shared/src/ci-workflow.test.ts",
  },
  {
    name: "the draft leak guard exits 1 for a draft, not the read-error 2 (#1024)",
    file: "scripts/draft-leak-guard.sh",
    from: "  0) exit 1 ;;",
    to: "  0) exit 2 ;;",
    killedBy: "test/shared/src/ci-workflow.test.ts",
  },
  {
    name: "the draft leak guard fails when grep cannot run at all, not only on grep's exit 2 (#1024)",
    file: "scripts/draft-leak-guard.sh",
    from: "  *)\n",
    to: "  2)\n",
    killedBy: "test/shared/src/ci-workflow.test.ts",
  },
  {
    name: "a file answered with index.html and a 200 fails the check (#480)",
    file: PROD_ASSETS_SCRIPT,
    from: ` && cmp -s "$file" "$body"`,
    to: "",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "a file that fails the check fails the run",
    file: PROD_ASSETS_SCRIPT,
    from: `to $file)" >&2\n    failed=1\n`,
    to: `to $file)" >&2\n`,
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "the run exits non-zero after a failed file",
    file: PROD_ASSETS_SCRIPT,
    from: `if [ "$failed" -ne 0 ]; then\n  exit 1`,
    to: `if [ "$failed" -ne 0 ]; then\n  exit 0`,
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "nothing to check is a failure, not a pass",
    file: PROD_ASSETS_SCRIPT,
    from: `if [ "$checked" -eq 0 ]; then`,
    to: "if false; then",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "the image under test is the prod target",
    file: PROD_ASSETS_SCRIPT,
    from: "--target prod",
    to: "--target dev",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "the image is published on loopback only",
    file: PROD_ASSETS_SCRIPT,
    from: `-p "127.0.0.1:$PORT:3000"`,
    to: `-p "$PORT:3000"`,
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "an HTTP error is not a ready server",
    file: PROD_ASSETS_SCRIPT,
    from: "curl -fs --max-time",
    to: "curl -s --max-time",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "assets are fetched at their path under the site root",
    file: PROD_ASSETS_SCRIPT,
    from: `path="\${file#public}"`,
    to: `path="$file"`,
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "a failed poll waits before the next one",
    file: PROD_ASSETS_SCRIPT,
    from: `  sleep "$WAIT_INTERVAL"\n`,
    to: "",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "the script finds public/ from any directory",
    file: PROD_ASSETS_SCRIPT,
    from: `cd "$ROOT"\n`,
    to: "",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "a failed image build stops the run",
    file: PROD_ASSETS_SCRIPT,
    from: "set -euo pipefail\n",
    to: "",
    killedBy: PROD_ASSETS_TEST,
  },
  {
    name: "a missing functions floor is an error, not a floor of 0",
    file: COVERAGE_SCRIPT,
    from: `"\${2:?min funcs % required}"`,
    to: `"\${2:-0}"`,
    killedBy: COVERAGE_TEST,
  },
  {
    name: "a missing lines floor is an error, not a floor of 0",
    file: COVERAGE_SCRIPT,
    from: `"\${3:?min lines % required}"`,
    to: `"\${3:-0}"`,
    killedBy: COVERAGE_TEST,
  },
  {
    name: "each figure is compared with its own floor",
    file: COVERAGE_SCRIPT,
    from: `-v mf="$min_funcs" -v ml="$min_lines"`,
    to: `-v mf="$min_lines" -v ml="$min_funcs"`,
    killedBy: COVERAGE_TEST,
  },
  {
    name: "function coverage on its floor passes",
    file: COVERAGE_SCRIPT,
    from: "f >= mf",
    to: "f > mf",
    killedBy: COVERAGE_TEST,
  },
  {
    name: "the table is read from stderr, where Bun prints it",
    file: COVERAGE_SCRIPT,
    from: `--coverage 2>&1)"`,
    to: `--coverage)"`,
    killedBy: COVERAGE_TEST,
  },
  {
    name: "the tests run from inside the workspace",
    file: COVERAGE_SCRIPT,
    from: `cd "$ROOT/$workspace"\n`,
    to: "",
    killedBy: COVERAGE_TEST,
  },
  {
    name: "the workspace's tests run with coverage",
    file: COVERAGE_SCRIPT,
    from: `"../test/$workspace" --coverage`,
    to: `"../test/$workspace"`,
    killedBy: COVERAGE_TEST,
  },
  {
    name: "an unknown workspace fails instead of running elsewhere",
    file: COVERAGE_SCRIPT,
    from: "set -euo pipefail\n",
    to: "",
    killedBy: COVERAGE_TEST,
  },
  {
    name: "a failed test run reports n/a even when it printed a table",
    file: QUALITY_SCRIPT,
    from: `if [ "$test_status" -ne 0 ] || [ -z "$metrics" ]; then`,
    to: `if [ -z "$metrics" ]; then`,
    killedBy: QUALITY_TEST,
  },
  {
    name: "a test run with no table reports n/a",
    file: QUALITY_SCRIPT,
    from: `if [ "$test_status" -ne 0 ] || [ -z "$metrics" ]; then`,
    to: `if [ "$test_status" -ne 0 ]; then`,
    killedBy: QUALITY_TEST,
  },
  {
    name: "gate output stays out of the report",
    file: QUALITY_SCRIPT,
    from: `if bun run "$gate" >&2; then`,
    to: `if bun run "$gate"; then`,
    killedBy: QUALITY_TEST,
  },
  {
    name: "test output stays out of the report",
    file: QUALITY_SCRIPT,
    from: `printf '%s\\n' "$report" >&2`,
    to: `printf '%s\\n' "$report"`,
    killedBy: QUALITY_TEST,
  },
  {
    name: "the table is read from stderr, where Bun prints it",
    file: QUALITY_SCRIPT,
    from: `--coverage 2>&1)"`,
    to: `--coverage)"`,
    killedBy: QUALITY_TEST,
  },
  {
    name: "the gates table keeps the header Markdown needs",
    file: QUALITY_SCRIPT,
    from: `echo "| ---- | ------ |"\n`,
    to: "",
    killedBy: QUALITY_TEST,
  },
  {
    name: "the coverage table keeps the header Markdown needs",
    file: QUALITY_SCRIPT,
    from: `echo "| --------- | --------- | ----- |"\n`,
    to: "",
    killedBy: QUALITY_TEST,
  },
  {
    name: "the audit is told which advisories to ignore",
    file: NIGHTLY_SCRIPT,
    from: ` "\${AUDIT_IGNORE[@]/#/--ignore=}"`,
    to: "",
    killedBy: NIGHTLY_TEST,
  },
  {
    name: "the audit runs from the repository root, whose lockfile it reads",
    file: NIGHTLY_SCRIPT,
    from: `cd "$ROOT"\n`,
    to: "",
    killedBy: NIGHTLY_TEST,
  },
  {
    name: "the report table keeps the header Markdown needs",
    file: NIGHTLY_SCRIPT,
    from: `echo "| ----- | ------ |"\n`,
    to: "",
    killedBy: NIGHTLY_TEST,
  },
  {
    name: "more than 30 open issues do not hide the one to comment on",
    file: AUTO_ISSUE_SCRIPT,
    from: "--limit 1000 ",
    to: "",
    killedBy: AUTO_ISSUE_TEST,
  },
  {
    name: "a failed issue list stops the run instead of opening a duplicate",
    file: AUTO_ISSUE_SCRIPT,
    from: "set -euo pipefail\n",
    to: "",
    killedBy: AUTO_ISSUE_TEST,
  },
  {
    name: "an empty report counts as no report",
    file: AUTO_ISSUE_SCRIPT,
    from: `if [ -s "$report" ]; then`,
    to: `if [ -e "$report" ]; then`,
    killedBy: AUTO_ISSUE_TEST,
  },
  {
    name: "the wrong number of arguments is refused",
    file: AUTO_ISSUE_SCRIPT,
    from: `if [ "$#" -ne 3 ]; then`,
    to: `if [ "$#" -lt 3 ]; then`,
    killedBy: AUTO_ISSUE_TEST,
  },
  {
    name: "a path cannot forge an applied suggestion from a comment with no write access",
    file: APPLY_SCRIPT,
    from: ".replace(/[\\\\\\t\\n\\r]/g, (c) => escapes[c])",
    to: "",
    killedBy: APPLY_TEST,
  },
  {
    name: "a newline in a path stays on its row",
    file: APPLY_SCRIPT,
    from: "/[\\\\\\t\\n\\r]/g",
    to: "/[\\\\\\t\\r]/g",
    killedBy: APPLY_TEST,
  },
  {
    name: "a tab in a path stays in its field",
    file: APPLY_SCRIPT,
    from: "/[\\\\\\t\\n\\r]/g",
    to: "/[\\\\\\n\\r]/g",
    killedBy: APPLY_TEST,
  },
  {
    name: "every special character in a path is escaped, not only the first",
    file: APPLY_SCRIPT,
    from: "/[\\\\\\t\\n\\r]/g",
    to: "/[\\\\\\t\\n\\r]/",
    killedBy: APPLY_TEST,
  },
  {
    name: "members can apply suggestions",
    file: APPLY_SCRIPT,
    from: `["OWNER", "MEMBER", "COLLABORATOR"]`,
    to: `["OWNER", "COLLABORATOR"]`,
    killedBy: APPLY_TEST,
  },
  {
    name: "collaborators can apply suggestions",
    file: APPLY_SCRIPT,
    from: `["OWNER", "MEMBER", "COLLABORATOR"]`,
    to: `["OWNER", "MEMBER"]`,
    killedBy: APPLY_TEST,
  },
  {
    name: "comments are grouped by file before the overlap check",
    file: APPLY_SCRIPT,
    from: "(a.path < b.path ? -1 : a.path > b.path ? 1 : b.start - a.start)",
    to: "(b.start - a.start)",
    killedBy: APPLY_TEST,
  },
  {
    name: "a range overlaps from the first line of an applied range",
    file: APPLY_SCRIPT,
    from: `floor="$start"`,
    to: `floor="$end"`,
    killedBy: APPLY_TEST,
  },
  {
    name: "the last line of a file with no final newline is in range",
    file: APPLY_SCRIPT,
    from: "+ 2 ))",
    to: "+ 1 ))",
    killedBy: APPLY_TEST,
  },
  {
    name: "the edited file keeps its mode",
    file: APPLY_SCRIPT,
    from: `cat "$tmp" > "$path"`,
    to: `mv "$tmp" "$path"`,
    killedBy: APPLY_TEST,
  },
  {
    name: "no suggestions is reported, not read as an empty row",
    file: APPLY_SCRIPT,
    from: `[ -n "$rows" ] || { echo "no suggestions to apply"; exit 0; }\n`,
    to: "",
    killedBy: APPLY_TEST,
  },
  {
    name: "an unparsable comments file fails",
    file: APPLY_SCRIPT,
    from: "set -euo pipefail\n",
    to: "",
    killedBy: APPLY_TEST,
  },
  {
    name: "a relative COMMENTS_FILE survives the move to an empty directory",
    file: APPLY_SCRIPT,
    from: `COMMENTS_FILE="$(realpath -e -- "$comments_file")"`,
    to: `COMMENTS_FILE="$comments_file"`,
    killedBy: APPLY_TEST,
  },
  {
    name: "a directory in the checkout is skipped",
    file: APPLY_SCRIPT,
    from: `if [[ "$resolved" != "$checkout"/* ]] || [ ! -f "$resolved" ]; then`,
    to: `if [[ "$resolved" != "$checkout"/* ]]; then`,
    killedBy: APPLY_TEST,
  },
  {
    name: "CRLF from the web editor does not reach the file",
    file: APPLY_SCRIPT,
    from: `c.body.replaceAll("\\r", "")`,
    to: "c.body",
    killedBy: APPLY_TEST,
  },
  {
    name: "a suggestion ends at its own closing fence",
    file: APPLY_SCRIPT,
    from: "([\\s\\S]*?)",
    to: "([\\s\\S]*)",
    killedBy: APPLY_TEST,
  },
  {
    name: "a fence ending a line of text does not close a suggestion",
    file: APPLY_SCRIPT,
    from: `^\\1\`*[ \\t]*$`,
    to: `\\1\`*[ \\t]*$`,
    killedBy: APPLY_TEST,
  },
  {
    name: "spaces after the opening fence still open a suggestion",
    file: APPLY_SCRIPT,
    from: "suggestion[ \\t]*\\n",
    to: "suggestion\\n",
    killedBy: APPLY_TEST,
  },
  {
    name: "a longer closing fence still closes a suggestion",
    file: APPLY_SCRIPT,
    from: `^\\1\`*[ \\t]*$`,
    to: "^\\1[ \\t]*$",
    killedBy: APPLY_TEST,
  },
  {
    name: "two backticks do not open a suggestion",
    file: APPLY_SCRIPT,
    from: `(\`{3,})suggestion`,
    to: `(\`{1,})suggestion`,
    killedBy: APPLY_TEST,
  },
  {
    name: "a failed poll waits before the next one",
    file: E2E_SCRIPT,
    from: `  sleep "$WAIT_INTERVAL"\n`,
    to: "",
    killedBy: E2E_TEST,
  },
  {
    name: "a failed image build stops the run",
    file: E2E_SCRIPT,
    from: "set -euo pipefail\n",
    to: "",
    killedBy: E2E_TEST,
  },
  {
    name: "the script runs from the repository root in any directory",
    file: E2E_SCRIPT,
    from: `cd "$ROOT"\n`,
    to: "",
    killedBy: E2E_TEST,
  },
  {
    name: "a medium rule is not rated low",
    file: TIER_SCRIPT,
    from: "[medium]=2",
    to: "[medium]=1",
    killedBy: TIER_TEST,
  },
  {
    name: "a medium rule is not rated high",
    file: TIER_SCRIPT,
    from: "[medium]=2",
    to: "[medium]=3",
    killedBy: TIER_TEST,
  },
  {
    name: "a rejected policy prints nothing on stdout",
    file: TIER_SCRIPT,
    from: `echo "tier-classify: $*" >&2`,
    to: `echo "tier-classify: $*"`,
    killedBy: TIER_TEST,
  },
  {
    name: "a rules: line with a value is malformed",
    file: TIER_SCRIPT,
    from: `[ "$item" = rules: ] && [ -z "\${tier:-}" ] &&`,
    to: `[ "$item" = rules: ] &&`,
    killedBy: TIER_TEST,
  },
  {
    name: "a second rules: line is malformed",
    file: TIER_SCRIPT,
    from: `[ -z "\${tier:-}" ] && [ -z "$in_rules" ]; then`,
    to: `[ -z "\${tier:-}" ]; then`,
    killedBy: TIER_TEST,
  },
  {
    name: "an item before the rules: line is malformed",
    file: TIER_SCRIPT,
    from: `[ -n "$in_rules" ] && [ "$item" = - ]`,
    to: `[ "$item" = - ]`,
    killedBy: TIER_TEST,
  },
  {
    name: "an item needs its dash",
    file: TIER_SCRIPT,
    from: `[ -n "$in_rules" ] && [ "$item" = - ] &&`,
    to: `[ -n "$in_rules" ] &&`,
    killedBy: TIER_TEST,
  },
  {
    name: "an item needs a glob",
    file: TIER_SCRIPT,
    from: `[ "$item" = - ] && [ -n "\${glob:-}" ] &&`,
    to: `[ "$item" = - ] &&`,
    killedBy: TIER_TEST,
  },
  {
    name: "an item with an extra field is malformed",
    file: TIER_SCRIPT,
    from: `[ -n "\${glob:-}" ] && [ -z "\${extra:-}" ]`,
    to: `[ -n "\${glob:-}" ]`,
    killedBy: TIER_TEST,
  },
  {
    name: "a blank input line is no path",
    file: TIER_SCRIPT,
    from: `  [ -n "$path" ] || continue\n`,
    to: "",
    killedBy: TIER_TEST,
  },
  {
    name: "the tier column keeps its width",
    file: TIER_SCRIPT,
    from: "%-6s",
    to: "%-5s",
    killedBy: TIER_TEST,
  },
  {
    name: "spaces around a path stay part of the path",
    file: TIER_SCRIPT,
    from: `IFS= read -r -d "$delim" path`,
    to: `read -r -d "$delim" path`,
    killedBy: TIER_TEST,
  },
  {
    name: "a backslash in a rule reaches the glob",
    file: TIER_SCRIPT,
    from: "read -r item tier glob extra",
    to: "read item tier glob extra",
    killedBy: TIER_TEST,
  },
  {
    name: "a failure is a GitHub error annotation",
    file: REVIEW_SCRIPT,
    from: `echo "::error::$1"`,
    to: `echo "$1"`,
    killedBy: REVIEW_TEST,
  },
  {
    name: "a title must start with its type",
    file: REVIEW_SCRIPT,
    from: "=~ ^($types)",
    to: "=~ ($types)",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a capitalised scope is no scope",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-zA-Z0-9._/-]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a scope may hold digits",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-z._/-]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a scope may hold a dot",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-z0-9_/-]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a scope may hold an underscore",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-z0-9./-]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a scope may hold a slash",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-z0-9._-]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a scope may hold a dash",
    file: REVIEW_SCRIPT,
    from: "[a-z0-9._/-]+",
    to: "[a-z0-9._/]+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "the summary needs a space after the colon",
    file: REVIEW_SCRIPT,
    from: ":\\ .+",
    to: ":.+",
    killedBy: REVIEW_TEST,
  },
  {
    name: "the summary must not be empty",
    file: REVIEW_SCRIPT,
    from: ":\\ .+",
    to: ":\\ .*",
    killedBy: REVIEW_TEST,
  },
  {
    name: "only an author ending in [bot] is exempt",
    file: REVIEW_SCRIPT,
    from: `*"[bot]"`,
    to: "*bot*",
    killedBy: REVIEW_TEST,
  },
  {
    name: "a digit before the keyword means it is no whole word",
    file: REVIEW_SCRIPT,
    from: "(^|[^[:alnum:]_])",
    to: "(^|[^[:alpha:]_])",
    killedBy: REVIEW_TEST,
  },
  {
    name: "'fixed' links an issue",
    file: REVIEW_SCRIPT,
    from: "fix(es|ed)?",
    to: "fix(es)?",
    killedBy: REVIEW_TEST,
  },
  {
    name: "bare 'fix' links an issue",
    file: REVIEW_SCRIPT,
    from: "fix(es|ed)?",
    to: "fix(es|ed)",
    killedBy: REVIEW_TEST,
  },
  {
    name: "'closed' links an issue",
    file: REVIEW_SCRIPT,
    from: "close[sd]?",
    to: "close[s]?",
    killedBy: REVIEW_TEST,
  },
  {
    name: "bare 'close' links an issue",
    file: REVIEW_SCRIPT,
    from: "close[sd]?",
    to: "close[sd]",
    killedBy: REVIEW_TEST,
  },
  {
    name: "'resolved' links an issue",
    file: REVIEW_SCRIPT,
    from: "resolve[sd]?",
    to: "resolve[s]?",
    killedBy: REVIEW_TEST,
  },
  {
    name: "bare 'resolve' links an issue",
    file: REVIEW_SCRIPT,
    from: "resolve[sd]?",
    to: "resolve[sd]",
    killedBy: REVIEW_TEST,
  },
  {
    name: "bare 'ref' links an issue",
    file: REVIEW_SCRIPT,
    from: "refs?",
    to: "refs",
    killedBy: REVIEW_TEST,
  },
  {
    name: "the keyword may be followed by several spaces",
    file: REVIEW_SCRIPT,
    from: ":?[[:space:]]+",
    to: ":?[[:space:]]",
    killedBy: REVIEW_TEST,
  },
  {
    name: "the keyword needs a space before the number",
    file: REVIEW_SCRIPT,
    from: ":?[[:space:]]+",
    to: ":?[[:space:]]*",
    killedBy: REVIEW_TEST,
  },
  {
    name: "the repository of a long-form link may hold dots, dashes and underscores",
    file: REVIEW_SCRIPT,
    from: "/[[:alnum:]_.-]+)?#",
    to: "/[[:alnum:]]+)?#",
    killedBy: REVIEW_TEST,
  },
  ...["build", "ci", "docs", "perf", "revert", "style", "test"].map((type) => ({
    name: `'${type}' stays a title type`,
    file: REVIEW_SCRIPT,
    from: REVIEW_TYPES,
    to: REVIEW_TYPES.split("|")
      .filter((other) => other !== type)
      .join("|"),
    killedBy: REVIEW_TEST,
  })),
  {
    name: "the risk tier classifier refuses a policy with no rules instead of rating every path medium (#1169)",
    file: TIER_SCRIPT,
    from: `[ "\${#rule_globs[@]}" -gt 0 ] \\\n  || fail`,
    to: `true \\\n  || fail`,
    killedBy: TIER_TEST,
  },
];

let shadowRoot: string | null = null;

/**
 * Builds a throwaway view of the repository: `realPaths` (and the directories
 * leading to them) are real copies, everything else is a symlink back to the
 * checkout. A test file resolves the script relative to its own location, so a
 * copied test file runs against the copied, mutated script, and the checkout
 * itself is never written to.
 */
function shadowRepo(realPaths: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), "shell-mutant-"));

  function mirror(relDir: string): void {
    for (const entry of readdirSync(join(rootPath, relDir))) {
      const rel = relDir === "" ? entry : `${relDir}/${entry}`;

      if (realPaths.includes(rel)) {
        copyFileSync(join(rootPath, rel), join(root, rel));
      } else if (realPaths.some((path) => path.startsWith(`${rel}/`))) {
        mkdirSync(join(root, rel));
        mirror(rel);
      } else {
        symlinkSync(join(rootPath, rel), join(root, rel));
      }
    }
  }

  mirror("");

  return root;
}

function runTestFile(root: string, testFile: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ["test", `./${testFile}`], { cwd: root, encoding: "utf8" });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterEach(() => {
  if (shadowRoot !== null) {
    rmSync(shadowRoot, { recursive: true, force: true });
    shadowRoot = null;
  }
});

describe("shell mutants", () => {
  // Without this control, a harness that cannot run the copied test file at
  // all would count every mutant as killed.
  test.each([...new Set(MUTANTS.map((mutant) => mutant.killedBy))])(
    "%s passes on an unmutated copy",
    (testFile) => {
      shadowRoot = shadowRepo([testFile]);

      const { status, output } = runTestFile(shadowRoot, testFile);

      expect(output).not.toContain("(fail)");
      expect(status).toBe(0);
    },
    30_000,
  );

  for (const mutant of MUTANTS) {
    test(`${mutant.killedBy} notices: ${mutant.name}`, () => {
      const source = readFileSync(resolve(rootPath, mutant.file), "utf8");

      // A stale row (the script changed under it) must fail here, not pass silently.
      expect(source.split(mutant.from).length - 1).toBe(1);

      shadowRoot = shadowRepo([mutant.file, mutant.killedBy]);
      writeFileSync(join(shadowRoot, mutant.file), source.replace(mutant.from, () => mutant.to));

      const { status, output } = runTestFile(shadowRoot, mutant.killedBy);

      expect(output).toContain("(fail)");
      expect(status).not.toBe(0);
    }, 30_000);
  }
});
