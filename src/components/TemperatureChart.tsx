// src/components/TemperatureChart.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { parseISO, format } from 'date-fns';
import { HealthEvent } from '../types';
import { Colors, Spacing, Radius } from '../utils/theme';

interface TemperatureChartProps {
  events: HealthEvent[];
  color: string;
}

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 220;
const MAX_LABELS = 7;

export const TemperatureChart: React.FC<TemperatureChartProps> = ({ events, color }) => {
  const points = useMemo(() => {
    return events
      .filter((e) => e.event_type === 'temperature' && e.numeric_value !== null)
      .sort((a, b) => parseISO(a.occurred_at).getTime() - parseISO(b.occurred_at).getTime());
  }, [events]);

  if (points.length < 2) return null;

  const values = points.map((e) => e.numeric_value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Show at most MAX_LABELS labels, blank the rest to avoid overlap
  const step = points.length > MAX_LABELS ? Math.ceil(points.length / MAX_LABELS) : 1;
  const labels = points.map((e, i) =>
    i % step === 0 ? format(parseISO(e.occurred_at), 'dd/MM') : ''
  );

  const profileColor = color;

  const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(120, 120, 120, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(60, 60, 60, ${opacity})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: profileColor,
    },
    propsForBackgroundLines: {
      stroke: Colors.border,
      strokeDasharray: '',
    },
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>🌡️ Températures</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: values,
              color: () => profileColor,
              strokeWidth: 2,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        bezier
        withDots
        withInnerLines
        withOuterLines={false}
        withHorizontalLabels
        withVerticalLabels
        style={styles.chart}
      />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{min.toFixed(1).replace('.', ',')}°C</Text>
          <Text style={styles.statLabel}>Min</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{max.toFixed(1).replace('.', ',')}°C</Text>
          <Text style={styles.statLabel}>Max</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avg.toFixed(1).replace('.', ',')}°C</Text>
          <Text style={styles.statLabel}>Moy.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{points.length}</Text>
          <Text style={styles.statLabel}>Mesures</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  chart: {
    borderRadius: Radius.md,
    marginLeft: -Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: Colors.text },

  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
});
