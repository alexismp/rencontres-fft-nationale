const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const url = 'https://tenup.fft.fr/championnat/82543588/division/135355/phase/218005/poule/499477/rencontre/9567615';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    const html = await page.content();

    const isIdFGlobal = html.includes('ILE DE FRANCE') || html.match(/\b(75|77|78|91|92|93|94|95)\d{3}\b/) !== null;

    const matchHeaderText = await page.$$eval('.bg-white', els => {
        const el = els.find(e => e.textContent?.includes('Interclubs Seniors Messieurs 2026'));
        return el ? el.textContent : '';
    });

    console.log("matchHeaderText evaluated to:", matchHeaderText);
    let isIdF = false;

    if (matchHeaderText) {
        const leagueMatch = matchHeaderText.match(/\((.*?)\)/);
        console.log("leagueMatch:", leagueMatch);
        if (leagueMatch) {
            const firstLeague = leagueMatch[1].toUpperCase();
            isIdF = firstLeague.includes('ILE DE FRANCE') || firstLeague.includes('PARIS');
            console.log("Regex evaluated isIdF to:", isIdF);
        }
    } else {
        isIdF = isIdFGlobal;
        console.log("Fallback evaluated isIdF to:", isIdF);
    }

    await browser.close();
})();
