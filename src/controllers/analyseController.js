const axios = require('axios');
const { detectObject } = require('../services/visionService');
const { askOpenAI } = require('../services/openaiService');
const { searchRepairVideos } = require('../services/youtubeService');
require('dotenv').config();

exports.fullAnalyze = async (req, res) => {
  console.log("req.body:", req.body);
console.log("📎 req.file:", req.file);

  try {
    let imageAnalysis;
    let keyword;
    let solution;
    let imageUrl = null;

    const { userId, objectrepairedId, description } = req.body;
    const token = req.headers.authorization;

    if (!userId || !objectrepairedId) {
      return res.status(400).json({ error: 'userId et objectrepairedId sont requis.' });
    }

    //  Si image présente
    if (req.file) {
      console.log("Analyse d'image reçue");
      const filePath = req.file.path;
     const detection = await detectObject(filePath, req.file.mimetype);


      imageAnalysis = `[OBJET] ${detection.objet}\n[PROBLEME] ${detection.probleme}\n[REPARATION]\n${detection.solution}\n[OUTILS] ${detection.outils}`;
      keyword = detection.objet;
      solution = detection.solution;
      imageUrl = filePath;
    }

    //  Sinon analyse texte
    else if (description) {
      console.log("✍️ Analyse de texte reçue :", description);
      imageAnalysis = description;
      keyword = description;
      solution = await askOpenAI(`Comment réparer : ${keyword}`);
    }

    //  Rien reçu
    else {
      return res.status(400).json({ error: 'Aucune image ou description reçue.' });
    }

    // Vidéos YouTube
    const videos = await searchRepairVideos(keyword);

    //  Envoi du résultat vers le DB Service
    try {
      console.log("Payload envoyé au DB service :", {
  userId,
  objectrepairedId,
  imageUrl,
  text: imageAnalysis,
  resultIA: solution
});

      await axios.post(
        `${process.env.DB_SERVICE_URL}/api/ia-requests`,
        {
          userId,
          objectrepairedId,
          imageUrl,
          text: imageAnalysis,
          resultIA: solution
        },
        {
          headers: {
            Authorization: token
          }
        }
      );
      console.log(" Résultat IA enregistré dans le DB service");
      console.log("📥 REÇU DU FRONTEND =>")
console.log("userId:", userId)
console.log("objectrepairedId:", objectrepairedId)
console.log("imageUrl (path):", imageUrl)

   } catch (err) {
  console.error("Erreur enregistrement DB service :");
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Data:", err.response.data);
  } else {
    console.error("Message:", err.message);
  }
}


    // Réponse finale vers le front
    res.json({
      objet_detecte: keyword,
      analyse: imageAnalysis,
      solution,
      videos
    });

  } catch (err) {
    console.error("❌ Erreur dans fullAnalyze:", err);
    res.status(500).json({ error: 'Erreur dans le traitement de la demande.' });
  }
};
