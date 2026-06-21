import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  pluginJs.configs.recommended,
];
