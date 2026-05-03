// Due dates per week, keyed by integer week number.
// Mirrors src/config/site.ts WEEKS[].dueDate — update both if dates change.
const DUE_DATES = {
  1:  '2026-01-25T23:59:59-05:00',
  2:  '2026-02-01T23:59:59-05:00',
  3:  '2026-02-08T23:59:59-05:00',
  4:  '2026-02-15T23:59:59-05:00',
  5:  '2026-02-22T23:59:59-05:00',
  6:  '2026-03-01T23:59:59-05:00',
  7:  '2026-03-08T23:59:59-04:00',
  8:  '2026-03-15T23:59:59-04:00',
  9:  '2026-03-29T23:59:59-04:00',
  10: '2026-04-05T23:59:59-04:00',
  11: '2026-04-12T23:59:59-04:00',
  12: '2026-04-19T23:59:59-04:00',
  13: '2026-04-26T23:59:59-04:00',
  14: '2026-05-03T23:59:59-04:00',
  15: '2026-05-09T23:59:59-04:00',
};

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    body: JSON.stringify(DUE_DATES),
  };
}
