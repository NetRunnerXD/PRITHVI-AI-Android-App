import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Circle, Path, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import { useTheme } from '../../context/ThemeContext';

export function SimpleBarChart({
  data,
  color,
  width,
}: {
  data: Array<{ t: string; value: number }>;
  color: string;
  width: number;
}) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const chartH = 60;
  if (!data.length) {
    return <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>No series from API</Text>;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const barW = Math.min(Math.max((width - data.length * 2) / Math.max(data.length, 1), 10), 28);
  const startOffset = Math.max(0, (width - data.length * (barW + 8)) / 2);

  return (
    <Svg width={width} height={chartH + 20} style={{ alignSelf: 'center', marginTop: 8 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, d.value > 0 ? 2 : 0);
        const x = startOffset + i * (barW + 8) + 4;
        const y = chartH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={4} />
            <SvgText x={x + barW / 2} y={chartH + 16} fontSize={9} fill={colors.textMuted} textAnchor="middle">
              {localizeNumber(d.t, i18n.language)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function HourlyBarChart({
  data,
  color,
  width,
  height = 88,
}: {
  data: Array<{ t: string; value: number }>;
  color: string;
  width: number;
  height?: number;
}) {
  const { colors, isDark } = useTheme();
  if (!data.length) {
    return <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>No series from API</Text>;
  }
  const chartH = height;
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const gap = 1;
  const barW = Math.max((width - data.length * gap) / data.length, 1.5);

  // Y-axis grid lines
  const gridLines = [0.25, 0.5, 0.75].map(frac => chartH - frac * chartH);

  return (
    <Svg width={width} height={chartH + 18} style={{ marginTop: 8 }}>
      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <Line key={`grid-${i}`} x1={0} y1={y} x2={width} y2={y}
          stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)'} strokeWidth={0.5} />
      ))}
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, d.value > 0 ? 1.5 : 0);
        const x = i * (barW + gap);
        return (
          <G key={i}>
            <Rect x={x} y={chartH - barH} width={barW} height={barH} fill={color} rx={1} opacity={0.85} />
            {i % Math.max(1, Math.floor(data.length / 6)) === 0 ? (
              <SvgText x={x + barW / 2} y={chartH + 12} fontSize={8} fill={colors.textMuted} textAnchor="middle">
                {d.t}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

export function HourlyLineChart({
  data,
  color,
  width,
  height = 88,
}: {
  data: Array<{ t: string; value: number }>;
  color: string;
  width: number;
  height?: number;
}) {
  const { colors, isDark } = useTheme();
  if (data.length < 2) {
    return <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>No series from API</Text>;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const span = Math.max(maxVal - minVal, 0.01);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - minVal) / span) * height;
    return { x, y };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75].map(frac => height - frac * height);

  return (
    <Svg width={width} height={height + 16} style={{ marginTop: 8 }}>
      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <Line key={`grid-${i}`} x1={0} y1={y} x2={width} y2={y}
          stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)'} strokeWidth={0.5} />
      ))}
      <Path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* Dot markers at data points (sampled) */}
      {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 8)) === 0 || i === pts.length - 1).map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={colors.card} stroke={color} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

export function WindRose({
  bins,
  width = 140,
}: {
  bins: Array<{ dir?: string; label?: string; pct?: number; n?: number; speed?: number }>;
  width?: number;
}) {
  const { colors } = useTheme();
  if (!bins.length) return null;
  const cx = width / 2;
  const cy = width / 2;
  const max = Math.max(...bins.map((b) => Number(b.pct ?? b.n ?? b.speed ?? 0)), 1);
  const rMax = width / 2 - 8;
  return (
    <Svg width={width} height={width}>
      <Circle cx={cx} cy={cy} r={rMax} stroke={colors.border} fill="none" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={rMax * 0.5} stroke={colors.border} fill="none" strokeWidth={0.5} opacity={0.5} />
      {bins.map((b, i) => {
        const ang = (i / bins.length) * Math.PI * 2 - Math.PI / 2;
        const mag = (Number(b.pct ?? b.n ?? b.speed ?? 0) / max) * rMax;
        const x = cx + Math.cos(ang) * mag;
        const y = cy + Math.sin(ang) * mag;
        return <Path key={i} d={`M ${cx} ${cy} L ${x} ${y}`} stroke="#10B981" strokeWidth={3} strokeLinecap="round" />;
      })}
    </Svg>
  );
}

export function WindCompass({ heading, deg }: { heading: string; deg?: number | null }) {
  const { isDark } = useTheme();
  const headingMap: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const rotation = deg ?? headingMap[heading?.toUpperCase()] ?? 0;
  const size = 96;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 44;
  const rInner = 28;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    }}>
      <Svg width={size} height={size}>
        {/* Outer dashed ring */}
        <Circle cx={cx} cy={cy} r={rOuter} stroke={isDark ? '#334155' : '#E2E8F0'} strokeWidth={1} strokeDasharray="3,3" fill="none" />
        {/* Inner solid ring */}
        <Circle cx={cx} cy={cy} r={rInner} stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1} fill="none" />
        {/* Fine crosshairs / ticks */}
        <Line x1={cx} y1={cy - rOuter} x2={cx} y2={cy - rInner} stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1} />
        <Line x1={cx} y1={cy + rInner} x2={cx} y2={cy + rOuter} stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1} />
        <Line x1={cx - rOuter} y1={cy} x2={cx - rInner} y2={cy} stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1} />
        <Line x1={cx + rInner} y1={cy} x2={cx + rOuter} y2={cy} stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1} />
        
        {/* Cardinal points */}
        <SvgText x={cx} y={12} fontSize={8.5} fontWeight="800" fill={isDark ? '#38BDF8' : '#0284C7'} textAnchor="middle">N</SvgText>
        <SvgText x={cx} y={size - 4} fontSize={8.5} fontWeight="800" fill={isDark ? '#38BDF8' : '#0284C7'} textAnchor="middle">S</SvgText>
        <SvgText x={10} y={cy + 3} fontSize={8.5} fontWeight="800" fill={isDark ? '#38BDF8' : '#0284C7'} textAnchor="middle">W</SvgText>
        <SvgText x={size - 10} y={cy + 3} fontSize={8.5} fontWeight="800" fill={isDark ? '#38BDF8' : '#0284C7'} textAnchor="middle">E</SvgText>

        {/* Rotated Pointer */}
        <G transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          {/* North pointing Green arrowhead */}
          <Path d={`M ${cx} ${cy - 38} L ${cx + 7} ${cy - 12} L ${cx - 7} ${cy - 12} Z`} fill="#10B981" />
          {/* South pointing Blue arrow tail */}
          <Path d={`M ${cx} ${cy + 38} L ${cx + 7} ${cy + 12} L ${cx - 7} ${cy + 12} Z`} fill={isDark ? '#38BDF8' : '#0284C7'} />
          {/* Center pivot */}
          <Circle cx={cx} cy={cy} r={6} fill={isDark ? '#0F172A' : '#FFFFFF'} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={2.5} fill={isDark ? '#38BDF8' : '#0284C7'} />
        </G>
      </Svg>
    </View>
  );
}
