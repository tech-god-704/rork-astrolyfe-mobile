/**
 * Zodiac compatibility engine — 100% local, no API needed.
 * Uses element harmony, modality dynamics, and ruling planet interactions
 * to generate unique results for all 144 sign pairings.
 */

// ── Types ──────────────────────────────────────────────────

export interface CategoryScore {
  score: number;
  text: string;
}

export interface CompatibilityResult {
  overallScore: number;
  summary: string;
  categories: {
    love: CategoryScore;
    communication: CategoryScore;
    trust: CategoryScore;
    emotions: CategoryScore;
    values: CategoryScore;
  };
  strengths: string[];
  challenges: string[];
  tips: string[];
}

// ── Sign metadata ──────────────────────────────────────────

type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
type Modality = 'Cardinal' | 'Fixed' | 'Mutable';
type Polarity = 'Masculine' | 'Feminine';

interface SignMeta {
  element: Element;
  modality: Modality;
  polarity: Polarity;
  ruler: string;
  traits: string[];
  loveStyle: string;
  commStyle: string;
}

const SIGN_META: Record<string, SignMeta> = {
  Aries: {
    element: 'Fire', modality: 'Cardinal', polarity: 'Masculine',
    ruler: 'Mars',
    traits: ['bold', 'passionate', 'impulsive', 'adventurous'],
    loveStyle: 'passionate and direct',
    commStyle: 'straightforward and energetic',
  },
  Taurus: {
    element: 'Earth', modality: 'Fixed', polarity: 'Feminine',
    ruler: 'Venus',
    traits: ['loyal', 'sensual', 'stubborn', 'dependable'],
    loveStyle: 'devoted and sensual',
    commStyle: 'patient and deliberate',
  },
  Gemini: {
    element: 'Air', modality: 'Mutable', polarity: 'Masculine',
    ruler: 'Mercury',
    traits: ['witty', 'curious', 'versatile', 'communicative'],
    loveStyle: 'intellectually stimulating',
    commStyle: 'quick-witted and animated',
  },
  Cancer: {
    element: 'Water', modality: 'Cardinal', polarity: 'Feminine',
    ruler: 'the Moon',
    traits: ['nurturing', 'intuitive', 'emotional', 'protective'],
    loveStyle: 'deeply nurturing and emotional',
    commStyle: 'empathetic and intuitive',
  },
  Leo: {
    element: 'Fire', modality: 'Fixed', polarity: 'Masculine',
    ruler: 'the Sun',
    traits: ['charismatic', 'generous', 'dramatic', 'confident'],
    loveStyle: 'grand and affectionate',
    commStyle: 'warm and expressive',
  },
  Virgo: {
    element: 'Earth', modality: 'Mutable', polarity: 'Feminine',
    ruler: 'Mercury',
    traits: ['analytical', 'helpful', 'detail-oriented', 'practical'],
    loveStyle: 'attentive and acts of service',
    commStyle: 'precise and thoughtful',
  },
  Libra: {
    element: 'Air', modality: 'Cardinal', polarity: 'Masculine',
    ruler: 'Venus',
    traits: ['diplomatic', 'charming', 'harmonious', 'romantic'],
    loveStyle: 'romantic and partnership-oriented',
    commStyle: 'diplomatic and balanced',
  },
  Scorpio: {
    element: 'Water', modality: 'Fixed', polarity: 'Feminine',
    ruler: 'Pluto',
    traits: ['intense', 'passionate', 'mysterious', 'loyal'],
    loveStyle: 'intensely devoted and transformative',
    commStyle: 'deep and probing',
  },
  Sagittarius: {
    element: 'Fire', modality: 'Mutable', polarity: 'Masculine',
    ruler: 'Jupiter',
    traits: ['adventurous', 'optimistic', 'philosophical', 'freedom-loving'],
    loveStyle: 'adventurous and free-spirited',
    commStyle: 'honest and philosophical',
  },
  Capricorn: {
    element: 'Earth', modality: 'Cardinal', polarity: 'Feminine',
    ruler: 'Saturn',
    traits: ['ambitious', 'disciplined', 'responsible', 'patient'],
    loveStyle: 'committed and traditional',
    commStyle: 'structured and pragmatic',
  },
  Aquarius: {
    element: 'Air', modality: 'Fixed', polarity: 'Masculine',
    ruler: 'Uranus',
    traits: ['innovative', 'independent', 'humanitarian', 'eccentric'],
    loveStyle: 'unconventional and mentally connected',
    commStyle: 'original and progressive',
  },
  Pisces: {
    element: 'Water', modality: 'Mutable', polarity: 'Feminine',
    ruler: 'Neptune',
    traits: ['empathetic', 'creative', 'dreamy', 'compassionate'],
    loveStyle: 'deeply romantic and spiritual',
    commStyle: 'gentle and imaginative',
  },
};

