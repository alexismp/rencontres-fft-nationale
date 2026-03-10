const fs = require('fs');
let matches = JSON.parse(fs.readFileSync('public/matches.json', 'utf8'));

let nullMatches = [];
for (let m of matches) {
    if (m.location === null || !m.location || !m.location.city) {
        nullMatches.push(m);
    }
}
console.log(`Found ${nullMatches.length} matches with missing location.`, nullMatches.map(m => m.titles?.[0] || 'NO TITLE'));
