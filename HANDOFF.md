# AstroLyfe — Handoff

Last updated **2026-09-29**, at `main` after the commit that added this file.

Read this before changing anything. It covers where the app stands with Apple, what
has been built and why, what was changed directly on the backend (and so is **not**
in git), and what is still open.

Companion files:
- `APP_STORE_LISTING.md` — ready-to-paste App Store Connect copy for the resubmission
- `tools/` — engine tests, the demo-account report generator, an undeployed PocketBase hook

---

## 1. Where things stand

| | |
| --- | --- |
| **App Store** | Version **1.2.2 (build 14) rejected 2026-09-28** under **Guideline 4.3(b) — Spam** (saturated category: astrology). A reply was sent to App Review on 2026-09-29; no answer yet. |
| **Code** | The app has since been repositioned away from "horoscope app" (sections 3–4). All of it is on `main`. Typecheck clean, iOS bundle builds. |
| **Next step** | Build from `main` in RORK → check it on a phone → update the App Store listing per `APP_STORE_LISTING.md` → resubmit **once**, with everything changed. |

> ⚠️ **Do not resubmit an unchanged app.** Apple's rejection carried an Extended
> Review warning: *"Accounts that repeatedly submit apps that do not follow the App
> Review Guidelines … face removal from the Apple Developer Program."* The same
> developer account (Quntm Technology Group LLC) ships other apps — OFFGRID Drive,
> EnhanceX, RingBridge, GymPulse, Cha-Ching Alerts. Losing the account loses all of
> them.

---

## 2. System map

| Piece | Where | Notes |
| --- | --- | --- |
| **Mobile app** | this repo, **`expo/`** | Expo SDK 54, expo-router. `rork.json` points RORK at `expo/`. Built and uploaded by **RORK**. |
| **Database** | PocketBase at `https://astrolyfe-main.cloudpod.pro` | On the CloudPod VPS. Hooks in `pb-astrolyfe-main/pb_hooks/` (`astrolyfe.pb.js`, `astrolyfe-lib.js`). |
| **Server API** | PHP at `https://astrolyfe.co/api/*.php` | Separate cPanel host. Stripe, account deletion, entitlement checks, reports, push. |
| **Web funnel** | `soulmate.astrolyfe.co` | Where customers sign up and pay. Writes `users` rows. |
| **Legal/support pages** | `https://astro-life.lovable.app/{privacy,terms,support}` | Defined once in `expo/constants/links.ts`. |

**The Supabase naming is historical.** `expo/lib/supabase.ts` re-exports
`expo/lib/pocketbase.ts`, a small client shaped like supabase-js that talks to
PocketBase. There is no Supabase in the app any more. Don't rename it casually —
seven files import it.

App identity (`expo/app.json`): display name `AstroLyfe`, version `1.2.2`, bundle
ID `app.rork.v5cjeo8w8teyc01wvntgb`. That bundle ID **works** — TestFlight builds
under the owner's team prove the App Store Connect record matches it. (An early
note in this project wrongly called it a blocker.) RORK increments the build number
(13 and 14 so far).

---

## 3. Apple review history

### Compliance work before the first submission

| Guideline | Issue | Fix |
| --- | --- | --- |
| 5.1.1(v) account deletion | Deletion was **refused** when a subscription was active ("email support"). The demo account must be subscribed to get past the paywall, so the reviewer would always hit the refusal. | Server-first via `/api/delete-account.php` (cancels Stripe). If the server is unreachable the app still deletes, and records the uncancelled subscription in `deletion_requests` for support. |
| 5.1.1(v) | Deletion left `readings`, `compatibility_tests`, `course_progress` behind (keyed by email, no cascade). | Client fallback deletes every email-keyed collection; `readings` given a delete rule. |
| 5.1.1(v) | The shim's `runDelete()` deleted only the **first 200** matching rows while reporting success. | Loops until nothing matches. Proven: 517 rows → pre-fix left 317, post-fix 0. |
| 2.3.1 | A dormant `skipAuth` switch granted signed-in + subscribed with no credentials. | Removed. |
| 3.1.1 / 3.1.3(f) | Links to the sales funnel from sign-in screens. | Removed; the app qualifies as a free companion to a paid web service (3.1.3(f)). |
| 5.1.1 permissions | An unused location module requested location with no purpose string (iOS would have terminated the app had anything called it); camera/mic declared but never used. | Removed. |
| Export compliance | Prompted on every upload. | `ITSAppUsesNonExemptEncryption: false` (HTTPS + iOS Keychain only — both exempt). |