// ── Scoring engine ─────────────────────────────────────────

function getMeta(sign: string): SignMeta {
  return SIGN_META[sign] || SIGN_META.Aries;
}

function pairHash(s1: string, s2: string): number {
  const str = [s1, s2].sort().join('-');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Element compatibility matrix
const ELEMENT_COMPAT: Record<Element, Record<Element, number>> = {
  Fire:  { Fire: 80, Air: 85, Earth: 50, Water: 45 },
  Air:   { Fire: 85, Air: 75, Earth: 55, Water: 50 },
  Earth: { Fire: 50, Air: 55, Earth: 82, Water: 88 },
  Water: { Fire: 45, Air: 50, Earth: 88, Water: 78 },
};

// Modality compatibility adjustments
function modalityBonus(m1: Modality, m2: Modality): number {
  if (m1 === m2) return -3; // Same modality = power struggle
  if (
    (m1 === 'Cardinal' && m2 === 'Mutable') ||
    (m1 === 'Mutable' && m2 === 'Cardinal')
  ) return 5; // Cardinal + Mutable = great flow
  if (
    (m1 === 'Fixed' && m2 === 'Mutable') ||
    (m1 === 'Mutable' && m2 === 'Fixed')
  ) return 3; // Fixed + Mutable = decent
  return 0; // Cardinal + Fixed = neutral
}

// Polarity bonus
function polarityBonus(p1: Polarity, p2: Polarity): number {
  return p1 !== p2 ? 4 : -1; // Opposite polarities attract
}

function clampScore(n: number): number {
  return Math.max(25, Math.min(98, Math.round(n)));
}

function calculateCategoryScores(sign1: string, sign2: string) {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);
  const hash = pairHash(sign1, sign2);

  const baseElement = ELEMENT_COMPAT[m1.element][m2.element];
  const modBonus = modalityBonus(m1.modality, m2.modality);
  const polBonus = polarityBonus(m1.polarity, m2.polarity);

  // Each category gets a different variation so they're not all the same number
  const variation = (cat: number) => ((hash * (cat + 7)) % 15) - 7;

  const love = clampScore(baseElement + polBonus + 5 + variation(0));
  const communication = clampScore(baseElement + modBonus + variation(1));
  const trust = clampScore(baseElement + modBonus + polBonus + variation(2));
  const emotions = clampScore(baseElement + polBonus + variation(3));
  const values = clampScore(baseElement + modBonus + variation(4));

  const overall = clampScore(Math.round(
    love * 0.25 + communication * 0.2 + trust * 0.2 + emotions * 0.2 + values * 0.15
  ));

  return { overall, love, communication, trust, emotions, values };
}

// ── Text generation ────────────────────────────────────────

function generateSummary(sign1: string, sign2: string, overall: number): string {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);

  if (sign1 === sign2) {
    return `Two ${sign1}s together create a mirror-like bond — you inherently understand each other's needs, desires, and quirks. Ruled by ${m1.ruler}, you share the same ${m1.element.toLowerCase()} energy and ${m1.modality.toLowerCase()} drive. This can be incredibly validating but also magnifies shared blind spots. The key to this pairing is celebrating your similarities while actively cultivating individual growth.`;
  }

  if (m1.element === m2.element) {
    return `${sign1} and ${sign2} share the ${m1.element} element, creating a natural kinship built on mutual understanding. You speak the same emotional language and intuitively grasp each other's motivations. With ${sign1}'s ${m1.traits[0]} nature complementing ${sign2}'s ${m2.traits[1]} approach, this pairing has the foundation for deep and lasting harmony. The challenge is avoiding stagnation — push each other to grow beyond your shared comfort zone.`;
  }

  if (overall >= 80) {
    return `${sign1} and ${sign2} form an exceptionally harmonious pairing. ${sign1}'s ${m1.loveStyle} approach to love blends beautifully with ${sign2}'s ${m2.loveStyle} energy. Ruled by ${m1.ruler} and ${m2.ruler} respectively, you bring complementary strengths that elevate the relationship. This cosmic connection has the potential to be both transformative and enduring.`;
  }

  if (overall >= 65) {
    return `${sign1} and ${sign2} bring a compelling mix of ${m1.element.toLowerCase()} and ${m2.element.toLowerCase()} energies to the table. ${sign1}'s ${m1.traits[0]} spirit meets ${sign2}'s ${m2.traits[1]} nature, creating a dynamic that's rich with growth potential. Under the guidance of ${m1.ruler} and ${m2.ruler}, this pairing thrives when both partners embrace their differences as strengths rather than obstacles.`;
  }

  return `${sign1} and ${sign2} represent a meeting of ${m1.element.toLowerCase()} and ${m2.element.toLowerCase()} — a pairing that requires conscious effort but offers profound rewards. ${sign1}'s ${m1.traits[0]} disposition and ${sign2}'s ${m2.traits[1]} approach may seem at odds, yet this very tension creates opportunities for extraordinary personal growth. With patience and genuine curiosity about each other's worlds, this match can defy the odds.`;
}

