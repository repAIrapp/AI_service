
// const { google } = require('googleapis');
// require('dotenv').config();

// const youtube = google.youtube({
//   version: 'v3',
//   auth: process.env.YTB_API_KEY,
// });

// // Normalisation 
// const normalize = (s) =>
//   (s || '')
//     .toLowerCase()
//     .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
//     .replace(/[^a-z0-9\s-]/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();

// const NEGATIVE_TERMS = [
//   'recette','cuisine','cooking','recipe','kitchen',
//   'music','musique','clip','lyrics','karaoke',
//   'asmr','vlog','challenge','minecraft','fortnite','gameplay',
//   'funny','prank'
// ];

// const POSITIVE_VERBS = [
//   'reparer','reparation','depannage','changer','remplacer','tutoriel',
//   'astuce','maintenance','fix','repair','troubleshooting','how to'
// ];

// function scoreVideo(item, wantedTokens) {
//   const title = normalize(item.snippet.title);
//   const desc = normalize(item.snippet.description || '');
//   const hay = `${title} ${desc}`;

//   // blacklist hors-sujet
//   if (NEGATIVE_TERMS.some(bad => hay.includes(bad))) return -999;

//   // verbes utiles
//   let score = 0;
//   for (const v of POSITIVE_VERBS) if (hay.includes(v)) score += 2;

//   // match tokens (objet, panne, synonymes, pièces, marques)
//   for (const t of wantedTokens) {
//     if (!t) continue;
//     const token = normalize(t);
//     if (token && hay.includes(token)) score += 3;
//   }

//   // bonus si l'objet est dans le titre
//   const obj = wantedTokens[0] || '';
//   if (obj && title.includes(normalize(obj))) score += 4;

//   // pénalité légère clickbait
//   if (/(?:!{2,}|\?{2,}|\bincroyable\b|\bamazing\b|\bimpossible\b)/i.test(title)) score -= 1;


//   return score;
// }

// function dedupe(items) {
//   const seen = new Set();
//   const out = [];
//   for (const it of items) {
//     const id = it.id?.videoId || it.id;
//     if (!id || seen.has(id)) continue;
//     seen.add(id);
//     out.push(it);
//   }
//   return out;
// }

// /**
//  * Recherche intelligente :
//  * - si string → ancien comportement (compat)
//  * - si ctx rich JSON → multi-requêtes + score/filtre
//  */
// exports.searchRepairVideos = async (ctxOrString) => {
//   try {
//     if (typeof ctxOrString === 'string') {
//       return await legacySearch(ctxOrString);
//     }

//     const ctx = ctxOrString || {};
//     const obj = ctx.object || '';
//     const syns = Array.from(new Set([...(ctx.synonyms || [])]));
//     const issue = ctx.issue || '';
//     const parts = ctx.parts || [];
//     const brands = ctx.brands || [];
//     const actions = (ctx.actions && ctx.actions.length) ? ctx.actions : POSITIVE_VERBS;

//     // variantes de requêtes
//     const queries = [];
//     const baseTerms = [obj, ...brands].filter(Boolean).join(' ');
//     if (baseTerms) {
//       if (issue) queries.push(`${baseTerms} ${issue} ${actions[0] || 'réparer'}`);
//       queries.push(`${baseTerms} ${actions.join(' ')}`);
//       if (parts.length) queries.push(`${baseTerms} ${parts.slice(0,2).join(' ')} ${actions[0] || 'réparer'}`);
//     }
//     for (const s of syns.slice(0,4)) {
//       if (issue) queries.push(`${s} ${issue} ${actions[0] || 'réparer'}`);
//       queries.push(`${s} ${actions.join(' ')}`);
//     }
//     if (queries.length === 0) queries.push(`réparer ${obj || 'objet'} ${issue || ''}`);

