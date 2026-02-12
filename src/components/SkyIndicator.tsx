/**
 * components/SkyIndicator.tsx
 * ───────────────────────────
 * 責任: 現在の空背景が「何を表しているか」をユーザーに伝えるバッジ
 *
 * 設計意図:
 *  - SkyBackground の動的変化は視覚的に美しいが、
 *    「今なぜこの背景なのか」をテキストで明示しないと伝わらない
 *  - 天気アイコン + ラベル + 昼/夜 をコンパクトに表示
 *  - チャートホバー中は「ホバー中の時点」の天気を表示し、
 *    離すと「現在の天気」に戻る
 *  - glass-card スタイルで背景に溶け込むデザイン
 */

"use client";

import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
} from "lucide-react";
import {
  weatherCodeToSkyCondition,
  WEATHER_CODE_MAP,
  type HoveredPointInfo,
} from "@/types";
import type { ComponentType } from "react";

interface SkyIndicatorProps {
  weatherCode: number | undefined;
  hoveredPoint: HoveredPointInfo | null;
}

const CONDITION_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
};

function isDaytime(hour?: number): boolean {
  const h = hour ?? new Date().getHours();
  return h >= 6 && h < 18;
}

export function SkyIndicator({ weatherCode, hoveredPoint }: SkyIndicatorProps) {
  const effectiveCode = hoveredPoint?.weatherCode ?? weatherCode;
  const effectiveHour = hoveredPoint?.hour;
  const daytime = isDaytime(effectiveHour);
  const condition = weatherCodeToSkyCondition(effectiveCode);
  const isHovering = hoveredPoint !== null;

  // 天気コードからアイコンとラベルを決定
  const weatherInfo = effectiveCode != null ? WEATHER_CODE_MAP[effectiveCode] : null;
  let iconName = weatherInfo?.icon ?? "Sun";
  const label = weatherInfo?.label ?? "晴れ";

  // 晴れ系で夜の場合はMoonアイコンに切り替え
  if (!daytime && condition === "clear") {
    iconName = "Moon";
  }
  if (!daytime && iconName === "CloudSun") {
    iconName = "CloudMoon";
  }

  const Icon = CONDITION_ICON_MAP[iconName] ?? Sun;

  // 時刻表示（ホバー中のみ）
  const timeLabel = effectiveHour != null
    ? `${effectiveHour.toString().padStart(2, "0")}:00`
    : null;

  // アイコンの色を天気に合わせる
  const iconColor = (() => {
    if (!daytime) return "text-indigo-300";
    switch (condition) {
      case "clear": return "text-yellow-300";
      case "cloudy": return "text-yellow-200/80";
      case "overcast": return "text-gray-300";
      case "rain": return "text-blue-300";
      case "snow": return "text-blue-100";
      case "thunder": return "text-yellow-400";
      case "fog": return "text-gray-400";
      default: return "text-yellow-300";
    }
  })();

  return (
    <div
      className={`glass-card !rounded-full px-4 py-2 flex items-center gap-2.5
                 inline-flex text-sm transition-all duration-300
                 ${isHovering ? "!border-white/25 ring-1 ring-white/10" : ""}`}
    >
      <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      <span className="text-white/90 font-medium">{label}</span>
      <span className="text-white/30">|</span>
      <span className={`font-medium ${daytime ? "text-amber-300" : "text-indigo-300"}`}>
        {daytime ? "☀ 昼" : "🌙 夜"}
      </span>
      {isHovering && timeLabel && (
        <>
          <span className="text-white/30">|</span>
          <span className="text-white/70 tabular-nums text-xs">{timeLabel}</span>
        </>
      )}
      {isHovering && (
        <span className="text-white/50 text-xs ml-0.5">(チャート連動中)</span>
      )}
      {!isHovering && (
        <span className="text-white/40 text-xs ml-0.5">現在の空</span>
      )}
    </div>
  );
}
