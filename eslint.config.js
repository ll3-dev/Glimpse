// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tanstackQuery = require('@tanstack/eslint-plugin-query');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  ...tanstackQuery.configs['flat/recommended'],
]);