function generateCategoryText(
  sign1: string, sign2: string,
  category: 'love' | 'communication' | 'trust' | 'emotions' | 'values',
  score: number,
): string {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);
  const hash = pairHash(sign1, sign2);

  const texts: Record<typeof category, string[]> = {
    love: [
      `${sign1}'s ${m1.loveStyle} nature ${score >= 70 ? 'harmonizes beautifully' : 'creates an intriguing contrast'} with ${sign2}'s ${m2.loveStyle} approach. ${score >= 80 ? 'Physical and emotional chemistry runs deep here.' : score >= 60 ? 'There\'s genuine attraction that deepens over time.' : 'Building intimacy requires patience, but the rewards are worth it.'}`,
      `In matters of the heart, ${sign1} brings ${m1.traits[1]} energy while ${sign2} offers ${m2.traits[3]} warmth. ${score >= 75 ? 'Together, you create a love story written in the stars.' : 'Your different love languages become a bridge for deeper understanding.'}`,
      `The romantic connection between ${sign1} and ${sign2} is ${score >= 80 ? 'magnetic and undeniable' : score >= 65 ? 'a slow burn that builds beautifully' : 'an exercise in expanding your definition of love'}. ${m1.ruler} and ${m2.ruler} ${score >= 70 ? 'amplify your romantic chemistry' : 'challenge you to love more consciously'}.`,
    ],
    communication: [
      `${sign1}'s ${m1.commStyle} style meets ${sign2}'s ${m2.commStyle} approach. ${score >= 75 ? 'Conversations flow naturally, from playful banter to deep discussions.' : score >= 60 ? 'You learn to appreciate each other\'s unique way of expressing thoughts.' : 'Developing a shared communication rhythm takes effort but strengthens your bond.'}`,
      `With ${m1.ruler} guiding ${sign1}'s words and ${m2.ruler} shaping ${sign2}'s expression, your dialogues are ${score >= 70 ? 'stimulating and enriching' : 'a masterclass in learning to truly listen'}. ${score >= 75 ? 'You finish each other\'s thoughts.' : 'Your different perspectives broaden each other\'s worldview.'}`,
    ],
    trust: [
      `Trust between ${sign1} and ${sign2} ${score >= 75 ? 'forms naturally through shared values and consistent actions' : score >= 60 ? 'develops steadily as you prove reliability to each other' : 'requires conscious building — be transparent and follow through'}. ${sign1}'s ${m1.traits[0]} nature ${score >= 70 ? 'inspires' : 'sometimes tests'} ${sign2}'s sense of security.`,
      `${sign1}'s ${m1.modality.toLowerCase()} energy and ${sign2}'s ${m2.modality.toLowerCase()} drive ${score >= 70 ? 'create a stable foundation of mutual respect' : 'need alignment to build lasting faith in each other'}. ${score >= 75 ? 'You instinctively know you can count on each other.' : 'Honesty and vulnerability are the keys to deepening trust here.'}`,
    ],
    emotions: [
      `Emotionally, ${sign1} processes through ${m1.element === 'Fire' ? 'action and expression' : m1.element === 'Earth' ? 'stability and patience' : m1.element === 'Air' ? 'thought and discussion' : 'feeling and intuition'}, while ${sign2} navigates via ${m2.element === 'Fire' ? 'passion and spontaneity' : m2.element === 'Earth' ? 'groundedness and loyalty' : m2.element === 'Air' ? 'logic and dialogue' : 'depth and empathy'}. ${score >= 70 ? 'Your emotional wavelengths sync beautifully.' : 'Learning each other\'s emotional language unlocks deeper intimacy.'}`,
      `The emotional landscape between ${sign1} and ${sign2} is ${score >= 80 ? 'rich and deeply satisfying' : score >= 65 ? 'a growth-filled journey' : 'a terrain of learning and adaptation'}. ${m1.ruler}'s influence on ${sign1} ${score >= 70 ? 'complements' : 'contrasts with'} ${m2.ruler}'s impact on ${sign2}, creating ${score >= 70 ? 'emotional resonance' : 'opportunities for emotional expansion'}.`,
    ],
    values: [
      `${sign1} values ${m1.traits[3] === 'adventurous' || m1.traits[3] === 'freedom-loving' ? 'freedom and exploration' : m1.traits[3] === 'dependable' || m1.traits[3] === 'patient' ? 'stability and reliability' : m1.traits[3] === 'communicative' || m1.traits[3] === 'romantic' ? 'connection and expression' : 'depth and authenticity'}, while ${sign2} prioritizes ${m2.traits[3] === 'adventurous' || m2.traits[3] === 'freedom-loving' ? 'independence and growth' : m2.traits[3] === 'dependable' || m2.traits[3] === 'patient' ? 'security and tradition' : m2.traits[3] === 'communicative' || m2.traits[3] === 'romantic' ? 'harmony and beauty' : 'meaning and purpose'}. ${score >= 70 ? 'Your core values align in meaningful ways.' : 'Finding shared values strengthens your foundation.'}`,
      `Under ${m1.ruler} and ${m2.ruler}, ${sign1} and ${sign2} ${score >= 75 ? 'share a vision of what matters most in life' : score >= 60 ? 'find common ground through open dialogue about priorities' : 'discover that different values can be complementary rather than conflicting'}. ${score >= 70 ? 'You build toward shared dreams naturally.' : 'Compromise here leads to a richer life together.'}`,
    ],
  };

  const options = texts[category];
  return options[hash % options.length];
}

