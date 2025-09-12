const request = require('supertest');
const express = require('express');

// --- Mocks ---

// 1) express-validator doit être CHAÎNABLE (body('x').notEmpty().withMessage(...))
jest.mock('express-validator', () => {
  const makeChain = () => {
    const mw = (req, _res, next) => next();
    mw.notEmpty = () => ({ withMessage: () => mw });
    mw.optional = () => ({ isString: () => ({ withMessage: () => mw }) });
    return mw;
  };
  return {
    body: () => makeChain(),
    validationResult: () => ({ isEmpty: () => true, array: () => [] }),
  };
});

// 2) fullAnalyze bypass
jest.mock('../src/controllers/analyseController', () => ({
  fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true })),
}));

// 3) token OK
jest.mock('../src/middlewares/verifytoken', () => jest.fn((req, res, next) => next()));

// 4) quotaProxy pass-through (sinon il ferait un appel HTTP réel)
jest.mock('../src/middlewares/quotasproxy', () => ({
  quotaProxy: jest.fn((req, res, next) => next()),
}));

// 5) multer : injecte un pseudo-fichier + les champs
jest.mock('multer', () => {
  return () =>
    ({
      single: () => (req, _res, next) => {
        req.file = { path: 'fakepath/test.jpg', mimetype: 'image/jpeg', originalname: 'test.jpg' };
        req.body = { ...(req.body || {}), userId: 'fakeUserId', objectrepairedId: 'fakeObjectId' };
        next();
      },
    });
});

const analyseRoute = require('../src/routes/analyseRoute');
const { fullAnalyze } = require('../src/controllers/analyseController');

describe('analyseRoute (unit)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/analyse', analyseRoute);
  });

  test('POST /analyse/full appelle fullAnalyze et retourne 200', async () => {
    const res = await request(app)
      .post('/analyse/full')
      .set('Authorization', 'Bearer faketoken')
      .field('userId', 'fakeUserId')
      .field('objectrepairedId', 'fakeObjectId')
      .attach('photo', Buffer.from('fakeimg'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fullAnalyze).toHaveBeenCalled();
  });
});
