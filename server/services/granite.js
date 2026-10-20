/**
 * IBM watsonx.ai / Granite AI Research Service
 * Core AI engine for the Research Agent — powered by IBM Granite
 * Project ID: 8ca4413c-6d2e-4687-a694-14143c3bce2c
 */
const axios = require('axios');

const IAM_URL = process.env.IBM_IAM_URL || 'https://iam.cloud.ibm.com/identity/token';
const WATSONX_URL = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const MODEL_ID = process.env.IBM_GRANITE_MODEL_ID || 'ibm/granite-3-3-8b-instruct';
const PROJECT_ID = process.env.IBM_WATSONX_PROJECT_ID;
const API_KEY = process.env.IBM_WATSONX_API_KEY;

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get IBM IAM Bearer Token (cached with 50-min TTL)
 */
async function getIAMToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const response = await axios.post(
    IAM_URL,
    `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${API_KEY}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  cachedToken = response.data.access_token;
  tokenExpiry = now + (response.data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Core text generation using IBM Granite
 */
async function generateText(prompt, options = {}) {
  const token = await getIAMToken();
  const {
    maxTokens = 1200,
    temperature = 0.7,
    topP = 0.9
  } = options;

  const payload = {
    model_id: MODEL_ID,
    project_id: PROJECT_ID,
    input: prompt,
    parameters: {
      decoding_method: temperature < 0.2 ? 'greedy' : 'sample',
      max_new_tokens: maxTokens,
      min_new_tokens: 20,
      temperature,
      top_p: topP,
      top_k: 50,
      repetition_penalty: 1.1
    }
  };

  const response = await axios.post(
    `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 60000
    }
  );

  return (response.data?.results?.[0]?.generated_text || '').trim();
}

/**
 * 1. LITERATURE REVIEW SYNTHESIS
 * Aggregates multiple sources into a coherent literature review
 */
async function synthesizeLiteratureReview(params) {
  const { topic, papers = [], depth = 'comprehensive' } = params;

  const papersContext = papers.length > 0
    ? papers.slice(0, 10).map((p, i) =>
        `[${i + 1}] "${p.title}" by ${p.authors || 'Unknown'} (${p.year || 'n/a'})\nAbstract: ${p.abstract || p.summary || 'N/A'}`
      ).join('\n\n')
    : `No specific papers provided — generate based on general knowledge of "${topic}"`;

  const prompt = `<|system|>
You are an expert academic researcher and literature review specialist with deep expertise across multiple scientific domains. Your role is to synthesize research findings into comprehensive, well-structured literature reviews following academic standards.
<|user|>
Generate a ${depth} literature review on: "${topic}"

Source Papers:
${papersContext}

Structure your literature review as follows:
1. **Overview** (2-3 sentences introducing the field)
2. **Key Themes & Findings** (3-4 major themes with citations)
3. **Methodological Approaches** (common research methods used)
4. **Consensus & Controversies** (areas of agreement and debate)
5. **Research Gaps** (what has NOT been studied sufficiently)
6. **Future Directions** (promising research avenues)

Be specific, cite numbered sources where relevant, and maintain academic rigor.
<|assistant|>`;

  return generateText(prompt, { maxTokens: 1500, temperature: 0.5 });
}

/**
 * 2. RESEARCH QUERY PROCESSING
 * Converts user queries into structured research insights
 */
async function processResearchQuery(query, context = '') {
  const prompt = `<|system|>
You are an intelligent research assistant powered by IBM Granite. You help researchers find, analyze, and synthesize academic knowledge. Provide accurate, well-structured, and insightful responses to research queries.
<|user|>
Research Query: ${query}
${context ? `\nAdditional Context: ${context}` : ''}

Provide a structured research response with:
- **Direct Answer**: Concise response to the query
- **Key Concepts**: Important terms and definitions
- **Current State of Research**: What is known
- **Evidence & Data Points**: Key statistics or findings
- **Related Topics**: Adjacent research areas worth exploring
- **Recommended Next Steps**: Specific actions for further investigation

Be precise and cite specific fields of research where applicable.
<|assistant|>`;

  return generateText(prompt, { maxTokens: 1000, temperature: 0.6 });
}