function generateStrengths(sign1: string, sign2: string, scores: ReturnType<typeof calculateCategoryScores>): string[] {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);
  const strengths: string[] = [];

  // Element-based strengths
  if (m1.element === m2.element) {
    strengths.push(`Natural understanding through shared ${m1.element} energy`);
    strengths.push('Intuitive grasp of each other\'s needs and motivations');
  } else if (ELEMENT_COMPAT[m1.element][m2.element] >= 80) {
    strengths.push(`${m1.element} and ${m2.element} elements fuel each other beautifully`);
    strengths.push('Complementary energies that create balance');
  }

  // Score-based strengths
  if (scores.love >= 75) strengths.push('Strong romantic and physical chemistry');
  if (scores.communication >= 75) strengths.push('Effortless, stimulating conversations');
  if (scores.trust >= 75) strengths.push('Deep mutual trust and reliability');
  if (scores.emotions >= 75) strengths.push('Emotional attunement and empathy');
  if (scores.values >= 75) strengths.push('Aligned life goals and priorities');

  // Trait-based strengths
  if (m1.polarity !== m2.polarity) {
    strengths.push('Magnetic attraction from complementary masculine/feminine energies');
  }
  if (m1.modality !== m2.modality) {
    strengths.push(`${m1.modality} initiative meets ${m2.modality} ${m2.modality === 'Fixed' ? 'dedication' : m2.modality === 'Mutable' ? 'flexibility' : 'leadership'}`);
  }

  // Sign-specific flavor
  strengths.push(`${sign1}'s ${m1.traits[0]} spirit inspires ${sign2}'s ${m2.traits[3]} side`);

  // Keep 4-6 strengths
  return strengths.slice(0, 6);
}

