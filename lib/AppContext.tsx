import React, {
  createContext, useContext, useEffect, useReducer,
  useCallback, useRef,
} from 'react';
import { AppState } from 'react-native';
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
  addPendingDelete,
  getPendingDeletes,
  clearPendingDeletes,
} from './storage';
import { AccountWithBalance } from './types';
import {
  upsertSupabaseUser,
  fetchRemoteTransactions,
  pushTransaction,
  pushTransactionsBatch,
  deleteRemoteTransaction,
  deleteRemoteTransactionsBatch,
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

// Minimum ms between two background syncs (2 minutes)
const SYNC_COOLDOWN_MS = 2 * 60 * 1000;

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    accounts: [],
    categories: [],
    loading: true,
  });

  const { isLoaded: authLoaded, userId } = useAuth();
  const { user } = useUser();

  // Supabase UUID once the user is synced
  const sbUserIdRef = useRef<string | null>(null);
  // Timestamp of last completed sync (used for AppState cooldown)
  const lastSyncAtRef = useRef<number>(0);
  // Prevent concurrent syncs
  const isSyncingRef = useRef(false);

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

  // ── Core sync function ───────────────────────────────────────────────────

  /**
   * Full sync with Supabase:
   *  1. Push all local transactions (covers offline adds / edits)
   *  2. Flush the pending-deletes queue (throws on network error → queue is kept for retry)
   *  3. Fetch remote + merge (last-write-wins) + persist locally
   */
  const performSync = useCallback(async (sbUserId: string) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const [localTx, categories, accounts] = await Promise.all([
        getTransactions(),
        getCategories(),
        getAccounts(),
      ]);

      // 1. Push local transactions (handles offline adds / edits)
      await pushTransactionsBatch(localTx, sbUserId, categories, accounts);

      // 2. Flush pending deletes — if this throws (network error) we stop here
      //    and the queue stays intact for the next sync attempt.
      const pendingDeletes = await getPendingDeletes();
      if (pendingDeletes.length > 0) {
        await deleteRemoteTransactionsBatch(pendingDeletes);
        await clearPendingDeletes();
      }

      // 3. Fetch remote + merge + save
      const remoteTx = await fetchRemoteTransactions(sbUserId);
      const merged = mergeTransactions(localTx, remoteTx);
      await setTransactions(merged);
      dispatch({ type: 'SET_TRANSACTIONS', transactions: merged });

      lastSyncAtRef.current = Date.now();
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // ── Initial Supabase sync (when user signs in) ───────────────────────────

  useEffect(() => {
    if (!authLoaded || !userId || !user || state.loading) return;

    // Only upsert the user record and kick off the first sync once
    if (sbUserIdRef.current) return;

    const initialSync = async () => {
      const sbUserId = await upsertSupabaseUser(
        userId,
        user.fullName ?? null,
        user.primaryEmailAddress?.emailAddress ?? null,
        user.imageUrl ?? null,
      );
      if (!sbUserId) return; // network / config issue — stay local

      sbUserIdRef.current = sbUserId;
      await performSync(sbUserId);
    };

    initialSync().catch(e => console.warn('[AppContext] initial sync error:', e));
  }, [authLoaded, userId, user, state.loading, performSync]);

  // ── Re-sync when app comes to foreground (catches offline changes) ───────

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      const sbId = sbUserIdRef.current;
      if (!sbId) return;
      if (Date.now() - lastSyncAtRef.current < SYNC_COOLDOWN_MS) return;
      performSync(sbId).catch(e => console.warn('[AppContext] foreground sync error:', e));
    });
    return () => sub.remove();
  }, [performSync]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const accountsWithBalance: AccountWithBalance[] = state.accounts.map(acc => ({
    ...acc,
    balance: computeAccountBalance(acc, state.transactions),
  }));

  // ── Mutations ────────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
    const sbId = sbUserIdRef.current;
    if (sbId) {
      const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);
      // Fire-and-forget; if offline, next performSync pushes it via pushTransactionsBatch
      pushTransaction(tx, sbId, categories, accounts)
        .catch(e => console.warn('[AppContext] add→supabase error:', e));
    }
  }, []);

  const updateTransaction = useCallback(async (tx: Transaction) => {
    await saveTransaction(tx);
    dispatch({ type: 'UPSERT_TRANSACTION', transaction: tx });
    const sbId = sbUserIdRef.current;
    if (sbId) {
      const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);
      pushTransaction(tx, sbId, categories, accounts)
        .catch(e => console.warn('[AppContext] update→supabase error:', e));
    }
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    // Local delete is always immediate
    await deleteTransaction(id);
    dispatch({ type: 'DELETE_TRANSACTION', id });

    const sbId = sbUserIdRef.current;
    if (!sbId) return; // guest mode — local only

    // Queue the delete so performSync can flush it even if offline right now
    await addPendingDelete(id);

    // Also try immediately; if it succeeds, remove from queue
    deleteRemoteTransaction(id)
      .then(async () => {
        const ids = await getPendingDeletes();
        const remaining = ids.filter(i => i !== id);
        await clearPendingDeletes();
        // Re-add any other pending deletes that were in the queue
        for (const remaining_id of remaining) {
          await addPendingDelete(remaining_id);
        }
      })
      .catch(e => console.warn('[AppContext] delete→supabase (queued for retry):', e));
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
