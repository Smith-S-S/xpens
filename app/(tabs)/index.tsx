import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, Alert,
  RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/AppContext';
import { useColors } from '@/hooks/use-colors';
import { Transaction } from '@/lib/types';
import {
  formatCurrency, formatMonthYear, formatDateHeader,
  isSameMonth, navigateMonth, todayString,
} from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AddTransactionModal from '@/components/AddTransactionModal';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DateGroup {
  date: string;
  transactions: Transaction[];
}

// ─── Records Screen ──────────────────────────────────────────────────────────

export default function RecordsScreen() {
  const colors = useColors();
  const { state, removeTransaction, refresh } = useApp();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filter transactions for current month
  const monthTransactions = useMemo(() =>
    state.transactions.filter(t => isSameMonth(t.date, year, month)),
    [state.transactions, year, month]
  );

  // Compute summary
  const summary = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of monthTransactions) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { income, expense, total: income - expense };
  }, [monthTransactions]);

  // Group by date, newest first
  const dateGroups = useMemo((): DateGroup[] => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of monthTransactions) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, transactions]) => ({
        date,
        transactions: transactions.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
  }, [monthTransactions]);

  const handleNavigateMonth = useCallback((dir: 1 | -1) => {
    const next = navigateMonth(year, month, dir);
    setYear(next.year);
    setMonth(next.month);
  }, [year, month]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleDelete = useCallback((transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            await removeTransaction(transaction.id);
          },
        },
      ]
    );
  }, [removeTransaction]);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  }, []);

  const getCategoryById = useCallback((id: string) =>
    state.categories.find(c => c.id === id), [state.categories]);

  const getAccountById = useCallback((id: string) =>
    state.accounts.find(a => a.id === id), [state.accounts]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderRightActions = useCallback((transaction: Transaction) => (
    <Pressable
      style={[styles.deleteAction, { backgroundColor: colors.expense }]}
      onPress={() => handleDelete(transaction)}
    >
      <IconSymbol name="trash.fill" size={22} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </Pressable>
  ), [colors.expense, handleDelete]);

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => {
    const category = getCategoryById(item.categoryId);
    const account = getAccountById(item.accountId);
    const amountColor = item.type === 'income' ? colors.income
      : item.type === 'expense' ? colors.expense
      : colors.transfer;
    const amountPrefix = item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '';

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.transactionRow,
            { backgroundColor: colors.background },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handleEditTransaction(item)}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category?.color + '20' || '#eee' }]}>
            <Text style={styles.categoryEmoji}>{category?.icon || '💸'}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionName, { color: colors.foreground }]}>
              {category?.name || 'Unknown'}
            </Text>
            <Text style={[styles.transactionSub, { color: colors.muted }]}>
              {account?.name || '—'}{item.note ? ` · ${item.note}` : ''}
            </Text>
          </View>
          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {amountPrefix}{formatCurrency(item.amount)}
          </Text>
        </Pressable>
      </Swipeable>
    );
  }, [colors, getCategoryById, getAccountById, handleEditTransaction, renderRightActions]);

  const renderDateGroup = useCallback(({ item }: { item: DateGroup }) => (
    <View>
      <View style={[styles.dateHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.dateHeaderText, { color: colors.muted }]}>
          {formatDateHeader(item.date)}
        </Text>
      </View>
      {item.transactions.map(tx => (
        <View key={tx.id} style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          {renderTransaction({ item: tx })}
        </View>
      ))}
    </View>
  ), [colors, renderTransaction]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No transactions</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        No transactions for this month.{'\n'}Tap + to add one.
      </Text>
    </View>
  );

  const totalColor = summary.total >= 0 ? colors.income : colors.expense;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Month Navigator */}
      <View style={[styles.monthNav, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
          onPress={() => handleNavigateMonth(-1)}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {formatMonthYear(year, month)}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
          onPress={() => handleNavigateMonth(1)}
        >
          <IconSymbol name="chevron.right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Income</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>
            {formatCurrency(summary.income)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Expense</Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>
            {formatCurrency(summary.expense)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: totalColor }]}>
            {summary.total >= 0 ? '+' : ''}{formatCurrency(summary.total)}
          </Text>
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={dateGroups}
        keyExtractor={item => item.date}
        renderItem={renderDateGroup}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={dateGroups.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />

      {/* Edit Modal */}
      <AddTransactionModal
        visible={showEditModal}
        transaction={editingTransaction}
        onClose={() => { setShowEditModal(false); setEditingTransaction(null); }}
        onSaved={() => { setShowEditModal(false); setEditingTransaction(null); }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  navBtn: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 0.5,
    height: 32,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionSub: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
