#!/usr/bin/env bash
# Shared helper for scripts/coverage-check.sh and scripts/quality-report.sh.
#
# coverage_metrics reads a `bun test --coverage` report on stdin and prints
# "<functions%> <lines%>" from its "All files | ..." summary row, or nothing
# (with no output) if that row is absent.
coverage_metrics() {
  awk -F'|' '
    # Keep reading after the match: exiting early closes the pipe while the
    # writer is still sending a large report, failing it with SIGPIPE.
    /^All files[[:space:]]*\|/ && !found {
      gsub(/[[:space:]]/, "", $2)
      gsub(/[[:space:]]/, "", $3)
      metrics = $2 " " $3
      found = 1
    }
    END { if (found) print metrics }'
}
