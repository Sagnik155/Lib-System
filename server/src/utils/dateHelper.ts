/**
 * Timezone-safe date helper for India Standard Time (Asia/Kolkata)
 * Stored and compared as whole calendar days in YYYY-MM-DD format
 */

export function getTodayIndiaString(): string {
  // Use Intl.DateTimeFormat with Asia/Kolkata timezone to get local Indian calendar date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Formats as YYYY-MM-DD
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffInDays(laterDateStr: string, earlierDateStr: string): number {
  const [y1, m1, d1] = laterDateStr.split('-').map(Number);
  const [y2, m2, d2] = earlierDateStr.split('-').map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

/**
 * Format YYYY-MM-DD for human-friendly display
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}
