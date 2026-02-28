import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, Alert,
  RefreshControl, StyleSheet, TouchableOpacity, Image,
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
import BalanceSummaryChart from '@/components/BalanceSummaryChart';
import { useSidebar } from '@/lib/SidebarContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
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
  const { openSidebar } = useSidebar();

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
      <IconSymbol name="trash.fill" size={20} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </Pressable>
  ), [colors.expense, handleDelete]);

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => {
    const category = getCategoryById(item.categoryId);
    const account  = getAccountById(item.accountId);
    const amountColor = item.type === 'income'  ? colors.income
                      : item.type === 'expense' ? colors.expense
                      : colors.transfer;
    const amountPrefix = item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '';

    return (
      <View style={styles.txCardWrapper}>
        <ReanimatedSwipeable
          renderRightActions={() => renderRightActions(item)}
          overshootRight={false}
        >
          <Pressable
            style={({ pressed }) => [
              styles.txCard,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => handleEditTransaction(item)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: (category?.color ?? '#888') + '28' }]}>
              <CategoryIcon icon={category?.icon || '💸'} size={26} />
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
        </ReanimatedSwipeable>
      </View>
    );
  }, [colors, getCategoryById, getAccountById, handleEditTransaction, renderRightActions]);

  const renderDateGroup = useCallback(({ item }: { item: DateGroup }) => (
    <View>
      <Text style={[styles.dateHeaderText, { color: colors.muted }]}>
        {formatDateHeader(item.date)}
      </Text>
      {item.transactions.map(tx => (
        <View key={tx.id}>
          {renderTransaction({ item: tx })}
        </View>
      ))}
    </View>
  ), [colors, renderTransaction]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      {/* <View style={styles.emptyGlow}> */}
        <Image
          source={require('@/assets/images/no-transactions.png')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
      {/* </View> */}
      {/* <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nothing here yet
      </Text> */}
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {`No transactions for ${formatMonthYear(year, month)}.\nTap + to record your first one.`}
      </Text>
      <Text style={[styles.emptyDots, { color: colors.border }]}>• • •</Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Month Navigator */}
      <View style={[styles.monthNav, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {/* Left: sidebar + prev */}
        <View style={styles.navSide}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
            onPress={openSidebar}
          >
            <IconSymbol name="line.3.horizontal" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
            onPress={() => handleNavigateMonth(-1)}
          >
            <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Center: month label */}
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {formatMonthYear(year, month)}
        </Text>

        {/* Right: next + placeholder to balance */}
        <View style={[styles.navSide, styles.navSideRight]}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
            onPress={() => handleNavigateMonth(1)}
          >
            <IconSymbol name="chevron.right" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.navPlaceholder} />
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={dateGroups}
        keyExtractor={item => item.date}
        renderItem={renderDateGroup}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          <>
            <BalanceSummaryChart
              year={year}
              month={month}
              transactions={state.transactions}
              summary={summary}
              currency={state.currency}
            />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Transactions
            </Text>
          </>
        }
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  navSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navSideRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navPlaceholder: {
    width: 36,
  },
  navBtn: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  txCardWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
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
    width: 76,
    marginVertical: 4,
    marginRight: 16,
    borderRadius: 14,
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
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 220,
    height: 220,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  emptyDots: {
    fontSize: 18,
    letterSpacing: 6,
    marginTop: 20,
  },
});
