/**
 * components/SkyBackground.tsx
 * ────────────────────────────
 * 責任: 現在の天気に連動して変化する動的な空の背景を描画する
 *
 * 設計意図:
 *  - 太陽高度角（緯度・日付・時刻から天文計算）に基づく連続的なグラデーション遷移
 *    → 朝焼け、ゴールデンアワー、真昼、夕焼け、薄明、深夜を滑らかに表現
 *  - 太陽エレメントが時刻に応じて弧を描いて移動
 *  - 天気条件（7種）ごとにカラーパレットを定義し、フェーズ間を線形補間
 *  - 雨の速度は降水量に応じて3段階に変化（0〜2mm / 2〜5mm / 5mm超）
 *  - チャートホバー時に hour を受け取り、300ms でスムーズに遷移
 *
 * パフォーマンス:
 *  - CSSのみで描画。GPUアクセラレーション対象
 *  - useMemo で計算結果をキャッシュ
 */

"use client";

import { useMemo } from "react";
import { weatherCodeToSkyCondition, type SkyCondition, type HoveredPointInfo } from "@/types";
import {
  calcSolarAltitude,
  getDayOfYear,
  altitudeToSkyPhase,
  calcSunHorizontalPosition,
  calcSunVerticalPosition,
} from "@/lib/solar";

interface SkyBackgroundProps {
  weatherCode: number | undefined;
  hoveredPoint: HoveredPointInfo | null;
  precipitation?: number;
  /** 現在の雲量（%） */
  cloudCover?: number;
  /** 都市の緯度。太陽位置計算に使用 */
  latitude: number;
}

// ============================================================
// カラーパレット定義
// ============================================================

/** 4色のグラデーション停止点（上→下） */
type Palette = [string, string, string, string];

/** フェーズ（0.0〜1.0）ごとのパレット定義 */
interface PaletteEntry {
  phase: number;
  colors: Palette;
}

/**
 * 天気条件ごとの専用パレット
 * 自動派生ではなく手書きで色差を明確にする
 */
