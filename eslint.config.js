// ESLint flat config: JS recommended + typescript-eslint recommended.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", ".wrangler/", "node_modules/", "coverage/", ".specify/", ".claude/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
