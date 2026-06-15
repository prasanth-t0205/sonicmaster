import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "out/**",
    "build/**",
    "dist/**",
    "dist-electron/**",
    "node_modules/**"
  ]),
]);

export default eslintConfig;