/**
 * 3. TREND ANALYSIS & PREDICTION
 * Detects emerging research trends and predicts future directions
 */
async function analyzeResearchTrends(domain, papers = []) {
  const recentPapers = papers.slice(0, 15).map(p =>
    `${p.title} (${p.year || 'recent'}) - Citations: ${p.citations || 0}`
  ).join('\n');

  const prompt = `<|system|>
You are a research trend analyst specializing in bibliometric analysis and technology forecasting. You identify emerging research fronts, citation patterns, and predict future high-impact research directions.
<|user|>
Analyze research trends in the domain: "${domain}"

Recent Publications:
${recentPapers || 'No specific papers — use general domain knowledge'}

Return a JSON response with this exact structure:
{
  "emerging_topics": [
    {"topic": "string", "growth_rate": "high|medium|low", "maturity": "emerging|growing|mature", "impact_score": 0-10}
  ],
  "declining_topics": ["topic1", "topic2"],
  "hot_methodologies": ["method1", "method2"],
  "citation_gaps": ["gap1", "gap2", "gap3"],
  "predicted_breakthroughs": [
    {"area": "string", "timeline": "1-2 years|3-5 years|5+ years", "confidence": "high|medium|low", "rationale": "string"}
  ],
  "collaboration_opportunities": ["opportunity1", "opportunity2"],
  "funding_priorities": ["priority1", "priority2"],
  "interdisciplinary_bridges": ["bridge1", "bridge2"],
  "trend_summary": "2-3 sentence overview of the domain trajectory"
}
Return ONLY valid JSON. No markdown, no extra text.
<|assistant|>`;

  const raw = await generateText(prompt, { maxTokens: 800, temperature: 0.2 });
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : fallbackTrends(domain);
  } catch {
    return fallbackTrends(domain);
  }
}

/**
 * 4. CITATION GAP DETECTION
 * Identifies under-cited areas and missing connections
 */
async function detectCitationGaps(papers = [], topic = '') {
  const paperList = papers.slice(0, 20).map((p, i) =>
    `[${i + 1}] ${p.title} (${p.year}) — Cited by: ${p.citations || 0} papers`
  ).join('\n');

  const prompt = `<|system|>
You are a bibliometric expert specializing in systematic literature reviews, citation network analysis, and knowledge gap identification in academic research.
<|user|>
Topic: "${topic}"

Paper List:
${paperList || 'No papers provided — generate hypothetical gaps for this topic'}

Analyze this paper collection and identify:
1. **Under-cited Foundational Works**: Important papers that should be cited more
2. **Missing Cross-Domain Citations**: Connections to adjacent fields not made
3. **Temporal Gaps**: Time periods with insufficient research
4. **Methodological Gaps**: Research methods not yet applied to this topic
5. **Population/Context Gaps**: Demographics or contexts unstudied
6. **Replication Needs**: Findings that need independent verification
7. **Contradictory Findings**: Papers that conflict and need resolution studies

For each gap, provide: description, severity (high/medium/low), and suggested remedy.
<|assistant|>`;

  return generateText(prompt, { maxTokens: 900, temperature: 0.4 });
}

/**
 * 5. PAPER SUMMARIZATION
 * Summarizes a research paper into structured insights
 */
async function summarizePaper(paper) {
  const { title, abstract, fullText, authors, year, journal } = paper;
  const content = fullText || abstract || 'No content provided';

  const prompt = `<|system|>
You are a research paper analyst. Extract and structure the most important information from academic papers for rapid comprehension.
<|user|>
Summarize this research paper:

Title: ${title || 'Unknown'}
Authors: ${Array.isArray(authors) ? authors.join(', ') : (authors || 'Unknown')}
Year: ${year || 'Unknown'}
Journal: ${journal || 'Unknown'}
Content: ${content.substring(0, 3000)}

Provide a structured summary with:
- **TL;DR** (1-2 sentences): The core finding in plain language
- **Problem Statement**: What problem does this paper address?
- **Methodology**: How did they conduct the research?
- **Key Findings**: 3-5 bullet points of major results
- **Contributions**: What does this add to the field?
- **Limitations**: What are the stated or implied limitations?
- **Relevance Score**: Rate 1-10 for a researcher in this field, with justification
- **Key Terms**: 5-8 important technical terms defined briefly
<|assistant|>`;

  return generateText(prompt, { maxTokens: 800, temperature: 0.3 });
}

