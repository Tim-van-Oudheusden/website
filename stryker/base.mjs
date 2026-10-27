// Settings every workspace's mutation run shares (#942). Each
// stryker/<workspace>.conf.mjs spreads them and adds only what differs: the
// files to mutate, the test command run against each mutant, and the report
// file names (reports/mutation/<workspace>.{html,json}).
//
// Stryker has no Bun test runner, so the `command` runner runs the whole suite
// per mutant and there is no per-test coverage to analyse. `inPlace` mutates the
// real files: tests import sources by relative path and through the `shared`
// workspace link, which a sandbox copy would not follow (docs/testing.md).
export const base = {
  testRunner: "command",
  coverageAnalysis: "off",
  inPlace: true,
  disableTypeChecks: false,
  reporters: ["clear-text", "progress", "html", "json"],
};
