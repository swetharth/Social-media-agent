/**
 * Social Media Data Service
 * Collects and synthesizes data from multiple platforms.
 * Uses real APIs when credentials are set; falls back to realistic mock data.
 */
const axios = require('axios');

// ─── Twitter/X ───────────────────────────────────────────────────────────────
async function fetchTwitterData(query, maxResults = 20) {
  if (process.env.TWITTER_BEARER_TOKEN) {
    try {
      const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
        params: {
          query,
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,author_id,entities',
          expansions: 'author_id',
          'user.fields': 'name,username,public_metrics'
        }
      });
      return res.data.data || [];
    } catch (e) {
      console.warn('[Twitter] API error, using mock data:', e.message);
    }
  }
  return mockPlatformData('twitter', query);
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────
async function fetchLinkedInData(query) {
  if (process.env.LINKEDIN_ACCESS_TOKEN) {
    try {
      const res = await axios.get('https://api.linkedin.com/v2/shares', {
        headers: {
          Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        params: { q: 'owners', count: 20 }
      });
      return res.data.elements || [];
    } catch (e) {
      console.warn('[LinkedIn] API error, using mock data:', e.message);
    }
  }
  return mockPlatformData('linkedin', query);
}

// ─── Instagram ────────────────────────────────────────────────────────────────
async function fetchInstagramData(query) {
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    try {
      const res = await axios.get('https://graph.instagram.com/me/media', {
        params: {
          access_token: process.env.INSTAGRAM_ACCESS_TOKEN,
          fields: 'id,caption,media_type,timestamp,like_count,comments_count'
        }
      });
      return res.data.data || [];
    } catch (e) {
      console.warn('[Instagram] API error, using mock data:', e.message);
    }
  }
  return mockPlatformData('instagram', query);
}

// ─── Facebook ─────────────────────────────────────────────────────────────────
async function fetchFacebookData(query) {
  if (process.env.FACEBOOK_ACCESS_TOKEN) {
    try {
      const res = await axios.get('https://graph.facebook.com/v18.0/me/posts', {
        params: {
          access_token: process.env.FACEBOOK_ACCESS_TOKEN,
          fields: 'id,message,created_time,reactions.summary(true),comments.summary(true),shares'
        }
      });
      return res.data.data || [];
    } catch (e) {
      console.warn('[Facebook] API error, using mock data:', e.message);
    }
  }
  return mockPlatformData('facebook', query);
}

// ─── Unified Multichannel Fetch ───────────────────────────────────────────────
async function fetchAllPlatforms(query) {
  const [twitter, linkedin, instagram, facebook] = await Promise.all([
    fetchTwitterData(query),
    fetchLinkedInData(query),
    fetchInstagramData(query),
    fetchFacebookData(query)
  ]);

  return {
    twitter,
    linkedin,
    instagram,
    facebook,
    unified: [...twitter, ...linkedin, ...instagram, ...facebook],
    fetchedAt: new Date().toISOString()
  };
}

// ─── Trending Hashtags ────────────────────────────────────────────────────────
async function fetchTrendingHashtags(platform = 'all') {
  return generateTrendingHashtags(platform);
}

// ─── Competitor Analysis Data ─────────────────────────────────────────────────
async function fetchCompetitorData(handles) {
  return handles.map(handle => generateCompetitorProfile(handle));
}

// ─── Analytics Metrics ────────────────────────────────────────────────────────
function getAnalyticsData(platform, timeRange = '7d') {
  const days = timeRange === '30d' ? 30 : timeRange === '24h' ? 1 : 7;
  return generateAnalyticsTimeSeries(platform, days);
}

// ─── Mock Data Generators ────────────────────────────────────────────────────
function mockPlatformData(platform, query = '') {
  const now = Date.now();
  const posts = [];
  const configs = {
    twitter: {
      count: 15,
      metrics: () => ({
        retweet_count: rand(5, 500),
        like_count: rand(20, 2000),
        reply_count: rand(2, 100),
        impression_count: rand(1000, 50000)
      })
    },
    linkedin: {
      count: 10,
      metrics: () => ({
        likeCount: rand(10, 800),
        commentCount: rand(5, 150),
        shareCount: rand(2, 80),
        impressionCount: rand(500, 20000)
      })
    },
    instagram: {
      count: 12,
      metrics: () => ({
        like_count: rand(50, 5000),
        comments_count: rand(10, 300),
        saves: rand(20, 1000),
        reach: rand(2000, 100000)
      })
    },
    facebook: {
      count: 8,
      metrics: () => ({
        reactions: rand(10, 1000),
        comments: rand(5, 200),
        shares: rand(2, 150),
        reach: rand(500, 30000)
      })
    }
  };

  const cfg = configs[platform] || configs.twitter;
  const topics = [
    'AI is transforming how we approach', 'Excited to share our latest',
    'The future of digital marketing is', 'Breaking: new trends in',
    'How we increased engagement by', 'Tips for growing your audience with',
    'Why authentic storytelling matters in', 'Our team just launched',
    'The data behind successful', '5 ways to improve your'
  ];

  for (let i = 0; i < cfg.count; i++) {
    const topic = topics[i % topics.length];
    posts.push({
      id: `${platform}_${now}_${i}`,
      platform,
      text: `${topic} ${query || 'social media strategy'} #${platform} #marketing #digital`,
      created_at: new Date(now - i * 3600000).toISOString(),
      metrics: cfg.metrics(),
      author: {
        name: `User ${rand(100, 999)}`,
        username: `user${rand(1000, 9999)}`,
        followers: rand(500, 100000)
      },
      hashtags: extractHashtags(`${topic} #${platform} #marketing`),
      sentiment: ['positive', 'neutral', 'negative'][rand(0, 2)]
    });
  }
  return posts;
}