### The rejection — 2026-09-28

```
Submission ID: cdd3c0bd-95d9-4209-95f3-d69d9aebdba7
Review device: iPhone 17 Pro Max     Version reviewed: 1.2.2 (14)
Guideline 4.3(b) - Design - Spam
"The app primarily features astrology, horoscopes, palm reading, fortune telling or
zodiac reports that duplicate the content and functionality of similar apps that
are already widely available … there are already enough of these apps on the App
Store. … We encourage you to reconsider the app concept and submit a new app that
provides a unique experience not already found on the App Store."
+ Extended Review warning (see section 1)
```

Nothing was broken — Apple rejected the **category**. At that point the app opened
on a daily horoscope, the store name was "Horoscope & Zodiac", and Compatibility was
a sun-sign score. All three are what every app in the category has.

### Reply sent — 2026-09-29

Argued three distinctions: the soulmate portrait, location-based (astrocartography)
reports, and readings computed from real planetary positions rather than templated
per sign — and asked what changes would satisfy 4.3. **Watch App Store Connect for
the answer**; if Apple names specific changes, do those first.

### Honest odds

Guideline 4.3(b) names astrology outright and a human decides. Nothing guarantees
approval. The repositioning below removes every surface that looks like the
saturated category and makes the first impression something the category doesn't
have — that is the realistic lever. If it is rejected again, the options are the
formal **App Review Board** appeal, or a **web app** (Apple's own suggestion).

---

## 4. What the app is now

Tabs: **Places → Soulmate → Couple → Insights → You.**

| Feature | What it does | Where |
| --- | --- | --- |
| **Power Places** (landing tab) | Cities where the user's planet lines run, by life area (Venus love, Sun career, Moon home, Jupiter luck, Mars drive). Astrocartography computed on-device from the exact birth moment. | `components/PowerPlaces.tsx`, `services/places.ts` |
| **Power City** | The single city where the lines cross most strongly, with a share button. | same |
| **"Live here and you'd rise as…"** | Relocated rising sign for any city. Agrees with the Birth Chart at the birthplace. | `relocatedRising()` |
| **World line map** | SVG map of a planet's Midheaven / home / rising / partner lines, top cities labelled without overlaps. | `components/LineMap.tsx`, `lib/lineMapLayout.ts` |
| **Couple Map** (replaced sun-sign compatibility) | Enter a partner's birth date, time and city → shared love city, both people's lines on one map, cities where both thrive. **Partner data stays on the device** and is wiped on account deletion. | `app/(app)/compatibility/index.tsx` |
| **Soulmate** | Portrait, Venus sign, cities to meet. | `app/(app)/soulmate/index.tsx` |
| **Insights** | Reports (World Map, Love Cities, Career Cities, Home & Peace, Travel Timing) + Birth chart + Daily forecast. | `app/(app)/insights/index.tsx` |
| **Forecast** | Personal daily reading. **Off the tab bar**; reachable from Insights and by tapping the daily reminder. | `app/(app)/horoscope/` |

Engine accuracy (verified, not assumed): the Sun's Midheaven line lands within
0.05° (~3 mi) of the published solar-noon longitude; solstice declinations within
0.004°; the demo's 2026 Venus retrograde station matches the real one (~22.5° Libra,
Nov 13).

**Precession note.** `services/natal.ts` computes the Sun and planets against the
J2000 equinox. `places.ts` corrects for precession itself (a constant ~0.35° for
2024 before the fix). `natal.ts` was deliberately not changed — other screens rely
on its current output — but Birth Chart positions are off by the precession since
2000: ~0.35° for a 1975 or 2025 birth, ~0.7° for 1950. That only changes a sign for
planets within that distance of a cusp.

