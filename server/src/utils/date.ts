export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Asia/Kolkata UTC+05:30

export interface ISTDateRanges {
  startOfTodayIST: Date;
  endOfTodayIST: Date;
  startOfYesterdayIST: Date;
  endOfYesterdayIST: Date;
  startOfThisWeekIST: Date;
  startOfThisMonthIST: Date;
  endOfThisMonthIST: Date;
  startOfThisYearIST: Date;
  startOf30DaysAgoIST: Date;
  endOf30DaysLaterIST: Date;
}

export function getISTDateRanges(): ISTDateRanges {
  const nowUTC = new Date();
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
  const istYear = nowIST.getUTCFullYear();
  const istMonth = nowIST.getUTCMonth();
  const istDate = nowIST.getUTCDate();
  const istDay = nowIST.getUTCDay(); // 0 is Sunday

  // Start & End of today in IST
  const startOfTodayIST = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - IST_OFFSET_MS);
  const endOfTodayIST = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - IST_OFFSET_MS);

  // Yesterday in IST
  const startOfYesterdayIST = new Date(Date.UTC(istYear, istMonth, istDate - 1, 0, 0, 0) - IST_OFFSET_MS);
  const endOfYesterdayIST = new Date(Date.UTC(istYear, istMonth, istDate - 1, 23, 59, 59, 999) - IST_OFFSET_MS);

  // Start of this week in IST (Monday as start of week)
  const daysSinceMonday = (istDay + 6) % 7;
  const startOfThisWeekIST = new Date(Date.UTC(istYear, istMonth, istDate - daysSinceMonday, 0, 0, 0) - IST_OFFSET_MS);

  // Start and End of this month in IST
  const startOfThisMonthIST = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0) - IST_OFFSET_MS);
  const nextMonthFirstIST = new Date(Date.UTC(istYear, istMonth + 1, 1, 0, 0, 0) - IST_OFFSET_MS);
  const endOfThisMonthIST = new Date(nextMonthFirstIST.getTime() - 1);

  // Start of this year in IST
  const startOfThisYearIST = new Date(Date.UTC(istYear, 0, 1, 0, 0, 0) - IST_OFFSET_MS);

  // 30 days ago
  const startOf30DaysAgoIST = new Date(Date.UTC(istYear, istMonth, istDate - 29, 0, 0, 0) - IST_OFFSET_MS);

  // 30 days later
  const endOf30DaysLaterIST = new Date(Date.UTC(istYear, istMonth, istDate + 30, 23, 59, 59, 999) - IST_OFFSET_MS);

  return {
    startOfTodayIST,
    endOfTodayIST,
    startOfYesterdayIST,
    endOfYesterdayIST,
    startOfThisWeekIST,
    startOfThisMonthIST,
    endOfThisMonthIST,
    startOfThisYearIST,
    startOf30DaysAgoIST,
    endOf30DaysLaterIST,
  };
}

export function parseReportDateRange(period?: string, customStart?: string, customEnd?: string) {
  const ranges = getISTDateRanges();

  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }

  switch (period?.toLowerCase()) {
    case 'yesterday':
      return { start: ranges.startOfYesterdayIST, end: ranges.endOfYesterdayIST };
    case 'week':
      return { start: ranges.startOfThisWeekIST, end: ranges.endOfTodayIST };
    case 'month':
      return { start: ranges.startOfThisMonthIST, end: ranges.endOfTodayIST };
    case 'year':
      return { start: ranges.startOfThisYearIST, end: ranges.endOfTodayIST };
    case 'today':
    default:
      return { start: ranges.startOfTodayIST, end: ranges.endOfTodayIST };
  }
}
