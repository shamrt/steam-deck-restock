import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

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
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettier.rules,
      "prettier/prettier": "error",
      "no-unused-vars": "error",
      "no-console": "off",
    },
  },
  // Ignore patterns
  {
    ignores: ["node_modules/**", "logs/**", "dist/**", "build/**", ".git/**"],
  },
];
