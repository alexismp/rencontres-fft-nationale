import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MATCHES_FILE = path.join(process.cwd(), 'public', 'matches.json');
const CLUBS_FILE = path.join(process.cwd(), 'public', 'clubs.json');

const globalAny: any = global;
if (!globalAny.scraperStatus) {
    globalAny.scraperStatus = { isRunning: false, progress: "Prêt", stopRequested: false };
}

// Helper to write progress and log
function updateStatus(status: { isRunning?: boolean, progress?: string, stopRequested?: boolean }) {
    if (status.progress) console.log(`[SCRAPER] ${status.progress}`);
    globalAny.scraperStatus = { ...globalAny.scraperStatus, ...status };
}

export async function GET() {
    return NextResponse.json(globalAny.scraperStatus);
}

export async function POST(request: Request) {
    let divisions = ['NATIONALE 1', 'NATIONALE 2', 'NATIONALE 3', 'NATIONALE 4'];
    try {
        const body = await request.json();
        if (body.divisions && Array.isArray(body.divisions) && body.divisions.length > 0) {
            divisions = body.divisions;
        }
    } catch (e) { }

    // Start background scraping
    updateStatus({ isRunning: true, progress: "Starting scrape...", stopRequested: false });
    scrapeBackground(divisions).catch(err => {
        console.error("Scraping error:", err);
        updateStatus({ isRunning: false, progress: "Error: " + err.message });
    });

    return NextResponse.json({ success: true, message: "Started" });
}

export async function DELETE(request: Request) {
    globalAny.scraperStatus.stopRequested = true;
    globalAny.scraperStatus.isRunning = false; // Force unlock UI
    globalAny.scraperStatus.progress = "Arrêté par l'utilisateur.";
    return NextResponse.json({ success: true });
}

