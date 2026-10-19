/**
 * Real-Time Research Updates Service
 * Streams live research activity via Socket.IO
 */

const RESEARCH_FEEDS = [
  { domain: 'Artificial Intelligence', venue: 'NeurIPS 2024', type: 'preprint' },
  { domain: 'Quantum Computing', venue: 'Nature Physics', type: 'journal' },
  { domain: 'Climate Science', venue: 'Science Advances', type: 'journal' },
  { domain: 'Genomics', venue: 'Cell', type: 'journal' },
  { domain: 'Large Language Models', venue: 'arXiv cs.CL', type: 'preprint' },
  { domain: 'Drug Discovery', venue: 'Nature Medicine', type: 'journal' },
  { domain: 'Robotics', venue: 'ICRA 2024', type: 'conference' },
  { domain: 'Computer Vision', venue: 'CVPR 2024', type: 'conference' }
];

const SAMPLE_PAPERS = [
  { title: 'Scaling Laws for Neural Language Models', year: 2024, citations: 1204 },
  { title: 'Attention Is All You Need: A Retrospective', year: 2024, citations: 890 },
  { title: 'Multimodal Foundation Models in Healthcare', year: 2024, citations: 456 },
  { title: 'Quantum Error Correction at Scale', year: 2024, citations: 312 },
  { title: 'CRISPR-Based Gene Editing: 5-Year Review', year: 2024, citations: 678 },
  { title: 'Federated Learning for Privacy-Preserving AI', year: 2024, citations: 234 },
  { title: 'Carbon Capture via Direct Air Capture', year: 2024, citations: 189 },
  { title: 'Protein Structure Prediction Beyond AlphaFold', year: 2024, citations: 923 }
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockPaper() {
  const feed = getRandomItem(RESEARCH_FEEDS);
  const adjectives = ['Novel', 'Adaptive', 'Scalable', 'Efficient', 'Robust', 'Unified', 'Generalized'];
  const methods = ['Framework', 'Architecture', 'Approach', 'System', 'Algorithm', 'Model', 'Protocol'];
  const paper = getRandomItem(SAMPLE_PAPERS);
  
  return {
    id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: `${getRandomItem(adjectives)} ${paper.title.split(' ').slice(0, 4).join(' ')} ${getRandomItem(methods)}`,
    domain: feed.domain,
    venue: feed.venue,
    type: feed.type,
    citations: Math.floor(Math.random() * 500),
    year: 2024,
    timestamp: new Date().toISOString(),
    trending_score: parseFloat((Math.random() * 10).toFixed(2)),
    authors: [`Researcher ${Math.floor(Math.random() * 100)}`, `Dr. Smith`],
    abstract: `This paper presents a ${getRandomItem(adjectives).toLowerCase()} approach to ${feed.domain.toLowerCase()} addressing key challenges in the field...`
  };
}

function generateActivityFeed() {
  const activities = [
    { type: 'new_paper', icon: '📄', message: `New preprint: "${getRandomItem(SAMPLE_PAPERS).title}"` },
    { type: 'citation_spike', icon: '📈', message: `Citation spike detected in ${getRandomItem(RESEARCH_FEEDS).domain}` },
    { type: 'trend_alert', icon: '🔥', message: `Emerging trend: ${getRandomItem(RESEARCH_FEEDS).domain} gaining momentum` },
    { type: 'gap_found', icon: '🔍', message: `Research gap identified in ${getRandomItem(RESEARCH_FEEDS).domain}` },
    { type: 'collab', icon: '🤝', message: `New cross-institutional collaboration in ${getRandomItem(RESEARCH_FEEDS).domain}` }
  ];
  return getRandomItem(activities);
}

function generateMetrics() {
  return {
    papers_indexed: 1200000 + Math.floor(Math.random() * 1000),
    citations_tracked: 45000000 + Math.floor(Math.random() * 5000),
    active_researchers: 89000 + Math.floor(Math.random() * 100),
    domains_covered: 156,
    papers_today: 2847 + Math.floor(Math.random() * 50),
    ai_summaries_generated: 15420 + Math.floor(Math.random() * 20),
    trends_detected: 234 + Math.floor(Math.random() * 5),
    gaps_identified: 891 + Math.floor(Math.random() * 3)
  };
}

function startRealTimeUpdates(io) {
  // Emit new papers every 8 seconds
  setInterval(() => {
    io.emit('research:new_paper', generateMockPaper());
  }, 8000);

  // Emit activity feed every 5 seconds
  setInterval(() => {
    io.emit('research:activity', {
      ...generateActivityFeed(),
      timestamp: new Date().toISOString()
    });
  }, 5000);

  // Emit updated metrics every 15 seconds
  setInterval(() => {
    io.emit('research:metrics', generateMetrics());
  }, 15000);

  // Emit trend alerts every 30 seconds
  setInterval(() => {
    const feed = getRandomItem(RESEARCH_FEEDS);
    io.emit('research:trend_alert', {
      domain: feed.domain,
      venue: feed.venue,
      alert_type: getRandomItem(['rising', 'breakthrough', 'gap_detected', 'collaboration']),
      intensity: parseFloat((Math.random() * 10).toFixed(1)),
      timestamp: new Date().toISOString()
    });
  }, 30000);

  console.log('[ResearchAgent] Real-time feed active — broadcasting research updates');
}

module.exports = { startRealTimeUpdates, generateMetrics, generateMockPaper, RESEARCH_FEEDS, SAMPLE_PAPERS };
