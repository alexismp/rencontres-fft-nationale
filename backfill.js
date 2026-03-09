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

    for (let match of matches) {
        if (!match.location && match.titles && match.titles.length > 0) {
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
                        const response = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(homeClubName) + '&limit=1');
                        const data = await response.json();

                        let loc = { error: "Not found" };
                        if (data.features && data.features.length > 0) {
                            loc = {
                                lat: data.features[0].geometry.coordinates[1],
                                lng: data.features[0].geometry.coordinates[0],
                                city: data.features[0].properties.city,
                                postcode: data.features[0].properties.postcode
                            };
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