//     // recherche & agrégation
//     let results = [];
//     for (const q of queries.slice(0, 8)) {
//       const res = await youtube.search.list({
//         part: 'snippet',
//         q,
//         maxResults: 12,
//         type: 'video',
//         videoEmbeddable: 'true',
//         relevanceLanguage: 'fr',
//         regionCode: 'FR',
//         safeSearch: 'none',
//       });
//       results = results.concat(res.data.items || []);
//     }

//     results = dedupe(results);

//     const wantedTokens = [
//       obj, issue,
//       ...syns.slice(0, 6),
//       ...parts.slice(0, 4),
//       ...brands.slice(0, 3),
//     ].filter(Boolean);

//     const scored = results
//       .map(it => ({ it, score: scoreVideo(it, wantedTokens) }))
//       .filter(x => x.score > 0)
//       .sort((a, b) => b.score - a.score)
//       .slice(0, 6);

//     return scored.slice(0, 3).map(({ it }) => ({
//       title: it.snippet.title,
//       url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
//       thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url
//     }));

//   } catch (err) {
//     console.error("Erreur YouTube API:", err.message);
//     return [];
//   }
// };

// async function legacySearch(query) {
//   try {
//     const res = await youtube.search.list({
//       part: 'snippet',
//       q: `comment réparer ${query}`,
//       maxResults: 3,
//       type: 'video',
//       videoEmbeddable: 'true',
//       relevanceLanguage: 'fr',
//       regionCode: 'FR',
//     });

//     return res.data.items.map(video => ({
//       title: video.snippet.title,
//       url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
//       thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
//     }));
//   } catch (err) {
//     console.error("Erreur YouTube API:", err.message);
//     return [];
//   }
// }





// const { google } = require('googleapis');
// require('dotenv').config();

// const youtube = google.youtube({ version: 'v3', auth: process.env.YTB_API_KEY });

// // Profils par domaine (inclure/exclure + contrainte sur le titre)
// const DOMAIN_RULES = {
//   electronics: {
//     include: ['réparer','dépannage','carte','t-con','soudure','électronique'],
//     exclude: ['iphone','smartphone','android','galaxy','wiko','realme','xiaomi','huawei','ipad','nintendo','switch','2ds','3ds','psp','psvita','music','karaoke','asmr'],
//     mustTitle: /\b(tv|télé|téléviseur|écran|moniteur|amplificateur|lecteur|console)\b/i
//   },
//   appliance: {
//     include: ['réparation','remplacer','diagnostic','panne','maintenance','how to','troubleshooting'],
//     exclude: ['recette','cuisine','cake','music','karaoke','asmr','vlog','challenge'],
//     mustTitle: /\b(chauffe[- ]eau|ballon|lave[- ]linge|lave[- ]vaisselle|réfrigérateur|four|micro[- ]ondes|sèche[- ]linge|bouilloire)\b/i
//   },
//   plumbing: {
//     include: ['fuite','raccord','robinet','mitigeur','joint','remplacer','détartrer','désembouer','soudure'],
//     exclude: ['minecraft','fortnite','vlog','asmr','music'],
//     mustTitle: /\b(chauffe[- ]eau|robinet|mitigeur|vanne|raccord|flexible|groupe de sécurité|siphon|évacuation)\b/i
//   },
//   hvac: {
//     include: ['entretien','réparation','dépannage','pompe à chaleur','climatisation','thermostat'],
//     exclude: ['voiture','gaming','musique','asmr'],
//     mustTitle: /\b(pompe à chaleur|climatisation|climatiseur|thermostat|chaudière)\b/i
//   },
//   furniture: {
//     include: ['réparer','recoller','resserrer','poncer','vernir','bois','charnière'],
//     exclude: ['ikea haul','music','asmr'],
//     mustTitle: /\b(chaise|table|commode|charnière|tiroir|bois)\b/i
//   },
//   vehicle: {
//     include: ['changer','remplacer','purger','réparer','frein','pneu','chaine','dérailleur'],
//     exclude: ['highlights','asmr','music'],
//     mustTitle: /\b(vélo|bicyclette|voiture|auto|frein|chaîne|pneu|dérailleur)\b/i
//   },
//   tool: {
//     include: ['réparer','dépanner','changer charbon','graisser','démonter','ressort'],
//     exclude: ['asmr','music','karaoke'],
//     mustTitle: /\b(perceuse|meuleuse|scie|ponceuse|tournevis|outil)\b/i
//   },
//   electrical: {
//     include: ['230v','disjoncteur','prise','interrupteur','tester','multimètre','continuité','schéma','neutre','phase','terre'],
//     exclude: ['arduino','gaming','asmr','music'],
//     mustTitle: /\b(disjoncteur|prise|interrupteur|tableau électrique|différentiel)\b/i
//   },
//   other: {
//     include: ['réparer','dépannage','comment','tutoriel','maintenance'],
//     exclude: ['music','asmr','gaming','vlog','challenge'],
//     mustTitle: /.*/i
//   }
// };

