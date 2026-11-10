import Alert from "../utils/Alert";
import { exportRecordsToCSV } from "../utils/printUtils";
import { fetchPaginatedRecords } from "../utils/paginatedRecords";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ApiService from "../utils/ApiService";
import accessLogStyles from "../styles/AccessLogStyles";

const SCHOOL_LOGO = require("../assets/LogoSapphire.jpg");

export default function AccessLogScreen({ navigation }) {
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  const [accessLogs, setAccessLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);


  useEffect(() => {
    loadUserAndLogs();
  }, []);

  const loadUserAndLogs = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const currentUser = await ApiService.getCurrentUser();
      if (!currentUser) {
        navigation.replace("Login");
        return;
      }

      setUser(currentUser);
      
      const records = await fetchPaginatedRecords(page => ApiService.getAccessLogs(page, 500), "accessLogs");
      setAccessLogs(records);
    } catch (error) {
      setAccessLogs([]);
      setLoadError(error?.message || "Unable to load access history.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserAndLogs();
  };

  const exportAccessLogsCsv = async () => {
    if (!filteredLogs.length) return;
    try {
      await exportRecordsToCSV({
        headers: ["Timestamp", "Location", "Access Type", "Status", "Reader Device", "Notes"],
        rows: filteredLogs.map(log => [
          log.timestamp && !Number.isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toISOString() : "",
          log.location || "", log.accessType || "", log.status || "", log.readerDevice || log.device || "", log.notes || "",
        ]),
        filename: "SafePass_accessLogs.csv",
      });
    } catch (error) {
      Alert.alert("Export failed", error?.message || "Unable to export logs.");
    }
  };

  // Filter options
  const filterOptions = [
    { id: "all", label: "All", icon: "apps-outline", color: "#0A3D91" },
    { id: "granted", label: "Granted", icon: "checkmark-circle-outline", color: "#10B981" },
    { id: "denied", label: "Denied", icon: "close-circle-outline", color: "#EF4444" },
  ];

  const accessTypeOptions = [
    { id: "all", label: "All Types", icon: "swap-horizontal-outline" },
    { id: "entry", label: "Entry", icon: "log-in-outline" },
    { id: "exit", label: "Exit", icon: "log-out-outline" },
  ];

  // Date filter options
  const dateOptions = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "Last 7 Days" },
    { id: "month", label: "This Month" },
  ];

  const filteredLogs = accessLogs.filter(log => {
    // Status/type filter
    if (["granted", "denied"].includes(filter) && log.status !== filter) return false;
    if (filter === "entry" && log.accessType !== "entry") return false;
    if (filter === "exit" && log.accessType !== "exit") return false;
    
    // Date filter
    if (selectedDate !== "all") {
      const logDate = new Date(log.timestamp);
      if (Number.isNaN(logDate.getTime())) return false;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setHours(0, 0, 0, 0);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);

      switch (selectedDate) {
        case "today":
          if (logDate.toDateString() !== today.toDateString()) return false;
          break;
        case "yesterday":
          if (logDate.toDateString() !== yesterday.toDateString()) return false;
          break;
        case "week":
          if (logDate < weekAgo) return false;
          break;
        case "month":
          if (logDate < monthAgo) return false;
          break;
      }
    }
    return true;
  });

  const getStatusIcon = (status) => {
    return status === "granted" ? "checkmark-circle" : "close-circle";
  };

  const getStatusColor = (status) => {
    return status === "granted" ? "#10B981" : "#EF4444";
  };

  const getStatusBgColor = (status) => {
    return status === "granted" ? "#E3F2E9" : "#FEE2E2";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStats = () => {
    const granted = accessLogs.filter(log => log.status === "granted").length;
    const denied = accessLogs.filter(log => log.status === "denied").length;
    const total = accessLogs.length;
    const successRate = total > 0 ? Math.round((granted / total) * 100) : 0;
    
    return { granted, denied, total, successRate };
  };

  if (isLoading && !user) {
    return (
      <SafeAreaView style={accessLogStyles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0A3D91" />
        <Image source={SCHOOL_LOGO} resizeMode="contain" style={{ width: 116, height: 58, marginBottom: 18 }} />
        <ActivityIndicator size="large" color="#0A3D91" />
        <Text style={accessLogStyles.loadingText}>Loading access history...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const stats = getStats();

  return (
    <SafeAreaView style={accessLogStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A3D91" />
      
      {Boolean(loadError) && <Text accessibilityRole="alert" style={{ color: "#B91C1C", padding: 16 }}>{loadError}</Text>}
      {/* Header */}
      <View style={accessLogStyles.header}>
        <TouchableOpacity 
          style={accessLogStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={accessLogStyles.headerContent}>
          <Text style={accessLogStyles.headerTitle}>Access History</Text>
          <Text style={accessLogStyles.headerSubtitle}>
            {user.firstName}'s NFC access records
          </Text>
        </View>
        
        <TouchableOpacity style={accessLogStyles.filterButton}>
          <Ionicons name="download-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={accessLogStyles.statsContainer}>
        <View style={accessLogStyles.statsGrid}>
          <View style={accessLogStyles.statItem}>
            <View style={[accessLogStyles.statIcon, { backgroundColor: "#E3F2E9" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={accessLogStyles.statValue}>{stats.granted}</Text>
            <Text style={accessLogStyles.statLabel}>Granted</Text>
          </View>
          
          <View style={accessLogStyles.statDivider} />
          
          <View style={accessLogStyles.statItem}>
            <View style={[accessLogStyles.statIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </View>
            <Text style={accessLogStyles.statValue}>{stats.denied}</Text>
            <Text style={accessLogStyles.statLabel}>Denied</Text>
          </View>
          
          <View style={accessLogStyles.statDivider} />
          
          <View style={accessLogStyles.statItem}>
            <View style={[accessLogStyles.statIcon, { backgroundColor: "#E6F0FF" }]}>
              <Ionicons name="swap-horizontal" size={20} color="#0A3D91" />
            </View>
            <Text style={accessLogStyles.statValue}>{stats.total}</Text>
            <Text style={accessLogStyles.statLabel}>Total</Text>
          </View>
          
          <View style={accessLogStyles.statDivider} />
          
          <View style={accessLogStyles.statItem}>
            <View style={[accessLogStyles.statIcon, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="trending-up" size={20} color="#1C6DD0" />
            </View>
            <Text style={accessLogStyles.statValue}>{stats.successRate}%</Text>
            <Text style={accessLogStyles.statLabel}>Success</Text>
          </View>
        </View>

        {/* Action Bar */}
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
            onPress={exportAccessLogsCsv}
          >
            <Ionicons name="download-outline" size={16} color="#0A3D91" />
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#0A3D91" }}>Export CSV</Text>
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
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#475569" }}>Refresh Logs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Section */}
      <View style={accessLogStyles.filtersSection}>
        {/* Status Filters */}
        <View style={accessLogStyles.filterGroup}>
          <Text style={accessLogStyles.filterLabel}>Status</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={accessLogStyles.filterScroll}
          >
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  accessLogStyles.filterChip,
                  filter === option.id && accessLogStyles.filterChipActive
                ]}
                onPress={() => setFilter(option.id)}
              >
                <Ionicons 
                  name={option.icon} 
                  size={16} 
                  color={filter === option.id ? "#FFFFFF" : option.color} 
                  style={accessLogStyles.filterChipIcon}
                />
                <Text style={[
                  accessLogStyles.filterChipText,
                  filter === option.id && accessLogStyles.filterChipTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Access Type Filters */}
        <View style={accessLogStyles.filterGroup}>
          <Text style={accessLogStyles.filterLabel}>Access Type</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={accessLogStyles.filterScroll}
          >
            {accessTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  accessLogStyles.filterChip,
                  filter === option.id && accessLogStyles.filterChipActive
                ]}
                onPress={() => setFilter(option.id)}
              >
                <Ionicons 
                  name={option.icon} 
                  size={16} 
                  color={filter === option.id ? "#FFFFFF" : "#6B7280"} 
                  style={accessLogStyles.filterChipIcon}
                />
                <Text style={[
                  accessLogStyles.filterChipText,
                  filter === option.id && accessLogStyles.filterChipTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date Filters */}
        <View style={accessLogStyles.filterGroup}>
          <Text style={accessLogStyles.filterLabel}>Date Range</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={accessLogStyles.filterScroll}
          >
            {dateOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  accessLogStyles.filterChip,
                  selectedDate === option.id && accessLogStyles.filterChipActive
                ]}
                onPress={() => setSelectedDate(option.id)}
              >
                <Text style={[
                  accessLogStyles.filterChipText,
                  selectedDate === option.id && accessLogStyles.filterChipTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Access Logs List */}
      <ScrollView 
        style={accessLogStyles.logsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#0A3D91"]}
            tintColor="#0A3D91"
          />
        }
      >
        {filteredLogs.length > 0 ? (
          <>
            {/* Group logs by date */}
            {Object.entries(
              filteredLogs.reduce((groups, log) => {
                const date = new Date(log.timestamp).toDateString();
                if (!groups[date]) groups[date] = [];
                groups[date].push(log);
                return groups;
              }, {})
            ).map(([date, logs]) => (
              <View key={date} style={accessLogStyles.dateGroup}>
                <View style={accessLogStyles.dateHeader}>
                  <View style={accessLogStyles.dateBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#0A3D91" />
                    <Text style={accessLogStyles.dateText}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  <Text style={accessLogStyles.logCount}>{logs.length} entries</Text>
                </View>

                {logs.map((log) => (
                  <TouchableOpacity
                    key={log._id || log.id}
                    style={accessLogStyles.logCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedLogDetail(log);
                    }}
                  >
                    <View style={accessLogStyles.logIconContainer}>
                      <View style={[
                        accessLogStyles.logIcon,
                        { backgroundColor: getStatusBgColor(log.status) }
                      ]}>
                        <Ionicons 
                          name={getStatusIcon(log.status)} 
                          size={24} 
                          color={getStatusColor(log.status)} 
                        />
                      </View>
                    </View>

                    <View style={accessLogStyles.logContent}>
                      <View style={accessLogStyles.logHeader}>
                        <Text style={accessLogStyles.logLocation}>
                          {log.location || "Unknown Location"}
                        </Text>
                        <View style={[
                          accessLogStyles.logTypeBadge,
                          { backgroundColor: log.accessType === "entry" ? "#E6F0FF" : "#F3F4F6" }
                        ]}>
                          <Ionicons 
                            name={log.accessType === "entry" ? "log-in" : "log-out"} 
                            size={12} 
                            color={log.accessType === "entry" ? "#0A3D91" : "#6B7280"} 
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[
                            accessLogStyles.logTypeText,
                            { color: log.accessType === "entry" ? "#0A3D91" : "#6B7280" }
                          ]}>
                            {log.accessType === "entry" ? "Entry" : "Exit"}
                          </Text>
                        </View>
                      </View>

                      <View style={accessLogStyles.logDetails}>
                        <View style={accessLogStyles.logTime}>
                          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                          <Text style={accessLogStyles.logTimeText}>
                            {formatFullDate(log.timestamp)}
                          </Text>
                        </View>

                        {log.nfcCardId && (
                          <View style={accessLogStyles.logCardId}>
                            <Ionicons name="card-outline" size={14} color="#9CA3AF" />
                            <Text style={accessLogStyles.logCardIdText}>
                              {log.nfcCardId}
                            </Text>
                          </View>
                        )}
                      </View>

                      {log.notes && (
                        <Text style={accessLogStyles.logNotes}>{log.notes}</Text>
                      )}
                    </View>

                    <View style={accessLogStyles.logStatus}>
                      <View style={[
                        accessLogStyles.statusBadge,
                        { backgroundColor: getStatusBgColor(log.status) }
                      ]}>
                        <Text style={[
                          accessLogStyles.statusBadgeText,
                          { color: getStatusColor(log.status) }
                        ]}>
                          {log.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Pagination Info */}
            <View style={accessLogStyles.paginationInfo}>
              <Text style={accessLogStyles.paginationText}>
                Showing {filteredLogs.length} of {accessLogs.length} records
              </Text>
              

            </View>
          </>
        ) : (
          <View style={accessLogStyles.emptyState}>
            <View style={accessLogStyles.emptyStateIconContainer}>
              <Ionicons name="time-outline" size={64} color="#E5E7EB" />
            </View>
            <Text style={accessLogStyles.emptyStateTitle}>
              No access records found
            </Text>
            <Text style={accessLogStyles.emptyStateText}>
              {filter !== "all" || selectedDate !== "all"
                ? `No ${filter === "all" ? "" : filter} access records found for this period.`
                : "Your NFC access history will appear here after using your card."}
            </Text>
            
            {(filter !== "all" || selectedDate !== "all") && (
              <TouchableOpacity
                style={accessLogStyles.clearFiltersButton}
                onPress={() => {
                  setFilter("all");
                  setSelectedDate("all");
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#0A3D91" />
                <Text style={accessLogStyles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Access Log Inspection Modal */}
      <Modal
        visible={Boolean(selectedLogDetail)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLogDetail(null)}
      >
        <View style={localModalStyles.modalBackdrop}>
          <View style={localModalStyles.modalCard}>
            <View style={localModalStyles.modalHeader}>
              <View style={localModalStyles.modalTitleRow}>
                <Ionicons
                  name={selectedLogDetail?.status === "granted" ? "checkmark-circle" : "close-circle"}
                  size={22}
                  color={selectedLogDetail?.status === "granted" ? "#10B981" : "#EF4444"}
                />
                <Text style={localModalStyles.modalTitle}>Access Event Details</Text>
              </View>
              <TouchableOpacity
                style={localModalStyles.modalCloseBtn}
                onPress={() => setSelectedLogDetail(null)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={localModalStyles.modalBody}>
              <View style={localModalStyles.modalHero}>
                <Text style={localModalStyles.modalLocation}>
                  {selectedLogDetail?.location || "Campus Main Checkpoint"}
                </Text>
                <Text style={localModalStyles.modalTimestamp}>
                  {formatFullDate(selectedLogDetail?.timestamp)}
                </Text>
              </View>

              <View style={localModalStyles.modalGrid}>
                <View style={localModalStyles.modalGridItem}>
                  <Text style={localModalStyles.modalLabel}>Direction</Text>
                  <Text style={localModalStyles.modalValue}>
                    {selectedLogDetail?.accessType?.toUpperCase() || "CHECKPOINT"}
                  </Text>
                </View>
                <View style={localModalStyles.modalGridItem}>
                  <Text style={localModalStyles.modalLabel}>Decision</Text>
                  <Text
                    style={[
                      localModalStyles.modalValue,
                      { color: selectedLogDetail?.status === "granted" ? "#166534" : "#DC2626" },
                    ]}
                  >
                    {selectedLogDetail?.status?.toUpperCase() || "UNKNOWN"}
                  </Text>
                </View>
                {selectedLogDetail?.nfcCardId ? (
                  <View style={localModalStyles.modalGridItem}>
                    <Text style={localModalStyles.modalLabel}>Card UID</Text>
                    <Text style={localModalStyles.modalValue}>{selectedLogDetail.nfcCardId}</Text>
                  </View>
                ) : null}
                {selectedLogDetail?.notes ? (
                  <View style={localModalStyles.modalGridItem}>
                    <Text style={localModalStyles.modalLabel}>Operator Note</Text>
                    <Text style={localModalStyles.modalValue}>{selectedLogDetail.notes}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={localModalStyles.modalDoneBtn}
                onPress={() => setSelectedLogDetail(null)}
              >
                <Text style={localModalStyles.modalDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localModalStyles = StyleSheet.create({
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
  modalLocation: {
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
