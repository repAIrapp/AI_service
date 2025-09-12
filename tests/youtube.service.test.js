jest.mock('googleapis', () => {
  const searchList = jest.fn();
  const videosList = jest.fn();
  const youtubeMock = { search: { list: searchList }, videos: { list: videosList } };
  return { google: { youtube: () => youtubeMock }, __mock: { searchList, videosList, youtubeMock } };
});

const { searchRepairVideos } = require('../src/services/youtubeService');
const { __mock } = require('googleapis');
const { searchList, videosList } = __mock;

describe('youtubeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // ⚠️ Le service fait 2 requêtes search.list (queries différentes) -> on renvoie un résultat par défaut pour TOUT appel
    searchList.mockResolvedValue({
      data: {
        items: [
          { id: { videoId: 'abc123' } },
          { id: { videoId: 'xyz789' } },
        ],
      },
    });

    // Et une requête videos.list pour les métadonnées
    videosList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Réparer une tasse facilement',
              description: 'Tutoriel pour réparer une tasse cassée',
              thumbnails: { medium: { url: 'thumb1.jpg' } },
            },
            status: { embeddable: true, privacyStatus: 'public' },
          },
          {
            id: 'xyz789',
            snippet: {
              title: 'Réparer un vase',
              description: 'guide complet',
              thumbnails: { medium: { url: 'thumb2.jpg' } },
            },
            status: { embeddable: true, privacyStatus: 'public' },
          },
        ],
      },
    });
  });

  test('searchRepairVideos retourne une liste formatée', async () => {
    const res = await searchRepairVideos('tasse');

    // il y a au moins un appel à search.list avec les paramètres de base attendus
    expect(searchList).toHaveBeenCalled();
    const calls = searchList.mock.calls.map(([args]) => args);
    const hasConform = calls.some(
      (o) =>
        o &&
        o.part === 'snippet' &&
        o.type === 'video' &&
        o.videoEmbeddable === 'true' &&
        typeof o.maxResults === 'number' &&
        /tasse|vase/i.test(String(o.q || ''))
    );
    expect(hasConform).toBe(true);

    // puis videos.list est appelée pour récupérer les métadonnées
    expect(videosList).toHaveBeenCalledWith(
      expect.objectContaining({ part: 'snippet,status', id: expect.any(String) })
    );

    // résultat minimal attendu : au moins 1 vidéo correctement mappée
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThanOrEqual(1);

    // la première vidéo correspondante à "tasse" doit être correctement projetée
    const first = res[0];
    expect(first).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        url: expect.stringContaining('https://www.youtube.com/watch?v='),
        thumbnail: expect.any(String),
      })
    );

    // toutes les entrées ont bien title/url/thumbnail
    for (const v of res) {
      expect(typeof v.title).toBe('string');
      expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(typeof v.thumbnail).toBe('string');
    }
  });

  test('searchRepairVideos renvoie [] en cas d’erreur', async () => {
    searchList.mockRejectedValueOnce(new Error('YTB down'));
    const res = await searchRepairVideos('verre');
    expect(searchList).toHaveBeenCalled();
    expect(res).toEqual([]);
  });
});
