import { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ARCADE_COLORS } from '@/constants/theme';

export interface LineChartPoint {
  label: string;
  value: number;
}

const PLOT_TOP = 8;
const LABEL_HEIGHT = 20;
const GRID_LINES = 3;

export function LineChart({
  data,
  color = ARCADE_COLORS.primary,
  height = 140,
  showArea = true,
  emptyMessage = 'Sem dados para exibir.',
}: {
  data: LineChartPoint[];
  color?: string;
  height?: number;
  showArea?: boolean;
  emptyMessage?: string;
}) {
  const [width, setWidth] = useState(0);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const plotHeight = height - LABEL_HEIGHT - PLOT_TOP;

  const geometry = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.value), 1);
    const lastIndex = data.length - 1;
    const step = lastIndex === 0 ? 0 : width / lastIndex;

    const points = data.map((point, index) => ({
      x: lastIndex === 0 ? width / 2 : index * step,
      y: PLOT_TOP + plotHeight - (point.value / max) * plotHeight,
    }));

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');

    const area = `${line} L${width.toFixed(2)},${PLOT_TOP + plotHeight} L0,${
      PLOT_TOP + plotHeight
    } Z`;

    // Evita poluir séries longas: 1 label a cada N pontos.
    const labelStep = Math.max(1, Math.ceil(data.length / 7));

    return { points, line, area, labelStep };
  }, [data, width, plotHeight]);

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== width) setWidth(nextWidth);
  }

  if (data.length === 0) {
    return (
      <ThemedText
        type="small"
        style={{ color: ARCADE_COLORS.textSecondary, textAlign: 'center', paddingVertical: 16 }}>
        {emptyMessage}
      </ThemedText>
    );
  }

  return (
    <View onLayout={handleLayout} style={{ height }}>
      {geometry && (
        <>
          <Svg width={width} height={height - LABEL_HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.45} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {Array.from({ length: GRID_LINES }, (_, i) => {
              const y = PLOT_TOP + (plotHeight / GRID_LINES) * (i + 1);
              return (
                <Line
                  key={`grid-${i}`}
                  x1={0}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
              );
            })}

            {showArea && <Path d={geometry.area} fill={`url(#${gradientId})`} />}

            <Path
              d={geometry.line}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {geometry.points.map((point, index) => (
              <Circle
                key={`dot-${index}`}
                cx={point.x}
                cy={point.y}
                r={3}
                fill={color}
                stroke={ARCADE_COLORS.bgApp}
                strokeWidth={1.5}
              />
            ))}
          </Svg>

          <View style={styles.labels}>
            {data.map((point, index) => {
              const visible =
                index % geometry.labelStep === 0 || index === data.length - 1;
              return (
                <View
                  key={`label-${index}`}
                  style={[
                    styles.labelSlot,
                    index === 0 && styles.labelSlotFirst,
                    index === data.length - 1 && styles.labelSlotLast,
                  ]}>
                  <ThemedText type="code" style={styles.label} numberOfLines={1}>
                    {visible ? point.label : ' '}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    height: LABEL_HEIGHT,
    flexDirection: 'row',
  },
  labelSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSlotFirst: {
    alignItems: 'flex-start',
  },
  labelSlotLast: {
    alignItems: 'flex-end',
  },
  label: {
    color: ARCADE_COLORS.textSecondary,
    fontSize: 10,
  },
});