// const norm = (s) =>
//   (s || '')
//     .toLowerCase()
//     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
//     .replace(/[^a-z0-9\s-]/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();

// function buildQueryByDomain(intent = {}, domain = 'other') {
//   const rules = DOMAIN_RULES[domain] || DOMAIN_RULES.other;
//   const negatives = Array.from(new Set([...(intent.must_exclude || []), ...rules.exclude]));
//   const inc = Array.from(new Set([...(intent.must_include || []), ...rules.include]))
//     .map((x) => `"${x}"`)
//     .join(' ');
//   const exc = negatives.map((x) => `-${x}`).join(' ');
//   const q = [ (intent.queries || []).join(' '), inc, exc ].filter(Boolean).join(' ');
//   return q.trim();
// }

// function titlePassesDomain(title, domain) {
//   const rules = DOMAIN_RULES[domain] || DOMAIN_RULES.other;
//   return rules.mustTitle.test(title || '');
// }

// exports.searchRepairVideos = async (intentOrString) => {
//   try {
//     let domain = 'other';
//     let intent = intentOrString;

//     if (typeof intentOrString !== 'string') {
//       domain = intentOrString?.domain || intentOrString?.deviceDomain || 'other';
//     }

//     const q = (typeof intent === 'string')
//       ? `${intent} réparer`
//       : buildQueryByDomain(intent, domain);

//     // 1) Recherche
//     const s = await youtube.search.list({
//       part: 'snippet',
//       q,
//       maxResults: 12,
//       type: 'video',
//       videoEmbeddable: 'true',
//       relevanceLanguage: 'fr',
//       regionCode: 'FR',
//       safeSearch: 'moderate'
//     });

//     const ids = (s.data.items || []).map((i) => i.id?.videoId).filter(Boolean);
//     if (!ids.length) return [];

//     // 2) Vérification des vidéos
//     const v = await youtube.videos.list({
//       part: 'snippet,contentDetails,status',
//       id: ids.join(',')
//     });

//     const valids = (v.data.items || []).filter((x) => {
//       const st = x.status || {};
//       const title = x.snippet?.title || '';
//       if (st.privacyStatus !== 'public' || st.embeddable !== true) return false;
//       if (!titlePassesDomain(title, domain)) return false;
//       // blacklist générique
//       const hay = norm(`${x.snippet?.title} ${x.snippet?.description || ''}`);
//       if (/\b(asmr|karaoke|music|lyrics|vlog|challenge|minecraft|fortnite)\b/.test(hay)) return false;
//       return true;
//     }).slice(0, 3);

//     return valids.map((x) => ({
//       title: x.snippet.title,
//       url: `https://www.youtube.com/watch?v=${x.id}`,
//       thumbnail:
//         x.snippet.thumbnails?.medium?.url || x.snippet.thumbnails?.default?.url
//     }));
//   } catch (e) {
//     console.error('Erreur YouTube API:', e.message);
//     return [];
//   }
// };




// const { google } = require('googleapis');
// require('dotenv').config();

// const youtube = google.youtube({ version: 'v3', auth: process.env.YTB_API_KEY });

