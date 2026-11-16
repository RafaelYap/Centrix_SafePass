const baseConfig = require("./app.json");
const fs = require('fs');
const path = require('path');

const normalizeVariant = (value) =>
  String(value || "").toLowerCase().trim() === "visitor" ? "visitor" : "full";

module.exports = ({ config }) => {
  const releaseApiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  if (releaseApiUrl.includes("your-render-backend") || releaseApiUrl.includes("example.com")) {
    throw new Error("Replace the placeholder EXPO_PUBLIC_API_BASE_URL with the real SafePass API before building.");
  }
  const variant = normalizeVariant(process.env.EXPO_PUBLIC_APP_VARIANT);
  const expoConfig = baseConfig.expo || {};
  const isVisitorBuild = variant === "visitor";
  const googleServicesFile = path.join(__dirname, 'android', 'app', 'google-services.json');
  const pushNotificationsConfigured = !isVisitorBuild && fs.existsSync(googleServicesFile);
  const appName = isVisitorBuild
    ? "SafePass Visitor"
    : expoConfig.name || "CentrixMobile";
  const usesLocalHttpApi = String(
    process.env.EXPO_PUBLIC_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_LAN_BASE_URL ||
      "",
  ).startsWith("http://");

  // iOS Google Sign-In needs its own OAuth client ID (type "iOS" in Google Cloud).
  // The URL scheme is that client ID reversed. Without it, Google sign-in stays
  // hidden on iOS and the rest of the app builds normally.
  const googleIosClientId = String(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      expoConfig.extra?.googleIosClientId ||
      "",
  ).trim();
  const googleIosUrlScheme = googleIosClientId.endsWith(".apps.googleusercontent.com")
    ? `com.googleusercontent.apps.${googleIosClientId.replace(".apps.googleusercontent.com", "")}`
    : "";
  const iosBundleIdentifier =
    expoConfig.ios?.bundleIdentifier || "com.sapphire.centrixsafepass";

  return {
    ...config,
    ...expoConfig,
    name: appName,
    slug: isVisitorBuild ? "safepass-visitor" : expoConfig.slug,
    plugins: [
      ...(expoConfig.plugins || []),
      ...(googleIosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme }]]
        : []),
    ],
    ios: {
      ...(expoConfig.ios || {}),
      bundleIdentifier: isVisitorBuild
        ? `${iosBundleIdentifier}.visitor`
        : iosBundleIdentifier,
    },
    extra: {
      ...(expoConfig.extra || {}),
      ...(googleIosClientId ? { googleIosClientId } : {}),
      pushNotificationsConfigured,
      apiBaseUrl: String(process.env.EXPO_PUBLIC_API_BASE_URL || "").trim(),
      appVariant: variant,
      appDisplayName: appName,
      appOrganization: "Sapphire International Aviation Academy",
    },
    android: {
      ...(expoConfig.android || {}),
      ...(pushNotificationsConfigured ? { googleServicesFile } : {}),
      ...(usesLocalHttpApi ? { usesCleartextTraffic: true } : {}),
      package: isVisitorBuild
        ? "com.anonymous.SafePassMobile.visitor"
        : "com.anonymous.SafePassMobile",
    },
  };
};
