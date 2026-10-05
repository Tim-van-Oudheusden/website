import { resolve } from "path";

import { validateContentDir } from "../features/content/content";

/** CLI guard for content validity; fails with the invalid documents listed. */
const contentDir = resolve(import.meta.dirname, "../../../content");

const errors = await validateContentDir(contentDir);

if (errors.length === 0) {
  console.error("Content validation passed.");
  process.exit(0);
}

for (const error of errors) {
  const field = error.field ?? "document";

  console.error(`- ${error.file} (${field}): ${error.message}`);
}

console.error(`Content validation failed: ${errors.length} invalid document(s).`);
process.exit(1);
