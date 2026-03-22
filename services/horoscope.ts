import { supabase } from '@/lib/supabase';

export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly';

export interface HoroscopeReading {
  sign: string;
  period: HoroscopePeriod;
  date: string;
  horoscope: string;
  source: 'curated' | 'local';
}

export interface CategorizedReading {
  category: string;
  title: string;
  content: string;
}

/**
 * Fetch curated horoscope from the Supabase `horoscopes` table.
 * The web app writes curated daily/weekly/monthly content per zodiac sign.
 * Returns null if no curated content exists (falls back to local generation).
 */
export async function fetchCuratedHoroscope(
  sign: string,
  period: HoroscopePeriod,
): Promise<HoroscopeReading | null> {
  try {
    const { data, error } = await supabase
      .from('horoscopes')
      .select('content, title, category')
      .eq('zodiac_sign', sign.toLowerCase())
      .eq('period_type', period)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.content) return null;

    return {
      sign,
      period,
      date: new Date().toISOString().split('T')[0],
      horoscope: data.content,
      source: 'curated',
    };
  } catch {
    return null;
  }
}

/**
 * Get horoscope content immediately (no network required).
 * Content changes daily based on sign + date.
 * Use fetchCuratedHoroscope() for server-side curated content when available.
 */
export function getHoroscope(sign: string, period: HoroscopePeriod): HoroscopeReading {
  const hash = getDayHash(sign, period);
  let templates: string[];

  switch (period) {
    case 'daily':
      templates = DAILY_TEMPLATES;
      break;
    case 'weekly':
      templates = WEEKLY_TEMPLATES;
      break;
    case 'monthly':
      templates = MONTHLY_TEMPLATES;
      break;
  }

  // Pick a template based on sign + date hash
  const text = templates[hash % templates.length];

  // Personalize with sign name
  const personalized = personalizeText(text, sign);

  return {
    sign,
    period,
    date: new Date().toISOString().split('T')[0],
    horoscope: personalized,
    source: 'local',
  };
}

/**
 * Split a horoscope text into categorized sections for richer display.
 */
