// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // React Native's <Text> does not interpret HTML entities, so unescaped
      // apostrophes (frequent in French copy) are safe; `&apos;` would render literally.
      "react/no-unescaped-entities": "off",
    },
  },
]);
