// ─── Currency Formatting ─────────────────────────────────────────────────────

export function formatCurrency(amount: number, symbol = '$'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatAmount(amount: number, type: 'expense' | 'income' | 'transfer', symbol = '$'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (type === 'expense') return `-${symbol}${formatted}`;
  if (type === 'income') return `+${symbol}${formatted}`;
  return `${symbol}${formatted}`;
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = SHORT_DAYS[date.getDay()];
  const monthName = SHORT_MONTHS[month - 1];
  return `${dayName}, ${monthName} ${day}`;
}

export function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = DAYS[date.getDay()];
  const monthName = MONTHS[month - 1];
  return `${dayName}, ${monthName} ${day}, ${year}`;
}

export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthYear(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number);
  return { year, month };
}

export function isSameMonth(dateStr: string, year: number, month: number): boolean {
  const parts = dateStr.split('-').map(Number);
  return parts[0] === year && parts[1] === month;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function navigateMonth(year: number, month: number, direction: 1 | -1): { year: number; month: number } {
  let newMonth = month + direction;
  let newYear = year;
  if (newMonth > 12) { newMonth = 1; newYear++; }
  if (newMonth < 1) { newMonth = 12; newYear--; }
  return { year: newYear, month: newMonth };
}
