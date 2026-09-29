import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────

export type ReportType =
  | 'soulmate_portrait'
  | 'full_map'
  | 'venus_love'
  | 'sun_career'
  | 'moon_wellbeing'
  | 'transit_forecast';

export interface UserReport {
  id: string;
  user_email: string;
  report_type: ReportType;
  content_html: string;
  created_at: string;
}

export interface AstroReport {
  id: string;
  user_email: string;
  natal_data: Record<string, unknown> | null;
  astrocartography_data: Record<string, unknown> | null;
  transit_data: Record<string, unknown> | null;
  created_at: string;
}

// Display metadata for each report type
export const REPORT_META: Record<ReportType, { title: string; description: string; icon: string }> = {
  // The portrait is an image, not prose. Without an entry here it fell through to the
  // 'Report' fallback title, and because the row's content_html is a single <img> tag
  // the text renderer stripped it to nothing — so it showed as a blank, untitled card.
  soulmate_portrait: {
    title: 'Your Soulmate Portrait',
    description: 'The face the stars drew for you, based on everything you told us.',
    icon: 'image',
  },
  // Descriptions match what the reports actually contain: every one after the
  // portrait is organised by place — which cities, and why — not by sign.
  full_map: {
    title: 'Your World Map',
    description: 'Every planet’s line around the globe, and the cities where each one is strongest for you.',
    icon: 'map',
  },
  venus_love: {
    title: 'Love Cities',
    description: 'The places where your Venus lines make attraction, romance and connection come easier.',
    icon: 'heart',
  },
  sun_career: {
    title: 'Career Cities',
    description: 'Where your Sun lines put your work, reputation and leadership in the spotlight.',
    icon: 'briefcase',
  },
  moon_wellbeing: {
    title: 'Home & Peace Cities',
    description: 'The places where you feel most settled, safe and at ease, and how to recreate that anywhere.',
    icon: 'moon',
  },
  transit_forecast: {
    title: 'Travel Timing',
    description: 'Which of your places are switched on right now, and the best windows to go.',
    icon: 'trending-up',
  },
};

// ── Queries ──────────────────────────────────────────────

/**
 * Fetch all generated reports for a user (from the web dashboard).
 * These are premium AI-generated reports the user already paid for.
 */
export async function fetchUserReports(userEmail: string): Promise<UserReport[]> {
  if (!userEmail) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const { data, error } = await supabase
      .from('user_reports')
      .select('id, user_email, report_type, content_html, created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    if (error) {
      console.log('[Reports] user_reports fetch error:', error.message);
      return [];
    }
    return (data ?? []) as UserReport[];
  } catch (e) {
    console.log('[Reports] user_reports fetch exception:', e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the user's raw astro report data (natal chart JSON, astrocartography, transits).
 * This is the computed data the web app generated — can be used to render
 * charts natively on mobile without recomputation.
 */
export async function fetchAstroReport(userEmail: string): Promise<AstroReport | null> {
  if (!userEmail) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const { data, error } = await supabase
      .from('astro_reports')
      .select('id, user_email, natal_data, astrocartography_data, transit_data, created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(controller.signal)
      .maybeSingle();

    if (error) {
      console.log('[Reports] astro_reports fetch error:', error.message);
      return null;
    }
    return data as AstroReport | null;
  } catch (e) {
    console.log('[Reports] astro_reports fetch exception:', e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
