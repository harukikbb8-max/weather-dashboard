/**
 * lib/solar.ts
 * ────────────
 * 責任: 太陽位置の天文計算ユーティリティ
 *
 * 設計意図:
 *  - 外部ライブラリ不要の簡易天文計算で太陽高度角を算出
 *  - 日本の5都市（緯度26〜43°N）で十分な精度を提供
 *  - SkyBackground が背景グラデーションと太陽エレメントの配置に使用
 */

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

/**
 * Date オブジェクトから年内の通算日（1〜366）を返す
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 太陽高度角（度）を計算する
 *
 * @param latitude  - 都市の緯度（度）
 * @param dayOfYear - 年内の通算日（1〜366）
 * @param hourFloat - 時刻（小数。例: 14.5 = 14:30）
 * @returns 太陽高度角（度）。正 = 地平線上、負 = 地平線下
 */
export function calcSolarAltitude(
  latitude: number,
  dayOfYear: number,
  hourFloat: number
): number {
  // 太陽赤緯（地球の軸の傾き）
  const declination = 23.45 * Math.sin(TO_RAD * (360 / 365) * (dayOfYear - 81));
  // 時角（太陽が南中からどれだけずれているか）
  const hourAngle = (hourFloat - 12) * 15;

  const sinAlt =
    Math.sin(TO_RAD * latitude) * Math.sin(TO_RAD * declination) +
    Math.cos(TO_RAD * latitude) * Math.cos(TO_RAD * declination) * Math.cos(TO_RAD * hourAngle);

  return TO_DEG * Math.asin(Math.max(-1, Math.min(1, sinAlt)));
}

/**
 * 太陽高度角 → スカイフェーズ（0.0〜1.0）に正規化
 *
 * -12°以下 = 0.0（深夜）
 * +30°以上 = 1.0（真昼）
 * その間は線形補間
 */
export function altitudeToSkyPhase(altitude: number): number {
  if (altitude <= -12) return 0;
  if (altitude >= 30) return 1;
  return (altitude + 12) / 42;
}

/**
 * 太陽の水平位置（0.0 = 東端 〜 1.0 = 西端）
 * 4:00〜20:00 を画面幅にマッピング
 */
export function calcSunHorizontalPosition(hourFloat: number): number {
  return Math.max(0, Math.min(1, (hourFloat - 4) / 16));
}

/**
 * 太陽高度 → 垂直位置（CSS bottom %）
 * 地平線（高度0°）= 10%、最高点（高度70°）= 90%
 */
export function calcSunVerticalPosition(altitude: number): number {
  if (altitude <= 0) return 10;
  return 10 + (Math.min(altitude, 70) / 70) * 80;
}
