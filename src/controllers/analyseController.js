const axios = require('axios');
const { detectObject } = require('../services/visionService');
const { analyzeTextToJson } = require('../services/openaiService');
const { searchRepairVideos } = require('../services/youtubeService');
const logger = require('../../logger');
require('dotenv').config();

// Normalisation FR pour l'affichage + requêtes
const CLASS_FR_MAP = {
  water_heater: 'chauffe_eau',
  tv: 'televiseur',
  television: 'televiseur',
  smartphone: 'smartphone',
  phone: 'smartphone',
  washing_machine: 'lave_linge',
  dishwasher: 'lave_vaisselle',
  refrigerator: 'refrigerateur',
  bike: 'velo',
  bicycle: 'velo'
};
function toFrClass(cls) {
  if (!cls) return null;
  const k = String(cls).toLowerCase().replace(/\s+/g, '_');
  return CLASS_FR_MAP[k] || k;
}

exports.fullAnalyze = async (req, res) => {
  try {
    let analysisText;
    let solution;
    let imageUrl = null;

    // Contexte IA (pour YT)
    let iaRaw = null;          // JSON brut retourné par l'IA (si disponible via visionService)
    let deviceInfo = null;     // object { domain, class, ... } (brut)
    let intent = null;         // search_intent éventuel

    const { userId, objectrepairedId, description } = req.body;
    const token = req.headers.authorization;

    if (!userId || !objectrepairedId) {
      return res.status(400).json({ error: 'userId et objectrepairedId sont requis.' });
    }
    if (!req.file && !description) {
      return res.status(400).json({ error: 'Aucune image ou description reçue.' });
    }

    // 1) Image seule OU image + texte -> vision JSON
    if (req.file) {
      const filePath = req.file.path;
      const detection = await detectObject(filePath, req.file.mimetype, description || '');
      if (!detection.success) {
        return res.status(422).json({ error: detection.error, conseil: detection.conseil });
      }

      // Analyse format texte pour le front
      analysisText =
        `[OBJET] ${detection.objet}\n` +
        `[PROBLEME] ${detection.probleme}\n` +
        `[REPARATION]\n${detection.solution}\n` +
        `[OUTILS] ${detection.outils}`;

      solution = detection.solution;
      imageUrl = filePath;

      // Contexte structuré pour YT
      iaRaw = detection.raw || null;
      deviceInfo = detection.device || (iaRaw && iaRaw.device) || {};
      intent = detection.search_intent || (iaRaw && iaRaw.search_intent) || { queries: [], must_include: [], must_exclude: [] };

    } else {
      // 2) Texte seul -> JSON structuré (même schéma)
      const data = await analyzeTextToJson(description);

      analysisText =
        `[OBJET] ${data.device?.class || 'objet'}\n` +
        `[PROBLEME] ${data.problem_summary || data.diagnosis || ''}\n` +
        `[REPARATION]\n${(data.solution_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` +
        `[OUTILS] ${(data.tools_needed || []).join(', ')}`;

      solution = (data.solution_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

      iaRaw = data;
      deviceInfo = data.device || {};
      intent = data.search_intent || { queries: [], must_include: [], must_exclude: [] };
    }

    // 3) Préparer les champs pour YouTube (IMPORTANT : device.class dans device.*)
    const deviceDomain = deviceInfo?.domain || 'autre';
    const deviceClassFr = toFrClass(deviceInfo?.class);
    const ytContext = {
      // le service YT lit device.class ici (pas à la racine)
      device: { ...deviceInfo, class: deviceClassFr ? deviceClassFr.replace(/_/g, ' ') : '' },
      domain: deviceDomain,
      // résumé problème/diagnostic pour construire des requêtes FR déterministes
      problem_summary: (iaRaw && iaRaw.problem_summary) || '',
      diagnosis: (iaRaw && iaRaw.diagnosis) || '',
      solution_steps: (iaRaw && iaRaw.solution_steps) || [],
      // on passe aussi l'intent s'il existe (facultatif)
      ...intent
    };

    const videos = await searchRepairVideos(ytContext);

    // 4) Enregistrement best-effort (inchangé)
    try {
      await axios.post(
        `${process.env.DB_SERVICE_URL}/api/ia-requests`,
        {
          userId,
          objectrepairedId,
          imageUrl,
          text: analysisText,
          resultIA: solution
        },
        { headers: { Authorization: token } }
      );
    } catch (err) {
      logger.error(`Erreur enregistrement DB service : ${err.message}`);
      if (err.response) {
        logger.error(`Status: ${err.response.status}`);
        logger.error(`Data: ${JSON.stringify(err.response.data)}`);
      }
    }

    // 5) Réponse front
    return res.json({
      objet_detecte: deviceClassFr || null,
      domaine: deviceDomain,
      analyse: analysisText,
      solution,
      videos
    });

  } catch (err) {
    logger.error(`Erreur dans fullAnalyze: ${err.message}`);
    return res.status(500).json({ error: 'Erreur dans le traitement de la demande.' });
  }
};
