const fs = require('fs');
if (fs.existsSync('public/matches.json')) {
    const data = JSON.parse(fs.readFileSync('public/matches.json', 'utf8'));
    let modified = false;
    data.forEach(m => {
        if (!m.gender) {
            m.gender = 'M';
            modified = true;
        }
    });
    if (modified) {
        fs.writeFileSync('public/matches.json', JSON.stringify(data, null, 2));
        console.log('Patched matches.json');
    } else {
        console.log('No matches needed patching.');
    }
} else {
    console.log('matches.json not found.');
}
