import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/AppContext';
import { useColors } from '@/hooks/use-colors';
import {
  formatCurrency, formatMonthYear, isSameMonth, navigateMonth,
  getDaysInMonth,
} from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CategoryWithTotal } from '@/lib/types';

// ─── Donut Chart ─────────────────────────────────────────────────────────────

interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

function DonutChart({
  slices,
  total,
  size = 220,
  strokeWidth = 36,
  colors,
}: {
  slices: DonutSlice[];
  total: number;
  size?: number;
  strokeWidth?: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const paths = useMemo(() => {
    if (total === 0) return [];
    let cumulative = 0;
    return slices.map((slice, i) => {
      const pct = slice.value / total;
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2;
      cumulative += pct;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = pct > 0.5 ? 1 : 0;

      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
      return { d, color: slice.color, index: i, pct };
    });
  }, [slices, total, cx, cy, radius]);

  if (total === 0) {
    return (
      <View style={[styles.donutEmpty, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.donutCenterLabel, { color: colors.muted }]}>No data</Text>
          </View>
        </View>
      </View>
    );
  }

  const activeSlice = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => (
          <Path
            key={i}
            d={p.d}
            stroke={p.color}
            strokeWidth={activeIndex === i ? strokeWidth + 6 : strokeWidth}
            fill="none"
            strokeLinecap="butt"
            onPress={() => setActiveIndex(activeIndex === i ? null : i)}
          />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        {activeSlice ? (
          <>
            <Text style={[styles.donutCenterEmoji]}>{slices[activeIndex!] ? '' : ''}</Text>
            <Text style={[styles.donutCenterAmount, { color: colors.foreground }]}>
              {formatCurrency(activeSlice.value)}
            </Text>
            <Text style={[styles.donutCenterLabel, { color: colors.muted }]}>{activeSlice.label}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.donutCenterAmount, { color: colors.foreground }]}>
              {formatCurrency(total)}
            </Text>
            <Text style={[styles.donutCenterLabel, { color: colors.muted }]}>Total</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function DailyBarChart({
  year,
  month,
  dailyData,
  maxValue,
  barColor,
  colors,
}: {
  year: number;
  month: number;
  dailyData: Record<number, number>;
  maxValue: number;
  barColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const chartHeight = 80;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barChartScroll}>
      {days.map(day => {
        const value = dailyData[day] || 0;
        const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
        return (
          <View key={day} style={styles.barItem}>
            <View style={[styles.barBackground, { height: chartHeight }]}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.barLabel, { color: colors.muted }]}>{day}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Analyse Screen ───────────────────────────────────────────────────────────

export default function AnalyseScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [showDailyChart, setShowDailyChart] = useState(false);

  const monthTransactions = useMemo(() =>
    state.transactions.filter(t => isSameMonth(t.date, year, month)),
    [state.transactions, year, month]
  );

  const summary = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of monthTransactions) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo((): CategoryWithTotal[] => {
    const filtered = monthTransactions.filter(t => t.type === activeType);
    const total = filtered.reduce((s, t) => s + t.amount, 0);
    const map: Record<string, number> = {};
    for (const t of filtered) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = state.categories.find(c => c.id === catId);
        return {
          ...(cat || { id: catId, name: 'Unknown', type: activeType, icon: '❓', color: '#999', isDefault: false, sortOrder: 99, createdAt: '' }),
          total: amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          count: filtered.filter(t => t.categoryId === catId).length,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthTransactions, activeType, state.categories]);

  const donutSlices = categoryBreakdown.map(c => ({
    value: c.total,
    color: c.color,
    label: c.name,
  }));

  const activeTotal = activeType === 'expense' ? summary.expense : summary.income;

  // Daily data
  const dailyData = useMemo(() => {
    const data: Record<number, number> = {};
    for (const t of monthTransactions) {
      if (t.type === activeType) {
        const day = parseInt(t.date.split('-')[2]);
        data[day] = (data[day] || 0) + t.amount;
      }
    }
    return data;
  }, [monthTransactions, activeType]);

  const maxDailyValue = Math.max(...Object.values(dailyData), 0);

  const handleNavigateMonth = (dir: 1 | -1) => {
    const next = navigateMonth(year, month, dir);
    setYear(next.year);
    setMonth(next.month);
  };

  const balanceColor = summary.balance >= 0 ? colors.income : colors.expense;

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: colors.income + '15', borderColor: colors.income + '40' }]}>
            <Text style={[styles.summaryCardLabel, { color: colors.income }]}>INCOME</Text>
            <Text style={[styles.summaryCardValue, { color: colors.income }]}>
              {formatCurrency(summary.income)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.expense + '15', borderColor: colors.expense + '40' }]}>
            <Text style={[styles.summaryCardLabel, { color: colors.expense }]}>EXPENSE</Text>
            <Text style={[styles.summaryCardValue, { color: colors.expense }]}>
              {formatCurrency(summary.expense)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: balanceColor + '15', borderColor: balanceColor + '40' }]}>
            <Text style={[styles.summaryCardLabel, { color: balanceColor }]}>BALANCE</Text>
            <Text style={[styles.summaryCardValue, { color: balanceColor }]}>
              {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
            </Text>
          </View>
        </View>

        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['expense', 'income'] as const).map(t => (
            <Pressable
              key={t}
              style={[
                styles.typeToggleBtn,
                activeType === t && {
                  backgroundColor: t === 'expense' ? colors.expense : colors.income,
                },
              ]}
              onPress={() => setActiveType(t)}
            >
              <Text style={[
                styles.typeToggleBtnText,
                { color: activeType === t ? '#fff' : colors.muted },
              ]}>
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Donut Chart */}
        <View style={styles.chartContainer}>
          <DonutChart
            slices={donutSlices}
            total={activeTotal}
            size={220}
            strokeWidth={38}
            colors={colors}
          />
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 ? (
          <View style={[styles.breakdownContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Breakdown</Text>
            {categoryBreakdown.map((cat, i) => (
              <View key={cat.id} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.breakdownIcon, { backgroundColor: cat.color + '20' }]}>
                  <Text style={styles.breakdownEmoji}>{cat.icon}</Text>
                </View>
                <View style={styles.breakdownInfo}>
                  <View style={styles.breakdownTopRow}>
                    <Text style={[styles.breakdownName, { color: colors.foreground }]}>{cat.name}</Text>
                    <Text style={[styles.breakdownAmount, { color: colors.foreground }]}>
                      {formatCurrency(cat.total)}
                    </Text>
                  </View>
                  <View style={styles.breakdownBottomRow}>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressBar, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                    </View>
                    <Text style={[styles.breakdownPct, { color: colors.muted }]}>
                      {cat.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataEmoji}>📊</Text>
            <Text style={[styles.noDataText, { color: colors.muted }]}>
              No {activeType} data for this month
            </Text>
          </View>
        )}

        {/* Daily Bar Chart */}
        <Pressable
          style={[styles.dailyChartToggle, { borderTopColor: colors.border, borderBottomColor: colors.border }]}
          onPress={() => setShowDailyChart(!showDailyChart)}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Spending</Text>
          <IconSymbol
            name={showDailyChart ? 'chevron.left' : 'chevron.right'}
            size={18}
            color={colors.muted}
            style={{ transform: [{ rotate: showDailyChart ? '90deg' : '-90deg' }] }}
          />
        </Pressable>

        {showDailyChart && (
          <View style={[styles.dailyChartContainer, { backgroundColor: colors.background }]}>
            {maxDailyValue > 0 ? (
              <DailyBarChart
                year={year}
                month={month}
                dailyData={dailyData}
                maxValue={maxDailyValue}
                barColor={activeType === 'expense' ? colors.expense : colors.income}
                colors={colors}
              />
            ) : (
              <Text style={[styles.noDataText, { color: colors.muted, textAlign: 'center', padding: 20 }]}>
                No data to display
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  navBtn: { padding: 8 },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  summaryCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  donutEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  donutCenterEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  breakdownContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  breakdownIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownEmoji: {
    fontSize: 20,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPct: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
  },
  dailyChartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  dailyChartContainer: {
    paddingVertical: 16,
  },
  barChartScroll: {
    paddingHorizontal: 16,
    gap: 4,
    alignItems: 'flex-end',
  },
  barItem: {
    alignItems: 'center',
    width: 24,
  },
  barBackground: {
    width: 16,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
  },
});
