const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
    extraNodeModules: {
      ...config.resolver.extraNodeModules,
      'react-native-screens': require.resolve('react-native-screens'),
      'react-native-safe-area-context': require.resolve('react-native-safe-area-context'),
      'react-native-gesture-handler': require.resolve('react-native-gesture-handler'),
    },
  },
};
