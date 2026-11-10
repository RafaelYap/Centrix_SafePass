import Alert from "../utils/Alert";
import { exportRecordsToCSV } from "../utils/printUtils";
import { fetchPaginatedRecords } from "../utils/paginatedRecords";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ApiService from "../utils/ApiService";
import { BRAND, MobileEmptyState, MobileSearchField } from "../components/mobile/MobileRoleComponents";

const formatLogTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No timestamp";

const getLogMeta = (log = {}) => {
  const type = String(log.type || log.eventType || log.action || log.status || "").toLowerCase();
  if (type.includes("denied") || type.includes("alert") || type.includes("failed")) {
    return { icon: "alert-circle-outline", color: BRAND.danger, label: "Attention" };
  }
  if (type.includes("checkout") || type.includes("out")) {
    return { icon: "exit-outline", color: "#475569", label: "Check-out" };
  }
  if (type.includes("checkin") || type.includes("in") || type.includes("granted")) {
    return { icon: "shield-checkmark-outline", color: BRAND.success, label: "Access" };
  }
  return { icon: "information-circle-outline", color: BRAND.blue, label: "Activity" };
};

const getLogTitle = (log = {}) =>
  log.title ||
  log.visitorName ||
  log.fullName ||
  log.userName ||
  log.user?.fullName ||
  log.visitor?.fullName ||
  "Security activity";

const getLogDescription = (log = {}) =>
  log.description ||
  log.notes ||
  log.message ||
  log.location ||
  log.office ||
  log.checkpointName ||
  "Campus access event recorded.";

