// const fs = require('fs');
// const path = require('path');
// const { OpenAI } = require('openai');
// const { searchRepairVideos } = require('./youtubeService');
// require('dotenv').config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// function extractKeyword(text) {
//   // 🔍 On prend la première phrase qui semble contenir un objet ou un dommage
//   const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

//   for (let line of lines) {
//     // Recherche simple d’un mot-clé ou d’un objet mentionné
//     if (line.toLowerCase().includes('objet') || line.toLowerCase().includes('dommage')) {
//       return line.split(':')[1]?.trim() || line;
//     }
//   }

//   // 🔁 Fallback : retourne les 3 premiers mots de la première ligne
//   return lines[0]?.split(' ').slice(0, 3).join(' ') || 'objet inconnu';
// }

// exports.detectObject = async (filePath) => {
//   try {
//     if (!fs.existsSync(filePath)) {
//       throw new Error('Fichier non trouvé à ce chemin : ' + filePath);
//     }

//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'text',
//               text: 'Analyse cette image, identifie l’objet visible, les éventuels dommages, et propose des solutions.',
//             },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: `data:image/jpeg;base64,${imageData}`,
//               },
//             },
//           ],
//         },
//       ],
//       max_tokens: 500,
//     });

//     const resultText = response.choices?.[0]?.message?.content || 'Aucune réponse obtenue.';

//     // 👉 Extraire un mot-clé pour la recherche YouTube (option simple ici : prendre une ligne ou mot-clé du résultat)
//     const keyword = extractKeyword(resultText); // Tu peux créer cette fonction selon ton besoin

//     const videos = await searchRepairVideos(keyword);

//     return {
//       analysis: resultText,
//       videos: videos,
//     };
//   } catch (error) {
//     console.error("Erreur analyse image OpenAI :", error.response?.data || error.message || error);
//     throw new Error("Erreur analyse image OpenAI.");
//   }
// };


// exports.askOpenAI = async (text) => {
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4-turbo',
//     messages: [{ role: 'user', content: text }],
//     max_tokens: 500
//   });

//   return response.choices[0].message.content;
// };


// const fs = require('fs');
// const { OpenAI } = require('openai');
// const { searchRepairVideos } = require('./youtubeService');
// require('dotenv').config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // ✅ Utilise OpenAI pour extraire un mot-clé pertinent
// async function extractKeywordWithAI(text) {
//   try {
//     const response = await openai.beta.completions.create({
//       model: 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: 'Tu es un assistant qui extrait un mot-clé pertinent pour identifier un objet cassé à partir d’une analyse d’image.',
//         },
//         {
//           role: 'user',
//           content: `Voici une analyse :\n${text}\n\nQuel est le mot-clé principal pour décrire l’objet à réparer ? Réponds uniquement par ce mot-clé.`,
//         },
//       ],
//       max_tokens: 20,
//     });

//     return response.choices[0].message.content.trim();
//   } catch (err) {
//     console.warn("⚠️ Erreur d'extraction du mot-clé. Fallback utilisé.");
//     return 'objet cassé';
//   }
// }
// exports.detectObject = async (filePath) => {
//   try {
//     if (!fs.existsSync(filePath)) {
//       throw new Error('Fichier non trouvé à ce chemin : ' + filePath);
//     }

//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'text',
//               text: 'Analyse cette image. Identifie l’objet principal, les dommages visibles, et propose une solution de réparation.',
//             },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: `data:image/jpeg;base64,${imageData}`,
//               },
//             },
//           ],
//         },
//       ],
//       max_tokens: 800,
//     });

//     const resultText = response.choices?.[0]?.message?.content || 'Aucune réponse obtenue.';

//     // 🔍 Option simple : extraire un mot-clé toi-même si besoin
//     const keywordMatch = resultText.match(/(pot en terre cuite|vase|céramique|assiette|tasse|verre|poterie|objet)/i);
//     const keyword = keywordMatch ? keywordMatch[1] : 'pot cassé';

//     const allVideos = await searchRepairVideos(keyword);

//     const filteredVideos = allVideos.filter(video =>
//       video.title.toLowerCase().includes(keyword.toLowerCase()) ||
//       video.title.toLowerCase().includes('réparer') ||
//       video.title.toLowerCase().includes('restaurer') ||
//       video.title.toLowerCase().includes('kintsugi')
//     );

