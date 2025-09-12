jest.mock('openai', () => {
  const create = jest.fn()
  const OpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create } },
  }))
  return { OpenAI, __mock: { create } }
})
const { __mock: openaiMock } = require('openai')

const { askOpenAI, extractKeywordFromText, analyzeTextToJson } =
  require('../src/services/openaiService')

describe('openaiService', () => {
  beforeEach(() => jest.clearAllMocks())

  test('askOpenAI retourne le contenu du 1er choix', async () => {
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'réponse texte' } }],
    })
    const res = await askOpenAI('hello')
    expect(openaiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String), // gpt-4o-mini par défaut
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 500,
      })
    )
    expect(res).toBe('réponse texte')
  })

  test('extractKeywordFromText renvoie un mot-clé normalisé', async () => {
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: '  Vase Cassé  ' } }],
    })
    const res = await extractKeywordFromText('…')
    expect(typeof res).toBe('string')
    expect(res.trim().toLowerCase()).toBe('vase cassé')
  })

  test('analyzeTextToJson renvoie du JSON parsé', async () => {
    const payload = { device: { class: 'chauffe_eau' }, problem_summary: 'fuite' }
    openaiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    })
    const res = await analyzeTextToJson('mon chauffe-eau fuit')
    expect(res).toEqual(payload)
  })
})
