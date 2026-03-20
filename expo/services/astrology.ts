const API_URL = process.env.EXPO_PUBLIC_ASTRO_API_URL!;
const API_KEY = process.env.EXPO_PUBLIC_ASTRO_API_KEY!;

const headers = {
  'Content-Type': 'application/json',
  Authorization: 'Basic ' + btoa(`${API_KEY}:`),
};

export interface BirthData {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
}

export interface PlanetPosition {
  name: string;
  sign: string;
  signLord: string;
  fullDegree: number;
  normDegree: number;
  isRetro: string;
  house: number;
}

async function apiPost<T>(endpoint: string, body: BirthData): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Astrology API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getNatalWheelChart(data: BirthData): Promise<string> {
  const result = await apiPost<{ svg: string }>('/natal_wheel_chart', data);
  return result.svg;
}

export async function getPlanets(data: BirthData): Promise<PlanetPosition[]> {
  return apiPost<PlanetPosition[]>('/planets', data);
}

export async function getWesternHoroscope(
  data1: BirthData,
  data2: BirthData
): Promise<Record<string, unknown>> {
  const body = {
    p1_day: data1.day, p1_month: data1.month, p1_year: data1.year,
    p1_hour: data1.hour, p1_min: data1.min,
    p1_lat: data1.lat, p1_lon: data1.lon, p1_tzone: data1.tzone,
    p2_day: data2.day, p2_month: data2.month, p2_year: data2.year,
    p2_hour: data2.hour, p2_min: data2.min,
    p2_lat: data2.lat, p2_lon: data2.lon, p2_tzone: data2.tzone,
  };
  const res = await fetch(`${API_URL}/western_horoscope`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Astrology API error: ${res.status}`);
  return res.json();
}

export function parseBirthDate(dateStr: string): { day: number; month: number; year: number } | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { day, month, year };
}
