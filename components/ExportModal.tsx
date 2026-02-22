import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useApp } from '@/lib/AppContext';
import { formatMonthYear, navigateMonth } from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Sharing from 'expo-sharing';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHORT_MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatExportTime(isoString: string): string {
  const date = new Date(isoString);
  const month = SHORT_MONTHS_ABBR[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

function isInRange(
  dateStr: string,
  fromYear: number, fromMonth: number,
  toYear: number, toMonth: number,
): boolean {
  const [y, m] = dateStr.split('-').map(Number);
  const val = y * 12 + m;
  return val >= fromYear * 12 + fromMonth && val <= toYear * 12 + toMonth;
}

// ─── MonthYearNavigator ───────────────────────────────────────────────────────

function MonthYearNavigator({
  label, year, month, onChange, colors,
}: {
  label: string;
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.pickerRow}>
      <Text style={[styles.pickerLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.navRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
          onPress={() => {
            const next = navigateMonth(year, month, -1);
            onChange(next.year, next.month);
          }}
        >
          <IconSymbol name="chevron.left" size={18} color={colors.primary} />
        </Pressable>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>
          {formatMonthYear(year, month)}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
          onPress={() => {
            const next = navigateMonth(year, month, 1);
            onChange(next.year, next.month);
          }}
        >
          <IconSymbol name="chevron.right" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── ExportModal ──────────────────────────────────────────────────────────────

export default function ExportModal({ visible, onClose }: ExportModalProps) {
  const colors = useColors();
  const { state } = useApp();

  const now = new Date();
  const lastMonth = navigateMonth(now.getFullYear(), now.getMonth() + 1, -1);

  const [fromYear, setFromYear] = useState(lastMonth.year);
  const [fromMonth, setFromMonth] = useState(lastMonth.month);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [isExporting, setIsExporting] = useState(false);

  const isInvalidRange = (fromYear * 12 + fromMonth) > (toYear * 12 + toMonth);

  const generateCSV = useCallback(() => {
    const filtered = state.transactions.filter(t =>
      isInRange(t.date, fromYear, fromMonth, toYear, toMonth)
    );
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Always quote every field — guarantees commas inside values never break columns
    const q = (val: string | number): string =>
      `"${String(val).replace(/"/g, '""')}"`;

    const header = [q('index'), q('TIME'), q('TYPE'), q('AMOUNT'), q('CATEGORY'), q('ACCOUNT'), q('NOTES')].join(',');
    const rows = sorted.map((t, i) => {
      const category = state.categories.find(c => c.id === t.categoryId);
      const account = state.accounts.find(a => a.id === t.accountId);
      const time = formatExportTime(t.createdAt);
      const type =
        t.type === 'expense' ? '(-) Expense' :
        t.type === 'income' ? '(+) Income' :
        '(=) Transfer';
      return [
        q(i + 1),
        q(time),
        q(type),
        q(t.amount),
        q(category?.name ?? ''),
        q(account?.name ?? ''),
        q(t.note ?? ''),
      ].join(',');
    });

    // UTF-8 BOM (\ufeff) + CRLF line endings for proper Excel/Sheets recognition
    return '\ufeff' + [header, ...rows].join('\r\n');
  }, [state, fromYear, fromMonth, toYear, toMonth]);

  const getFileName = useCallback(() => {
    const from = `${SHORT_MONTHS_ABBR[fromMonth - 1]}${fromYear}`;
    const to = `${SHORT_MONTHS_ABBR[toMonth - 1]}${toYear}`;
    return `transactions_${from}_${to}.csv`;
  }, [fromMonth, fromYear, toMonth, toYear]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const content = generateCSV();
      const filename = getFileName();

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
      } else {
        // expo-file-system v19 new class-based API
        const { File, Paths } = await import('expo-file-system');
        const file = new File(Paths.cache, filename);
        file.write(content);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Transactions',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Sharing not available', 'Your device does not support file sharing.');
        }
        onClose();
      }
    } catch {
      Alert.alert('Export failed', 'Could not export transactions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, getFileName, onClose]);

  const btnDisabled = isInvalidRange || isExporting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Export Data</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
            >
              <IconSymbol name="xmark" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Date range pickers */}
          <View style={styles.body}>
            <MonthYearNavigator
              label="From"
              year={fromYear}
              month={fromMonth}
              colors={colors}
              onChange={(y, m) => { setFromYear(y); setFromMonth(m); }}
            />
            <MonthYearNavigator
              label="To"
              year={toYear}
              month={toMonth}
              colors={colors}
              onChange={(y, m) => { setToYear(y); setToMonth(m); }}
            />
            {isInvalidRange && (
              <Text style={[styles.warning, { color: colors.expense }]}>
                {'"From" must be before or equal to "To".'}
              </Text>
            )}
          </View>

          {/* Download button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.downloadBtn,
                { backgroundColor: btnDisabled ? colors.muted : colors.primary },
                pressed && !btnDisabled && { opacity: 0.85 },
              ]}
              onPress={handleExport}
              disabled={btnDisabled}
            >
              {isExporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <IconSymbol name="arrow.down.circle.fill" size={18} color="#fff" />
                  <Text style={styles.downloadBtnText}>Download CSV</Text>
                </>
              )}
            </Pressable>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  pickerRow: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  navBtn: {
    padding: 8,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  warning: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 0.5,
    padding: 20,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
