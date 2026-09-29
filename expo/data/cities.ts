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
}

export const CITIES: City[] = [
  // North America
  { name: 'New York', country: 'United States', lat: 40.71, lon: -74.01 },
  { name: 'Los Angeles', country: 'United States', lat: 34.05, lon: -118.24 },
  { name: 'Chicago', country: 'United States', lat: 41.88, lon: -87.63 },
  { name: 'Houston', country: 'United States', lat: 29.76, lon: -95.37 },
  { name: 'Miami', country: 'United States', lat: 25.76, lon: -80.19 },
  { name: 'San Francisco', country: 'United States', lat: 37.77, lon: -122.42 },
  { name: 'Seattle', country: 'United States', lat: 47.61, lon: -122.33 },
  { name: 'Portland', country: 'United States', lat: 45.52, lon: -122.68 },
  { name: 'San Diego', country: 'United States', lat: 32.72, lon: -117.16 },
  { name: 'Las Vegas', country: 'United States', lat: 36.17, lon: -115.14 },
  { name: 'Phoenix', country: 'United States', lat: 33.45, lon: -112.07 },
  { name: 'Denver', country: 'United States', lat: 39.74, lon: -104.99 },
  { name: 'Austin', country: 'United States', lat: 30.27, lon: -97.74 },
  { name: 'Dallas', country: 'United States', lat: 32.78, lon: -96.8 },
  { name: 'Nashville', country: 'United States', lat: 36.16, lon: -86.78 },
  { name: 'Atlanta', country: 'United States', lat: 33.75, lon: -84.39 },
  { name: 'New Orleans', country: 'United States', lat: 29.95, lon: -90.07 },
  { name: 'Washington, D.C.', country: 'United States', lat: 38.91, lon: -77.04 },
  { name: 'Boston', country: 'United States', lat: 42.36, lon: -71.06 },
  { name: 'Philadelphia', country: 'United States', lat: 39.95, lon: -75.17 },
  { name: 'Minneapolis', country: 'United States', lat: 44.98, lon: -93.27 },
  { name: 'Salt Lake City', country: 'United States', lat: 40.76, lon: -111.89 },
  { name: 'Honolulu', country: 'United States', lat: 21.31, lon: -157.86 },
  { name: 'Anchorage', country: 'United States', lat: 61.22, lon: -149.9 },
  { name: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38 },
  { name: 'Vancouver', country: 'Canada', lat: 49.28, lon: -123.12 },
  { name: 'Montreal', country: 'Canada', lat: 45.5, lon: -73.57 },
  { name: 'Calgary', country: 'Canada', lat: 51.05, lon: -114.07 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13 },
  { name: 'Cancún', country: 'Mexico', lat: 21.16, lon: -86.85 },
  { name: 'Guadalajara', country: 'Mexico', lat: 20.66, lon: -103.35 },

  // Central America & Caribbean
  { name: 'Havana', country: 'Cuba', lat: 23.11, lon: -82.37 },
  { name: 'San Juan', country: 'Puerto Rico', lat: 18.47, lon: -66.11 },
  { name: 'Kingston', country: 'Jamaica', lat: 18.0, lon: -76.79 },
  { name: 'Panama City', country: 'Panama', lat: 8.98, lon: -79.52 },
  { name: 'San José', country: 'Costa Rica', lat: 9.93, lon: -84.08 },

  // South America
  { name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lon: -43.17 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6, lon: -58.38 },
  { name: 'Santiago', country: 'Chile', lat: -33.45, lon: -70.67 },
  { name: 'Lima', country: 'Peru', lat: -12.05, lon: -77.04 },
  { name: 'Bogotá', country: 'Colombia', lat: 4.71, lon: -74.07 },
  { name: 'Medellín', country: 'Colombia', lat: 6.24, lon: -75.58 },
  { name: 'Cartagena', country: 'Colombia', lat: 10.39, lon: -75.51 },
  { name: 'Quito', country: 'Ecuador', lat: -0.18, lon: -78.47 },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.9, lon: -56.16 },

  // Europe
  { name: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.13 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.95, lon: -3.19 },
  { name: 'Dublin', country: 'Ireland', lat: 53.35, lon: -6.26 },
  { name: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
  { name: 'Nice', country: 'France', lat: 43.71, lon: 7.26 },
  { name: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.7 },
  { name: 'Barcelona', country: 'Spain', lat: 41.39, lon: 2.17 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.72, lon: -9.14 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lon: 4.9 },
  { name: 'Brussels', country: 'Belgium', lat: 50.85, lon: 4.35 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.41 },
  { name: 'Munich', country: 'Germany', lat: 48.14, lon: 11.58 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.38, lon: 8.54 },
  { name: 'Vienna', country: 'Austria', lat: 48.21, lon: 16.37 },
  { name: 'Prague', country: 'Czechia', lat: 50.08, lon: 14.44 },
  { name: 'Rome', country: 'Italy', lat: 41.9, lon: 12.5 },
  { name: 'Milan', country: 'Italy', lat: 45.46, lon: 9.19 },
  { name: 'Florence', country: 'Italy', lat: 43.77, lon: 11.26 },
  { name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.73 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.68, lon: 12.57 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.33, lon: 18.07 },
  { name: 'Oslo', country: 'Norway', lat: 59.91, lon: 10.75 },
  { name: 'Helsinki', country: 'Finland', lat: 60.17, lon: 24.94 },
  { name: 'Reykjavík', country: 'Iceland', lat: 64.15, lon: -21.94 },
  { name: 'Warsaw', country: 'Poland', lat: 52.23, lon: 21.01 },
  { name: 'Budapest', country: 'Hungary', lat: 47.5, lon: 19.04 },
  { name: 'Istanbul', country: 'Türkiye', lat: 41.01, lon: 28.98 },

  // Middle East & Africa
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2, lon: 55.27 },
  { name: 'Doha', country: 'Qatar', lat: 25.29, lon: 51.53 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.09, lon: 34.78 },
  { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24 },
  { name: 'Marrakesh', country: 'Morocco', lat: 31.63, lon: -8.01 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.52, lon: 3.38 },
  { name: 'Accra', country: 'Ghana', lat: 5.6, lon: -0.19 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2, lon: 28.05 },
  { name: 'Zanzibar City', country: 'Tanzania', lat: -6.16, lon: 39.2 },

  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69 },
  { name: 'Osaka', country: 'Japan', lat: 34.69, lon: 135.5 },
  { name: 'Kyoto', country: 'Japan', lat: 35.01, lon: 135.77 },
  { name: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98 },
  { name: 'Beijing', country: 'China', lat: 39.9, lon: 116.41 },
  { name: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47 },
  { name: 'Hong Kong', country: 'China', lat: 22.32, lon: 114.17 },
  { name: 'Taipei', country: 'Taiwan', lat: 25.03, lon: 121.57 },
  { name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.5 },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.79, lon: 98.98 },
  { name: 'Bali', country: 'Indonesia', lat: -8.65, lon: 115.22 },
  { name: 'Manila', country: 'Philippines', lat: 14.6, lon: 120.98 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.82, lon: 106.63 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.03, lon: 105.85 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.14, lon: 101.69 },
  { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { name: 'New Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  { name: 'Bengaluru', country: 'India', lat: 12.97, lon: 77.59 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32 },

  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
  { name: 'Melbourne', country: 'Australia', lat: -37.81, lon: 144.96 },
  { name: 'Brisbane', country: 'Australia', lat: -27.47, lon: 153.03 },
  { name: 'Perth', country: 'Australia', lat: -31.95, lon: 115.86 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.85, lon: 174.76 },
  { name: 'Queenstown', country: 'New Zealand', lat: -45.03, lon: 168.66 },
  { name: 'Nadi', country: 'Fiji', lat: -17.78, lon: 177.42 },
];
