const fs = require('fs');
let matches = JSON.parse(fs.readFileSync('public/matches.json', 'utf8'));

const initialLength = matches.length;
matches = matches.filter(m => m.titles && m.titles.length > 0);

fs.writeFileSync('public/matches.json', JSON.stringify(matches, null, 2));
console.log(`Cleaned up ${initialLength - matches.length} corrupted matches with no titles.`);
