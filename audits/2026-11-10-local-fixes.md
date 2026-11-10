# Centrix local fixes and screen coverage — November 10, 2026

## Result

Implemented and regression-tested local fixes. No production data changed; no deployment performed. These fixes require a frontend rebuild and, for API changes, backend deployment to affect the live site.

The review covers source structure, API-method references, navigation registration, targeted handler execution with fixtures, regression suites, and web compilation. It does **not** establish that every button/form works visually on desktop or phone. Browser access remains unavailable; native Android, real authentication, external delivery, and hardware checks remain pending.

## Fixes

| Area | Before | After |
| --- | --- | --- |
| Attendance screen | UTC shortcuts returned previous Manila dates; 120-record cap; uncaught failed loads; stale requests overwrote filters; invalid dates submitted | Calendar-date shortcuts; validated dates and ranges; complete paginated loading; completeness checks; visible errors/retry; stale responses discarded; edits debounced; exports disabled while unavailable |
| Attendance API | Summary ignored search/status; invalid ranges silently ignored | Shared literal-search/status/module/location filters for summary and feed; malformed/reversed ranges return 400 |
| Admin attendance | Only first 250 records loaded | All pages retrieved before reports use records |
| Access history | Entry/Exit checked against status and rejected valid records; Load More used stale page state and replaced rows | Correct accessType filters; all pages loaded; total reflects loaded complete collection; calendar-month and seven-day filters corrected; visible loading errors |
| Reports | Only first 200 personal logs loaded; backend actorRole ignored; guard treated inconsistently; This Month meant last 30 days; Last 7 Days included eight dates | All campus logs loaded within existing server role permissions; actorRole/metadata recognized; guard included with security; correct calendar month and seven-date window; security/system rows no longer counted as visitors; visible load errors |
| Security logs | First 60 only; security route called admin-only API; native CSV button did nothing | All pages loaded using existing access-log permissions; CSV works through platform save/share adapter |
| Security dashboard | Operational statistics based on first 100 visitors/logs | Complete paginated visitor and access-log collections |
| NFC management | Card/user pickers stopped at 100/150 | Complete paginated cards and users |
| Visitor management | Sample visitors could appear on API failure; add/edit/delete could report demo success; approve/check-in/check-out only mutated screen state | Failed responses surface errors; no fabricated list or success; confirmed lifecycle actions call existing server APIs and reload persisted data |
| Visitor pass | Missing route params left permanent spinner; wallet/email/download falsely reported success; QR icon presented as scannable credential | Empty selection exits loading with error; unavailable integrations clearly disclosed; pass details no longer claim QR generation/download |
| Shared CSV | Native reports created a PDF but shared it as CSV; log fields not consistently escaped | Actual CSV saved/shared on native and downloaded on web; quotes/newlines escaped; spreadsheet formula prefixes neutralized |
| Staff dashboard | Profile request could reject while appointment request was being awaited | Both requests observed immediately with Promise.all |
| Settings | Failed storage write left optimistic state and unhandled rejection | Previous displayed state restored and visible failure notice |
| Theme context | Initial default could overwrite stored preference before read completed | Persistence waits for preference hydration; functional toggle avoids stale updates. This provider is currently unused by App.js, so this is a module fix rather than a claim of app-wide theme behavior |
| Backend demo endpoint | Unauthenticated POST could create an account with a fixed password | Public demo creation endpoint removed; local seed scripts remain the account setup path |

## Screen coverage

All files in SafePass-Mobile/screens were parsed and API-method references checked against ApiService. No unresolved ApiService method references were found. This is a static check, not execution of every API path.

