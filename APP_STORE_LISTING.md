# App Store listing — AstroLyfe

Ready-to-paste App Store Connect copy for the resubmission after the Guideline
4.3(b) rejection (see `HANDOFF.md`). Every field below is within Apple's length
limit — counts checked, not estimated.

**The listing matters as much as the build.** A reviewer reads the name,
subtitle and screenshots before opening the app. If they still say "Horoscope &
Zodiac", the app is judged as one more horoscope app no matter what is inside.

---

## Name — 30 max

```
AstroLyfe: Soulmate & Places
```
28/30. Alternatives: `AstroLyfe: Love & Places Map` (28), `AstroLyfe: Where You Belong` (27).

Replaces the rejected **"AstroLyfe: Horoscope & Zodiac"**. The on-device name is
already just `AstroLyfe` (`expo/app.json`), which Apple accepts as a match.

## Subtitle — 30 max

```
Your love & power cities map
```
28/30. Alternative: `Find the cities made for you` (28).

## Promotional text — 170 max

```
Find the cities your birth chart lights up for love, career and home, see your soulmate portrait, and discover where you and your person both thrive.
```
149/170. Promotional text can be changed at any time without a new review.

## Keywords — 100 max, comma-separated

```
astrocartography,soulmate,love map,couple,relocation,travel,cities,birth chart,where to live,compass
```
100/100. Deliberately leaves out `horoscope` and `zodiac` — those are the words
that put the app in the saturated bucket. Don't repeat words from the name; Apple
indexes those already.

## Description — 4000 max

```
Where in the world do you belong?

The moment you were born, every planet sat directly overhead somewhere on Earth. Those spots trace lines around the globe, and where a line crosses a city, that part of your life comes through more strongly. AstroLyfe calculates your lines from your exact birth moment and turns them into a map you can actually use.

POWER PLACES
• Your Power City: the one place where your lines cross most strongly
• Your top cities for love, career, home, luck and drive
• A live map of your lines across the world
• Check any city and see what it does for you, including the rising sign you would have if you lived there
• When to go: the dates each place is switched on, worked out from the real movement of the planets

FROM HOME COMPASS
• Stand where you live and see which direction each part of your life lies in
• The real cities along each line, how far away they are, and what time it is there now
• Change home whenever you move; it stays on your phone

COUPLE MAP
• Add your partner, crush or best friend
• See both of your love lines on one map
• Find your love city together, and the places where you both thrive
• Best time to go together: the days both of your love lines are switched on at once
• Their details stay on your phone

SOULMATE
• Your soulmate portrait
• How you love, from your Venus placement
• The cities where you are most likely to meet

PERSONAL CITY REPORTS
• Your World Map, Love Cities, Career Cities, Home & Peace Cities and Travel Timing
• Travel Timing shows when your places are switched on, from the real movement of the planets

Everything is calculated on your phone from real planetary positions for your exact birth date, time and place — not a paragraph written for your sign.

An active AstroLyfe account is required to use the app.
```

**Do not add** "subscribe on our website", a price, or a link to the funnel.
The app qualifies under Guideline **3.1.3(f)** (free companion to a paid web
service) only while there is no purchasing in the app **and no call to action to
purchase outside it** — and App Store metadata counts. Stating that an account is
required is fine; telling people where to buy one is not.

## URLs — must match the app

The app's legal and support links live in `expo/constants/links.ts`. App Store
Connect must point at the **same** pages:

| Field | URL |
| --- | --- |
| Privacy Policy URL | `https://astro-life.lovable.app/privacy` |
| Support URL | `https://astro-life.lovable.app/support` |
| Terms (in the app, and EULA if custom) | `https://astro-life.lovable.app/terms` |

> An earlier checklist in this project said to use
> `soulmate.astrolyfe.co/privacy-policy.php`. That is out of date — the links were
> moved off the sales funnel on purpose (see the comment in `links.ts`). Check what
> App Store Connect currently has and correct it if needed.

