import saveCsv from "./saveCsv";
// utils/printUtils.js
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Image, Platform } from "react-native";
import { getPrintHTML, getPrintTableHTML } from "../styles/PrintStyles";

const toAbsoluteAssetUrl = (uri) => {
  if (!uri) return "";
  if (/^data:/i.test(uri) || /^https?:/i.test(uri)) return uri;
  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      return new URL(uri, window.location.origin).href;
    } catch (error) {
      return uri;
    }
  }
  return uri;
};

const getSchoolLogoSource = () => {
  try {
    const assetModule = require("../assets/LogoSapphire.jpg");

    if (typeof assetModule === "string") {
      return toAbsoluteAssetUrl(assetModule);
    }

    if (assetModule?.uri) {
      return toAbsoluteAssetUrl(assetModule.uri);
    }

    return toAbsoluteAssetUrl(
      Image.resolveAssetSource(assetModule)?.uri || "",
    );
  } catch (error) {
    console.warn("Unable to resolve school logo for print:", error);
    return "";
  }
};

const convertAssetToDataUrl = async (assetUri) => {
  if (!assetUri || Platform.OS !== "web" || typeof fetch === "undefined") {
    return assetUri;
  }

  try {
    const response = await fetch(assetUri);
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || assetUri);
      reader.onerror = () => reject(new Error("Failed to convert logo to data URL."));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Unable to convert print logo to embedded data URL:", error);
    return assetUri;
  }
};

export const printUserList = async (users, title, activeMenu, metadata = {}) => {
  if (!users || users.length === 0) {
    throw new Error("No users to print");
  }

  const schoolLogoSource = await convertAssetToDataUrl(getSchoolLogoSource());
  const htmlContent = getPrintHTML(users, title, activeMenu, schoolLogoSource, metadata);

  try {
    if (Platform.OS === "web") {
      await printUserListWeb(users, title, activeMenu, metadata);
    } else {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      await shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Print Users List",
        UTI: "com.adobe.pdf",
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Print error:", error);
    throw error;
  }
};

export const printRecordsTable = async ({
  title,
  subtitle = "",
  columns = [],
  rows = [],
  totalLabel = "records",
  dialogTitle,
  printedBy = "System",
  generatedAt = new Date(),
}) => {
  if (!rows || rows.length === 0) {
    throw new Error("No records to print");
  }

  const schoolLogoSource = await convertAssetToDataUrl(getSchoolLogoSource());
  const htmlContent = getPrintTableHTML(
    {
      title,
      subtitle,
      columns,
      rows,
      totalLabel,
      printedBy,
      generatedAt,
    },
    schoolLogoSource,
  );

  try {
    if (Platform.OS === "web") {
      if (typeof document === "undefined") {
        throw new Error("Print preview is only available in a browser.");
      }

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");

      document.body.appendChild(iframe);

      const frameDocument =
        iframe.contentWindow?.document || iframe.contentDocument || null;

      if (!frameDocument) {
        document.body.removeChild(iframe);
        throw new Error("Unable to create print preview.");
      }

      frameDocument.open();
      frameDocument.write(htmlContent);
      frameDocument.close();

      const cleanup = () => {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);
      };

      let hasPrinted = false;
      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        cleanup();
      };

      iframe.onload = () => triggerPrint();
      if (frameDocument.readyState === "complete") {
        triggerPrint();
      }
    } else {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: dialogTitle || title || "Print Records",
        UTI: "com.adobe.pdf",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Print table error:", error);
    throw error;
  }
};

