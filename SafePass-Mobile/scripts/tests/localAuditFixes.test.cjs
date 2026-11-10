const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [require('@babel/plugin-transform-modules-commonjs')],
  });
  const context = { exports: {}, require(name) {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  }};
  vm.runInNewContext(code, context);
  return context.exports;
}
function initializer(file, name) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  let result;
  traverse(parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
    VariableDeclarator(p) {
      if (p.node.id.name === name) result = source.slice(p.node.init.start, p.node.init.end);
    },
  });
  assert.ok(result, name);
  return result;
}
const pagination = load('utils/paginatedRecords.js');
const dates = load('utils/attendanceRecords.js', { './paginatedRecords': pagination });

test('attendance shortcuts preserve Manila calendar days around midnight and month boundaries', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Asia/Manila';
  try {
    const RealDate = Date;
    class Clock extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-11-10T01:00:00+08:00'])); } }
    for (const [name, from, to] of [
      ['getTodayFilter', '2026-11-10', '2026-11-10'],
      ['getYesterdayFilter', '2026-11-09', '2026-11-09'],
      ['getThisMonthFilter', '2026-11-01', '2026-11-10'],
    ]) {
      const value = vm.runInNewContext(`(${initializer('screens/AttendanceRecordsScreen.jsx', name)})()`, { Date: Clock, localDateKey: dates.localDateKey });
      assert.equal(value.dateFrom, from); assert.equal(value.dateTo, to);
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test('client and server reject malformed, impossible and reversed dates', () => {
  const { attendanceDateError } = require('../../backend/utils/attendanceFilters');
  for (const input of [{ dateFrom: 'abc' }, { dateFrom: '2026-02-30' }, { dateFrom: '2026-11-10', dateTo: '2026-11-01' }]) {
    assert.ok(dates.attendanceFilterError(input)); assert.ok(attendanceDateError(input));
  }
  for (const input of [{}, { dateFrom: '2028-02-29', dateTo: '2028-03-01' }]) {
    assert.equal(dates.attendanceFilterError(input), ''); assert.equal(attendanceDateError(input), '');
  }
});

test('paginated feeds collect records beyond the old caps and reject incomplete exports', async () => {
  const records = Array.from({ length: 501 }, (_, i) => ({ _id: String(i) }));
  const calls = [];
  const result = await pagination.fetchAttendanceRecords(async page => {
    calls.push(page);
    return { attendance: records.slice((page - 1) * 500, page * 500), pagination: { pages: 2, total: 501 } };
  });
  assert.equal(result.length, 501); assert.deepEqual(calls, [1, 2]);
  await assert.rejects(pagination.fetchAttendanceRecords(async () => ({ attendance: records.slice(0, 1), pagination: { pages: 1, total: 2 } })), /incomplete/);
  await assert.rejects(pagination.fetchAttendanceRecords(async page => ({ attendance: [{ _id: String(page) }], pagination: { pages: 2, total: page === 1 ? 2 : 3 } })), /changed/);
});

test('attendance ignores stale loads and displays errors rather than an empty success', async () => {
  const code = initializer('screens/AttendanceRecordsScreen.jsx', 'loadData');
  let query = { search: 'old' }, resolveOld, shown, summary, error = '';
  const context = {
    useCallback: fn => fn, buildQuery: () => query, requestId: { current: 0 },
    attendanceFilterError: () => '', fetchAttendanceRecords: pagination.fetchAttendanceRecords,
    ApiService: {
      getAttendance: async q => q.search === 'old' ? new Promise(resolve => { resolveOld = resolve; }) : ({ attendance: [{ _id: 'new' }], pagination: { pages: 1, total: 1 } }),
      getAttendanceSummary: async () => ({ summary: { total: 1 } }),
    },
    setRecords: value => { shown = value; }, setSummary: value => { summary = value; },
    setError: value => { error = value; }, setLoading() {}, setRefreshing() {},
  };
  const run = vm.runInNewContext(code, context);
  const first = run(); query = { search: 'new' }; await run();
  resolveOld({ attendance: [{ _id: 'old' }], pagination: { pages: 1, total: 1 } }); await first;
  assert.equal(shown[0]._id, 'new'); assert.equal(summary.total, 1);
  context.ApiService.getAttendance = async () => { throw Error('Offline'); };
  await run(); assert.equal(error, 'Offline'); assert.equal(shown.length, 0); assert.equal(summary, null);
});

test('attendance query filters treat search literally and apply status with search', () => {
  const { applyAttendanceFilters } = require('../../backend/utils/attendanceFilters');
  const query = applyAttendanceFilters({}, { status: 'late', search: 'Jane (A)', userType: 'student' });
  assert.equal(query.status, 'late'); assert.equal(query.userType, 'student');
  const regex = new RegExp(query.$or[0].name.$regex, 'i');
  assert.ok(regex.test('Jane (A)')); assert.equal(regex.test('Jane A'), false);
});

test('visitor management persists approval/check-in/check-out and surfaces backend rejection', async () => {
  for (const [name, method] of [['handleApproveVisitor','approveVisitor'], ['handleCheckIn','securityCheckIn'], ['handleCheckOut','securityCheckOut']]) {
    let buttons, calls = 0, reloads = 0, notice;
    const context = {
      Alert: { alert(title, message, actions) { if (actions) buttons = actions; else notice = message; } },
      ApiService: { [method]: async id => { calls++; assert.equal(id, 'visitor-id'); return { success: true }; } },
      setIsLoading() {}, loadVisitors: async () => { reloads++; },
    };
    const handler = vm.runInNewContext(initializer('screens/VisitorManagementScreen.jsx', name), context);
    await handler({ _id: 'visitor-id', fullName: 'Test Visitor' });
    assert.equal(calls, 0); // Confirmation still precedes mutation.
    await buttons[1].onPress(); assert.equal(calls, 1); assert.equal(reloads, 1);
    context.ApiService[method] = async () => ({ success: false, message: 'Rejected by server' });
    await buttons[1].onPress(); assert.equal(notice, 'Rejected by server'); assert.equal(reloads, 1);
  }
});

test('shared CSV export saves actual CSV with escaped quotes and formula protection', async () => {
  let saved;
  const module = load('utils/printUtils.js', {
    './saveCsv': async (data, filename) => { saved = { data, filename }; },
    'expo-print': {}, 'expo-sharing': {}, 'react-native': {}, '../styles/PrintStyles': {},
  });
  await module.exportRecordsToCSV({ headers: ['Name', 'Notes'], rows: [['Doe, "Jane"', '=1+1']], filename: 'logs.csv' });
  assert.equal(saved.filename, 'logs.csv');
  assert.ok(saved.data.includes('"Doe, ""Jane"""')); assert.ok(saved.data.includes('"\'=1+1"'));
});

test('access history Entry/Exit filters preserve matching granted records', () => {
  const records = [{ _id: 'in', status: 'granted', accessType: 'entry' }, { _id: 'out', status: 'granted', accessType: 'exit' }];
  const code = initializer('screens/AccessLogScreen.jsx', 'filteredLogs');
  for (const [filter, expected] of [['entry', 'in'], ['exit', 'out']]) {
    const result = vm.runInNewContext(code, { accessLogs: records, selectedDate: 'all', filter });
    assert.equal(result.length, 1); assert.equal(result[0]._id, expected);
  }
});

test('reports filter calendar months and backend actor roles instead of assuming visitor', () => {
  const RealDate = Date;
  class Clock extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-11-10T12:00:00'])); } }
  const logs = [
    { _id: 'old', actorRole: 'student', timestamp: '2026-10-31T12:00:00' },
    { _id: 'student', actorRole: 'student', timestamp: '2026-11-02T12:00:00' },
    { _id: 'guard', actorRole: 'guard', timestamp: '2026-11-03T12:00:00' },
    { _id: 'visitor', actorRole: 'visitor', timestamp: '2026-11-03T12:00:00' },
  ];
  const code = initializer('screens/ReportsScreen.jsx', 'filteredLogs');
  const context = { Date: Clock, useMemo: fn => fn(), logs, dateFilter: 'month', roleFilter: 'student', searchQuery: '' };
  let result = vm.runInNewContext(code, context);
  assert.equal(result.length, 1); assert.equal(result[0]._id, 'student');
  context.roleFilter = 'security'; result = vm.runInNewContext(code, context);
  assert.equal(result.length, 1); assert.equal(result[0]._id, 'guard');
});

test('theme does not overwrite the stored preference before hydration', async () => {
  const state = [], effects = [], dependencies = [];
  let cursor = 0, effectCursor = 0, resolveRead;
  const writes = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }), createElement: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useEffect(fn, deps) {
      const index = effectCursor++;
      if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) effects.push(fn);
      dependencies[index] = deps;
    },
  };
  const filename = path.join(root, 'contexts/ThemeContext.jsx');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [require('@babel/plugin-transform-react-jsx'), require('@babel/plugin-transform-modules-commonjs')],
  });
  const storage = { getItem: () => new Promise(resolve => { resolveRead = resolve; }), setItem: async (...args) => writes.push(args) };
  const context = { exports: {}, console, require(name) {
    if (name === 'react') return react;
    if (name === '@react-native-async-storage/async-storage') return storage;
    if (name === '../styles/brandColors') return { brandColors: {}, sapphireGradient: [] };
    throw Error(name);
  }};
  vm.runInNewContext(code, context);
  function render() { cursor = 0; effectCursor = 0; context.exports.ThemeProvider({ children: null }); while (effects.length) effects.shift()(); }
  render(); assert.equal(writes.length, 0);
  resolveRead('true'); await new Promise(resolve => setImmediate(resolve)); render();
  assert.deepEqual(writes, [['darkModeEnabled', 'true']]);
});
