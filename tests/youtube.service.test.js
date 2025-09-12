// On prépare un mock de googleapis
jest.mock('googleapis', () => {
  const listMock = jest.fn();
  const youtubeMock = { search: { list: listMock } };
  return {
    google: {
      youtube: () => youtubeMock,
    },
    __mock: { listMock, youtubeMock },
  };
});

// On importe le service APRÈS le mock
const { searchRepairVideos } = require('../src/services/youtubeService');
const { __mock } = require('googleapis');
const { listMock } = __mock;

describe('youtubeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searchRepairVideos retourne une liste formatée', async () => {
    listMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Réparer une tasse',
              thumbnails: { medium: { url: 'thumb1.jpg' } },
            },
          },
          {
            id: { videoId: 'xyz789' },
            snippet: {
              title: 'Réparer un vase',
              thumbnails: { medium: { url: 'thumb2.jpg' } },
            },
          },
        ],
      },
    });

    const res = await searchRepairVideos('tasse');
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        part: 'snippet',
        q: expect.stringContaining('comment réparer tasse'),
        maxResults: 3,
        type: 'video',
        videoEmbeddable: 'true',
      })
    );

    expect(res).toEqual([
      { title: 'Réparer une tasse', url: 'https://www.youtube.com/watch?v=abc123', thumbnail: 'thumb1.jpg' },
      { title: 'Réparer un vase', url: 'https://www.youtube.com/watch?v=xyz789', thumbnail: 'thumb2.jpg' },
    ]);
  });

  test('searchRepairVideos renvoie [] et log en cas d’erreur', async () => {
    const err = new Error('YTB down');
    listMock.mockRejectedValueOnce(err);

    const res = await searchRepairVideos('verre');
    expect(res).toEqual([]);
    expect(listMock).toHaveBeenCalled();
  });
});
