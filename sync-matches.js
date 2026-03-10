const fs = require('fs');

const CLUBS_FILE = 'public/clubs.json';
const MATCHES_FILE = 'public/matches.json';

const clubs = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf8'));
let matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));

let matchRepaired = 0;

for (let m of matches) {
    if (m.titles && m.titles.length > 0) {
        const matchTitle = m.titles[0] || '';
        const matchArr = matchTitle.match(/^Rencontre (.*?) \//);
        if (matchArr) {
            const homeClubName = matchArr[1].replace(/\s+\d+$/, '').trim();
            if (clubs[homeClubName] && clubs[homeClubName].city) {
                // Check if match location needs repair
                if (!m.location || !m.location.city || m.location.error) {
                    m.location = clubs[homeClubName];
                    matchRepaired++;
                }
            }
        }
    }
}

fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
console.log(`Repaired ${matchRepaired} matches with missing cities.`);