| Screen/module | Review performed |
| --- | --- |
| RoleSelectScreen | Navigation destinations and auth entry points; compilation |
| LoginScreen | Sign-in/recovery/verification navigation and API references; existing biometric/auth regression cases |
| VisitorRegisterScreen | Registration/OTP API references and role/home navigation; compilation |
| VerificationScreen | OTP validation, resend timer cleanup, session storage and role navigation source review |
| HelpScreen | Legal-topic selection, back/home/login navigation and external-link error handler source review |
| AdminDashboardScreen | Existing pagination/duplicate-account/dialog tests; attendance pagination fixed |
| StaffDashboardScreen | Load/appointment handlers; existing approval/dialog tests; concurrent load failure fixed |
| SecurityDashboardScreen | Operational load, log/visitor collection derivation, attendance pagination source; visitor/log caps fixed |
| StudentDashboardScreen | Attendance/NFC lifecycle, role/profile navigation; existing logout confirmation test |
| VisitorDashboardScreen | Appointment/profile/cache/API references; existing fixture tests for appointment guards, office/staff selection, auth cache isolation and profile editing |
| AttendanceRecordsScreen | All six prior issues fixed; controlled-clock, pagination, failure and stale-response tests |
| VisitorManagementScreen | Persistence and response handling reviewed; real confirmation handlers tested against fixture success/rejection |
| NFCManagementScreen | Issue/assign/revoke APIs, scan listeners/cleanup; collection caps fixed |
| NFCScanScreen | User load, map fallback, station event/tap handlers and cleanup source; physical NFC pending |
| AccessLogScreen | Fetch/export/date/type handlers; Entry/Exit fixture regression test |
| ReportsScreen | Role/date filtering, complete campus data, CSV/print; calendar/actor-role fixture test |
| SecurityLogsScreen | Role/API mismatch, full collection, search/export and load failure source |
| SettingsScreen | Storage load/update and failure handling source |
| ProfileScreenV2 | Profile validation/save, photo picker, password/auth/cache fallback and navigation source; device/image upload behavior pending |
| VisitorPassScreen | Initial-load paths and action handlers; false integration success removed |
| WebMapScreen | Map settings load/unmount guard, floor/direction handlers and navigation source; visual route accuracy pending |
| VisitorScreen | Legacy unregistered screen identified; demo data, wallet placeholder and Home destination remain legacy concerns. No active App.js import/route was found |
| WebHoverableCard | Shared helper; parsed/compiled rather than a navigable page |
| authScreens.js / authScreens.web.js | Native/direct versus web/lazy auth exports checked |
| SafePass-Web attendance component | Standalone orphan copy with missing sibling utils/assets/package infrastructure; not used by the active Expo application. Not modified as if it were a deployed web app |

## Verification

- Client suite: 44 passing tests, including 10 new behavioral regressions.
- Backend suite: 40 passing tests, including three new HTTP integration checks for date validation, feed/summary filter parity, and retired demo endpoint.
- Web build compiled successfully with a local-only API configuration. Build artifacts are not committed as production output.
- Tests use fixtures/mocked database access. No real login, OTP/SMS/email, approvals, records, credentials, or NFC devices were exercised.

## Remaining work requiring runtime access or product decisions

- Browser pass at desktop 1440×900/1366×768 and phone 390×844/360×800: visual overflow, focus, keyboard, validation announcements, navigation history/reload and console/network traces.
- Isolated local backend/database with accounts for each role: complete account/appointment/approval/report flows and persistence across reloads.
- Android test build/device: camera permissions, real image upload, native CSV sharing/printing, biometrics, notifications, and NFC hardware.
- Settings notification/reminder/compact-card preferences are saved but no consumers for these particular staffSettings keys were found. They need product wiring before those labels imply functional app behavior.
- Wallet, pass email delivery and real QR issuance/download remain unimplemented features; removing false success messages does not implement those integrations.
- Staff appointment and student attendance dashboards still request recent subsets; determine whether each is intentionally a recent feed or needs full searchable history. No claim of exhaustive history verification is made.
- Large continuously changing collections can change during pagination. The loader rejects detected total changes, duplicates or missing rows and asks for refresh; it is not a server-side snapshot export.