async function scrapeBackground(divisions: string[]) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });

    let matches: any[] = [];
    if (fs.existsSync(MATCHES_FILE)) {
        try { matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf-8')); } catch (e) { }
    }

    let clubsCache: any = {};
    if (fs.existsSync(CLUBS_FILE)) {
        try { clubsCache = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8')); } catch (e) { }
    }

    const page = await context.newPage();

    const checkStop = () => {
        return globalAny.scraperStatus.stopRequested === true;
    };

    for (const div of divisions) {
        if (checkStop()) break;
        updateStatus({ isRunning: true, progress: `Processing ${div}...` });

        // Navigation forces state reset so "PRO A" is guaranteed the first element
        await page.goto('https://tenup.fft.fr/championnat/82543588', { waitUntil: 'networkidle', timeout: 60000 });

        try {
            console.log(`[SCRAPER] Accepting cookies...`);
            const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
            await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
            await cookieBtn.click();
            console.log(`[SCRAPER] Cookies accepted.`);
        } catch (e) {
            console.log(`[SCRAPER] No cookie banner found, moving on.`);
        }

        try {
            console.log(`[SCRAPER] Opening Division dropdown (PRO A)...`);
            await page.locator('text=PRO A').first().click();
            await page.waitForTimeout(500);

            console.log(`[SCRAPER] Selecting division: ${div}...`);
            // Click the target division
            await page.locator(`text=${div}`).first().click();
            // Wait for Poules and matches to refresh
            await page.waitForTimeout(4000);
        } catch (e) {
            console.error(`[SCRAPER] Could not select division ${div}:`, e);
            continue;
        }

        // Find existing Poules by looking at DOM text
        if (checkStop()) break;
        const currentElements = await page.$$eval('div, span, button', els => els.map(e => e.textContent?.trim()));
        let currentPoule = currentElements.find(t => t && t.match(/^POULE [A-Z]$/));

        if (!currentPoule) continue; // no poules?

        // Open Poules dropdown to read all options
        await page.locator(`text=${currentPoule}`).first().click();
        await page.waitForTimeout(500);

        const pouleList = await page.$$eval('li, div', els => els.map(e => e.textContent?.trim()).filter(t => t && t.match(/^POULE [A-Z]$/)));
        const uniquePoules = [...new Set(pouleList)];
        console.log(`Found poules for ${div}:`, uniquePoules);

        // Click same poule to close the dropdown
        await page.locator(`text=${currentPoule}`).first().click();
        await page.waitForTimeout(200);

        for (const poule of uniquePoules) {
            if (checkStop()) break;
            updateStatus({ isRunning: true, progress: `Processing ${div} - ${poule}...` });

            if (poule !== currentPoule) {
                try {
                    await page.locator(`text=${currentPoule}`).first().click();
                    await page.waitForTimeout(1000);
                    await page.locator(`text=${poule}`).first().click();
                    await page.waitForTimeout(4000);
                    currentPoule = poule;
                } catch (e) { }
            }

            // After poule changes, find current journee
            const jElements = await page.$$eval('button, div, span', els => els.map(e => e.textContent?.trim()));
            let currentJournee = jElements.find(t => t && t.match(/^Journée \d$/)) || "Journée 1";

            // Loop journées
            for (let j = 1; j <= 5; j++) {
                if (checkStop()) break;
                const journeeText = `Journée ${j}`;
                updateStatus({ isRunning: true, progress: `Processing ${div} - ${poule} - ${journeeText}...` });

                // Remove existing matches for this exact combination to allow override
                matches = matches.filter(m => !(m.division === div && m.poule === poule && m.journee === journeeText));
                fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));

                if (journeeText !== currentJournee) {
                    try {
                        await page.locator(`text=${currentJournee}`).first().click();
                        await page.waitForTimeout(1000);
                        await page.locator(`text=${journeeText}`).first().click();
                        await page.waitForTimeout(4000);
                        currentJournee = journeeText;
                    } catch (e) { }
                }

                // Render matches
                await page.waitForTimeout(1000);

                // Extract match links
                console.log(`[SCRAPER] Extracting match cards for ${div} > ${poule} > ${journeeText}...`);
                // Wait for the calendar to settle
                await page.waitForTimeout(1500);

                // Matches are anchors inside some container, so let's find the anchor, then backtrack to its containing text
                const cards = await page.$$eval('a[href*="/rencontre/"]', links => links.map(anchor => {
                    // Try to find a reasonable parent container. E.g. 5 levels up.
                    let parent = anchor.parentElement;
                    let level = 0;
                    while (parent && level < 4) {
                        parent = parent.parentElement;
                        level++;
                    }
                    const text = parent ? parent.textContent || '' : anchor.textContent || '';
                    const matchLink = anchor.getAttribute('href') || '';

                    // The matchLink might be relative, make it absolute if necessary
                    const absoluteMatchLink = matchLink.startsWith('/') ? `https://tenup.fft.fr${matchLink}` : matchLink;

                    return { text, matchLink: absoluteMatchLink };
                }));
                console.log(`[SCRAPER] Found ${cards.length} match records on page.`);

                for (const card of cards) {
                    if (checkStop()) break;
                    if (card.matchLink) {
                        const p2 = await context.newPage();
                        try {
                            await p2.goto(card.matchLink, { waitUntil: 'domcontentloaded', timeout: 15000 });

                            let isIdF = false;

                            try {
                                // Wait specifically for the match header card to be visible in the DOM
                                const headerLocator = p2.locator('.bg-white', { hasText: 'Interclubs Seniors Messieurs 2026' }).first();
                                await headerLocator.waitFor({ state: 'visible', timeout: 6000 });

                                const matchHeaderText = await headerLocator.textContent() || '';

                                // E.g.:
                                // <div class="grid min-w-0 gap-2"><div class="flex flex-col truncate ..."><div class="my-auto flex flex-col text-center">
                                // <div class="flex ..."><a ...>TC LE TOUQUET 1</a></div><p class="truncate max-lg:text-sm"> (HAUTS DE FRANCE) </p>
                                // We take the FIRST `<p>` block inside the grid, as that corresponds to the Receiving Team (Team 1).
                                const leagueLocator = headerLocator.locator('p.truncate').first();
                                await leagueLocator.waitFor({ state: 'attached', timeout: 2000 });

                                const leagueText = await leagueLocator.textContent() || '';
                                const leagueClean = leagueText.toUpperCase();

                                isIdF = leagueClean.includes('ILE DE FRANCE') || leagueClean.includes('PARIS');
                            } catch (timeoutErr) {
                                // If the page failed to render the match content properly, we cannot safely assume it's IdF
                                console.log(`[SCRAPER] Timeout waiting for match header on ${card.matchLink}`);
                            }

                            if (isIdF) {
                                console.log(`[SCRAPER] MATCH IS IDF: ${card.matchLink}`);
                                updateStatus({ isRunning: true, progress: `Found IdF match in ${div} ${poule} ${journeeText}` });
                            } else {
                                console.log(`[SCRAPER] Match skipped (Not IdF or Away Match).`);
                            }

                            const titles = await p2.$$eval('h1, h2, h3', els => els.map(e => e.textContent?.trim()));

                            let location = null;
                            if (titles && titles.length > 0) {
                                const matchTitle = titles[0] || '';
                                const matchArr = matchTitle.match(/^Rencontre (.*?) \//);
                                if (matchArr) {
                                    const homeClubName = matchArr[1].replace(/\s+\d+$/, '').trim();

                                    if (clubsCache[homeClubName]) {
                                        if (clubsCache[homeClubName].lat) {
                                            location = clubsCache[homeClubName];
                                        }
                                    } else {
                                        try {
                                            const res = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(homeClubName) + '&limit=5');
                                            const data = await res.json();
                                            let loc: any = { error: "Not found" };
                                            if (data.features && data.features.length > 0) {
                                                const validFeature = data.features.find((f: any) => {
                                                    const pc = f.properties.postcode;
                                                    if (!pc) return false;
                                                    return !pc.startsWith('97') && !pc.startsWith('98');
                                                });

                                                if (validFeature) {
                                                    loc = {
                                                        lat: validFeature.geometry.coordinates[1],
                                                        lng: validFeature.geometry.coordinates[0],
                                                        city: validFeature.properties.city,
                                                        postcode: validFeature.properties.postcode
                                                    };
                                                    location = loc;
                                                }
                                            }
                                            clubsCache[homeClubName] = loc;
                                            fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubsCache, null, 2));

                                            // Sleep quickly to respect API rate limits
                                            await new Promise(r => setTimeout(r, 200));
                                        } catch (err) {
                                            console.error("Geocoding error", err);
                                        }
                                    }
                                }
                            }

                            matches.push({
                                division: div,
                                poule: poule,
                                journee: journeeText,
                                matchUrl: card.matchLink,
                                rawText: card.text,
                                titles: titles,
                                isIdF: isIdF,
                                location: location
                            });
                            // Incrementally save
                            fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
                        } catch (e) {
                            console.error(`[SCRAPER] Failed to check match: ${card.matchLink}`, e);
                        } finally {
                            await p2.close();
                        }
                    }
                }
            }
        }
    }

    if (checkStop()) {
        updateStatus({ isRunning: false, progress: "Extraction suspendue par l'utilisateur. (" + matches.length + " matches totaux)" });
    } else {
        updateStatus({ isRunning: false, progress: "Completed (" + matches.length + " matches totaux)" });
    }

    fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
    await browser.close();
}
