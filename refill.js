const fs = require('fs');

const MATCHES_FILE = './public/matches.json';
const CLUBS_FILE = './public/clubs.json';

(async () => {
    let matches = [];
    if (fs.existsSync(MATCHES_FILE)) {
        matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf-8'));
    }

    let clubsCache = {};
    if (fs.existsSync(CLUBS_FILE)) {
        clubsCache = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8'));
    }

    let modified = false;

    // First detect any clubs that need fixing
    let clubsToReset = [];
    for (const [name, data] of Object.entries(clubsCache)) {
        if (data && data.postcode && (data.postcode.startsWith('97') || data.postcode.startsWith('98'))) {
            clubsToReset.push(name);
        } else if (data && data.error) {
            clubsToReset.push(name);
        } else if (data && data.lat) {
            // Also checking if they are placed in weird locations like (lat > 52 or lat < 41)
            if (data.lat > 51.5 || data.lat < 41.0 || data.lng > 10.0 || data.lng < -5.5) {
                clubsToReset.push(name);
            }
        }
    }

    console.log("Clubs to reset:", clubsToReset);

    for (const name of clubsToReset) {
        delete clubsCache[name];
    }

    for (let match of matches) {
        if (match.titles && match.titles.length > 0) {
            const title = match.titles[0];
            const regex = /^Rencontre (.*?) \//;
            const res = title.match(regex);
            if (res) {
                const homeClubName = res[1].replace(/\s+\d+$/, '').trim();

                if (clubsCache[homeClubName]) {
                    if (clubsCache[homeClubName].lat) {
                        match.location = clubsCache[homeClubName];
                        modified = true;
                    }
                } else {
                    try {
                        console.log("Fetching location for", homeClubName);
                        const response = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(homeClubName) + '&limit=5');
                        const data = await response.json();

                        let loc = { error: "Not found" };
                        if (data.features && data.features.length > 0) {
                            // Find the first feature in Metropolitan France
                            const validFeature = data.features.find(f => {
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
                            }
                        }
                        clubsCache[homeClubName] = loc;
                        fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubsCache, null, 2));

                        if (loc.lat) {
                            match.location = loc;
                        }
                        modified = true;

                        await new Promise(r => setTimeout(r, 200));
                    } catch (e) {
                        console.error("Geocoding failed", e);
                    }
                }
            }
        }
    }

    if (modified) {
        fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
        console.log("Backfilled matches.json");
    } else {
        console.log("No backfill needed");
    }
})();