---

## 5. Commit log (this handoff's work)

| Commit | Change |
| --- | --- |
| `106e635` | Remove undeclared location permission; declare export compliance |
| `be0288d` | Delete data the deletion fallback left behind; remove auth bypass |
| `4fa0ae3` | Delete every matching row, not just the first page |
| `a184d64` | Always complete account deletion, even when billing can't be cancelled |
| `ac883bf` | Let customers save their profile without retyping their birth date (PocketBase datetimes) |
| `733670a` | Render report Markdown instead of raw syntax |
| `2e0eee9` | **Birth Chart: convert birth time to UT** — it showed Leo rising instead of Scorpio on the demo and put every planet in the wrong house, for every user not born at UTC+0 |
| `f1c5d84` | Lead with Power Places and Soulmate |
| `0d3c3dc` | Power City, relocated rising sign, world map, sharing |
| `a4d973b` | Couple Map replaces sun-sign compatibility |
| `75886cf` | Remove generic astrology surfaces from the first impression (welcome, tabs, reminder, report names, paywall copy) |
| *this commit* | Handoff, listing copy, tools |

Earlier history (auth hardening, PocketBase migration, forecast engine, welcome tour,
light mode) is in `git log`; other contributors committed as `tech-god-704`,
`zodiacpath` and `Rork`.

---

## 6. Changed directly on the backend — NOT in git

These live only in PocketBase (`astrolyfe-main`). A fresh environment will not have
them.

| Change | Detail |
| --- | --- |
| `readings.deleteRule` | Set to `user_email = @request.auth.email` so the client can clear a user's readings on deletion. Fields untouched. |
| `deletion_requests` collection | id `pbc_1755010454`. Fields: email, stripe_customer_id, subscription_id, subscription_status, reason, resolved, created_at. `createRule` pins email to the caller's own; list/view/update/delete admin-only. **Someone must watch it** — any `resolved = false` row is a subscription still billing with no account behind it. |
| Demo account password | Reset 2026-09-23. The password is in App Store Connect → App Review → Sign-In Information. **Deliberately not written here** — the account has `is_admin`. |
| Demo account reports | See section 7. |

---

## 7. The App Review demo account

- Email: `appreview@astrolyfe.app` (password: see App Store Connect, not this file)
- Auth record `pcifagn0qamv0a6`: verified, `paid: true`, `subscription_status: active`
- Profile `z4tcmyezliyyulo`: **`is_admin: true`**, `onboarding_completed: true`,
  born **1990-07-15 14:30**, Los Angeles (34.0522, -118.2437), `America/Los_Angeles`

**Why `is_admin` matters.** On every launch the app asks the PHP server to check
Stripe directly and overwrites the subscription status with the answer. The demo has
no real Stripe subscription, so without `is_admin` it would drop to the paywall
seconds after sign-in. `is_admin` only adds a small "Admin" badge on Profile — no
hidden features.

**Reports.** Five text reports were **generated from the demo's own chart** with
`tools/demo-review-reports.ts`, so every city in them matches what Places, Soulmate
and Couple show for this account (checked). The sixth, the soulmate portrait, is an
image reused from the owner's test account. Earlier, the owner's own reports had
been copied onto the demo — written for a different birth chart, so they
contradicted the screens; that is fixed.

### If Apple deletes the demo account during review

Expect it — the reviewer tests Delete Account. Before any resubmission:

1. Create a `users` record (superuser): the demo email, a new password, `verified`,
   `paid: true`, `subscription_status: active`. The `astrolyfe.pb.js` hook creates
   the profile row.
2. Update that profile: `is_admin: true`, `subscription_status: active`,
   `onboarding_completed: true`, `display_name: App Review`, `zodiac_sign: Cancer`,
   `date_of_birth: 1990-07-15`, `birth_city: Los Angeles, CA`, `birth_lat: 34.0522`,
   `birth_lon: -118.2437`, `timezone: America/Los_Angeles`, and `quiz_data` with
   `birth_hour: 14`, `birth_minute: 30`.
