const path = require("path");
const fs = require("fs");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const nativePackagesRoot = path.resolve(__dirname, "native-packages");

if (fs.existsSync(nativePackagesRoot)) {
  config.watchFolders = [...(config.watchFolders ?? []), nativePackagesRoot];
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules ?? {}),
    "expo-modules-core": path.join(nativePackagesRoot, "expo-modules-core"),
    "react-native-gesture-handler": path.join(nativePackagesRoot, "react-native-gesture-handler"),
    "react-native-reanimated": path.join(nativePackagesRoot, "react-native-reanimated"),
    "react-native-screens": path.join(nativePackagesRoot, "react-native-screens")
  };
}

module.exports = withNativeWind(config, { input: "./global.css" });
