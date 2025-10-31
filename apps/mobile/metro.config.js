const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile',
  transformer: {
    // Use metro-react-native-babel-transformer for everything except SVGs
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    // Tell Metro to use SVG transformer only for SVG files
    resolveRequest: (context, realModuleName, platform, moduleName) => {
      if (realModuleName.endsWith('.svg')) {
        return {
          filePath: path.resolve(__dirname, realModuleName),
          type: 'asset',
        };
      }
      return null;
    },
  },
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  debug: false,
  extensions: [],
  watchFolders: [],
});
