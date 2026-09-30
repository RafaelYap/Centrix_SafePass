import Constants from "expo-constants";
import { Platform } from "react-native";

const APP_VARIANTS = {
  FULL: "full",
  VISITOR: "visitor",
};

const normalizeVariant = (value) => {
  const variant = String(value || "").toLowerCase().trim();
  return variant === APP_VARIANTS.VISITOR ? APP_VARIANTS.VISITOR : APP_VARIANTS.FULL;
};

const getExpoExtra = () => {
  if (Constants?.expoConfig?.extra) {
    return Constants.expoConfig.extra;
  }

  if (Constants?.manifest2?.extra?.expoClient?.extra) {
    return Constants.manifest2.extra.expoClient.extra;
  }

  if (Constants?.manifest?.extra) {
    return Constants.manifest.extra;
  }

  return {};
};

const resolveVariant = () => {
  const extra = getExpoExtra();
  const envVariant =
    typeof process !== "undefined"
      ? process.env?.EXPO_PUBLIC_APP_VARIANT
      : "";

  return normalizeVariant(extra.appVariant || envVariant);
};

export const APP_VARIANT = resolveVariant();
export const IS_VISITOR_ONLY_APP = APP_VARIANT === APP_VARIANTS.VISITOR;
export const APP_VARIANT_LABEL = IS_VISITOR_ONLY_APP ? "Visitor" : "Full";
const APP_EXTRA = getExpoExtra();
export const APP_DISPLAY_NAME =
  APP_EXTRA.appDisplayName ||
  (IS_VISITOR_ONLY_APP ? "SafePass Visitor" : "CentrixMobile");
export const APP_ORGANIZATION_NAME =
  APP_EXTRA.appOrganization || "Sapphire International Aviation Academy";

export const normalizeAppRole = (role) => String(role || "").toLowerCase().trim();

export const isRoleAllowedInCurrentVariant = (role) => {
  if (IS_VISITOR_ONLY_APP) {
    return normalizeAppRole(role) === "visitor";
  }

  return Platform.OS === "web" || normalizeAppRole(role) !== "admin";
};

export const getVariantInitialRoute = ({ currentUser, isNewRegistration }) => {
  if (IS_VISITOR_ONLY_APP) {
    if (!currentUser || isNewRegistration) return "Login";
    return normalizeAppRole(currentUser.role) === "visitor"
      ? "VisitorDashboard"
      : "Login";
  }

  if (currentUser) {
    const role = normalizeAppRole(currentUser.role);
    if (!isRoleAllowedInCurrentVariant(role)) return "RoleSelect";
    if (role === "admin") return "AdminDashboard";
    if (role === "staff") return "StaffDashboard";
    if (role === "security" || role === "guard") return "SecurityDashboard";
    if (role === "student" || role === "teacher") return "StudentDashboard";
    if (role === "visitor") return "VisitorDashboard";
    return "RoleSelect";
  }

  return "RoleSelect";
};

export const getVariantBlockedRoleMessage = (role) => {
  if (IS_VISITOR_ONLY_APP) {
    return "This portal is for visitor accounts only. Please use the main SafePass portal for staff, security, or admin access.";
  }

  if (Platform.OS !== "web" && normalizeAppRole(role) === "admin") {
    return "Admin accounts are available on the SafePass website. Please sign in there.";
  }

  return "";
};

export const getVisitorBuildNavigationParams = () => ({
  role: "visitor",
});
