import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useColors } from '@/hooks/use-colors';
import { useApp } from '@/lib/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UUID from 'react-native-uuid';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { CategoryIcon } from '@/components/CategoryIcon';

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'time',     label: 'TIME',     width: 155 },
  { key: 'type',     label: 'TYPE',     width: 110 },
  { key: 'amount',   label: 'AMOUNT',   width: 80  },
  { key: 'category', label: 'CATEGORY', width: 100 },
  { key: 'account',  label: 'ACCOUNT',  width: 100 },
  { key: 'notes',    label: 'NOTES',    width: 110 },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

interface RawRow {
  time: string;
  type: string;
  amount: string;
  category: string;
  account: string;
  notes: string;
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

/** Proper quoted-CSV parser — handles commas inside "..." fields */
function splitCSVLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(s => s.trim());
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped ""
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows: RawRow[] = [];
  for (const line of lines) {
    const cells = splitCSVLine(line);
    const [time = '', type = '', amount = '', category = '', account = '', notes = ''] = cells;
    if (time.toUpperCase() === 'TIME') continue;
    if (!time && !amount) continue;
    rows.push({ time, type, amount, category, account, notes });
  }
  return rows;
}

function parseDate(s: string): string {
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  return new Date().toISOString().split('T')[0];
}

function parseType(s: string): 'expense' | 'income' | 'transfer' {
  const l = s.toLowerCase();
  if (l.includes('income') || l.includes('(+)')) return 'income';
  if (l.includes('transfer') || l.includes('(*)') || l.includes('→')) return 'transfer';
  return 'expense';
}

// ─── Sample rows shown in idle step ───────────────────────────────────────────

