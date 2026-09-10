# PTC — "Install our app" prompt for mobile visitors

For **paktaxcalculator.pk**. Google Search Console shows mobile carrying the
site: **103,779 clicks / 1.63M impressions on mobile** vs 51,521 / 800K on
desktop — roughly **two thirds of all clicks arrive on a phone**. This repo turns
that traffic into installs.

---

## What I recommend (and what I deliberately avoided)

**1. Ship a PWA, not a Play Store app.**
You don't need a native app to put an icon on someone's home screen. A PWA
installs straight from the browser in one tap — no store listing, no review
queue, no 40 MB download, no separate codebase. Your site *is* the app. If you
later want a Play Store listing, the same PWA wraps into one with Bubblewrap
(a Trusted Web Activity) in an afternoon — so this is not a dead end.

**2. Do NOT use a full-screen popup.**
This is the important part. Google treats a full-screen interstitial shown to
a visitor arriving from search as an **intrusive interstitial**, and it is a
ranking demotion. With 1.6M mobile impressions, that risk is far more expensive
than the installs you'd gain. So this implementation uses a **small bottom bar**
(~70px tall), which is explicitly the pattern Google names as acceptable.

**3. Don't ask on the first pageview.**
Someone who just landed from a search result hasn't decided they like you yet —
prompting immediately gets a reflexive dismiss, and a dismissed prompt is
mostly gone forever. Defaults here: **2nd visit minimum, and 20 seconds into
the page**, i.e. after they've actually run a calculation.

**4. Take "no" seriously, with backoff.**
Dismiss once → don't ask for 14 days. Twice → 45 days. Three times → never
again. Nothing is more annoying than a banner that returns every single visit.

**5. Give a permanent way in.**
Add `data-ptc-install` to a menu item ("Install App") so people who dismissed
it can still install whenever they want. Costs nothing, converts well.

**6. Handle iOS honestly.**
iOS Safari has no install API — `beforeinstallprompt` does not exist there.
The only path is Share → Add to Home Screen, so the code shows an illustrated
3-step sheet instead of a fake "Install" button that would do nothing. It also
detects Chrome/Firefox on iOS, which *cannot* add to home screen at all.

**Realistic expectation:** a well-timed PWA prompt on a utility site like this
converts around 3–8% of eligible mobile sessions. Installed users come back
directly instead of re-searching, which is worth far more per user than a
search visit.

---

## What's in here

```
snippets/install-banner-snippet.html   ← THE MAIN FILE. Paste into your code plugin.
snippets/head-snippet.html             ← manifest + service worker registration
snippets/wordpress-functions.php       ← PHP alternative for WPCode / functions.php
pwa/manifest.webmanifest               ← upload to your web root
pwa/sw.js                              ← upload to your web root  (must be at root!)
pwa/offline.html                       ← upload to your web root
assets/icons/*.png                     ← PLACEHOLDER icons — replace with your logo
demo/index.html                        ← open in a browser to preview the banner
```

---

## Install — the 5 minute version

### Step 1 — upload three files to your web root

`manifest.webmanifest`, `sw.js` and `offline.html` must be reachable at:

```
https://paktaxcalculator.pk/manifest.webmanifest
https://paktaxcalculator.pk/sw.js
https://paktaxcalculator.pk/offline.html
```

`sw.js` **must** be at the root — a service worker can only control the folder
it is served from and below. Also upload `assets/icons/` to
`https://paktaxcalculator.pk/assets/icons/`.

> On WordPress you can upload these with FTP/cPanel File Manager, or use the
> rewrite-rule section at the bottom of `snippets/wordpress-functions.php` if
> your host doesn't let you write to the root.

### Step 2 — paste the head snippet

Code plugin → new **HTML** snippet → location **Site Wide Header**.
Paste `snippets/head-snippet.html`.

### Step 3 — paste the banner snippet

Code plugin → new **HTML** snippet → location **Site Wide Footer**.
Paste `snippets/install-banner-snippet.html`. Done.

