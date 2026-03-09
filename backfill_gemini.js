const fs = require('fs');

const knowledgeBase = {
    "METZ ASPTT": "Metz",
    "TENNIS CLUB DE GEMENOS": "Gémenos",
    "TC DU LITTORAL TOULON": "Toulon",
    "COLOMIERS U.S TENNIS CLUB": "Colomiers",
    "MONT SAINT AIGNAN TENNIS CLUB": "Mont-Saint-Aignan",
    "ASLM TENNIS CANNES": "Cannes",
    "BOURG DE PEAGE TC": "Bourg-de-Péage",
    "O TENNIS CLUB": "Venelles", // O Tennis Club is in Venelles
    "MONTE CARLO COUNTRY CLUB": "Roquebrune-Cap-Martin",
    "BOULOGNE BILLANCOURT (TC)": "Boulogne-Billancourt",
    "RIORGEOIS (TENNIS CLUB DE)": "Riorges",
    "STRASBOURG ILL TC": "Strasbourg",
    "TC LE TOUQUET": "Le Touquet-Paris-Plage",
    "ANNECY TENNIS": "Annecy",
    "VILLA PRIMROSE": "Bordeaux",
    "MONTROUGE (SMTC)": "Montrouge",
    "TC ILLBERG MULHOUSE": "Mulhouse",
    "GIEN TENNIS CLUB": "Gien",
    "TENNIS PADEL CLUB LA FERTE SOUS JOUARRE": "La Ferté-sous-Jouarre",
    "BOULAZAC ISLE MANOIRE TC": "Boulazac",
    "NOGARO-LE HOUGA TENNIS CLUB": "Nogaro",
    "TC NICE GIORDAN": "Nice",
    "TENNIS CLUB DE TOURS": "Tours",
    "TC THIAIS BELLE EPINE": "Thiais",
    "TC LA GRANDE MOTTE": "La Grande-Motte",
    "VILLEPINTE TENNIS": "Villepinte",
    "BAGNEUX (COM)": "Bagneux",
    "LYON (TENNIS CLUB DE)": "Lyon",
    "AMICALE MANIN SPORT PARIS EST": "Paris",
    "AVIRON BAYONNAIS": "Bayonne",
    "TENNIS PARC ARLESIEN": "Arles",
    "MARGENCY (TC)": "Margency",
    "TENNIS CLUB DE PARIS": "Paris",
    "FORBACH US": "Forbach",
    "BRIVE CA": "Brive-la-Gaillarde",
    "TENNIS CLUB LA FOURRAGERE ASPTT": "Marseille",
    "TC TRITH-SAINT-LEGER": "Trith-Saint-Léger",
    "STADE FRANCAIS": "Paris",
    "ASPTT MONTPELLIER": "Montpellier",
    "LAGARDERE PARIS RACING": "Paris",
    "TC DE BANDOL": "Bandol",
    "DARDILLY CHAMPAGNE (TENNIS CLUB)": "Dardilly",
    "SR COLMAR": "Colmar",
    "EAUBONNE (CSM)": "Eaubonne",
    "LA TESTE TC": "La Teste-de-Buch",
    "TENNIS CLUB DU 16EME": "Paris",
    "BUSSY TC VAL DE BUSSY": "Bussy-Saint-Georges",
    "HAUTS DE NIMES TC": "Nîmes",
    "CATTENOM TC": "Cattenom",
    "YVETOT TC": "Yvetot",
    "TENNIS DE SUCY EN BRIE": "Sucy-en-Brie",
    "LOIX TENNIS COUARDAIS": "Loix",
    "COUPVRAY VAL D'EUROPE TENNIS CLUB": "Coupvray",
    "TENNIS C.B PLAN DE CUQUES": "Plan-de-Cuques",
    "ANNECY LE VIEUX TC": "Annecy-le-Vieux",
    "A.T. GRAND TOURS": "Tours",
    "MELUN TC VAL DE SEINE": "Melun",
    "T.C. LE CHESNAY TRIANON": "Le Chesnay",
    "PIERRELATTE TC": "Pierrelatte",
    "TENNIS CLUB DE VITROLLES": "Vitrolles",
    "TCM MOUANS SARTOUX": "Mouans-Sartoux",
    "ST JULIEN EN GENEVOIS TC": "Saint-Julien-en-Genevois",
    "CASTANET TOLOSAN TENNIS CLUB": "Castanet-Tolosan",
    "FRONSADAIS TCI": "Saint-Germain-de-la-Rivière",
    "ALLINGES TC": "Allinges",
    "ISSOIRE (US)": "Issoire",
    "SAINT PRIEST (TENNIS CLUB DE)": "Saint-Priest",
    "AMSLF TC GALLIENI": "Fréjus",
    "ISSY-LES-MOULINEAUX (TC)": "Issy-les-Moulineaux",
    "BLAGNAC TENNIS CLUB": "Blagnac",
    "GARCHES TENNIS CLUB": "Garches",
    "BOUSCAT US": "Le Bouscat",
    "US FONTENAY": "Fontenay-sous-Bois",
    "SNUC TENNIS": "Nantes",
    "FONTAINEBLEAU TCF": "Fontainebleau",
    "TC SOUFFELWEYERSHEIM": "Souffelweyersheim",
    "ASPTT  TROYES": "Troyes",
    "AAJ BLOIS TENNIS CLUB": "Blois",
    "AGEN ASPTT": "Agen",
    "TC SAINT ESTEVE": "Saint-Estève",
    "COUNTRY CLUB AIXOIS": "Aix-en-Provence",
    "MAISONS ALFORT TC": "Maisons-Alfort",
    "TENNIS CLUB JOCONDIEN": "Joué-lès-Tours",
    "QUIMPERLE TENNIS CLUB": "Quimperlé",
    "SAINT PAIR SUR MER": "Saint-Pair-sur-Mer",
    "STADE BORDELAIS": "Bordeaux",
    "HEM TC": "Hem",
    "PARIS JEAN BOUIN": "Paris",
    "SAINT GREGOIRE TC": "Saint-Grégoire",
    "BEAUCHAMP (AT)": "Beauchamp",
    "LANNION TENNIS": "Lannion",
    "AZUR TENNIS CLUB D'ASNIERES": "Asnières-sur-Seine",
    "ROUEN TENNIS CLUB": "Rouen",
    "TC BRUNSTATT": "Brunstatt",
    "THIONVILLE MOSELLE TC": "Thionville",
    "VALENCE TENNIS EPERVIERE": "Valence",
    "AS BAS RHONE LANGUEDOC-NIMES": "Nîmes",
    "SAINT RAPHAEL CC": "Saint-Raphaël",
    "CRAPONNE TENNIS (AS)": "Craponne",
    "ROMANS TC": "Romans-sur-Isère",
    "TC CALVI": "Calvi",
    "L'UNION TENNIS CLUB": "L'Union",
    "TC RONCHIN": "Ronchin",
    "TC BOULOGNE-SUR-MER": "Boulogne-sur-Mer",
    "MONDEVILLE USO": "Mondeville",
    "BRESSUIRE TC": "Bressuire",
    "LARMOR PLAGE TENNIS CLUB": "Larmor-Plage",
    "AS BONDY": "Bondy",
    "ANGERS TENNIS CLUB": "Angers",
    "TC OBERNAI": "Obernai",
    "SCEAUX (TC)": "Sceaux",
    "PAPE (TENNIS CLUB DE LA)": "Rillieux-la-Pape",
    "SAINT DIE TENNIS": "Saint-Dié-des-Vosges",
    "CHELLES TENNIS AS": "Chelles",
    "GUJAN MESTRAS TC": "Gujan-Mestras",
    "TC DE CARQUEFOU": "Carquefou",
    "ROCHEFORT SA": "Rochefort",
    "GRANDVILLARS TC": "Grandvillars",
    "LA RAQUETTE DE VILLENEUVE D'ASCQ": "Villeneuve-d'Ascq",
    "TC ILLKIRCH GRAFFENSTADEN": "Illkirch-Graffenstaden",
    "NANTERRE (ES)": "Nanterre",
    "SARREGUEMINES AS": "Sarreguemines",
    "FCL TENNIS (ASSOCIATION)": "Caluire-et-Cuire",
    "TC MONTPELLIER": "Montpellier",
    "LA RAVOIRE TC": "La Ravoire",
    "NICE LAWN TENNIS CLUB": "Nice",
    "DIVONNE LES BAINS (TC)": "Divonne-les-Bains",
    "TC MARSEILLAN": "Marseillan",
    "CAP TENNIS PADEL": "Périgueux",
    "COLOMBIER (TENNIS CLUB)": "Colombier-Saugnieu",
    "ARTIGUES TC": "Artigues-près-Bordeaux",
    "RAMONVILLE US TENNIS CLUB": "Ramonville-Saint-Agne",
    "SAINT ORENS TENNIS CLUB": "Saint-Orens-de-Gameville",
    "FIDESIEN (TENNIS CLUB)": "Sainte-Foy-lès-Lyon",
    "TC ANTIBES JUAN LES PINS": "Antibes",
    "CRAN TENNIS CLUB": "Cran-Gevrier",
    "TENNIS CLUB FONTENAY SUR EURE": "Fontenay-sur-Eure",
    "BOIS GUILLAUME USC TENNIS": "Bois-Guillaume",
    "TENNIS CLUB FOUGERAIS": "Fougères",
    "VILLENAVE TC": "Villenave-d'Ornon",
    "MARTRES TOLOSANE TENNIS CLUB": "Martres-Tolosane",
    "MONTFERRAND (AS)": "Clermont-Ferrand",
    "AS AVRILLE TENNIS": "Avrillé",
    "LAGORD TENNIS SQUASH": "Lagord",
    "AIX LES BAINS TC": "Aix-les-Bains",
    "TENNIS PADEL BOURGOIN-JALLIEU": "Bourgoin-Jallieu",
    "VIGNES TC": "Paris",
    "SAINT PIERRE D'IRUBE TC": "Saint-Pierre-d'Irube",
    "FOS TENNIS VILLENEUVE D'ASCQ": "Villeneuve-d'Ascq",
    "ANTONY (TC)": "Antony",
    "QUIMPER TENNIS CLUB": "Quimper",
    "AMIOT TENNIS CLUB COLOMBES": "Colombes",
    "TENNIS CLUB DE BONNEUIL": "Bonneuil-sur-Marne",
    "TC DE STRASBOURG": "Strasbourg",
    "BESANCON TENNIS CLUB": "Besançon",
    "SAINT AUBIN TC": "Saint-Aubin-lès-Elbeuf",
    "CA VINCENNES": "Vincennes",
    "CHATEAUROUX TENNIS CLUB": "Châteauroux",
    "TENNIS CLUB SAINT GERMAIN SUD": "Saint-Germain-en-Laye",
    "CLUB AMICAL DE TENNIS DE CREIL": "Creil",
    "TC PERREUX": "Le Perreux-sur-Marne",
    "TC SAUSHEIM": "Sausheim",
    "VILLERS LES NANCY VNTC": "Villers-lès-Nancy",
    "MEUDON TENNIS (AS)": "Meudon",
    "GRENOBLE TENNIS": "Grenoble",
    "T.C. ST GERMAIN LES CORBEIL": "Saint-Germain-lès-Corbeil",
    "CLUB TULIPE NOIRE HAZEBROUCK": "Hazebrouck",
    "SARCELLOIS TC - A.S.S": "Sarcelles",
    "C.S. MARNE": "Noisy-le-Grand",
    "A.S.M. BELFORT": "Belfort",
    "STADE TOULOUSAIN TENNIS PADEL": "Toulouse",
    "T.C. PLAISIR": "Plaisir",
    "ISTRES SPORTS TENNIS": "Istres",
    "GUEUGNON F.C.": "Gueugnon",
    "T.C. CHATOU": "Chatou",
    "US STE TULLE TENNIS": "Sainte-Tulle",
    "COURBEVOIE SPORT TENNIS": "Courbevoie",
    "JARNY US": "Jarny",
    "SAINT GERMAIN PUCH TC": "Saint-Germain-du-Puch",
    "TC TROYES": "Troyes",
    "CERCLE J.FERRY TENNIS": "Fleury-les-Aubrais",
    "RUEIL ATHLETIC CLUB": "Rueil-Malmaison",
    "TC DU PARC A OSTWALD": "Ostwald",
    "T.C CAVAILLON": "Cavaillon",
    "CLUB TENNIS CLERMONTOIS": "Clermont",
    "T.C. DES LOGES ST GERMAIN": "Saint-Germain-en-Laye",
    "STADE POITEVIN TENNIS": "Poitiers",
    "TENNIS PADEL CONCARNEAU": "Concarneau",
    "ARSENAL CHATILLON (TC)": "Châtillon",
    "DIJON A.S.P.T.T.": "Dijon",
    "US CAGNES TENNIS": "Cagnes-sur-Mer",
    "A.S. ROGNAC TENNIS": "Rognac",
    "FOOTBALL CLUB MULHOUSE": "Mulhouse",
    "TC TREMBLAYSIEN": "Tremblay-en-France",
    "TC TOULONNAIS": "Toulon",
    "U.S. PONTET TENNIS": "Le Pontet",
    "ERMONT A.C.T.": "Ermont",
    "CAEN TC": "Caen",
    "BLANC-MESNIL SPORT TENNIS": "Le Blanc-Mesnil",
    "TENNIS SQUASH BADMINTON VALENCIENNES": "Valenciennes",
    "DAX US": "Dax",
    "US SMASH CLUB ENTRAIGUES": "Entraigues-sur-la-Sorgue",
    "MONTROUGE (CA)": "Montrouge",
    "METZ ASC TENNIS": "Metz",
    "T.C. CHEVREUSE": "Chevreuse",
    "TC PIERRE ROUGE": "Montpellier",
    "STADE CLERMONTOIS TC": "Clermont-Ferrand",
    "CORMEILLAIS (ACS)": "Cormeilles-en-Parisis",
    "BASSE HAM TC": "Basse-Ham",
    "T.C. THANN": "Thann",
    "C.O. SAVIGNY TENNIS": "Savigny-sur-Orge",
    "TC COURNEUVIEN": "La Courneuve",
    "SEMEAC OLYMPIQUE TENNIS": "Séméac",
    "TC VILLEMOMBLE SPORTS": "Villemomble",
    "MONTFLEURY CANNES TENNIS CLUB": "Cannes",
    "TC COSTA VERDE": "San-Nicolao",
    "TC HYEROIS": "Hyères",
    "DIJON T.C.": "Dijon",
    "GRENOBLE UNIVERSITE CLUB": "Grenoble",
    "TENNIS ACADEMY DE LUMINY": "Marseille",
    "CERCLE SPORTIF MARSEILLE TENNIS": "Marseille",
    "AS PONTS DE CE": "Les Ponts-de-Cé",
    "STE GENEVIEVE S.T.C.": "Sainte-Geneviève-des-Bois",
    "BIARRITZ OLYMPIQUE": "Biarritz",
    "RODEZ TENNIS PADEL": "Rodez",
    "GARDEN TC ST JEAN DE MONTS": "Saint-Jean-de-Monts",
    "LA FRETTE TC": "La Frette-sur-Seine",
    "UNION SPORTIVE ORLEANAISE": "Orléans",
    "VAL VERT DU CLAIN TC": "Saint-Benoît",
    "A.S.M. CHAMBOURCY": "Chambourcy",
    "SENS T.C.": "Sens",
    "CHAMPS SUR MARNE TC": "Champs-sur-Marne",
    "VILLEMUR A.S TENNIS": "Villemur-sur-Tarn",
    "TENNIS PADEL CAPDENAC": "Capdenac-Gare",
    "TC DRACENOIS": "Draguignan",
    "T.C. CHATEAURENARDAIS": "Châteaurenard",
    "RULLY TENNIS CLUB": "Rully",
    "SC ARDRESIEN": "Ardres",
    "AT MOUVAUX": "Mouvaux",
    "GENNEVILLOIS (TC)": "Gennevilliers",
    "NEUILLY (AT)": "Neuilly-sur-Seine",
    "POINCONNET UNION SPORTIVE": "Le Poinçonnet",
    "OSM LOMMOIS": "Lomme",
    "SOR Rosny tennis (Rosny-sous-Bois)": "Rosny-sous-Bois",
    "U.S. VESINET": "Le Vésinet"
};

