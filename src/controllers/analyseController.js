
const axios = require('axios');
const { detectObject } = require('../services/visionService');
const { askOpenAI, extractKeywordFromText, extractSearchTerms } = require('../services/openaiService');
const { searchRepairVideos } = require('../services/youtubeService');
const logger = require('../../logger'); 

require('dotenv').config();

exports.fullAnalyze = async (req, res) => {
  try {
    let analysisText;
    let keyword;
    let solution;
    let imageUrl = null;

    const { userId, objectrepairedId, description } = req.body;
    const token = req.headers.authorization;

    if (!userId || !objectrepairedId) {
      return res.status(400).json({ error: 'userId et objectrepairedId sont requis.' });
    }

    if (!req.file && !description) {
      return res.status(400).json({ error: 'Aucune image ou description reçue.' });
    }

    if (req.file && description) {
      // ✅ image + texte : on enrichit le prompt multimodal avec "description"
      const filePath = req.file.path;
      const detection = await detectObject(filePath, req.file.mimetype, description);
      if (!detection.success) {
        return res.status(422).json({ error: detection.error, conseil: detection.conseil });
      }

      analysisText =
        `[OBJET] ${detection.objet}\n` +
        `[PROBLEME] ${detection.probleme}\n` +
        `[REPARATION]\n${detection.solution}\n` +
        `[OUTILS] ${detection.outils}`;

      keyword = detection.keyword;
      solution = detection.solution;
      imageUrl = filePath;

    } else if (req.file) {
      // image seule
      const filePath = req.file.path;
      const detection = await detectObject(filePath, req.file.mimetype);
      if (!detection.success) {
        return res.status(422).json({ error: detection.error, conseil: detection.conseil });
      }

      analysisText =
        `[OBJET] ${detection.objet}\n` +
        `[PROBLEME] ${detection.probleme}\n` +
        `[REPARATION]\n${detection.solution}\n` +
        `[OUTILS] ${detection.outils}`;

      keyword = detection.keyword;
      solution = detection.solution;
      imageUrl = filePath;

    } else {
      // texte seul
      analysisText = description;
      keyword = await extractKeywordFromText(description);
      solution = await askOpenAI(
        `Tu es un expert en réparation. Détaille une solution claire et sécurisée pour: ${description}`
      );
    }

    // 🔎 Contexte riche pour YouTube à partir de l'analyse + description
    const ytContext = await extractSearchTerms(
      [analysisText, description || '', keyword || ''].filter(Boolean).join('\n')
    );
    const videos = await searchRepairVideos(ytContext);

    // Enregistrement dans le DB-service (best-effort)
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

    return res.json({
      objet_detecte: keyword,
      analyse: analysisText,
      solution,
      videos
    });

  } catch (err) {
    logger.error(`Erreur dans fullAnalyze: ${err.message}`);
    return res.status(500).json({ error: 'Erreur dans le traitement de la demande.' });
  }
};