const SAMPLE_ROWS: RawRow[] = [
  { time: 'Feb 01, 2026 9:18 PM', type: '(-) Expense', amount: '6.50',   category: 'Food',   account: 'Card',   notes: '' },
  { time: 'Feb 27, 2026 11:36 PM', type: '(+) Income',  amount: '332.65', category: 'Salary', account: 'Card', notes: '' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportDataModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, addTransaction } = useApp();

  const [step, setStep] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [pickError, setPickError] = useState('');

  const reset = () => {
    setStep('idle');
    setRows([]);
    setPickError('');
    setImportCount(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePickFile = useCallback(async () => {
    setPickError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;

      // Try FileSystem first; fall back to fetch for content:// URIs on Android
      let content: string;
      try {
        content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch {
        const resp = await fetch(uri);
        content = await resp.text();
      }

      const parsed = parseCSV(content);
      if (parsed.length === 0) {
        setPickError('No data rows found. Make sure the file matches the expected format.');
        return;
      }
      setRows(parsed);
      setStep('preview');
    } catch (e) {
      setPickError(`Could not read file: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('importing');
    let count = 0;

    for (const row of rows) {
      const date   = parseDate(row.time);
      const type   = parseType(row.type);
      const amount = Math.abs(parseFloat(row.amount) || 0);
      if (amount === 0) continue;

      // For transfers the account field is "FromAccount->ToAccount"
      const [fromAccName, toAccName] = row.account.includes('->')
        ? row.account.split('->').map(s => s.trim())
        : [row.account, ''];

      const findAcc = (name: string) =>
        state.accounts.find(
          a => a.name.toLowerCase().includes(name.toLowerCase()) ||
               name.toLowerCase().includes(a.name.toLowerCase())
        ) ?? state.accounts[0];

      const acc   = findAcc(fromAccName);
      const toAcc = toAccName ? findAcc(toAccName) : undefined;

      // Match category; transfers may have "  -  " so fall back gracefully
      const catName = row.category.trim().replace(/-/g, '').trim();
      const cat =
        (catName ? state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase()) : undefined) ??
        state.categories.find(c => c.type === (type === 'transfer' ? 'expense' : type)) ??
        state.categories[0];

      if (!cat || !acc) continue;

      const now = new Date().toISOString();
      await addTransaction({
        id: String(UUID.v4()),
        type,
        amount,
        categoryId:  cat.id,
        accountId:   acc.id,
        toAccountId: toAcc?.id,
        date,
        note: row.notes || '',
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    setImportCount(count);
    setStep('done');
  }, [rows, state.categories, state.accounts, addTransaction]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={iStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[
          iStyles.sheet,
          { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) },
        ]}>
          <View style={[iStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[iStyles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={handleClose} style={iStyles.cancelWrap}>
              <Text style={[iStyles.cancel, { color: colors.muted }]}>
                {step === 'done' ? 'Close' : 'Cancel'}
              </Text>
            </Pressable>
            <Text style={[iStyles.title, { color: colors.foreground }]}>Import Data</Text>
            <View style={iStyles.cancelWrap} />
          </View>

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <ScrollView contentContainerStyle={iStyles.body} showsVerticalScrollIndicator={false}>
              <Text style={[iStyles.hint, { color: colors.muted }]}>
                Select a CSV or tab-separated file with these 6 columns. Example:
              </Text>

              {/* Column pills */}
              <View style={[iStyles.colRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {COLUMNS.map(col => (
                  <View key={col.key} style={[iStyles.colPill, { borderColor: colors.primary + '55' }]}>
                    <Text style={[iStyles.colPillText, { color: colors.primary }]}>{col.label}</Text>
                  </View>
                ))}
              </View>

              {/* Sample table — 2 example rows */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={[iStyles.row, iStyles.headRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    {COLUMNS.map(col => (
                      <Text key={col.key} style={[iStyles.headCell, { width: col.width, color: colors.primary }]}>
                        {col.label}
                      </Text>
                    ))}
                  </View>
                  {SAMPLE_ROWS.map((row, i) => (
                    <View key={i} style={[iStyles.row, {
                      borderBottomColor: colors.border + '50',
                      backgroundColor: i % 2 === 0 ? 'transparent' : colors.surface + '60',
                    }]}>
                      {COLUMNS.map(col => (
                        <Text key={col.key} style={[iStyles.dataCell, {
                          width: col.width,
                          color: col.key === 'amount' ? colors.expense : colors.muted,
                        }]} numberOfLines={1}>
                          {row[col.key as ColKey]}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {!!pickError && (
                <View style={[iStyles.errorBox, { backgroundColor: colors.expense + '15', borderColor: colors.expense + '40' }]}>
                  <Text style={[iStyles.errorMsg, { color: colors.expense }]}>{pickError}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  iStyles.actionBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handlePickFile}
              >
                <IconSymbol name="doc.badge.plus" size={20} color="#fff" />
                <Text style={iStyles.actionBtnText}>Select File</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <>
              <Text style={[iStyles.previewMeta, { color: colors.muted }]}>
                {rows.length} row{rows.length !== 1 ? 's' : ''} found — review before importing
              </Text>

              {/* Table: vertical + horizontal scroll */}
              <ScrollView style={iStyles.tableOuter} showsVerticalScrollIndicator={false}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Header row */}
                    <View style={[iStyles.row, iStyles.headRow, {
                      backgroundColor: colors.surface,
                      borderBottomColor: colors.border,
                    }]}>
                      {COLUMNS.map(col => (
                        <Text
                          key={col.key}
                          style={[iStyles.headCell, { width: col.width, color: colors.primary }]}
                        >
                          {col.label}
                        </Text>
                      ))}
                    </View>

                    {/* Data rows */}
                    {rows.map((row, i) => (
                      <View
                        key={i}
                        style={[
                          iStyles.row,
                          {
                            borderBottomColor: colors.border + '50',
                            backgroundColor: i % 2 === 0 ? 'transparent' : colors.surface + '60',
                          },
                        ]}
                      >
                        {COLUMNS.map(col => (
                          <Text
                            key={col.key}
                            style={[
                              iStyles.dataCell,
                              {
                                width: col.width,
                                color: col.key === 'amount' ? colors.expense : colors.foreground,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {row[col.key as ColKey]}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>

              <View style={[iStyles.footer, { borderTopColor: colors.border }]}>
                <Pressable
                  style={({ pressed }) => [
                    iStyles.actionBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleImport}
                >
                  <IconSymbol name="square.and.arrow.down" size={20} color="#fff" />
                  <Text style={iStyles.actionBtnText}>Import {rows.length} Records</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <View style={iStyles.centerBody}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[iStyles.statusText, { color: colors.muted }]}>Importing…</Text>
            </View>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <View style={iStyles.centerBody}>
              <CategoryIcon icon="img:surprised" size={72} />
              <Text style={[iStyles.doneTitle, { color: colors.foreground }]}>
                {importCount} record{importCount !== 1 ? 's' : ''} imported
              </Text>
              <Text style={[iStyles.statusText, { color: colors.muted }]}>
                Transactions have been added to your records.
              </Text>
              <Pressable
                style={({ pressed }) => [iStyles.doneBtn, pressed && { opacity: 0.88 }]}
                onPress={handleClose}
              >
                <LinearGradient
                  colors={['#FFB347', '#FF6803', '#CC4400']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={iStyles.doneBtnGrad}
                >
                  <Text style={iStyles.doneBtnText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const iStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  title:      { fontSize: 16, fontWeight: '700' },
  cancelWrap: { width: 60 },
  cancel:     { fontSize: 15 },

  // ── Idle
  body:         { padding: 18, gap: 14 },
  hint:         { fontSize: 13, lineHeight: 19 },
  hint2:        { fontSize: 12, lineHeight: 19 },
  colRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  colPill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  colPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  errorBox:    { borderRadius: 10, borderWidth: 1, padding: 12 },
  errorMsg:    { fontSize: 13, fontWeight: '500' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Preview
  previewMeta: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4, fontSize: 13 },
  tableOuter:  { flex: 1 },
  row:         { flexDirection: 'row', borderBottomWidth: 0.5 },
  headRow:     { borderBottomWidth: 1 },
  headCell: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    paddingHorizontal: 10, paddingVertical: 10,
  },
  dataCell: {
    fontSize: 12,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 0.5 },

  // ── Center states
  centerBody:  { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  statusText:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  doneTitle:   { fontSize: 22, fontWeight: '700', marginTop: 8 },
  doneBtn:     { marginTop: 24, borderRadius: 16, overflow: 'hidden', width: 180,
                 shadowColor: '#FF6803', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  doneBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1.2 },
});
