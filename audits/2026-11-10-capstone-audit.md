# Centrix audit — 10 November 2026

## Scope and limits

Repository: Centrix. Main shared web/native application: SafePass-Mobile (Expo/React Native Web), Express API in SafePass-Mobile/backend. SafePass-Web contains an attendance component, not a standalone package.

Browser access failed with “The browser access host is unavailable”. Consequently no current desktop/mobile viewport, button clicking, keyboard navigation, browser console, or browser network trace was verified. HTTP success only establishes delivery, not working rendering. The referenced prior conversation could not be retrieved because no read_thread tool was available. Existing WEB-AUDIT.md is historical evidence and was not treated as a current live finding.

No production login, registration, OTP, appointment, approval, NFC tap, or record mutation was performed. No application source fixes were made.

## Findings

These are current-source findings affecting the shared attendance screen; their presence in the deployed bundle has not been established. Reproduction steps requiring accounts/data should run in a disposable local test environment.

### A1 — High: attendance exports silently stop at 120 records

Location: SafePass-Mobile/screens/AttendanceRecordsScreen.jsx:153–205; backend/server.js:9498–9550.

Steps: provide at least 121 matching attendance records, open Attendance & Access Records, select the matching range, export CSV or print.

Expected: all matching records are available through pagination and a complete export, or a conspicuous partial-export warning.

Actual in source: client requests only limit=120, ignores the API pagination object, and exports/prints the records state. Feed displays records.length without total. There is no pagination control. Older matching records are inaccessible here and omitted from reports.

Verification: inspected both client and server pagination implementations; no production records created.

### A2 — Medium: date shortcuts select the wrong Philippine dates

Location: screens/AttendanceRecordsScreen.jsx:97–129.

Steps: in Asia/Manila at 01:00 on November 10, choose Today and Yesterday. Also choose This Month during November.

Expected: Today=November 10; Yesterday=November 9; month starts November 1.

Actual: extracted real functions executed with a controlled clock returned Today=November 9, Yesterday=November 8, This Month start=October 31. toISOString() converts local dates to UTC. Today/Yesterday are affected before 08:00; the month start is affected throughout the month.

### A3 — Medium: failed loads look like empty data or leave stale data

Location: screens/AttendanceRecordsScreen.jsx:153–183; utils/ApiService.js:1563–1579.

Steps: locally make either attendance endpoint fail, then open the screen or press Refresh.

Expected: visible error, retry, and a clear indication that existing data is stale.

Actual in source: API errors are rethrown. Initial effect and refresh only use try/finally, with no catch or error state. Initial failure clears the spinner and leaves the default empty feed; refresh failure retains prior records. The asynchronous rejection is unhandled by these callers. Promise.all also discards a successful feed response if the summary fails.

### A4 — Medium: summary ignores active search and status filters

Location: backend/server.js:9562 onward, compared with list endpoint at 9498 onward.

Steps: have records with multiple statuses and names; select Late or search for one person.

Expected: summary cards reflect the same filtered set as the feed, or explicitly say they cover a broader set.

Actual in source: client sends the same query to both endpoints, but summary applies only date range and userType. List applies search and status too. Cards can remain unchanged while the feed changes or becomes empty.

### A5 — Medium: older requests can overwrite newer filter results

Location: screens/AttendanceRecordsScreen.jsx:153–174, 311–330.

Steps: locally delay the response for search A, then type search B; resolve B first and A last.

Expected: B remains displayed with its matching summary.

Actual in source: every keystroke starts another pair of requests; there is no cancellation, request sequence check, or effect cleanup. A can call setRecords/setSummary after B and overwrite results while the input still shows B. Requires a controlled delayed-response reproduction to verify rendered behavior.

### A6 — Medium: date filters accept invalid values without feedback

Location: screens/AttendanceRecordsScreen.jsx:311–324; backend/server.js:677–699.

Steps: type a non-date such as abc into Start date, or enter a start later than the end.

Expected: field error and no misleading report.

Actual in source: text is immediately sent as a filter without client validation. Backend builds bounds only when date parsing succeeds and does not reject reversed ranges here. Invalid input may silently omit a bound; reversed bounds produce an empty range rather than a validation message.

## Checks completed

- Client regression suite: 34 passed, 0 failed.
- Backend suites: 37 passed, 0 failed. Integration tests mock database access; these are not real database end-to-end tests.
- Web build: compiled successfully with EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5055/api and EXPO_PUBLIC_E2E_LOCAL_ONLY=true.
- Started and fetched local static preview at localhost:19006. No SafePass backend was running; OS Control Center was using port 5000. Build uses port 5055 to avoid that conflict.
- Production root HTTP HEAD returned 200 with HTTPS/security headers. Additional HTTP results are reported in the accompanying chat.

## Remaining browser/device coverage

Public: homepage, login, registration, help, legal dialogs, password recovery, empty/malformed form validation, navigation/back/forward/reload, Google redirect.

Authenticated: admin, staff, security/guard, student/teacher, and visitor dashboards; attendance and access logs; reports/CSV/printing; settings/profile; notifications; appointment creation/reschedule/cancel/approval; visitor passes; NFC and maps.

Test web at 1440×900, 1366×768, 390×844, and 360×800, plus keyboard and zoom. Mobile-width web checks do not establish Android functionality. Camera/location permission handling, biometric login, native sharing/printing, push delivery, and physical NFC require a device/emulator and, where applicable, hardware.

Localhost on the user's computer requires access to their running application or repository. Repository access is available in this session and a static preview was built, but a connected browser and isolated backend/database are still needed for complete interactive local coverage. Do not start the backend against unknown environment/database configuration or seed production.

HTTP follow-up: production /, /login, /visitor-register, /help, /manifest.json, both initial script bundles, and deployed /api/health all returned 200. Local / and /login returned 200. The four page paths return the same SPA shell; these responses do not verify the corresponding screen. Local preview was stopped after checking and tracked build artifacts were restored.
