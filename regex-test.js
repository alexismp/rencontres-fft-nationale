const matchHeaderText = "TC LE TOUQUET 1 (HAUTS DE FRANCE) 0T.C. PLAISIR 1 (ILE DE FRANCE) 0Championnats de France Interclubs Seniors Messieurs 2026  Voir le championnat";

const leagueMatch = matchHeaderText.match(/\((.*?)\)/);
if (leagueMatch) {
    const firstLeague = leagueMatch[1].toUpperCase();
    console.log("First League: ", firstLeague);
    const isIdF = firstLeague.includes('ILE DE FRANCE') || firstLeague.includes('PARIS');
    console.log("Is IDF? ", isIdF);
} else {
    console.log("No league match.");
}
