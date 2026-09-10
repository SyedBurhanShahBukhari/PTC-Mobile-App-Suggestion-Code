const { chromium, devices } = require('playwright-core');
const path = require('path');
const DEMO = 'file://' + path.join('/home/user/PTC-Mobile-App-Suggestion-Code', 'demo/index.html');
const fail = [];
const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) fail.push(m); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  // ---- 1. Android phone: gating + manual show + native-install path ----
  let ctx = await browser.newContext({ ...devices['Pixel 7'] });
  let page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(DEMO);
  await page.waitForTimeout(400);

  ok(errs.length === 0, 'no JS errors on load' + (errs.length ? ': ' + errs[0] : ''));
  ok(await page.locator('.ptc-ip').count() === 0, 'banner hidden on 1st visit (minVisits gate)');
  ok(await page.evaluate(() => localStorage.getItem('ptc_ip_visits')) === '1', 'visit counter = 1');

  await page.reload();
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => localStorage.getItem('ptc_ip_visits')) === '2', 'visit counter = 2');
  ok(await page.locator('.ptc-ip').count() === 0, 'still hidden before the 20s delay');

  await page.click('button:has-text("Show banner now")');
  await page.waitForTimeout(600);
  ok(await page.locator('.ptc-ip[data-open="1"]').count() === 1, 'ptcInstall.show() opens the banner');
  const box = await page.locator('.ptc-ip').boundingBox();
  const vh = page.viewportSize().height;
  ok(box.height / vh < 0.25, `banner is a small bar, not an interstitial (${Math.round(box.height/vh*100)}% of viewport)`);
  await page.screenshot({ path: '/home/user/PTC-Mobile-App-Suggestion-Code/demo/preview-android.png' });

  // no beforeinstallprompt in headless -> should fall back to instruction sheet
  await page.click('.ptc-ip__cta');
  await page.waitForTimeout(500);
  ok(await page.locator('.ptc-ip-sheet[data-open="1"]').count() === 1, 'fallback: instruction sheet opens');
  const steps = await page.locator('[data-ptc-steps]').innerText();
  ok(/Add to Home screen|Install app/i.test(steps), 'Android steps shown on Android UA');
  await page.screenshot({ path: '/home/user/PTC-Mobile-App-Suggestion-Code/demo/preview-sheet.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok(await page.locator('.ptc-ip-sheet[data-open="1"]').count() === 0, 'Escape closes the sheet');

  // ---- 2. dismissal + backoff ----
  await page.evaluate(() => ptcInstall.reset());
  await page.reload(); await page.reload(); await page.waitForTimeout(300);
  await page.click('button:has-text("Show banner now")');
  await page.waitForTimeout(500);
  await page.click('.ptc-ip__close');
  await page.waitForTimeout(600);
  ok(await page.locator('.ptc-ip').count() === 0, 'close button removes the banner');
  const until = await page.evaluate(() => +localStorage.getItem('ptc_ip_dismissed_until'));
  const days = Math.round((until - Date.now()) / 864e5);
  ok(days === 14, `first dismissal snoozes 14 days (got ${days})`);
  await page.reload(); await page.waitForTimeout(300);
  const blocked = await page.evaluate(() => { ptcInstall.show(); return document.querySelectorAll('.ptc-ip[data-open="1"]').length; });
  ok(blocked === 0, 'snoozed banner does not reappear on next visit');
  await ctx.close();

  // ---- 3. iPhone Safari: instruction path ----
  ctx = await browser.newContext({ ...devices['iPhone 13'] });
  page = await ctx.newPage();
  await page.goto(DEMO); await page.reload(); await page.waitForTimeout(300);
  ok(await page.evaluate(() => ptcInstall.canInstall()), 'iOS Safari reports canInstall() = true');
  await page.click('button[data-ptc-install]');
  await page.waitForTimeout(500);
  const iosSteps = await page.locator('[data-ptc-steps]').innerText();
  ok(/Share/.test(iosSteps) && /Add to Home Screen/.test(iosSteps), 'iOS shows Share -> Add to Home Screen steps');
  ok(await page.locator('.ptc-ip-sheet svg').count() > 0, 'iOS share icon rendered');
  await page.screenshot({ path: '/home/user/PTC-Mobile-App-Suggestion-Code/demo/preview-ios.png' });
  await ctx.close();

  // ---- 4. desktop: suppressed ----
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await page.goto(DEMO); await page.reload(); await page.reload(); await page.waitForTimeout(300);
  const desktopShown = await page.evaluate(() => { ptcInstall.show(); return document.querySelectorAll('.ptc-ip[data-open="1"]').length; });
  ok(desktopShown === 0, 'banner suppressed on desktop (showOnDesktop:false)');
  await ctx.close();

  // ---- 5. standalone (already installed): suppressed ----
  ctx = await browser.newContext({ ...devices['Pixel 7'] });
  page = await ctx.newPage();
  await page.addInitScript(() => {
    const mm = window.matchMedia.bind(window);
    window.matchMedia = q => q === '(display-mode: standalone)' ? { matches: true, addListener(){}, removeListener(){} } : mm(q);
  });
  await page.goto(DEMO); await page.reload(); await page.reload(); await page.waitForTimeout(300);
  const inApp = await page.evaluate(() => { ptcInstall.show(); return document.querySelectorAll('.ptc-ip[data-open="1"]').length; });
  ok(inApp === 0, 'banner suppressed when already installed (standalone)');
  ok(await page.evaluate(() => localStorage.getItem('ptc_ip_installed')) === '1', 'standalone marks app as installed');
  await ctx.close();

  await browser.close();
  console.log(fail.length ? `\n${fail.length} FAILING` : '\nAll checks passed');
  process.exit(fail.length ? 1 : 0);
})();
