import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  {
    ignores: [".next/**", "out/**", "public/sw.js", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Next 16.4 upgrade: eslint-config-next's flat config enables stricter
    // React-hooks v6 rules than the repo ever enforced (previously these
    // patterns passed via the FlatCompat "next/core-web-vitals" extends).
    // They are pre-existing product code (theme-switcher mounted guard,
    // composer effect syncs, exportVideo ref usage); keep them as warnings
    // so the upgrade stays chore-only. Future cleanup can address them
    // deliberately.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
