const { google } = require('googleapis');
require('dotenv').config();

const youtube = google.youtube({ version: 'v3', auth: process.env.YTB_API_KEY });

// --- Utils
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Anti-bruit / hors-sujet
const NEG = /\b(asmr|karaoke|lyrics|clip|music|musique|vlog|challenge|minecraft|fortnite|shorts|blender|after effects|photoshop|mockup|iphone|smartphone|android|galaxy|arduino|pc|computer)\b/;

// Verbes d’action utiles
const ACTION_VERBS = /\b(r[ée]parer|d[ée]pann(?:er|age)|remplacer|changer|coller|recoller|diagnostiquer|tutoriel|how to|troubleshooting)\b/i;

// Construit 2–3 requêtes FR déterministes à partir du diagnostic
function buildQueries({ device, problem_summary, diagnosis }) {
  const cls = (device?.class || '').replace(/_/g, ' ').trim();
  const problem = (problem_summary || diagnosis || '').toLowerCase();

  if (!cls) return []; // éviter le fallback "objet"

  const base = cls;
  const probShort = problem.length > 70 ? problem.slice(0, 70) : problem;

  const q1 = `${base} ${probShort} réparer`;
  const q2 = `${base} ${probShort} tutoriel`;
  const q3 = `${base} réparer`;

  const set = new Set([q1, q2, q3].map(norm).filter(Boolean));
  return Array.from(set);
}

async function searchOnce(q, maxResults = 15) {
  const s = await youtube.search.list({
    part: 'snippet',
    q,
    maxResults,
    type: 'video',
    videoEmbeddable: 'true',
    relevanceLanguage: 'fr',
    regionCode: 'FR',
    safeSearch: 'moderate'
  });
  return (s.data.items || []).map(i => i.id?.videoId).filter(Boolean);
}
function pickThumb(snippet, id) {
  // ordre de préférence
  return (
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.default?.url ||
    // Fallback YouTube garanti (existe quasi toujours)
    (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null)
  );
}

async function fetchMeta(ids) {
  if (!ids.length) return [];
  const v = await youtube.videos.list({
    part: 'snippet,status',
    id: ids.join(',')
  });
  return (v.data.items || []).map(x => ({
    id: x.id,
    title: x.snippet?.title || '',
    desc: x.snippet?.description || '',
    thumbnail: pickThumb(x.snippet, x.id), 
    embeddable: x.status?.embeddable === true,
    public: x.status?.privacyStatus === 'public'
  }));
}

// Filtre strict : titre doit contenir l'objet ET (titre ou desc) un verbe d’action
function keepStrict(video, objectWord) {
  const hay = norm(`${video.title} ${video.desc}`);
  if (!video.public || !video.embeddable) return false;
  if (NEG.test(hay)) return false;

  const obj = new RegExp(`\\b(${objectWord})\\b`, 'i');    // ex: chauffe[- ]?eau
  if (!obj.test(video.title)) return false;                // objet dans le TITRE

  if (!ACTION_VERBS.test(video.title) && !ACTION_VERBS.test(video.desc)) return false;

  return true;
}

// Filtre relax : objet dans titre ou description, anti-bruit OK
function keepRelax(video, objectWord) {
  const hay = norm(`${video.title} ${video.desc}`);
  if (!video.public || !video.embeddable) return false;
  if (NEG.test(hay)) return false;

  const obj = new RegExp(`\\b(${objectWord})\\b`, 'i');
  return obj.test(video.title) || obj.test(video.desc);
}

exports.searchRepairVideos = async (ctxOrString) => {
  try {
    // 1) Extraire la classe d'objet en FR (obligatoire)
    let deviceClass = '';
    let problem = '';
    let diagnosis = '';

    if (typeof ctxOrString === 'string') {
      deviceClass = ctxOrString.replace(/_/g, ' ').trim();
    } else {
      deviceClass = (ctxOrString?.device?.class || '').replace(/_/g, ' ').trim();
      problem = ctxOrString?.problem_summary || '';
      diagnosis = ctxOrString?.diagnosis || '';
    }

    if (!deviceClass || deviceClass.length < 3) {
      return [];
    }

    // 2) Construire les requêtes
    const queries = buildQueries({
      device: { class: deviceClass },
      problem_summary: problem,
      diagnosis
    });
    if (!queries.length) return [];

    // 3) Chercher des candidats (jusqu'à 30)
    let ids = [];
    for (const q of queries) {
      const found = await searchOnce(q, 15);
      ids = ids.concat(found);
      if (ids.length >= 30) break;
    }
    ids = Array.from(new Set(ids));
    if (!ids.length) return [];

    const metas = await fetchMeta(ids);

    // 4) Filtrage strict
    const objectWord = deviceClass.replace(/\s+/g, '[- ]?');
    let chosen = metas.filter(v => keepStrict(v, objectWord)).slice(0, 3);

    // 5) Relax si nécessaire
    if (!chosen.length) chosen = metas.filter(v => keepRelax(v, objectWord)).slice(0, 3);

    // 6) Fallback public/embeddable si toujours rien
    if (!chosen.length) chosen = metas.filter(v => v.public && v.embeddable).slice(0, 3);
    return chosen.map(v => ({
    id: v.id,
    title: v.title,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` // ← double filet de sécurité
  }));

  } catch (e) {
    console.error('Erreur YouTube:', e.message);
    return [];
  }
};
