import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// @next/eslint-plugin-next is not restored.
// @next/eslint-plugin-next@16.4.2 (and eslint-config-next@16.4.2, which depends on
// that exact plugin) declares a runtime dependency on fast-glob@3.3.1. fast-glob
// 3.3.3, the latest release, still depends on micromatch@^4.0.8, and micromatch
// depends on braces@^3.0.3. braces 3.0.3 is the newest 3.x publish and is inside
// GHSA-vfj7-8cjw-p6xm (high: stack exhaustion from deeply nested brace patterns).
// No patched 3.x exists, so installing the plugin puts an unfixed high advisory
// back in the root tree and `npm audit` is no longer 0. The plugin loads
// fast-glob from dist/utils/get-root-dirs.js, so the dependency is not optional.
// react-hooks does not depend on that chain. The two rules eslint-config-next
// enabled are restored here: rules-of-hooks as an error, exhaustive-deps as a warning.
export default tseslint.config(
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "server/**", "processor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
