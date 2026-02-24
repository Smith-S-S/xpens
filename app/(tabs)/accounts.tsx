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
import { formatCurrency } from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
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

// ─── Accounts Screen ──────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const colors = useColors();
  const { user } = useUser();
  const { accountsWithBalance, removeAccount } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAddTx, setShowAddTx] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();

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
    const ox = (width - rendW) / 2;   // horizontal letterbox offset
    const oy = (height - rendH) / 2;  // vertical letterbox offset
    return {
      left:   ox + CONTENT_X * scale,
      top:    oy + CONTENT_Y * scale,
      height: CONTENT_H * scale,
      width:  185 * scale,  // usable text width within red card
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
            style={[styles.cardOverlay, overlayPos]}
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
              <Text style={styles.cardTotalLabel}>Total Balance</Text>
            </View>
            <View style={{ position: 'relative' }}>
              <Text style={styles.cardHolderName} numberOfLines={1}>
                {user?.fullName ?? 'My Wallet'}
              </Text>
              <Text style={styles.cardDate}>{cardDate}</Text>
              <Text style={styles.cardUserLabel} numberOfLines={1}>
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
    paddingTop: 10,
    paddingBottom: 110,
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
    marginLeft: 19,
  },
  cardHolderName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 165,
    marginLeft: 22,
  },
  cardDate: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '500',
    left: 175,
    bottom: 64,
  },
  cardUserLabel: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontWeight: '500',
    left: 165,
    bottom: -15,
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
