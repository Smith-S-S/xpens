// ─── Data Models ────────────────────────────────────────────────────────────

export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // for transfers
  date: string; // ISO date string YYYY-MM-DD
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

// ─── Derived / Computed ─────────────────────────────────────────────────────

export interface AccountWithBalance extends Account {
  balance: number; // computed from initial + transactions
}

export interface CategoryWithTotal extends Category {
  total: number;
  percentage: number;
  count: number;
}

// ─── Form / UI ───────────────────────────────────────────────────────────────

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  date: string;
  note: string;
}
