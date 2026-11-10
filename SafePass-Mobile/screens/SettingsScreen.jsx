import Alert from "../utils/Alert";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "../utils/ApiService";
import { BRAND } from "../components/mobile/MobileRoleComponents";

const settingsRows = [
  {
    key: "visitorNotifications",
    title: "Visitor notifications",
    subtitle: "Show alerts for new requests and appointment updates.",
    icon: "notifications-outline",
  },
  {
    key: "approvalReminders",
    title: "Approval reminders",
    subtitle: "Highlight pending requests that still need staff action.",
    icon: "alarm-outline",
  },
  {
    key: "compactCards",
    title: "Compact cards",
    subtitle: "Use tighter spacing when reviewing long appointment lists.",
    icon: "albums-outline",
  },
];

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [settings, setSettings] = useState({
    visitorNotifications: true,
    approvalReminders: true,
    compactCards: false,
    darkModeEnabled: false,
  });
  const [systemStatus, setSystemStatus] = useState("Syncing");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedDarkMode, savedStaffSettings, healthResponse] = await Promise.allSettled([
          AsyncStorage.getItem("darkModeEnabled"),
          AsyncStorage.getItem("staffSettings"),
          ApiService.getSystemHealth(),
        ]);

        if (savedStaffSettings.status === "fulfilled" && savedStaffSettings.value) {
          setSettings((current) => ({ ...current, ...JSON.parse(savedStaffSettings.value) }));
        }

        if (savedDarkMode.status === "fulfilled") {
          setSettings((current) => ({ ...current, darkModeEnabled: savedDarkMode.value === "true" }));
        }

        setSystemStatus(healthResponse.status === "fulfilled" ? "Online" : "Limited");
      } catch (error) {
        setSystemStatus("Limited");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const enabledCount = useMemo(
    () => settingsRows.filter((row) => settings[row.key]).length,
    [settings],
  );

  const updateSetting = async (key, value) => {
    setSavingKey(key);
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);

    try {
      if (key === "darkModeEnabled") {
        await AsyncStorage.setItem("darkModeEnabled", value ? "true" : "false");
      }
      await AsyncStorage.setItem("staffSettings", JSON.stringify(nextSettings));
    } catch (error) {
      setSettings(settings);
      Alert.alert("Settings not saved", error?.message || "Unable to save preferences. Please retry.");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <View style={screenStyles.header}>
        <TouchableOpacity style={screenStyles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={BRAND.blue} />
        </TouchableOpacity>
        <View style={screenStyles.headerCopy}>
          <Text style={screenStyles.eyebrow}>SafePass</Text>
          <Text style={screenStyles.title}>System Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
        <View style={screenStyles.hero}>
          <View style={screenStyles.heroIcon}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={screenStyles.heroCopy}>
            <Text style={screenStyles.heroTitle}>Staff preferences</Text>
            <Text style={screenStyles.heroText}>
              Tune alerts, display density, and mobile appearance for daily appointment handling.
            </Text>
          </View>
        </View>

        <View style={screenStyles.statusGrid}>
          <View style={screenStyles.statusCard}>
            <Text style={screenStyles.statusValue}>{systemStatus}</Text>
            <Text style={screenStyles.statusLabel}>System health</Text>
          </View>
          <View style={screenStyles.statusCard}>
            <Text style={screenStyles.statusValue}>{enabledCount}/3</Text>
            <Text style={screenStyles.statusLabel}>Staff tools on</Text>
          </View>
        </View>

        {loading ? (
          <View style={screenStyles.loadingCard}>
            <ActivityIndicator color={BRAND.blue} />
            <Text style={screenStyles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <>
            <View style={screenStyles.section}>
              <Text style={screenStyles.sectionTitle}>Staff Workflow</Text>
              {settingsRows.map((row) => (
                <View key={row.key} style={screenStyles.settingRow}>
                  <View style={screenStyles.settingIcon}>
                    <Ionicons name={row.icon} size={19} color={BRAND.blue} />
                  </View>
                  <View style={screenStyles.settingCopy}>
                    <Text style={screenStyles.settingTitle}>{row.title}</Text>
                    <Text style={screenStyles.settingSubtitle}>{row.subtitle}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings[row.key])}
                    onValueChange={(value) => updateSetting(row.key, value)}
                    disabled={Boolean(savingKey)}
                    trackColor={{ false: "#CBD5E1", true: "#BBD7FF" }}
                    thumbColor={settings[row.key] ? BRAND.blue : "#F8FAFC"}
                  />
                </View>
              ))}
            </View>

            <View style={screenStyles.section}>
              <Text style={screenStyles.sectionTitle}>Appearance</Text>
              <View style={screenStyles.settingRow}>
                <View style={screenStyles.settingIcon}>
                  <Ionicons name="moon-outline" size={19} color={BRAND.blue} />
                </View>
                <View style={screenStyles.settingCopy}>
                  <Text style={screenStyles.settingTitle}>Mobile dark mode</Text>
                  <Text style={screenStyles.settingSubtitle}>
                    Applies to the staff mobile dashboard on the next visit.
                  </Text>
                </View>
                <Switch
                  value={settings.darkModeEnabled}
                  onValueChange={(value) => updateSetting("darkModeEnabled", value)}
                  disabled={Boolean(savingKey)}
                  trackColor={{ false: "#CBD5E1", true: "#BBD7FF" }}
                  thumbColor={settings.darkModeEnabled ? BRAND.blue : "#F8FAFC"}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND.page,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5FF",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: BRAND.muted,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 2,
    fontSize: 23,
    fontWeight: "900",
    color: BRAND.ink,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  hero: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#123B6D",
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: "#DBEAFE",
  },
  statusGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  statusCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "900",
    color: BRAND.ink,
  },
  statusLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "900",
    color: BRAND.muted,
    textTransform: "uppercase",
  },
  section: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "900",
    color: BRAND.ink,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5FF",
  },
  settingCopy: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: BRAND.ink,
  },
  settingSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: BRAND.muted,
  },
  loadingCard: {
    marginTop: 14,
    minHeight: 140,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: BRAND.muted,
  },
});
