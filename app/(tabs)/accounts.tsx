import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, Alert,
  StyleSheet, Modal, TextInput, ScrollView, Platform, Image,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/AppContext';
import { useColors } from '@/hooks/use-colors';
import { Account, AccountType } from '@/lib/types';
import { formatCurrency, todayString } from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UUID from 'react-native-uuid';
import * as Haptics from 'expo-haptics';
import { ACCOUNT_ICONS, ACCOUNT_COLORS } from '@/lib/defaults';
import AddTransactionModal from '@/components/AddTransactionModal';

// ─── Account Form Modal ───────────────────────────────────────────────────────

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'bank', label: 'Bank', icon: '🏦' },
  { key: 'credit_card', label: 'Credit Card', icon: '💳' },
  { key: 'savings', label: 'Savings', icon: '🏧' },
  { key: 'investment', label: 'Investment', icon: '📈' },
  { key: 'other', label: 'Other', icon: '💰' },
];

function AccountFormModal({
  visible,
  account,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account?: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAccount, updateAccount } = useApp();
  const isEdit = !!account;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = useState('0');
  const [icon, setIcon] = useState('💵');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!visible) return;
    if (account) {
      setName(account.name);
      setType(account.type);
      setInitialBalance(account.initialBalance.toString());
      setIcon(account.icon);
      setColor(account.color);
    } else {
      setName('');
      setType('cash');
      setInitialBalance('0');
      setIcon('💵');
      setColor(ACCOUNT_COLORS[0]);
    }
    setErrors({});
  }, [visible, account]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Account name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const acc: Account = {
      id: account?.id || String(UUID.v4()),
      name: name.trim(),
      type,
      initialBalance: parseFloat(initialBalance) || 0,
      icon,
      color,
      createdAt: account?.createdAt || new Date().toISOString(),
    };
    if (isEdit) await updateAccount(acc);
    else await addAccount(acc);
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable style={styles.headerBtn} onPress={onClose}>
              <Text style={[styles.headerBtnText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isEdit ? 'Edit Account' : 'Add Account'}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.formContent}>
              {/* Preview */}
              <View style={styles.accountPreview}>
                <View style={[styles.accountPreviewIcon, { backgroundColor: color + '25' }]}>
                  <Text style={{ fontSize: 36 }}>{icon}</Text>
                </View>
                <Text style={[styles.accountPreviewName, { color: colors.foreground }]}>
                  {name || 'Account Name'}
                </Text>
              </View>

              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Account Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: errors.name ? colors.expense : colors.border, color: colors.foreground }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. My Wallet"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.name}</Text>}

              {/* Account Type */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Account Type</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map(t => (
                  <Pressable
                    key={t.key}
                    style={[
                      styles.typeGridItem,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      type === t.key && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setType(t.key);
                      setIcon(t.icon);
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                    <Text style={[styles.typeGridLabel, { color: type === t.key ? colors.primary : colors.foreground }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Initial Balance */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Initial Balance</Text>
              <View style={[styles.balanceInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>$</Text>
                <TextInput
                  style={[styles.balanceTextInput, { color: colors.foreground }]}
                  value={initialBalance}
                  onChangeText={v => setInitialBalance(v.replace(/[^0-9.-]/g, ''))}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              {/* Icon Picker */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                {ACCOUNT_ICONS.map(ic => (
                  <Pressable
                    key={ic}
                    style={[
                      styles.iconOption,
                      { backgroundColor: colors.surface },
                      icon === ic && { backgroundColor: color + '30', borderColor: color, borderWidth: 2 },
                    ]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={{ fontSize: 26 }}>{ic}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Color Picker */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Color</Text>
              <View style={styles.colorGrid}>
                {ACCOUNT_COLORS.map(c => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && <IconSymbol name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.saveContainer, { borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{isEdit ? 'UPDATE' : 'ADD ACCOUNT'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Quick Edit Modal ─────────────────────────────────────────────────────────

// The 3 special reason categories with their icons and IDs
const BALANCE_REASONS = [
  { id: 'cat-money',      label: 'Money',      icon: 'img:money' },
  { id: 'cat-surprise',   label: 'Surprise',   icon: 'img:surprised' },
  { id: 'cat-unexpected', label: 'Unexpected', icon: 'img:un-expected' },
] as const;

function QuickEditModal({
  visible,
  account,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateAccount, addTransaction } = useApp();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [nameError, setNameError] = useState('');
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState(false);

  const originalBalance = account?.initialBalance ?? 0;
  const newBalance = parseFloat(balance) || 0;
  const balanceChanged = Math.abs(newBalance - originalBalance) > 0.001;

  React.useEffect(() => {
    if (!visible || !account) return;
    setName(account.name);
    setBalance(account.initialBalance.toString());
    setNameError('');
    setReasonId(null);
    setReasonError(false);
  }, [visible, account]);

  // Reset reason error as soon as one is selected
  React.useEffect(() => {
    if (reasonId) setReasonError(false);
  }, [reasonId]);

  const handleSave = async () => {
    if (!name.trim()) { setNameError('Name is required'); return; }
    if (!account) return;
    if (balanceChanged && !reasonId) { setReasonError(true); return; }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await updateAccount({ ...account, name: name.trim(), initialBalance: newBalance });

    // Auto-create a transaction for the balance difference
    if (balanceChanged && reasonId) {
      const diff = newBalance - originalBalance;
      const txType = diff > 0 ? 'income' : 'expense';
      const now = new Date().toISOString();
      await addTransaction({
        id: String(UUID.v4()),
        type: txType,
        amount: Math.abs(diff),
        categoryId: reasonId,
        accountId: account.id,
        date: todayString(),
        note: `Balance adjustment`,
        createdAt: now,
        updatedAt: now,
      });
    }

    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={qStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[qStyles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[qStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[qStyles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose}>
              <Text style={[qStyles.cancel, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[qStyles.title, { color: colors.foreground }]}>Edit Account</Text>
            <Pressable onPress={handleSave}>
              <Text style={[qStyles.save, { color: colors.primary }]}>Save</Text>
            </Pressable>
          </View>

          <View style={qStyles.body}>
            {/* Account preview row */}
            {account && (
              <View style={[qStyles.previewRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[qStyles.previewIcon, { backgroundColor: account.color + '25' }]}>
                  <Text style={{ fontSize: 26 }}>{account.icon}</Text>
                </View>
                <Text style={[qStyles.previewType, { color: colors.muted }]}>
                  {ACCOUNT_TYPES.find(t => t.key === account.type)?.label ?? account.type}
                </Text>
              </View>
            )}

            {/* Name */}
            <Text style={[qStyles.label, { color: colors.muted }]}>Account Name</Text>
            <TextInput
              style={[qStyles.input, {
                backgroundColor: colors.surface,
                borderColor: nameError ? colors.expense : colors.border,
                color: colors.foreground,
              }]}
              value={name}
              onChangeText={t => { setName(t); if (t.trim()) setNameError(''); }}
              placeholder="Account name"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
            {!!nameError && <Text style={[qStyles.error, { color: colors.expense }]}>{nameError}</Text>}

            {/* Balance */}
            <Text style={[qStyles.label, { color: colors.muted }]}>Balance</Text>
            <View style={[qStyles.balanceRow, {
              backgroundColor: colors.surface,
              borderColor: balanceChanged ? colors.primary : colors.border,
            }]}>
              <Text style={[qStyles.currSign, { color: colors.primary }]}>$</Text>
              <TextInput
                style={[qStyles.balanceInput, { color: colors.foreground }]}
                value={balance}
                onChangeText={v => {
                  setBalance(v.replace(/[^0-9.-]/g, ''));
                  setReasonId(null);
                  setReasonError(false);
                }}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              {balanceChanged && (
                <Text style={[qStyles.balanceDiff, {
                  color: newBalance > originalBalance ? colors.income : colors.expense,
                }]}>
                  {newBalance > originalBalance ? '+' : ''}{(newBalance - originalBalance).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Reason picker — only shown when balance changes */}
            {balanceChanged && (
              <View style={qStyles.reasonSection}>
                <Text style={[qStyles.label, {
                  color: reasonError ? colors.expense : colors.muted,
                }]}>
                  Reason *{reasonError ? '  — please select one' : ''}
                </Text>
                <View style={qStyles.reasonRow}>
                  {BALANCE_REASONS.map(r => {
                    const selected = reasonId === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        style={[
                          qStyles.reasonBtn,
                          {
                            backgroundColor: selected ? colors.primary + '20' : colors.surface,
                            borderColor: selected ? colors.primary : reasonError ? colors.expense : colors.border,
                            borderWidth: selected ? 2 : 1,
                          },
                        ]}
                        onPress={() => setReasonId(r.id)}
                      >
                        <CategoryIcon icon={r.icon} size={32} />
                        <Text style={[qStyles.reasonLabel, {
                          color: selected ? colors.primary : colors.muted,
                          fontWeight: selected ? '700' : '500',
                        }]}>
                          {r.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const qStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  title: { fontSize: 16, fontWeight: '700' },
  cancel: { fontSize: 15 },
  save: { fontSize: 15, fontWeight: '700' },
  body: { padding: 18, gap: 6 },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10,
  },
  previewIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  previewType: { fontSize: 14, fontWeight: '500' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { fontSize: 12, marginTop: 3 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  currSign: { fontSize: 20, fontWeight: '700', marginRight: 8 },
  balanceInput: { flex: 1, fontSize: 20, fontWeight: '600', padding: 0 },
  balanceDiff: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
  reasonSection: { marginTop: 4 },
  reasonRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  reasonBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 6,
  },
  reasonLabel: { fontSize: 11, letterSpacing: 0.3 },
});

// ─── Accounts Screen ──────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const colors = useColors();
  const { user } = useUser();
  const { accountsWithBalance, removeAccount } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAddTx, setShowAddTx] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [quickEditAccount, setQuickEditAccount] = useState<Account | null>(null);

  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.balance, 0);

  const cardDate = useMemo(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  }, []);

  const displayBalance = useMemo(() => {
    const formatted = formatCurrency(totalBalance);
    const digits = (formatted.match(/\d/g) || []).length;
    if (digits <= 8) return formatted;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) seen++;
      if (seen === 8) return formatted.slice(0, i + 1) + '..';
    }
    return formatted;
  }, [totalBalance]);

  // ── Dynamic overlay positioning ───────────────────────────────────────────
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });
  // card_design.png native size
  const IMG_W = 597, IMG_H = 427;
  // Red card bounds in image-native pixels (measured from PNG)
  // Red card: left ~200, top ~55, right ~415, bottom ~375
  const CONTENT_X = 160, CONTENT_Y = 105, CONTENT_H = 320;

  const overlayPos = useMemo(() => {
    const { width, height } = cardLayout;
    if (!width || !height) return null;
    const scale = Math.min(width / IMG_W, height / IMG_H);
    const rendW = IMG_W * scale;
    const rendH = IMG_H * scale;
    const ox = (width - rendW) / 2;
    const oy = (height - rendH) / 2;
    const s = (n: number) => Math.round(n * scale);
    return {
      // container bounds
      left:   ox + s(CONTENT_X),
      top:    oy + s(CONTENT_Y),
      height: s(CONTENT_H),
      width:  s(185),
      paddingTop:    s(10),
      paddingBottom: s(145),
      // text element offsets — all scale with the image
      labelML: s(19),
      nameML:  s(25),
      dateL:   s(245),
      dateB:   s(104),
      userL:   s(215),
      userB:   s(0),
    };
  }, [cardLayout]);

  const handleLongPress = useCallback((account: Account) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      account.name,
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => { setEditingAccount(account); setShowForm(true); } },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Account',
              `Delete "${account.name}"? All transactions linked to this account will also be deleted.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => removeAccount(account.id) },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [removeAccount]);

  const handleTapAccount = useCallback((account: Account) => {
    setSelectedAccountId(account.id);
    setShowAddTx(true);
  }, []);

  const renderAccount = ({ item }: { item: typeof accountsWithBalance[0] }) => {
    const balanceColor = item.balance < 0 ? colors.expense : colors.foreground;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.accountCard,
          { backgroundColor: colors.background, borderColor: colors.border },
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => handleTapAccount(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={[styles.accountIconCircle, { backgroundColor: item.color + '20' }]}>
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        </View>
        <View style={styles.accountCardInfo}>
          <Text style={[styles.accountCardName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.accountCardType, { color: colors.muted }]}>
            {ACCOUNT_TYPES.find(t => t.key === item.type)?.label || item.type}
          </Text>
        </View>
        <Text style={[styles.accountCardBalance, { color: balanceColor }]}>
          {item.balance < 0 ? '-' : ''}{formatCurrency(Math.abs(item.balance))}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.editIconBtn, pressed && { opacity: 0.5 }]}
          onPress={() => { setQuickEditAccount(item); setShowQuickEdit(true); }}
          hitSlop={8}
        >
          <IconSymbol name="pencil" size={16} color={colors.muted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Credit Card PNG + value overlay */}
      <View
        style={styles.cardSection}
        onLayout={e => setCardLayout({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })}
      >
        <Image
          source={require('@/assets/images/card_design.png')}
          style={styles.cardBgImage}
          resizeMode="contain"
        />

        {/* ··· menu — top-right */}
        <Pressable
          style={({ pressed }) => [styles.cardMenuBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => { setEditingAccount(null); setShowForm(true); }}
        >
          <Text style={[styles.cardMenuText, { color: colors.muted }]}>•••</Text>
        </Pressable>

        {/* Text overlay — position computed from actual image render bounds */}
        {overlayPos && (
          <View
            style={[styles.cardOverlay, {
              left: overlayPos.left, top: overlayPos.top,
              height: overlayPos.height, width: overlayPos.width,
              paddingTop: overlayPos.paddingTop, paddingBottom: overlayPos.paddingBottom,
            }]}
            pointerEvents="none"
          >
            <View>
              <Text
                style={styles.cardTotalAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.4}
              >
                {displayBalance}
              </Text>
              <Text style={[styles.cardTotalLabel, { marginLeft: overlayPos.labelML }]}>Total Balance</Text>
            </View>
            <View style={{ position: 'relative' }}>
              <Text style={[styles.cardHolderName, { marginLeft: overlayPos.nameML }]} numberOfLines={1}>
                {user?.fullName ?? 'My Wallet'}
              </Text>
              <Text style={[styles.cardDate, { left: overlayPos.dateL, bottom: overlayPos.dateB }]}>{cardDate}</Text>
              <Text style={[styles.cardUserLabel, { left: overlayPos.userL, bottom: overlayPos.userB }]} numberOfLines={1}>
                {user?.fullName ?? 'xxx'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={accountsWithBalance}
        keyExtractor={item => item.id}
        renderItem={renderAccount}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [
              styles.addAccountBtn,
              { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => { setEditingAccount(null); setShowForm(true); }}
          >
            <IconSymbol name="plus.circle.fill" size={22} color={colors.primary} />
            <Text style={[styles.addAccountBtnText, { color: colors.primary }]}>Add Account</Text>
          </Pressable>
        }
      />

      <AccountFormModal
        visible={showForm}
        account={editingAccount}
        onClose={() => { setShowForm(false); setEditingAccount(null); }}
        onSaved={() => { setShowForm(false); setEditingAccount(null); }}
      />

      <AddTransactionModal
        visible={showAddTx}
        defaultAccountId={selectedAccountId}
        onClose={() => { setShowAddTx(false); setSelectedAccountId(undefined); }}
        onSaved={() => { setShowAddTx(false); setSelectedAccountId(undefined); }}
      />

      <QuickEditModal
        visible={showQuickEdit}
        account={quickEditAccount}
        onClose={() => { setShowQuickEdit(false); setQuickEditAccount(null); }}
        onSaved={() => { setShowQuickEdit(false); setQuickEditAccount(null); }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardSection: {
    height: 320,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBgImage: {
    width: '100%',
    height: '100%',
  },
  cardMenuBtn: {
    position: 'absolute',
    top: 4,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  cardMenuText: {
    fontSize: 16,
    letterSpacing: 2,
  },
  // Text overlay — left/top/height/width set dynamically via overlayPos
  cardOverlay: {
    position: 'absolute',
    justifyContent: 'space-between',
  },
  cardTotalAmount: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardTotalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  cardHolderName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 165,
  },
  cardDate: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '500',
  },
  cardUserLabel: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  accountIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  accountCardType: {
    fontSize: 13,
  },
  accountCardBalance: {
    fontSize: 18,
    fontWeight: '800',
  },
  editIconBtn: {
    marginLeft: 10,
    padding: 4,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
  },
  addAccountBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Form modal
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
  },
  accountPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  accountPreviewIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accountPreviewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeGridItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  typeGridLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  balanceTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    padding: 0,
  },
  iconRow: {
    gap: 8,
    paddingVertical: 4,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
});
