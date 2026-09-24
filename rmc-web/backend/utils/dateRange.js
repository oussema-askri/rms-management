// Dates in this app are written as UTC midnight (`new Date(day + 'T00:00:00.000Z')`),
// so every range query has to be built in UTC too. Using `new Date(year, month, 1)`
// builds the bound in the *server's* local zone, which silently drops or adds a
// day depending on where the server runs (a UTC-negative host loses the 1st of
// the month entirely). These helpers keep the two sides consistent.

// First instant of the given month, UTC.
const monthStartUTC = (year, month) => new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

// First instant of the following month, UTC. Use with `$lt`.
const monthEndUTC = (year, month) => new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

// Last calendar day of the month as YYYY-MM-DD.
const monthLastDayISO = (year, month) =>
  new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

// Parse a "YYYY-MM" query param, falling back to the current UTC month.
const parseMonthParam = (monthParam) => {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
};

// Start/end of a calendar year, UTC. Use with `$gte` / `$lt`.
const yearStartUTC = (year) => new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
const yearEndUTC = (year) => new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

// Whole days covered by an inclusive start..end range, minimum 0.
const inclusiveDayCount = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) return 0;
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (endDay < startDay) return 0;
  return Math.round((endDay - startDay) / 86400000) + 1;
};

module.exports = {
  monthStartUTC,
  monthEndUTC,
  monthLastDayISO,
  parseMonthParam,
  yearStartUTC,
  yearEndUTC,
  inclusiveDayCount,
};