// // ——— Dictionnaire FR de synonymes par classe (🔧 nouveaux)
// const CLASS_FR_SYNONYMS = {
//   chauffe_eau: {
//     include: ['chauffe-eau','chauffe eau','ballon','ballon eau chaude','cumulus','groupe de securite','anode','thermostat','resistance'],
//     mustTitle: /\b(chauffe[ -]?eau|ballon|cumulus|groupe de securite|anode|thermostat|resistance)\b/i,
//     domain: 'appliance'
//   },
//   televiseur: {
//     include: ['tv','téléviseur','écran tv','lcd','led','oled','t-con','nappe'],
//     mustTitle: /\b(tv|t[ée]l[ée]viseur|[ée]cran\s?tv)\b/i,
//     domain: 'electronics'
//   },
//   lave_linge: {
//     include: ['lave linge','machine a laver','pompe vidange','courroie','palier','cuve'],
//     mustTitle: /\b(lave[ -]linge|machine a laver)\b/i,
//     domain: 'appliance'
//   },
//   robinet: {
//     include: ['robinet','mitigeur','cartouche','joint','fuite'],
//     mustTitle: /\b(robinet|mitigeur)\b/i,
//     domain: 'plumbing'
//   },
//   autre: { include: [], mustTitle: /.*/i, domain: 'other' }
// };

// // Profils de domaine (inchangé mais utile)
// const DOMAIN_RULES = {
//   electronics: {
//     include: ['réparer','dépannage','carte','t-con','soudure','électronique'],
//     exclude: ['iphone','smartphone','android','galaxy','wiko','realme','xiaomi','huawei','ipad','nintendo','switch','2ds','3ds','psp','psvita','music','karaoke','asmr'],
//     mustTitle: /\b(tv|télé|téléviseur|écran|moniteur|amplificateur|lecteur|console)\b/i
//   },
//   appliance: {
//     include: ['réparation','remplacer','diagnostic','panne','maintenance','how to','troubleshooting'],
//     exclude: ['recette','cuisine','cake','music','karaoke','asmr','vlog','challenge'],
//     mustTitle: /\b(chauffe[ -]?eau|ballon|lave[ -]?linge|lave[ -]?vaisselle|réfrigérateur|four|micro[ -]?ondes|sèche[ -]?linge|bouilloire)\b/i
//   },
//   plumbing: {
//     include: ['fuite','raccord','robinet','mitigeur','joint','remplacer','détartrer','désembouer','soudure'],
//     exclude: ['minecraft','fortnite','vlog','asmr','music'],
//     mustTitle: /\b(chauffe[ -]?eau|robinet|mitigeur|vanne|raccord|flexible|groupe de securite|siphon|evacuation)\b/i
//   },
//   hvac: {
//     include: ['entretien','réparation','dépannage','pompe à chaleur','climatisation','thermostat'],
//     exclude: ['voiture','gaming','musique','asmr'],
//     mustTitle: /\b(pompe à chaleur|climatisation|climatiseur|thermostat|chaudière)\b/i
//   },
//   furniture: {
//     include: ['réparer','recoller','resserrer','poncer','vernir','bois','charnière'],
//     exclude: ['ikea haul','music','asmr'],
//     mustTitle: /\b(chaise|table|commode|charnière|tiroir|bois)\b/i
//   },
//   vehicle: {
//     include: ['changer','remplacer','purger','réparer','frein','pneu','chaine','dérailleur'],
//     exclude: ['highlights','asmr','music'],
//     mustTitle: /\b(vélo|bicyclette|voiture|auto|frein|chaîne|pneu|dérailleur)\b/i
//   },
//   tool: {
//     include: ['réparer','dépanner','changer charbon','graisser','démonter','ressort'],
//     exclude: ['asmr','music','karaoke'],
//     mustTitle: /\b(perceuse|meuleuse|scie|ponceuse|tournevis|outil)\b/i
//   },
//   electrical: {
//     include: ['230v','disjoncteur','prise','interrupteur','tester','multimètre','continuité','schéma','neutre','phase','terre'],
//     exclude: ['arduino','gaming','asmr','music'],
//     mustTitle: /\b(disjoncteur|prise|interrupteur|tableau électrique|différentiel)\b/i
//   },
//   other: {
//     include: ['réparer','dépannage','comment','tutoriel','maintenance'],
//     exclude: ['music','asmr','gaming','vlog','challenge'],
//     mustTitle: /.*/i
//   }
// };

