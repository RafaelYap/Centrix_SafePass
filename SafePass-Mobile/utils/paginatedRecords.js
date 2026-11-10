// Retrieve every page before publishing data or allowing an export.
export async function fetchPaginatedRecords(fetchPage, recordKey, isCurrent = () => true) {
  const records = [];
  const seen = new Set();
  let pages = 1;
  let total;
  for (let page = 1; page <= pages; page += 1) {
    if (!isCurrent()) return null;
    const response = await fetchPage(page);
    if (!isCurrent()) return null;
    const pagination = response?.pagination || { pages: response?.totalPages, total: response?.total };
    if (!Array.isArray(response?.[recordKey]) || !pagination ||
        !Number.isInteger(pagination.pages) || pagination.pages < 0 ||
        !Number.isInteger(pagination.total) || pagination.total < 0) {
      throw new Error('Invalid records response. Please refresh.');
    }
    if (page === 1) {
      pages = Math.max(1, pagination.pages);
      total = pagination.total;
    } else if (pagination.total !== total || Math.max(1, pagination.pages) !== pages) {
      throw new Error('Records changed while loading. Please refresh.');
    }
    for (const record of response[recordKey]) {
      if (!(record?._id || record?.id)) throw new Error('Invalid record. Please refresh.');
      if (!seen.has(String(record._id || record.id))) {
        seen.add(String(record._id || record.id));
        records.push(record);
      }
    }
  }
  if (records.length !== total) throw new Error('Records are incomplete. Please refresh.');
  return records;
}

export const fetchAttendanceRecords = (fetchPage, isCurrent) => fetchPaginatedRecords(fetchPage, "attendance", isCurrent);
