export const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const attendanceFilterError = ({ dateFrom, dateTo }) => {
  for (const value of [dateFrom, dateTo]) {
    if (!value) continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return 'Enter dates as YYYY-MM-DD.';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (localDateKey(date) !== value) return 'Enter a valid calendar date.';
  }
  return dateFrom && dateTo && dateFrom > dateTo
    ? 'Start date must be on or before end date.' : '';
};

export { fetchAttendanceRecords } from "./paginatedRecords";