// const norm = (s) =>
//   (s || '')
//     .toLowerCase()
//     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
//     .replace(/[^a-z0-9\s-]/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();

// // Étend l’intent avec le dico FR (🔧)
// function expandIntent(intent = {}) {
//   const cls = (intent.class || intent.deviceClass || '').toLowerCase();
//   const syn = CLASS_FR_SYNONYMS[cls] || CLASS_FR_SYNONYMS.autre;
//   const inc = Array.from(new Set([...(intent.must_include || []), ...(syn.include || [])]));
//   const queries = Array.from(new Set([...(intent.queries || [])]));
//   // Si pas de query, crée-en à partir des synonymes utiles
//   if (queries.length === 0 && syn.include?.length) {
//     queries.push(`${syn.include[0]} reparer`, `${syn.include[0]} fuite`, `${syn.include[0]} depannage`);
//   }
//   return {
//     ...intent,
//     queries,
//     must_include: inc,
//     _mustTitle: syn.mustTitle,
//     _domainFromClass: syn.domain
//   };
// }

// function buildQueryByDomain(intent = {}, domain = 'other') {
//   const rules = DOMAIN_RULES[domain] || DOMAIN_RULES.other;
//   const negatives = Array.from(new Set([...(intent.must_exclude || []), ...rules.exclude]));
//   const inc = Array.from(new Set([...(intent.must_include || []), ...rules.include]))
//     .map((x) => `"${x}"`)
//     .join(' ');
//   const exc = negatives.map((x) => `-${x}`).join(' ');
//   const q = [ (intent.queries || []).join(' '), inc, exc ].filter(Boolean).join(' ');
//   return q.trim();
// }

// function titlePasses(title, mustTitle) {
//   if (!mustTitle) return true;
//   return mustTitle.test(title || '');
// }

// // Recherche + double passe (🛟 strict → relax)
// async function searchOnce(q, mustTitle) {
//   const s = await youtube.search.list({
//     part: 'snippet',
//     q,
//     maxResults: 15,
//     type: 'video',
//     videoEmbeddable: 'true',
//     relevanceLanguage: 'fr',
//     regionCode: 'FR',
//     safeSearch: 'moderate'
//   });

//   const ids = (s.data.items || []).map((i) => i.id?.videoId).filter(Boolean);
//   if (!ids.length) return [];

//   const v = await youtube.videos.list({
//     part: 'snippet,contentDetails,status',
//     id: ids.join(',')
//   });

//   const out = (v.data.items || []).filter((x) => {
//     const st = x.status || {};
//     const title = x.snippet?.title || '';
//     if (st.privacyStatus !== 'public' || st.embeddable !== true) return false;
//     const hay = norm(`${x.snippet?.title} ${x.snippet?.description || ''}`);
//     if (/\b(asmr|karaoke|lyrics|vlog|challenge|minecraft|fortnite)\b/.test(hay)) return false; // 🪤
//     if (!titlePasses(title, mustTitle)) return false;
//     return true;
//   });

//   return out.slice(0, 3).map((x) => ({
//     title: x.snippet.title,
//     url: `https://www.youtube.com/watch?v=${x.id}`,
//     thumbnail: x.snippet.thumbnails?.medium?.url || x.snippet.thumbnails?.default?.url
//   }));
// }

// exports.searchRepairVideos = async (intentOrString) => {
//   try {
//     // Compat string
//     if (typeof intentOrString === 'string') {
//       return await searchOnce(`${intentOrString} reparer`, /.*/i);
//     }

