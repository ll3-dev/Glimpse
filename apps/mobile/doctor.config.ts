export default {
  ignore: {
    overrides: [
      {
        // This native preprocessor is loaded by the Share Extension plist and Xcode resources.
        files: ['ios/ShareExtension/ShareExtensionPreprocessor.js'],
        rules: ['deslop/unused-file'],
      },
      {
        // bun-types supplies bun:test declarations used by the mobile test setup and shared tests.
        files: ['package.json'],
        rules: ['deslop/unused-dev-dependency'],
      },
    ],
  },
};
