export interface ZodiacSign {
  name: string;
  symbol: string;
  dates: string;
  element: string;
  color: string;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: 'Aries', symbol: '♈', dates: 'Mar 21 – Apr 19', element: 'Fire', color: '#EF4444' },
  { name: 'Taurus', symbol: '♉', dates: 'Apr 20 – May 20', element: 'Earth', color: '#22C55E' },
  { name: 'Gemini', symbol: '♊', dates: 'May 21 – Jun 20', element: 'Air', color: '#FBBF24' },
  { name: 'Cancer', symbol: '♋', dates: 'Jun 21 – Jul 22', element: 'Water', color: '#818CF8' },
  { name: 'Leo', symbol: '♌', dates: 'Jul 23 – Aug 22', element: 'Fire', color: '#F97316' },
  { name: 'Virgo', symbol: '♍', dates: 'Aug 23 – Sep 22', element: 'Earth', color: '#84CC16' },
  { name: 'Libra', symbol: '♎', dates: 'Sep 23 – Oct 22', element: 'Air', color: '#F472B6' },
  { name: 'Scorpio', symbol: '♏', dates: 'Oct 23 – Nov 21', element: 'Water', color: '#DC2626' },
  { name: 'Sagittarius', symbol: '♐', dates: 'Nov 22 – Dec 21', element: 'Fire', color: '#A855F7' },
  { name: 'Capricorn', symbol: '♑', dates: 'Dec 22 – Jan 19', element: 'Earth', color: '#6B7280' },
  { name: 'Aquarius', symbol: '♒', dates: 'Jan 20 – Feb 18', element: 'Air', color: '#06B6D4' },
  { name: 'Pisces', symbol: '♓', dates: 'Feb 19 – Mar 20', element: 'Water', color: '#2DD4BF' },
];

export function getZodiacByName(name: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

export function getMoonPhase(): { name: string; emoji: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(365.25 * year) + Math.floor(30.6 * month) + day - 694039.09;
  const phase = (c % 29.53) / 29.53;
  if (phase < 0.0625) return { name: 'New Moon', emoji: '🌑' };
  if (phase < 0.1875) return { name: 'Waxing Crescent', emoji: '🌒' };
  if (phase < 0.3125) return { name: 'First Quarter', emoji: '🌓' };
  if (phase < 0.4375) return { name: 'Waxing Gibbous', emoji: '🌔' };
  if (phase < 0.5625) return { name: 'Full Moon', emoji: '🌕' };
  if (phase < 0.6875) return { name: 'Waning Gibbous', emoji: '🌖' };
  if (phase < 0.8125) return { name: 'Last Quarter', emoji: '🌗' };
  if (phase < 0.9375) return { name: 'Waning Crescent', emoji: '🌘' };
  return { name: 'New Moon', emoji: '🌑' };
}
