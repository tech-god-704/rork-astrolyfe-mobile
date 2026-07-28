/** Shared AsyncStorage keys used across more than one screen/provider. */

/**
 * Set once by welcome-tour's finish(), consumed once by Home on its next mount to
 * show the one-time notification pre-permission prompt.
 */
export const NOTIF_PROMPT_FLAG = 'astrolyfe:pending_notif_prompt';
