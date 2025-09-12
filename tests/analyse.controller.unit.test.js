const { fullAnalyze } = require('../src/controllers/analyseController')

// Mocks des dépendances
jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('../src/services/visionService', () => ({ detectObject: jest.fn() }))
jest.mock('../src/services/openaiService', () => ({
  analyzeTextToJson: jest.fn(),
}))
jest.mock('../src/services/youtubeService', () => ({ searchRepairVideos: jest.fn() }))

const axios = require('axios')
const { detectObject } = require('../src/services/visionService')
const { analyzeTextToJson } = require('../src/services/openaiService')
const { searchRepairVideos } = require('../src/services/youtubeService')

// utilitaire de réponse Express mockée
function createRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

describe('analyseController.fullAnalyze (unit)', () => {
  const DB_URL = 'http://db.example'
  const token = 'Bearer abc.123'

  beforeEach(() => {
    process.env.DB_SERVICE_URL = DB_URL
    jest.clearAllMocks()
  })

  test('avec image: detectObject -> YouTube -> DB -> 200', async () => {
    const req = {
      body: { userId: 'u1', objectrepairedId: 'obj1' },
      headers: { authorization: token },
      file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg' },
    }
    const res = createRes()

    // 👇 Le contrôleur attend detection.success === true et device.class pour objet_detecte
    detectObject.mockResolvedValue({
      success: true,
      objet: 'vase en céramique',
      probleme: 'cassure',
      solution: '1. Coller\n2. Maintenir\n3. Sécher',
      outils: 'colle epoxy',
      device: { class: 'vase_en_ceramique' }, // <- utilisé pour objet_detecte
      raw: null,
      search_intent: { queries: [], must_include: [], must_exclude: [] },
    })

    searchRepairVideos.mockResolvedValue([
      { title: 'Fix vase', url: 'https://y.t/1' },
      { title: 'Glue tips', url: 'https://y.t/2' },
    ])
    axios.post.mockResolvedValue({ status: 201 })

    await fullAnalyze(req, res)

    // DB post
    expect(axios.post).toHaveBeenCalledWith(
      `${DB_URL}/api/ia-requests`,
      expect.objectContaining({
        userId: 'u1',
        objectrepairedId: 'obj1',
        imageUrl: '/tmp/img.jpg',
        text: expect.stringContaining('[OBJET] vase en céramique'),
        resultIA: expect.stringContaining('1. Coller'),
      }),
      { headers: { Authorization: token } }
    )

    // YouTube appelé avec un contexte (device.class présent)
    expect(searchRepairVideos).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.objectContaining({ class: expect.any(String) }),
      })
    )

    // réponse front
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'vase_en_ceramique', // ← c’est bien device.class normalisé (underscores)
      domaine: expect.any(String),
      analyse: expect.stringContaining('[PROBLEME] cassure'),
      solution: expect.stringContaining('1. Coller'),
      videos: [
        { title: 'Fix vase', url: 'https://y.t/1' },
        { title: 'Glue tips', url: 'https://y.t/2' },
      ],
    })
    expect(res.status).not.toHaveBeenCalledWith(400)
  })

  test('texte seul: analyzeTextToJson -> YouTube -> DB -> 200', async () => {
    const req = {
      body: { userId: 'u2', objectrepairedId: 'obj2', description: 'écran fissuré smartphone' },
      headers: { authorization: token },
      file: undefined,
    }
    const res = createRes()

    analyzeTextToJson.mockResolvedValue({
      device: { class: 'smartphone', domain: 'electronique' },
      problem_summary: 'écran fissuré smartphone',
      diagnosis: 'vitre endommagée',
      solution_steps: ['Remplacer la vitre', 'Nettoyer les débris'],
      tools_needed: ['tournevis', 'kit vitre'],
      search_intent: { queries: ['smartphone ecran fissure remplacer'], must_include: [], must_exclude: [] },
    })

    searchRepairVideos.mockResolvedValue([{ title: 'Fix phone', url: 'https://y.t/p' }])
    axios.post.mockResolvedValue({ status: 201 })

    await fullAnalyze(req, res)

    // YouTube reçoit un contexte (pas une simple string)
    expect(searchRepairVideos).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.objectContaining({ class: 'smartphone' }),
        problem_summary: expect.stringContaining('écran fissuré'),
      })
    )

    expect(axios.post).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'smartphone',
      domaine: 'electronique',
      analyse: expect.stringContaining('[OBJET] smartphone'),
      solution: expect.stringContaining('1. Remplacer la vitre'),
      videos: [{ title: 'Fix phone', url: 'https://y.t/p' }],
    })
  })

  test('400 si userId ou objectrepairedId manquants', async () => {
    const res = createRes()
    await fullAnalyze({ body: {}, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'userId et objectrepairedId sont requis.' })
  })

  test('400 si ni image ni description', async () => {
    const req = { body: { userId: 'u1', objectrepairedId: 'o1' }, headers: { authorization: token } }
    const res = createRes()
    await fullAnalyze(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Aucune image ou description reçue.' })
  })

  test('erreur DB (axios.post) → on log mais on répond quand même 200', async () => {
    const req = {
      body: { userId: 'u1', objectrepairedId: 'obj1', description: 'charnière cassée' },
      headers: { authorization: token },
    }
    const res = createRes()

    analyzeTextToJson.mockResolvedValue({
      device: { class: 'charniere', domain: 'mobilier' },
      problem_summary: 'charnière cassée',
      diagnosis: 'charnière cassée',
      solution_steps: ['Solution charnière…'],
      tools_needed: [],
      search_intent: { queries: [], must_include: [], must_exclude: [] },
    })
    searchRepairVideos.mockResolvedValue([{ title: 'Hinge fix', url: 'https://y.t/h' }])
    axios.post.mockRejectedValue(new Error('DB down'))

    await fullAnalyze(req, res)

    expect(axios.post).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'charniere',
      domaine: expect.any(String),
      analyse: expect.stringContaining('[OBJET] charniere'),
      solution: expect.stringContaining('Solution charnière…'),
      videos: [{ title: 'Hinge fix', url: 'https://y.t/h' }],
    })
  })
})
