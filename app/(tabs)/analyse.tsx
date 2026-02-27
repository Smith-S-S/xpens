import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/AppContext';
import { useColors } from '@/hooks/use-colors';
import {
  formatCurrency, formatMonthYear, isSameMonth, navigateMonth,
  getDaysInMonth,
} from '@/lib/format';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryWithTotal } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function petalPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  const { x: ix1, y: iy1 } = polarToXY(cx, cy, innerR, startAngle);
  const { x: ox1, y: oy1 } = polarToXY(cx, cy, outerR, startAngle);
  const { x: ox2, y: oy2 } = polarToXY(cx, cy, outerR, endAngle);
  const { x: ix2, y: iy2 } = polarToXY(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return (
    `M ${ix1} ${iy1} ` +
    `L ${ox1} ${oy1} ` +
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} ` +
    `L ${ix2} ${iy2} ` +
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
  );
}

function formatShort(n: number, currency = ''): string {
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toFixed(0)}`;
}

// ─── Flower Chart ─────────────────────────────────────────────────────────────

interface FlowerSlice {
  value: number;
  color: string;
  label: string;
  icon: string;
  percentage: number;
}

// Always render this many slots so the chart is always a full circle
const TOTAL_SLOTS = 8;
const FULL_ANGLE = (2 * Math.PI) / TOTAL_SLOTS; // 45° each

