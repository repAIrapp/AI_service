
// require('dotenv').config();
// const fs = require('fs');
// const { OpenAI } = require("openai");

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// // fonction pour analyse d'image
// async function analyzeImageWithOpenAI(imagePath) {
//   try {
//     const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

//     const response = await openai.chat.completions.create({
//       model: "gpt-4-turbo",
//       messages: [
//         {
//           role: "user",
//           content: [
//             {
//               type: "text",
//               text: "Décris ce que tu vois sur cette image et détecte tout problème visible."
//             },
//             {
//               type: "image_url",
//               image_url: {
//                 url: `data:image/jpeg;base64,${imageData}`
//               }
//             }
//           ]
//         }
//       ],
//       max_tokens: 500
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error("Erreur API OpenAI :", error);
//     throw new Error('Erreur analyse image OpenAI.');
//   }
// }

// // Fonction pour analyse de texte
// async function askOpenAI(text) {
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4-turbo",
//       messages: [
//         {
//           role: "user",
//           content: text
//         }
//       ],
//       max_tokens: 500
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error("Erreur API OpenAI :", error);
//     throw new Error('Erreur analyse texte OpenAI.');
//   }
// }

// async function extractKeywordFromText(description) {
//   const prompt = `Donne un seul mot-clé simple et pertinent pour résumer l'objet cassé décrit ici (par exemple : pot, tasse, verre, vase, etc) :\n\n${description}`;
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4-turbo',
//     messages: [{ role: 'user', content: prompt }],
//     max_tokens: 20
//   });
//   return response.choices[0].message.content.trim().toLowerCase();
// }
// module.exports = {
//   openai,
//   analyzeImageWithOpenAI,
//   askOpenAI,
//   extractKeywordFromText
// };


require('dotenv').config();
const fs = require('fs');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Image seule (conserve ton ancienne fonction) ---
async function analyzeImageWithOpenAI(imagePath) {
  try {
    const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Décris ce que tu vois sur cette image et détecte tout problème visible.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` } }
          ]
        }
      ],
      max_tokens: 500
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Erreur API OpenAI :', error);
    throw new Error('Erreur analyse image OpenAI.');
  }
}

// --- Texte seul ---
async function askOpenAI(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: text }],
      max_tokens: 500
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Erreur API OpenAI :', error);
    throw new Error('Erreur analyse texte OpenAI.');
  }
}

// --- Mot-clé simple (déjà existant) ---
async function extractKeywordFromText(description) {
  const prompt = `Donne un seul mot-clé simple et pertinent pour résumer l'objet cassé décrit ici (ex: pot, tasse, verre, vase, chauffe-eau, etc) :\n\n${description}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 20
  });
  return response.choices[0].message.content.trim().toLowerCase();
}

// --- NOUVEAU : extraction riche pour la recherche YouTube ---
async function extractSearchTerms(text) {
  const prompt = `
Tu lis une analyse de réparation. Donne un JSON compact avec ces champs :
{
 "object": "nom simple de l'objet (ex: chauffe-eau)",
 "synonyms": ["synonymes FR/EN utiles (ex: ballon d'eau chaude, water heater, boiler)"],
 "issue": "panne/défaut (ex: fuite, ne chauffe plus, thermostat)",
 "parts": ["pièces/composants si utiles (ex: résistance, anode, thermostat)"],
 "brands": ["marques ou modèles s'il y en a"],
 "actions": ["verbes utiles: réparer, dépanner, remplacer, fix, repair, troubleshooting"]
}
Ne mets rien d'autre que du JSON.
Texte:
${text}
`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.2
  });

  const raw = (response.choices?.[0]?.message?.content || '').trim();
  try {
    const json = JSON.parse(raw);
    json.object ||= '';
    json.synonyms ||= [];
    json.issue ||= '';
    json.parts ||= [];
    json.brands ||= [];
    json.actions ||= ['réparer','dépannage','remplacer','changer','tutoriel','fix','repair','troubleshooting'];
    return json;
  } catch {
    return {
      object: text.slice(0, 40),
      synonyms: [],
      issue: '',
      parts: [],
      brands: [],
      actions: ['réparer','dépannage','remplacer','changer','tutoriel','fix','repair','troubleshooting']
    };
  }
}

// ✅ bien exporter TOUTES les fonctions, y compris extractSearchTerms
module.exports = {
  openai,
  analyzeImageWithOpenAI,
  askOpenAI,
  extractKeywordFromText,
  extractSearchTerms
};
