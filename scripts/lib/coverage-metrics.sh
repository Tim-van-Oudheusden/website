#!/usr/bin/env bash
# Shared helper for scripts/coverage-check.sh and scripts/quality-report.sh.
#
# coverage_metrics reads a `bun test --coverage` report on stdin and prints
# "<functions%> <lines%>" from its "All files | ..." summary row, or nothing
# (with no output) if that row is absent.
coverage_metrics() {
  awk -F'|' '
    /^All files[[:space:]]*\|/ {
      gsub(/[[:space:]]/, "", $2)
      gsub(/[[:space:]]/, "", $3)
      print $2, $3
      exit
    }'
}
