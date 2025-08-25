// Mock fs
jest.mock('fs', () => ({ readFileSync: jest.fn(() => 'IMG64') }));

// Mock openaiService (openai + extractKeywordFromText)
const createMock = jest.fn();
// eslint-disable-next-line no-unused-vars
const openAIInstance = { chat: { completions: { create: createMock } } };
jest.mock('../src/services/openaiService', () => ({
  openai: { chat: { completions: { create: jest.fn() } } }, // on remplace après
  extractKeywordFromText: jest.fn(),
}));
const openaiSvc = require('../src/services/openaiService');
openaiSvc.openai.chat.completions.create = createMock;

// Mock youtubeService
jest.mock('../src/services/youtubeService', () => ({
  searchRepairVideos: jest.fn(),
}));
const { searchRepairVideos } = require('../src/services/youtubeService');

const { detectObject } = require('../src/services/visionService');
const fs = require('fs');

describe('visionService.detectObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne un objet structuré (succès complet)', async () => {
    // Réponse “markdown-like” de l’IA
    createMock.mockResolvedValueOnce({
      choices: [{
        message: { content:
`[OBJET] Vase en céramique
[PROBLEME] Cassure nette
[REPARATION]
1. Étape 1
2. Étape 2
3. Étape 3
[OUTILS] Colle, pinceau` },
      }],
    });
    // mot-clé & vidéos
    const extractKeywordFromText = require('../src/services/openaiService').extractKeywordFromText;
    extractKeywordFromText.mockResolvedValue('vase');
    searchRepairVideos.mockResolvedValue([
      { title: 'vid1', url: 'u1', thumbnail: 't1' },
      { title: 'vid2', url: 'u2', thumbnail: 't2' },
      { title: 'vid3', url: 'u3', thumbnail: 't3' },
      { title: 'vid4', url: 'u4', thumbnail: 't4' },
    ]);

    const res = await detectObject('/tmp/file.jpg', 'image/jpeg');

    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/file.jpg', { encoding: 'base64' });
    expect(createMock).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(res.objet).toMatch(/Vase/);
    expect(res.probleme).toMatch(/Cassure/);
    expect(res.solution).toMatch(/Étape 1/);
    expect(res.outils).toMatch(/Colle/);
    expect(res.keyword).toBe('vase');
    expect(res.videos).toHaveLength(3); // tronqué à 3
  });

  test('retourne une erreur propre si OpenAI jette', async () => {
    createMock.mockRejectedValueOnce(new Error('down'));
    const res = await detectObject('/tmp/file.jpg', 'image/jpeg');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/down/);
  });

  test('retourne erreur si format IA invalide', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'réponse sans balises' } }],
    });
    const res = await detectObject('/tmp/file.jpg', 'image/jpeg');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Format de réponse invalide|réponse/);
  });
});