//     return {
//       analysis: resultText,
//       objet_detecte: keyword,
//       videos: filteredVideos.length > 0 ? filteredVideos : allVideos,
//     };
//   } catch (error) {
//     console.error("Erreur analyse image OpenAI :", error.response?.data || error.message || error);
//     throw new Error("Erreur analyse image OpenAI.");
//   }
// };
// //  Texte brut → réponse IA
// exports.askOpenAI = async (text) => {
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4-turbo',
//     messages: [{ role: 'user', content: text }],
//     max_tokens: 500
//   });

//   return response.choices[0].message.content;
// };


// const fs = require('fs');
//  // Assure-toi que openai est exporté
// const { openai,extractKeywordFromText, askOpenAI} = require('./openaiService');
// const {searchRepairVideos } = require('./youtubeService');

// exports.detectObject = async (filePath) => {
//   try {
//     if (!fs.existsSync(filePath)) {
//       throw new Error('Fichier non trouvé à ce chemin : ' + filePath);
//     }

//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'text',
//               text: 'Analyse cette image. Identifie l’objet principal, les dommages visibles, et propose une solution de réparation.'
//             },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: `data:image/jpeg;base64,${imageData}`,
//               },
//             },
//           ],
//         },
//       ],
//       max_tokens: 800,
//     });

//     const resultText = response.choices?.[0]?.message?.content || 'Aucune réponse obtenue.';

//     // 🧠 Utilise l'extraction intelligente via OpenAI
//     const keyword = await extractKeywordFromText(resultText);

//     const allVideos = await searchRepairVideos(keyword);

//     const filteredVideos = allVideos.filter(video =>
//       video.title.toLowerCase().includes(keyword.toLowerCase()) ||
//       video.title.toLowerCase().includes('réparer') ||
//       video.title.toLowerCase().includes('restaurer') ||
//       video.title.toLowerCase().includes('kintsugi')
//     );

//     return {
//       analysis: resultText,
//       objet_detecte: keyword,
//       videos: filteredVideos.length > 0 ? filteredVideos : allVideos,
//     };
//   } catch (error) {
//     console.error("Erreur analyse image OpenAI :", error.response?.data || error.message || error);
//     throw new Error("Erreur analyse image OpenAI.");
//   }
// };



// const fs = require('fs');
// const { openai } = require('./openaiService');
// const { searchRepairVideos } = require('./youtubeService');

// exports.detectObject = async (filePath) => {
//   try {
//     // 1. Préparation de l'image
//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });
//     const imageUrl = `data:image/jpeg;base64,${imageData}`;

//     // 2. Prompt ultra-détaillé avec contraintes
//     const repairPrompt = `
//     Analyse cette image en suivant STRICTEMENT ces étapes :

//     1. Identification : 
//     - Décris l'objet principal avec précision (ex: "chargeur USB noir", "robinet de cuisine chromé")
//     - Matériaux visibles (plastique, métal, céramique...)
//     - Marque si visible

//     2. Diagnostic :
//     - Problème principal (cassure, fuite, dysfonctionnement électrique...)
//     - Éléments endommagés (câble, joint, surface...)
//     - Gravité (réparable/irréparable)

//     3. Solution pratique :
//     - Outils nécessaires (colles, tournevis, joint...)
//     - Étapes concrètes numérotées
//     - Durée estimée

//     Format de réponse EXACT :
//     ===DEBUT===
//     Objet: [description complète]
//     Problème: [diagnostic technique]
//     Réparation: [étapes précises]
//     Matériel: [liste d'outils]
//     ===FIN===
//     `;

//     // 3. Appel API avec paramètres stricts
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: repairPrompt },
//             { type: 'image_url', image_url: { url: imageUrl } }
//           ]
//         }
//       ],
//       max_tokens: 1500,
//       temperature: 0.1, // Réduit l'imagination de l'IA
//       response_format: { type: 'text' } // Force un format texte brut
//     });

//     // 4. Extraction rigoureuse
//     const rawText = response.choices[0].message.content;
//     const extractSection = (text, marker) => {
//       const regex = new RegExp(`${marker}:\\s*([^=]+)`);
//       const match = text.match(regex);
//       return match ? match[1].trim() : null;
//     };

