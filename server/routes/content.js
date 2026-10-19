/**
 * Content Generation Routes — AI post drafting, captions, campaign ideas
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const granite = require('../services/granite');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * POST /api/content/generate
 * Generate a social media post using IBM Granite
 */
router.post('/generate', async (req, res) => {
  try {
    const { platform, topic, tone, brand, additionalContext } = req.body;
    if (!platform || !topic) {
      return res.status(400).json({ error: 'platform and topic are required' });
    }

    const post = await granite.generatePost({ platform, topic, tone, brand, additionalContext });
    res.json({
      platform,
      post,
      charCount: post.length,
      generatedAt: new Date().toISOString(),
      model: process.env.IBM_GRANITE_MODEL_ID
    });
  } catch (err) {
    console.error('[Content/generate]', err.message);
    res.status(500).json({ error: 'Content generation failed', details: err.message });
  }
});

/**
 * POST /api/content/generate-multi
 * Generate posts for multiple platforms simultaneously
 */
router.post('/generate-multi', async (req, res) => {
  try {
    const { platforms, topic, tone, brand, additionalContext } = req.body;
    if (!platforms?.length || !topic) {
      return res.status(400).json({ error: 'platforms array and topic are required' });
    }

    const results = await Promise.all(
      platforms.map(platform =>
        granite.generatePost({ platform, topic, tone, brand, additionalContext })
          .then(post => ({ platform, post, charCount: post.length }))
          .catch(err => ({ platform, error: err.message }))
      )
    );

    res.json({
      topic,
      posts: results,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Multi-platform generation failed', details: err.message });
  }
});

/**
 * POST /api/content/generate-with-image
 * Generate post content from uploaded image + text prompt
 */
router.post('/generate-with-image', upload.single('image'), async (req, res) => {
  try {
    const { platform, topic, tone, brand } = req.body;
    const imageDescription = req.file
      ? `An uploaded image (${req.file.mimetype}, ${(req.file.size / 1024).toFixed(1)}KB)`
      : null;

    const post = await granite.generatePost({ platform, topic, tone, brand, imageDescription });
    res.json({
      platform,
      post,
      hasImage: !!req.file,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Image-based generation failed', details: err.message });
  }
});

/**
 * POST /api/content/hashtags
 * Generate optimized hashtags for a topic
 */
router.post('/hashtags', async (req, res) => {
  try {
    const { topic, platform, count = 10 } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const prompt = `<|system|>
You are a hashtag optimization expert for social media marketing.
<|user|>
Generate ${count} optimized hashtags for ${platform || 'social media'} about: "${topic}"
Include a mix of: high-volume broad tags, niche-specific tags, and trending tags.
Return ONLY a JSON array of strings: ["#tag1", "#tag2", ...]
<|assistant|>`;

    const raw = await granite.generateText(prompt, { maxTokens: 200, temperature: 0.5 });
    let hashtags = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      hashtags = match ? JSON.parse(match[0]) : raw.match(/#\w+/g) || [];
    } catch {
      hashtags = raw.match(/#\w+/g) || [];
    }

    res.json({ topic, platform, hashtags: hashtags.slice(0, count) });
  } catch (err) {
    res.status(500).json({ error: 'Hashtag generation failed', details: err.message });
  }
});

/**
 * POST /api/content/optimize
 * Optimize existing post content
 */
router.post('/optimize', async (req, res) => {
  try {
    const { post, platform, goal } = req.body;
    if (!post) return res.status(400).json({ error: 'post content is required' });

    const prompt = `<|system|>
You are a social media optimization expert.
<|user|>
Optimize this ${platform || 'social media'} post for better engagement${goal ? ` (goal: ${goal})` : ''}:

"${post}"

Provide:
1. OPTIMIZED_POST: The improved version
2. CHANGES: What was changed and why (2-3 bullet points)
3. SCORE: Predicted engagement improvement (e.g., +25%)
<|assistant|>`;

    const result = await granite.generateText(prompt, { maxTokens: 400, temperature: 0.5 });
    res.json({ original: post, optimized: result, platform });
  } catch (err) {
    res.status(500).json({ error: 'Optimization failed', details: err.message });
  }
});

/**
 * POST /api/content/schedule-suggestion
 * Suggest optimal posting times
 */
router.post('/schedule-suggestion', async (req, res) => {
  try {
    const { platform, audience_timezone = 'UTC', content_type } = req.body;

    const schedules = {
      twitter: ['8:00 AM', '12:00 PM', '5:00 PM', '9:00 PM'],
      linkedin: ['7:30 AM', '12:00 PM', '5:00 PM'],
      instagram: ['9:00 AM', '2:00 PM', '7:00 PM'],
      facebook: ['9:00 AM', '1:00 PM', '4:00 PM', '8:00 PM']
    };

    const platformSchedule = schedules[platform] || schedules.twitter;
    const bestDays = ['Tuesday', 'Wednesday', 'Thursday'];

    res.json({
      platform,
      audience_timezone,
      recommended_times: platformSchedule,
      best_days: bestDays,
      avoid: ['Saturday early morning', 'Sunday 12AM-6AM'],
      content_type_tip: content_type === 'video'
        ? 'Videos perform best at 12-2PM on weekdays'
        : 'Image posts peak at 9-10AM',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Schedule suggestion failed', details: err.message });
  }
});

module.exports = router;
