import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  // Apply to all JS files
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettier.rules,
      "no-unused-vars": "error",
      "no-console": "off",
    },
  },
  // Ignore patterns
  {
    ignores: ["node_modules/**", "logs/**", "dist/**", "build/**", ".git/**"],
  },
];
