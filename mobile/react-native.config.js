module.exports = {
  dependencies: {
    // Exclude @rnmapbox/maps from codegen to avoid TurboModule type errors
    // Mapbox doesn't fully support React Native's new architecture codegen
    // This prevents the "UnsupportedModulePropertyParserError" during pod install
    // Note: We only disable codegen, not autolinking. Autolinking is still needed for Android.
    '@rnmapbox/maps': {
      platforms: {
        ios: null, // Disable iOS platform codegen
        // android: null removed - we need autolinking for Android, just not codegen
      },
    },
  },
  project: {
    ios: {},
    android: {},
  },
};

