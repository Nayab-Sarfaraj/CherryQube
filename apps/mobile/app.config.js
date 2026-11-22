const app = require("./app.json");

module.exports = () => ({
  ...app.expo,
  extra: {
    ...app.expo.extra,
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
  },
  plugins: [...app.expo.plugins, "expo-video"],
});
