/**
 * components/PeriodSelector.tsx
 * ─────────────────────────────
 * 責任: 48時間（hourly）/ 7日間（hourly集計）のビューモード切替UIを提供
 *
 * 設計意図:
 *  - 2択のみのためセグメントコントロール（トグル）で実装
 *  - スライドするインジケーターで現在の選択を視覚的にフィードバック
 *  - ARIA radio group として実装しアクセシビリティを確保
 */

"use client";

import { Clock, CalendarDays } from "lucide-react";
import type { ViewMode } from "@/types";

interface PeriodSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const OPTIONS: { mode: ViewMode; label: string; icon: typeof Clock }[] = [
  { mode: "48h", label: "48時間", icon: Clock },
  { mode: "7d",  label: "7日間",  icon: CalendarDays },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const selectedIndex = OPTIONS.findIndex((o) => o.mode === value);

  return (
    <div className="glass-card p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-white/90 mb-2">
        <Clock className="w-4 h-4" />
        表示期間
      </label>
      <div
        className="relative flex bg-white/5 rounded-xl p-1"
        role="radiogroup"
        aria-label="表示期間"
      >
        {/* スライドするインジケーター */}
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-white/10 border border-white/20 transition-all duration-300 ease-out"
          style={{
            width: "calc(50% - 2px)",
            left: selectedIndex === 0 ? "1px" : "calc(50% + 1px)",
          }}
        />
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.mode}
              role="radio"
              aria-checked={value === option.mode}
              onClick={() => onChange(option.mode)}
              className={`
                relative z-10 flex-1 flex items-center justify-center gap-1.5
                py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer
                ${value === option.mode ? "text-white" : "text-white/50 hover:text-white/70"}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
