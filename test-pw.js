const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://tenup.fft.fr/championnat/82566680', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(4000);
    
    const pageTitle = await page.title();
    console.log("Page Title:", pageTitle);
    
    const h1s = await page.$$eval('h1', els => els.map(e => e.innerText));
    console.log("H1s:", h1s);
    
    const h2s = await page.$$eval('h2', els => els.map(e => e.innerText));
    console.log("H2s:", h2s);
    
    // Look for championship-like text
    const largeTexts = await page.$$eval('div, p, span, h3', els => els
      .filter(e => {
          const style = window.getComputedStyle(e);
          const size = parseInt(style.fontSize);
          return size > 18;
      })
      .map(e => ({ text: e.innerText.trim(), tag: e.tagName }))
      .filter(e => e.text && e.text.length > 5 && e.text.length < 100)
    );
    
    // De-duplicate
    const uniqueLargeTexts = Array.from(new Set(largeTexts.map(JSON.stringify))).map(JSON.parse);
    console.log("Large Texts:", uniqueLargeTexts);
    
    await browser.close();
})();
