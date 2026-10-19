/**
 * Research Agent Routes — Core AI endpoints
 * Handles: paper search, query processing, chat, proposals
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const {
  chatWithResearchAgent,
  processResearchQuery,
  synthesizeLiteratureReview,
  summarizePaper,
  generateResearchProposal,
  analyzeMultimodalInput,
  findRelatedResearch
} = require('../services/granite');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// In-memory session store for conversation history
const sessions = new Map();

/**
 * POST /api/agent/chat
 * Interactive research companion chat
 */
router.post('/chat', async (req, res) => {
  const { message, sessionId, domain, level } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const sid = sessionId || uuidv4();
  if (!sessions.has(sid)) sessions.set(sid, []);
  const history = sessions.get(sid);

  try {
    const userProfile = { domain, level };
    const response = await chatWithResearchAgent(message, history, userProfile);

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    if (history.length > 20) history.splice(0, 2); // Keep last 10 exchanges

    res.json({ response, sessionId: sid, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/chat]', err.message);
    res.status(500).json({ error: 'AI service unavailable', details: err.message });
  }
});

/**
 * POST /api/agent/query
 * Process a structured research query
 */
router.post('/query', async (req, res) => {
  const { query, context } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const result = await processResearchQuery(query, context || '');
    res.json({ query, result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/query]', err.message);
    res.status(500).json({ error: 'Query processing failed', details: err.message });
  }
});

/**
 * POST /api/agent/summarize
 * Summarize a research paper
 */
router.post('/summarize', async (req, res) => {
  const { title, abstract, fullText, authors, year, journal } = req.body;
  if (!title && !abstract && !fullText) {
    return res.status(400).json({ error: 'At least one of title, abstract, or fullText is required' });
  }

  try {
    const summary = await summarizePaper({ title, abstract, fullText, authors, year, journal });
    res.json({ summary, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/summarize]', err.message);
    res.status(500).json({ error: 'Summarization failed', details: err.message });
  }
});

/**
 * POST /api/agent/literature-review
 * Generate a literature review from a topic and optional papers
 */
router.post('/literature-review', async (req, res) => {
  const { topic, papers = [], depth = 'comprehensive' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    const review = await synthesizeLiteratureReview({ topic, papers, depth });
    res.json({ topic, review, paper_count: papers.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/literature-review]', err.message);
    res.status(500).json({ error: 'Literature review generation failed', details: err.message });
  }
});

/**
 * POST /api/agent/proposal
 * Generate a research proposal
 */
router.post('/proposal', async (req, res) => {
  const { topic, gap, methodology, resources } = req.body;
  if (!topic || !gap) return res.status(400).json({ error: 'topic and gap are required' });

  try {
    const proposal = await generateResearchProposal({ topic, gap, methodology, resources });
    res.json({ proposal, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/proposal]', err.message);
    res.status(500).json({ error: 'Proposal generation failed', details: err.message });
  }
});

/**
 * POST /api/agent/multimodal
 * Analyze charts, tables, or figures described in text
 */
router.post('/multimodal', async (req, res) => {
  const { inputType, content, question } = req.body;
  if (!inputType || !content) return res.status(400).json({ error: 'inputType and content are required' });

  try {
    const analysis = await analyzeMultimodalInput(inputType, content, question || '');
    res.json({ analysis, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/multimodal]', err.message);
    res.status(500).json({ error: 'Multimodal analysis failed', details: err.message });
  }
});

/**
 * POST /api/agent/related
 * Find semantically related research papers
 */
router.post('/related', async (req, res) => {
  const { targetPaper, candidatePapers = [] } = req.body;
  if (!targetPaper) return res.status(400).json({ error: 'targetPaper is required' });

  try {
    const result = await findRelatedResearch(targetPaper, candidatePapers);
    res.json({ result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/related]', err.message);
    res.status(500).json({ error: 'Related research search failed', details: err.message });
  }
});

/**
 * POST /api/agent/upload-pdf
 * Upload and parse a PDF paper for analysis
 */
router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      text = data.text.substring(0, 5000);
    } else {
      text = req.file.buffer.toString('utf8').substring(0, 5000);
    }

    const { question } = req.body;
    const analysis = await analyzeMultimodalInput('PDF Document', text, question || 'Summarize the key findings');
    res.json({ filename: req.file.originalname, analysis, text_preview: text.substring(0, 500), timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Agent/upload-pdf]', err.message);
    res.status(500).json({ error: 'PDF processing failed', details: err.message });
  }
});

/**
 * DELETE /api/agent/session/:id
 * Clear conversation history for a session
 */
router.delete('/session/:id', (req, res) => {
  sessions.delete(req.params.id);
  res.json({ message: 'Session cleared' });
});

module.exports = router;
