// const { google } = require('googleapis');
// require('dotenv').config();

// const youtube = google.youtube({
//   version: 'v3',
//   auth: process.env.YTB_API_KEY,
// });

// exports.searchRepairVideos = async (query) => {
//   try {
//     const res = await youtube.search.list({
//       part: 'snippet',
//       q: `comment réparer ${query}`,
//       maxResults: 3,
//       type: 'video',
//       videoEmbeddable: 'true',
//     });

//     return res.data.items.map(video => ({
//       title: video.snippet.title,
//       url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
//       thumbnail: video.snippet.thumbnails.medium.url,
//     }));
//   } catch (err) {
//     console.error("Erreur YouTube API:", err.message);
//     return [];
//   }
// };



const { google } = require('googleapis');
require('dotenv').config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YTB_API_KEY,
});

// Normalisation robuste
const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const NEGATIVE_TERMS = [
  'recette','cuisine','cooking','recipe','kitchen',
  'music','musique','clip','lyrics','karaoke',
  'asmr','vlog','challenge','minecraft','fortnite','gameplay',
  'funny','prank'
];

const POSITIVE_VERBS = [
  'reparer','reparation','depannage','changer','remplacer','tutoriel',
  'astuce','maintenance','fix','repair','troubleshooting','how to'
];

function scoreVideo(item, wantedTokens) {
  const title = normalize(item.snippet.title);
  const desc = normalize(item.snippet.description || '');
  const hay = `${title} ${desc}`;

  // blacklist hors-sujet
  if (NEGATIVE_TERMS.some(bad => hay.includes(bad))) return -999;

  // verbes utiles
  let score = 0;
  for (const v of POSITIVE_VERBS) if (hay.includes(v)) score += 2;

  // match tokens (objet, panne, synonymes, pièces, marques)
  for (const t of wantedTokens) {
    if (!t) continue;
    const token = normalize(t);
    if (token && hay.includes(token)) score += 3;
  }

  // bonus si l'objet est dans le titre
  const obj = wantedTokens[0] || '';
  if (obj && title.includes(normalize(obj))) score += 4;

  // pénalité légère clickbait
  if (/(?:!{2,}|\?{2,}|\bincroyable\b|\bamazing\b|\bimpossible\b)/i.test(title)) score -= 1;


  return score;
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const id = it.id?.videoId || it.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

/**
 * Recherche intelligente :
 * - si string → ancien comportement (compat)
 * - si ctx rich JSON → multi-requêtes + score/filtre
 */
exports.searchRepairVideos = async (ctxOrString) => {
  try {
    if (typeof ctxOrString === 'string') {
      return await legacySearch(ctxOrString);
    }

    const ctx = ctxOrString || {};
    const obj = ctx.object || '';
    const syns = Array.from(new Set([...(ctx.synonyms || [])]));
    const issue = ctx.issue || '';
    const parts = ctx.parts || [];
    const brands = ctx.brands || [];
    const actions = (ctx.actions && ctx.actions.length) ? ctx.actions : POSITIVE_VERBS;

    // variantes de requêtes
    const queries = [];
    const baseTerms = [obj, ...brands].filter(Boolean).join(' ');
    if (baseTerms) {
      if (issue) queries.push(`${baseTerms} ${issue} ${actions[0] || 'réparer'}`);
      queries.push(`${baseTerms} ${actions.join(' ')}`);
      if (parts.length) queries.push(`${baseTerms} ${parts.slice(0,2).join(' ')} ${actions[0] || 'réparer'}`);
    }
    for (const s of syns.slice(0,4)) {
      if (issue) queries.push(`${s} ${issue} ${actions[0] || 'réparer'}`);
      queries.push(`${s} ${actions.join(' ')}`);
    }
    if (queries.length === 0) queries.push(`réparer ${obj || 'objet'} ${issue || ''}`);

    // recherche & agrégation
    let results = [];
    for (const q of queries.slice(0, 8)) {
      const res = await youtube.search.list({
        part: 'snippet',
        q,
        maxResults: 12,
        type: 'video',
        videoEmbeddable: 'true',
        relevanceLanguage: 'fr',
        regionCode: 'FR',
        safeSearch: 'none',
        // videoDuration: 'medium', // optionnel : 4–20 min
      });
      results = results.concat(res.data.items || []);
    }

    results = dedupe(results);

    const wantedTokens = [
      obj, issue,
      ...syns.slice(0, 6),
      ...parts.slice(0, 4),
      ...brands.slice(0, 3),
    ].filter(Boolean);

    const scored = results
      .map(it => ({ it, score: scoreVideo(it, wantedTokens) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored.slice(0, 3).map(({ it }) => ({
      title: it.snippet.title,
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
      thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url
    }));

  } catch (err) {
    console.error("Erreur YouTube API:", err.message);
    return [];
  }
};

// Compat : ancien comportement simple
async function legacySearch(query) {
  try {
    const res = await youtube.search.list({
      part: 'snippet',
      q: `comment réparer ${query}`,
      maxResults: 3,
      type: 'video',
      videoEmbeddable: 'true',
      relevanceLanguage: 'fr',
      regionCode: 'FR',
    });

    return res.data.items.map(video => ({
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
    }));
  } catch (err) {
    console.error("Erreur YouTube API:", err.message);
    return [];
  }
}
