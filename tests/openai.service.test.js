// tests/openai.service.test.js

// Mock fs (lecture d'image en base64)
jest.mock('fs', () => ({ readFileSync: jest.fn(() => 'BASE64DATA') }));

// Mock OpenAI: on expose un constructeur mock (jest.fn())
// et on garde une référence sur la méthode `create`
jest.mock('openai', () => {
  const create = jest.fn(); // <- on contrôlera ce mock dans les tests
  const OpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create } },
  }));
  return { OpenAI, __mock: { create } };
});

const fs = require('fs');
const { __mock: openaiMock } = require('openai');

// IMPORTANT: importer le service APRÈS les mocks
const {
  analyzeImageWithOpenAI,
  askOpenAI,
  extractKeywordFromText,
} = require('../src/services/openaiService');

describe('openaiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('analyzeImageWithOpenAI retourne le texte du 1er choix', async () => {
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'analyse ok' } }],
    });

    const res = await analyzeImageWithOpenAI('/fake/path.jpg');

    expect(fs.readFileSync).toHaveBeenCalledWith('/fake/path.jpg', { encoding: 'base64' });
    expect(openaiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo',
        messages: expect.any(Array),
        max_tokens: 500,
      })
    );
    expect(res).toBe('analyse ok');
  });

  test('analyzeImageWithOpenAI jette une erreur lisible si SDK échoue', async () => {
    openaiMock.create.mockRejectedValueOnce(new Error('oops'));
    await expect(analyzeImageWithOpenAI('/x.jpg')).rejects.toThrow('Erreur analyse image OpenAI.');
  });

  test('askOpenAI retourne le contenu du 1er choix', async () => {
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'réponse texte' } }],
    });

    const res = await askOpenAI('hello');
    expect(openaiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 500,
      })
    );
    expect(res).toBe('réponse texte');
  });

  test('extractKeywordFromText renvoie le mot-clé nettoyé en minuscules', async () => {
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: '  Vase  \n' } }],
    });

    const res = await extractKeywordFromText('…');
    expect(openaiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo',
        messages: expect.any(Array),
        max_tokens: 20,
      })
    );
    expect(res).toBe('vase');
  });
});
