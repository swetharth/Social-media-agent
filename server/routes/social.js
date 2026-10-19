/**
 * Social Data Routes — Multichannel data fetch, trending, competitor
 */
const express = require('express');
const router = express.Router();
const social = require('../services/social');

/**
 * GET /api/social/feed
 * Unified multichannel feed
 */
router.get('/feed', async (req, res) => {
  try {
    const { query = 'marketing', limit = 20 } = req.query;
    const data = await social.fetchAllPlatforms(query);
    res.json({
      query,
      feed: data.unified.slice(0, parseInt(limit)),
      counts: {
        twitter: data.twitter.length,
        linkedin: data.linkedin.length,
        instagram: data.instagram.length,
        facebook: data.facebook.length,
        total: data.unified.length
      },
      fetchedAt: data.fetchedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Feed fetch failed', details: err.message });
  }
});

/**
 * GET /api/social/feed/:platform
 * Single platform feed
 */
router.get('/feed/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { query = 'marketing' } = req.query;
    const fetchers = {
      twitter: social.fetchTwitterData,
      linkedin: social.fetchLinkedInData,
      instagram: social.fetchInstagramData,
      facebook: social.fetchFacebookData
    };

    const fetcher = fetchers[platform];
    if (!fetcher) return res.status(400).json({ error: 'Invalid platform' });

    const data = await fetcher(query);
    res.json({ platform, posts: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Platform feed failed', details: err.message });
  }
});

/**
 * GET /api/social/trending
 * Trending hashtags and topics
 */
router.get('/trending', async (req, res) => {
  try {
    const { platform = 'all' } = req.query;
    const hashtags = await social.fetchTrendingHashtags(platform);
    res.json({ platform, trending: hashtags });
  } catch (err) {
    res.status(500).json({ error: 'Trending fetch failed', details: err.message });
  }
});

/**
 * POST /api/social/competitors
 * Competitor data and intelligence
 */
router.post('/competitors', async (req, res) => {
  try {
    const { handles } = req.body;
    if (!handles?.length) return res.status(400).json({ error: 'handles array required' });

    const data = await social.fetchCompetitorData(handles);
    res.json({ competitors: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Competitor fetch failed', details: err.message });
  }
});

module.exports = router;
