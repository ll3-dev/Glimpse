// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // ios/는 네이티브 영역 — ShareExtensionPreprocessor.js는 iOS 호스트가
    // 전역 심볼(NSExtensionJavaScriptPreprocessingScript 규약)로 소비하므로
    // no-var/no-unused-vars가 모두 오탐이다.
    ignores: ["dist/*", "ios/**", "android/**", "ios/.xcode.env.local"],
  },
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
  },
]);
