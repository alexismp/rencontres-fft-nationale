const fs = require('fs');

const CLUBS_FILE = 'public/clubs.json';
const clubs = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf8'));

const getLeagueByPostcode = (pc) => {
    if (!pc) return '';
    const d = pc.substring(0, 2);
    const mapping = {
        "01": "AUVERGNE RHONE-ALPES", "02": "HAUTS DE FRANCE", "03": "AUVERGNE RHONE-ALPES", "04": "PROVENCE ALPES COTE D'AZUR", "05": "PROVENCE ALPES COTE D'AZUR", "06": "PROVENCE ALPES COTE D'AZUR",
        "07": "AUVERGNE RHONE-ALPES", "08": "GRAND EST", "09": "OCCITANIE", "10": "GRAND EST", "11": "OCCITANIE", "12": "OCCITANIE", "13": "PROVENCE ALPES COTE D'AZUR",
        "14": "NORMANDIE", "15": "AUVERGNE RHONE-ALPES", "16": "NOUVELLE AQUITAINE", "17": "NOUVELLE AQUITAINE", "18": "CENTRE VAL DE LOIRE", "19": "NOUVELLE AQUITAINE",
        "2A": "CORSE", "2B": "CORSE", "21": "BOURGOGNE FRANCHE COMTE", "22": "BRETAGNE", "23": "NOUVELLE AQUITAINE", "24": "NOUVELLE AQUITAINE", "25": "BOURGOGNE FRANCHE COMTE",
        "26": "AUVERGNE RHONE-ALPES", "27": "NORMANDIE", "28": "CENTRE VAL DE LOIRE", "29": "BRETAGNE", "30": "OCCITANIE", "31": "OCCITANIE", "32": "OCCITANIE",
        "33": "NOUVELLE AQUITAINE", "34": "OCCITANIE", "35": "BRETAGNE", "36": "CENTRE VAL DE LOIRE", "37": "CENTRE VAL DE LOIRE", "38": "AUVERGNE RHONE-ALPES",
        "39": "BOURGOGNE FRANCHE COMTE", "40": "NOUVELLE AQUITAINE", "41": "CENTRE VAL DE LOIRE", "42": "AUVERGNE RHONE-ALPES", "43": "AUVERGNE RHONE-ALPES",
        "44": "PAYS DE LA LOIRE", "45": "CENTRE VAL DE LOIRE", "46": "OCCITANIE", "47": "NOUVELLE AQUITAINE", "48": "OCCITANIE", "49": "PAYS DE LA LOIRE",
        "50": "NORMANDIE", "51": "GRAND EST", "52": "GRAND EST", "53": "PAYS DE LA LOIRE", "54": "GRAND EST", "55": "GRAND EST", "56": "BRETAGNE",
        "57": "GRAND EST", "58": "BOURGOGNE FRANCHE COMTE", "59": "HAUTS DE FRANCE", "60": "HAUTS DE FRANCE", "61": "NORMANDIE", "62": "HAUTS DE FRANCE",
        "63": "AUVERGNE RHONE-ALPES", "64": "NOUVELLE AQUITAINE", "65": "OCCITANIE", "66": "OCCITANIE", "67": "GRAND EST", "68": "GRAND EST", "69": "AUVERGNE RHONE-ALPES",
        "70": "BOURGOGNE FRANCHE COMTE", "71": "BOURGOGNE FRANCHE COMTE", "72": "PAYS DE LA LOIRE", "73": "AUVERGNE RHONE-ALPES", "74": "AUVERGNE RHONE-ALPES",
        "75": "ILE DE FRANCE", "76": "NORMANDIE", "77": "ILE DE FRANCE", "78": "ILE DE FRANCE", "79": "NOUVELLE AQUITAINE", "80": "HAUTS DE FRANCE",
        "81": "OCCITANIE", "82": "OCCITANIE", "83": "PROVENCE ALPES COTE D'AZUR", "84": "PROVENCE ALPES COTE D'AZUR", "85": "PAYS DE LA LOIRE", "86": "NOUVELLE AQUITAINE",
        "87": "NOUVELLE AQUITAINE", "88": "GRAND EST", "89": "BOURGOGNE FRANCHE COMTE", "90": "BOURGOGNE FRANCHE COMTE", "91": "ILE DE FRANCE", "92": "ILE DE FRANCE",
        "93": "ILE DE FRANCE", "94": "ILE DE FRANCE", "95": "ILE DE FRANCE"
    };
    return mapping[d] || '';
};

// Hand-curated aliases for difficult clubs
const manualAliases = {
    "T.C. DE GORRON": "GORRON",
    "A.S MANTAISE": "MANTES LA JOLIE",
    "CHERBOURG AS-BR TENNIS": "CHERBOURG",
    "TM OLLIOULAIS": "OLLIOULES",
    "T.C QUEIREL ST-LOUP": "MARSEILLE", 
    "BEAUNE T.C.": "BEAUNE",
    "BETTON AT": "BETTON",
    "T.C. ORSAY": "ORSAY",
    "THYEZ T.C.": "THYEZ",
    "TC LILLOIS LILLE METROPOLE": "LILLE",
    "LUZIEN TC": "SAINT JEAN DE LUZ",
    "COSD-TCB": "SAINT DIZIER",
    "CHEMINOT VAUGIRARD T.C": "PARIS",
    "T.C. PALAISEAU": "PALAISEAU",
    "T.C. ST LOUIS DE POISSY": "POISSY",
    "T.C. LONGJUMEAU": "LONGJUMEAU",
    "V.G.A. SAINT MAUR": "SAINT MAUR DES FOSSES",
    "T.C. CROISSY SUR SEINE": "CROISSY SUR SEINE",
    "T.C. JOSASSIEN": "JOUY EN JOSAS",
    "T.C. VILLEBON": "VILLEBON SUR YVETTE"
};

(async () => {
    let repairedCount = 0;
    
    for (const [name, loc] of Object.entries(clubs)) {
        if (!loc.city || loc.error) {
            let searchCity = manualAliases[name];
            if (!searchCity) {
                // Heuristic filtering
                searchCity = name.toUpperCase()
                    .replace(/\b(T\.C\.|TC|US|A\.S\.|AS|TENNIS CLUB|TENNIS|CLUB|ASSOCIATION|SPORTS|SPORT|COUNTRY|METROPOLE)\b/g, '')
                    .replace(/\([^)]*\)/g, '')
                    .replace(/-/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            
            if (!searchCity) continue;
            
            try {
                const res = await fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(searchCity) + '&limit=5');
                const data = await res.json();
                
                let validFeature = null;
                if (data.features && data.features.length > 0) {
                    validFeature = data.features.find((f) => {
                        const pc = f.properties.postcode;
                        if (!pc) return false;
                        return !pc.startsWith('97') && !pc.startsWith('98');
                    });
                }
                
                if (validFeature) {
                    clubs[name] = {
                        lat: validFeature.geometry.coordinates[1],
                        lng: validFeature.geometry.coordinates[0],
                        city: validFeature.properties.city,
                        postcode: validFeature.properties.postcode,
                        league: getLeagueByPostcode(validFeature.properties.postcode)
                    };
                    console.log(` > REPAIRED: ${name} -> ${clubs[name].city}`);
                    repairedCount++;
                }
            } catch (err) { }
            await new Promise(r => setTimeout(r, 200));
        }
    }
    
    fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubs, null, 2));
    console.log(`Total repaired: ${repairedCount}`);
})();