/**
 * 6. RESEARCH AGENT CHAT
 * Interactive AI research companion with conversation memory
 */
async function chatWithResearchAgent(message, conversationHistory = [], userProfile = {}) {
  const historyStr = conversationHistory.length > 0
    ? conversationHistory.slice(-6).map(m => `<|${m.role}|>\n${m.content}`).join('\n')
    : '';

  const profileCtx = userProfile.domain
    ? `User's research domain: ${userProfile.domain}. Expertise level: ${userProfile.level || 'graduate'}.`
    : '';

  const prompt = `<|system|>
You are ResearchAgent, an advanced AI research companion powered by IBM Granite. You assist researchers, students, and professionals with:
- Finding and synthesizing academic literature
- Identifying research gaps and citation opportunities  
- Predicting emerging trends and promising research directions
- Analyzing research methodologies and statistical approaches
- Generating hypotheses and experimental designs
- Writing assistance for papers, grants, and reports
- Explaining complex scientific concepts clearly

${profileCtx}
Be precise, cite specific studies or fields when possible, and always encourage critical thinking.
<|user|>
${historyStr ? historyStr + '\n' : ''}${message}
<|assistant|>`;

  return generateText(prompt, { maxTokens: 800, temperature: 0.7 });
}

/**
 * 7. KNOWLEDGE GRAPH GENERATION
 * Generates structured entity-relationship data for visualization
 */
async function generateKnowledgeGraph(topic, papers = []) {
  const paperTitles = papers.slice(0, 10).map(p => p.title).join('; ');

  const prompt = `<|system|>
You are a knowledge graph architect specializing in academic ontologies and semantic research networks.
<|user|>
Generate a knowledge graph for the research topic: "${topic}"
${paperTitles ? `Related papers: ${paperTitles}` : ''}

Return a JSON knowledge graph:
{
  "nodes": [
    {"id": "unique_id", "label": "concept/author/method", "type": "concept|author|method|institution|dataset|theory", "weight": 1-10, "description": "brief description"}
  ],
  "edges": [
    {"source": "node_id", "target": "node_id", "relation": "relationship_type", "strength": 1-5}
  ],
  "clusters": [
    {"name": "cluster_name", "nodes": ["node_id1", "node_id2"], "color": "#hexcolor"}
  ],
  "central_concept": "most_important_node_id",
  "graph_summary": "2 sentence description of the knowledge structure"
}
Include 8-15 nodes and 10-20 edges. Use real academic concepts.
Return ONLY valid JSON.
<|assistant|>`;

  const raw = await generateText(prompt, { maxTokens: 1000, temperature: 0.3 });
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : fallbackKnowledgeGraph(topic);
  } catch {
    return fallbackKnowledgeGraph(topic);
  }
}

/**
 * 8. MULTIMODAL INPUT ANALYSIS
 * Analyzes charts, images, or tables described in text
 */
async function analyzeMultimodalInput(inputType, content, question = '') {
  const prompt = `<|system|>
You are a multimodal research analyst capable of interpreting data from figures, charts, tables, and experimental results in academic publications.
<|user|>
Input Type: ${inputType}
Content Description: ${content}
${question ? `Research Question: ${question}` : ''}

Analyze this research input and provide:
- **Data Interpretation**: What does this data/figure show?
- **Statistical Significance**: Are the patterns statistically meaningful?
- **Key Insights**: 3-5 actionable insights from this data
- **Methodological Notes**: Comments on the research approach
- **Comparisons**: How does this compare to typical findings in the field?
- **Follow-up Experiments**: What experiments should come next based on this data?
<|assistant|>`;

  return generateText(prompt, { maxTokens: 700, temperature: 0.4 });
}