//     const result = {
//       objet: extractSection(rawText, 'Objet') || 'Objet non identifié',
//       probleme: extractSection(rawText, 'Problème') || 'Problème non spécifié',
//       solution: extractSection(rawText, 'Réparation') || 'Contactez un professionnel',
//       materiel: extractSection(rawText, 'Matériel') || 'Non spécifié'
//     };

//     // 5. Recherche vidéo ciblée
//     const videoKeywords = `${result.objet} réparation ${result.probleme.split(' ')[0]}`;
//     result.videos = await searchRepairVideos(videoKeywords);

//     return result;

//   } catch (error) {
//     console.error('Erreur critique:', error);
//     return {
//       objet: 'Erreur d\'analyse',
//       probleme: 'Impossible de traiter l\'image',
//       solution: 'Veuillez envoyer une photo plus claire',
//       videos: []
//     };
//   }
// };

// 


// const fs = require('fs');
// const { openai } = require('./openaiService');
// const { searchRepairVideos } = require('./youtubeService');

// exports.detectObject = async (filePath) => {
//   try {
//     // 1. Chargement strict de l'image
//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     // 2. Prompt militaire avec contraintes extrêmes
//     const REPAIR_PROMPT = `
//     TU DOIS IMPÉRATIVEMENT :
//     1. Décrire l'objet visible (forme, matériau, couleur)
//     2. Identifier le problème technique (cassure, fuite, etc.)
//     3. Proposer 3 étapes MAX de réparation
//     4. Lister les outils nécessaires

//     FORMAT DE RÉPONSE EXACT :
//     ||OBJET|| [description technique]
//     ||PROBLÈME|| [diagnostic précis]
//     ||RÉPARATION|| 1. [étape 1] 2. [étape 2] 3. [étape 3]
//     ||OUTILS|| [liste technique]

//     SI TU NE VOIS PAS D'OBJET À RÉPARER, RÉPONDRE :
//     ||ERREUR|| Photo non analysable

//     EXEMPLE POUR UN VASE CASSÉ :
//     ||OBJET|| Vase en céramique haute de 30cm, émaillage blanc
//     ||PROBLÈME|| Cassure nette à la base avec 2 morceaux détachés
//     ||RÉPARATION|| 1. Nettoyer les bords 2. Appliquer colle epoxy 3. Maintenir 24h
//     ||OUTILS|| Colle epoxy, serre-joints, pinceau
//     `;

//     // 3. Appel API avec zero tolérance
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4-vision-preview', // Meilleur modèle visuel
//       messages: [
//         {
//           role: 'system',
//           content: 'Tu es un expert en réparation. Réponds UNIQUEMENT dans le format demandé.'
//         },
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: REPAIR_PROMPT },
//             { 
//               type: 'image_url',
//               image_url: `data:image/jpeg;base64,${imageData}`
//             }
//           ]
//         }
//       ],
//       max_tokens: 500,
//       temperature: 0 // Aucune imagination
//     });

//     // 4. Parsing brutal des réponses
//     const parseResponse = (text) => {
//       const error = text.includes('||ERREUR||');
//       return {
//         objet: error ? null : text.split('||OBJET||')[1]?.split('||')[0]?.trim(),
//         probleme: error ? null : text.split('||PROBLÈME||')[1]?.split('||')[0]?.trim(),
//         reparation: error ? null : text.split('||RÉPARATION||')[1]?.split('||')[0]?.trim(),
//         outils: error ? null : text.split('||OUTILS||')[1]?.trim(),
//         error: error ? text.split('||ERREUR||')[1]?.trim() : null
//       };
//     };

//     const { objet, probleme, reparation, outils, error } = parseResponse(response.choices[0].message.content);

//     // 5. Gestion des erreurs
//     if (error || !objet) {
//       return {
//         error: error || "Objet non identifiable",
//         conseil: "Prenez la photo sous meilleur éclairage, objet bien visible"
//       };
//     }

//     // 6. Recherche vidéo ultra-ciblée
//     const videos = await searchRepairVideos(`${objet.split(' ')[0]} réparation ${probleme.split(' ')[0]}`);

//     return {
//       objet: objet,
//       probleme: probleme,
//       solution: reparation,
//       outils: outils,
//       videos: videos.filter(v => !v.title.includes('?')) // Filtre les mauvais résultats
//     };