//     // Étendre intent avec dico FR
//     let intent = expandIntent(intentOrString || {});
//     // Domaine : si absent, déduis depuis la classe
//     let domain = intent.domain || intent.deviceDomain || intent._domainFromClass || 'other';

//     // P1 strict
//     const q1 = buildQueryByDomain(intent, domain);
//     let res = await searchOnce(q1, intent._mustTitle || DOMAIN_RULES[domain]?.mustTitle);
//     if (res.length) return res;

//     // P2 relax : enlève mustTitle, garde exclu & includes
//     const q2 = buildQueryByDomain({ ...intent, must_include: intent.must_include.slice(0, 4) }, domain);
//     res = await searchOnce(q2, /.*/i);
//     if (res.length) return res;

//     // P3 minimal fallback
//     const mf = (intent.must_include && intent.must_include[0]) || (intent.queries && intent.queries[0]) || 'reparation';
//     const q3 = `${mf} reparer tutoriel`;
//     return await searchOnce(q3, /.*/i);

//   } catch (e) {
//     console.error('Erreur YouTube API:', e.message);
//     return [];
//   }
// };




// const { google } = require('googleapis');
// require('dotenv').config();

// const youtube = google.youtube({ version: 'v3', auth: process.env.YTB_API_KEY });

// // --- Petits utilitaires
// const norm = (s) =>
//   (s || '')
//     .toLowerCase()
//     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
//     .replace(/[^a-z0-9\s-]/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();

// const NEG = /\b(asmr|karaoke|lyrics|clip|music|musique|vlog|challenge|minecraft|fortnite|shorts|iphone|smartphone|android|galaxy)\b/;
// const ACTION_VERBS = /\b(r[ée]parer|d[ée]pann(er|age)|remplacer|changer|coller|recoller|diagnostiquer|troubleshooting|how to|tutoriel)\b/i;

// // Construit 2–3 requêtes simples en FR à partir du diagnostic
// function buildQueries({ device, problem_summary, diagnosis }) {
//   const cls = (device?.class || '').replace(/_/g, ' ').trim(); // ex: chauffe_eau -> "chauffe eau"
//   const problem = (problem_summary || diagnosis || '').toLowerCase();

//   const base = cls ? `${cls}` : 'objet';
//   const probShort = problem.length > 60 ? problem.slice(0, 60) : problem;

//   // 3 requêtes max, faciles à justifier
//   const q1 = `${base} ${probShort} réparer`;
//   const q2 = `${base} ${probShort} tutoriel`;
//   const q3 = `${base} réparer`;

//   // dédoublonne proprement
//   const set = new Set([q1, q2, q3].map(norm).filter(Boolean));
//   return Array.from(set);
// }

// async function searchOnce(q, maxResults = 15) {
//   const s = await youtube.search.list({
//     part: 'snippet',
//     q,
//     maxResults,
//     type: 'video',
//     videoEmbeddable: 'true',
//     relevanceLanguage: 'fr',
//     regionCode: 'FR',
//     safeSearch: 'moderate'
//   });
//   return (s.data.items || []).map(i => i.id?.videoId).filter(Boolean);
// }

// async function fetchMeta(ids) {
//   if (!ids.length) return [];
//   const v = await youtube.videos.list({
//     part: 'snippet,status',
//     id: ids.join(',')
//   });
//   return (v.data.items || []).map(x => ({
//     id: x.id,
//     title: x.snippet?.title || '',
//     desc: x.snippet?.description || '',
//     embeddable: x.status?.embeddable === true,
//     public: x.status?.privacyStatus === 'public'
//   }));
// }

