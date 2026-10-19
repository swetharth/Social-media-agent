/**
 * Research Analytics Routes
 * Handles: trend analysis, citation gap detection, knowledge graph, dashboard metrics
 */
const express = require('express');
const router = express.Router();
const {
  analyzeResearchTrends,
  detectCitationGaps,
  generateKnowledgeGraph
} = require('../services/granite');
const { generateMetrics, RESEARCH_FEEDS, SAMPLE_PAPERS } = require('../services/realtime');

/**
 * GET /api/analytics/dashboard
 * Returns aggregated dashboard metrics and live research stats
 */
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
