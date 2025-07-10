const fs = require('fs');
const { openai, extractKeywordFromText } = require('./openaiService');
const { searchRepairVideos } = require('./youtubeService');

exports.detectObject = async (filePath, mimetype) => {
  try {
    // 1. chargement de l'image
    const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

    
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

    // 3. appel API OpenAI
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

    // 4. nettoyage et extraction
    let rawText = response.choices[0].message.content;
    // supprime les ```markdown``` s'ils sont présents
    if (rawText.includes('```')) {
      rawText = rawText.replace(/```(?:plaintext)?\n?/g, '').replace(/```$/, '').trim();
    }

    

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
