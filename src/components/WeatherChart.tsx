/**
 * components/WeatherChart.tsx
 * ───────────────────────────
 * 責任: 時系列天気データの折れ線グラフを描画する
 *
 * 設計意図:
 *  - Recharts の Composable API を活用し、宣言的にチャートを構築
 *  - 選択された指標ごとに動的に <Line> を生成（多系列対応）
 *  - 各指標の色は types/index.ts の MetricDefinition.color と一致させ、
 *    MetricSelector のカラードットとの視覚的一貫性を保証
 *  - onPointHover コールバックでホバー中のデータポイントの
 *    weather_code + hour を親に通知 → SkyBackground の空が連動して変化
 *  - ResponsiveContainer でレスポンシブ対応
 *
 * なぜ Recharts か:
 *  - React のコンポーネントモデルに自然に統合できる
 *  - <LineChart><Line /></LineChart> という JSX で直感的に構成できる
 *  - D3.js を直接使う場合の命令的コードを避けられる
 */

"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  METRICS,
  WEATHER_CODE_MAP,
  type MetricId,
  type ChartDataPoint,
  type UnitSystem,
  type HoveredPointInfo,
} from "@/types";

interface WeatherChartProps {
  data: ChartDataPoint[];
  metrics: MetricId[];
  unitSystem: UnitSystem;
  /** チャート上のポイントにホバーしたとき、天気コードと時刻を親に通知 */
  onPointHover?: (info: HoveredPointInfo | null) => void;
}

/**
 * カスタムツールチップ（天気情報 + ホバー通知を兼務）
 *
 * Recharts は Tooltip の content に渡したコンポーネントを clone し、
 * active / payload / label を注入する。
 * このコンポーネント内で useEffect を使い、ホバー中のデータポイントの
 * 天気情報を親コンポーネントへ通知する。
 *
 * なぜこのアプローチか:
 *  Recharts v3 では onMouseMove のコールバック引数の構造が
 *  ドキュメントと実装で異なる場合がある。
 *  Tooltip の payload は確実に正しいデータを含むため、
 *  ここからホバー情報を取得するのが最も信頼性が高い。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({
  active,
  payload,
  label,
  onHover,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string; payload?: any }>;
  label?: string;
  onHover?: (info: HoveredPointInfo | null) => void;
}) {
  const point =
    active && payload?.length
      ? (payload[0]?.payload as ChartDataPoint | undefined)
      : null;

  const weatherCode = point?.weather_code;
  const hour = point?.hour;
  const precipitation = point?.precipitation as number | undefined;

  // ホバー中のデータポイントの天気情報を親へ通知
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  useEffect(() => {
    if (weatherCode != null && hour != null) {
      onHoverRef.current?.({ weatherCode, hour, precipitation });
    } else {
      onHoverRef.current?.(null);
    }
  }, [weatherCode, hour, precipitation]);

  if (!active || !payload?.length) return null;

  const weatherInfo = weatherCode != null ? WEATHER_CODE_MAP[weatherCode] : null;
  const isDaytime = hour != null ? (hour >= 6 && hour < 18) : true;

  return (
    <div className="glass-card !p-3 !rounded-lg text-sm min-w-[160px]">
      <p className="text-white/70 text-xs mb-1.5 font-medium">{label}</p>

      {/* 天気情報バッジ */}
      {weatherInfo && (
        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/10">
          <span className={`text-xs font-medium ${isDaytime ? "text-amber-300" : "text-indigo-300"}`}>
            {isDaytime ? "☀" : "🌙"} {isDaytime ? "昼" : "夜"}
          </span>
          <span className="text-white/30">|</span>
          <span className="text-white/80 text-xs">{weatherInfo.label}</span>
        </div>
      )}

      {payload.map((entry) => {
        const metric = METRICS.find((m) => m.id === entry.dataKey);
        if (!metric) return null;
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white/80">{metric.label}</span>
            </span>
            <span className="text-white font-semibold tabular-nums">
              {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WeatherChart({ data, metrics, unitSystem, onPointHover }: WeatherChartProps) {
  const activeMetrics = useMemo(
    () => metrics.map((id) => METRICS.find((m) => m.id === id)!).filter(Boolean),
    [metrics]
  );

  // X軸ラベルの間引き: 48h(48点)→6hごと、7d(168点)→24hごと
  const tickInterval = useMemo(() => {
    if (data.length <= 48) return 5;   // 48h: 6時間ごと
    return 23;                         // 7d: 24時間ごと
  }, [data.length]);

  /**
   * マウスがチャート領域から離れたら、ホバー状態をリセット
   * （Tooltip の useEffect でも null が送られるが、
   *  チャート外へ素早く移動した場合の保険）
   */
  const handleMouseLeave = useCallback(() => {
    onPointHover?.(null);
  }, [onPointHover]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-white/40 text-sm">指標を選択してください</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-6">
      <h2 className="text-sm font-medium text-white/90 mb-4">
        時系列チャート
        <span className="text-white/60 ml-2 text-xs">（1時間ごと）</span>
      </h2>
      <div className="w-full h-[350px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.12)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 500 }}
              interval={tickInterval}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              width={50}
            />
            <Tooltip content={<CustomTooltip onHover={onPointHover} />} />
            <Legend
              formatter={(value: string) => {
                const metric = METRICS.find((m) => m.id === value);
                if (!metric) return value;
                const unit =
                  unitSystem === "metric"
                    ? metric.unitMetric
                    : metric.unitImperial;
                return `${metric.label} (${unit})`;
              }}
              wrapperStyle={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}
            />
            {activeMetrics.map((metric) => (
              <Line
                key={metric.id}
                type="monotone"
                dataKey={metric.id}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, stroke: metric.color, fill: "#fff" }}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
