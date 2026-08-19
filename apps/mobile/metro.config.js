const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const { withUniwindConfig } = require('uniwind/metro');

const defaultConfig = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');

// Expo can invoke custom resolvers with the workspace root as a synthetic
// origin. Metro cannot perform a package lookup above an app-scoped
// projectRoot, so give Uniwind an in-project origin for that one case.
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath =
    path.resolve(context.originModulePath) === workspaceRoot &&
    moduleName.startsWith('uniwind/components')
      ? path.join(__dirname, 'package.json')
      : context.originModulePath;

  return context.resolveRequest(
    { ...context, originModulePath },
    moduleName,
    platform,
  );
};

const config = withUniwindConfig(defaultConfig, {
  cssEntryFile: './global.css',
  dtsFile: './src/types/uniwind.d.ts',
});

module.exports = config;
