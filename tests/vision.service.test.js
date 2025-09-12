jest.mock('fs', () => ({ readFileSync: jest.fn(() => 'IMG64') }))

jest.mock('../src/services/openaiService', () => ({
  analyzeImageToJson: jest.fn(),
}))
const { analyzeImageToJson } = require('../src/services/openaiService')

const { detectObject } = require('../src/services/visionService')
const fs = require('fs')

describe('visionService.detectObject', () => {
  beforeEach(() => jest.clearAllMocks())

  test('retourne un objet structuré (succès complet)', async () => {
    analyzeImageToJson.mockResolvedValueOnce({
      device: { class: 'Vase', approx_size: null },
      problem_summary: 'Cassure nette',
      diagnosis: 'Cassure nette',
      solution_steps: ['Étape 1', 'Étape 2', 'Étape 3'],
      tools_needed: ['Colle', 'Pinceau'],
      search_intent: { queries: [], must_include: [], must_exclude: [] },
    })

    const res = await detectObject('/tmp/file.jpg', 'image/jpeg')

    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/file.jpg', { encoding: 'base64' })
    expect(analyzeImageToJson).toHaveBeenCalled()
    expect(res.success).toBe(true)
    expect(res.objet).toMatch(/Vase/i)
    expect(res.probleme).toMatch(/Cassure/i)
    expect(res.solution).toMatch(/Étape 1/)
    expect(res.outils).toMatch(/Colle/)
    expect(res.keyword).toBe('Vase')
  })

  test('retourne une erreur propre si IA jette', async () => {
    analyzeImageToJson.mockRejectedValueOnce(new Error('down'))
    const res = await detectObject('/tmp/file.jpg', 'image/jpeg')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/down/)
  })

  test('retourne erreur si format IA invalide (steps/tools absents)', async () => {
    analyzeImageToJson.mockResolvedValueOnce({
      device: { class: 'X' }, // pas de steps/tools => solution/outils vides ok
    })
    const res = await detectObject('/tmp/file.jpg', 'image/jpeg')
    expect(res.success).toBe(true)
    expect(typeof res.solution).toBe('string')
    expect(typeof res.outils).toBe('string')
  })
})
