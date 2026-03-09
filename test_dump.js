const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto("https://tenup.fft.fr/championnat/82543588/division/135355/phase/218005/poule/499477/rencontre/9567615", { waitUntil: 'networkidle' });

        try {
            const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
            await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
            await cookieBtn.click();
        } catch (e) { }

        const headerLocator = page.locator('.bg-white', { hasText: 'Interclubs Seniors Messieurs 2026' }).first();
        await headerLocator.waitFor({ state: 'attached', timeout: 8000 });

        const html = await headerLocator.innerHTML();
        fs.writeFileSync('test_dump.html', html);

        console.log("Wrote HTML to test_dump.html");
    } catch (e) {
        console.error("ERROR", e);
    } finally {
        if (browser) await browser.close();
    }
})();
