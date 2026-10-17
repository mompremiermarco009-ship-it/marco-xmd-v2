// backend/marco_lyrics/lib/lyrics.js — Recherche paroles multi-sources + cache
const axios = require('axios');
const yts = require('yt-search');

// ═══════════════════════════════════════════════════════════
//  CACHE MEMOIRE (TTL 7 jours)
// ═══════════════════════════════════════════════════════════
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const cache = new Map();

function cacheKey(title, artist) {
    return (String(title || '').toLowerCase().trim()) + '|' + (String(artist || '').toLowerCase().trim());
}
function cacheGet(title, artist) {
    const k = cacheKey(title, artist);
    const entry = cache.get(k);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        cache.delete(k);
        return null;
    }
    return entry.results;
}
function cacheSet(title, artist, results) {
    cache.set(cacheKey(title, artist), { ts: Date.now(), results });
    if (cache.size > 500) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) cache.delete(oldest[0]);
    }
}

// ═══════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════
function normalizeText(str) {
    return String(str || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/gi, '')
        .trim();
}
function normalize(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function generateVariants(query) {
    const variants = new Set();
    const q = query.trim();
    variants.add(q);
    variants.add(normalizeText(q));
    variants.add(q.replace(/\b(the|la|le|les|un|une|de|du|des)\b/gi, '').trim());
    variants.add(normalizeText(q.replace(/\b(the|la|le|les|un|une|de|du|des)\b/gi, '').trim()));
    return [...variants].filter(Boolean);
}

// ═══════════════════════════════════════════════════════════
//  SCORING DICE (bigram similarity)
// ═══════════════════════════════════════════════════════════
function bigrams(s) {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
}
function dice(a, b) {
    if (!a.length || !b.length) return 0;
    const A = bigrams(a), B = bigrams(b);
    let inter = 0;
    for (const g of A) if (B.has(g)) inter++;
    return (2 * inter) / (A.size + B.size);
}
function scoreResult(r, title, artist) {
    let s = 0;
    s += dice(normalize(r.title), normalize(title)) * 35;
    s += dice(normalize(r.artist), normalize(artist)) * 35;
    s += Math.min((r.lyrics || '').length / 1500, 1) * 15;
    if (r.synced) s += 5;
    if (!(r.lyrics || '').trim()) s -= 100;
    return Math.round(s * 100) / 100;
}
function dedup(results) {
    const seen = new Set();
    const out = [];
    for (const r of results) {
        const key = normalize(r.title) + '|' + normalize(r.artist) + '|' + (r.lyrics || '').slice(0, 120);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
    }
    return out;
}

// ═══════════════════════════════════════════════════════════
//  YOUTUBE SEARCH (garde pour titre/artiste/thumbnail)
// ═══════════════════════════════════════════════════════════
async function searchYouTube(query) {
    try {
        const { videos } = await yts(query);
        if (!videos || videos.length === 0) return null;

        const video = videos[0];
        const rawTitle = video.title || '';
        const author = video.author?.name || '';
        let artist = author;
        let title = rawTitle;

        const cleanSuffixes = [
            /\s*\(official\s*(music\s*)?video\)/gi,
            /\s*\(official\s*audio\)/gi,
            /\s*\(lyrics?\s*video\)/gi,
            /\s*\(audio\)/gi,
            /\s*\(video\s*clip\)/gi,
            /\s*\[official\s*video\]/gi,
            /\s*\[lyrics\]/gi,
            /\s*\(clip\s*officiel\)/gi,
            /\s*\(paroles\)/gi,
            /\s*ft\.\s*/gi,
            /\s*feat\.\s*/gi,
            /\s*hd\s*$/gi,
            /\s*4k\s*$/gi,
        ];
        for (const re of cleanSuffixes) title = title.replace(re, '');

        const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dashMatch && dashMatch[1].length < 60 && dashMatch[2].length < 80) {
            artist = dashMatch[1].trim();
            title = dashMatch[2].trim();
        }

        title = title.trim();
        artist = artist.trim();

        return {
            title, artist,
            originalTitle: rawTitle,
            thumbnail: video.thumbnail || '',
            duration: video.timestamp || '',
            views: video.views || 0,
            url: video.url || '',
            authorChannel: author
        };
    } catch (err) {
        console.error('YouTube search error:', err.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
//  PROVIDER : LRCLIB (avec match mots-cles)
// ═══════════════════════════════════════════════════════════
function allWordsMatch(haystack, needles, minWords = 2) {
    if (!haystack || !needles) return false;
    const words = needles.split(/\s+/).filter(w => w.length > 2);
    if (words.length < minWords) return false;
    const hits = words.filter(w => haystack.includes(w)).length;
    return hits / words.length >= 0.8;
}
function matchesTitleArtist(item, targetTitle, targetArtist) {
    if (!item) return false;
    const rawItemTitle = String(item.trackName || item.name || '');
    const rawItemArtist = String(item.artistName || '');
    const itemTitle = normalizeText(rawItemTitle);
    const itemArtist = normalizeText(rawItemArtist);
    const tTitle = normalizeText(targetTitle || '');
    const tArtist = normalizeText(targetArtist || '');

    if (!itemTitle || !tTitle) return false;

    const directMatch = itemTitle === tTitle || itemTitle.includes(tTitle) || tTitle.includes(itemTitle);
    const wordMatch = allWordsMatch(itemTitle, tTitle, 2);
    const reverseWordMatch = allWordsMatch(tTitle, itemTitle, 2);

    if (!directMatch && !wordMatch && !reverseWordMatch) return false;

    if (tArtist) {
        const artistWords = tArtist.split(/\s+/).filter(w => w.length > 2);
        const firstArtistWord = artistWords[0] || tArtist.split(' ')[0];
        const artistMatch = itemArtist === tArtist
                         || itemArtist.includes(tArtist)
                         || tArtist.includes(itemArtist)
                         || (firstArtistWord && itemArtist.includes(firstArtistWord));
        if (!artistMatch) {
            const strictTitle = itemTitle === tTitle || itemTitle.includes(tTitle) || tTitle.includes(itemTitle);
            if (!strictTitle) return false;
        }
    }
    return true;
}

function lrclibToResult(item, targetTitle, targetArtist) {
    return {
        provider: 'lrclib',
        title: item.trackName || targetTitle,
        artist: item.artistName || targetArtist,
        lyrics: (item.plainLyrics || item.syncedLyrics || '').trim(),
        url: item.id ? 'https://lrclib.net/track/' + item.id : null,
        synced: !!item.syncedLyrics,
        duration: item.duration || 0
    };
}

async function searchLrclib(title, artist) {
    const titleVariants = generateVariants(title);
    const artistVariants = artist ? [artist, normalizeText(artist)] : [''];
    const queries = [];
    for (const art of artistVariants) {
        for (const tit of titleVariants) {
            if (art && tit) queries.push('https://lrclib.net/api/search?q=' + encodeURIComponent(art + ' ' + tit));
            queries.push('https://lrclib.net/api/search?q=' + encodeURIComponent(tit));
        }
    }
    const uniqueQueries = [...new Set(queries)];
    const allResults = [];

    for (const url of uniqueQueries) {
        try {
            const res = await axios.get(url, { timeout: 12000 });
            if (!Array.isArray(res.data) || res.data.length === 0) continue;

            for (const item of res.data) {
                if (item.instrumental) continue;
                if (!item.plainLyrics && !item.syncedLyrics) continue;
                const matches = matchesTitleArtist(item, title, artist);
                const result = lrclibToResult(item, title, artist);
                // Bonus si match direct
                if (matches) result._matchBonus = 30;
                allResults.push(result);
            }
            if (allResults.length >= 10) break;
        } catch (err) {}
    }
    return allResults;
}

// ═══════════════════════════════════════════════════════════
//  PROVIDER : lyrics.ovh
// ═══════════════════════════════════════════════════════════
async function searchLyricsOvh(title, artist) {
    const titleVariants = generateVariants(title);
    const artistVariants = artist ? [artist, normalizeText(artist)] : [''];
    const results = [];

    for (const art of artistVariants) {
        for (const tit of titleVariants) {
            if (!art) continue;
            const url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(art) + '/' + encodeURIComponent(tit);
            try {
                const res = await axios.get(url, { timeout: 12000 });
                if (res.data && res.data.lyrics && res.data.lyrics.trim().length > 20) {
                    results.push({
                        provider: 'lyrics.ovh',
                        title, artist,
                        lyrics: res.data.lyrics.trim(),
                        url,
                        synced: false,
                        duration: 0
                    });
                    break;
                }
            } catch (err) {}
        }
        if (results.length > 0) break;
    }
    return results;
}

// ═══════════════════════════════════════════════════════════
//  AGGREGATOR
// ═══════════════════════════════════════════════════════════
async function searchAll(title, artist) {
    const settled = await Promise.allSettled([
        searchLrclib(title, artist),
        searchLyricsOvh(title, artist)
    ]);
    const flat = [];
    for (const s of settled) {
        if (s.status === 'fulfilled' && Array.isArray(s.value)) flat.push(...s.value);
    }

    for (const r of flat) {
        r.score = scoreResult(r, title, artist) + (r._matchBonus || 0);
        delete r._matchBonus;
    }

    const unique = dedup(flat);
    unique.sort((a, b) => b.score - a.score);
    return unique;
}

async function searchWithFallback(title, artist) {
    const attempts = [
        [title, artist],
        [title, ''],
        [title.split(' ')[0] || title, artist],
    ];
    for (const [t, a] of attempts) {
        if (!t) continue;
        const results = await searchAll(t, a);
        if (results.length) return results;
    }
    return [];
}

// ═══════════════════════════════════════════════════════════
//  FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════
async function search(query, options = {}) {
    const { refresh = false } = options;
    if (!query || !query.trim()) throw new Error('Requête vide');

    console.log('Recherche: "' + query + '"' + (refresh ? ' (refresh)' : ''));

    // 1. YouTube pour titre/artiste/thumbnail reels
    const yt = await searchYouTube(query);
    let searchTitle = query;
    let searchArtist = '';
    let videoInfo = null;

    if (yt) {
        searchTitle = yt.title;
        searchArtist = yt.artist;
        videoInfo = {
            title: yt.title,
            artist: yt.artist,
            thumbnail: yt.thumbnail,
            duration: yt.duration,
            views: yt.views,
            url: yt.url
        };
        console.log('YouTube: "' + yt.title + '" par "' + yt.artist + '"');
    }

    // 2. Cache
    if (!refresh) {
        const cached = cacheGet(searchTitle, searchArtist);
        if (cached && cached.length > 0) {
            console.log('Cache hit: ' + cached.length + ' resultats');
            return {
                lyrics: cached[0].lyrics || null,
                source: cached[0].provider || null,
                videoInfo: videoInfo || { title: query, artist: '', thumbnail: '', duration: '', views: 0, url: '' },
                alternatives: cached.slice(1, 8),
                cached: true
            };
        }
    }

    // 3. Multi-provider
    const results = await searchWithFallback(searchTitle, searchArtist);
    if (results.length > 0) {
        cacheSet(searchTitle, searchArtist, results);
        console.log('Paroles trouvees (' + results.length + ' resultats, best: ' + results[0].provider + ')');
    } else {
        console.log('Paroles introuvables');
    }

    return {
        lyrics: results[0]?.lyrics || null,
        source: results[0]?.provider || null,
        videoInfo: videoInfo || {
            title: query, artist: '', thumbnail: '', duration: '', views: 0, url: ''
        },
        alternatives: results.slice(1, 8),
        cached: false
    };
}

async function searchYouTubeOnly(query) {
    return await searchYouTube(query);
}

module.exports = { search, searchYouTubeOnly };
