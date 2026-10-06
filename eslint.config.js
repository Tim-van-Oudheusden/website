import eslint from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import perfectionist from "eslint-plugin-perfectionist";
import reactHooks from "eslint-plugin-react-hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const configDir = dirname(fileURLToPath(import.meta.url));

const projectPaths = [
  "./tsconfig.eslint.json",
  "./front-end/tsconfig.eslint.json",
  "./back-end/tsconfig.eslint.json",
  "./shared/tsconfig.eslint.json",
  "./e2e/tsconfig.eslint.json",
  "./playwright/tsconfig.eslint.json",
];

const workspaceAliasRootDir = configDir.replace(/^\/var\/home\//, "/home/");
const projectAliases = workspaceAliasRootDir === configDir
  ? []
  : projectPaths.map((projectPath) => resolve(workspaceAliasRootDir, projectPath));

const reactNamedImportsMessage = "Import React APIs by name (`import { useState } from \"react\"`), not as a namespace or default.";

/* Syntax banned everywhere; tool config files only get the default-export exemption. */
const restrictedSyntax = [
  { selector: "TSEnumDeclaration", message: "Use an `as const` object or a union type instead of `enum`." },
  { selector: "TSModuleDeclaration[kind='namespace']", message: "Use ES modules instead of `namespace`." },
  { selector: "TSParameterProperty", message: "Declare class fields explicitly instead of parameter properties." },
  {
    selector: "ImportSpecifier[importKind='type']",
    message: "Use a separate `import type` statement instead of an inline `type` specifier.",
  },
  {
    selector: "ImportDeclaration[source.value='react'][importKind='value'] > ImportNamespaceSpecifier",
    message: reactNamedImportsMessage,
  },
  { selector: "ImportDeclaration[source.value='react'] > ImportDefaultSpecifier", message: reactNamedImportsMessage },
  {
    selector: "JSXAttribute > JSXExpressionContainer > Literal[value=true]",
    message: "Use boolean shorthand (`disabled`) instead of `disabled={true}`.",
  },
  {
    selector: "JSXOpeningElement[attributes.length=0]:matches([name.name='Fragment'], [name.property.name='Fragment'])",
    message: "Use `<>` instead of `<Fragment>` unless it needs a `key`.",
  },
];

const optionalMemberMessage = "Model a complete type instead of an optional member: required field, `T | null`, or a discriminated union (see CONTRIBUTING.md \"Code shape\").";

/* Optional members (`foo?: T`, `foo?(…)`, `fn(x?: T)`); enabled per area until the rollout in #545 completes. */
const optionalMemberSyntax = [
  { selector: "TSPropertySignature[optional=true]", message: optionalMemberMessage },
  { selector: "PropertyDefinition[optional=true]", message: optionalMemberMessage },
  {
    selector: ":matches(Identifier, AssignmentPattern, ObjectPattern, ArrayPattern)[optional=true]",
    message: optionalMemberMessage,
  },
];

const optionalMemberFiles = ["shared/src/**/*.ts", "back-end/src/**/*.ts", "front-end/src/features/home/**"];

const defaultExportFiles = ["playwright.config.ts", "front-end/vite.config.ts", "test/front-end/vite.config.test.ts"];

/* React code: the front-end app and its tests (hooks also live in .ts files). */
const reactFiles = ["front-end/src/**/*.{ts,tsx}", "test/front-end/**/*.{ts,tsx}"];

/** Only the three agreed rules may warn (see CONTRIBUTING.md); preset warnings become errors. */
function asErrors(rules) {
  return Object.fromEntries(
    Object.entries(rules).map(([rule, entry]) => {
      const [severity, ...options] = Array.isArray(entry) ? entry : [entry];

      return [rule, severity === "off" || severity === 0 ? entry : ["error", ...options]];
    }),
  );
}

/* @eslint-react v5 re-implements the hooks rules; eslint-plugin-react-hooks owns them here. */
const eslintReactHooksDuplicates = Object.fromEntries(
  [
    "error-boundaries",
    "exhaustive-deps",
    "globals",
    "immutability",
    "purity",
    "refs",
    "rules-of-hooks",
    "set-state-in-effect",
    "set-state-in-render",
    "static-components",
    "unsupported-syntax",
    "use-memo",
  ].map((rule) => [`@eslint-react/${rule}`, "off"]),
);

export default tseslint.config(
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: true,
    jsx: true,
    braceStyle: "1tbs",
    commaDangle: "always-multiline",
    arrowParens: true,
    quoteProps: "consistent-as-needed",
  }),
  {
    plugins: { perfectionist },
    languageOptions: {
      parserOptions: {
        project: [...projectPaths, ...projectAliases],
        tsconfigRootDir: configDir,
      },
    },
    rules: {
      /* ── Formatting (overrides on top of stylistic.configs.customize) ── */
      "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
      "@stylistic/comma-dangle": [
        "error",
        {
          arrays: "always-multiline",
          objects: "always-multiline",
          imports: "always-multiline",
          exports: "always-multiline",
          functions: "always-multiline",
          enums: "always-multiline",
          tuples: "always-multiline",
          generics: "ignore",
        },
      ],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
      curly: ["error", "all"],
      "@stylistic/max-len": [
        "error",
        {
          code: 120,
          tabWidth: 2,
          ignoreStrings: true,
          ignoreUrls: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignorePattern: String.raw`\bclassName=`,
        },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["block-like", "multiline-expression"] },
        { blankLine: "always", prev: ["block-like", "multiline-expression"], next: "*" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
        { blankLine: "always", prev: "*", next: ["return", "break", "continue", "throw"] },
        { blankLine: "any", prev: ["case", "default"], next: ["case", "default"] },
      ],
      "@stylistic/jsx-self-closing-comp": "error",

      /* ── Types and type safety ── */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"] },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        { selector: "variable", format: ["camelCase", "PascalCase"] },
        { selector: "variable", modifiers: ["const", "global"], format: ["camelCase", "PascalCase", "UPPER_CASE"] },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "parameter", format: ["camelCase", "PascalCase"] },
        {
          selector: ["variable", "parameter"],
          modifiers: ["unused"],
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
        },
        { selector: "typeLike", format: ["PascalCase"] },
        {
          selector: ["interface", "typeAlias"],
          format: ["PascalCase"],
          custom: { regex: "^[IT][A-Z]", match: false },
        },
        { selector: "property", format: null },
        { selector: ["objectLiteralMethod", "typeMethod"], format: null },
      ],

      /* ── Code shape ── */
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Use named exports; default exports are only allowed in tool config files.",
        },
        ...restrictedSyntax,
      ],
      "func-style": ["error", "declaration", { allowArrowFunctions: false }],
      "prefer-arrow-callback": "error",
      "arrow-body-style": ["error", "as-needed"],
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "no-else-return": "error",
      "no-nested-ternary": "error",
      "no-param-reassign": ["error", { props: false }],
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      "no-duplicate-imports": ["error", { includeExports: true, allowSeparateTypeImports: true }],

      /* ── Import and export ordering ── */
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          ignoreCase: true,
          environment: "bun",
          internalPattern: ["^@/"],
          customGroups: [{ groupName: "workspace", elementNamePattern: "^shared($|/)" }],
          groups: ["builtin", "external", "workspace", "internal", "parent", "sibling", "index"],
          newlinesBetween: 1,
        },
      ],
      "perfectionist/sort-named-imports": ["error", { type: "natural", ignoreCase: true }],
      "perfectionist/sort-named-exports": ["error", { type: "natural", ignoreCase: true }],
      "perfectionist/sort-exports": ["error", { type: "natural", ignoreCase: true }],

      /* ── General quality ── */
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    ...eslintReact.configs["strict-type-checked"],
    files: reactFiles,
    rules: asErrors(eslintReact.configs["strict-type-checked"].rules),
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: reactFiles,
    rules: asErrors(reactHooks.configs.flat.recommended.rules),
  },
  {
    files: reactFiles,
    rules: eslintReactHooksDuplicates,
  },
  {
    files: defaultExportFiles,
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
  {
    files: optionalMemberFiles,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Use named exports; default exports are only allowed in tool config files.",
        },
        ...restrictedSyntax,
        ...optionalMemberSyntax,
      ],
    },
  },
  {
    /* Relax type-aware safety rules for test files (excluded from tsconfig composite builds) */
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.e2e.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  {
    /* shadcn-generated components: house formatting applies, authoring-shape rules do not */
    files: ["front-end/src/shared/components/ui/**"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "func-style": "off",
    },
  },
  {
    ignores: ["**/dist/", "**/node_modules/", "**/.pi-sandbox/**", "**/worktrees/**", "**/*.config.js"],
  },
);
