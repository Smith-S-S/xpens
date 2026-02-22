import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { Account, Category, Transaction } from './types';
import {
  initializeStorage,
  getTransactions,
  getAccounts,
  getCategories,
  saveTransaction,
  deleteTransaction,
  saveAccount,
  deleteAccount,
  saveCategory,
  deleteCategory,
  computeAccountBalance,
} from './storage';
import { AccountWithBalance } from './types';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  loading: boolean;
}

type AppAction =
  | { type: 'SET_ALL'; transactions: Transaction[]; accounts: Account[]; categories: Category[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'UPSERT_TRANSACTION'; transaction: Transaction }
  | { type: 'DELETE_TRANSACTION'; id: string }
  | { type: 'UPSERT_ACCOUNT'; account: Account }
  | { type: 'DELETE_ACCOUNT'; id: string }
  | { type: 'UPSERT_CATEGORY'; category: Category }
  | { type: 'DELETE_CATEGORY'; id: string };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ALL':
      return {
        ...state,
        transactions: action.transactions,
        accounts: action.accounts,
        categories: action.categories,
        loading: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'UPSERT_TRANSACTION': {
      const idx = state.transactions.findIndex(t => t.id === action.transaction.id);
      if (idx >= 0) {
        const updated = [...state.transactions];
        updated[idx] = action.transaction;
        return { ...state, transactions: updated };
      }
      return { ...state, transactions: [...state.transactions, action.transaction] };
    }
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
    case 'UPSERT_ACCOUNT': {
      const idx = state.accounts.findIndex(a => a.id === action.account.id);
      if (idx >= 0) {
        const updated = [...state.accounts];
        updated[idx] = action.account;
        return { ...state, accounts: updated };
      }
      return { ...state, accounts: [...state.accounts, action.account] };
    }
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(a => a.id !== action.id),
        transactions: state.transactions.filter(
          t => t.accountId !== action.id && t.toAccountId !== action.id
        ),
      };
    case 'UPSERT_CATEGORY': {
      const idx = state.categories.findIndex(c => c.id === action.category.id);
      if (idx >= 0) {
        const updated = [...state.categories];
        updated[idx] = action.category;
        return { ...state, categories: updated };
      }
      return { ...state, categories: [...state.categories, action.category] };
    }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.id) };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  accountsWithBalance: AccountWithBalance[];
  // Actions
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    accounts: [],
    categories: [],
    loading: true,
  });

  const loadAll = useCallback(async () => {
    await initializeStorage();
    const [transactions, accounts, categories] = await Promise.all([
      getTransactions(),
      getAccounts(),
      getCategories(),
    ]);
    dispatch({ type: 'SET_ALL', transactions, accounts, categories });
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const accountsWithBalance: AccountWithBalance[] = state.accounts.map(acc => ({
    ...acc,
    balance: computeAccountBalance(acc, state.transactions),
  }));

  const addTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
  }, []);

  const updateTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id);
    dispatch({ type: 'DELETE_TRANSACTION', id });
  }, []);

  const addAccount = useCallback(async (account: Account) => {
    await saveAccount(account);
    dispatch({ type: 'UPSERT_ACCOUNT', account });
  }, []);

  const updateAccount = useCallback(async (account: Account) => {
    await saveAccount(account);
    dispatch({ type: 'UPSERT_ACCOUNT', account });
  }, []);

  const removeAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    dispatch({ type: 'DELETE_ACCOUNT', id });
  }, []);

  const addCategory = useCallback(async (category: Category) => {
    await saveCategory(category);
    dispatch({ type: 'UPSERT_CATEGORY', category });
  }, []);

  const updateCategory = useCallback(async (category: Category) => {
    await saveCategory(category);
    dispatch({ type: 'UPSERT_CATEGORY', category });
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    dispatch({ type: 'DELETE_CATEGORY', id });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        accountsWithBalance,
        addTransaction,
        updateTransaction,
        removeTransaction,
        addAccount,
        updateAccount,
        removeAccount,
        addCategory,
        updateCategory,
        removeCategory,
        refresh: loadAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
