import { getSupabase } from './supabase';
import { Account, Category, Transaction } from './types';

// ─── Row types (Supabase column names) ───────────────────────────────────────

interface SbTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  category_id: string | null;
  category_name: string | null;
  account_id: string | null;
  account_name: string | null;
  to_account_id: string | null;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * Upserts the Clerk user into the `users` table and returns their Supabase UUID.
 * Returns null when Supabase is unavailable or on error.
 */
export async function upsertSupabaseUser(
  clerkId: string,
  fullName: string | null,
  email: string | null,
  avatarUrl: string | null,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('users')
    .upsert(
      {
        clerk_id: clerkId,
        full_name: fullName,
        email,
        avatar_url: avatarUrl,
        last_sign_in: new Date().toISOString(),
      },
      { onConflict: 'clerk_id' },
    )
    .select('id')
    .single();

  if (error) {
    console.warn('[supabase] upsertUser:', error.message);
    return null;
  }
  return (data as { id: string }).id;
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────

function toRow(
  tx: Transaction,
  userId: string,
  categories: Category[],
  accounts: Account[],
): SbTransaction {
  const cat = categories.find(c => c.id === tx.categoryId);
  const acc = accounts.find(a => a.id === tx.accountId);
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    category_name: cat?.name ?? null,
    account_id: tx.accountId,
    account_name: acc?.name ?? null,
    to_account_id: tx.toAccountId ?? null,
    note: tx.note ?? null,
    date: tx.date,
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
  };
}

function fromRow(row: SbTransaction): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    amount: Number(row.amount),
    categoryId: row.category_id ?? '',
    accountId: row.account_id ?? '',
    toAccountId: row.to_account_id ?? undefined,
    note: row.note ?? undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function fetchRemoteTransactions(
  supabaseUserId: string,
): Promise<Transaction[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .eq('user_id', supabaseUserId);

  if (error) {
    console.warn('[supabase] fetchTransactions:', error.message);
    return [];
  }
  return (data as SbTransaction[]).map(fromRow);
}

export async function pushTransaction(
  tx: Transaction,
  supabaseUserId: string,
  categories: Category[],
  accounts: Account[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from('transactions')
    .upsert(toRow(tx, supabaseUserId, categories, accounts), { onConflict: 'id' });

  if (error) console.warn('[supabase] pushTransaction:', error.message);
}

export async function pushTransactionsBatch(
  transactions: Transaction[],
  supabaseUserId: string,
  categories: Category[],
  accounts: Account[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb || transactions.length === 0) return;

  const rows = transactions.map(tx => toRow(tx, supabaseUserId, categories, accounts));
  const { error } = await sb
    .from('transactions')
    .upsert(rows, { onConflict: 'id' });

  if (error) console.warn('[supabase] pushTransactionsBatch:', error.message);
}

export async function deleteRemoteTransaction(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from('transactions').delete().eq('id', id);
  if (error) console.warn('[supabase] deleteTransaction:', error.message);
}

// ─── Merge (last-write-wins by updatedAt) ────────────────────────────────────

/**
 * Merges local and remote transaction arrays.
 * For the same ID: the row with the newer `updatedAt` wins.
 */
export function mergeTransactions(
  local: Transaction[],
  remote: Transaction[],
): Transaction[] {
  const map = new Map<string, Transaction>();

  for (const tx of local) map.set(tx.id, tx);

  for (const tx of remote) {
    const existing = map.get(tx.id);
    if (!existing || tx.updatedAt >= existing.updatedAt) {
      map.set(tx.id, tx);
    }
  }

  return Array.from(map.values());
}
