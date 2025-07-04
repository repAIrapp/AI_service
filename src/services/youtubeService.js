const { google } = require('googleapis');
require('dotenv').config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YTB_API_KEY,
});

exports.searchRepairVideos = async (query) => {
  try {
    const res = await youtube.search.list({
      part: 'snippet',
      q: `comment réparer ${query}`,
      maxResults: 3,
      type: 'video',
      videoEmbeddable: 'true',
    });

    return res.data.items.map(video => ({
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      thumbnail: video.snippet.thumbnails.medium.url,
    }));
  } catch (err) {
    console.error("Erreur YouTube API:", err.message);
    return [];
  }
};
