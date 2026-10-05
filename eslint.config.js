import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export default tseslint.config(
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

      /* ── Best practices ── */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
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

      /* ── General quality ── */
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
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
    },
  },
  {
    ignores: ["**/dist/", "**/node_modules/", "**/.pi-sandbox/**", "**/worktrees/**", "**/*.config.js"],
  },
);
