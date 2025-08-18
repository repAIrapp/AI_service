// tests/analyse.route.unit.test.js
const request = require('supertest');
const express = require('express');

// Mock du contrôleur
jest.mock('../src/controllers/analyseController', () => {
  return {
    fullAnalyze: jest.fn((req, res) => res.status(200).json({ ok: true })),
  };
});

// Mock du middleware (toujours passe)
jest.mock('../src/middlewares/verifytoken', () => jest.fn((req, res, next) => next()));

const analyseRoute = require('../src/routes/analyseRoute');
const { fullAnalyze } = require('../src/controllers/analyseController');

describe('analyseRoute (unit)', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/analyse', analyseRoute);
    jest.clearAllMocks();
  });

  test('POST /analyse/full appelle fullAnalyze et retourne 200', async () => {
    const res = await request(app)
      .post('/analyse/full')
      .attach('photo', Buffer.from('fakeimg'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fullAnalyze).toHaveBeenCalled();
  });
});