const CONDITION_PALETTES: Record<SkyCondition, PaletteEntry[]> = {
  /* ── 快晴: 深い紺〜紫。星が映える澄んだ夜空 ── */
  clear: [
    { phase: 0.00, colors: ["#050820", "#10083a", "#080e38", "#050a22"] },
    { phase: 0.15, colors: ["#0a1040", "#15104a", "#1a2060", "#151845"] },
    { phase: 0.25, colors: ["#1a1a50", "#302560", "#502e6a", "#703560"] },
    { phase: 0.33, colors: ["#2a2055", "#4a3068", "#8a4560", "#d46a50"] },
    { phase: 0.42, colors: ["#3a4080", "#5a70b0", "#c08850", "#e8a040"] },
    { phase: 0.55, colors: ["#2060c0", "#4088e0", "#70a8f0", "#a0c8ff"] },
    { phase: 1.00, colors: ["#1a6dd4", "#3a8ee8", "#6ab4f7", "#d4edff"] },
  ],
  /* ── 曇り(50-80%) ── */
  cloudy: [
    { phase: 0.00, colors: ["#787e88", "#8a9098", "#858b92", "#808890"] },
    { phase: 0.15, colors: ["#828a92", "#949ca5", "#8e969e", "#8a9098"] },
    { phase: 0.25, colors: ["#8a929a", "#9aa2aa", "#959da5", "#909aa2"] },
    { phase: 0.33, colors: ["#808890", "#909898", "#8a8078", "#b09070"] },
    { phase: 0.42, colors: ["#607090", "#7890a8", "#988870", "#b89060"] },
    { phase: 0.55, colors: ["#4070a8", "#5a88c0", "#7aa0d0", "#a0c0e0"] },
    { phase: 1.00, colors: ["#4070a8", "#5a88c0", "#7aa0d0", "#a0c0e0"] },
  ],
  /* ── どんより(80%+): 鉛色 ── */
  overcast: [
    { phase: 0.00, colors: ["#98a0a8", "#a8b0b8", "#a2aab0", "#9aa2aa"] },
    { phase: 0.15, colors: ["#a0a8b0", "#b0b8c0", "#aab2b8", "#a2aab2"] },
    { phase: 0.25, colors: ["#a5adb5", "#b5bdc5", "#b0b8c0", "#a8b0b8"] },
    { phase: 0.33, colors: ["#889098", "#98a0a8", "#929aa0", "#8a9298"] },
    { phase: 0.42, colors: ["#657585", "#788898", "#859098", "#9098a0"] },
    { phase: 0.55, colors: ["#556878", "#6a7e90", "#7e90a0", "#98a8b5"] },
    { phase: 1.00, colors: ["#556878", "#6a7e90", "#7e90a0", "#98a8b5"] },
  ],
  /* ── 雨: 暗く青緑がかった重い夜空 ── */
  rain: [
    { phase: 0.00, colors: ["#080c14", "#101822", "#0c1418", "#0a1015"] },
    { phase: 0.15, colors: ["#0e1520", "#18222e", "#152028", "#121a22"] },
    { phase: 0.25, colors: ["#182028", "#252e3a", "#2a3440", "#303840"] },
    { phase: 0.33, colors: ["#222e38", "#334048", "#3e484e", "#485050"] },
    { phase: 0.42, colors: ["#2a3540", "#3a4550", "#485058", "#505860"] },
    { phase: 0.55, colors: ["#3a4555", "#4d5868", "#5a6575", "#6e7888"] },
    { phase: 1.00, colors: ["#3a4555", "#4d5868", "#5a6575", "#6e7888"] },
  ],
  /* ── 雪: やや明るい青灰。雪雲で光が拡散した感じ ── */
  snow: [
    { phase: 0.00, colors: ["#202535", "#2e3545", "#283040", "#252e38"] },
    { phase: 0.15, colors: ["#283040", "#353e4a", "#323a48", "#2e3540"] },
    { phase: 0.25, colors: ["#353c4a", "#454c58", "#505860", "#5a6268"] },
    { phase: 0.33, colors: ["#454d5a", "#586068", "#656d75", "#758088"] },
    { phase: 0.42, colors: ["#556070", "#687080", "#788088", "#8a9098"] },
    { phase: 0.55, colors: ["#7888a0", "#8fa0b8", "#a5b5c8", "#c0cdd8"] },
    { phase: 1.00, colors: ["#7888a0", "#8fa0b8", "#a5b5c8", "#c0cdd8"] },
  ],
  /* ── 雷雨: 最も暗い。不穏な紫がかった黒 ── */
  thunder: [
    { phase: 0.00, colors: ["#060810", "#0e1020", "#0a0c15", "#08080e"] },
    { phase: 0.15, colors: ["#0c0e18", "#151828", "#121520", "#0e1018"] },
    { phase: 0.25, colors: ["#141820", "#1e2430", "#1c2028", "#181c25"] },
    { phase: 0.33, colors: ["#1c2230", "#2a3040", "#2e3540", "#323840"] },
    { phase: 0.42, colors: ["#222a35", "#303a48", "#384050", "#404855"] },
    { phase: 0.55, colors: ["#2a3040", "#3d4555", "#4a5265", "#555e70"] },
    { phase: 1.00, colors: ["#2a3040", "#3d4555", "#4a5265", "#555e70"] },
  ],
  /* ── 霧: ぼんやり明るい灰。視界が悪い雰囲気 ── */
  fog: [
    { phase: 0.00, colors: ["#222630", "#2e3238", "#2a2e35", "#262a30"] },
    { phase: 0.15, colors: ["#2a3038", "#363c42", "#343840", "#303438"] },
    { phase: 0.25, colors: ["#383e45", "#484e55", "#505558", "#585e62"] },
    { phase: 0.33, colors: ["#484e55", "#5a6068", "#626870", "#707880"] },
    { phase: 0.42, colors: ["#586068", "#6a7278", "#757c85", "#868e95"] },
    { phase: 0.55, colors: ["#6a7585", "#808a98", "#95a0ab", "#b0b8c2"] },
    { phase: 1.00, colors: ["#6a7585", "#808a98", "#95a0ab", "#b0b8c2"] },
  ],
};

