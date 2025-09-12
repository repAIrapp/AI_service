const { quotaProxy } = require('../src/middlewares/quotasproxy');

jest.mock('axios', () => ({ post: jest.fn() }));
const axios = require('axios');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
}

describe('middleware quotaProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_SERVICE_URL = 'http://db.example';
  });

  test('400 si userId manquant', async () => {
    const req = { body: {}, headers: {} };
    const res = createRes();
    const next = jest.fn();

    await quotaProxy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'userId requis' });
    expect(next).not.toHaveBeenCalled();
  });

  test('succès: consomme quota, propage les headers et next()', async () => {
    const req = {
      body: { userId: 'u1' },
      headers: { authorization: 'Bearer tok' },
    };
    const res = createRes();
    const next = jest.fn();

    axios.post.mockResolvedValueOnce({
      headers: {
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '7',
      },
      data: { ok: true },
      status: 200,
    });

    await quotaProxy(req, res, next);

    expect(axios.post).toHaveBeenCalledWith(
      'http://db.example/api/quotas/consume',
      { userId: 'u1' },
      { headers: { Authorization: 'Bearer tok' } }
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '7');
    expect(next).toHaveBeenCalled();
  });

  test('429: propage headers et renvoie payload', async () => {
    const req = {
      body: { userId: 'u1' },
      headers: { authorization: 'Bearer tok' },
    };
    const res = createRes();
    const next = jest.fn();

    axios.post.mockRejectedValueOnce({
      response: {
        status: 429,
        headers: {
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '0',
        },
        data: { error: 'trop de requêtes' },
      },
    });

    await quotaProxy(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'trop de requêtes' });
    expect(next).not.toHaveBeenCalled();
  });

  test('500: erreur générique', async () => {
    const req = {
      body: { userId: 'u1' },
      headers: { authorization: 'Bearer tok' },
    };
    const res = createRes();
    const next = jest.fn();

    axios.post.mockRejectedValueOnce(new Error('boom'));

    // Mute l’erreur console pour la sortie de test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await quotaProxy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur quota' });
    expect(next).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
