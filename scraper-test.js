const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log('Navigating to TenUp FFT site...');
    await page.goto('https://tenup.fft.fr/championnat/82543588', { waitUntil: 'networkidle' });

    console.log('Accepting cookies...');
    try {
        const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
        await cookieBtn.waitFor({ state: 'visible', timeout: 5000 });
        await cookieBtn.click();
    } catch (e) {
        console.log('Cookie banner not found or error:', e.message);
    }

    console.log('Waiting for elements to load...');
    await page.waitForTimeout(2000);

    console.log('Clicking PRO A dropdown...');
    const proA = page.locator('text=PRO A').first();
    await proA.click();

    await page.waitForTimeout(1000);

    // Take screenshot to see if the dropdown is open and if it shows NATIONALE 1
    await page.screenshot({ path: '/tmp/screenshot2.png', fullPage: true });

    const html = await page.content();
    fs.writeFileSync('/tmp/page2.html', html);

    await browser.close();
})();
