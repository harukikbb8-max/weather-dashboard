/**
 * components/MetricSelector.tsx
 * ─────────────────────────────
 * 責任: 気象指標の複数選択UIを提供する
 *
 * 設計意図:
 *  - チェックボックス群による複数選択を実装
 *  - 各指標にはアイコンと色を付与し、チャートの凡例と色が一致するようにする
 *    （視覚的な一貫性: チャート上の線色 = セレクタのアクセントカラー）
 *  - 少なくとも1つの指標が選択された状態を維持するバリデーションは
 *    親コンポーネントの責任（このコンポーネントは通知のみ）
 *  - METRICS 定数から動的に生成するため、指標の追加は types/index.ts のみで完結
 */

"use client";

import { BarChart3 } from "lucide-react";
import {
  Thermometer,
  ThermometerSun,
  CloudRain,
  Droplets,
  Wind,
  Cloud,
} from "lucide-react";
import { METRICS, type MetricId } from "@/types";
import type { ComponentType } from "react";

// アイコン名 → コンポーネントのマッピング
// Lucide は動的インポートを推奨しないため、使用するアイコンを明示的にマップ
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Thermometer,
  ThermometerSun,
  CloudRain,
  Droplets,
  Wind,
  Cloud,
};

interface MetricSelectorProps {
  value: MetricId[];
  onChange: (metricIds: MetricId[]) => void;
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  const handleToggle = (metricId: MetricId) => {
    if (value.includes(metricId)) {
      // 最低1つは選択された状態を維持
      if (value.length > 1) {
        onChange(value.filter((id) => id !== metricId));
      }
    } else {
      onChange([...value, metricId]);
    }
  };

  return (
    <div className="glass-card p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-white/90 mb-3">
        <BarChart3 className="w-4 h-4" />
        指標（複数選択可）
      </label>
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map((metric) => {
          const isSelected = value.includes(metric.id);
          const IconComponent = ICON_MAP[metric.icon];

          return (
            <label
              key={metric.id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer
                transition-all duration-200 text-sm
                ${
                  isSelected
                    ? "bg-white/10 border border-white/20 shadow-lg"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(metric.id)}
                className="sr-only"
                aria-label={`${metric.label}を${isSelected ? "非表示" : "表示"}`}
              />
              {/* チェック状態を色付きドットで視覚的にフィードバック */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? metric.color : "transparent",
                  border: `2px solid ${isSelected ? metric.color : "rgba(255,255,255,0.3)"}`,
                }}
              />
              {IconComponent && (
                <IconComponent
                  className="w-4 h-4 flex-shrink-0"
                />
              )}
              <span className={isSelected ? "text-white" : "text-white/60"}>
                {metric.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
