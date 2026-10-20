/**
 * Research Analytics Routes
 * Handles: trend analysis, citation gap detection, knowledge graph, dashboard metrics
 */
const express = require('express');
const router = express.Router();
const {
  analyzeResearchTrends,
  detectCitationGaps,
  generateKnowledgeGraph,
  analyzeSentiment
} = require('../services/granite');
const { generateMetrics, RESEARCH_FEEDS, SAMPLE_PAPERS } = require('../services/realtime');

/**
 * GET /api/analytics/dashboard
 * Returns aggregated dashboard metrics and live research stats
 */
/**
 * GET /api/analytics/overview
 * Returns cross-platform totals and per-platform time-series for the Overview page
 */
router.get('/overview', (req, res) => {
  const { timeRange = '7d' } = req.query;
  const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
  const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];

  const now = new Date();
  const platformData = {};
  for (const p of platforms) {
    platformData[p] = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const impressions  = Math.floor(Math.random() * 30000) + 5000;
      const engagements  = Math.floor(Math.random() * 2000) + 200;
      const reach        = Math.floor(impressions * (0.5 + Math.random() * 0.4));
      return { date: d.toISOString().slice(0, 10), impressions, engagements, reach };
    });
  }

  const totals = platforms.reduce((acc, p) => {
    acc.impressions  += platformData[p].reduce((s, d) => s + d.impressions, 0);
    acc.engagements  += platformData[p].reduce((s, d) => s + d.engagements, 0);
    acc.reach        += platformData[p].reduce((s, d) => s + d.reach, 0);
    return acc;
  }, { impressions: 0, engagements: 0, reach: 0 });

  res.json({ timeRange, totals, platforms: platformData, timestamp: new Date().toISOString() });
});

