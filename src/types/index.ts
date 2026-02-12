/**
 * types/index.ts
 * ─────────────
 * 責任: アプリケーション全体で共有する型定義と定数データ
 *
 * 設計意図:
 *  - APIレスポンスの型を明示することで、データ構造を「自己文書化」する
 *  - 都市・指標のマスターデータをここに集約し、UIコンポーネントからは
 *    「何を表示するか」のロジックを排除する
 *  - 定数に `as const` を使い、型推論を最大限活かす
 */

// ============================================================
// 都市データ
// ============================================================

/** 都市を一意に識別するリテラル型 */
export type CityId = "tokyo" | "osaka" | "sapporo" | "fukuoka" | "naha";

/** 都市の定義。APIに渡す緯度経度とUIに表示する情報を含む */
export interface City {
  readonly id: CityId;
  readonly name: string;        // 日本語表記
  readonly nameEn: string;      // 英語表記（チャートのツールチップ等）
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;    // IANA タイムゾーン
}

/**
 * 都市マスターデータ
 * 緯度経度は Open-Meteo Geocoding API の返却値と同等の精度
 */
export const CITIES: readonly City[] = [
  { id: "tokyo",   name: "東京",  nameEn: "Tokyo",    latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { id: "osaka",   name: "大阪",  nameEn: "Osaka",    latitude: 34.6937, longitude: 135.5023, timezone: "Asia/Tokyo" },
  { id: "sapporo", name: "札幌",  nameEn: "Sapporo",  latitude: 43.0621, longitude: 141.3544, timezone: "Asia/Tokyo" },
  { id: "fukuoka", name: "福岡",  nameEn: "Fukuoka",  latitude: 33.5904, longitude: 130.4017, timezone: "Asia/Tokyo" },
  { id: "naha",    name: "那覇",  nameEn: "Naha",     latitude: 26.2124, longitude: 127.6809, timezone: "Asia/Tokyo" },
] as const;

// ============================================================
// 気象指標
// ============================================================

/** 指標を一意に識別するキー（Open-Meteo APIのパラメータ名と一致） */
export type MetricId =
  | "temperature_2m"
  | "apparent_temperature"
  | "precipitation"
  | "relative_humidity_2m"
  | "wind_speed_10m"
  | "cloud_cover";

/** 指標の単位グループ。温度と風速は切替可能 */
export type UnitGroup = "temperature" | "speed" | "percentage" | "length";

/** 指標のメタデータ。UIの描画情報とAPI連携情報を持つ */
export interface MetricDefinition {
  readonly id: MetricId;
  readonly label: string;          // UI表示名
  readonly unitGroup: UnitGroup;   // 単位グループ（切替ロジックに使用）
  readonly unitMetric: string;     // メトリック単位（°C, km/h, mm, %）
  readonly unitImperial: string;   // ヤードポンド単位（°F, mph）
  readonly color: string;          // チャートの線色
  readonly icon: string;           // Lucideアイコン名
}

/**
 * 指標マスターデータ
 * color は Tailwind のカラーパレットに準拠し、チャート上で視認性を確保
 */
export const METRICS: readonly MetricDefinition[] = [
  {
    id: "temperature_2m",
    label: "気温",
    unitGroup: "temperature",
    unitMetric: "°C",
    unitImperial: "°F",
    color: "#f97316",  // orange-500: 暖色で気温を直感的に表現
    icon: "Thermometer",
  },
  {
    id: "apparent_temperature",
    label: "体感温度",
    unitGroup: "temperature",
    unitMetric: "°C",
    unitImperial: "°F",
    color: "#ef4444",  // red-500: 気温より「体感」の強さを赤で表現
    icon: "ThermometerSun",
  },
  {
    id: "precipitation",
    label: "降水量",
    unitGroup: "length",
    unitMetric: "mm",
    unitImperial: "mm",   // 降水量は慣例的にmmのまま
    color: "#3b82f6",  // blue-500: 雨・水を連想する青
    icon: "CloudRain",
  },
  {
    id: "relative_humidity_2m",
    label: "湿度",
    unitGroup: "percentage",
    unitMetric: "%",
    unitImperial: "%",
    color: "#2dd4bf",  // teal-400: 視認性の高い明るいティール
    icon: "Droplets",
  },
  {
    id: "wind_speed_10m",
    label: "風速",
    unitGroup: "speed",
    unitMetric: "km/h",
    unitImperial: "mph",
    color: "#8b5cf6",  // violet-500: 他の指標と区別しやすい紫
    icon: "Wind",
  },
  {
    id: "cloud_cover",
    label: "雲量",
    unitGroup: "percentage",
    unitMetric: "%",
    unitImperial: "%",
    color: "#6b7280",  // gray-500: 雲のグレー
    icon: "Cloud",
  },
] as const;

// ============================================================
// 表示モード（期間トグル）
// ============================================================

/**
 * "48h" = 48時間（hourly: 1時間ごとの詳細データ）
 * "7d"  = 7日間（hourly: 3時間間隔に間引いて表示）
 *
 * 両モードとも Open-Meteo の hourly エンドポイントを使用。
 * daily エンドポイントは指標名が異なる（temperature_2m_max 等）ため、
 * 指標定義を二重管理しなくて済む hourly で統一する。
 */
export type ViewMode = "48h" | "7d";

/** ViewMode → API の forecast_days パラメータへのマッピング */
export const VIEW_MODE_CONFIG: Record<ViewMode, { forecastDays: number; label: string }> = {
  "48h": { forecastDays: 2,  label: "48時間" },
  "7d":  { forecastDays: 7,  label: "7日間" },
};

// ============================================================
// 単位系
// ============================================================

/** trueならメトリック（°C, km/h）、falseならインペリアル（°F, mph） */
export type UnitSystem = "metric" | "imperial";

// ============================================================
// Open-Meteo APIレスポンス型
// ============================================================

/**
 * Open-Meteo Forecast API の hourly レスポンス
 * 実際のレスポンスにはより多くのフィールドがあるが、
 * 本アプリで使用するもののみ定義（YAGNI原則）
 */
export interface OpenMeteoHourlyResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];   // ISO 8601 形式の配列
    [key: string]: number[] | string[];
  };
  current?: {
    time: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    cloud_cover?: number;
  };
}

