import 'dotenv/config';

export default {
  name: "Pyqp",
  slug: "pyqp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/pyqp-logo.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  extra: {
    // Add environment variables here
    EXPO_PUBLIC_APPWRITE_ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    EXPO_PUBLIC_APPWRITE_PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    EXPO_PUBLIC_APPWRITE_DB_ID: process.env.EXPO_PUBLIC_APPWRITE_DB_ID,
    EXPO_PUBLIC_APPWRITE_BUNDLE_ID: process.env.EXPO_PUBLIC_APPWRITE_BUNDLE_ID,
    EXPO_PUBLIC_APPWRITE_PACKAGE_NAME: process.env.EXPO_PUBLIC_APPWRITE_PACKAGE_NAME,
    eas: {
      projectId: "811c74e6-6579-4f8a-b3c1-ce74a9d18403"
    }
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.pyqp.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/pyqp-logo.png",
      backgroundColor: "#000000"
    },
    package: "com.pyqp.app",
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/pyqp-logo.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/pyqp-logo.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#000000"
      }
    ],
    "@react-native-community/datetimepicker",
    "expo-font",
    "expo-web-browser"
  ],
  experiments: {
    typedRoutes: true
  },
  owner: "llamafgvv",
  description: "A platform for accessing and downloading previous year question papers of various educational institutions."
}; 
