const jwt = require('jsonwebtoken')

jest.mock('jsonwebtoken')

// ⚠️ définir avant l'import
process.env.JWT_SECRET = 'supersecret'

const verifyToken = require('../src/middlewares/verifytoken')

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe('Middleware verifyToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('❌ renvoie 401 si aucun header Authorization', () => {
    const req = { headers: {} }
    const res = createRes()
    const next = jest.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' })
    expect(next).not.toHaveBeenCalled()
  })

  test('❌ renvoie 401 si header mal formé', () => {
    const req = { headers: { authorization: 'Token abc' } }
    const res = createRes()
    const next = jest.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' })
    expect(next).not.toHaveBeenCalled()
  })

  test('✅ passe à next() si token valide', () => {
    const payload = { id: 'u123', email: 't@t.com' }
    jwt.verify.mockReturnValue(payload)

    const req = { headers: { authorization: 'Bearer validtoken' } }
    const res = createRes()
    const next = jest.fn()

    verifyToken(req, res, next)

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'supersecret')
    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalled()
  })

  test('❌ renvoie 403 si token invalide', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('bad token')
    })

    const req = { headers: { authorization: 'Bearer badtoken' } }
    const res = createRes()
    const next = jest.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide' })
    expect(next).not.toHaveBeenCalled()
  })
})
