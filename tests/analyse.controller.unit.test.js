
const { fullAnalyze } = require('../src/controllers/analyseController')

// Mocks des dépendances
jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('../src/services/visionService', () => ({ detectObject: jest.fn() }))
jest.mock('../src/services/openaiService', () => ({ askOpenAI: jest.fn() }))
jest.mock('../src/services/youtubeService', () => ({ searchRepairVideos: jest.fn() }))

const axios = require('axios')
const { detectObject } = require('../src/services/visionService')
const { askOpenAI } = require('../src/services/openaiService')
const { searchRepairVideos } = require('../src/services/youtubeService')

// petit utilitaire de réponse Express mockée
function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe('analyseController.fullAnalyze (unit)', () => {
  const DB_URL = 'http://db.example'
  const token = 'Bearer abc.123'

  beforeEach(() => {
    process.env.DB_SERVICE_URL = DB_URL
    jest.clearAllMocks()
  })

  test(' avec image: appelle detectObject, YouTube, poste en DB et renvoie 200', async () => {
    const req = {
      body: { userId: 'u1', objectrepairedId: 'obj1' },
      headers: { authorization: token },
      file: { path: '/tmp/img.jpg', mimetype: 'image/jpeg' },
    }
    const res = createRes()

    detectObject.mockResolvedValue({
      objet: 'vase en céramique',
      probleme: 'cassure',
      solution: '1. Coller\n2. Maintenir\n3. Sécher',
      outils: 'colle epoxy',
      keyword: 'vase',
      videos: [{ url: 'https://y.t/1' }],
    })
    // le contrôleur appellera quand même searchRepairVideos(keyword)
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

    // réponse envoyée au front
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'vase en céramique', // keyword = detection.objet
      analyse: expect.stringContaining('[PROBLEME] cassure'),
      solution: expect.stringContaining('1. Coller'),
      videos: [
        { title: 'Fix vase', url: 'https://y.t/1' },
        { title: 'Glue tips', url: 'https://y.t/2' },
      ],
    })
    expect(res.status).not.toHaveBeenCalledWith(400)
  })

  test('avec description (sans image): appelle askOpenAI + YouTube et renvoie 200', async () => {
    const req = {
      body: { userId: 'u2', objectrepairedId: 'obj2', description: 'écran fissuré smartphone' },
      headers: { authorization: token },
      file: undefined,
    }
    const res = createRes()

    askOpenAI.mockResolvedValue('Remplacer la vitre en 3 étapes…')
    searchRepairVideos.mockResolvedValue([{ title: 'Fix phone', url: 'https://y.t/p' }])
    axios.post.mockResolvedValue({ status: 201 })

    await fullAnalyze(req, res)

    expect(askOpenAI).toHaveBeenCalledWith('Comment réparer : écran fissuré smartphone')
    expect(searchRepairVideos).toHaveBeenCalledWith('écran fissuré smartphone')
    expect(axios.post).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'écran fissuré smartphone',
      analyse: 'écran fissuré smartphone',
      solution: 'Remplacer la vitre en 3 étapes…',
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
    const req = {
      body: { userId: 'u1', objectrepairedId: 'o1' },
      headers: { authorization: token },
      file: undefined,
    }
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

    askOpenAI.mockResolvedValue('Solution charnière…')
    searchRepairVideos.mockResolvedValue([{ title: 'Hinge fix', url: 'https://y.t/h' }])
    axios.post.mockRejectedValue(new Error('DB down'))

    await fullAnalyze(req, res)

    expect(axios.post).toHaveBeenCalled()
    // malgré l’erreur DB, on renvoie bien la réponse front
    expect(res.json).toHaveBeenCalledWith({
      objet_detecte: 'charnière cassée',
      analyse: 'charnière cassée',
      solution: 'Solution charnière…',
      videos: [{ title: 'Hinge fix', url: 'https://y.t/h' }],
    })
  })
})
