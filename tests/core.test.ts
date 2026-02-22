import { describe, it, expect } from 'vitest';
import { formatCurrency, formatMonthYear, isSameMonth, navigateMonth, todayString, getDaysInMonth } from '../lib/format';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../lib/defaults';

// ─── Format Tests ─────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(42.5)).toBe('$42.50');
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });
});

describe('formatMonthYear', () => {
  it('formats month and year correctly', () => {
    expect(formatMonthYear(2026, 1)).toBe('January 2026');
    expect(formatMonthYear(2026, 12)).toBe('December 2026');
    expect(formatMonthYear(2025, 6)).toBe('June 2025');
  });
});

describe('isSameMonth', () => {
  it('returns true for same month', () => {
    expect(isSameMonth('2026-03-15', 2026, 3)).toBe(true);
    expect(isSameMonth('2026-01-01', 2026, 1)).toBe(true);
  });

  it('returns false for different month', () => {
    expect(isSameMonth('2026-03-15', 2026, 4)).toBe(false);
    expect(isSameMonth('2025-03-15', 2026, 3)).toBe(false);
  });
});

describe('navigateMonth', () => {
  it('navigates forward correctly', () => {
    expect(navigateMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(navigateMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
  });

  it('navigates backward correctly', () => {
    expect(navigateMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(navigateMonth(2026, 6, -1)).toEqual({ year: 2026, month: 5 });
  });
});

describe('getDaysInMonth', () => {
  it('returns correct days for each month', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31); // January
    expect(getDaysInMonth(2026, 2)).toBe(28); // February non-leap
    expect(getDaysInMonth(2024, 2)).toBe(29); // February leap year
    expect(getDaysInMonth(2026, 4)).toBe(30); // April
  });
});

describe('todayString', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const today = todayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── Default Data Tests ───────────────────────────────────────────────────────

describe('DEFAULT_CATEGORIES', () => {
  it('has expense and income categories', () => {
    const expenses = DEFAULT_CATEGORIES.filter(c => c.type === 'expense');
    const incomes = DEFAULT_CATEGORIES.filter(c => c.type === 'income');
    expect(expenses.length).toBeGreaterThan(0);
    expect(incomes.length).toBeGreaterThan(0);
  });

  it('all categories have required fields', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.color).toBeTruthy();
      expect(['expense', 'income']).toContain(cat.type);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = DEFAULT_CATEGORIES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('DEFAULT_ACCOUNTS', () => {
  it('has at least one account', () => {
    expect(DEFAULT_ACCOUNTS.length).toBeGreaterThan(0);
  });

  it('all accounts have required fields', () => {
    for (const acc of DEFAULT_ACCOUNTS) {
      expect(acc.id).toBeTruthy();
      expect(acc.name).toBeTruthy();
      expect(acc.icon).toBeTruthy();
      expect(acc.color).toBeTruthy();
      expect(typeof acc.initialBalance).toBe('number');
    }
  });
});

// ─── Transaction Logic Tests ──────────────────────────────────────────────────

describe('transaction summary computation', () => {
  const transactions = [
    { id: '1', type: 'income' as const, amount: 1000, categoryId: 'cat-salary', accountId: 'acc-bank', date: '2026-03-01', createdAt: '', updatedAt: '' },
    { id: '2', type: 'expense' as const, amount: 200, categoryId: 'cat-food', accountId: 'acc-cash', date: '2026-03-05', createdAt: '', updatedAt: '' },
    { id: '3', type: 'expense' as const, amount: 50, categoryId: 'cat-transport', accountId: 'acc-cash', date: '2026-03-10', createdAt: '', updatedAt: '' },
    { id: '4', type: 'transfer' as const, amount: 100, categoryId: 'cat-food', accountId: 'acc-bank', toAccountId: 'acc-cash', date: '2026-03-15', createdAt: '', updatedAt: '' },
  ];

  it('computes income correctly', () => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    expect(income).toBe(1000);
  });

  it('computes expense correctly', () => {
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    expect(expense).toBe(250);
  });

  it('computes balance correctly', () => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    expect(income - expense).toBe(750);
  });

  it('filters transactions by month correctly', () => {
    const march = transactions.filter(t => isSameMonth(t.date, 2026, 3));
    expect(march.length).toBe(4);
    const april = transactions.filter(t => isSameMonth(t.date, 2026, 4));
    expect(april.length).toBe(0);
  });
});

// ─── Account Balance Tests ────────────────────────────────────────────────────

describe('account balance computation', () => {
  const account = { id: 'acc-cash', name: 'Cash', type: 'cash' as const, initialBalance: 500, icon: '💵', color: '#4CAF50', createdAt: '' };
  const transactions = [
    { id: '1', type: 'income' as const, amount: 200, categoryId: 'cat-salary', accountId: 'acc-cash', date: '2026-03-01', createdAt: '', updatedAt: '' },
    { id: '2', type: 'expense' as const, amount: 80, categoryId: 'cat-food', accountId: 'acc-cash', date: '2026-03-05', createdAt: '', updatedAt: '' },
    { id: '3', type: 'transfer' as const, amount: 100, categoryId: 'cat-food', accountId: 'acc-cash', toAccountId: 'acc-bank', date: '2026-03-10', createdAt: '', updatedAt: '' },
    { id: '4', type: 'transfer' as const, amount: 50, categoryId: 'cat-food', accountId: 'acc-bank', toAccountId: 'acc-cash', date: '2026-03-15', createdAt: '', updatedAt: '' },
  ];

  it('computes account balance correctly', () => {
    let balance = account.initialBalance;
    for (const t of transactions) {
      if (t.accountId === account.id) {
        if (t.type === 'income') balance += t.amount;
        else if (t.type === 'expense') balance -= t.amount;
        else if (t.type === 'transfer') balance -= t.amount; // outgoing transfer
      }
      if (t.type === 'transfer' && t.toAccountId === account.id) {
        balance += t.amount; // incoming transfer
      }
    }
    // 500 + 200 - 80 - 100 + 50 = 570
    expect(balance).toBe(570);
  });
});
