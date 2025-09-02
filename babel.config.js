module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            '@': './',
            '@app': './app',
            '@components': './components',
            '@contexts': './contexts',
            '@hooks': './hooks',
            '@lib': './lib',
            '@constants': './constants',
            '@src': './src'
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};