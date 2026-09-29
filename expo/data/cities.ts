/**
 * Major world cities for the Places feature.
 *
 * Chosen for recognisability and spread rather than population rank alone — a
 * planet line has to land near *something* a user has heard of on every
 * continent, so smaller but well-known cities fill gaps the megacities leave.
 * Coordinates are city-centre values to two decimals, well inside the ~2°
 * tolerance the line matching uses.
 */

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  /**
   * IANA time zone. Only needed to turn a clock time recorded in this city into UT —
   * planet lines depend on the birth instant, not the birthplace, so picking the
   * nearest listed city in the same zone gives an identical result.
   */
  tz: string;
}

export const CITIES: City[] = [
  // North America
  { name: 'New York', country: 'United States', lat: 40.71, lon: -74.01, tz: 'America/New_York' },
  { name: 'Los Angeles', country: 'United States', lat: 34.05, lon: -118.24, tz: 'America/Los_Angeles' },
  { name: 'Chicago', country: 'United States', lat: 41.88, lon: -87.63, tz: 'America/Chicago' },
  { name: 'Houston', country: 'United States', lat: 29.76, lon: -95.37, tz: 'America/Chicago' },
  { name: 'Miami', country: 'United States', lat: 25.76, lon: -80.19, tz: 'America/New_York' },
  { name: 'San Francisco', country: 'United States', lat: 37.77, lon: -122.42, tz: 'America/Los_Angeles' },
  { name: 'Seattle', country: 'United States', lat: 47.61, lon: -122.33, tz: 'America/Los_Angeles' },
  { name: 'Portland', country: 'United States', lat: 45.52, lon: -122.68, tz: 'America/Los_Angeles' },
  { name: 'San Diego', country: 'United States', lat: 32.72, lon: -117.16, tz: 'America/Los_Angeles' },
  { name: 'Las Vegas', country: 'United States', lat: 36.17, lon: -115.14, tz: 'America/Los_Angeles' },
  { name: 'Phoenix', country: 'United States', lat: 33.45, lon: -112.07, tz: 'America/Phoenix' },
  { name: 'Denver', country: 'United States', lat: 39.74, lon: -104.99, tz: 'America/Denver' },
  { name: 'Austin', country: 'United States', lat: 30.27, lon: -97.74, tz: 'America/Chicago' },
  { name: 'Dallas', country: 'United States', lat: 32.78, lon: -96.8, tz: 'America/Chicago' },
  { name: 'Nashville', country: 'United States', lat: 36.16, lon: -86.78, tz: 'America/Chicago' },
  { name: 'Atlanta', country: 'United States', lat: 33.75, lon: -84.39, tz: 'America/New_York' },
  { name: 'New Orleans', country: 'United States', lat: 29.95, lon: -90.07, tz: 'America/Chicago' },
  { name: 'Washington, D.C.', country: 'United States', lat: 38.91, lon: -77.04, tz: 'America/New_York' },
  { name: 'Boston', country: 'United States', lat: 42.36, lon: -71.06, tz: 'America/New_York' },
  { name: 'Philadelphia', country: 'United States', lat: 39.95, lon: -75.17, tz: 'America/New_York' },
  { name: 'Minneapolis', country: 'United States', lat: 44.98, lon: -93.27, tz: 'America/Chicago' },
  { name: 'Salt Lake City', country: 'United States', lat: 40.76, lon: -111.89, tz: 'America/Denver' },
  { name: 'Honolulu', country: 'United States', lat: 21.31, lon: -157.86, tz: 'Pacific/Honolulu' },
  { name: 'Anchorage', country: 'United States', lat: 61.22, lon: -149.9, tz: 'America/Anchorage' },
  { name: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38, tz: 'America/Toronto' },
  { name: 'Vancouver', country: 'Canada', lat: 49.28, lon: -123.12, tz: 'America/Vancouver' },
  { name: 'Montreal', country: 'Canada', lat: 45.5, lon: -73.57, tz: 'America/Toronto' },
  { name: 'Calgary', country: 'Canada', lat: 51.05, lon: -114.07, tz: 'America/Edmonton' },
  { name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13, tz: 'America/Mexico_City' },
  { name: 'Cancún', country: 'Mexico', lat: 21.16, lon: -86.85, tz: 'America/Cancun' },
  { name: 'Guadalajara', country: 'Mexico', lat: 20.66, lon: -103.35, tz: 'America/Mexico_City' },

  // Central America & Caribbean
  { name: 'Havana', country: 'Cuba', lat: 23.11, lon: -82.37, tz: 'America/Havana' },
  { name: 'San Juan', country: 'Puerto Rico', lat: 18.47, lon: -66.11, tz: 'America/Puerto_Rico' },
  { name: 'Kingston', country: 'Jamaica', lat: 18.0, lon: -76.79, tz: 'America/Jamaica' },
  { name: 'Panama City', country: 'Panama', lat: 8.98, lon: -79.52, tz: 'America/Panama' },
  { name: 'San José', country: 'Costa Rica', lat: 9.93, lon: -84.08, tz: 'America/Costa_Rica' },

  // South America
  { name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63, tz: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lon: -43.17, tz: 'America/Sao_Paulo' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6, lon: -58.38, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Santiago', country: 'Chile', lat: -33.45, lon: -70.67, tz: 'America/Santiago' },
  { name: 'Lima', country: 'Peru', lat: -12.05, lon: -77.04, tz: 'America/Lima' },
  { name: 'Bogotá', country: 'Colombia', lat: 4.71, lon: -74.07, tz: 'America/Bogota' },
  { name: 'Medellín', country: 'Colombia', lat: 6.24, lon: -75.58, tz: 'America/Bogota' },
  { name: 'Cartagena', country: 'Colombia', lat: 10.39, lon: -75.51, tz: 'America/Bogota' },
  { name: 'Quito', country: 'Ecuador', lat: -0.18, lon: -78.47, tz: 'America/Guayaquil' },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.9, lon: -56.16, tz: 'America/Montevideo' },

  // Europe
  { name: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.13, tz: 'Europe/London' },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.95, lon: -3.19, tz: 'Europe/London' },
  { name: 'Dublin', country: 'Ireland', lat: 53.35, lon: -6.26, tz: 'Europe/Dublin' },
  { name: 'Paris', country: 'France', lat: 48.86, lon: 2.35, tz: 'Europe/Paris' },
  { name: 'Nice', country: 'France', lat: 43.71, lon: 7.26, tz: 'Europe/Paris' },
  { name: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.7, tz: 'Europe/Madrid' },
  { name: 'Barcelona', country: 'Spain', lat: 41.39, lon: 2.17, tz: 'Europe/Madrid' },
  { name: 'Lisbon', country: 'Portugal', lat: 38.72, lon: -9.14, tz: 'Europe/Lisbon' },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lon: 4.9, tz: 'Europe/Amsterdam' },
  { name: 'Brussels', country: 'Belgium', lat: 50.85, lon: 4.35, tz: 'Europe/Brussels' },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.41, tz: 'Europe/Berlin' },
  { name: 'Munich', country: 'Germany', lat: 48.14, lon: 11.58, tz: 'Europe/Berlin' },
  { name: 'Zurich', country: 'Switzerland', lat: 47.38, lon: 8.54, tz: 'Europe/Zurich' },
  { name: 'Vienna', country: 'Austria', lat: 48.21, lon: 16.37, tz: 'Europe/Vienna' },
  { name: 'Prague', country: 'Czechia', lat: 50.08, lon: 14.44, tz: 'Europe/Prague' },
  { name: 'Rome', country: 'Italy', lat: 41.9, lon: 12.5, tz: 'Europe/Rome' },
  { name: 'Milan', country: 'Italy', lat: 45.46, lon: 9.19, tz: 'Europe/Rome' },
  { name: 'Florence', country: 'Italy', lat: 43.77, lon: 11.26, tz: 'Europe/Rome' },
  { name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.73, tz: 'Europe/Athens' },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.68, lon: 12.57, tz: 'Europe/Copenhagen' },
  { name: 'Stockholm', country: 'Sweden', lat: 59.33, lon: 18.07, tz: 'Europe/Stockholm' },
  { name: 'Oslo', country: 'Norway', lat: 59.91, lon: 10.75, tz: 'Europe/Oslo' },
  { name: 'Helsinki', country: 'Finland', lat: 60.17, lon: 24.94, tz: 'Europe/Helsinki' },
  { name: 'Reykjavík', country: 'Iceland', lat: 64.15, lon: -21.94, tz: 'Atlantic/Reykjavik' },
  { name: 'Warsaw', country: 'Poland', lat: 52.23, lon: 21.01, tz: 'Europe/Warsaw' },
  { name: 'Budapest', country: 'Hungary', lat: 47.5, lon: 19.04, tz: 'Europe/Budapest' },
  { name: 'Istanbul', country: 'Türkiye', lat: 41.01, lon: 28.98, tz: 'Europe/Istanbul' },

  // Middle East & Africa
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2, lon: 55.27, tz: 'Asia/Dubai' },
  { name: 'Doha', country: 'Qatar', lat: 25.29, lon: 51.53, tz: 'Asia/Qatar' },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.09, lon: 34.78, tz: 'Asia/Jerusalem' },
  { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24, tz: 'Africa/Cairo' },
  { name: 'Marrakesh', country: 'Morocco', lat: 31.63, lon: -8.01, tz: 'Africa/Casablanca' },
  { name: 'Lagos', country: 'Nigeria', lat: 6.52, lon: 3.38, tz: 'Africa/Lagos' },
  { name: 'Accra', country: 'Ghana', lat: 5.6, lon: -0.19, tz: 'Africa/Accra' },
  { name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82, tz: 'Africa/Nairobi' },
  { name: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42, tz: 'Africa/Johannesburg' },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2, lon: 28.05, tz: 'Africa/Johannesburg' },
  { name: 'Zanzibar City', country: 'Tanzania', lat: -6.16, lon: 39.2, tz: 'Africa/Dar_es_Salaam' },

  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' },
  { name: 'Osaka', country: 'Japan', lat: 34.69, lon: 135.5, tz: 'Asia/Tokyo' },
  { name: 'Kyoto', country: 'Japan', lat: 35.01, lon: 135.77, tz: 'Asia/Tokyo' },
  { name: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98, tz: 'Asia/Seoul' },
  { name: 'Beijing', country: 'China', lat: 39.9, lon: 116.41, tz: 'Asia/Shanghai' },
  { name: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47, tz: 'Asia/Shanghai' },
  { name: 'Hong Kong', country: 'China', lat: 22.32, lon: 114.17, tz: 'Asia/Hong_Kong' },
  { name: 'Taipei', country: 'Taiwan', lat: 25.03, lon: 121.57, tz: 'Asia/Taipei' },
  { name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82, tz: 'Asia/Singapore' },
  { name: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.5, tz: 'Asia/Bangkok' },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.79, lon: 98.98, tz: 'Asia/Bangkok' },
  { name: 'Bali', country: 'Indonesia', lat: -8.65, lon: 115.22, tz: 'Asia/Makassar' },
  { name: 'Manila', country: 'Philippines', lat: 14.6, lon: 120.98, tz: 'Asia/Manila' },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.82, lon: 106.63, tz: 'Asia/Ho_Chi_Minh' },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.03, lon: 105.85, tz: 'Asia/Ho_Chi_Minh' },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.14, lon: 101.69, tz: 'Asia/Kuala_Lumpur' },
  { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88, tz: 'Asia/Kolkata' },
  { name: 'New Delhi', country: 'India', lat: 28.61, lon: 77.21, tz: 'Asia/Kolkata' },
  { name: 'Bengaluru', country: 'India', lat: 12.97, lon: 77.59, tz: 'Asia/Kolkata' },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32, tz: 'Asia/Kathmandu' },

  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21, tz: 'Australia/Sydney' },
  { name: 'Melbourne', country: 'Australia', lat: -37.81, lon: 144.96, tz: 'Australia/Melbourne' },
  { name: 'Brisbane', country: 'Australia', lat: -27.47, lon: 153.03, tz: 'Australia/Brisbane' },
  { name: 'Perth', country: 'Australia', lat: -31.95, lon: 115.86, tz: 'Australia/Perth' },
  { name: 'Auckland', country: 'New Zealand', lat: -36.85, lon: 174.76, tz: 'Pacific/Auckland' },
  { name: 'Queenstown', country: 'New Zealand', lat: -45.03, lon: 168.66, tz: 'Pacific/Auckland' },
  { name: 'Nadi', country: 'Fiji', lat: -17.78, lon: 177.42, tz: 'Pacific/Fiji' },
];
