import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Category, Transaction } from './types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './defaults';

const KEYS = {
  TRANSACTIONS: 'mymoney_transactions',
  ACCOUNTS: 'mymoney_accounts',
  CATEGORIES: 'mymoney_categories',
  INITIALIZED: 'mymoney_initialized',
  PENDING_DELETES: 'mymoney_pending_deletes',
  CURRENCY: 'mymoney_currency',
};

// ─── Initialization ──────────────────────────────────────────────────────────

export async function initializeStorage(): Promise<void> {
  const initialized = await AsyncStorage.getItem(KEYS.INITIALIZED);
  if (initialized) {
    // Merge any new default categories added since first install
    await mergeDefaultCategories();
    return;
  }

  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  await AsyncStorage.setItem(KEYS.INITIALIZED, 'true');
}

/** Adds any DEFAULT_CATEGORIES that are missing from storage (by id). */
async function mergeDefaultCategories(): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.CATEGORIES);
  const existing: Category[] = raw ? JSON.parse(raw) : [];
  const existingIds = new Set(existing.map(c => c.id));
  const missing = DEFAULT_CATEGORIES.filter(c => !existingIds.has(c.id));
  if (missing.length === 0) return;
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify([...existing, ...missing]));
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const transactions = await getTransactions();
  const existing = transactions.findIndex(t => t.id === transaction.id);
  if (existing >= 0) {
    transactions[existing] = transaction;
  } else {
    transactions.push(transaction);
  }
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await getTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
}

/** Bulk-replace the entire transactions list (used when syncing from Supabase). */
export async function setTransactions(transactions: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const raw = await AsyncStorage.getItem(KEYS.ACCOUNTS);
  return raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS;
}

export async function saveAccount(account: Account): Promise<void> {
  const accounts = await getAccounts();
  const existing = accounts.findIndex(a => a.id === account.id);
  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(filtered));

  // Also delete all transactions linked to this account
  const transactions = await getTransactions();
  const filteredTx = transactions.filter(
    t => t.accountId !== id && t.toAccountId !== id
  );
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filteredTx));
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(KEYS.CATEGORIES);
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
}

export async function saveCategory(category: Category): Promise<void> {
  const categories = await getCategories();
  const existing = categories.findIndex(c => c.id === category.id);
  if (existing >= 0) {
    categories[existing] = category;
  } else {
    categories.push(category);
  }
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

export async function deleteCategory(id: string): Promise<void> {
  const categories = await getCategories();
  const filtered = categories.filter(c => c.id !== id);
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(filtered));
}

// ─── Pending Deletes Queue (for offline → Supabase sync) ─────────────────────

export async function getPendingDeletes(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.PENDING_DELETES);
  return raw ? JSON.parse(raw) : [];
}

export async function addPendingDelete(id: string): Promise<void> {
  const ids = await getPendingDeletes();
  if (!ids.includes(id)) {
    await AsyncStorage.setItem(KEYS.PENDING_DELETES, JSON.stringify([...ids, id]));
  }
}

export async function clearPendingDeletes(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PENDING_DELETES);
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export async function getCurrency(): Promise<string> {
  const raw = await AsyncStorage.getItem(KEYS.CURRENCY);
  return raw ?? '$';
}

export async function saveCurrency(symbol: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENCY, symbol);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = account.initialBalance;
  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.accountId === account.id) {
      balance -= tx.amount;
    } else if (tx.type === 'income' && tx.accountId === account.id) {
      balance += tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) balance -= tx.amount;
      if (tx.toAccountId === account.id) balance += tx.amount;
    }
  }
  return balance;
}
