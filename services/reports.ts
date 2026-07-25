import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────

export type ReportType =
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
  full_map: {
    title: 'Full Birth Map',
    description: 'Your complete natal chart analysis covering all planetary placements and house positions.',
    icon: 'map',
  },
  venus_love: {
    title: 'Venus Love Report',
    description: 'Deep dive into your Venus placement — love language, attraction style, and relationship patterns.',
    icon: 'heart',
  },
  sun_career: {
    title: 'Sun Career Report',
    description: 'Your Sun sign career blueprint — strengths, ideal roles, and professional growth paths.',
    icon: 'briefcase',
  },
  moon_wellbeing: {
    title: 'Moon Wellbeing Report',
    description: 'Your Moon sign emotional landscape — self-care rituals, stress patterns, and inner needs.',
    icon: 'moon',
  },
  transit_forecast: {
    title: 'Transit Forecast',
    description: 'Current planetary transits and how they\'re activating your natal chart right now.',
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