// ============================================================
// 色補間ユーティリティ
// ============================================================

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = parseHex(a), cb = parseHex(b);
  return toHex(
    Math.round(ca[0] + (cb[0] - ca[0]) * t),
    Math.round(ca[1] + (cb[1] - ca[1]) * t),
    Math.round(ca[2] + (cb[2] - ca[2]) * t),
  );
}

// ============================================================
// グラデーション生成
// ============================================================

/** スカイフェーズに基づいてグラデーションを補間生成 */
function getSkyGradientByPhase(condition: SkyCondition, skyPhase: number): string {
  const palettes = CONDITION_PALETTES[condition];
  const clamped = Math.max(0, Math.min(1, skyPhase));

  // 補間区間を特定
  let lower = palettes[0];
  let upper = palettes[palettes.length - 1];
  for (let i = 0; i < palettes.length - 1; i++) {
    if (clamped >= palettes[i].phase && clamped <= palettes[i + 1].phase) {
      lower = palettes[i];
      upper = palettes[i + 1];
      break;
    }
  }

  const range = upper.phase - lower.phase;
  const t = range > 0 ? (clamped - lower.phase) / range : 0;

  const c0 = lerpColor(lower.colors[0], upper.colors[0], t);
  const c1 = lerpColor(lower.colors[1], upper.colors[1], t);
  const c2 = lerpColor(lower.colors[2], upper.colors[2], t);
  const c3 = lerpColor(lower.colors[3], upper.colors[3], t);

  return `linear-gradient(180deg, ${c0} 0%, ${c1} 30%, ${c2} 65%, ${c3} 100%)`;
}

// ============================================================
// エフェクト設定
// ============================================================

function getOverlayConfig(condition: SkyCondition, skyPhase: number, precipitation: number) {
  const hasRain = precipitation > 0;
  // 星: 快晴のみ。曇り以上は雲で星が隠れる
  const starsBase = condition === "clear" ? 0.6 : 0;
  const starsOpacity = skyPhase < 0.25
    ? starsBase * (1 - skyPhase / 0.25)
    : 0;

  return {
    rainOpacity: hasRain ? (condition === "rain" ? 0.35 : condition === "thunder" ? 0.45 : 0) : 0,
    snowOpacity: condition === "snow" ? 0.4 : 0,
    fogOpacity: condition === "fog" ? 0.35 : 0,
    starsOpacity,
  };
}

function getRainSpeed(precipitation: number | undefined): { layer1: string; layer2: string } {
  const p = precipitation ?? 0;
  if (p > 5) return { layer1: "0.12s", layer2: "0.17s" };
  if (p > 2) return { layer1: "0.25s", layer2: "0.35s" };
  return { layer1: "0.5s", layer2: "0.7s" };
}


/**
 * 雲量（%）で天気条件を補正する
 * 天気コードが晴れ系でも雲量が高ければ曇り/どんよりに上書き
 */
function adjustConditionByCloudCover(condition: SkyCondition, cloudCover: number): SkyCondition {
  // 雨・雪・雷・霧はそのまま（雲量より優先）
  if (condition === "rain" || condition === "snow" || condition === "thunder" || condition === "fog") {
    return condition;
  }
  if (cloudCover >= 80) return "overcast";
  if (cloudCover >= 50) return "cloudy";
  if (cloudCover >= 20) return "cloudy";
  return "clear";
}

// ============================================================
// コンポーネント
// ============================================================

