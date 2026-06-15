const path = require("path");

const shortRoot = path.resolve(__dirname, "native-packages");

const androidSourceDir = (packageName) => path.join(shortRoot, packageName, "android");

module.exports = {
  dependencies: {
    "expo-modules-core": {
      platforms: {
        android: {
          sourceDir: androidSourceDir("expo-modules-core"),
        },
      },
    },
    "react-native-gesture-handler": {
      platforms: {
        android: {
          sourceDir: androidSourceDir("react-native-gesture-handler"),
        },
      },
    },
    "react-native-reanimated": {
      platforms: {
        android: {
          sourceDir: androidSourceDir("react-native-reanimated"),
        },
      },
    },
    "react-native-screens": {
      platforms: {
        android: {
          sourceDir: androidSourceDir("react-native-screens"),
        },
      },
    },
  },
};
