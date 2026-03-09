const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tenup.fft.fr/championnat/82543588', { waitUntil: 'networkidle' });

    try {
        const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
        await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
        await cookieBtn.click();
    } catch (e) { }

    await page.locator('text=PRO A').first().click();
    await page.waitForTimeout(500);

    await page.locator('text=NATIONALE 1').first().click();
    await page.waitForTimeout(3000);

    console.log("Looking for POULE B...");
    await page.locator('text=POULE A').first().click();
    await page.waitForTimeout(1000);
    await page.locator('text=POULE B').first().click();
    await page.waitForTimeout(3000);

    const j1Text = await page.locator('text=Journée 1').first().isVisible();
    console.log("Journée 1 visible?", j1Text);

    const links = await page.$$eval('a[href*="/rencontre/"]', els => els.map(l => l.href));
    console.log(`Found ${links.length} match records for POULE B, Journée 1`);

    await page.screenshot({ path: '/tmp/pouleB.png', fullPage: true });

    await browser.close();
})();
