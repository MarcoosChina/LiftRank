import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ARCADE_COLORS } from '@/constants/theme';

export interface LineChartPoint {
  label: string;
  value: number;
}

const PLOT_TOP = 8;
const LABEL_HEIGHT = 20;
const GRID_LINES = 3;
const LINE_THICKNESS = 2.5;
const DOT_SIZE = 6;
const AREA_COLUMN_WIDTH = 4;
const AREA_OPACITY = 0.18;

/**
 * Gráfico de linha com área preenchida construído apenas com Views.
 * Sem dependência nativa — funciona em qualquer build (Expo Go e dev client).
 */
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

  const plotHeight = height - LABEL_HEIGHT - PLOT_TOP;

  const geometry = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.value), 1);
    const lastIndex = data.length - 1;
    const step = lastIndex === 0 ? 0 : width / lastIndex;

    // Mantém os pontos afastados das bordas para não cortar os círculos.
    const innerHeight = plotHeight - DOT_SIZE;
    const yFor = (value: number) => DOT_SIZE / 2 + (1 - value / max) * innerHeight;

    const points = data.map((point, index) => ({
      x: lastIndex === 0 ? width / 2 : index * step,
      y: yFor(point.value),
    }));

    const segments = points.slice(1).map((point, index) => {
      const previous = points[index];
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const length = Math.hypot(dx, dy);
      return {
        left: previous.x + dx / 2 - length / 2,
        top: previous.y + dy / 2 - LINE_THICKNESS / 2,
        width: length,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });

    // Área preenchida: colunas finas com a altura interpolada da série.
    const columns: { left: number; height: number }[] = [];
    if (showArea) {
      const columnCount = Math.ceil(width / AREA_COLUMN_WIDTH);
      for (let i = 0; i < columnCount; i += 1) {
        const x = i * AREA_COLUMN_WIDTH;
        let value = data[0].value;
        if (lastIndex === 0) {
          value = data[0].value;
        } else {
          const segmentIndex = Math.min(Math.floor(x / step), lastIndex - 1);
          const previous = points[segmentIndex];
          const next = points[segmentIndex + 1];
          const span = next.x - previous.x;
          const ratio = span === 0 ? 0 : (x - previous.x) / span;
          value =
            data[segmentIndex].value +
            (data[segmentIndex + 1].value - data[segmentIndex].value) * ratio;
        }
        columns.push({
          left: x,
          height: Math.max(plotHeight - yFor(value), 0),
        });
      }
    }

    // Evita poluir séries longas: 1 label a cada N pontos.
    const labelStep = Math.max(1, Math.ceil(data.length / 7));

    return { points, segments, columns, labelStep };
  }, [data, width, plotHeight, showArea]);

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
          <View style={[styles.plot, { height: plotHeight }]}>
            {Array.from({ length: GRID_LINES }, (_, i) => (
              <View
                key={`grid-${i}`}
                style={[
                  styles.gridLine,
                  { top: (plotHeight / GRID_LINES) * (i + 1) },
                ]}
              />
            ))}

            {geometry.columns.map((column, index) => (
              <View
                key={`area-${index}`}
                style={{
                  position: 'absolute',
                  left: column.left,
                  bottom: 0,
                  width: AREA_COLUMN_WIDTH,
                  height: column.height,
                  backgroundColor: color,
                  opacity: AREA_OPACITY,
                }}
              />
            ))}

            {geometry.segments.map((segment, index) => (
              <View
                key={`line-${index}`}
                style={{
                  position: 'absolute',
                  left: segment.left,
                  top: segment.top,
                  width: segment.width,
                  height: LINE_THICKNESS,
                  borderRadius: LINE_THICKNESS / 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${segment.angle}deg` }],
                }}
              />
            ))}

            {geometry.points.map((point, index) => (
              <View
                key={`dot-${index}`}
                style={{
                  position: 'absolute',
                  left: point.x - DOT_SIZE / 2,
                  top: point.y - DOT_SIZE / 2,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: DOT_SIZE / 2,
                  backgroundColor: color,
                  borderWidth: 1.5,
                  borderColor: ARCADE_COLORS.bgApp,
                }}
              />
            ))}
          </View>

          <View style={styles.labels}>
            {data.map((point, index) => {
              const visible = index % geometry.labelStep === 0 || index === data.length - 1;
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
  plot: {
    marginTop: PLOT_TOP,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
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
