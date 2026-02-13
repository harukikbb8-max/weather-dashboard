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
  clear: [
    { phase: 0.00, colors: ["#0a0e27", "#1a1040", "#0d1b3e", "#0a1628"] },
    { phase: 0.15, colors: ["#0d1535", "#1a1845", "#1e2555", "#1a2040"] },
    { phase: 0.25, colors: ["#1a1a45", "#2d2555", "#4a3060", "#6a3555"] },
    { phase: 0.33, colors: ["#2a2050", "#4a3065", "#8a4560", "#d46a50"] },
    { phase: 0.42, colors: ["#3a4080", "#5a70b0", "#c08850", "#e8a040"] },
    { phase: 0.55, colors: ["#2060c0", "#4088e0", "#70a8f0", "#a0c8ff"] },
    { phase: 1.00, colors: ["#1a6dd4", "#3a8ee8", "#6ab4f7", "#d4edff"] },
  ],
  cloudy: [
    { phase: 0.00, colors: ["#141828", "#1e2440", "#1a2035", "#161c2e"] },
    { phase: 0.15, colors: ["#181e38", "#222a48", "#283050", "#222840"] },
    { phase: 0.25, colors: ["#252838", "#353a4a", "#484855", "#5a4a48"] },
    { phase: 0.33, colors: ["#303040", "#484855", "#706058", "#a07050"] },
    { phase: 0.42, colors: ["#405068", "#607090", "#988870", "#b89060"] },
    { phase: 0.55, colors: ["#4a7ab5", "#6a95c8", "#8cb0d8", "#b8cfe5"] },
    { phase: 1.00, colors: ["#4a7ab5", "#6a95c8", "#8cb0d8", "#b8cfe5"] },
  ],
  overcast: [
    { phase: 0.00, colors: ["#181c28", "#222630", "#1e2230", "#1a1e28"] },
    { phase: 0.15, colors: ["#1e2230", "#282c38", "#2a2e38", "#252830"] },
    { phase: 0.25, colors: ["#282c38", "#353840", "#404548", "#484c50"] },
    { phase: 0.33, colors: ["#353840", "#484c55", "#585c62", "#686c70"] },
    { phase: 0.42, colors: ["#454a55", "#585e68", "#6a7078", "#7a8088"] },
    { phase: 0.55, colors: ["#5a6578", "#727e90", "#8a95a5", "#a0aab5"] },
    { phase: 1.00, colors: ["#5a6578", "#727e90", "#8a95a5", "#a0aab5"] },
  ],
  rain: [
    { phase: 0.00, colors: ["#0e1218", "#161c28", "#111820", "#0e1418"] },
    { phase: 0.15, colors: ["#121820", "#1a2230", "#182028", "#141c22"] },
    { phase: 0.25, colors: ["#1a2028", "#252c38", "#283038", "#2a3038"] },
    { phase: 0.33, colors: ["#222830", "#303840", "#384045", "#404848"] },
    { phase: 0.42, colors: ["#2a3540", "#3a4550", "#485058", "#505860"] },
    { phase: 0.55, colors: ["#3a4555", "#4d5868", "#5a6575", "#6e7888"] },
    { phase: 1.00, colors: ["#3a4555", "#4d5868", "#5a6575", "#6e7888"] },
  ],
  snow: [
    { phase: 0.00, colors: ["#1a1e2e", "#252838", "#1e2130", "#1a1e28"] },
    { phase: 0.15, colors: ["#202430", "#2a2e3a", "#282c38", "#242830"] },
    { phase: 0.25, colors: ["#303440", "#3a3e48", "#454850", "#505458"] },
    { phase: 0.33, colors: ["#404450", "#505560", "#606468", "#707478"] },
    { phase: 0.42, colors: ["#556070", "#687080", "#788088", "#8a9098"] },
    { phase: 0.55, colors: ["#7888a0", "#8fa0b8", "#a5b5c8", "#c0cdd8"] },
    { phase: 1.00, colors: ["#7888a0", "#8fa0b8", "#a5b5c8", "#c0cdd8"] },
  ],
  thunder: [
    { phase: 0.00, colors: ["#0a0c15", "#151825", "#0e1018", "#0a0c12"] },
    { phase: 0.15, colors: ["#0e1018", "#181c28", "#141820", "#101418"] },
    { phase: 0.25, colors: ["#151820", "#202530", "#1e2228", "#1a1e25"] },
    { phase: 0.33, colors: ["#1a2028", "#282e38", "#283035", "#2a3038"] },
    { phase: 0.42, colors: ["#222a35", "#303a48", "#384050", "#404855"] },
    { phase: 0.55, colors: ["#2a3040", "#3d4555", "#4a5265", "#555e70"] },
    { phase: 1.00, colors: ["#2a3040", "#3d4555", "#4a5265", "#555e70"] },
  ],
  fog: [
    { phase: 0.00, colors: ["#1a1e28", "#222630", "#1e2228", "#1a1e25"] },
    { phase: 0.15, colors: ["#202428", "#282c32", "#262a30", "#222628"] },
    { phase: 0.25, colors: ["#303438", "#3a3e42", "#404448", "#484c50"] },
    { phase: 0.33, colors: ["#404448", "#505458", "#585c60", "#606468"] },
    { phase: 0.42, colors: ["#505558", "#606468", "#6a7075", "#787e82"] },
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
  // 星: フェーズ0.25以下で表示、フェードアウト
  const starsBase = (condition === "clear" || condition === "cloudy") ? 0.6 : 0;
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
