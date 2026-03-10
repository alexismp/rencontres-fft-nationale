const fs = require('fs');
let matches = JSON.parse(fs.readFileSync('public/matches.json', 'utf8'));
let count = 0;
for (let m of matches) {
    if (m.location === null) count++;
}
console.log(`There are ${count} matches with location: null`);
