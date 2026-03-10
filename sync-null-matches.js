const fs = require('fs');

const CLUBS_FILE = 'public/clubs.json';
const MATCHES_FILE = 'public/matches.json';

const clubs = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf8'));
let matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));

let matchRepaired = 0;
let stillNull = 0;

for (let m of matches) {
    if (m.location === null || !m.location || !m.location.city) {
        if (m.titles && m.titles.length > 0) {
            const matchTitle = m.titles[0] || '';
            const matchArr = matchTitle.match(/^Rencontre (.*?) \//);
            if (matchArr) {
                const homeClubNameWithNum = matchArr[1].trim();
                const homeClubName = homeClubNameWithNum.replace(/\s+\d+$/, '').trim();
                
                // Try Exact Match without num
                if (clubs[homeClubName] && clubs[homeClubName].city) {
                    m.location = clubs[homeClubName];
                    matchRepaired++;
                } 
                // Try Exact Match with num just in case
                else if (clubs[homeClubNameWithNum] && clubs[homeClubNameWithNum].city) {
                    m.location = clubs[homeClubNameWithNum];
                    matchRepaired++;
                }
                else {
                    console.log(`Could not find club in clubs.json for match: ${matchTitle} (tried: "${homeClubName}")`);
                    stillNull++;
                }
            } else {
                console.log(`Could not parse match title: ${matchTitle}`);
                stillNull++;
            }
        } else {
             stillNull++;
        }
    }
}

fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
console.log(`Repaired ${matchRepaired} matches with null/missing locations.`);
console.log(`Still ${stillNull} matches with null/missing locations.`);
