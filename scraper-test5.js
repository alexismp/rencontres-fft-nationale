const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tenup.fft.fr/championnat/82543588/division/135355/phase/218005/poule/499474/rencontre/9567568', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Extract team names and any league info.
    // We can just dump all the text content of the app container to see what's what.
    const allText = await page.$$eval('.bg-white', els => els.map(e => e.textContent?.trim()));
    console.log("White bg texts (cards/panels):");
    allText.forEach((t, i) => { if (t) console.log(`Card ${i}:\n`, t.substring(0, 500), '\n---'); });

    // Let's specifically look for the team names which are usually in h2 or h3 or strong
    const headings = await page.$$eval('h1, h2, h3, h4, h5', els => els.map(e => e.textContent?.trim()));
    console.log("Headings:\n", headings);

    // Take a screenshot of the match page
    await page.screenshot({ path: '/tmp/match_gemenos.png', fullPage: true });

    await browser.close();
})();