function generateChallenges(sign1: string, sign2: string, scores: ReturnType<typeof calculateCategoryScores>): string[] {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);
  const challenges: string[] = [];

  // Element-based challenges
  if (m1.element === 'Fire' && m2.element === 'Water') {
    challenges.push('Fire\'s intensity can overwhelm Water\'s sensitivity');
  } else if (m1.element === 'Water' && m2.element === 'Fire') {
    challenges.push('Water\'s emotional depth may feel heavy for Fire\'s free spirit');
  } else if (m1.element === 'Air' && m2.element === 'Earth') {
    challenges.push('Air\'s need for variety may clash with Earth\'s desire for routine');
  } else if (m1.element === 'Earth' && m2.element === 'Air') {
    challenges.push('Earth\'s practicality may feel limiting to Air\'s imagination');
  } else if (m1.element === m2.element) {
    challenges.push(`Too much ${m1.element} energy can amplify shared weaknesses`);
  }

  // Modality-based challenges
  if (m1.modality === m2.modality) {
    if (m1.modality === 'Cardinal') challenges.push('Two leaders may struggle over who takes charge');
    else if (m1.modality === 'Fixed') challenges.push('Both being stubborn can lead to standoffs');
    else challenges.push('Mutual indecisiveness may stall important decisions');
  }

  // Score-based challenges
  if (scores.communication < 65) challenges.push('Different communication styles require patience and practice');
  if (scores.trust < 65) challenges.push('Building trust needs consistent effort and vulnerability');
  if (scores.emotions < 65) challenges.push('Emotional wavelengths differ — empathy is key');
  if (scores.love < 65) challenges.push('Romantic expectations may need alignment and open discussion');

  // General
  if (m1.polarity === m2.polarity) {
    challenges.push('Similar energy patterns may reduce romantic tension over time');
  }

  // Keep 3-5 challenges
  return challenges.slice(0, 5);
}

function generateTips(sign1: string, sign2: string, scores: ReturnType<typeof calculateCategoryScores>): string[] {
  const m1 = getMeta(sign1);
  const m2 = getMeta(sign2);
  const tips: string[] = [];

  // Lowest category gets targeted advice
  const catScores = [
    { cat: 'love', score: scores.love },
    { cat: 'communication', score: scores.communication },
    { cat: 'trust', score: scores.trust },
    { cat: 'emotions', score: scores.emotions },
    { cat: 'values', score: scores.values },
  ].sort((a, b) => a.score - b.score);

  const weakest = catScores[0].cat;
  const tipMap: Record<string, string> = {
    love: `Schedule regular date nights that honor both ${sign1}'s ${m1.loveStyle} and ${sign2}'s ${m2.loveStyle} sides`,
    communication: `Practice active listening — ${sign1} should slow down, ${sign2} should speak up`,
    trust: 'Build trust through small, consistent actions rather than grand gestures',
    emotions: `Create a safe space for emotional expression — no judgment, just presence`,
    values: 'Have an honest conversation about your non-negotiable values and find the overlap',
  };
  tips.push(tipMap[weakest]);

  // Element-based tips
  if (m1.element === 'Fire' || m2.element === 'Fire') {
    tips.push('Channel passionate disagreements into productive conversations — count to ten first');
  }
  if (m1.element === 'Earth' || m2.element === 'Earth') {
    tips.push('Surprise each other with spontaneity to keep the relationship fresh');
  }
  if (m1.element === 'Air' || m2.element === 'Air') {
    tips.push('Balance intellectual connection with physical presence and quality time');
  }
  if (m1.element === 'Water' || m2.element === 'Water') {
    tips.push('Respect emotional boundaries while encouraging vulnerability');
  }

  // Ruling planet tips
  tips.push(`Honor ${sign1}'s connection to ${m1.ruler} by supporting their ${m1.traits[0]} nature`);

  return tips.slice(0, 4);
}

// ── Public API ─────────────────────────────────────────────

export function getCompatibility(sign1: string, sign2: string): CompatibilityResult {
  const scores = calculateCategoryScores(sign1, sign2);

  return {
    overallScore: scores.overall,
    summary: generateSummary(sign1, sign2, scores.overall),
    categories: {
      love: { score: scores.love, text: generateCategoryText(sign1, sign2, 'love', scores.love) },
      communication: { score: scores.communication, text: generateCategoryText(sign1, sign2, 'communication', scores.communication) },
      trust: { score: scores.trust, text: generateCategoryText(sign1, sign2, 'trust', scores.trust) },
      emotions: { score: scores.emotions, text: generateCategoryText(sign1, sign2, 'emotions', scores.emotions) },
      values: { score: scores.values, text: generateCategoryText(sign1, sign2, 'values', scores.values) },
    },
    strengths: generateStrengths(sign1, sign2, scores),
    challenges: generateChallenges(sign1, sign2, scores),
    tips: generateTips(sign1, sign2, scores),
  };
}