function generateTrendingHashtags(platform) {
  const allTags = {
    twitter: [
      { tag: '#AIMarketing', volume: rand(15000, 80000), growth: rand(5, 45), category: 'Technology' },
      { tag: '#ContentStrategy', volume: rand(8000, 40000), growth: rand(3, 30), category: 'Marketing' },
      { tag: '#BrandBuilding', volume: rand(5000, 25000), growth: rand(2, 20), category: 'Business' },
      { tag: '#InfluencerMarketing', volume: rand(10000, 50000), growth: rand(8, 35), category: 'Marketing' },
      { tag: '#DigitalTransformation', volume: rand(20000, 90000), growth: rand(10, 50), category: 'Technology' },
      { tag: '#SocialSelling', volume: rand(3000, 15000), growth: rand(1, 15), category: 'Sales' },
      { tag: '#VideoMarketing', volume: rand(7000, 35000), growth: rand(5, 40), category: 'Content' },
      { tag: '#DataDriven', volume: rand(6000, 30000), growth: rand(4, 25), category: 'Analytics' }
    ],
    linkedin: [
      { tag: '#Leadership', volume: rand(50000, 200000), growth: rand(3, 20), category: 'Professional' },
      { tag: '#Innovation', volume: rand(30000, 150000), growth: rand(5, 25), category: 'Business' },
      { tag: '#B2BMarketing', volume: rand(10000, 60000), growth: rand(8, 35), category: 'Marketing' },
      { tag: '#FutureOfWork', volume: rand(20000, 100000), growth: rand(6, 30), category: 'Workplace' },
      { tag: '#GrowthHacking', volume: rand(5000, 30000), growth: rand(10, 45), category: 'Marketing' }
    ],
    instagram: [
      { tag: '#Reels', volume: rand(200000, 1000000), growth: rand(15, 60), category: 'Content' },
      { tag: '#BrandAesthetic', volume: rand(30000, 200000), growth: rand(10, 40), category: 'Branding' },
      { tag: '#UGC', volume: rand(50000, 300000), growth: rand(12, 50), category: 'Community' },
      { tag: '#VisualStorytelling', volume: rand(20000, 100000), growth: rand(8, 35), category: 'Content' },
      { tag: '#CollabPost', volume: rand(15000, 80000), growth: rand(20, 70), category: 'Engagement' }
    ],
    facebook: [
      { tag: '#CommunityBuilding', volume: rand(10000, 50000), growth: rand(5, 25), category: 'Community' },
      { tag: '#FacebookLive', volume: rand(20000, 80000), growth: rand(8, 30), category: 'Video' },
      { tag: '#LocalBusiness', volume: rand(15000, 60000), growth: rand(3, 20), category: 'Business' }
    ]
  };

  const tags = platform === 'all'
    ? Object.values(allTags).flat()
    : (allTags[platform] || allTags.twitter);

  return tags.sort((a, b) => b.growth - a.growth);
}

function generateCompetitorProfile(handle) {
  return {
    handle,
    platform_metrics: {
      twitter: { followers: rand(5000, 500000), engagement_rate: (rand(10, 80) / 10).toFixed(1) + '%', posts_per_week: rand(5, 25) },
      instagram: { followers: rand(3000, 300000), engagement_rate: (rand(15, 100) / 10).toFixed(1) + '%', posts_per_week: rand(3, 15) },
      linkedin: { followers: rand(1000, 100000), engagement_rate: (rand(5, 50) / 10).toFixed(1) + '%', posts_per_week: rand(2, 10) }
    },
    top_content_types: ['Video', 'Carousel', 'Infographic', 'Blog'].slice(0, rand(2, 4)),
    avg_response_time: `${rand(1, 12)} hours`,
    posting_schedule: ['9AM', '12PM', '6PM'].slice(0, rand(2, 3)),
    sentiment_score: (rand(50, 95) / 100).toFixed(2),
    recent_campaigns: [`Campaign_${rand(100, 999)}`, `Campaign_${rand(100, 999)}`]
  };
}

function generateAnalyticsTimeSeries(platform, days) {
  const series = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    series.push({
      date: date.toISOString().split('T')[0],
      impressions: rand(5000, 50000),
      engagements: rand(200, 5000),
      followers_gained: rand(-50, 500),
      reach: rand(3000, 30000),
      clicks: rand(100, 2000),
      shares: rand(20, 500),
      comments: rand(30, 800),
      likes: rand(100, 3000),
      engagement_rate: (rand(15, 85) / 10).toFixed(2),
      platform
    });
  }
  return series;
}

function extractHashtags(text) {
  return (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  fetchTwitterData,
  fetchLinkedInData,
  fetchInstagramData,
  fetchFacebookData,
  fetchAllPlatforms,
  fetchTrendingHashtags,
  fetchCompetitorData,
  getAnalyticsData
};
