const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {wrapWithReanimatedMetroConfig} = require('react-native-reanimated/metro-config');

const config = {};

// Merge default config with yours
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

// Wrap with Reanimated (recommended)
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);
