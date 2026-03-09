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

    console.log("Waiting for Nationale 1 matches to load...");
    // Wait explicitly for the "Le calendrier des rencontres" section or loader
    await page.waitForTimeout(4000);

    const html = await page.content();
    fs.writeFileSync('/tmp/debug_page.html', html);

    const anyMatchLinks = await page.$$eval('a[href*="/rencontre/"]', links => links.map(l => l.getAttribute('href')));
    console.log("Found raw match links:", anyMatchLinks.length);
    console.log(anyMatchLinks.slice(0, 3));

    const allCards = await page.$$eval('a[href*="/rencontre/"]', links => links.map(l => {
        let parent = l.parentElement;
        while (parent && !parent.className.includes('bg-white')) {
            parent = parent.parentElement;
            if (!parent) break;
        }
        return parent ? parent.className : 'no-bg-white-parent';
    }));
    console.log("Card classes:", allCards.slice(0, 3));

    await browser.close();
})();