/**
 * 9. RESEARCH PROPOSAL GENERATION
 * Creates structured research proposals based on identified gaps
 */
async function generateResearchProposal(params) {
  const { topic, gap, methodology, resources = '' } = params;

  const prompt = `<|system|>
You are an expert research proposal writer with experience in academic grant writing and experimental design across scientific disciplines.
<|user|>
Generate a research proposal for:
Topic: ${topic}
Research Gap: ${gap}
Preferred Methodology: ${methodology || 'to be determined'}
Available Resources: ${resources || 'standard laboratory/computational resources'}

Structure the proposal as:
1. **Title**: Compelling research title
2. **Abstract** (150 words): Concise overview
3. **Background & Significance**: Why this research matters
4. **Specific Aims**: 3 measurable objectives
5. **Methodology**: Detailed research design
6. **Expected Outcomes**: Predicted results and impact
7. **Timeline**: 12-24 month milestone breakdown
8. **Budget Justification**: Key resource needs
9. **Potential Challenges & Mitigations**: Risk analysis
<|assistant|>`;

  return generateText(prompt, { maxTokens: 1200, temperature: 0.6 });
}

/**
 * 10. SEMANTIC SIMILARITY ANALYSIS
 * Finds conceptually related papers using AI-driven analysis
 */
async function findRelatedResearch(targetPaper, candidatePapers = []) {
  const candidates = candidatePapers.slice(0, 10).map((p, i) =>
    `[${i + 1}] ${p.title}: ${p.abstract?.substring(0, 200) || ''}`
  ).join('\n');

  const prompt = `<|system|>
You are a semantic similarity expert specializing in academic paper recommendation and citation network analysis.
<|user|>
Target Paper: "${targetPaper.title}"
Abstract: ${targetPaper.abstract?.substring(0, 500) || ''}

Candidate Papers:
${candidates || 'None provided — suggest related topics instead'}

Return a JSON response:
{
  "related_papers": [
    {"index": 1, "similarity_score": 0-1, "relationship_type": "extends|contradicts|supports|applies|reviews", "reasoning": "why related"}
  ],
  "suggested_search_terms": ["term1", "term2", "term3"],
  "research_cluster": "name of the research cluster this belongs to",
  "citation_recommendation": "should this paper cite the targets? Brief explanation"
}
Return ONLY valid JSON.
<|assistant|>`;

  const raw = await generateText(prompt, { maxTokens: 600, temperature: 0.2 });
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { related_papers: [], suggested_search_terms: [targetPaper.title] };
  } catch {
    return { related_papers: [], suggested_search_terms: [targetPaper.title] };
  }
}

// ─── Fallback Data Generators ───────────────────────────────────────────────

function fallbackTrends(domain) {
  return {
    emerging_topics: [
      { topic: `AI-driven ${domain} analysis`, growth_rate: 'high', maturity: 'emerging', impact_score: 9 },
      { topic: `Large language models in ${domain}`, growth_rate: 'high', maturity: 'growing', impact_score: 8 },
      { topic: `Interdisciplinary ${domain} studies`, growth_rate: 'medium', maturity: 'growing', impact_score: 7 }
    ],
    declining_topics: ['Traditional survey methods', 'Single-variable studies'],
    hot_methodologies: ['Meta-analysis', 'Mixed methods', 'Computational modeling'],
    citation_gaps: ['Cross-cultural replication', 'Longitudinal studies', 'Open-access datasets'],
    predicted_breakthroughs: [
      { area: `Automated ${domain} discovery`, timeline: '1-2 years', confidence: 'high', rationale: 'Accelerating AI capabilities' }
    ],
    collaboration_opportunities: ['Industry-academia partnerships', 'International consortia'],
    funding_priorities: ['Open science initiatives', 'Reproducibility studies'],
    interdisciplinary_bridges: ['Computer Science ↔ ' + domain, 'Statistics ↔ ' + domain],
    trend_summary: `The ${domain} field is experiencing rapid transformation driven by AI and computational methods. Collaborative, open-science approaches are becoming increasingly important.`
  };
}

