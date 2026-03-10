const fs = require('fs');

const CLUBS_FILE = 'public/clubs.json';
const MATCHES_FILE = 'public/matches.json';

const clubs = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf8'));
let matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));

const fixes = [
    { name: "ARGENTEUIL TENNIS CLUB", query: "rue René Leduc 95100 ARGENTEUIL", expectedLeague: "ILE DE FRANCE" }
];

(async () => {
    let updatedClubs = 0;
    for (const fix of fixes) {
        try {
            console.log(`Geocoding: ${fix.query}`);
            const res = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(fix.query) + '&limit=1');
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const feat = data.features[0];
                clubs[fix.name] = {
                    lat: feat.geometry.coordinates[1],
                    lng: feat.geometry.coordinates[0],
                    city: feat.properties.city,
                    postcode: feat.properties.postcode,
                    league: fix.expectedLeague
                };
                console.log(`Updated ${fix.name} -> ${feat.properties.city} (${feat.properties.postcode})`);
                updatedClubs++;
            } else {
                console.log(`FAILED to geocode: ${fix.query}`);
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (updatedClubs > 0) {
        fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubs, null, 2));

        // Cascade to matches
        let matchRepaired = 0;
        for (let m of matches) {
            if (m.titles && m.titles.length > 0) {
                const matchTitle = m.titles[0] || '';
                const matchArr = matchTitle.match(/^Rencontre (.*?) \//);
                if (matchArr) {
                    const homeClubNameWithNum = matchArr[1].trim();
                    const homeClubName = homeClubNameWithNum.replace(/\s+\d+$/, '').trim();
                    
                    const fixNames = fixes.map(f => f.name);
                    if (fixNames.includes(homeClubName) || fixNames.includes(homeClubNameWithNum)) {
                        const targetClubName = fixNames.includes(homeClubName) ? homeClubName : homeClubNameWithNum;
                        m.location = clubs[targetClubName];
                        matchRepaired++;
                    }
                }
            }
        }
        
        fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
        console.log(`Cascaded update to ${matchRepaired} matches.`);
    }
})();