// ============================================================
// アプリ内部で使用する整形済みデータ
// ============================================================

/** チャート描画用の1データポイント */
export interface ChartDataPoint {
  time: string;              // 表示用の時刻文字列 "2/12 15:00" or "2/12"
  timestamp: number;         // ソート・比較用のUnixタイムスタンプ
  hour: number;              // 0-23。空背景の昼夜判定に使用
  weather_code: number;      // WMO天気コード。空背景のホバー連動に使用
  [key: string]: number | string;  // 動的な指標キー
}

/** チャートホバー時に SkyBackground に渡す情報 */
export interface HoveredPointInfo {
  weatherCode: number;
  hour: number;
}

/** useWeatherData フックの返却値 */
export interface WeatherDataState {
  data: ChartDataPoint[];
  currentWeather: OpenMeteoHourlyResponse["current"] | null;
  isLoading: boolean;
  error: string | null;
}

/** ユーザーの選択状態（localStorage に永続化する対象） */
export interface UserSelection {
  cityId: CityId;
  metricIds: MetricId[];
  viewMode: ViewMode;
  unitSystem: UnitSystem;
}

// ============================================================
// 空背景テーマ
// ============================================================

/**
 * 天気コードから空の視覚テーマを決定するための分類
 * SkyBackground コンポーネントがこれを使って背景グラデーションを選択する
 */
export type SkyCondition = "clear" | "cloudy" | "overcast" | "rain" | "snow" | "thunder" | "fog";

/** WMO天気コード → 空の状態へのマッピング */
export function weatherCodeToSkyCondition(code: number | undefined): SkyCondition {
  if (code === undefined) return "clear";
  if (code <= 1) return "clear";
  if (code === 2) return "cloudy";
  if (code === 3) return "overcast";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95) return "thunder";
  return "clear";
}

// ============================================================
// WMO天気コード → アイコンマッピング
// ============================================================

/**
 * WMO Weather Code (Code 4677) のサブセット
 * Open-Meteo の weather_code で返却される
 * 参考: https://open-meteo.com/en/docs
 */
export const WEATHER_CODE_MAP: Record<number, { label: string; icon: string }> = {
  0:  { label: "快晴",     icon: "Sun" },
  1:  { label: "晴れ",     icon: "Sun" },
  2:  { label: "一部曇り", icon: "CloudSun" },
  3:  { label: "曇り",     icon: "Cloud" },
  45: { label: "霧",       icon: "CloudFog" },
  48: { label: "着氷霧",   icon: "CloudFog" },
  51: { label: "小雨",     icon: "CloudDrizzle" },
  53: { label: "雨",       icon: "CloudDrizzle" },
  55: { label: "強い雨",   icon: "CloudDrizzle" },
  61: { label: "小雨",     icon: "CloudRain" },
  63: { label: "雨",       icon: "CloudRain" },
  65: { label: "大雨",     icon: "CloudRain" },
  71: { label: "小雪",     icon: "CloudSnow" },
  73: { label: "雪",       icon: "CloudSnow" },
  75: { label: "大雪",     icon: "CloudSnow" },
  80: { label: "にわか雨", icon: "CloudRain" },
  81: { label: "にわか雨", icon: "CloudRain" },
  82: { label: "激しいにわか雨", icon: "CloudRain" },
  95: { label: "雷雨",     icon: "CloudLightning" },
  96: { label: "雷雨（雹）", icon: "CloudLightning" },
  99: { label: "激しい雷雨", icon: "CloudLightning" },
};
