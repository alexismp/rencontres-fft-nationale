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

const leaguesMapping = {
  "AUVERGNE RHONE-ALPES": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "BOURGOGNE FRANCHE COMTE": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "BRETAGNE": ["22", "29", "35", "56"],
  "CENTRE VAL DE LOIRE": ["18", "28", "36", "37", "41", "45"],
  "CORSE": ["20"],
  "GRAND EST": ["08", "10", "51", "52", "54", "55", "57", "67", "68"],
  "HAUTS DE FRANCE": ["02", "59", "60", "62", "80"],
  "ILE DE FRANCE": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "NORMANDIE": ["14", "27", "50", "61", "76"],
  "NOUVELLE AQUITAINE": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  "OCCITANIE": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "81", "82"],
  "PAYS DE LA LOIRE": ["44", "49", "53", "72", "85"],
  "PROVENCE ALPES COTE D'AZUR": ["04", "05", "06", "13", "83", "84"]
};

function getLeagueByPostcode(postcode: string) {
  if (!postcode) return null;
  const dep = postcode.substring(0, 2);
  for (const [league, deps] of Object.entries(leaguesMapping)) {
    if (deps.includes(dep)) {
      return league;
    }
  }
  return null;
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
    let championshipsToScrape: any[] = [];
    try {
        const body = await request.json();
        if (body.championships && Array.isArray(body.championships) && body.championships.length > 0) {
            championshipsToScrape = body.championships;
        }
    } catch (e) { }

    // Start background scraping
    updateStatus({ isRunning: true, progress: "Starting scrape...", stopRequested: false });
    scrapeBackground(championshipsToScrape).catch(err => {
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

async function scrapeBackground(championships: any[]) {
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

    for (const group of championships) {
        if (checkStop()) break;
        if (!group.divisions || group.divisions.length === 0) continue;

        updateStatus({ isRunning: true, progress: `Navigating to ${group.title || 'championship'}...` });
        await page.goto(group.url, { waitUntil: 'networkidle', timeout: 60000 });

        try {
            console.log(`[SCRAPER] Accepting cookies...`);
            const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
            await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
            await cookieBtn.click();
            console.log(`[SCRAPER] Cookies accepted.`);
        } catch (e) {
            console.log(`[SCRAPER] No cookie banner found, moving on.`);
        }

        for (const div of group.divisions) {
            if (checkStop()) break;
            updateStatus({ isRunning: true, progress: `Processing ${div} (${group.gender || '?'})...` });

            try {
                console.log(`[SCRAPER] Opening Division dropdown...`);
                // Find the active division button
                const candidateDivButtons = await page.$$('button');
                let clickedDiv = false;
                for (const btn of candidateDivButtons) {
                    const text = await btn.textContent() || '';
                    const cleanText = text.trim().toUpperCase();
                    if (cleanText.match(/PRO [A-Z]|NATIONALE \d|DIVISION|EXCELLENCE|HONNEUR|LIGUE|CHAMPIONNAT/)) {
                        await btn.click();
                        clickedDiv = true;
                        break;
                    }
                }

                if (clickedDiv) {
                    await page.waitForTimeout(500);
                    console.log(`[SCRAPER] Selecting division: ${div}...`);
                    await page.locator(`text=${div}`).first().click();
                    await page.waitForTimeout(4000);
                } else {
                    console.log(`[SCRAPER] Could not find division dropdown button.`);
                }
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
                    matches = matches.filter(m => !(m.championshipId === group.id && m.division === div && m.poule === poule && m.journee === journeeText));
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
                                let league = '';

                                try {
                                    // Wait for a card containing team links (which always exist on match scorecards)
                                    const headerLocator = p2.locator('.bg-white', { has: p2.locator('a[href*="/equipe/"]') }).first();
                                    await headerLocator.waitFor({ state: 'visible', timeout: 6000 });

                                    const headerHtml = await headerLocator.innerHTML();
                                    
                                    // Match `(HAUTS DE FRANCE)` style for old nationales
                                    const matchFirstTeam = headerHtml.match(/<div class="grid min-w-0 gap-2">[\s\S]*?<p class="truncate[^>]*>\s*\((.*?)\)\s*<\/p>/);
                                    
                                    if (matchFirstTeam) {
                                        league = matchFirstTeam[1].trim().toUpperCase();
                                        isIdF = league.includes('ILE DE FRANCE') || league.includes('PARIS');
                                    } else {
                                        // Attempt to read the alt text at the bottom for regional championships
                                        const altMatch = headerHtml.match(/<p class="mt-4 flex text-sm[^>]*>([\s\S]*?)<a/);
                                        if (altMatch) {
                                            const rawDesc = altMatch[1].trim().toUpperCase();
                                            // E.g 'PRÉNATIONALE ILE DE FRANCE DAMES'
                                            if (rawDesc.includes('ILE DE FRANCE')) league = 'ILE DE FRANCE';
                                            else league = rawDesc; // Just store it, though it might be messy
                                            isIdF = league.includes('ILE DE FRANCE') || league.includes('PARIS');
                                        }
                                    }
                                } catch (timeoutErr) {
                                    console.log(`[SCRAPER] Timeout waiting for match header scorecard on ${card.matchLink}`);
                                }

                                if (league) {
                                    console.log(`[SCRAPER] LEAGUE DETECTED: ${league} for ${card.matchLink}`);
                                    updateStatus({ isRunning: true, progress: `Found match in ${div} ${poule} ${journeeText}` });
                                } else {
                                    console.log(`[SCRAPER] Match league could not be determined.`);
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
                                                const manualAliases: Record<string, string> = {
                                                    "A.S MANTAISE": "MANTES LA JOLIE",
                                                    "AAJ BLOIS TENNIS CLUB": "BLOIS",
                                                    "ARCHAMPS BOSSEY TC": "ARCHAMPS",
                                                    "CHERBOURG AS-BR TENNIS": "CHERBOURG",
                                                    "CLUB TENNIS BEAUCOURTOIS": "90500 BEAUCOURT",
                                                    "COLOMBES (TC)": "COLOMBES",
                                                    "COSD-TCB": "SAINT DIZIER",
                                                    "LUZIEN TC": "SAINT JEAN DE LUZ",
                                                    "NEMOURS ST PIERRE US TENNIS": "SAINT PIERRE LES NEMOURS",
                                                    "T.C QUEIREL ST-LOUP": "MARSEILLE",
                                                    "T.C. BAILLY NOISY LE ROI": "BAILLY",
                                                    "TC PADEL REICHSTETT": "REICHSTETT",
                                                    "TENNIS CLUB PARISIEN DE JOINVILLE": "JOINVILLE LE PONT",
                                                    "TENNIS CLUB SEBASTIENNAIS": "SAINT SEBASTIEN SUR LOIRE",
                                                    "TM OLLIOULAIS": "OLLIOULES",
                                                    "V.G.A. SAINT MAUR": "SAINT MAUR DES FOSSES"
                                                };

                                                let searchCity = manualAliases[homeClubName];
                                                if (!searchCity) {
                                                    searchCity = homeClubName.toUpperCase()
                                                        .replace(/\b(T\.C\.|TC|US|A\.S\.|AS|TENNIS CLUB|TENNIS|CLUB|ASSOCIATION|SPORTS|SPORT|COUNTRY|METROPOLE)\b/g, '')
                                                        .replace(/\([^)]*\)/g, '')
                                                        .replace(/-/g, ' ')
                                                        .replace(/\s+/g, ' ')
                                                        .trim();
                                                }

                                                // Fallback to original if completely empty
                                                if (!searchCity) searchCity = homeClubName;

                                                const res = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(searchCity) + '&limit=5');
                                                const data = await res.json();
                                                let loc: any = { error: "Not found" };
                                                if (data.features && data.features.length > 0) {
                                                    const validFeature = data.features.find((f: any) => {
                                                        const pc = f.properties.postcode;
                                                        if (!pc) return false;
                                                        if (f.properties.score && f.properties.score < 0.5) return false;
                                                        return !pc.startsWith('97') && !pc.startsWith('98');
                                                    });

                                                    if (validFeature) {
                                                        loc = {
                                                            lat: validFeature.geometry.coordinates[1],
                                                            lng: validFeature.geometry.coordinates[0],
                                                            city: validFeature.properties.city,
                                                            postcode: validFeature.properties.postcode,
                                                            league: getLeagueByPostcode(validFeature.properties.postcode)
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

                                if (!league && location && location.league) {
                                    league = location.league;
                                    isIdF = league === 'ILE DE FRANCE';
                                }

                                matches.push({
                                    championshipId: group.id,
                                    gender: group.gender || '?',
                                    division: div,
                                    poule: poule,
                                    journee: journeeText,
                                    matchUrl: card.matchLink,
                                    rawText: card.text,
                                    titles: titles,
                                    isIdF: isIdF,
                                    league: league,
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
    }
    if (checkStop()) {
        updateStatus({ isRunning: false, progress: "Extraction suspendue par l'utilisateur. (" + matches.length + " matches totaux)" });
    } else {
        updateStatus({ isRunning: false, progress: "Completed (" + matches.length + " matches totaux)" });
    }

    fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
    await browser.close();
}