export function categorizeHoroscope(reading: HoroscopeReading): CategorizedReading[] {
  if (!reading?.horoscope) {
    return [{ category: 'general', title: 'Overview', content: 'The stars are aligning for you today.' }];
  }

  const text = reading.horoscope.trim();
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 2) {
    return [{
      category: 'general',
      title: 'Overview',
      content: text,
    }];
  }

  const categories = [
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

// ── Internal helpers ──────────────────────────────────────

function getDayHash(sign: string, period: string): number {
  const today = new Date();
  // Weekly uses week number, monthly uses month — so content changes at appropriate intervals
  let timePart: string;
  if (period === 'weekly') {
    const weekNum = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    timePart = `${today.getFullYear()}-W${weekNum}`;
  } else if (period === 'monthly') {
    timePart = `${today.getFullYear()}-${today.getMonth()}`;
  } else {
    timePart = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  }

  const str = `${sign.toLowerCase()}-${timePart}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function personalizeText(text: string, sign: string): string {
  // Add sign-specific flavor based on element
  const elements: Record<string, string> = {
    aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
    leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
    sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
  };
  const rulingPlanets: Record<string, string> = {
    aries: 'Mars', taurus: 'Venus', gemini: 'Mercury', cancer: 'the Moon',
    leo: 'the Sun', virgo: 'Mercury', libra: 'Venus', scorpio: 'Pluto',
    sagittarius: 'Jupiter', capricorn: 'Saturn', aquarius: 'Uranus', pisces: 'Neptune',
  };

  const signLower = sign.toLowerCase();
  const planet = rulingPlanets[signLower] || 'the stars';
  const element = elements[signLower] || 'cosmic';

  return text
    .replace(/\{planet\}/g, planet)
    .replace(/\{element\}/g, element)
    .replace(/\{sign\}/g, sign);
}

// ── Horoscope templates ──────────────────────────────────
// Each template changes daily/weekly/monthly per sign via hash.
// {planet}, {element}, {sign} are replaced with sign-specific values.

const DAILY_TEMPLATES = [
  "The influence of {planet} is strong today, amplifying your {element} energy in remarkable ways. Trust your instincts and take that leap of faith you've been contemplating. Your natural charisma is heightened, making it an excellent day for important conversations. Pay attention to subtle signs from the universe — they're guiding you toward your highest path. Financial opportunities may present themselves unexpectedly. Stay grounded and remember that patience is your greatest ally right now.",
  "A wave of creative energy surrounds you today as {planet} aligns favorably. Channel this into projects that matter most to you, and you'll be amazed at what you accomplish. Relationships deepen as you open your heart to vulnerability. The cosmos encourages you to express your true feelings without fear. A surprising encounter could shift your perspective on something you've taken for granted. Take time for self-care this evening — your {element} nature needs nurturing.",
  "Today brings clarity to a situation that has been puzzling you, {sign}. The fog lifts and you can see the path forward with renewed confidence. Your intuition is particularly strong under {planet}'s guidance — listen to that inner voice. Professional endeavors receive a boost from unexpected quarters. Someone from your past may reach out with meaningful news. Embrace change as it comes; it's leading you exactly where you need to be.",
  "The celestial energies favor bold moves today. {planet} empowers you to step outside your comfort zone and explore new horizons. Your communication skills are enhanced, making it the perfect time to pitch ideas or have meaningful dialogues. A financial matter resolves in your favor. Romance is in the air for those open to it. Ground yourself with meditation or nature walks to maintain your {element} balance.",
  "Today is about building foundations for your future, {sign}. The stars support long-term planning and strategic thinking. You may feel drawn to learning something new — follow that curiosity. Emotional connections strengthen when you lead with authenticity. A creative project reaches an important milestone. Watch for synchronicities throughout the day, as the universe is sending you confirmations that you're on the right track.",
  "Dynamic {element} energy flows through your sign today. You'll find yourself more motivated and focused than usual. Use this cosmic boost to tackle tasks you've been postponing. A conversation with a mentor or wise friend brings valuable insights. Your health and vitality are highlighted — consider starting a new wellness routine. The evening brings opportunities for social connection and joy under {planet}'s warm glow.",
  "With {planet} activating your sector of growth, the planets encourage reflection and inner development today. Take time to assess your goals and realign with your deeper purpose. Creative inspiration strikes when you least expect it. Financial decisions made today have long-lasting positive effects. A loved one needs your support — your compassion makes all the difference. Trust that the universe has your back, even when the path seems unclear.",
  "Adventure calls to you today, {sign}. Whether it's trying a new restaurant, exploring a different route, or diving into an unfamiliar subject, novelty brings growth. Your magnetic personality attracts positive attention in professional settings. A heartfelt conversation deepens a bond you cherish. The stars suggest that a small risk taken now could yield significant rewards later. End your day with gratitude for the {element} strength within you.",
  "Today's cosmic alignment brings harmony to your relationships. Misunderstandings clear up naturally, and compromises feel effortless. {planet} enhances your work ethic, impressing those in positions of influence. A flash of insight reveals a solution to a lingering problem. Physical activity brings both energy and mental clarity. The universe rewards your persistence — keep going on that goal you've been working toward.",
  "Transformation is the theme of the day as {planet} shifts into a powerful position. Old patterns fall away as you embrace a more authentic version of yourself. Professional opportunities align with your passions. A financial surprise — likely positive — arrives before the day's end. Your emotional intelligence is your superpower today; use it wisely in negotiations and personal interactions. Every ending makes space for a new beginning.",
  "{sign}, your {element} energy radiates powerfully today. Others are drawn to your warmth and authenticity. A project you've invested effort into begins showing promising results. The stars encourage you to speak your truth in a diplomatic yet firm manner. Romantic connections feel deeper and more meaningful. Take note of any vivid dreams — they may carry important messages from your subconscious. Financial stability improves through a disciplined approach.",
  "The cosmos sends waves of inspiration your way today, {sign}. Your creative abilities are supercharged under {planet}'s influence. Don't be afraid to think outside the box — your unconventional ideas could be exactly what's needed. A friendship may evolve into something more meaningful. Health-wise, focus on hydration and rest. An unexpected message brings exciting news about a future opportunity. Your {element} spirit is ready to soar.",
];

const WEEKLY_TEMPLATES = [
  "This week opens powerful doors for personal evolution, {sign}. The early days bring clarity in professional matters as {planet} guides your ambitions. Midweek invites deeper emotional connections — don't shy away from vulnerability. By Thursday, a creative breakthrough could change your approach to a long-standing project. Financial matters stabilize, and a smart investment of time or resources pays off. The weekend favors rest, romance, and reconnecting with your spiritual side. Trust the journey — your {element} nature knows the way.",
  "A week of dynamic shifts awaits you, {sign}. Monday and Tuesday favor bold communication and networking under {planet}'s influence. Midweek brings an opportunity to heal an old wound or resolve a lingering disagreement. Your intuition peaks around Wednesday, making it ideal for important decisions. Thursday through Friday highlights career ambitions — push forward with confidence. The weekend wraps up with social joy and a renewed sense of purpose. Stay flexible; the best outcomes arise from your natural {element} adaptability.",
  "The stars paint a week of growth and discovery for {sign}. Early days challenge you to step into leadership roles with grace. A surprising message or encounter midweek sparks new ideas. {planet} helps financial currents shift favorably around Thursday — look for deals or negotiations that benefit you. Romantic energy intensifies as the week progresses. By Sunday, you'll look back and realize how far you've come. Prioritize balance between work and play — your {element} energy thrives with harmony.",
  "This week invites you to dream bigger, {sign}. The first half emphasizes planning and strategy under {planet}'s watchful guidance — lay the groundwork for future success. Wednesday brings a pivotal conversation that could redefine a relationship. Creative projects flourish under Thursday's aspects. Financial discipline early in the week rewards you by Friday. The weekend is perfect for adventure, whether physical travel or exploring new intellectual territories. Your {element} resilience is your superpower this week.",
  "An energizing week lies ahead for {sign}. {planet} activates your zone of communication early on — express yourself boldly and watch doors open. Midweek is ideal for tackling complex problems; your analytical skills are razor-sharp. A romantic gesture — given or received — warms your heart around Thursday. Career progress accelerates Friday as recognition for past efforts arrives. The weekend brings a chance to reconnect with nature and recharge your {element} spirit. Trust the timing of your life.",
  "This week carries the energy of transformation for {sign}. Under {planet}'s influence, Monday sets the tone for meaningful change. Midweek brings financial clarity — a decision you've been debating becomes obvious. Relationships deepen through honest, sometimes difficult conversations that ultimately strengthen bonds. Creative energy surges on Thursday and Friday, perfect for artistic or innovative pursuits. The weekend offers a chance for quiet reflection and spiritual growth. Your {element} core guides you toward authenticity.",
];

const MONTHLY_TEMPLATES = [
  "This month marks a turning point in your cosmic journey, {sign}. The first week sets the tone with fresh beginnings and renewed motivation as {planet} energizes your ambitions. Career opportunities surface around the second week — stay alert for unexpected offers or collaborations. Midmonth brings a focus on relationships; honest conversations lead to deeper bonds. Financial matters favor conservative approaches early on, shifting to calculated risks by the third week. Your {element} energy benefits from establishing consistent routines. The final week invites reflection and planning for the next chapter. Key dates to watch: the New Moon amplifies new beginnings, while the Full Moon illuminates hidden truths. Trust your instincts throughout — they're cosmically calibrated for success.",
  "A month of transformation and discovery unfolds before you, {sign}. The opening days demand courage as old structures give way to new possibilities. By the second week, your social circle expands with meaningful connections drawn to your {element} magnetism. Midmonth, a creative or professional breakthrough rewards months of effort. Romance takes center stage around the third week — single or coupled, love deepens through vulnerability. Financial stability grows when you trust your long-term vision over short-term impulses. {planet} boosts your physical energy midmonth; channel it into activities that challenge and exhilarate you. The closing days bring gratitude and cosmic clarity. Pay attention to dreams this month — they carry messages from your higher self.",
  "The cosmic blueprint for this month emphasizes balance and bold action, {sign}. Week one brings mental clarity perfect for setting intentions and starting projects under {planet}'s guidance. Unexpected news around the second week creates exciting pivots in your professional life. Relationships undergo positive evolution midmonth — communicate openly and watch bonds strengthen. Financial themes revolve around smart investments in yourself: education, health, and experiences that expand your worldview. The third week is your power window for negotiations and closing deals. As the month ends, spiritual insights guide you toward your next big leap. Maintain your {element} energy with regular rest and mindful practices. The universe is conspiring in your favor — align your actions with your highest aspirations.",
  "A powerful month awaits you, {sign}. {planet} initiates a cycle of growth from the very first day. The opening week brings unexpected social invitations that lead to valuable connections. Career momentum builds steadily through the second week — showcase your talents without hesitation. Midmonth, a financial opportunity emerges that could significantly impact your stability; approach it with your signature {element} wisdom. Relationships require attention around the third week: prioritize quality time and genuine listening. Creative projects reach important milestones near the month's end. Your health improves when you commit to one new positive habit. The closing days bring a sense of completion and readiness for what's next. This is your month to shine authentically.",
];
