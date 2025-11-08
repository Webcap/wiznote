module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
    ,
    // Reanimated plugin must be last in the plugins list
    plugins: ['react-native-reanimated/plugin'],
  };
};