function FlowerChart({
  slices,
  total,
  size = 280,
  colors,
  currency = '$',
}: {
  slices: FlowerSlice[];
  total: number;
  size?: number;
  colors: ReturnType<typeof useColors>;
  currency?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const innerR   = Math.round(size * 0.155); // center hole — larger for readable text
  const maxOuter = size * 0.44;              // max petal reach
  const minOuter = size * 0.28;              // min petal reach (data)
  const ghostOuter = size * 0.30;            // ghost petal reach (no data)
  const expandBy = size * 0.055;             // how much active petal expands
  const gapRad = 0.05;

  // Top 8 by value; remaining slots become ghost petals
  const topSlices = slices.slice(0, TOTAL_SLOTS);
  const maxVal = Math.max(...topSlices.map(s => s.value), 1);
  const hasActive = activeIndex !== null;
  const activeSlice = hasActive ? (topSlices[activeIndex!] ?? null) : null;

  const handlePress = (i: number) => {
    setActiveIndex(prev => (prev === i ? null : i));
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
          const cAngle = (i / TOTAL_SLOTS) * 2 * Math.PI - Math.PI / 2;
          const sAngle = cAngle - FULL_ANGLE / 2 + gapRad;
          const eAngle = cAngle + FULL_ANGLE / 2 - gapRad;
          const slice = topSlices[i] ?? null;

          if (!slice) {
            return (
              <Path
                key={i}
                d={petalPath(cx, cy, innerR, ghostOuter, sAngle, eAngle)}
                fill={colors.border}
                opacity={hasActive ? 0.10 : 0.22}
              />
            );
          }

          const isActive = activeIndex === i;
          const baseOuter = minOuter + (slice.value / maxVal) * (maxOuter - minOuter);
          const outerR = isActive ? baseOuter + expandBy : baseOuter;
          const opacity = hasActive ? (isActive ? 1.0 : 0.35) : 0.88;

          const midAngle = (sAngle + eAngle) / 2;
          const labelR = innerR + (outerR - innerR) * 0.52;
          const lp = polarToXY(cx, cy, labelR, midAngle);
          const showLabel = !isActive && (outerR - innerR > 20);

          return (
            <G key={i} onPress={() => handlePress(i)}>
              {/* Invisible hit-area for easier tapping */}
              <Path
                d={petalPath(cx, cy, innerR - 4, baseOuter + expandBy + 6, sAngle, eAngle)}
                fill="transparent"
              />

              {/* Glow layers behind active petal */}
              {isActive && (
                <>
                  <Path
                    d={petalPath(cx, cy, Math.max(innerR - 5, 0), outerR + 18, sAngle, eAngle)}
                    fill={slice.color}
                    opacity={0.08}
                  />
                  <Path
                    d={petalPath(cx, cy, Math.max(innerR - 3, 0), outerR + 10, sAngle, eAngle)}
                    fill={slice.color}
                    opacity={0.15}
                  />
                  <Path
                    d={petalPath(cx, cy, innerR, outerR + 4, sAngle, eAngle)}
                    fill={slice.color}
                    opacity={0.25}
                  />
                </>
              )}

              {/* Actual visible petal */}
              <Path
                d={petalPath(cx, cy, innerR, outerR, sAngle, eAngle)}
                fill={slice.color}
                opacity={opacity}
              />

              {showLabel && (
                <>
                  <SvgText
                    x={lp.x}
                    y={lp.y - 5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {formatShort(slice.value, currency)}
                  </SvgText>
                  <SvgText
                    x={lp.x}
                    y={lp.y + 7}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.72)"
                    fontSize={8}
                  >
                    {slice.label.length > 8 ? slice.label.slice(0, 7) + '…' : slice.label}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Center label — shows selected category or overall total */}
      <View
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        pointerEvents="none"
      >
        {activeSlice ? (
          <>
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{activeSlice.icon}</Text>
            <Text style={{ color: activeSlice.color, fontSize: 12, fontWeight: '800' }}>
              {formatShort(activeSlice.value, currency)}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 8, fontWeight: '600', marginTop: 1 }}>
              {activeSlice.percentage.toFixed(0)}%
            </Text>
          </>
        ) : total > 0 ? (
          <>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '800' }}>
              {formatShort(total, currency)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 9 }}>Total</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 11 }}>No data</Text>
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
  const { state, setCurrency } = useApp();
  const currency = state.currency;
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

  const flowerSlices: FlowerSlice[] = categoryBreakdown.map(c => ({
    value: c.total,
    color: c.color,
    label: c.name,
    icon: c.icon,
    percentage: c.percentage,
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
        {/* ── Statistics Header ── */}
        <View style={styles.statisticHeader}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total Balance</Text>
          <Text style={[styles.statBalance, { color: colors.foreground }]}>
            {formatCurrency(summary.balance, currency)}
          </Text>
        </View>

        {/* ── Income / Expense Cards ── */}
        <View style={styles.statCardsRow}>
          <LinearGradient
            colors={['#1a3a2a', '#0d2018']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, { borderColor: colors.income + '40' }]}
          >
            <View style={[styles.statCardIconBg, { backgroundColor: colors.income + '25' }]}>
              <IconSymbol name="arrow.down" size={16} color={colors.income} />
            </View>
            <View style={styles.statCardText}>
              <Text style={[styles.statCardTitle, { color: colors.income + 'AA' }]}>Income</Text>
              <Text style={[styles.statCardAmount, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summary.income, currency)}
              </Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#3a1a1a', '#200d0d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, { borderColor: colors.expense + '40' }]}
          >
            <View style={[styles.statCardIconBg, { backgroundColor: colors.expense + '25' }]}>
              <IconSymbol name="arrow.up" size={16} color={colors.expense} />
            </View>
            <View style={styles.statCardText}>
              <Text style={[styles.statCardTitle, { color: colors.expense + 'AA' }]}>Expense</Text>
              <Text style={[styles.statCardAmount, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summary.expense, currency)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Type Toggle ── */}
        <View style={styles.typeToggleRow}>
          {(['expense', 'income'] as const).map(t => {
            const isActive = activeType === t;
            const glowColor = t === 'expense' ? colors.expense : colors.income;
            const gradientColors: [string, string] = t === 'expense'
              ? ['#FF6B6B', '#C0392B']
              : ['#56FFB8', '#00C97A'];
            return (
              <Pressable
                key={t}
                style={[
                  styles.typeToggleBtn,
                  {
                    borderColor: isActive ? glowColor : colors.border,
                    shadowColor: isActive ? glowColor : 'transparent',
                    overflow: 'hidden',
                  },
                ]}
                onPress={() => setActiveType(t)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.typeToggleBtnGradient}
                  >
                    <Text style={[styles.typeToggleBtnText, { color: '#fff' }]}>
                      {t.toUpperCase()}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.typeToggleBtnGradient, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.typeToggleBtnText, { color: colors.muted }]}>
                      {t.toUpperCase()}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Flower Chart */}
        <View style={styles.chartContainer}>
          <FlowerChart
            slices={flowerSlices}
            total={activeTotal}
            size={280}
            colors={colors}
            currency={currency}
          />
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 ? (
          <View style={[styles.breakdownContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Breakdown</Text>
            {categoryBreakdown.map(cat => (
              <View key={cat.id} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.breakdownIcon, { backgroundColor: cat.color + '22' }]}>
                  <CategoryIcon icon={cat.icon} size={24} />
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
  statisticHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 14,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  statBalance: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statCardText: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  statCardAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  typeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  typeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 8,
  },
  typeToggleBtnGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  typeToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
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