export function SkyBackground({ weatherCode, hoveredPoint, precipitation, cloudCover, latitude }: SkyBackgroundProps) {
  const effectiveCode = hoveredPoint?.weatherCode ?? weatherCode;
  const effectiveHour = hoveredPoint?.hour;
  const effectiveCloudCover = hoveredPoint?.cloudCover ?? cloudCover ?? 0;

  const condition = useMemo(() => {
    const base = weatherCodeToSkyCondition(effectiveCode);
    return adjustConditionByCloudCover(base, effectiveCloudCover);
  }, [effectiveCode, effectiveCloudCover]);

  // 太陽位置の計算
  const solar = useMemo(() => {
    const now = new Date();
    const dayOfYear = getDayOfYear(now);
    const hourFloat = effectiveHour ?? (now.getHours() + now.getMinutes() / 60);

    const altitude = calcSolarAltitude(latitude, dayOfYear, hourFloat);
    const skyPhase = altitudeToSkyPhase(altitude);
    const sunX = calcSunHorizontalPosition(hourFloat) * 100;
    const sunY = calcSunVerticalPosition(altitude);

    return { altitude, skyPhase, sunX, sunY, hourFloat };
  }, [latitude, effectiveHour]);

  // グラデーション
  const gradient = useMemo(
    () => getSkyGradientByPhase(condition, solar.skyPhase),
    [condition, solar.skyPhase]
  );

  // エフェクト
  const effectivePrecipitation = hoveredPoint?.precipitation ?? precipitation;
  const overlay = useMemo(
    () => getOverlayConfig(condition, solar.skyPhase, effectivePrecipitation ?? 0),
    [condition, solar.skyPhase, effectivePrecipitation]
  );
  const rainSpeed = useMemo(
    () => getRainSpeed(effectivePrecipitation),
    [effectivePrecipitation]
  );

  // 大気散乱（太陽位置に追従）
  const scatterGradient = useMemo(() => {
    if (solar.skyPhase < 0.1) {
      return "radial-gradient(ellipse at 30% 30%, rgba(100,120,255,0.06) 0%, transparent 60%)";
    }
    const warmth = solar.altitude < 10 ? 1 : solar.altitude < 25 ? 1 - (solar.altitude - 10) / 15 : 0;
    const warmAlpha = solar.skyPhase < 0.5
      ? 0.06 + warmth * 0.12
      : 0.08;
    return `radial-gradient(ellipse at ${solar.sunX}% ${100 - solar.sunY}%, rgba(255,200,100,${warmAlpha}) 0%, transparent 55%)`;
  }, [solar.skyPhase, solar.sunX, solar.sunY, solar.altitude]);

  const transitionDuration = hoveredPoint ? "300ms" : "2000ms";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* メイン空グラデーション */}
      <div
        className="absolute inset-0"
        style={{
          background: gradient,
          transition: `background ${transitionDuration} ease-in-out`,
        }}
      />

      {/* 大気の散乱（太陽位置追従） */}
      <div
        className="absolute inset-0"
        style={{
          background: scatterGradient,
          transition: `background ${transitionDuration} ease-in-out`,
        }}
      />

      {/* 太陽（削除済み） */}

      {/* 星（スカイフェーズで滑らかにフェードアウト） */}
      <div
        className="absolute inset-0 sky-stars"
        style={{
          opacity: overlay.starsOpacity,
          transition: `opacity ${transitionDuration}`,
        }}
      />

      {/* 雨 — 2層重ねで奥行き感を演出 */}
      <div
        className="absolute inset-0 sky-rain-layer-1"
        style={{
          opacity: overlay.rainOpacity,
          animation: `rain-fall-large ${rainSpeed.layer1} linear infinite`,
          transition: `opacity ${transitionDuration}`,
        }}
      />
      <div
        className="absolute inset-0 sky-rain-layer-2"
        style={{
          opacity: overlay.rainOpacity * 0.6,
          animation: `rain-fall-small ${rainSpeed.layer2} linear infinite`,
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
