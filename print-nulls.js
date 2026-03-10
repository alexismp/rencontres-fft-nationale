const fs = require('fs');
let matches = JSON.parse(fs.readFileSync('public/matches.json', 'utf8'));

for (let m of matches) {
    if (m.location === null || !m.location || !m.location.city) {
        console.log("Missing match:", JSON.stringify(m, null, 2));
    }
}
