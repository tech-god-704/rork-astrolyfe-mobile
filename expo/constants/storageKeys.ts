/** Shared AsyncStorage keys used across more than one screen/provider. */

/**
 * Set once by welcome-tour's finish(), consumed once by Home on its next mount to
 * show the one-time notification pre-permission prompt.
 */
export const NOTIF_PROMPT_FLAG = 'astrolyfe:pending_notif_prompt';

/**
 * Local fallback for "this account has seen the welcome tour," set unconditionally by
 * finish() regardless of whether the onboarding_completed write to PocketBase
 * succeeded. Without this, a failed write left nothing to stop AuthGate from
 * re-evaluating needsOnboarding against the still-stale profile and redirecting
 * straight back to /welcome-tour in the same session — not "next login" as the write
 * failure was assumed to be tolerable, but an immediate bounce loop.
 *
 * Keyed per email (not a single global key) so a second account signing into the same
 * device is not wrongly treated as having already seen the tour.
 */
export function onboardingDoneKey(email: string): string {
  return `astrolyfe:onboarding_done_local:${email}`;
}
