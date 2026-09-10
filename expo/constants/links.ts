/**
 * Outbound web links.
 *
 * One place on purpose: these are the URLs App Store Connect's Support URL and Privacy
 * Policy URL fields must agree with, and four scattered string literals across two auth
 * screens is how they drift apart. Previously they pointed at soulmate.astrolyfe.co,
 * which is the sales funnel; the published support and legal pages live on the site
 * below, and that is what App Store Connect points reviewers at.
 *
 * Deliberately absent: any link to the funnel itself. The app claims 3.1.3(f) (a free
 * stand-alone companion to a paid web tool), and that exemption holds only while there
 * is neither purchasing inside the app NOR a call to action to purchase outside it — so
 * a "get started / subscribe on the web" link would forfeit the exemption and put the
 * app straight back under 3.1.1's in-app-purchase requirement. Legal and support links
 * are not purchase CTAs and are required by other guidelines; they stay.
 */

const SITE = 'https://astro-life.lovable.app';

export const PRIVACY_POLICY_URL = `${SITE}/privacy`;
export const TERMS_URL = `${SITE}/terms`;
export const SUPPORT_URL = `${SITE}/support`;
