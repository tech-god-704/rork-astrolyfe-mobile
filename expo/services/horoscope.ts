import { fetchWithRetry } from '@/lib/network';

const API_BASE = 'https://freehoroscopeapi.com/api/v1';

export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly';

export interface HoroscopeReading {
  sign: string;
  period: HoroscopePeriod;
  date: string;
  horoscope: string;
}

interface ApiResponse {
  data: {
    date: string;
    period: string;
    sign: string;
    horoscope: string;
  };
  status: number;
  success: boolean;
}

/**
 * Fetch horoscope from freehoroscopeapi.com
 */
export async function fetchHoroscope(
  sign: string,
  period: HoroscopePeriod,
): Promise<HoroscopeReading> {
  const signLower = sign.toLowerCase();
  const url = `${API_BASE}/get-horoscope/${period}?sign=${signLower}`;

  try {
    const response = await fetchWithRetry(url, undefined, {
      timeout: 10000,
      maxRetries: 2,
      baseDelay: 800,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const json: ApiResponse = await response.json();

    if (!json?.data?.horoscope) {
      throw new Error('Empty horoscope response');
    }

    return {
      sign: json.data.sign || sign,
      period,
      date: json.data.date || new Date().toISOString().split('T')[0],
      horoscope: json.data.horoscope,
    };
  } catch (error) {
    console.log(`[Horoscope API] ${period} fetch failed for ${sign}:`, error);
    return getFallbackHoroscope(sign, period);
  }
}

/**
 * Split a long horoscope text into categorized sections for richer display.
 * Splits by sentence groups and assigns meaningful categories.
 */
export function categorizeHoroscope(reading: HoroscopeReading): CategorizedReading[] {
  const text = reading.horoscope.trim();
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 2) {
    return [{
      category: 'general',
      title: 'Overview',
      content: text,
    }];
  }

  const categories: { category: string; title: string }[] = [
    { category: 'general', title: 'Overview' },
    { category: 'love', title: 'Love & Relationships' },
    { category: 'career', title: 'Career & Growth' },
    { category: 'health', title: 'Wellness & Energy' },
  ];

  const perCategory = Math.ceil(sentences.length / categories.length);
  const results: CategorizedReading[] = [];

  for (let i = 0; i < categories.length; i++) {
    const start = i * perCategory;
    const chunk = sentences.slice(start, start + perCategory);
    if (chunk.length === 0) break;
    results.push({
      category: categories[i].category,
      title: categories[i].title,
      content: chunk.join('').trim(),
    });
  }

  return results;
}

export interface CategorizedReading {
  category: string;
  title: string;
  content: string;
}

// ── Fallback horoscope generator ──────────────────────────────────
// Deterministic daily content based on sign + date so it changes every day
// but stays consistent within the same day.

function getDayHash(sign: string): number {
  const today = new Date();
  const str = `${sign}-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const DAILY_TEMPLATES = [
  "The stars are aligning in your favor today. Trust your instincts and take that leap of faith you've been contemplating. Your natural charisma is heightened, making it an excellent day for important conversations. Pay attention to subtle signs from the universe — they're guiding you toward your highest path. Financial opportunities may present themselves unexpectedly. Stay grounded and remember that patience is your greatest ally right now.",
  "A wave of creative energy surrounds you today. Channel this into projects that matter most to you, and you'll be amazed at what you accomplish. Relationships deepen as you open your heart to vulnerability. The cosmos encourages you to express your true feelings without fear. A surprising encounter could shift your perspective on something you've taken for granted. Take time for self-care this evening.",
  "Today brings clarity to a situation that has been puzzling you. The fog lifts and you can see the path forward with renewed confidence. Your intuition is particularly strong — listen to that inner voice. Professional endeavors receive a boost from unexpected quarters. Someone from your past may reach out with meaningful news. Embrace change as it comes; it's leading you exactly where you need to be.",
  "The celestial energies favor bold moves today. Step outside your comfort zone and explore new horizons. Your communication skills are enhanced, making it the perfect time to pitch ideas or have meaningful dialogues. A financial matter resolves in your favor. Romance is in the air for those open to it. Ground yourself with meditation or nature walks to maintain your energetic balance.",
  "Today is about building foundations for your future. The stars support long-term planning and strategic thinking. You may feel drawn to learning something new — follow that curiosity. Emotional connections strengthen when you lead with authenticity. A creative project reaches an important milestone. Watch for synchronicities throughout the day, as the universe is sending you confirmations that you're on the right track.",
  "Dynamic energy flows through your sign today. You'll find yourself more motivated and focused than usual. Use this cosmic boost to tackle tasks you've been postponing. A conversation with a mentor or wise friend brings valuable insights. Your health and vitality are highlighted — consider starting a new wellness routine. The evening brings opportunities for social connection and joy.",
  "The planets encourage reflection and inner growth today. Take time to assess your goals and realign with your deeper purpose. Creative inspiration strikes when you least expect it. Financial decisions made today have long-lasting positive effects. A loved one needs your support — your compassion makes all the difference. Trust that the universe has your back, even when the path seems unclear.",
  "Adventure calls to you today. Whether it's trying a new restaurant, exploring a different route, or diving into an unfamiliar subject, novelty brings growth. Your magnetic personality attracts positive attention in professional settings. A heartfelt conversation deepens a bond you cherish. The stars suggest that a small risk taken now could yield significant rewards later. End your day with gratitude.",
  "Today's cosmic alignment brings harmony to your relationships. Misunderstandings clear up naturally, and compromises feel effortless. Your work ethic impresses those in positions of influence. A flash of insight reveals a solution to a lingering problem. Physical activity brings both energy and mental clarity. The universe rewards your persistence — keep going on that goal you've been working toward.",
  "Transformation is the theme of the day. Old patterns fall away as you embrace a more authentic version of yourself. Professional opportunities align with your passions. A financial surprise — likely positive — arrives before the day's end. Your emotional intelligence is your superpower today; use it wisely in negotiations and personal interactions. The stars remind you that every ending makes space for a new beginning.",
];

const WEEKLY_TEMPLATES = [
  "This week opens powerful doors for personal evolution. The early days bring clarity in professional matters, while midweek invites deeper emotional connections. By Thursday, a creative breakthrough could change your approach to a long-standing project. Financial matters stabilize, and a smart investment of time or resources pays off. The weekend favors rest, romance, and reconnecting with your spiritual side. Trust the journey — the cosmos has orchestrated these events for your highest good.",
  "A week of dynamic shifts awaits you. Monday and Tuesday favor bold communication and networking. Midweek brings an opportunity to heal an old wound or resolve a lingering disagreement. Your intuition peaks around Wednesday, making it ideal for important decisions. Thursday through Friday highlights career ambitions — push forward with confidence. The weekend wraps up with social joy and a renewed sense of purpose. Stay flexible; the best outcomes arise from adaptability.",
  "The stars paint a week of growth and discovery. Early days challenge you to step into leadership roles with grace. A surprising message or encounter midweek sparks new ideas. Financial currents shift favorably around Thursday — look for deals or negotiations that benefit you. Romantic energy intensifies as the week progresses. By Sunday, you'll look back and realize how far you've come. Prioritize balance between work and play.",
  "This week invites you to dream bigger. The first half emphasizes planning and strategy — lay the groundwork for future success. Wednesday brings a pivotal conversation that could redefine a relationship. Creative projects flourish under Thursday's aspects. Financial discipline early in the week rewards you by Friday. The weekend is perfect for adventure, whether physical travel or exploring new intellectual territories. Your resilience is your superpower this week.",
];

const MONTHLY_TEMPLATES = [
  "This month marks a turning point in your cosmic journey. The first week sets the tone with fresh beginnings and renewed motivation. Career opportunities surface around the second week — stay alert for unexpected offers or collaborations. Midmonth brings a focus on relationships; honest conversations lead to deeper bonds. Financial matters favor conservative approaches early on, shifting to calculated risks by the third week. Your health benefits from establishing consistent routines. The final week invites reflection and planning for the next chapter. Key dates to watch: the New Moon amplifies new beginnings, while the Full Moon illuminates hidden truths. Trust your instincts throughout — they're cosmically calibrated for success.",
  "A month of transformation and discovery unfolds before you. The opening days demand courage as old structures give way to new possibilities. By the second week, your social circle expands with meaningful connections. Midmonth, a creative or professional breakthrough rewards months of effort. Romance takes center stage around the third week — single or coupled, love deepens through vulnerability. Financial stability grows when you trust your long-term vision over short-term impulses. Your physical energy peaks midmonth; channel it into activities that challenge and exhilarate you. The closing days bring gratitude and cosmic clarity. Pay attention to dreams this month — they carry messages from your higher self.",
  "The cosmic blueprint for this month emphasizes balance and bold action. Week one brings mental clarity perfect for setting intentions and starting projects. Unexpected news around the second week creates exciting pivots in your professional life. Relationships undergo positive evolution midmonth — communicate openly and watch bonds strengthen. Financial themes revolve around smart investments in yourself: education, health, and experiences that expand your worldview. The third week is your power window for negotiations and closing deals. As the month ends, spiritual insights guide you toward your next big leap. Maintain your energy with regular rest and mindful practices. The universe is conspiring in your favor — align your actions with your highest aspirations.",
];

function getFallbackHoroscope(sign: string, period: HoroscopePeriod): HoroscopeReading {
  const hash = getDayHash(sign);
  let text: string;

  switch (period) {
    case 'daily':
      text = DAILY_TEMPLATES[hash % DAILY_TEMPLATES.length];
      break;
    case 'weekly':
      text = WEEKLY_TEMPLATES[hash % WEEKLY_TEMPLATES.length];
      break;
    case 'monthly':
      text = MONTHLY_TEMPLATES[hash % MONTHLY_TEMPLATES.length];
      break;
  }

  return {
    sign,
    period,
    date: new Date().toISOString().split('T')[0],
    horoscope: text,
  };
}
