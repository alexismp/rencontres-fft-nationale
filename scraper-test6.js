const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tenup.fft.fr/championnat/82543588/division/135355/phase/218005/poule/499474/rencontre/9567568', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const containerText = await page.$$eval('.bg-white', els => {
        const el = els.find(e => e.textContent?.includes('Interclubs Seniors Messieurs 2026'));
        return el ? el.textContent : '';
    });
    console.log("Match header text block:", containerText);

    await browser.close();
})();
