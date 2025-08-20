// const axios = require('axios');
// const { detectObject } = require('../services/visionService');
// const { askOpenAI } = require('../services/openaiService');
// const { searchRepairVideos } = require('../services/youtubeService');
// const logger = require('../logger');
// require('dotenv').config();

// exports.fullAnalyze = async (req, res) => {
//   try {
//     let imageAnalysis;
//     let keyword;
//     let solution;
//     let imageUrl = null;

//     const { userId, objectrepairedId, description } = req.body;
//     const token = req.headers.authorization;

//     if (!userId || !objectrepairedId) {
//       return res.status(400).json({ error: 'userId et objectrepairedId sont requis.' });
//     }

//     //  Si image présente
//     if (req.file) {
      
//       const filePath = req.file.path;
//      const detection = await detectObject(filePath, req.file.mimetype);


//       imageAnalysis = `[OBJET] ${detection.objet}\n[PROBLEME] ${detection.probleme}\n[REPARATION]\n${detection.solution}\n[OUTILS] ${detection.outils}`;
//       keyword = detection.objet;
//       solution = detection.solution;
//       imageUrl = filePath;
//     }

//     //  Sinon analyse texte
//     else if (description) {
//       imageAnalysis = description;
//       keyword = description;
//       solution = await askOpenAI(`Comment réparer : ${keyword}`);
//     }

//     //  Rien reçu
//     else {
//       return res.status(400).json({ error: 'Aucune image ou description reçue.' });
//     }

//     // Vidéos YouTube
//     const videos = await searchRepairVideos(keyword);

//     //  envoi du résultat vers le DB Service
//     try {
//       await axios.post(
//         `${process.env.DB_SERVICE_URL}/api/ia-requests`,
//         {
//           userId,
//           objectrepairedId,
//           imageUrl,
//           text: imageAnalysis,
//           resultIA: solution
//         },
//         {
//           headers: {
//             Authorization: token
//           }
//         }
//       );
      

//    } catch (err) {
// logger.error(`Erreur enregistrement DB service : ${error.message}`);
//   if (err.response) {
//     console.error("Status:", err.response.status);
//     console.error("Data:", err.response.data);
//   } else {
//     console.error("Message:", err.message);
//   }
// }


//     // réponse finale vers le front
//     res.json({
//       objet_detecte: keyword,
//       analyse: imageAnalysis,
//       solution,
//       videos
//     });

//   } catch (err) {
//     console.error("Erreur dans fullAnalyze:", err);
//     res.status(500).json({ error: 'Erreur dans le traitement de la demande.' });
//   }
// };


const axios = require('axios');
const { detectObject } = require('../services/visionService');
const { askOpenAI } = require('../services/openaiService');
const { searchRepairVideos } = require('../services/youtubeService');
const logger = require('@root/logger');



require('dotenv').config();

exports.fullAnalyze = async (req, res) => {
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

    if (req.file) {
      const filePath = req.file.path;
      const detection = await detectObject(filePath, req.file.mimetype);

      imageAnalysis = `[OBJET] ${detection.objet}\n[PROBLEME] ${detection.probleme}\n[REPARATION]\n${detection.solution}\n[OUTILS] ${detection.outils}`;
      keyword = detection.objet;
      solution = detection.solution;
      imageUrl = filePath;
    } else if (description) {
      imageAnalysis = description;
      keyword = description;
      solution = await askOpenAI(`Comment réparer : ${keyword}`);
    } else {
      return res.status(400).json({ error: 'Aucune image ou description reçue.' });
    }

    const videos = await searchRepairVideos(keyword);

    try {
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
    } catch (err) {
      logger.error(`Erreur enregistrement DB service : ${err.message}`);
      if (err.response) {
        logger.error(`Status: ${err.response.status}`);
        logger.error(`Data: ${JSON.stringify(err.response.data)}`);
      }
    }

    res.json({
      objet_detecte: keyword,
      analyse: imageAnalysis,
      solution,
      videos
    });

  } catch (err) {
    logger.error(`Erreur dans fullAnalyze: ${err.message}`);
    res.status(500).json({ error: 'Erreur dans le traitement de la demande.' });
  }
};

