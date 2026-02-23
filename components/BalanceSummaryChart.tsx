import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, PanResponder, ScrollView,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop,
  Path, Circle, Line,
  Text as SvgText,
} from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';
import { Transaction } from '@/lib/types';
import {
  formatCurrency, formatDateHeader,
  getDaysInMonth, isSameMonth, navigateMonth,
} from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyPoint {
  day: number;
  amount: number;   // expense for that specific day
  hasData: boolean;
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export interface BalanceSummaryChartProps {
  year: number;
  month: number;
  transactions: Transaction[];
  summary: { income: number; expense: number; total: number };
  currency: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH    = 50;   // px per day column — ~7-8 days visible at once
const CHART_HEIGHT = 110;
const PADDING_V    = 14;
const AXIS_HEIGHT  = 32;   // two lines: day number + month abbrev
const TOTAL_H      = CHART_HEIGHT + PADDING_V * 2 + AXIS_HEIGHT;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BalanceSummaryChart({
  year, month, transactions, summary, currency,
}: BalanceSummaryChartProps) {
  const colors  = useColors();
  const gradId  = useRef('balGrad_' + Math.random().toString(36).slice(2)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // ── Daily spending points (expense per day, last 15 days up to today) ────
  const dailyPoints = useMemo((): DailyPoint[] => {
    const today     = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay  = today.getDate();

    // Cap at today for the current month; otherwise use all days of the month
    const isCurrentMonth = year === todayYear && month === todayMonth;
    const daysCount = isCurrentMonth ? todayDay : getDaysInMonth(year, month);

    const dailyExpense: Record<number, number> = {};
    for (const t of transactions) {
      if (!isSameMonth(t.date, year, month)) continue;
      if (t.type !== 'expense') continue;
      const day = parseInt(t.date.split('-')[2], 10);
      dailyExpense[day] = (dailyExpense[day] ?? 0) + t.amount;
    }
    const points: DailyPoint[] = [];
    for (let d = 1; d <= daysCount; d++) {
      points.push({ day: d, amount: dailyExpense[d] ?? 0, hasData: d in dailyExpense });
    }
    // Keep last 15 days
    return points.slice(-15);
  }, [transactions, year, month]);

  // Auto-scroll to end (most recent day) whenever data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [dailyPoints]);

  // ── Previous month % change (expense vs expense) ────────────────────────
  const pctChange = useMemo(() => {
    const prev = navigateMonth(year, month, -1);
    let prevExpense = 0;
    for (const t of transactions) {
      if (!isSameMonth(t.date, prev.year, prev.month)) continue;
      if (t.type === 'expense') prevExpense += t.amount;
    }
    const currentExpense = summary.expense;
    if (prevExpense === 0) {
      return { value: null, isPositive: false, label: 'New' };
    }
    const pct = ((currentExpense - prevExpense) / prevExpense) * 100;
    // Spending up = bad (red ↑), spending down = good (green ↓)
    return {
      value: Math.abs(pct),
      isPositive: pct <= 0,   // less spending this month = positive
      label: `${Math.abs(pct).toFixed(1)}%`,
    };
  }, [transactions, year, month, summary.expense]);

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const svgData = useMemo(() => {
    const N = dailyPoints.length;
    if (N < 2) return null;

    const totalWidth = N * DAY_WIDTH;
    const amounts    = dailyPoints.map(p => p.amount);
    const yMin   = 0;
    const yMax   = Math.max(...amounts, 1);
    const yRange = yMax - yMin;

    // Center each point in its column
    const svgX = (i: number) => i * DAY_WIDTH + DAY_WIDTH / 2;
    const svgY = (val: number) =>
      PADDING_V + (1 - (val - yMin) / yRange) * CHART_HEIGHT;

    const zeroY = svgY(0);
    const xs = dailyPoints.map((_, i) => svgX(i));
    const ys = dailyPoints.map(p => svgY(p.amount));

    // Catmull-Rom → cubic bezier smooth curve
    let linePath = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
    for (let i = 0; i < N - 1; i++) {
      const x0 = xs[i > 0 ? i - 1 : i];
      const y0 = ys[i > 0 ? i - 1 : i];
      const x1 = xs[i];
      const y1 = ys[i];
      const x2 = xs[i + 1];
      const y2 = ys[i + 1];
      const x3 = xs[i + 2 < N ? i + 2 : i + 1];
      const y3 = ys[i + 2 < N ? i + 2 : i + 1];

      const cp1x = x1 + (x2 - x0) / 6;
      const cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6;
      const cp2y = y2 - (y3 - y1) / 6;

      linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }

    const areaPath =
      linePath +
      ` L ${xs[N - 1].toFixed(2)} ${zeroY.toFixed(2)}` +
      ` L ${xs[0].toFixed(2)} ${zeroY.toFixed(2)} Z`;

    return { xs, ys, zeroY, linePath, areaPath, totalWidth };
  }, [dailyPoints]);

  // ── Touch (PanResponder on inner content view) ─────────────────────────────
  const updateActive = (x: number) => {
    if (dailyPoints.length === 0 || !svgData) return;
    // x is absolute within the full-width content view
    const idx = Math.round((x - DAY_WIDTH / 2) / DAY_WIDTH);
    setActiveIndex(Math.max(0, Math.min(idx, dailyPoints.length - 1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant:    (evt) => updateActive(evt.nativeEvent.locationX),
      onPanResponderMove:     (evt) => updateActive(evt.nativeEvent.locationX),
      onPanResponderRelease:  () => setActiveIndex(null),
      onPanResponderTerminate:() => setActiveIndex(null),
    })
  ).current;

  // ── Derived display values ─────────────────────────────────────────────────
  const activePoint = activeIndex !== null ? dailyPoints[activeIndex]     : null;
  const activeX     = svgData && activeIndex !== null ? svgData.xs[activeIndex] : null;
  const activeY     = svgData && activeIndex !== null ? svgData.ys[activeIndex] : null;
  const monthAbbrev = SHORT_MONTHS[month - 1];

  const tooltipWidth = 108;
  const tooltipLeft  =
    activeX !== null && svgData
      ? Math.max(4, Math.min(activeX - tooltipWidth / 2, svgData.totalWidth - tooltipWidth - 4))
      : 0;

  const tooltipDate = activePoint
    ? formatDateHeader(
        `${year}-${String(month).padStart(2, '0')}-${String(activePoint.day).padStart(2, '0')}`
      )
    : '';

  const pctArrow = pctChange.isPositive ? '↑' : '↓';
  const pctLabel = pctChange.value !== null ? `${pctArrow} ${pctChange.label}` : `${pctArrow} New`;
  const pctColor =
    pctChange.value !== null
      ? pctChange.isPositive ? colors.income : colors.expense
      : colors.muted;

  const isEmpty     = dailyPoints.every(p => p.amount === 0);
  const totalWidth  = svgData?.totalWidth ?? dailyPoints.length * DAY_WIDTH;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title,    { color: colors.foreground }]}>Your Expense</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Daily Spending</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatCurrency(summary.expense, currency)}
          </Text>
          <Text style={[styles.pct, { color: pctColor }]}>{pctLabel}</Text>
        </View>
      </View>

      {/* Scrollable chart */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Full-width content — PanResponder lives here */}
        <View
          style={{ width: totalWidth, height: TOTAL_H, position: 'relative' }}
          {...panResponder.panHandlers}
        >
          <Svg width={totalWidth} height={TOTAL_H}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%"   stopColor={colors.primary} stopOpacity={0.45} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0}    />
              </LinearGradient>
            </Defs>

            {isEmpty ? (
              <>
                <Line
                  x1={0}          y1={PADDING_V + CHART_HEIGHT / 2}
                  x2={totalWidth} y2={PADDING_V + CHART_HEIGHT / 2}
                  stroke={colors.border} strokeWidth={1.5} strokeDasharray="6 4"
                />
                <SvgText
                  x={totalWidth / 2}
                  y={PADDING_V + CHART_HEIGHT / 2 - 10}
                  textAnchor="middle"
                  fill={colors.muted}
                  fontSize={12}
                >
                  No data yet
                </SvgText>
              </>
            ) : svgData ? (
              <>
                {/* Zero baseline */}
                <Line
                  x1={0} y1={svgData.zeroY} x2={totalWidth} y2={svgData.zeroY}
                  stroke={colors.border} strokeWidth={0.5} strokeDasharray="4 4"
                />
                {/* Area fill */}
                <Path d={svgData.areaPath} fill={`url(#${gradId})`} />
                {/* Line stroke */}
                <Path
                  d={svgData.linePath}
                  stroke={colors.primary} strokeWidth={2.5}
                  fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Active vertical line */}
                {activeX !== null && (
                  <Line
                    x1={activeX} y1={0} x2={activeX} y2={TOTAL_H}
                    stroke="rgba(255,255,255,0.12)" strokeWidth={1}
                  />
                )}
                {/* Active dot */}
                {activeX !== null && activeY !== null && (
                  <Circle
                    cx={activeX} cy={activeY}
                    r={5} fill="#FFFFFF" stroke={colors.primary} strokeWidth={2}
                  />
                )}
                {/* X-axis labels: day number + month abbreviation */}
                {dailyPoints.map((p, i) => {
                  const isActive = activeIndex === i;
                  const labelColor = isActive ? colors.primary : colors.muted;
                  const labelWeight = isActive ? '700' : '400';
                  const baseY = PADDING_V + CHART_HEIGHT + 14;
                  return (
                    <React.Fragment key={p.day}>
                      <SvgText
                        x={svgData.xs[i]} y={baseY}
                        textAnchor="middle"
                        fill={labelColor} fontSize={11}
                        fontWeight={labelWeight}
                      >
                        {p.day}
                      </SvgText>
                      <SvgText
                        x={svgData.xs[i]} y={baseY + 14}
                        textAnchor="middle"
                        fill={labelColor} fontSize={9}
                        fontWeight={labelWeight}
                      >
                        {monthAbbrev}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </>
            ) : null}
          </Svg>

          {/* Tooltip overlay */}
          {activePoint && svgData && (
            <View
              style={[
                styles.tooltip,
                {
                  left: tooltipLeft,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.tooltipDate,   { color: colors.muted }]}>{tooltipDate}</Text>
              <Text style={[styles.tooltipAmount,  { color: colors.foreground }]}>
                {formatCurrency(activePoint.amount, currency)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    overflow: 'hidden',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
  },
  pct: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  tooltip: {
    position: 'absolute',
    top: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 0.5,
    width: 108,
  },
  tooltipDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  tooltipAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
});