router.get('/dashboard', (req, res) => {
  const metrics = generateMetrics();

  // Domain distribution data
  const domainStats = RESEARCH_FEEDS.map(feed => ({
    domain: feed.domain,
    paper_count: Math.floor(Math.random() * 50000) + 5000,
    growth_rate: parseFloat((Math.random() * 30 + 5).toFixed(1)),
    citation_impact: parseFloat((Math.random() * 8 + 2).toFixed(1))
  }));

  // Citation trend over months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const citationTrend = months.map(month => ({
    month,
    citations: Math.floor(Math.random() * 500000) + 3000000,
    papers: Math.floor(Math.random() * 5000) + 20000
  }));

  // Top domains by recent activity
  const topDomains = domainStats
    .sort((a, b) => b.growth_rate - a.growth_rate)
    .slice(0, 5);

  res.json({
    metrics,
    domain_stats: domainStats,
    citation_trend: citationTrend,
    top_domains: topDomains,
    recent_papers: SAMPLE_PAPERS.slice(0, 5),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/analytics/sentiment
 * Analyze sentiment of social media text using IBM Granite
 */
router.post('/sentiment', async (req, res) => {
  const { text, posts } = req.body;
  const input = text || (Array.isArray(posts) ? posts.join('\n') : '');
  if (!input) return res.status(400).json({ error: 'text or posts array is required' });

  try {
    const sentiment = await analyzeSentiment(input);
    res.json({
      sentiment,
      analyzed: Array.isArray(posts) ? posts.length : 1,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Analytics/sentiment]', err.message);
    res.status(500).json({ error: 'Sentiment analysis failed', details: err.message });
  }
});

/**
 * POST /api/analytics/trends
 * Analyze research trends for a given domain
 */
router.post('/trends', async (req, res) => {
  const { domain, papers = [] } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  try {
    const trends = await analyzeResearchTrends(domain, papers);
    res.json({ domain, trends, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Analytics/trends]', err.message);
    res.status(500).json({ error: 'Trend analysis failed', details: err.message });
  }
});

/**
 * POST /api/analytics/citation-gaps
 * Detect citation gaps in a paper collection
 */
router.post('/citation-gaps', async (req, res) => {
  const { papers = [], topic } = req.body;
  if (!topic && papers.length === 0) {
    return res.status(400).json({ error: 'topic or papers array is required' });
  }

  try {
    const gaps = await detectCitationGaps(papers, topic || '');
    res.json({ topic, gap_analysis: gaps, paper_count: papers.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Analytics/citation-gaps]', err.message);
    res.status(500).json({ error: 'Citation gap detection failed', details: err.message });
  }
});

/**
 * POST /api/analytics/knowledge-graph
 * Generate a knowledge graph for a research topic
 */
router.post('/knowledge-graph', async (req, res) => {
  const { topic, papers = [] } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    const graph = await generateKnowledgeGraph(topic, papers);
    res.json({ topic, graph, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Analytics/knowledge-graph]', err.message);
    res.status(500).json({ error: 'Knowledge graph generation failed', details: err.message });
  }
});

/**
 * GET /api/analytics/influencers/map
 * Returns influencer data for the Influencer Map page
 */
router.get('/influencers/map', (req, res) => {
  const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];
  const niches = ['Tech & AI', 'Marketing', 'SaaS', 'Leadership', 'Design', 'Growth', 'Fintech', 'Creator Economy'];
  const handles = [
    '@aimarketer', '@techleader', '@saasfounder', '@growthhacker', '@designpro',
    '@fintechguru', '@contentqueen', '@brandstrategist', '@devadvocate', '@startupcoach',
    '@datadriven', '@creativedirector'
  ];

  const influencers = handles.map((handle, i) => ({
    handle,
    platform: platforms[i % platforms.length],
    followers: Math.floor(Math.random() * 900000) + 10000,
    engagement_rate: (Math.random() * 8 + 1).toFixed(2) + '%',
    niche: niches[i % niches.length],
    recent_growth: (Math.random() * 25 + 1).toFixed(1) + '%',
    collaboration_score: Math.floor(Math.random() * 40) + 60
  }));

  influencers.sort((a, b) => b.collaboration_score - a.collaboration_score);
  res.json({ influencers, timestamp: new Date().toISOString() });
});

/**
 * GET /api/analytics/:platform
 * Returns time-series analytics data for a given social platform
 */
router.get('/:platform', (req, res) => {
  const { platform } = req.params;
  const { timeRange = '7d' } = req.query;
  const validPlatforms = ['twitter', 'linkedin', 'instagram', 'facebook'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return res.status(404).json({ error: `Unknown platform: ${platform}` });
  }

  const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
  const now = new Date();
  const timeSeries = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const impressions = Math.floor(Math.random() * 40000) + 10000;
    const likes      = Math.floor(Math.random() * 2000) + 200;
    const shares     = Math.floor(Math.random() * 500) + 50;
    const comments   = Math.floor(Math.random() * 300) + 30;
    const engagements = likes + shares + comments;
    const reach      = Math.floor(impressions * (0.6 + Math.random() * 0.3));
    const clicks     = Math.floor(Math.random() * 800) + 100;
    return {
      date: d.toISOString().slice(0, 10),
      impressions, likes, shares, comments,
      engagements, reach, clicks,
      engagement_rate: ((engagements / impressions) * 100).toFixed(2)
    };
  });

  const total_impressions  = timeSeries.reduce((s, d) => s + d.impressions, 0);
  const total_engagements  = timeSeries.reduce((s, d) => s + d.engagements, 0);
  const net_followers      = Math.floor(Math.random() * 2000) + 100;
  const avg_engagement_rate = ((total_engagements / total_impressions) * 100).toFixed(2);

  res.json({
    platform,
    timeRange,
    timeSeries,
    summary: { total_impressions, total_engagements, avg_engagement_rate, net_followers },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/analytics/papers
 * Returns a mock paper library for demo purposes
 */
router.get('/papers', (req, res) => {
  const { domain, limit = 20, sort = 'citations' } = req.query;

  const papers = SAMPLE_PAPERS.map((p, i) => ({
    ...p,
    id: `paper_${i + 1}`,
    domain: RESEARCH_FEEDS[i % RESEARCH_FEEDS.length].domain,
    venue: RESEARCH_FEEDS[i % RESEARCH_FEEDS.length].venue,
    authors: [`Author A${i + 1}`, `Author B${i + 1}`],
    abstract: `This paper investigates ${p.title.toLowerCase()} using advanced computational methods. We present novel findings with significant implications for the field.`,
    url: `https://arxiv.org/abs/240${i + 1}.0000`,
    open_access: i % 2 === 0
  }));

  const filtered = domain
    ? papers.filter(p => p.domain.toLowerCase().includes(domain.toLowerCase()))
    : papers;

  const sorted = filtered.sort((a, b) =>
    sort === 'citations' ? b.citations - a.citations : b.year - a.year
  );

  res.json({ papers: sorted.slice(0, parseInt(limit)), total: sorted.length, timestamp: new Date().toISOString() });
});

/**
 * GET /api/analytics/search
 * Search papers by keyword
 */
router.get('/search', (req, res) => {
  const { q, domain } = req.query;
  if (!q) return res.status(400).json({ error: 'q (query) parameter is required' });

  const allPapers = SAMPLE_PAPERS.map((p, i) => ({
    ...p,
    id: `paper_${i + 1}`,
    domain: RESEARCH_FEEDS[i % RESEARCH_FEEDS.length].domain,
    authors: [`Author A${i + 1}`, `Dr. Johnson`],
    abstract: `Abstract for ${p.title}`
  }));

  const results = allPapers.filter(p =>
    p.title.toLowerCase().includes(q.toLowerCase()) ||
    p.domain.toLowerCase().includes(q.toLowerCase())
  );

  res.json({ query: q, results, count: results.length, timestamp: new Date().toISOString() });
});

module.exports = router;
