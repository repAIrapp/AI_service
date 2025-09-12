
// const fs = require('fs');
// const { openai, extractKeywordFromText } = require('./openaiService');
// const { searchRepairVideos } = require('./youtubeService');

// /**
//  * Analyse une image d'objet endommagé.
//  * Si userText est fourni, il est utilisé comme contexte complémentaire.
//  */
// exports.detectObject = async (filePath, mimetype, userText = "") => {
//   try {
//     const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

//     // --- PROMPT JSON-first ---
//     const REPAIR_PROMPT = `
// Analyse cette image d'objet endommagé.
// Retourne UNIQUEMENT du JSON valide avec ce format exact :

// {
//   "objet": "description technique (matériau, dimensions visibles)",
//   "probleme": "diagnostic précis (type de dommage)",
//   "reparation": ["étape 1", "étape 2", "étape 3"],
//   "outils": ["outil1", "outil2"]
// }

// Règles :
// - Pas d'autres textes, pas de Markdown, pas de balises, uniquement du JSON.
// - Sois concis, technique, mais clair.
// ${userText ? `\nContexte utilisateur : ${userText}` : ""}
// `;

//     const userContent = [
//       { type: 'text', text: REPAIR_PROMPT.trim() },
//       {
//         type: 'image_url',
//         image_url: { url: `data:${mimetype};base64,${imageData}` }
//       }
//     ];

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         { role: 'system', content: 'Tu es un expert en réparation.' },
//         { role: 'user', content: userContent }
//       ],
//       max_tokens: 700,
//       temperature: 0.2
//     });

//     let rawText = (response.choices[0].message.content || '').trim();

//     let objet, probleme, reparation, outils;

//     // --- Essai JSON parse ---
//     try {
//       const parsed = JSON.parse(rawText);
//       objet = parsed.objet;
//       probleme = parsed.probleme;
//       reparation = Array.isArray(parsed.reparation) ? parsed.reparation.join('\n') : parsed.reparation;
//       outils = Array.isArray(parsed.outils) ? parsed.outils.join(', ') : parsed.outils;
//     } catch (err) {
      
//       if (rawText.includes('```')) {
//         rawText = rawText.replace(/```(?:json|plaintext)?\n?/gi, '').replace(/```$/g, '').trim();
//       }

//       objet = rawText.match(/\[?OBJET\]?[:\-]?\s*(.+?)(?=\[|$)/is)?.[1]?.trim();
//       probleme = rawText.match(/\[?PROBLEME\]?[:\-]?\s*(.+?)(?=\[|$)/is)?.[1]?.trim();
//       reparation = rawText.match(/\[?REPARATION\]?[:\-]?\s*(.+?)(?=\[|$)/is)?.[1]?.trim();
//       outils = rawText.match(/\[?OUTILS\]?[:\-]?\s*(.+?)(?=\[|$)/is)?.[1]?.trim();

//       if (!objet) throw new Error('Format de réponse invalide');
//     }

//     // Recherche vidéos avec contexte enrichi
//     const keyword = await extractKeywordFromText(`${objet} ${probleme}`);
//     const videos = await searchRepairVideos(`${keyword} réparation`);

//     return {
//       success: true,
//       objet,
//       probleme,
//       solution: reparation,
//       outils,
//       keyword,
//       videos: videos.slice(0, 3),
//       raw: rawText
//     };

//   } catch (error) {
//     console.error('Erreur detectObject:', error.message);
//     return {
//       success: false,
//       error: error.response?.data?.error?.message || error.message,
//       conseil: "Essayez avec une photo plus nette ou ajoutez/affinez le texte explicatif."
//     };
//   }
// };




const fs = require('fs');
const path = require('path');
const { analyzeImageToJson } = require('./openaiService');

// Analyse image -> JSON structuré multi-domaines
exports.detectObject = async (filePath, mimetype, userText = '') => {
  try {
    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const data = await analyzeImageToJson({
      imageBase64WithPrefix: `data:${mimetype};base64,${base64}`,
      mimetype,
      userText
    });

    // mise en forme pour la réponse actuelle du contrôleur
    const solutionSteps = Array.isArray(data.solution_steps) ? data.solution_steps : [];
    const tools = Array.isArray(data.tools_needed) ? data.tools_needed : [];

    return {
      success: true,
      objet:
        data.device?.class
          ? `${data.device.class}${data.device?.approx_size ? ` ${data.device.approx_size}` : ''}`
          : 'objet',
      probleme: data.problem_summary || data.diagnosis || 'problème non précisé',
      solution: solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      outils: tools.join(', '),
      keyword: data.device?.class || 'objet',
      raw: data,
      device: data.device || {},
      search_intent: data.search_intent || { queries: [], must_include: [], must_exclude: [] }
    };
  } catch (error) {
    console.error('Erreur detectObject:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      conseil:
        'Essayez une photo JPEG ≤ 2 Mo, nette et bien cadrée, ou ajoutez du texte explicatif.'
    };
  }
};
