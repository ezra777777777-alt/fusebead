import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "server/**", "processor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
