import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist"]),
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The calculator is a focusable group: its single-key shortcuts must only
      // work while it has focus (WCAG 2.1.4).
      "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["group"] }],
      // Safari removes list semantics from unstyled lists unless the role is explicit.
      "jsx-a11y/no-redundant-roles": ["error", { ol: ["list"] }],
    },
  },
  prettier,
]);
