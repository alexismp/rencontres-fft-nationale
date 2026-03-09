const fs = require('fs');

const manualFixes = {
    "MEUDON TENNIS (AS)": {
        "lat": 48.8123,
        "lng": 2.2354,
        "city": "Meudon",
        "postcode": "92190"
    },
    "VILLEPINTE TENNIS": {
        "lat": 48.9565,
        "lng": 2.5323,
        "city": "Villepinte",
        "postcode": "93420"
    },
    "STADE FRANCAIS": {
        "lat": 48.8286,
        "lng": 2.1645, // Garches/Saint-Cloud limit
        "city": "La Faisanderie",
        "postcode": "92430"
    },
    "AZUR TENNIS CLUB D'ASNIERES": {
        "lat": 48.9103,
        "lng": 2.2872,
        "city": "Asnières-sur-Seine",
        "postcode": "92600"
    },
    "TC TREMBLAYSIEN": {
        "lat": 48.9515,
        "lng": 2.5701,
        "city": "Tremblay-en-France",
        "postcode": "93290"
    },
    "TC PERREUX": {
        "lat": 48.8465,
        "lng": 2.4984,
        "city": "Le Perreux-sur-Marne",
        "postcode": "94170"
    },
    "C.S. MARNE": {
        "lat": 48.8351,
        "lng": 2.4842,
        "city": "Nogent-sur-Marne",
        "postcode": "94130"
    }
};

const MATCHES_FILE = './public/matches.json';
const CLUBS_FILE = './public/clubs.json';

const clubsCache = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8'));
let modifiedMatches = false;

for (const [club, data] of Object.entries(manualFixes)) {
    clubsCache[club] = data;
    console.log(`Patched ${club}`);
}

fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubsCache, null, 2));

const matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf-8'));
for (let match of matches) {
    if (match.titles && match.titles.length > 0) {
        const title = match.titles[0];
        const regex = /^Rencontre (.*?) \//;
        const res = title.match(regex);
        if (res) {
            const hn = res[1].replace(/\s+\d+$/, '').trim();
            if (manualFixes[hn]) {
                match.location = manualFixes[hn];
                modifiedMatches = true;
            }
        }
    }
}

if (modifiedMatches) {
    fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
    console.log("Patched matches.json successfully");
}
