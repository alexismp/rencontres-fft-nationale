import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import crypto from 'crypto';

const CHAMPIONSHIPS_FILE = path.join(process.cwd(), 'public', 'championships.json');
const MATCHES_FILE = path.join(process.cwd(), 'public', 'matches.json');

// Ensure championships.json exists
function getChampionships() {
    if (!fs.existsSync(CHAMPIONSHIPS_FILE)) {
        fs.writeFileSync(CHAMPIONSHIPS_FILE, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(CHAMPIONSHIPS_FILE, 'utf-8'));
}

export async function GET() {
    try {
        const championships = getChampionships();
        return NextResponse.json(championships);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!url || !url.includes('tenup.fft.fr/championnat/')) {
            return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
        }

        const championships = getChampionships();
        if (championships.find((c: any) => c.url === url)) {
            return NextResponse.json({ error: "Ce championnat existe déjà." }, { status: 400 });
        }

        // Use Playwright to scrape title and divisions
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Extract Title
        let title = await page.title();
        title = title.replace(/\s*\|\s*Ten'Up/gi, '').replace(/\s*\|\s*TenUp/gi, '').trim();
        
        try {
            // First try h1
            const h1Title = await page.locator('h1').first().textContent({ timeout: 2000 });
            if (h1Title) title = h1Title.trim();
        } catch (e) {
            try {
                // Fallback to h2 if no h1 is present (common in newer TenUp pages)
                const h2Title = await page.locator('h2').first().textContent({ timeout: 2000 });
                if (h2Title) title = h2Title.trim();
            } catch (e2) {
                console.log("Could not find h1 or h2 title, falling back to cleaned page title.");
            }
        }

        // Determine gender from title basic heuristics, default to '?'
        let gender = '?';
        const titleUpper = title.toUpperCase();
        if (titleUpper.includes('MESSIEURS') || titleUpper.includes('HOMMES')) gender = 'M';
        if (titleUpper.includes('DAMES') || titleUpper.includes('FEMMES')) gender = 'F';

        let divisions: string[] = [];

        try {
            // First, attempt to clear any privacy cookie banner that might intercept clicks
            try {
                const cookieBtn = page.getByRole('button', { name: /TOUT ACCEPTER/i });
                await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
                await cookieBtn.click();
            } catch (e) {
                console.log("No cookie banner found or needed, proceeding.");
            }

            // Getting all buttons that might be the active division
            const candidateButtons = await page.$$('button');
            let clicked = false;
            
            // Try to find the division dropdown. It's often the second or third button, or has text like "PRO A", "EXCELLENCE", etc.
            // Let's click the first button that seems to be a valid division to open the list.
            for (const btn of candidateButtons) {
                const text = await btn.textContent() || '';
                const cleanText = text.trim().toUpperCase();
                // Match more potential division names
                if (cleanText.match(/PRO [A-Z]|NATIONALE \d|DIVISION|EXCELLENCE|HONNEUR|LIGUE|CHAMPIONNAT/)) {
                    await btn.click();
                    clicked = true;
                    break;
                }
            }

            // If we couldn't guess the button, just throw an error or handle empty divisions
            if (clicked) {
                await page.waitForTimeout(1000); // let dropdown open
                
                // Now extract all list items from the opened dropdown
                // They are usually elements with role="option" or "menuitem"
                const options = await page.$$eval('[role="option"], [role="menuitem"], [role="menu"] li', els => els.map(e => e.textContent?.trim() || '').filter(t => t.length > 0));
                
                // Filter out empty and obvious non-division texts
                divisions = [...new Set(options.filter(o => o.toUpperCase() !== 'TOUT ACCEPTER' && o.length < 50))];
            } else {
                 console.log("Could not reliable find the division dropdown button.");
            }

        } catch (e) {
            console.error("Failed to extract divisions:", e);
        }

        await browser.close();

        if (divisions.length === 0) {
             return NextResponse.json({ error: "Impossible de lire les divisions depuis cette URL. Vérifiez que la page est accessible et contient un menu de divisions valide." }, { status: 400 });
        }

        const newChamp = {
            id: crypto.randomUUID(),
            url,
            title,
            gender,
            divisions
        };

        championships.push(newChamp);
        fs.writeFileSync(CHAMPIONSHIPS_FILE, JSON.stringify(championships, null, 2));

        return NextResponse.json({ success: true, championship: newChamp });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const championships = getChampionships();
        
        const champToDelete = championships.find((c: any) => c.id === id);
        if (!champToDelete) {
             return NextResponse.json({ error: "Championnat introuvable." }, { status: 404 });
        }

        const updatedChamps = championships.filter((c: any) => c.id !== id);
        fs.writeFileSync(CHAMPIONSHIPS_FILE, JSON.stringify(updatedChamps, null, 2));

        // Purge matches
        if (fs.existsSync(MATCHES_FILE)) {
            const matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf-8'));
            // Since matches previously didn't have championshipId, 
            // the most reliable way to purge is to filter out those matching this URL
            // Or if they were scraped under the old system, they might just match the gender/division.
            // To be safe, we'll try to delete matches strictly matching the URL if it was passed, 
            // but for older ones we might need a broader purge or just let exact duplicates override.
            
            // We'll delete matches by matchUrl prefixing the championship URL? No, matchUrl is the specific match.
            // Wait, we need to ensure backwards compatibility. If the match has `championshipId`, we use it.
            // If not, we might have to rely on `championshipId` being added to new scrapes.
            
            // Let's delete all matches that explicitly declare this championshipId
            let updatedMatches = matches.filter((m: any) => m.championshipId !== id);
            
            // Also, if the match doesn't have a championshipId but its `gender` matches 
            // and it was one of the two standard ones, we could purge them, but it's safer
            // to just let them exist or get overridden.
            // Actually, the new scraper will assign `championshipId` to everyone.
            
            fs.writeFileSync(MATCHES_FILE, JSON.stringify(updatedMatches, null, 2));
        }

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
