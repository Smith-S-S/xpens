import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, PanResponder, LayoutChangeEvent,
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
  cumulative: number;
  hasData: boolean;
}

export interface BalanceSummaryChartProps {
  year: number;
  month: number;
  transactions: Transaction[];
  summary: { income: number; expense: number; total: number };
  currency: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 110;
const PADDING_V = 16;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BalanceSummaryChart({
  year, month, transactions, summary, currency,
}: BalanceSummaryChartProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const gradId = useRef('balGrad_' + Math.random().toString(36).slice(2)).current;
  const chartWidthRef = useRef(0);

  // ── Daily cumulative points ──────────────────────────────────────────────
  const dailyPoints = useMemo((): DailyPoint[] => {
    const daysCount = getDaysInMonth(year, month);
    const dailyNet: Record<number, number> = {};
    for (const t of transactions) {
      if (!isSameMonth(t.date, year, month)) continue;
      const day = parseInt(t.date.split('-')[2], 10);
      if (!dailyNet[day]) dailyNet[day] = 0;
      if (t.type === 'income') dailyNet[day] += t.amount;
      else if (t.type === 'expense') dailyNet[day] -= t.amount;
    }
    const points: DailyPoint[] = [];
    let running = 0;
    for (let d = 1; d <= daysCount; d++) {
      running += dailyNet[d] ?? 0;
      points.push({ day: d, cumulative: running, hasData: d in dailyNet });
    }
    return points;
  }, [transactions, year, month]);

  // ── Previous month % change ──────────────────────────────────────────────
  const pctChange = useMemo(() => {
    const prev = navigateMonth(year, month, -1);
    let prevIncome = 0, prevExpense = 0;
    for (const t of transactions) {
      if (!isSameMonth(t.date, prev.year, prev.month)) continue;
      if (t.type === 'income') prevIncome += t.amount;
      else if (t.type === 'expense') prevExpense += t.amount;
    }
    const prevNet = prevIncome - prevExpense;
    const currentNet = summary.total;
    if (prevNet === 0) {
      return { value: null, isPositive: currentNet >= 0, label: 'New' };
    }
    const pct = ((currentNet - prevNet) / Math.abs(prevNet)) * 100;
    return {
      value: Math.abs(pct),
      isPositive: pct >= 0,
      label: `${Math.abs(pct).toFixed(1)}%`,
    };
  }, [transactions, year, month, summary.total]);

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const svgData = useMemo(() => {
    if (chartWidth === 0 || dailyPoints.length < 2) return null;
    const N = dailyPoints.length;
    const cumulatives = dailyPoints.map(p => p.cumulative);
    const yMin = Math.min(...cumulatives, 0);
    const yMax = Math.max(...cumulatives, 0);
    const yRange = yMax - yMin || 1;
    const totalH = CHART_HEIGHT + PADDING_V * 2;

    const svgX = (i: number) => (i / (N - 1)) * chartWidth;
    const svgY = (val: number) =>
      PADDING_V + (1 - (val - yMin) / yRange) * CHART_HEIGHT;

    const zeroY = svgY(0);
    const xs = dailyPoints.map((_, i) => svgX(i));
    const ys = dailyPoints.map(p => svgY(p.cumulative));

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

    return { xs, ys, zeroY, linePath, areaPath, totalH };
  }, [chartWidth, dailyPoints]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const updateActive = (x: number) => {
    const w = chartWidthRef.current;
    if (w === 0 || dailyPoints.length === 0) return;
    const idx = Math.round((x / w) * (dailyPoints.length - 1));
    setActiveIndex(Math.max(0, Math.min(idx, dailyPoints.length - 1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (evt) => updateActive(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateActive(evt.nativeEvent.locationX),
      onPanResponderRelease: () => setActiveIndex(null),
      onPanResponderTerminate: () => setActiveIndex(null),
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    chartWidthRef.current = w;
    setChartWidth(w);
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const activePoint = activeIndex !== null ? dailyPoints[activeIndex] : null;
  const activeX = svgData && activeIndex !== null ? svgData.xs[activeIndex] : null;
  const activeY = svgData && activeIndex !== null ? svgData.ys[activeIndex] : null;

  const tooltipWidth = 100;
  const tooltipLeft =
    activeX !== null
      ? Math.max(8, Math.min(activeX - tooltipWidth / 2, chartWidth - tooltipWidth - 8))
      : 0;

  const tooltipDate = activePoint
    ? formatDateHeader(
        `${year}-${String(month).padStart(2, '0')}-${String(activePoint.day).padStart(2, '0')}`
      )
    : '';

  const pctArrow = pctChange.isPositive ? '↑' : '↓';
  const pctLabel =
    pctChange.value !== null
      ? `${pctArrow} ${pctChange.label}`
      : `${pctArrow} New`;
  const pctColor =
    pctChange.value !== null
      ? pctChange.isPositive ? colors.income : colors.expense
      : colors.muted;

  const isEmpty = dailyPoints.every(p => p.cumulative === 0);
  const totalH = svgData?.totalH ?? CHART_HEIGHT + PADDING_V * 2;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Your Balance</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Net Balance</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatCurrency(summary.total, currency)}
          </Text>
          <Text style={[styles.pct, { color: pctColor }]}>{pctLabel}</Text>
        </View>
      </View>

      {/* Chart */}
      <View
        onLayout={handleLayout}
        {...panResponder.panHandlers}
        style={[styles.chartArea, { height: totalH }]}
      >
        {chartWidth > 0 && (
          <Svg width={chartWidth} height={totalH}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {isEmpty ? (
              <>
                <Line
                  x1={0} y1={totalH / 2}
                  x2={chartWidth} y2={totalH / 2}
                  stroke={colors.border} strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <SvgText
                  x={chartWidth / 2} y={totalH / 2 - 10}
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
                  x1={0} y1={svgData.zeroY}
                  x2={chartWidth} y2={svgData.zeroY}
                  stroke={colors.border} strokeWidth={0.5}
                  strokeDasharray="4 4"
                />
                {/* Area fill */}
                <Path d={svgData.areaPath} fill={`url(#${gradId})`} />
                {/* Line stroke */}
                <Path
                  d={svgData.linePath}
                  stroke={colors.primary}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Active vertical line */}
                {activeX !== null && (
                  <Line
                    x1={activeX} y1={0}
                    x2={activeX} y2={totalH}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                )}
                {/* Active dot */}
                {activeX !== null && activeY !== null && (
                  <Circle
                    cx={activeX} cy={activeY}
                    r={5} fill="#FFFFFF"
                    stroke={colors.primary} strokeWidth={2}
                  />
                )}
              </>
            ) : null}
          </Svg>
        )}

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
            <Text style={[styles.tooltipDate, { color: colors.muted }]}>{tooltipDate}</Text>
            <Text style={[styles.tooltipAmount, { color: colors.foreground }]}>
              {formatCurrency(activePoint.cumulative, currency)}
            </Text>
          </View>
        )}
      </View>
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
  chartArea: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 0.5,
    width: 100,
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
