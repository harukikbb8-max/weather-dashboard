/**
 * components/SkyBackground.tsx
 * ────────────────────────────
 * 責任: 現在の天気に連動して変化する動的な空の背景を描画する
 *
 * 設計意図:
 *  - 天気コード + 時間帯（昼/夜）から空のグラデーションを動的に決定
 *  - チャートホバー時に hour を受け取り、ホバー中のデータ時刻で
 *    昼夜が変化する（6:00-18:00を昼、それ以外を夜）
 *  - CSS グラデーション + トランジションで滑らかに切り替え
 *    （Canvas不要 → バンドルサイズ増加なし）
 *  - 雨・雪エフェクトは CSS-only で実装。
 *    opacity を控えめにしてコンテンツの可読性を確保
 *
 * パフォーマンス:
 *  - CSSのみで描画。GPUアクセラレーション対象
 *  - ホバーで頻繁に更新されるが、変更は CSS 変数の切替のみ
 */

"use client";

import { useMemo } from "react";
import { weatherCodeToSkyCondition, type SkyCondition, type HoveredPointInfo } from "@/types";

interface SkyBackgroundProps {
  weatherCode: number | undefined;
  /** チャートホバー中のデータポイント情報。null ならデフォルト（現在時刻） */
  hoveredPoint: HoveredPointInfo | null;
}

/**
 * 時刻が昼間かどうかを判定
 * hour が渡されればそれを使い、なければ現在時刻
 */
function isDaytime(hour?: number): boolean {
  const h = hour ?? new Date().getHours();
  return h >= 6 && h < 18;
}

/**
 * 天気 × 時間帯 → CSSグラデーション のマッピング
 */
function getSkyGradient(condition: SkyCondition, daytime: boolean): string {
  if (!daytime) {
    switch (condition) {
      case "clear":
        return "linear-gradient(180deg, #0a0e27 0%, #1a1040 30%, #0d1b3e 70%, #0a1628 100%)";
      case "cloudy":
        return "linear-gradient(180deg, #141828 0%, #1e2440 40%, #1a2035 100%)";
      case "overcast":
        return "linear-gradient(180deg, #181c28 0%, #252a38 50%, #1e2230 100%)";
      case "rain":
        return "linear-gradient(180deg, #0e1218 0%, #161c28 40%, #111820 100%)";
      case "snow":
        return "linear-gradient(180deg, #1a1e2e 0%, #252838 50%, #1e2130 100%)";
      case "thunder":
        return "linear-gradient(180deg, #0a0c15 0%, #151825 40%, #0e1018 100%)";
      case "fog":
        return "linear-gradient(180deg, #1a1e28 0%, #222630 50%, #1e2228 100%)";
      default:
        return "linear-gradient(180deg, #0a0e27 0%, #1a1040 30%, #0a1628 100%)";
    }
  }

  switch (condition) {
    case "clear":
      return "linear-gradient(180deg, #1a6dd4 0%, #3a8ee8 25%, #6ab4f7 55%, #a8d8ff 80%, #d4edff 100%)";
    case "cloudy":
      return "linear-gradient(180deg, #4a7ab5 0%, #6a95c8 30%, #8cb0d8 60%, #b8cfe5 100%)";
    case "overcast":
      return "linear-gradient(180deg, #5a6578 0%, #727e90 30%, #8a95a5 60%, #a0aab5 100%)";
    case "rain":
      return "linear-gradient(180deg, #3a4555 0%, #4d5868 30%, #5a6575 60%, #6e7888 100%)";
    case "snow":
      return "linear-gradient(180deg, #7888a0 0%, #8fa0b8 30%, #a5b5c8 60%, #c0cdd8 100%)";
    case "thunder":
      return "linear-gradient(180deg, #2a3040 0%, #3d4555 30%, #4a5265 60%, #555e70 100%)";
    case "fog":
      return "linear-gradient(180deg, #6a7585 0%, #808a98 30%, #95a0ab 60%, #b0b8c2 100%)";
    default:
      return "linear-gradient(180deg, #1a6dd4 0%, #3a8ee8 30%, #a8d8ff 100%)";
  }
}

/**
 * 天気に応じたエフェクトの強度
 * 可読性を保つため opacity は抑えめ。主張しすぎない演出を意識
 */
function getOverlayConfig(condition: SkyCondition, daytime: boolean) {
  return {
    rainOpacity: condition === "rain" ? 0.35 : condition === "thunder" ? 0.45 : 0,
    snowOpacity: condition === "snow" ? 0.4 : 0,
    fogOpacity: condition === "fog" ? 0.35 : 0,
    starsOpacity: !daytime && (condition === "clear" || condition === "cloudy") ? 0.6 : 0,
  };
}

export function SkyBackground({ weatherCode, hoveredPoint }: SkyBackgroundProps) {
  // ホバー中のポイントがあればその天気と時刻を使う。なければ現在天気
  const effectiveCode = hoveredPoint?.weatherCode ?? weatherCode;
  const effectiveHour = hoveredPoint?.hour;

  const daytime = isDaytime(effectiveHour);
  const condition = useMemo(
    () => weatherCodeToSkyCondition(effectiveCode),
    [effectiveCode]
  );
  const gradient = useMemo(
    () => getSkyGradient(condition, daytime),
    [condition, daytime]
  );
  const overlay = useMemo(
    () => getOverlayConfig(condition, daytime),
    [condition, daytime]
  );

  // ホバー中は高速切替（300ms）、非ホバーはゆるやか（2000ms）
  const transitionDuration = hoveredPoint ? "300ms" : "2000ms";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* メイン空グラデーション */}
      <div
        className="absolute inset-0 ease-in-out"
        style={{
          background: gradient,
          transition: `background ${transitionDuration} ease-in-out`,
        }}
      />

      {/* 大気の散乱 */}
      <div
        className="absolute inset-0"
        style={{
          background: daytime
            ? "radial-gradient(ellipse at 70% 20%, rgba(255,200,100,0.1) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 30% 30%, rgba(100,120,255,0.06) 0%, transparent 60%)",
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 星 */}
      <div
        className="absolute inset-0 sky-stars"
        style={{
          opacity: overlay.starsOpacity,
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 雨 — 3層重ねで奥行き感を演出 */}
      <div
        className="absolute inset-0 sky-rain-layer-1"
        style={{
          opacity: overlay.rainOpacity,
          transition: `opacity ${transitionDuration}`,
        }}
      />
      <div
        className="absolute inset-0 sky-rain-layer-2"
        style={{
          opacity: overlay.rainOpacity * 0.6,
          transition: `opacity ${transitionDuration}`,
        }}
      />
      <div
        className="absolute inset-0 sky-rain-layer-3"
        style={{
          opacity: overlay.rainOpacity * 0.3,
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 雪 — 2層でサイズ違いの粒を表現 */}
      <div
        className="absolute inset-0 sky-snow-layer-1"
        style={{
          opacity: overlay.snowOpacity,
          transition: `opacity ${transitionDuration}`,
        }}
      />
      <div
        className="absolute inset-0 sky-snow-layer-2"
        style={{
          opacity: overlay.snowOpacity * 0.5,
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 霧 */}
      <div
        className="absolute inset-0"
        style={{
          opacity: overlay.fogOpacity,
          background: "linear-gradient(0deg, rgba(180,190,200,0.3) 0%, rgba(180,190,200,0.1) 40%, transparent 70%)",
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 下部フェード */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
