import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Modal, Pressable, TextInput, ScrollView,
  StyleSheet, Alert, TouchableOpacity, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useApp } from '@/lib/AppContext';
import { Transaction, TransactionType, Category, Account } from '@/lib/types';
import { todayString, formatCurrency } from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import UUID from 'react-native-uuid';

// ─── Props ───────────────────────────────────────────────────────────────────

interface AddTransactionModalProps {
  visible: boolean;
  transaction?: Transaction | null; // if provided, edit mode
  defaultAccountId?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Type Selector ───────────────────────────────────────────────────────────

function TypeSelector({
  value,
  onChange,
  colors,
}: {
  value: TransactionType;
  onChange: (t: TransactionType) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const types: { key: TransactionType; label: string; color: string }[] = [
    { key: 'income', label: 'INCOME', color: colors.income },
    { key: 'expense', label: 'EXPENSE', color: colors.expense },
    { key: 'transfer', label: 'TRANSFER', color: colors.transfer },
  ];

  return (
    <View style={styles.typeSelector}>
      {types.map(t => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            style={[
              styles.typeBtn,
              { borderColor: t.color },
              active && { backgroundColor: t.color },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(t.key);
            }}
          >
            <Text style={[styles.typeBtnText, { color: active ? '#fff' : t.color }]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Category Picker ─────────────────────────────────────────────────────────

function CategoryPicker({
  visible,
  categories,
  selectedId,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.pickerOverlay} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Category</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.categoryGrid}
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <Pressable
                style={[
                  styles.categoryGridItem,
                  selected && { backgroundColor: item.color + '25' },
                ]}
                onPress={() => { onSelect(item.id); onClose(); }}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.categoryGridEmoji}>{item.icon}</Text>
                </View>
                <Text style={[styles.categoryGridName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {selected && (
                  <View style={[styles.categorySelectedDot, { backgroundColor: item.color }]} />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Account Picker ──────────────────────────────────────────────────────────

function AccountPicker({
  visible,
  accounts,
  selectedId,
  onSelect,
  onClose,
  colors,
  label,
}: {
  visible: boolean;
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  label?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.pickerOverlay} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{label || 'Select Account'}</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView>
          {accounts.map(acc => {
            const selected = acc.id === selectedId;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accountPickerRow,
                  { borderBottomColor: colors.border },
                  selected && { backgroundColor: colors.surface },
                ]}
                onPress={() => { onSelect(acc.id); onClose(); }}
              >
                <View style={[styles.accountPickerIcon, { backgroundColor: acc.color + '20' }]}>
                  <Text style={{ fontSize: 22 }}>{acc.icon}</Text>
                </View>
                <Text style={[styles.accountPickerName, { color: colors.foreground }]}>{acc.name}</Text>
                {selected && (
                  <IconSymbol name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Date Picker (simple) ─────────────────────────────────────────────────────

function SimpleDatePicker({
  visible,
  value,
  onChange,
  onClose,
  colors,
}: {
  visible: boolean;
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  const handleConfirm = () => {
    // Validate YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
      onChange(inputValue);
      onClose();
    } else {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format');
    }
  };

  // Generate quick date options
  const quickDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
    return dates;
  }, []);

  const formatQuickDate = (dateStr: string) => {
    const today = todayString();
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    const [, m, day] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m)-1]} ${parseInt(day)}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.pickerOverlay} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Date</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.quickDates}>
          {quickDates.map(d => (
            <Pressable
              key={d}
              style={[
                styles.quickDateBtn,
                { borderColor: colors.border },
                value === d && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { onChange(d); onClose(); }}
            >
              <Text style={[
                styles.quickDateText,
                { color: value === d ? '#fff' : colors.foreground },
              ]}>
                {formatQuickDate(d)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.dateInputRow, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
          />
          <Pressable
            style={[styles.dateConfirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={styles.dateConfirmText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AddTransactionModal({
  visible,
  transaction,
  defaultAccountId,
  onClose,
  onSaved,
}: AddTransactionModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, addTransaction, updateTransaction, removeTransaction } = useApp();

  const isEdit = !!transaction;

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');

  // Picker visibility
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when modal opens
  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setToAccountId(transaction.toAccountId || '');
      setDate(transaction.date);
      setNote(transaction.note || '');
    } else {
      setType('expense');
      setAmount('');
      setCategoryId('');
      setAccountId(defaultAccountId || (state.accounts[0]?.id || ''));
      setToAccountId('');
      setDate(todayString());
      setNote('');
    }
    setErrors({});
  }, [visible, transaction, defaultAccountId, state.accounts]);

  // Auto-select first category when type changes
  useEffect(() => {
    if (!categoryId || !state.categories.find(c => c.id === categoryId && c.type === type)) {
      const firstCat = state.categories.find(c => c.type === (type === 'transfer' ? 'expense' : type));
      if (firstCat) setCategoryId(firstCat.id);
    }
  }, [type]);

  const filteredCategories = useMemo(() =>
    state.categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type)),
    [state.categories, type]
  );

  const selectedCategory = state.categories.find(c => c.id === categoryId);
  const selectedAccount = state.accounts.find(a => a.id === accountId);
  const selectedToAccount = state.accounts.find(a => a.id === toAccountId);

  const typeColor = type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.transfer;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Please enter a valid amount';
    if (!categoryId && type !== 'transfer') newErrors.category = 'Please select a category';
    if (!accountId) newErrors.account = 'Please select an account';
    if (type === 'transfer' && !toAccountId) newErrors.toAccount = 'Please select destination account';
    if (type === 'transfer' && accountId === toAccountId) newErrors.toAccount = 'Source and destination must differ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const now = new Date().toISOString();
    const tx: Transaction = {
      id: transaction?.id || String(UUID.v4()),
      type,
      amount: parseFloat(amount),
      categoryId: type === 'transfer' ? (categoryId || 'cat-food') : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date,
      note: note.trim() || undefined,
      createdAt: transaction?.createdAt || now,
      updatedAt: now,
    };

    if (isEdit) {
      await updateTransaction(tx);
    } else {
      await addTransaction(tx);
    }
    onSaved();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (transaction) {
              await removeTransaction(transaction.id);
              onClose();
            }
          },
        },
      ]
    );
  };

  const handleAmountInput = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[
          styles.modalSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]} onPress={onClose}>
              <Text style={[styles.headerBtnText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isEdit ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            {isEdit ? (
              <Pressable style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]} onPress={handleDelete}>
                <IconSymbol name="trash.fill" size={20} color={colors.expense} />
              </Pressable>
            ) : (
              <View style={styles.headerBtn} />
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.formContent}>
              {/* Type Selector */}
              <TypeSelector value={type} onChange={setType} colors={colors} />

              {/* Amount */}
              <View style={[styles.amountContainer, { borderColor: typeColor, backgroundColor: colors.surface }]}>
                <Text style={[styles.currencySymbol, { color: typeColor }]}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: typeColor }]}
                  value={amount}
                  onChangeText={handleAmountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  autoFocus={!isEdit}
                />
              </View>
              {errors.amount && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.amount}</Text>}

              {/* Category (not shown for transfer) */}
              {type !== 'transfer' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category</Text>
                  <Pressable
                    style={[styles.pickerRow, { backgroundColor: colors.surface, borderColor: errors.category ? colors.expense : colors.border }]}
                    onPress={() => setShowCategoryPicker(true)}
                  >
                    <Text style={styles.pickerEmoji}>{selectedCategory?.icon || '🏷️'}</Text>
                    <Text style={[styles.pickerText, { color: selectedCategory ? colors.foreground : colors.muted }]}>
                      {selectedCategory?.name || 'Select Category'}
                    </Text>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </Pressable>
                  {errors.category && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.category}</Text>}
                </>
              )}

              {/* Account */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                {type === 'transfer' ? 'From Account' : 'Account'}
              </Text>
              <Pressable
                style={[styles.pickerRow, { backgroundColor: colors.surface, borderColor: errors.account ? colors.expense : colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={styles.pickerEmoji}>{selectedAccount?.icon || '🏦'}</Text>
                <Text style={[styles.pickerText, { color: selectedAccount ? colors.foreground : colors.muted }]}>
                  {selectedAccount?.name || 'Select Account'}
                </Text>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
              {errors.account && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.account}</Text>}

              {/* To Account (transfer only) */}
              {type === 'transfer' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>To Account</Text>
                  <Pressable
                    style={[styles.pickerRow, { backgroundColor: colors.surface, borderColor: errors.toAccount ? colors.expense : colors.border }]}
                    onPress={() => setShowToAccountPicker(true)}
                  >
                    <Text style={styles.pickerEmoji}>{selectedToAccount?.icon || '🏦'}</Text>
                    <Text style={[styles.pickerText, { color: selectedToAccount ? colors.foreground : colors.muted }]}>
                      {selectedToAccount?.name || 'Select Account'}
                    </Text>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </Pressable>
                  {errors.toAccount && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.toAccount}</Text>}
                </>
              )}

              {/* Date */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Date</Text>
              <Pressable
                style={[styles.pickerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <IconSymbol name="calendar" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.pickerText, { color: colors.foreground }]}>{date}</Text>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>

              {/* Note */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Note (optional)</Text>
              <TextInput
                style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note..."
                placeholderTextColor={colors.muted}
                multiline
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          {/* Save / Delete Buttons */}
          <View style={[styles.saveContainer, { borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: typeColor },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{isEdit ? 'UPDATE' : 'SAVE'}</Text>
            </Pressable>
            {isEdit && (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { borderColor: colors.expense },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleDelete}
              >
                <IconSymbol name="trash.fill" size={16} color={colors.expense} />
                <Text style={[styles.deleteBtnText, { color: colors.expense }]}>DELETE</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Pickers */}
      <CategoryPicker
        visible={showCategoryPicker}
        categories={filteredCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setShowCategoryPicker(false)}
        colors={colors}
      />
      <AccountPicker
        visible={showAccountPicker}
        accounts={state.accounts}
        selectedId={accountId}
        onSelect={setAccountId}
        onClose={() => setShowAccountPicker(false)}
        colors={colors}
      />
      <AccountPicker
        visible={showToAccountPicker}
        accounts={state.accounts.filter(a => a.id !== accountId)}
        selectedId={toAccountId}
        onSelect={setToAccountId}
        onClose={() => setShowToAccountPicker(false)}
        colors={colors}
        label="To Account"
      />
      <SimpleDatePicker
        visible={showDatePicker}
        value={date}
        onChange={setDate}
        onClose={() => setShowDatePicker(false)}
        colors={colors}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  headerBtnText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  formContent: {
    padding: 16,
    gap: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    padding: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  saveContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 10,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Picker sheet
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  categoryGrid: {
    padding: 12,
  },
  categoryGridItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    margin: 4,
    position: 'relative',
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryGridEmoji: {
    fontSize: 26,
  },
  categoryGridName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  categorySelectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  accountPickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountPickerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  quickDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  quickDateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 0.5,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  dateConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
