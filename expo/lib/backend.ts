/**
 * Client for the astrolyfe.co PHP backend (the funnel's server).
 *
 * These endpoints complement the PocketBase data layer with things only the
 * server can do: live Stripe entitlement checks, report generation status,
 * self-serve billing, account deletion, password resets, and push registration.
 * All authed calls use the PocketBase Bearer token.
 */

import { getAccessToken } from './pocketbase';

const API_BASE = 'https://astrolyfe.co/api';

async function authedPost(path: string, body: Record<string, unknown> = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json?.error) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

async function publicPost(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

export interface LiveEntitlement {
  success: boolean;
  has_subscription: boolean;
  subscription_type: string | null;
  status: string; // active | trialing | past_due | paused | cancelled | expired | free
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** Ask the server to check Stripe directly — catches anything the webhook missed. */
export function verifySubscriptionLive(email: string): Promise<LiveEntitlement> {
  return publicPost('/verify-subscription.php', { email });
}

export function requestPasswordReset(email: string): Promise<{ status: string; message?: string }> {
  return publicPost('/request-password-reset.php', { email });
}

export interface ReportSection {
  type: string;
  title: string;
  status: 'ready' | 'pending';
  content_html?: string;
}

export interface ReportsResponse {
  success: boolean;
  email: string;
  display_name: string | null;
  generation_status: 'not_started' | 'in_progress' | 'complete';
  sections_ready: number;
  sections_total: number;
  sections: ReportSection[];
  portrait_url: string | null;
  error?: string;
}

/** All report sections + generation progress for the signed-in user. */
export function getReports(metaOnly = false): Promise<ReportsResponse> {
  return authedPost('/get-reports.php', metaOnly ? { meta: true } : {});
}

/** Full account deletion (server also cleans Stripe/Brevo/portraits). */
export function deleteAccountServer(cancelSubscription = false): Promise<{ success: boolean; deleted?: boolean; error?: string }> {
  return authedPost('/delete-account.php', { cancel_subscription: cancelSubscription });
}

export function cancelSubscriptionAtPeriodEnd(reason?: string): Promise<{ success: boolean; error?: string }> {
  return authedPost('/cancel-subscription.php', reason ? { cancel_reason: reason } : {});
}

export function pauseSubscription(): Promise<{ success: boolean; error?: string }> {
  return authedPost('/pause-subscription.php', {});
}

export function resumeSubscription(): Promise<{ success: boolean; error?: string }> {
  return authedPost('/resume-subscription.php', {});
}

/** Register this device for push notifications (call after permission granted). */
export function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<{ success: boolean }> {
  return authedPost('/register-push-token.php', { token, platform });
}
