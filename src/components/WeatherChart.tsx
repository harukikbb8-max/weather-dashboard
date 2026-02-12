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

import { useMemo, useCallback } from "react";
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
 * カスタムツールチップ
 * Liquid Glass に合わせたデザイン
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card !p-3 !rounded-lg text-sm min-w-[140px]">
      <p className="text-white/70 text-xs mb-1.5 font-medium">{label}</p>
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
   * Recharts の onMouseMove で呼ばれる
   * activePayload からホバー中のデータポイントの天気情報を抽出
   * 型は CategoricalChartFunc に合わせて any 経由で取得
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback(
    (state: any) => {
      if (!onPointHover || !state?.activePayload?.length) return;
      const point = state.activePayload[0].payload as ChartDataPoint;
      onPointHover({
        weatherCode: point.weather_code,
        hour: point.hour,
      });
    },
    [onPointHover]
  );

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
            onMouseMove={handleMouseMove}
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
            <Tooltip content={<CustomTooltip />} />
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