export default function SecurityLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedSecurityLog, setSelectedSecurityLog] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoadError("");
    try {
      const records = await fetchPaginatedRecords(page => ApiService.getAccessLogs(page, 500, { all: true }), "accessLogs");
      setLogs(records);
    } catch (error) {
      setLoadError(error?.message || "Unable to load security logs.");
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      [
        getLogTitle(log),
        getLogDescription(log),
        log.type,
        log.eventType,
        log.action,
        log.status,
        log.checkpointId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [logs, searchTerm]);

  const attentionCount = useMemo(
    () => logs.filter((log) => getLogMeta(log).label === "Attention").length,
    [logs],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs();
  }, [loadLogs]);

  const exportSecurityLogsCsv = async () => {
    if (!filteredLogs.length) return;
    try {
      await exportRecordsToCSV({
        headers: ["Title", "Description", "Type", "Time"],
        rows: filteredLogs.map(log => [getLogTitle(log), getLogDescription(log), getLogMeta(log).label,
          formatLogTime(log.createdAt || log.timestamp || log.time || log.updatedAt)]),
        filename: "SafePass_logs.csv",
      });
    } catch (error) {
      Alert.alert("Export failed", error?.message || "Unable to export logs.");
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
          <Text style={screenStyles.title}>Security Logs</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={screenStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.blue} />}
      >
        <View style={screenStyles.hero}>
          <View style={screenStyles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={screenStyles.heroCopy}>
            <Text style={screenStyles.heroTitle}>Campus access trail</Text>
            <Text style={screenStyles.heroText}>
              Review recent access activity, checkpoint events, and entries that may need follow-up.
            </Text>
          </View>
        </View>

        <View style={screenStyles.statusGrid}>
          <View style={screenStyles.statusCard}>
            <Text style={screenStyles.statusValue}>{logs.length}</Text>
            <Text style={screenStyles.statusLabel}>Recent logs</Text>
          </View>
          <View style={screenStyles.statusCard}>
            <Text style={[screenStyles.statusValue, attentionCount > 0 && screenStyles.warningValue]}>
              {attentionCount}
            </Text>
            <Text style={screenStyles.statusLabel}>Need review</Text>
          </View>
        </View>

        {/* Action Toolbar */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: "#EEF5FF",
              borderWidth: 1,
              borderColor: "#BFDBFE",
              paddingVertical: 10,
              borderRadius: 12,
            }}
            onPress={exportSecurityLogsCsv}
          >
            <Ionicons name="download-outline" size={16} color={BRAND.blue} />
            <Text style={{ fontSize: 13, fontWeight: "800", color: BRAND.blue }}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              paddingVertical: 10,
              borderRadius: 12,
            }}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh-outline" size={16} color="#475569" />
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#475569" }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={screenStyles.toolbar}>
          <MobileSearchField
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search visitor, checkpoint, event..."
          />
        </View>

        {loading ? (
          <View style={screenStyles.loadingCard}>
            <ActivityIndicator color={BRAND.blue} />
            <Text style={screenStyles.loadingText}>Loading security logs...</Text>
          </View>
        ) : loadError ? (
          <MobileEmptyState
            icon="cloud-offline-outline"
            title="Security logs unavailable"
            message={loadError}
            actionLabel="Try again"
            onAction={loadLogs}
          />
        ) : filteredLogs.length ? (
          filteredLogs.map((log, index) => {
            const meta = getLogMeta(log);
            return (
              <TouchableOpacity
                key={log._id || log.id || `${meta.label}-${index}`}
                style={screenStyles.logCard}
                onPress={() => setSelectedSecurityLog(log)}
                activeOpacity={0.8}
              >
                <View style={[screenStyles.logIcon, { backgroundColor: `${meta.color}16` }]}>
                  <Ionicons name={meta.icon} size={19} color={meta.color} />
                </View>
                <View style={screenStyles.logCopy}>
                  <View style={screenStyles.logTopRow}>
                    <Text style={screenStyles.logTitle} numberOfLines={1}>
                      {getLogTitle(log)}
                    </Text>
                    <Text style={[screenStyles.logType, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={screenStyles.logDescription} numberOfLines={2}>
                    {getLogDescription(log)}
                  </Text>
                  <Text style={screenStyles.logTime}>
                    {formatLogTime(log.createdAt || log.timestamp || log.time || log.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <MobileEmptyState
            icon="shield-checkmark-outline"
            title={searchTerm ? "No matching logs" : "No security logs yet"}
            message={searchTerm ? "Try a different visitor, event, or checkpoint." : "Recent access activity will appear here automatically."}
            actionLabel={searchTerm ? "Clear search" : undefined}
            onAction={searchTerm ? () => setSearchTerm("") : undefined}
          />
        )}
      </ScrollView>

      {/* Security Log Detail Modal */}
      <Modal
        visible={Boolean(selectedSecurityLog)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSecurityLog(null)}
      >
        <View style={secModalStyles.modalBackdrop}>
          <View style={secModalStyles.modalCard}>
            <View style={secModalStyles.modalHeader}>
              <View style={secModalStyles.modalTitleRow}>
                <Ionicons
                  name={getLogMeta(selectedSecurityLog || {}).icon}
                  size={22}
                  color={getLogMeta(selectedSecurityLog || {}).color}
                />
                <Text style={secModalStyles.modalTitle}>Security Event Detail</Text>
              </View>
              <TouchableOpacity
                style={secModalStyles.modalCloseBtn}
                onPress={() => setSelectedSecurityLog(null)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={secModalStyles.modalBody}>
              <View style={secModalStyles.modalHero}>
                <Text style={secModalStyles.modalTitleText}>
                  {getLogTitle(selectedSecurityLog || {})}
                </Text>
                <Text style={secModalStyles.modalTimestamp}>
                  {formatLogTime(
                    selectedSecurityLog?.createdAt ||
                    selectedSecurityLog?.timestamp ||
                    selectedSecurityLog?.time ||
                    selectedSecurityLog?.updatedAt
                  )}
                </Text>
              </View>

              <View style={secModalStyles.modalGrid}>
                <View style={secModalStyles.modalGridItem}>
                  <Text style={secModalStyles.modalLabel}>Category</Text>
                  <Text
                    style={[
                      secModalStyles.modalValue,
                      { color: getLogMeta(selectedSecurityLog || {}).color },
                    ]}
                  >
                    {getLogMeta(selectedSecurityLog || {}).label}
                  </Text>
                </View>
                <View style={secModalStyles.modalGridItem}>
                  <Text style={secModalStyles.modalLabel}>Description / Notes</Text>
                  <Text style={secModalStyles.modalValue}>
                    {getLogDescription(selectedSecurityLog || {})}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={secModalStyles.modalDoneBtn}
                onPress={() => setSelectedSecurityLog(null)}
              >
                <Text style={secModalStyles.modalDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  warningValue: {
    color: BRAND.danger,
  },
  statusLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "900",
    color: BRAND.muted,
    textTransform: "uppercase",
  },
  toolbar: {
    marginTop: 14,
    marginBottom: 10,
  },
  loadingCard: {
    minHeight: 150,
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
  logCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
    marginBottom: 10,
  },
  logIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logCopy: {
    flex: 1,
    minWidth: 0,
  },
  logTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    color: BRAND.ink,
  },
  logType: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  logDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: BRAND.muted,
  },
  logTime: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
  },
});

const secModalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  modalBody: {
    padding: 18,
  },
  modalHero: {
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalTimestamp: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 4,
  },
  modalGrid: {
    gap: 10,
    marginBottom: 18,
  },
  modalGridItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  modalValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalDoneBtn: {
    backgroundColor: "#0A3D91",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalDoneBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});