// // Règle de filtrage explicable
// function keepStrict(video, objectWord) {
//   const hay = norm(`${video.title} ${video.desc}`);
//   if (!video.public || !video.embeddable) return false;
//   if (NEG.test(hay)) return false;
//   // titre doit contenir l'objet (pot|vase|chauffe eau|tv|robinet ...)
//   const obj = new RegExp(`\\b(${objectWord})\\b`, 'i');
//   if (!obj.test(video.title)) return false;
//   // et il doit y avoir un verbe d'action quelque part
//   if (!ACTION_VERBS.test(video.title) && !ACTION_VERBS.test(video.desc)) return false;
//   return true;
// }

// function keepRelax(video, objectWord) {
//   const hay = norm(`${video.title} ${video.desc}`);
//   if (!video.public || !video.embeddable) return false;
//   if (NEG.test(hay)) return false;
//   const obj = new RegExp(`\\b(${objectWord})\\b`, 'i');
//   return obj.test(video.title) || obj.test(video.desc);
// }

// exports.searchRepairVideos = async (ctxOrString) => {
//   try {
//     // 1) Préparer le mot-clé objet lisible
//     let deviceClass = '';
//     let problem = '';
//     let diagnosis = '';

//     if (typeof ctxOrString === 'string') {
//       deviceClass = ctxOrString;
//     } else {
//       deviceClass = (ctxOrString?.device?.class || '').replace(/_/g, ' ').trim();
//       problem = ctxOrString?.problem_summary || '';
//       diagnosis = ctxOrString?.diagnosis || '';
//     }
//     if (!deviceClass) deviceClass = 'objet';

//     // 2) Construire 2–3 requêtes
//     const queries = buildQueries({
//       device: { class: deviceClass },
//       problem_summary: problem,
//       diagnosis
//     });

//     // 3) Chercher des candidats (jusqu'à ~30)
//     let ids = [];
//     for (const q of queries) {
//       const found = await searchOnce(q, 15);
//       ids = ids.concat(found);
//       if (ids.length >= 30) break;
//     }
//     ids = Array.from(new Set(ids));
//     if (!ids.length) return [];

//     const metas = await fetchMeta(ids);

//     // 4) Filtrage strict (objet + verbe)
//     const objectWord = deviceClass.replace(/\s+/g, '[- ]?'); // chauffe eau -> chauffe[- ]?eau
//     let strict = metas.filter(v => keepStrict(v, objectWord)).slice(0, 3);

//     // 5) Si rien, passe relax (objet seul)
//     if (!strict.length) strict = metas.filter(v => keepRelax(v, objectWord)).slice(0, 3);

//     // 6) Si toujours rien, prends les 3 premières publiques/embeddables (fallback)
//     if (!strict.length) strict = metas.filter(v => v.public && v.embeddable).slice(0, 3);

//     return strict.map(v => ({
//       title: v.title,
//       url: `https://www.youtube.com/watch?v=${v.id}`
//     }));

//   } catch (e) {
//     console.error('Erreur YouTube:', e.message);
//     return [];
//   }
// };






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

// function pickThumb(snippet) {
//   // ordre de préférence: medium -> high -> default
//   return (
//     snippet?.thumbnails?.medium?.url ||
//     snippet?.thumbnails?.high?.url ||
//     snippet?.thumbnails?.default?.url ||
//     null
//   );
// }

// async function fetchMeta(ids) {
//   if (!ids.length) return [];
//   const v = await youtube.videos.list({
//     part: 'snippet,status',
//     id: ids.join(',')
//   });
//   return (v.data.items || []).map(x => ({
//     id: x.id,
//     title: x.snippet?.title || '',
//     desc: x.snippet?.description || '',
//     thumbnail: pickThumb(x.snippet),          // 👈 miniature ajoutée ici
//     embeddable: x.status?.embeddable === true,
//     public: x.status?.privacyStatus === 'public'
//   }));
// }
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
    thumbnail: pickThumb(x.snippet, x.id),  // ← jamais "", jamais null
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

    // return chosen.map(v => ({
    //   id: v.id,
    //   title: v.title,
    //   url: `https://www.youtube.com/watch?v=${v.id}`,
    //   thumbnail: v.thumbnail // 👈 on renvoie bien la miniature
    // }));
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