//   } catch (error) {
//     console.error('ERREUR CRITIQUE:', error);
//     return {
//       error: "Service indisponible",
//       details: "Réessayez dans 5 minutes"
//     };
//   }
// };


// const fs = require('fs');
// const { openai } = require('./openaiService');
// const { searchRepairVideos } = require('./youtubeService');

// exports.detectObject = async (filePath) => {
//   try {
//     // 1. Chargement de l'image
//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     // 2. Prompt optimisé pour GPT-4o
//     const REPAIR_PROMPT = `
//     Analyse cette image d'objet à réparer en répondant STRICTEMENT dans ce format :

//     [OBJET] Description technique (matériau, dimensions visibles)
//     [PROBLEME] Diagnostic précis (type de dommage)
//     [REPARATION] 3 étapes MAX avec :
//     1. Étape 1
//     2. Étape 2
//     3. Étape 3
//     [OUTILS] Liste technique

//     Exemple :
//     [OBJET] Vase en céramique (30cm), émaillage blanc
//     [PROBLEME] Cassure nette avec 2 fragments détachés
//     [REPARATION] 
//     1. Nettoyer les bords
//     2. Appliquer colle epoxy
//     3. Maintenir 24h sous pression
//     [OUTILS] Colle epoxy, serre-joints, pinceau fin
//     `;

//     // 3. Appel API avec le nouveau modèle
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'system',
//           content: 'Tu es un expert en réparation. Sois technique et concis.'
//         },
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: REPAIR_PROMPT },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: `data:${mimetype};base64,${imageData}`
//               }
//             }

//           ]
//         }
//       ],
//       max_tokens: 1000,
//       temperature: 0.2
//     });

//     // 4. Extraction des données
//     const extractData = (text) => {
//       const result = {
//         objet: text.match(/\[OBJET\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         probleme: text.match(/\[PROBLEME\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         reparation: text.match(/\[REPARATION\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         outils: text.match(/\[OUTILS\](.+?)(?=\[|$)/s)?.[1]?.trim()
//       };

//       if (!result.objet) throw new Error('Format de réponse invalide');
//       return result;
//     };

//     const rawText = response.choices[0].message.content;
//     console.log("Réponse GPT brute :", rawText);
//     const { objet, probleme, reparation, outils } = extractData(response.choices[0].message.content);

//     // 5. Recherche vidéo
//     const videos = await searchRepairVideos(`${objet.split(' ')[0]} réparation`);

//     return {
//       success: true,
//       objet,
//       probleme,
//       solution: reparation,
//       outils,
//       videos: videos.slice(0, 3) // Limite à 3 résultats
//     };

//   } catch (error) {
//     console.error('Erreur:', error.message);
//     return {
//       success: false,
//       error: error.response?.data?.error?.message || error.message,
//       conseil: "Essayez avec une photo plus nette ou précisez la description"
//     };
//   }
// };






// const fs = require('fs');
// const { openai, extractKeywordFromText } = require('./openaiService');
// const { searchRepairVideos } = require('./youtubeService');

// exports.detectObject = async (filePath, mimetype) => {
//   try {
//     // 1. Chargement de l'image
//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     // 2. Prompt optimisé pour GPT-4o
//     const REPAIR_PROMPT = `
//     Analyse cette image d'objet à réparer en répondant STRICTEMENT dans ce format :

//     [OBJET] Description technique (matériau, dimensions visibles)
//     [PROBLEME] Diagnostic précis (type de dommage)
//     [REPARATION] 3 étapes MAX avec :
//     1. Étape 1
//     2. Étape 2
//     3. Étape 3
//     [OUTILS] Liste technique

//     Exemple :
//     [OBJET] Vase en céramique (30cm), émaillage blanc
//     [PROBLEME] Cassure nette avec 2 fragments détachés
//     [REPARATION] 
//     1. Nettoyer les bords
//     2. Appliquer colle epoxy
//     3. Maintenir 24h sous pression
//     [OUTILS] Colle epoxy, serre-joints, pinceau fin
//     `;