const MATCHES_FILE = './public/matches.json';
const CLUBS_FILE = './public/clubs.json';

(async () => {
    let clubsCache = {};
    if (fs.existsSync(CLUBS_FILE)) {
        clubsCache = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8'));
    }

    let modified = false;

    for (const [homeClubName, targetCity] of Object.entries(knowledgeBase)) {
        try {
            console.log(`Geocoding ${homeClubName} using city: ${targetCity}`);
            const query = encodeURIComponent(`${homeClubName} ${targetCity}`);
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=5`);
            const data = await response.json();

            let loc = { error: "Not found" };
            if (data.features && data.features.length > 0) {
                // Find a feature in metro France that matches the city roughly
                const validFeature = data.features.find(f => {
                    const pc = f.properties.postcode;
                    if (!pc || pc.startsWith('97') || pc.startsWith('98')) return false;
                    return true;
                }) || data.features[0]; // fallback to first if no strict metro found

                if (validFeature) {
                    loc = {
                        lat: validFeature.geometry.coordinates[1],
                        lng: validFeature.geometry.coordinates[0],
                        city: validFeature.properties.city,
                        postcode: validFeature.properties.postcode
                    };
                }
            }

            // Re-fetch with just the city to be safe if it fails finding the club
            if (loc.error) {
                const retryQuery = encodeURIComponent(targetCity);
                const retryResponse = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${retryQuery}&limit=1`);
                const retryData = await retryResponse.json();
                if (retryData.features && retryData.features.length > 0) {
                    const vf = retryData.features[0];
                    loc = {
                        lat: vf.geometry.coordinates[1],
                        lng: vf.geometry.coordinates[0],
                        city: vf.properties.city,
                        postcode: vf.properties.postcode
                    };
                }
            }

            clubsCache[homeClubName] = loc;
            modified = true;
            fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubsCache, null, 2));

            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error(`Geocoding failed for ${homeClubName}`, e);
        }
    }

    if (modified) {
        // sync matches
        let matches = [];
        if (fs.existsSync(MATCHES_FILE)) {
            matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf-8'));
        }
        for (let match of matches) {
            if (match.titles && match.titles.length > 0) {
                const title = match.titles[0];
                const regex = /^Rencontre (.*?) \//;
                const res = title.match(regex);
                if (res) {
                    const hn = res[1].replace(/\s+\d+$/, '').trim();
                    if (clubsCache[hn] && clubsCache[hn].lat) {
                        match.location = clubsCache[hn];
                    }
                }
            }
        }
        fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
        console.log("Refilled matches.json successfully");
    }
})();
