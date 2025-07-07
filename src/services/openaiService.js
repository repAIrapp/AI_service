
require('dotenv').config();
const fs = require('fs');
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Fonction pour analyse d'image
async function analyzeImageWithOpenAI(imagePath) {
  try {
    const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Décris ce que tu vois sur cette image et détecte tout problème visible."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erreur API OpenAI :", error);
    throw new Error('Erreur analyse image OpenAI.');
  }
}

// ✅ Fonction pour analyse de texte
async function askOpenAI(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erreur API OpenAI :", error);
    throw new Error('Erreur analyse texte OpenAI.');
  }
}

async function extractKeywordFromText(description) {
  const prompt = `Donne un seul mot-clé simple et pertinent pour résumer l'objet cassé décrit ici (par exemple : pot, tasse, verre, vase, etc) :\n\n${description}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 20
  });
  return response.choices[0].message.content.trim().toLowerCase();
}
module.exports = {
  openai,
  analyzeImageWithOpenAI,
  askOpenAI,
  extractKeywordFromText
};


