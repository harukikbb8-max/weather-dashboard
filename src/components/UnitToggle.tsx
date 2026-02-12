/**
 * components/UnitToggle.tsx
 * ─────────────────────────
 * 責任: メトリック/インペリアルの単位系切替UIを提供する
 *
 * 設計意図:
 *  - トグルスイッチで2値の切替を直感的に表現
 *  - 単位の変換計算はクライアントではなくAPI側に委譲する設計
 *    （Open-Meteo は temperature_unit, wind_speed_unit パラメータをサポート）
 *  - これにより浮動小数点の変換誤差を排除し、APIの返す値をそのまま表示できる
 */

"use client";

import { Ruler } from "lucide-react";
import type { UnitSystem } from "@/types";

interface UnitToggleProps {
  value: UnitSystem;
  onChange: (unit: UnitSystem) => void;
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  const isImperial = value === "imperial";

  return (
    <div className="glass-card p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-white/90 mb-2">
        <Ruler className="w-4 h-4" />
        単位系
      </label>
      <button
        onClick={() => onChange(isImperial ? "metric" : "imperial")}
        className="w-full flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5
                   border border-white/10 transition-all hover:bg-white/[0.08] cursor-pointer"
        role="switch"
        aria-checked={isImperial}
        aria-label={`単位系: ${isImperial ? "インペリアル" : "メトリック"}`}
      >
        {/* トグルスイッチ */}
        <div className="relative w-10 h-5 rounded-full bg-white/10 flex-shrink-0">
          <div
            className={`
              absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300
              ${isImperial
                ? "left-[calc(100%-18px)] bg-orange-400"
                : "left-0.5 bg-blue-400"
              }
            `}
          />
        </div>
        {/* ラベル */}
        <div className="flex items-center gap-2 text-sm">
          <span className={!isImperial ? "text-white font-medium" : "text-white/50"}>
            °C / km/h
          </span>
          <span className="text-white/30">/</span>
          <span className={isImperial ? "text-white font-medium" : "text-white/50"}>
            °F / mph
          </span>
        </div>
      </button>
    </div>
  );
}
