/**
 * Interpretation vocabulary.
 *
 * Deliberately fragments rather than paragraphs. The old system had twelve finished
 * daily texts, so three signs could receive byte-identical readings on the same day.
 * Composing a sentence from an aspect meaning, a transiting-planet theme and a natal
 * placement instead gives thousands of combinations from a few hundred short strings —
 * and every part of it is tied to something actually present in the sky.
 *
 * Nothing here promises an outcome. Astrology is entertainment; the language stays
 * suggestive ("may", "can", "supports") and never guarantees a medical, financial,
 * legal or relationship result.
 */

import type { AspectType, ForecastCategory } from '@/services/transit-aspects';

export const ENGINE_VERSION = 'v2.0.0';

export interface AspectVoice {
  tone: 'supportive' | 'challenging' | 'neutral';
  /** Verb phrases: "<transit> <phrase> your <natal>". */
  connectors: string[];
  meanings: string[];
}

export const ASPECT_INTERPRETATIONS: Record<AspectType, AspectVoice> = {
  conjunction: {
    tone: 'neutral',
    connectors: ['meets', 'sits alongside', 'joins', 'concentrates on'],
    meanings: [
      'These themes merge, and whatever they touch tends to get louder.',
      'This is a starting point more than a conclusion.',
      'Focus gathers here, for better and for worse.',
      'Something in this area may feel newly urgent.',
    ],
  },
  sextile: {
    tone: 'supportive',
    connectors: ['offers an opening to', 'quietly supports', 'makes room for'],
    meanings: [
      'The support is real but it will not force itself on you.',
      'An opportunity may appear that rewards being taken up deliberately.',
      'Progress here tends to come from small, willing steps.',
      'This is help you have to reach for.',
    ],
  },
  square: {
    tone: 'challenging',
    connectors: ['presses on', 'pulls against', 'challenges'],
    meanings: [
      'Friction here often points at something that needs adjusting.',
      'Two priorities may be competing, and choosing between them is the work.',
      'Pressure can be productive when it is not mistaken for a verdict.',
      'This may feel like resistance, and resistance is information.',
    ],
  },
  trine: {
    tone: 'supportive',
    connectors: ['flows toward', 'harmonises with', 'eases'],
    meanings: [
      'Things in this area may take less effort than usual.',
      'Cooperation is easier to find right now.',
      'This is the kind of support that passes unnoticed unless you use it.',
      'A natural fit — worth spending rather than saving.',
    ],
  },
  opposition: {
    tone: 'challenging',
    connectors: ['faces', 'stands opposite', 'draws out'],
    meanings: [
      'Something external may be reflecting back a part of your own position.',
      'Balance is the theme, and balance usually means giving something up.',
      'Another person may be carrying one half of this.',
      'Seeing both sides is more useful here than winning.',
    ],
  },
};

/** What a transiting body brings. */
export const TRANSIT_THEMES: Record<string, string[]> = {
  Sun:     ['visibility and vitality', 'a sense of purpose', 'attention and recognition'],
  Moon:    ['mood and instinct', 'what you need rather than what you planned', 'emotional weather'],
  Mercury: ['conversations and decisions', 'information and paperwork', 'how clearly you are heard'],
  Venus:   ['affection, taste and worth', 'what you value and who you enjoy', 'ease and attraction'],
  Mars:    ['drive, appetite and friction', 'the urge to act', 'energy that wants somewhere to go'],
  Jupiter: ['expansion and confidence', 'opportunity and appetite for more', 'perspective and generosity'],
  Saturn:  ['structure, limits and maturity', 'the long, unglamorous version of progress', 'responsibility'],
  Uranus:  ['disruption and sudden change', 'the urge to break a pattern', 'restlessness'],
  Neptune: ['imagination, blur and longing', 'sensitivity and inspiration', 'what is hard to see clearly'],
  Pluto:   ['depth, intensity and change that sticks', 'power and control', 'what will not stay buried'],
};

