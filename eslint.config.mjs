import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  ...tseslint.configs.recommended,
  {
    ...nextPlugin.configs.recommended,
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  { ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**"] },
];
