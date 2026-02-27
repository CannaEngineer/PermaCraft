const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3002';
const OUT = path.join(__dirname, '../public/screenshots');
const EMAIL = 'dcrawford@crawfordind.com';
const PASS = 'bigmount';

async function go() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // ── Log in ────────────────────────────────────────────────────────────────
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/canvas|\/dashboard/, { timeout: 15000 });
  console.log('Logged in, at:', page.url());

  // ── Get farm ID from API ──────────────────────────────────────────────────
  const farmsRes = await page.request.get(`${BASE}/api/farms`);
  const farmsJson = await farmsRes.json();
  const farms = farmsJson.farms || farmsJson || [];
  const firstFarm = Array.isArray(farms) ? farms[0] : null;
  const farmId = firstFarm?.id;
  console.log('Farm ID:', farmId);
  if (!farmId) throw new Error('Could not find a farm ID');

  const canvasBase = `${BASE}/canvas?farm=${farmId}`;

  // ── Helper: screenshot ────────────────────────────────────────────────────
  const shot = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    console.log(`  ✓ ${name}.png`);
  };

  // ── 1. Map Editor — farm section with map visible ─────────────────────────
  console.log('  → map-editor');
  await page.goto(`${canvasBase}&section=farm`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await shot('map-editor');

  // ── 2. Time Machine — open "Vitals & Time" tab in bottom drawer ───────────
  console.log('  → time-machine');
  await page.goto(`${canvasBase}&section=farm`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // The drawer starts collapsed — click "Expand map info drawer" to open it
  const expandBtn = page.locator('[aria-label="Expand map info drawer"]');
  if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(500);
  }

  // Click the "Vitals & Time" tab
  const vitalsTab = page.locator('button[role="tab"]:has-text("Vitals")');
  if (await vitalsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await vitalsTab.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('    ⚠ Vitals tab not found, trying text match');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const t = tabs.find(el => el.textContent?.includes('Vitals'));
      if (t) t.click();
    });
    await page.waitForTimeout(2000);
  }
  await shot('time-machine');

  // ── 3. AI Analysis — use ?section=ai URL param ────────────────────────────
  console.log('  → ai-analysis');
  await page.goto(`${canvasBase}&section=ai`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await shot('ai-analysis');

  // ── 4. Plant Catalog ──────────────────────────────────────────────────────
  console.log('  → plant-catalog');
  await page.goto(`${BASE}/plants`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await shot('plant-catalog');

  // ── 5. Plant Story — navigate directly to first species page ─────────────
  console.log('  → plant-story');
  const speciesRes = await page.request.get(`${BASE}/api/species?limit=5`);
  const speciesJson = await speciesRes.json();
  const firstSpecies = (speciesJson.species || [])[0];
  if (firstSpecies?.id) {
    await page.goto(`${BASE}/plants/${firstSpecies.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
  } else {
    console.log('    ⚠ No species found from API');
    await page.goto(`${BASE}/plants`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }
  await shot('plant-story');

  // ── 6. Community Gallery ──────────────────────────────────────────────────
  console.log('  → farm-story');
  await page.goto(`${BASE}/gallery`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await shot('farm-story');

  await browser.close();
  console.log('\nDone. Screenshots saved to public/screenshots/');
}

go().catch(e => { console.error(e); process.exit(1); });