/** What a natal point represents in the person's own chart. */
export const NATAL_THEMES: Record<string, string[]> = {
  Sun:     ['core identity', 'sense of self', 'the direction you are growing in'],
  Moon:    ['inner life', 'emotional needs', 'what makes you feel safe'],
  Mercury: ['thinking and communication', 'the way you process things', 'your voice'],
  Venus:   ['love nature and values', 'how you relate and what you find beautiful', 'capacity for pleasure'],
  Mars:    ['drive and assertion', 'how you pursue what you want', 'physical energy'],
  Jupiter: ['optimism and growth', 'where you look for meaning', 'natural generosity'],
  Saturn:  ['discipline and long-term structure', 'where you have had to earn things', 'sense of duty'],
  Uranus:  ['individuality', 'need for freedom', 'where you break from convention'],
  Neptune: ['imagination and ideals', 'spiritual life', 'where boundaries blur'],
  Pluto:   ['capacity for transformation', 'buried power', 'where you rebuild yourself'],
  // Present only at the full-chart tier. Without this the sentence fell back to the
  // generic "your chart" filler, which read as padding rather than a real placement.
  Ascendant: ['how you meet the world', 'your outward manner', 'the face you lead with'],
};

/** Practical suggestions, keyed by tone. Grounded, never prescriptive. */
export const ACTIONS: Record<'supportive' | 'challenging' | 'neutral', string[]> = {
  supportive: [
    'Use it rather than save it — this kind of ease is easier to spend than to store.',
    'A conversation you have been putting off may go better than expected today.',
    'Say yes to the thing that is slightly bigger than you would normally take on.',
    'Let the momentum carry something you have already started.',
  ],
  challenging: [
    'Slow down before deciding; the pressure is more informative than urgent.',
    'Name the tension out loud rather than working around it.',
    'Pick one of the two competing priorities and let the other wait.',
    'Rest is a legitimate response to friction, not an avoidance of it.',
  ],
  neutral: [
    'Notice where your attention keeps returning — that is the useful signal.',
    'Small deliberate action beats a grand plan here.',
    'Give this a little more room than usual before drawing conclusions.',
    'Write down what shifts; patterns are clearer in hindsight.',
  ],
};

export const CAUTIONS: string[] = [
  'None of this is destiny — it describes weather, not instructions.',
  'Take what is useful and leave the rest.',
  'Read this as a prompt to reflect, not a prediction to obey.',
];

/** Openers per section, so four categories do not all sound the same. */
export const CATEGORY_OPENERS: Record<ForecastCategory, string[]> = {
  // Openers carry no time words — the period framing supplies those, and having both
  // produced "the strongest influence on your chart right now today".
  overview: [
    'The strongest influence on your chart',
    'What stands out most in your chart',
    'The clearest signal in your chart',
  ],
  love: [
    'In relationships and affection',
    'Where connection is concerned',
    'For your close relationships',
  ],
  career: [
    'In work and direction',
    'For your ambitions and daily work',
    'Where progress and effort are concerned',
  ],
  wellness: [
    'For your energy and wellbeing',
    'In terms of rest and physical energy',
    'Where your inner balance is concerned',
  ],
};

/** Said when a section genuinely has nothing active — better than inventing an event. */
export const QUIET_CATEGORY: Record<ForecastCategory, string> = {
  overview: 'Your chart is relatively quiet right now. Periods without strong transits are often the ones where your own choices matter most.',
  love: 'Nothing is strongly activating this area at the moment, which tends to mean things run on their existing momentum rather than being pushed.',
  career: 'No major influence is touching this part of your chart right now. Routine work tends to go furthest in stretches like this.',
  wellness: 'Your chart shows no strong pressure on this area at the moment — a reasonable window for maintaining rather than overhauling.',
};

export const PERIOD_FRAMING: Record<'daily' | 'weekly' | 'monthly', string[]> = {
  daily: ['today', 'through the day', 'right now'],
  weekly: ['this week', 'over the next seven days', 'across the week'],
  monthly: ['this month', 'over the coming weeks', 'through the month ahead'],
};

/** Rough position of a date inside a period, for "early week" style phrasing. */
export function relativeTiming(peak: string | undefined, start: Date, period: 'daily' | 'weekly' | 'monthly'): string {
  if (!peak || period === 'daily') return '';

  const peakDate = new Date(peak + 'T12:00:00');
  const days = Math.round((peakDate.getTime() - start.getTime()) / 86400000);
  if (Number.isNaN(days) || days < 0) return '';

  if (period === 'weekly') {
    if (days <= 1) return ' — strongest early in the week';
    if (days <= 4) return ' — peaking around midweek';
    return ' — building toward the weekend';
  }

  if (days <= 7) return ' — strongest in the first week';
  if (days <= 16) return ' — peaking mid-month';
  return ' — strongest later in the month';
}
