export default {
  expo: {
    name: "Glimpse",
    slug: "Glimpse",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "glimpse",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "kr.ll3.glimpse",
      appleTeamId: process.env.APP_TEAM_ID,
      infoPlist: {
        NSSupportsLiveActivities: true,
      },
      entitlements: {
        "com.apple.security.application-groups": ["group.glimpse.data"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "kr.ll3.glimpse",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "@bacons/apple-targets",
      "expo-sqlite",
      "expo-background-task",
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
