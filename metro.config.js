const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix web-streams-polyfill resolution
config.resolver.alias = {
  ...config.resolver.alias,
  'web-streams-polyfill/ponyfill/es6': 'web-streams-polyfill/ponyfill/es2018',
};

module.exports = config;