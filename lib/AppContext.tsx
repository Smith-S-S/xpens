import React, {
  createContext, useContext, useEffect, useReducer,
  useCallback, useRef,
} from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
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
  setTransactions,
  computeAccountBalance,
} from './storage';
import { AccountWithBalance } from './types';
import {
  upsertSupabaseUser,
  fetchRemoteTransactions,
  pushTransaction,
  pushTransactionsBatch,
  deleteRemoteTransaction,
  mergeTransactions,
} from './supabase-sync';

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
  | { type: 'SET_TRANSACTIONS'; transactions: Transaction[] }
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
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.transactions };
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

  // Clerk auth — available because AppProvider is inside ClerkProvider > ClerkLoaded
  const { isLoaded: authLoaded, userId } = useAuth();
  const { user } = useUser();

  // Supabase UUID for the signed-in user (null = guest / not yet synced)
  const sbUserIdRef = useRef<string | null>(null);

  // Track which Clerk user we last synced to avoid double-syncing
  const lastSyncedClerkIdRef = useRef<string | null>(null);

  // Always-current references used inside async callbacks to avoid stale closures
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Load from local storage ──────────────────────────────────────────────

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

  // ── Supabase sync (signed-in users only) ────────────────────────────────

  useEffect(() => {
    // Wait until Clerk is ready, user is signed in, and local storage has loaded
    if (!authLoaded || !userId || !user || state.loading) return;

    // Only sync once per Clerk user per session
    if (lastSyncedClerkIdRef.current === userId) return;
    lastSyncedClerkIdRef.current = userId;

    const syncWithSupabase = async () => {
      // 1. Upsert user record → get Supabase UUID
      const sbUserId = await upsertSupabaseUser(
        userId,
        user.fullName ?? null,
        user.primaryEmailAddress?.emailAddress ?? null,
        user.imageUrl ?? null,
      );
      if (!sbUserId) return; // network/config issue — stay local

      sbUserIdRef.current = sbUserId;

      const { categories, accounts, transactions: localTx } = stateRef.current;

      // 2. Push all local transactions up first (handles guest→signed-in migration)
      await pushTransactionsBatch(localTx, sbUserId, categories, accounts);

      // 3. Fetch all remote transactions
      const remoteTx = await fetchRemoteTransactions(sbUserId);

      // 4. Merge (last-write-wins by updatedAt)
      const merged = mergeTransactions(localTx, remoteTx);

      // 5. Persist merged list locally and update state
      await setTransactions(merged);
      dispatch({ type: 'SET_TRANSACTIONS', transactions: merged });
    };

    syncWithSupabase().catch(e => console.warn('[AppContext] sync error:', e));
  }, [authLoaded, userId, user, state.loading]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const accountsWithBalance: AccountWithBalance[] = state.accounts.map(acc => ({
    ...acc,
    balance: computeAccountBalance(acc, state.transactions),
  }));

  // ── Mutations ────────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
    if (sbUserIdRef.current) {
      const { categories, accounts } = stateRef.current;
      pushTransaction(tx, sbUserIdRef.current, categories, accounts)
        .catch(e => console.warn('[AppContext] push error:', e));
    }
  }, []);

  const updateTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
    if (sbUserIdRef.current) {
      const { categories, accounts } = stateRef.current;
      pushTransaction(tx, sbUserIdRef.current, categories, accounts)
        .catch(e => console.warn('[AppContext] push error:', e));
    }
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id);
    dispatch({ type: 'DELETE_TRANSACTION', id });
    if (sbUserIdRef.current) {
      deleteRemoteTransaction(id)
        .catch(e => console.warn('[AppContext] delete error:', e));
    }
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