function fallbackKnowledgeGraph(topic) {
  return {
    nodes: [
      { id: 'n1', label: topic, type: 'concept', weight: 10, description: 'Central research topic' },
      { id: 'n2', label: 'Machine Learning', type: 'method', weight: 8, description: 'Computational approach' },
      { id: 'n3', label: 'Data Analysis', type: 'method', weight: 7, description: 'Statistical methods' },
      { id: 'n4', label: 'Literature Review', type: 'method', weight: 6, description: 'Systematic review approach' },
      { id: 'n5', label: 'IBM Granite', type: 'tool', weight: 9, description: 'AI foundation model' }
    ],
    edges: [
      { source: 'n1', target: 'n2', relation: 'uses', strength: 4 },
      { source: 'n1', target: 'n3', relation: 'requires', strength: 3 },
      { source: 'n1', target: 'n4', relation: 'involves', strength: 3 },
      { source: 'n5', target: 'n1', relation: 'powers', strength: 5 }
    ],
    clusters: [
      { name: 'Methods', nodes: ['n2', 'n3', 'n4'], color: '#3b82d4' },
      { name: 'Tools', nodes: ['n5'], color: '#7c5cd8' }
    ],
    central_concept: 'n1',
    graph_summary: `Knowledge graph centered on "${topic}" showing methodological and tooling relationships.`
  };
}

async function analyzeSentiment(text) {
  const prompt = `Analyze the sentiment of the following social media text. Return ONLY a JSON object with these fields:
{
  "overall": "positive" | "negative" | "neutral",
  "score": <float 0.0-1.0 where 1.0 is most positive>,
  "positive": <integer percentage 0-100>,
  "negative": <integer percentage 0-100>,
  "neutral": <integer percentage 0-100>,
  "emotions": ["<emotion1>", "<emotion2>"],
  "summary": "<one sentence insight>"
}

Text to analyze:
"${text.replace(/"/g, '\\"')}"

JSON:`;

  try {
    const raw = await generateText(prompt, { maxTokens: 300, temperature: 0.1 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);
    return {
      overall: parsed.overall || 'neutral',
      score: parsed.score ?? 0.5,
      positive: parsed.positive ?? 33,
      negative: parsed.negative ?? 33,
      neutral: parsed.neutral ?? 34,
      emotions: parsed.emotions || [],
      summary: parsed.summary || 'Sentiment analysis complete.'
    };
  } catch {
    // fallback: simple keyword-based
    const lower = text.toLowerCase();
    const posWords = ['good','great','love','amazing','excellent','happy','best','awesome','fantastic','wonderful'];
    const negWords = ['bad','hate','terrible','awful','worst','poor','horrible','disgusting','angry','sad'];
    const posCount = posWords.filter(w => lower.includes(w)).length;
    const negCount = negWords.filter(w => lower.includes(w)).length;
    const total = posCount + negCount || 1;
    const positive = Math.round((posCount / total) * 80 + 10);
    const negative = Math.round((negCount / total) * 80 + 10);
    const neutral = Math.max(0, 100 - positive - negative);
    return {
      overall: posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral',
      score: posCount > negCount ? 0.7 : negCount > posCount ? 0.3 : 0.5,
      positive, negative, neutral,
      emotions: [],
      summary: 'Sentiment analyzed using keyword fallback.'
    };
  }
}

module.exports = {
  generateText,
  synthesizeLiteratureReview,
  processResearchQuery,
  analyzeResearchTrends,
  detectCitationGaps,
  summarizePaper,
  chatWithResearchAgent,
  generateKnowledgeGraph,
  analyzeMultimodalInput,
  generateResearchProposal,
  findRelatedResearch,
  analyzeSentiment
};
