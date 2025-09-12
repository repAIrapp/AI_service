const fs = require('fs');
//const path = require('path');
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
