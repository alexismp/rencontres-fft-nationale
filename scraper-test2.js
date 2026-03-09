const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();

    console.log('Navigating to TenUp FFT site...');
    await page.goto('https://tenup.fft.fr/championnat/82543588', { waitUntil: 'networkidle' });

    try {
        const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
        await cookieBtn.waitFor({ state: 'visible', timeout: 5000 });
        await cookieBtn.click();
    } catch (e) { }

    console.log('Waiting for elements to load...');
    await page.waitForTimeout(2000);

    console.log('Clicking PRO A dropdown...');
    await page.locator('text=PRO A').first().click();
    await page.waitForTimeout(1000);

    console.log('Clicking NATIONALE 1...');
    await page.locator('text=NATIONALE 1').first().click();
    await page.waitForTimeout(3000); // Wait for matches to load

    const matchLinks = await page.$$eval('a[href*="/championnat/82543588/division/"]', links => links.map(l => l.href));
    const html = await page.content();
    fs.writeFileSync('/tmp/page4.html', html);

    console.log('Match Detail Links found:', matchLinks.length);
    if (matchLinks.length > 0) {
        console.log('Sample match links:', matchLinks.slice(0, 5));
    } else {
        console.log('No match links found. Maybe they have different URLs? Dumping generic a hrefs with /championnat/');
        const anyLinks = await page.$$eval('a[href*="/championnat/"]', links => links.map(l => l.href));
        console.log('Generic links:', anyLinks.filter(l => !l.includes('PRO') && !l.includes('NATIONALE')).slice(0, 5));
    }

    // Also check if we see "Equipe" links
    const teamLinks = await page.$$eval('a[href*="/equipe/"]', links => links.map(l => l.href));
    console.log('Team Links found:', teamLinks.length);
    if (teamLinks.length > 0) {
        console.log('Sample Team links:', teamLinks.slice(0, 2));
    }

    await browser.close();
})();
