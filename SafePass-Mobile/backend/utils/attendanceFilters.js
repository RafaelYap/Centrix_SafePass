const attendanceDateError = ({ dateFrom, dateTo, startDate, endDate } = {}) => {
  const from = dateFrom || startDate;
  const to = dateTo || endDate;
  for (const value of [from, to]) {
    if (!value) continue;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter dates as YYYY-MM-DD.';
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Enter a valid calendar date.';
  }
  return from && to && from > to ? 'Start date must be on or before end date.' : '';
};

// Both the feed and summary must match the same attendance population.
const applyAttendanceFilters = (query, params = {}) => {
  for (const field of ['userType', 'status', 'module']) {
    if (params[field]) query[field] = String(params[field]).trim().toLowerCase();
  }
  const literalPattern = (value) => ({
    $regex: String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i',
  });
  if (params.location) query.location = literalPattern(params.location);
  if (params.search) {
    const pattern = literalPattern(params.search);
    query.$or = ['name', 'userType', 'role', 'status', 'location', 'checkpointIn',
      'checkpointOut', 'nfcCardId', 'sourceDeviceId'].map(field => ({ [field]: pattern }));
  }
  return query;
};
module.exports = { attendanceDateError, applyAttendanceFilters };