// Web-only fallback print function
export const printUserListWeb = async (users, title, activeMenu, metadata = {}) => {
  if (!users || users.length === 0) {
    throw new Error("No users to print");
  }

  if (typeof document === "undefined") {
    throw new Error("Print preview is only available in a browser.");
  }

  const startPrintPreview = async () => {
    const schoolLogoSource = await convertAssetToDataUrl(getSchoolLogoSource());
    const htmlContent = getPrintHTML(users, title, activeMenu, schoolLogoSource, metadata);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const frameDocument =
      iframe.contentWindow?.document || iframe.contentDocument || null;

    if (!frameDocument) {
      document.body.removeChild(iframe);
      throw new Error("Unable to create print preview.");
    }

    frameDocument.open();
    frameDocument.write(htmlContent);
    frameDocument.close();

  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1200);
  };

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    };

    const waitForImagesThenPrint = () => {
      const images = Array.from(frameDocument.images || []);
      const pendingImages = images.filter((image) => !image.complete);

      if (pendingImages.length === 0) {
        triggerPrint();
        return;
      }

      let remaining = pendingImages.length;
      const finish = () => {
        remaining -= 1;
        if (remaining <= 0) {
          triggerPrint();
        }
      };

      pendingImages.forEach((image) => {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });

      setTimeout(() => {
        if (remaining > 0) {
          triggerPrint();
        }
      }, 1500);
    };

    iframe.onload = () => {
      waitForImagesThenPrint();
    };

    if (frameDocument.readyState === "complete") {
      waitForImagesThenPrint();
    }
  };

  return startPrintPreview();
};

export const exportRecordsToCSV = async ({
  headers = [],
  rows = [],
  filename = "safepass_report.csv",
}) => {
  if (!rows || rows.length === 0) {
    throw new Error("No records to export.");
  }

  const escapeCSV = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csvString = [headers, ...rows.map(row => Array.isArray(row) ? row : Object.values(row))]
    .map(row => row.map(escapeCSV).join(",")).join("\r\n");
  await saveCsv(csvString, filename);
  return { success: true };
};