### Step 4 — replace the placeholder icons

The included icons are a plain green "PTC" placeholder. Export your real logo
at 192×192 and 512×512 PNG and overwrite the files. For
`icon-maskable-512.png`, keep the logo inside the middle **80%** of the canvas
— Android crops the edges into a circle/squircle.

---

## Configuration

Everything is in the `CONFIG` block at the top of the `<script>`:

| Option | Default | What it does |
|---|---|---|
| `appName` | Pak Tax Calculator | Bold line in the banner |
| `tagline` | Install the app… | Small grey line |
| `buttonLabel` | Install | CTA text |
| `iconUrl` | `/assets/icons/icon-192.png` | Banner icon |
| `showOnDesktop` | `false` | Mobile only |
| `minVisits` | `2` | Never asks on the first pageview |
| `showAfterSeconds` | `20` | Delay before the bar slides up |
| `dismissDaysBackoff` | `[14, 45, 400]` | Snooze after 1st / 2nd / 3rd dismissal |
| `debug` | `false` | `true` = ignore all gates, show instantly |

**Add an "Install App" link to your menu** — any element with the attribute:

```html
<button data-ptc-install>Install App</button>
<a href="#" data-ptc-install>Install App</a>
```

**Console API** for testing on a real device:

```js
ptcInstall.show()        // force the banner up
ptcInstall.prompt()      // fire install / instructions immediately
ptcInstall.canInstall()  // is a real install available?
ptcInstall.reset()       // clear visit count + dismissals, then reload
```

---

## Testing

**Locally:** open `demo/index.html` in a browser — it has buttons to force the
banner, trigger install, and reset saved state.

**On the real site:**
1. Chrome desktop → DevTools → **Application → Manifest**. Every field must be
   green, with no "installability" errors listed.
2. Chrome desktop → DevTools → **Application → Service Workers** → should read
   *activated and is running*.
3. Lighthouse → the *Installable* audit should pass.
4. Real Android phone: open the site twice, wait 20s → the bar appears with a
   working native install dialog.
5. Real iPhone (Safari): same, but you get the Add-to-Home-Screen steps.

**Measuring it.** The snippet already fires GA4 / GTM events named
`pwa_install_prompt` with an `action` parameter: `shown`, `click_install`,
`accepted`, `declined`, `dismiss`, `instructions_shown`, `installed`. In GA4,
mark `installed` as a conversion and you can see exactly what this is worth.

---

## Safety notes

- **The service worker is the only risky piece.** It caches pages, so a bad
  deploy can serve stale HTML. `sw.js` is deliberately **network-first for
  pages**, so visitors always get fresh tax rates; the cache is only an offline
  fallback. It also never caches `wp-admin`, `wp-login`, `wp-json`, or any URL
  with a query string.
- **Kill switch:** if anything goes wrong, replace the contents of `sw.js` with
  the unregister snippet in the comment at the top of that file. Every visitor
  self-unregisters on their next visit.
- **Bump `VERSION`** in `sw.js` (`ptc-v1` → `ptc-v2`) whenever you change
  cached assets, to flush old caches.
- No cookies, no third-party requests, no personal data — only `localStorage`
  counters, so nothing new is needed for privacy compliance.

---

## If you do want a real Play Store app later

Once the PWA above is live and passing the installability audit:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://paktaxcalculator.pk/manifest.webmanifest
bubblewrap build
```

That produces a signed `.aab` you can upload to Google Play. It's the same
website in a native shell (a Trusted Web Activity), so you maintain one
codebase. You'd then also add `related_applications` to the manifest so Chrome
promotes the Play Store version instead of the PWA on Android.

---

## Automated checks

`demo/browser-tests.js` drives the demo page in headless Chromium and asserts
the gating, dismissal backoff, iOS path, desktop suppression and
already-installed suppression all behave. It needs `playwright-core` and a
Chromium binary:

```bash
npm i playwright-core
node demo/browser-tests.js     # edit executablePath at the top for your machine
```

All 19 checks pass on the committed code.