3. `bun tools/demo-review-reports.ts --json` → insert five `user_reports` rows
   (`user_email` = demo email, `user_id` = new user id, `report_type`, `title`,
   `content_html` from the output). Travel Timing is dated from the day you run it.
4. Put the new password into App Store Connect.

---

## 8. Open issues, ranked

1. **App Store listing still says "Horoscope & Zodiac"** (as far as this project
   knows). Update it — `APP_STORE_LISTING.md`. Also confirm the **Privacy Policy and
   Support URLs** in App Store Connect match `expo/constants/links.ts`; an earlier
   checklist gave an outdated `soulmate.astrolyfe.co` URL.
2. **`/api/delete-account.php` is unverified.** It is the primary deletion path and
   lives on a host the agent environment could not reach. Check that it (a) validates
   the Bearer token before deleting, (b) deletes every email-keyed collection, and
   (c) **pages past the first 200 rows** — the app's own client had exactly that bug.
3. **The report generator leaks Chinese words into customers' reports** — seen in
   real output: "pulls 事业 and personal visibility", "your 光芒 to illuminate". Fix in
   the web pipeline (constrain output language / post-filter). The owner's original
   reports still contain them.
4. **`tools/pocketbase/account-cleanup.pb.js` is not deployed.** Copy it into the
   instance's `pb_hooks/` and restart; it makes email-keyed cleanup hold for every
   deletion path. CloudPod's `write_hook_file` failed on a read-only `/tmp`.
5. **Monitor `deletion_requests`** (section 6).
6. **`STRIPE_SECRET_KEY` is not set** in the PocketBase env; Stripe is handled only
   by the PHP server. Fine today — just don't write hooks that assume it.
7. **The astrologer chat ("Ask") is hidden** — replies are seeded personas with
   nothing generating them. Don't re-enable without a real backend.
8. **Dead code:** `expo/services/compatibility.ts` (the old sun-sign scorer) has no
   callers now.
9. **One pre-existing lint error** remains (`react/no-unescaped-entities`); harmless.
10. **No test runner** is installed in the app. Tests live in `tools/` and run with
    Bun (below). Adding jest/vitest means new dependencies in the lockfile RORK
    builds from — decide deliberately.

---

## 9. Verifying changes

From `expo/`:

```sh
bun install
npx tsc --noEmit -p tsconfig.json     # expect 0 errors
npx eslint .                           # 1 pre-existing error, 7 warnings
npx expo export --platform ios         # must bundle cleanly
```

From the repo root:

```sh
bun tools/places.test.ts     # astrocartography engine vs published solar-noon longitudes
bun tools/places2.test.ts    # power city (brute-force), relocated rising, map geometry
bun tools/tz.test.ts         # all 111 city time zones valid and plausible
bun tools/fmt.test.ts        # report Markdown renderer
```

These cover the pure modules. The deletion and couple suites need React Native
stubs and a mock PocketBase and were run out of tree during development; recreate
them if you change `lib/pocketbase.ts` `runDelete()` or `deleteAccount()`.

**Visual checks.** The line map was rendered to PNG with headless Chromium
(`/opt/pw-browsers/...headless_shell`) using the real `lib/lineMapLayout.ts`, which
is how label overlaps were caught. Type checks don't see those; render after
touching the map.

---

## 10. Gotchas

- **RORK builds from `main`.** A fix is not in a build until RORK rebuilds after the
  push. Check the build number in TestFlight.
- **PocketBase dates come back as datetimes** (`1990-07-15 00:00:00.000Z`). Slice to
  the date before treating them as `YYYY-MM-DD` — that caused the Profile save bug.
- **Birth times are wall-clock.** Anything astronomical needs `utcOffsetMinutes`
  from `birthUtcOffsetMinutes()`; the Birth Chart shipped without it.
- **`is_admin` on the demo account is load-bearing** (section 7).
- **Changing the store name**: the on-device name `AstroLyfe` is already a valid
  match for any `AstroLyfe: …` store name.
- **Never add a purchase link or price** to the app or the store listing — it forfeits
  3.1.3(f).
