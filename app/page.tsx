"use client";
import { useState, useEffect } from 'react';

export default function Home() {
    const [status, setStatus] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [viewDivisionFilter, setViewDivisionFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedChampDivisions, setSelectedChampDivisions] = useState<Record<string, string[]>>({});
    const [newChampUrl, setNewChampUrl] = useState('');
    const [addingChamp, setAddingChamp] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedLeague, setSelectedLeague] = useState('');
    const [userAddress, setUserAddress] = useState('');
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [sortByDistance, setSortByDistance] = useState(false);
    const [locating, setLocating] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    const toggleDivisionList = (champId: string, div: string) => {
        const current = selectedChampDivisions[champId] || [];
        if (current.includes(div)) {
            setSelectedChampDivisions({ ...selectedChampDivisions, [champId]: current.filter(d => d !== div) });
        } else {
            setSelectedChampDivisions({ ...selectedChampDivisions, [champId]: [...current, div] });
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/scrape');
            const data = await res.json();
            setStatus(data);
        } catch (e) { }
    };

    const fetchMatches = async () => {
        try {
            const res = await fetch('/matches.json');
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
            }
        } catch (e) { }
    };

    const fetchChampionships = async () => {
        try {
            const res = await fetch('/api/championships');
            if (res.ok) {
                const data = await res.json();
                setChampionships(data);

                // Initialize selection if empty
                if (Object.keys(selectedChampDivisions).length === 0 && data.length > 0) {
                    const initialSelection: Record<string, string[]> = {};
                    data.forEach((c: any) => {
                        // By default, select all divisions
                        initialSelection[c.id] = c.divisions || [];
                    });
                    setSelectedChampDivisions(initialSelection);
                }
            }
        } catch (e) { }
    };

    useEffect(() => {
        fetchStatus();
        fetchMatches(); // Initial load
        fetchChampionships();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status?.isRunning) {
            interval = setInterval(() => {
                fetchStatus(); // Only poll status to update progress UI
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        }
    }, [status?.isRunning]);

    // Refresh matches when extraction finishes
    useEffect(() => {
        if (status?.isRunning === false) {
            fetchMatches();
        }
    }, [status?.isRunning]);

    const startScrape = async () => {
        setLoading(true);
        // Build the payload
        const payload = championships.map(c => ({
            id: c.id,
            url: c.url,
            gender: c.gender,
            title: c.title,
            divisions: selectedChampDivisions[c.id] || []
        })).filter(c => c.divisions.length > 0);

        try {
            await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ championships: payload })
            });
            fetchStatus();
        } catch (e) { }
        setLoading(false);
    };

    const addChampionship = async () => {
        if (!newChampUrl) return;
        setAddingChamp(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/championships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newChampUrl })
            });
            const data = await res.json();
            if (res.ok) {
                setNewChampUrl('');
                fetchChampionships();
            } else {
                setErrorMsg(data.error || 'Erreur lors de l\'ajout');
            }
        } catch (e: any) {
            setErrorMsg(e.message);
        }
        setAddingChamp(false);
    };

    const deleteChampionship = async (id: string, title: string) => {
        if (!window.confirm(`Voulez-vous vraiment supprimer le championnat "${title}" et tous ses matchs associés ?`)) {
            return;
        }
        try {
            const res = await fetch('/api/championships', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                fetchChampionships();
                fetchMatches(); // Refresh matches as some might be deleted
            }
        } catch (e) { }
    };

    const stopScrape = async () => {
        setLoading(true);
        await fetch('/api/scrape', { method: 'DELETE' });
        setTimeout(() => {
            fetchStatus();
            setLoading(false);
        }, 1000);
    };

    // Interdependent filter calculations
    const getMatchDate = (m: any) => {
        const dateMatch = (m.titles || []).join(' ').match(/du (\d{2}\/\d{2}\/\d{4})/);
        return dateMatch ? dateMatch[1] : '';
    };

    const availableDatesMatches = matches.filter(m => {
        if (selectedLeague && m.league !== selectedLeague) return false;
        if (viewDivisionFilter && m.division !== viewDivisionFilter) return false;
        if (genderFilter && m.gender !== genderFilter) return false;
        return true;
    });
    const uniqueDates = Array.from(new Set(availableDatesMatches.map(getMatchDate).filter(Boolean))).sort((a, b) => {
        const [d1, m1, y1] = a.split('/');
        const [d2, m2, y2] = b.split('/');
        return new Date(Number(y1), Number(m1) - 1, Number(d1)).getTime() - new Date(Number(y2), Number(m2) - 1, Number(d2)).getTime();
    });

    const availableLeaguesMatches = matches.filter(m => {
        if (viewDivisionFilter && m.division !== viewDivisionFilter) return false;
        if (genderFilter && m.gender !== genderFilter) return false;
        if (dateFilter && getMatchDate(m) !== dateFilter) return false;
        return true;
    });
    const uniqueLeagues = Array.from(new Set(availableLeaguesMatches.map(m => m.league).filter(Boolean))).sort();

    const availableDivsMatches = matches.filter(m => {
        if (selectedLeague && m.league !== selectedLeague) return false;
        if (genderFilter && m.gender !== genderFilter) return false;
        if (dateFilter && getMatchDate(m) !== dateFilter) return false;
        return true;
    });
    const uniqueDivs = Array.from(new Set(availableDivsMatches.map(m => m.division).filter(Boolean))).sort();

    const handleLocate = async () => {
        if (!userAddress.trim()) {
            setUserCoords(null);
            setSortByDistance(false);
            return;
        }
        setLocating(true);
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(userAddress)}&limit=5`);
            const data = await res.json();

            let validFeature = null;
            if (data.features && data.features.length > 0) {
                validFeature = data.features.find((f: any) => {
                    const pc = f.properties.postcode;
                    if (!pc) return false;
                    return !pc.startsWith('97') && !pc.startsWith('98');
                });
            }

            if (validFeature) {
                setUserCoords({
                    lat: validFeature.geometry.coordinates[1],
                    lng: validFeature.geometry.coordinates[0]
                });
                setSortByDistance(true);
            } else {
                alert("Adresse introuvable ou située hors France métropolitaine. Veuillez réessayer avec un code postal ou une ville valide.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la recherche de l'adresse");
        }
        setLocating(false);
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const filteredMatches = matches.filter(m => {
        if (selectedLeague && m.league !== selectedLeague) return false;
        if (viewDivisionFilter && m.division !== viewDivisionFilter) return false;
        if (genderFilter && m.gender !== genderFilter) return false;

        if (!dateFilter) return true;

        let date = '';
        const dateMatch = (m.titles || []).join(' ').match(/du (\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) date = dateMatch[1];

        return date === dateFilter;
    }).map(m => {
        let dist = -1;
        if (userCoords && m.location?.lat) {
            dist = calculateDistance(userCoords.lat, userCoords.lng, m.location.lat, m.location.lng);
        }
        return { ...m, computedDistance: dist };
    }).sort((a, b) => {
        if (sortByDistance && userCoords) {
            if (a.computedDistance === -1) return 1;
            if (b.computedDistance === -1) return -1;
            return a.computedDistance - b.computedDistance;
        }
        const dateA = (a.titles || []).join(' ').match(/du (\d{2}\/\d{2}\/\d{4})/);
        const dateB = (b.titles || []).join(' ').match(/du (\d{2}\/\d{2}\/\d{4})/);
        if (dateA && dateB) {
            const [d1, m1, y1] = dateA[1].split('/');
            const [d2, m2, y2] = dateB[1].split('/');
            return new Date(Number(y1), Number(m1) - 1, Number(d1)).getTime() - new Date(Number(y2), Number(m2) - 1, Number(d2)).getTime();
        }
        return 0;
    });

    return (
        <main className="min-h-screen bg-[#151534] text-white p-8 font-sans selection:bg-[#2330a4]/30">
            <div className="max-w-5xl mx-auto space-y-12">
                <header className="space-y-4">
                    <div className="inline-flex items-center space-x-2 bg-[#232346] border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-[#e1e1f5]/70">
                        <span className="relative flex h-2 w-2">
                            {status?.isRunning ? (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ebff00] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2330a4]"></span>
                                </>
                            ) : (
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-600"></span>
                            )}
                        </span>
                        <span>{status?.isRunning ? 'Scraping Active' : 'Idle'}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ebff00] to-white">
                        Championnats interclubs FFT
                    </h1>
                    <p className="text-lg text-[#e1e1f5]/70 max-w-2xl">
                        Découvrez toutes les rencontres des Championnats interclubs de la FFT dans une ligue, près de chez vous, ....
                    </p>
                </header>

                <section className="bg-[#232346]/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <button
                        onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <h2 className="text-2xl font-bold text-white">Analyse des rencontres depuis TenUp</h2>
                        <svg className={`w-6 h-6 text-white transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {isAnalysisOpen && (
                        <div className="space-y-6 pt-6 mt-6 border-t border-white/10">
                            <div className="flex flex-col md:flex-row gap-6 justify-between border-b border-white/10 pb-6">
                                <div className="space-y-6 w-full">
                                    {championships.map((champ: any) => (
                                        <div key={champ.id} className="space-y-3 bg-[#151534]/50 p-4 rounded-2xl border border-white/5 relative group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1 pr-12">
                                                    <h3 className="text-lg font-medium text-white break-words">{champ.title || 'Championnat inconnu'}</h3>
                                                    <a href={champ.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#e1e1f5]/50 hover:text-[#ebff00] underline truncate block max-w-xl">
                                                        {champ.url}
                                                    </a>
                                                    {champ.divisions && champ.divisions.length > 1 && (
                                                        <div className="flex gap-3 mt-2">
                                                            <button
                                                                onClick={() => setSelectedChampDivisions({ ...selectedChampDivisions, [champ.id]: champ.divisions })}
                                                                className="text-xs text-[#2330a4] hover:text-[#ebff00] transition-colors"
                                                            >
                                                                Tout cocher
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedChampDivisions({ ...selectedChampDivisions, [champ.id]: [] })}
                                                                className="text-xs text-[#2330a4] hover:text-[#ebff00] transition-colors"
                                                            >
                                                                Tout décocher
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteChampionship(champ.id, champ.title)}
                                                    className="absolute top-4 right-4 p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                                    title="Supprimer ce championnat"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {(champ.divisions || []).map((div: string) => {
                                                    const isSelected = (selectedChampDivisions[champ.id] || []).includes(div);
                                                    return (
                                                        <button
                                                            key={div}
                                                            onClick={() => toggleDivisionList(champ.id, div)}
                                                            disabled={status?.isRunning}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-[#2330a4] text-white shadow-[0_0_10px_rgba(35,48,164,0.5)]' : 'bg-white/5 text-[#e1e1f5]/70 hover:bg-white/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        >
                                                            {div}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="bg-[#151534]/30 p-4 rounded-2xl border border-dashed border-white/20">
                                        <h4 className="text-sm font-medium text-white mb-3">Ajouter un championnat</h4>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="url"
                                                placeholder="https://tenup.fft.fr/championnat/..."
                                                value={newChampUrl}
                                                onChange={e => setNewChampUrl(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addChampionship()}
                                                disabled={addingChamp || status?.isRunning}
                                                className="flex-grow bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#ebff00] focus:ring-1 focus:ring-[#ebff00] transition-all placeholder:text-[#e1e1f5]/30 text-sm disabled:opacity-50"
                                            />
                                            <button
                                                onClick={addChampionship}
                                                disabled={!newChampUrl || addingChamp || status?.isRunning}
                                                className="px-6 py-3 bg-[#ebff00]/10 text-[#ebff00] hover:bg-[#ebff00]/20 border border-[#ebff00]/30 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
                                            >
                                                {addingChamp ? (
                                                    <><div className="w-4 h-4 border-2 border-[#ebff00] border-t-transparent rounded-full animate-spin"></div> Analyse...</>
                                                ) : (
                                                    'Ajouter'
                                                )}
                                            </button>
                                        </div>
                                        {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 items-end justify-between">
                                <div className="space-y-2 flex-grow">
                                    <h2 className="text-xl font-semibold text-white">État de l'extraction</h2>
                                    <p className="text-[#ebff00] font-mono text-sm bg-[#151534] p-3 flex rounded-lg border border-white/10">
                                        {status?.progress || "En attente du lancement..."}
                                    </p>
                                </div>
                                <div className="flex gap-4 flex-shrink-0 flex-wrap justify-end">
                                    {status?.isRunning ? (
                                        <button
                                            onClick={stopScrape}
                                            disabled={loading}
                                            className="px-8 py-3 bg-red-500/20 text-red-500 border border-red-500/50 font-semibold rounded-xl hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.15)] flex-shrink-0"
                                        >
                                            Suspendre
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startScrape}
                                            disabled={loading}
                                            className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex-shrink-0"
                                        >
                                            Lancer l'analyse
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {matches.length > 0 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h2 className="text-2xl font-bold flex items-center space-x-3">
                            <span>Rencontres</span>
                            <span className="bg-[#2330a4]/20 text-[#ebff00] text-sm py-1 px-3 rounded-full border border-[#2330a4]/30">
                                {filteredMatches.length} trouvée{filteredMatches.length > 1 && 's'}
                            </span>
                        </h2>
                        <div className="flex flex-col lg:flex-row gap-4 w-full justify-between xl:items-center">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                    <div className="relative min-w-[200px] w-full sm:w-auto">
                                        <select
                                            value={selectedLeague}
                                            onChange={e => setSelectedLeague(e.target.value)}
                                            className="w-full bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#2330a4] focus:ring-1 focus:ring-[#2330a4] transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Toutes les ligues</option>
                                            {uniqueLeagues.map(l => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#e1e1f5]/70">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ville ou code (ex: 75001)"
                                        value={userAddress}
                                        onChange={e => setUserAddress(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleLocate()}
                                        className="w-full sm:w-auto bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#2330a4] focus:ring-1 focus:ring-[#2330a4] transition-all placeholder:text-[#e1e1f5]/50 text-sm"
                                    />
                                    <button
                                        onClick={handleLocate}
                                        disabled={locating}
                                        className={`px-4 py-3 font-medium rounded-xl transition-all border disabled:opacity-50 whitespace-nowrap flex-shrink-0 ${userCoords ? 'bg-[#2330a4] text-white shadow-[0_0_15px_rgba(35,48,164,0.5)] border-transparent' : 'bg-white/5 text-[#ebff00] hover:bg-white/10 border-white/20'}`}
                                        title={userCoords ? 'Trié par distance' : 'Géolocaliser'}
                                    >
                                        {locating ? '...' : '📍'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                <div className="relative min-w-[150px] w-full sm:max-w-xs">
                                    <select
                                        value={genderFilter}
                                        onChange={e => setGenderFilter(e.target.value)}
                                        className="w-full bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#2330a4] focus:ring-1 focus:ring-[#2330a4] transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Sexe</option>
                                        <option value="M">Messieurs (M)</option>
                                        <option value="F">Dames (F)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#e1e1f5]/70">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <div className="relative min-w-[200px] w-full lg:w-auto">
                                    <select
                                        value={viewDivisionFilter}
                                        onChange={e => setViewDivisionFilter(e.target.value)}
                                        className="w-full bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#2330a4] focus:ring-1 focus:ring-[#2330a4] transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Toutes les divisions</option>
                                        {uniqueDivs.map(div => (
                                            <option key={div} value={div}>{div}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#e1e1f5]/70">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <div className="relative min-w-[240px] w-full sm:max-w-xs">
                                    <select
                                        value={dateFilter}
                                        onChange={e => setDateFilter(e.target.value)}
                                        className="w-full bg-[#232346] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#2330a4] focus:ring-1 focus:ring-[#2330a4] transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Toutes les dates</option>
                                        {uniqueDates.map(date => {
                                            const [d, m, y] = date.split('/');
                                            const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                                            const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(dateObj);
                                            const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

                                            return <option key={date} value={date}>{`${capitalizedWeekday} ${date}`}</option>
                                        })}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#e1e1f5]/70">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMatches.map((match, idx) => (
                                <a
                                    key={idx}
                                    href={match.matchUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group relative bg-[#232346] border border-white/10 rounded-2xl p-6 hover:border-[#2330a4]/50 transition-all hover:shadow-[0_0_30px_rgba(235,255,0,0.15)] block overflow-hidden"
                                >
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#2330a4] to-[#ebff00] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-xs font-bold text-[#ebff00] uppercase tracking-wider">{match.division} - {match.poule} <span className="text-white/70 ml-1">({match.gender || 'M'})</span></span>
                                                <h3 className={`text-lg font-medium transition-colors uppercase ${!match.league ? 'text-[#e1e1f5]/70 group-hover:text-white' : 'text-white'}`}>
                                                    {match.journee}
                                                    {match.league && <span className="ml-3 text-[10px] bg-[#2330a4]/30 text-white px-2 py-1 rounded border border-[#2330a4]/50">{match.league}</span>}
                                                </h3>
                                                {match.computedDistance > -1 && (
                                                    <span className="text-sm font-semibold text-[#ffaf00] mt-2 block">
                                                        📍 À {Math.round(match.computedDistance)} km
                                                    </span>
                                                )}
                                                {match.computedDistance === -1 && userCoords && (
                                                    <span className="text-sm font-semibold text-[#e1e1f5]/50 mt-2 block italic">
                                                        Ville du club inconnue
                                                    </span>
                                                )}
                                            </div>
                                            <svg className="w-5 h-5 text-neutral-600 group-hover:text-[#ebff00] transition-colors transform group-hover:translate-x-1 group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </div>
                                        {match.titles && (
                                            <div className="bg-[#151534] rounded-xl p-3 border border-white/10">
                                                <ul className="text-sm text-[#e1e1f5]/70 space-y-1">
                                                    {match.titles.map((t: string, it: number) => (
                                                        <li key={it} className="line-clamp-2">{t}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </a>
                            ))}
                        </div>

                        {filteredMatches.length === 0 && (
                            <div className="text-center py-20 bg-[#232346]/50 rounded-3xl border border-white/10 border-dashed">
                                <p className="text-[#e1e1f5]/50 text-lg">Aucune rencontre ne correspond à votre filtre.</p>
                            </div>
                        )}
                    </section>
                )}

            </div>
        </main>
    );
}
