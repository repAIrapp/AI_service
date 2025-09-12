// require('dotenv').config();
// const fs = require('fs');
// const { OpenAI } = require('openai');

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// async function analyzeImageWithOpenAI(imagePath) {
//   try {
//     const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: 'Décris ce que tu vois sur cette image et détecte tout problème visible.' },
//             { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` } }
//           ]
//         }
//       ],
//       max_tokens: 500
//     });
//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error('Erreur API OpenAI :', error);
//     throw new Error('Erreur analyse image OpenAI.');
//   }
// }

// // --- Texte seul ---
// async function askOpenAI(text) {
//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4-turbo',
//       messages: [{ role: 'user', content: text }],
//       max_tokens: 500
//     });
//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error('Erreur API OpenAI :', error);
//     throw new Error('Erreur analyse texte OpenAI.');
//   }
// }


// async function extractKeywordFromText(description) {
//   const prompt = `Donne un seul mot-clé simple et pertinent pour résumer l'objet cassé décrit ici (ex: pot, tasse, verre, vase, chauffe-eau, etc) :\n\n${description}`;
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4-turbo',
//     messages: [{ role: 'user', content: prompt }],
//     max_tokens: 20
//   });
//   return response.choices[0].message.content.trim().toLowerCase();
// }

// async function extractSearchTerms(text) {
//   const prompt = `
// Tu lis une analyse de réparation. Donne un JSON compact avec ces champs :
// {
//  "object": "nom simple de l'objet (ex: chauffe-eau)",
//  "synonyms": ["synonymes FR/EN utiles (ex: ballon d'eau chaude, water heater, boiler)"],
//  "issue": "panne/défaut (ex: fuite, ne chauffe plus, thermostat)",
//  "parts": ["pièces/composants si utiles (ex: résistance, anode, thermostat)"],
//  "brands": ["marques ou modèles s'il y en a"],
//  "actions": ["verbes utiles: réparer, dépanner, remplacer, fix, repair, troubleshooting"]
// }
// Ne mets rien d'autre que du JSON.
// Texte:
// ${text}
// `;
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4-turbo',
//     messages: [{ role: 'user', content: prompt }],
//     max_tokens: 200,
//     temperature: 0.2
//   });

//   const raw = (response.choices?.[0]?.message?.content || '').trim();
//   try {
//     const json = JSON.parse(raw);
//     json.object ||= '';
//     json.synonyms ||= [];
//     json.issue ||= '';
//     json.parts ||= [];
//     json.brands ||= [];
//     json.actions ||= ['réparer','dépannage','remplacer','changer','tutoriel','fix','repair','troubleshooting'];
//     return json;
//   } catch {
//     return {
//       object: text.slice(0, 40),
//       synonyms: [],
//       issue: '',
//       parts: [],
//       brands: [],
//       actions: ['réparer','dépannage','remplacer','changer','tutoriel','fix','repair','troubleshooting']
//     };
//   }
// }

// module.exports = {
//   openai,
//   analyzeImageWithOpenAI,
//   askOpenAI,
//   extractKeywordFromText,
//   extractSearchTerms
// };




require('dotenv').config();
const { OpenAI } = require('openai');

// Client OpenAI (SDK officiel)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// —————————————————————————————————————————————————————————————————————
// Utilitaires communs
const BASE_SYSTEM = 'Tu es un technicien de réparation. Réponds UNIQUEMENT en JSON strict. Pas d’URL. Pas de Markdown.';
const RESPONSE_FORMAT = { type: 'json_object' };
const TEMPERATURE = 0.2;
const MAX_TOKENS = 900;

// Schéma attendu (documentation pour le prompt)
const SCHEMA_TEXT = `
Schéma EXACT à respecter (toutes les valeurs textuelles en FR, snake_case) :
{
  "device": {
    "domain": "electromenager | plomberie | electricite | electronique | mobilier | vehicule | outil | cvc | autre",
    "class": "ex: chauffe_eau | televiseur | chaise | velo | robinet | lave_linge | autre",
    "subcategory": "ex: electrique | gaz | ballon | instantane | led | bois | acier | inconnu",
    "brand": "string|null",
    "model": "string|null",
    "approx_size": "string|null"
  },
  "problem_summary": "string",
  "diagnosis": "string",
  "not_repairable": false,
  "solution_steps": ["string", "..."],
  "tools_needed": ["string"],
  "safety_warnings": ["string"],
  "hazards": ["electricite","gaz","eau","coupure","lourd","pression","chimique"],
  "search_intent": {
    "queries": ["string"],
    "must_include": ["string"],
    "must_exclude": ["string"]
  },
  "confidence": { "vision": 0.0, "text": 0.0, "overall": 0.0 }
}

Règles:
- Pas d'URL. Pas de markdown. Sortie = JSON pur.
- Utilise la terminologie FR (ex: "chauffe_eau", "lignes verticales tv", "groupe de securite").
- Les "queries" doivent être en FR et spécifiques (ex: "chauffe eau fuite base", "remplacer anode magnesium", "groupe de securite fuite").
`;

// —————————————————————————————————————————————————————————————————————
// Image -> JSON complet (vision)
async function analyzeImageToJson({ imageBase64WithPrefix, mimetype, userText = '' }) {
  const userParts = [
    { type: 'text', text: `
Analyse l'image d'un objet potentiellement endommagé${userText ? ` avec ce contexte: ${userText}` : ''}.
${SCHEMA_TEXT}
` },
    { type: 'image_url', image_url: { url: imageBase64WithPrefix || `data:${mimetype};base64,` } }
  ];

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: RESPONSE_FORMAT,
    messages: [
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user', content: userParts }
    ]
  });

  const content = (resp.choices?.[0]?.message?.content || '').trim();
  return JSON.parse(content); // Lève si invalide → catch au dessus
}

// Texte -> JSON complet (même schéma)
async function analyzeTextToJson(text) {
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: RESPONSE_FORMAT,
    messages: [
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user', content: `Transforme ce texte utilisateur en JSON selon le schéma ci-dessous.\n${SCHEMA_TEXT}\n\nTexte:\n${text}` }
    ]
  });
  const content = (resp.choices?.[0]?.message?.content || '').trim();
  return JSON.parse(content);
}

// —————————————————————————————————————————————————————————————————————
// Fonctions héritées (gardées pour compat si tu en as besoin ailleurs)
async function askOpenAI(text) {
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: text }],
    max_tokens: 500,
    temperature: TEMPERATURE
  });
  return resp.choices[0].message.content;
}

async function extractKeywordFromText(description) {
  const prompt = `Donne un seul mot-clé simple et pertinent pour résumer l'objet décrit (ex: pot, tasse, chauffe-eau, téléviseur, vélo, robinet, etc). Texte:\n${description}`;
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 20,
    temperature: 0
  });
  return (resp.choices[0].message.content || '').trim().toLowerCase();
}

module.exports = {
  openai,
  analyzeImageToJson,
  analyzeTextToJson,
  askOpenAI,
  extractKeywordFromText
};
