
const request = require('supertest');
const express = require('express');

// --- Mocks ---
jest.mock('../src/controllers/analyseController', () => ({
  fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true })),
}));

jest.mock('../src/middlewares/verifytoken', () =>
  jest.fn((req, res, next) => next())
);

// Mock multer qui simule aussi le parsing des champs texte
jest.mock('multer', () => {
  return () =>
    ({
      single: () => (req, _res, next) => {
        // simule le fichier
        req.file = {
          path: 'fakepath/test.jpg',
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
        };
        // simule les champs texte pour que la validation passe
        if (!req.body) req.body = {};
        if (!('userId' in req.body)) req.body.userId = 'fakeUserId';
        if (!('objectrepairedId' in req.body)) req.body.objectrepairedId = 'fakeObjectId';
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
      // on envoie quand même les champs, mais le mock assure le parsing
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