## Category

- **Primary:** Lifestyle
- **Secondary:** Travel — defensible, since Places and Travel Timing are about
  where to live and when to go. Optional; Lifestyle alone is fine.

## Screenshots

Lead with what sets it apart from horoscope apps: places, directions and dates.
**No daily-horoscope or zodiac-sign screens anywhere in the set** — screenshots are
the first thing a reviewer compares against the saturated category.

| # | Screen | Caption |
| --- | --- | --- |
| 1 | Places — first open, with the "How AstroLyfe works" card (Where / Which way / When) | Where you belong, which way to go, and when |
| 1b | Places — Power City card with the map below (alternative first shot) | The cities your chart lights up |
| 2 | Places — "From home" compass rose and the first direction card | Which way to go from home |
| 3 | Places — map with the Love chip selected | Your lines, around the world |
| 4 | Places — "Check a city" result with "you'd rise as…" and its "Best time to go" | Check any city on Earth — and when to go |
| 5 | Couple — love city together + two-colour map | Where you two thrive |
| 6 | Soulmate — portrait and love cities | Your soulmate, and where you'll meet |
| 7 | Insights — the city reports list | Personal city reports |

Capture them from the **demo account** so the content is consistent (its reports
were generated from its own chart — see `HANDOFF.md`). Required size is the 6.9"
display (1320 × 2868); a 6.5" set is still accepted.

## How to describe the difference (checked Oct 2026)

A check of 17 iOS astrology apps' store descriptions (see `HANDOFF.md`, section 4)
found that astrocartography maps, couple map overlays and dated travel windows
each already exist in at least one app (Maphrodite, CartoStar, Linea, Vibe
Travel). Local space lines exist in CartoStar and Astro Gold. So **never claim
AstroLyfe is the "only" or "first" app** with any single feature — a reviewer
can check, and an untrue claim hurts more than it helps.

What is accurate, and is the case to make:
- It is a **relocation and travel-timing tool**, not a horoscope app: no daily
  sign feed, no sign picker, no compatibility score.
- It combines **where** (map), **which way from where you live** (compass) and
  **when** (dates) in one place, for one person or a couple.
- **Best dates for two people together** — no examined listing offers it.
- Everything is calculated on the device from the exact birth moment.

## App Review notes

Paste into **App Review Information → Notes**:

```
AstroLyfe is a relocation and relationship-mapping app. Its core features — Power Places, the world line map, Couple Map, and "the rising sign you'd have if you lived here" — calculate where on Earth each planet sat at the user's exact birth moment (astrocartography) and match those lines to real cities. A timing engine then scans the real sky a year ahead to date when each place is most active (including, for couples, the days both people's lines are active together). A "From home" compass (local space) shows the direction each planet lay in from where the user lives now, with the real cities along each line, their distance and local time. All of it is computed on the device from planetary positions, not from per-sign text. There is no daily horoscope feed and no zodiac-sign picker: the sun sign is worked out from the birth date.

Demo account: the sign-in above has an active subscription and full birth details, so every feature is unlocked. Suggested path: Places tab (Power City, map, "Check a city", then the "From home" switch) → Couple tab (enter any birth date, time and city to see a shared map) → Soulmate → Insights (city reports).

The app is a free companion to our web service. Subscriptions are purchased only on our website; the app contains no purchasing and no links or calls to action to buy (Guideline 3.1.3(f)).

To delete an account: You tab → Delete Account.
```

## Age rating

Answer the questionnaire honestly for astrology content. None of the sensitive
categories apply; the usual result is 4+ or 12+.

## App Privacy

Declare what the web funnel and app store server-side: email, name, date of
birth, birth time and place, quiz answers, and the soulmate portrait. The funnel
quiz stores an **ethnicity preference** (`ethnicity_pref`) — that is sensitive
data and must be declared, and covered by the privacy policy.

The Couple Map partner's details are **not** collected: they stay on the device
and are never sent to a server, which Apple treats as not collected.
