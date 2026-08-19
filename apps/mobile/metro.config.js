const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const { withUniwindConfig } = require('uniwind/metro');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.projectRoot = path.resolve(__dirname, '../..');

const config = withUniwindConfig(defaultConfig, {
  cssEntryFile: './global.css',
  dtsFile: './src/types/uniwind.d.ts',
});

module.exports = config;