export const printOfficialSecretariatReport = async ({
  title = "Official Campus Access & Secretariat Report",
  subtitle = "Sapphire Aviation Academy - Administrative & Access Log Summary",
  dateRangeLabel = "All Time",
  preparedBy = "Secretariat Office",
  preparedByPosition = "Administrative Assistant / Secretary",
  verifiedBy = "School Administrator",
  verifiedByPosition = "Academy Director / Administrator",
  kpis = {},
  departmentBreakdown = [],
  columns = ["Date & Time", "Name", "Role", "Purpose / Department", "Checkpoint", "Status"],
  records = [],
  dialogTitle = "Official Access Report",
}) => {
  const schoolLogoSource = await convertAssetToDataUrl(getSchoolLogoSource());
  const reportRefNo = `REP-${Date.now().toString(36).toUpperCase()}`;
  const printDate = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const kpiItems = [
    { label: "Total Entries / Logs", value: kpis.totalLogs ?? records.length },
    { label: "Approved Visitors", value: kpis.approvedVisitors ?? 0 },
    { label: "Student Check-ins", value: kpis.studentCount ?? 0 },
    { label: "Staff & Faculty Access", value: kpis.staffCount ?? 0 },
    { label: "Denied / Flagged", value: kpis.deniedCount ?? 0 },
  ];

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 14mm 16mm 14mm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      background: #ffffff;
    }
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #0A3D91;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    .header-text h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #0A3D91;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-text p {
      margin: 2px 0 0 0;
      font-size: 10.5px;
      color: #64748b;
      font-weight: 500;
    }
    .header-right {
      text-align: right;
      font-size: 9.5px;
      color: #475569;
    }
    .header-right .ref-no {
      font-weight: 700;
      color: #0A3D91;
      font-size: 10.5px;
    }
    .report-meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.4px;
    }
    .meta-value {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-card .kpi-num {
      font-size: 16px;
      font-weight: 800;
      color: #0A3D91;
    }
    .kpi-card .kpi-lbl {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin-top: 3px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 16px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .dept-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .dept-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dept-name {
      font-weight: 600;
      color: #334155;
      font-size: 10px;
    }
    .dept-count {
      font-weight: 800;
      color: #0A3D91;
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 24px;
    }
    th {
      background: #0A3D91;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 7px 8px;
      text-align: left;
      border: 1px solid #0A3D91;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      font-size: 9.5px;
      color: #334155;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-granted { background: #dcfce7; color: #166534; }
    .badge-denied { background: #fee2e2; color: #991b1b; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-default { background: #e2e8f0; color: #475569; }
    .signatures-container {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 44%;
      text-align: left;
    }
    .sig-line {
      border-top: 1.5px solid #334155;
      margin-top: 40px;
      padding-top: 5px;
    }
    .sig-name {
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
    }
    .sig-title {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
    }
    .footer-note {
      margin-top: 24px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="header-left">
      ${schoolLogoSource ? `<img src="${schoolLogoSource}" class="header-logo" alt="Logo" />` : ""}
      <div class="header-text">
        <h1>Sapphire Aviation Academy</h1>
        <p>Campus Security & Secretariat Administration • SafePass Portal</p>
      </div>
    </div>
    <div class="header-right">
      <div class="ref-no">Doc Ref: ${reportRefNo}</div>
      <div>Generated: ${printDate} (PHT)</div>
    </div>
  </div>

  <div class="report-meta-box">
    <div class="meta-item">
      <span class="meta-label">Report Document</span>
      <span class="meta-value">${title}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Reporting Period</span>
      <span class="meta-value">${dateRangeLabel}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Prepared By</span>
      <span class="meta-value">${preparedBy} (${preparedByPosition})</span>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiItems
      .map(
        (kpi) => `
      <div class="kpi-card">
        <div class="kpi-num">${kpi.value}</div>
        <div class="kpi-lbl">${kpi.label}</div>
      </div>
    `,
      )
      .join("")}
  </div>

  ${
    departmentBreakdown && departmentBreakdown.length > 0
      ? `
    <div class="section-title">Department / Office Traffic Summary</div>
    <div class="dept-grid">
      ${departmentBreakdown
        .map(
          (dept) => `
        <div class="dept-card">
          <span class="dept-name">${dept.name}</span>
          <span class="dept-count">${dept.count} visits</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `
      : ""
  }

  <div class="section-title">Chronological Log of Entries & Activity (${records.length} total)</div>
  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${col}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${
        records.length > 0
          ? records
              .slice(0, 150)
              .map((rec) => {
                const statusStr = String(rec.status || rec.action || rec.accessType || "recorded").toLowerCase();
                const badgeClass =
                  statusStr.includes("grant") || statusStr.includes("in") || statusStr.includes("approved")
                    ? "badge-granted"
                    : statusStr.includes("denied") || statusStr.includes("alert")
                    ? "badge-denied"
                    : statusStr.includes("pend")
                    ? "badge-pending"
                    : "badge-default";

                return `
            <tr>
              <td>${rec.time || rec.timestamp || "N/A"}</td>
              <td style="font-weight: 700;">${rec.name || rec.fullName || rec.userName || "N/A"}</td>
              <td>${rec.role || rec.userType || "Visitor"}</td>
              <td>${rec.purpose || rec.department || rec.office || "Campus Access"}</td>
              <td>${rec.checkpoint || rec.checkpointName || rec.location || "Main Gate"}</td>
              <td><span class="badge ${badgeClass}">${rec.status || rec.action || "Active"}</span></td>
            </tr>
          `;
              })
              .join("")
          : `<tr><td colspan="${columns.length}" style="text-align: center; color: #94a3b8; padding: 18px;">No records found for the selected filter period.</td></tr>`
      }
    </tbody>
  </table>

  <div class="signatures-container">
    <div class="signature-box">
      <div class="sig-line">
        <div class="sig-name">${preparedBy}</div>
        <div class="sig-title">${preparedByPosition}</div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">Prepared Official Record</div>
      </div>
    </div>
    <div class="signature-box">
      <div class="sig-line">
        <div class="sig-name">${verifiedBy}</div>
        <div class="sig-title">${verifiedByPosition}</div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">Certified & Verified Administrator</div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Official Document • Sapphire Aviation Academy SafePass Integrated Access System • Confidential & Proprietary
  </div>
</body>
</html>
  `;

  try {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        document.body.removeChild(iframe);
        throw new Error("Unable to create report print preview.");
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      const cleanup = () => {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);
      };

      let printed = false;
      const trigger = () => {
        if (printed) return;
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        cleanup();
      };

      iframe.onload = trigger;
      if (frameDoc.readyState === "complete") {
        trigger();
      }
    } else {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: dialogTitle || "Official SafePass Report",
        UTI: "com.adobe.pdf",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Print official report error:", error);
    throw error;
  }
};