//     // 3. Appel API OpenAI
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'system',
//           content: 'Tu es un expert en réparation. Sois technique et concis.'
//         },
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: REPAIR_PROMPT },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: `data:${mimetype};base64,${imageData}`
//               }
//             }
//           ]
//         }
//       ],
//       max_tokens: 1000,
//       temperature: 0.2
//     });

//     // 4. Extraction des données
//     const extractData = (text) => {
//       const result = {
//         objet: text.match(/\[OBJET\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         probleme: text.match(/\[PROBLEME\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         reparation: text.match(/\[REPARATION\](.+?)(?=\[|$)/s)?.[1]?.trim(),
//         outils: text.match(/\[OUTILS\](.+?)(?=\[|$)/s)?.[1]?.trim()
//       };

//       if (!result.objet) throw new Error('Format de réponse invalide');
//       return result;
//     };

//     const rawText = response.choices[0].message.content;
//     console.log("Réponse GPT brute :", rawText);

//     const { objet, probleme, reparation, outils } = extractData(rawText);

//     // 5. Recherche vidéo
//     // const videos = await searchRepairVideos(`${objet.split(' ')[0]} réparation`);
//      const keyword = await extractKeywordFromText(rawText);
//      const videos = await searchRepairVideos(`${keyword} réparation`);

//     return {
//       success: true,
//       objet,
//       probleme,
//       solution: reparation,
//       outils,
//       keyword,
//       videos: videos.slice(0, 3) // Limite à 3 résultats
//     };

//   } catch (error) {
//     console.error('Erreur:', error.message);
//     return {
//       success: false,
//       error: error.response?.data?.error?.message || error.message,
//       conseil: "Essayez avec une photo plus nette ou précisez la description"
//     };
//   }
// };






const fs = require('fs');
const { openai, extractKeywordFromText } = require('./openaiService');
const { searchRepairVideos } = require('./youtubeService');

exports.detectObject = async (filePath, mimetype) => {
  try {
    // 1. Chargement de l'image
    const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

    // 2. Prompt optimisé sans ```markdown```
    const REPAIR_PROMPT = `
Analyse cette image d'objet à réparer en répondant dans ce format :

[OBJET] Description technique (matériau, dimensions visibles)
[PROBLEME] Diagnostic précis (type de dommage)
[REPARATION] 3 étapes MAX avec :
1. Étape 1
2. Étape 2
3. Étape 3
[OUTILS] Liste technique

Exemple :
[OBJET] Vase en céramique (30cm), émaillage blanc
[PROBLEME] Cassure nette avec 2 fragments détachés
[REPARATION]
1. Nettoyer les bords
2. Appliquer colle epoxy
3. Maintenir 24h sous pression
[OUTILS] Colle epoxy, serre-joints, pinceau fin
`;

    // 3. Appel API OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en réparation. Sois technique et concis.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: REPAIR_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimetype};base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.2
    });

    // 4. Nettoyage et extraction
    let rawText = response.choices[0].message.content;
    console.log("Réponse GPT brute :", rawText);

    // Supprime les ```markdown``` s'ils sont présents
    if (rawText.includes('```')) {
      rawText = rawText.replace(/```(?:plaintext)?\n?/g, '').replace(/```$/, '').trim();
    }

    console.log("🧼 Texte nettoyé :", rawText);

    const extractData = (text) => {
      const result = {
        objet: text.match(/\[OBJET\](.+?)(?=\[|$)/s)?.[1]?.trim(),
        probleme: text.match(/\[PROBLEME\](.+?)(?=\[|$)/s)?.[1]?.trim(),
        reparation: text.match(/\[REPARATION\](.+?)(?=\[|$)/s)?.[1]?.trim(),
        outils: text.match(/\[OUTILS\](.+?)(?=\[|$)/s)?.[1]?.trim()
      };

      if (!result.objet) throw new Error('Format de réponse invalide');
      return result;
    };

    const { objet, probleme, reparation, outils } = extractData(rawText);

    // 5. Recherche vidéo
    const keyword = await extractKeywordFromText(rawText);
    const videos = await searchRepairVideos(`${keyword} réparation`);

    return {
      success: true,
      objet,
      probleme,
      solution: reparation,
      outils,
      keyword,
      videos: videos.slice(0, 3)
    };

  } catch (error) {
    console.error('Erreur:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      conseil: "Essayez avec une photo plus nette ou précisez la description"
    };
  }
};
