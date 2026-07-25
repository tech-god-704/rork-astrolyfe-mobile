import { fetchWithRetry, parseResponseOrThrow } from '@/lib/network';
import { parseAndValidateBirthDate, isValidCoordinates, isValidTimezone } from '@/lib/validation';

const API_URL = process.env.EXPO_PUBLIC_ASTRO_API_URL || 'https://json.astrologyapi.com/v1';
const API_KEY = process.env.EXPO_PUBLIC_ASTRO_API_KEY || 'ask_52801e29c50b20313b5cac494760afe5fefa02cf2943ae295f49166e13064efb';

const headers: Record<string, string> = {
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

/**
 * Validate BirthData before sending to API.
 */
function validateBirthData(data: BirthData): void {
  if (data.year < 1900 || data.year > new Date().getFullYear() + 1) {
    throw new Error('Invalid birth year');
  }
  if (data.month < 1 || data.month > 12) throw new Error('Invalid birth month');
  if (data.day < 1 || data.day > 31) throw new Error('Invalid birth day');
  if (data.hour < 0 || data.hour > 23) throw new Error('Invalid hour');
  if (data.min < 0 || data.min > 59) throw new Error('Invalid minute');
  if (!isValidCoordinates(data.lat, data.lon)) {
    throw new Error('Invalid coordinates');
  }
  if (!isValidTimezone(data.tzone)) {
    throw new Error('Invalid timezone');
  }
}

/**
 * POST to the Astrology API with retry and timeout.
 */
async function apiPost<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetchWithRetry(
    `${API_URL}${endpoint}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    { timeout: 20000, maxRetries: 2 },
  );
  return parseResponseOrThrow<T>(res, `Astrology API (${endpoint})`);
}

export async function getNatalWheelChart(data: BirthData): Promise<string> {
  validateBirthData(data);
  const result = await apiPost<{ svg: string }>('/natal_wheel_chart', data);
  return result.svg;
}

export async function getPlanets(data: BirthData): Promise<PlanetPosition[]> {
  validateBirthData(data);
  const result = await apiPost<PlanetPosition[]>('/planets', data);
  if (!Array.isArray(result)) {
    throw new Error('Unexpected response from planets API');
  }
  return result;
}

export async function getWesternHoroscope(
  data1: BirthData,
  data2: BirthData,
): Promise<Record<string, unknown>> {
  validateBirthData(data1);
  validateBirthData(data2);
  const body = {
    p1_day: data1.day, p1_month: data1.month, p1_year: data1.year,
    p1_hour: data1.hour, p1_min: data1.min,
    p1_lat: data1.lat, p1_lon: data1.lon, p1_tzone: data1.tzone,
    p2_day: data2.day, p2_month: data2.month, p2_year: data2.year,
    p2_hour: data2.hour, p2_min: data2.min,
    p2_lat: data2.lat, p2_lon: data2.lon, p2_tzone: data2.tzone,
  };
  return apiPost<Record<string, unknown>>('/western_horoscope', body);
}

/**
 * Parse a YYYY-MM-DD date string into BirthData components.
 * Uses validation to ensure the date is real.
 */
export function parseBirthDate(dateStr: string): { day: number; month: number; year: number } | null {
  return parseAndValidateBirthDate(dateStr);
}
