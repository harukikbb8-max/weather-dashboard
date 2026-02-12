/**
 * components/CurrentWeather.tsx
 * ─────────────────────────────
 * 責任: 現在の天気情報をサマリーカードとして表示する
 *
 * 設計意図:
 *  - チャートの補助情報として「今の天気」を一目で把握できるカード
 *  - WMO Weather Code を日本語ラベルとアイコンに変換
 *  - Open-Meteo の current パラメータのレスポンスをそのまま表示
 *    （値の加工はしない。APIから返された単位系のまま表示）
 *  - props として受け取ったデータを描画するだけの Presentational Component
 */

"use client";

import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import {
  WEATHER_CODE_MAP,
  type OpenMeteoHourlyResponse,
  type UnitSystem,
  type City,
} from "@/types";
import type { ComponentType } from "react";

// アイコン名 → コンポーネントのマッピング
const WEATHER_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
};

interface CurrentWeatherProps {
  data: OpenMeteoHourlyResponse["current"] | null;
  city: City;
  unitSystem: UnitSystem;
}

export function CurrentWeather({ data, city, unitSystem }: CurrentWeatherProps) {
  if (!data) return null;

  const weatherInfo = data.weather_code != null
    ? WEATHER_CODE_MAP[data.weather_code]
    : null;
  const WeatherIcon = weatherInfo
    ? WEATHER_ICON_MAP[weatherInfo.icon]
    : Sun;
  const tempUnit = unitSystem === "metric" ? "°C" : "°F";
  const speedUnit = unitSystem === "metric" ? "km/h" : "mph";

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-white/70 mb-0.5">現在の天気</p>
          <p className="text-lg font-semibold text-white">
            {city.name}
          </p>
        </div>
        {WeatherIcon && (
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <WeatherIcon className="w-8 h-8 text-yellow-300" />
          </div>
        )}
      </div>

      {/* メイン温度表示 */}
      {data.temperature_2m != null && (
        <p className="text-4xl font-bold text-white mb-1 tabular-nums">
          {data.temperature_2m.toFixed(1)}
          <span className="text-lg font-normal text-white/70 ml-1">
            {tempUnit}
          </span>
        </p>
      )}

      {/* 天気の説明 */}
      {weatherInfo && (
        <p className="text-sm text-white/80 mb-4">{weatherInfo.label}</p>
      )}

      {/* 詳細情報グリッド */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15">
        {data.apparent_temperature != null && (
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/60">体感</p>
              <p className="text-sm text-white tabular-nums">
                {data.apparent_temperature.toFixed(1)}{tempUnit}
              </p>
            </div>
          </div>
        )}
        {data.relative_humidity_2m != null && (
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/60">湿度</p>
              <p className="text-sm text-white tabular-nums">
                {data.relative_humidity_2m}%
              </p>
            </div>
          </div>
        )}
        {data.wind_speed_10m != null && (
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/60">風速</p>
              <p className="text-sm text-white tabular-nums">
                {data.wind_speed_10m.toFixed(1)} {speedUnit}
              </p>
            </div>
          </div>
        )}
        {data.precipitation != null && (
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/60">降水量</p>
              <p className="text-sm text-white tabular-nums">
                {data.precipitation.toFixed(1)} mm
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
