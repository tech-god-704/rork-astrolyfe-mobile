import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

/**
 * Local daily reminder notifications.
 *
 * This is intentionally local-only: expo-notifications schedules the notification on
 * the device itself, so it fires reliably at the chosen time with no server, no push
 * credentials, and no cron. The tradeoff is that the notification body is a fixed
 * reminder ("Your daily horoscope is ready"), not that day's actual generated
 * content — there is no round trip to the server at delivery time to ask.
 *
 * registerPushToken() stores an Expo push token on the profile for later use, but
 * nothing currently sends a push through it — no APNs/FCM credentials are configured
 * on this project and no server-side dispatch exists. It is here so the plumbing is
 * in place if server-triggered push (e.g. "today's reading is ready") is built later,
 * not because it does anything today. Do not represent this as working push.
 */

const DAILY_REMINDER_ID = 'astrolyfe-daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Preset send times. Chips, not a free time picker — see profile screen. */
export const NOTIFICATION_TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
  });
}

/**
 * Request permission. Returns whether notifications may actually be scheduled.
 * On iOS this is the one-time system dialog; on Android 13+ it is the runtime
 * POST_NOTIFICATIONS permission. Earlier Android versions grant implicitly.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  // iOS only re-prompts once; a prior explicit denial must be resolved in Settings,
  // not by asking again, which would silently do nothing.
  if (existing.status === 'denied' && existing.canAskAgain === false) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/** Replace any existing scheduled reminder with one at the given local time, daily. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Your stars today',
      body: 'Your daily horoscope is ready — see what today holds.',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

/**
 * Make the OS-scheduled notification match stored preference. Call once after the
 * profile loads (handles a fresh install or a preference changed on another device)
 * and again immediately after the user changes the setting.
 *
 * Silently no-ops rather than throwing: a failed schedule sync is not worth
 * interrupting the screen the user is looking at over.
 */
export async function syncDailyReminder(enabled: boolean, hour: number, minute: number): Promise<void> {
  try {
    if (enabled) {
      await scheduleDailyReminder(hour, minute);
    } else {
      await cancelDailyReminder();
    }
  } catch {
    // Best-effort; see doc comment.
  }
}

/**
 * Obtain an Expo push token for future use. Returns null on simulators/emulators —
 * push tokens are meaningless there — and on any failure, including a project without
 * push credentials configured, which this project currently is.
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
