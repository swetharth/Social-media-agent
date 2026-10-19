require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');

const agentRoutes = require('./routes/agent');
const analyticsRoutes = require('./routes/analytics');
const { startRealTimeUpdates } = require('./services/realtime');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serve frontend
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/agent', agentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Research Agent — IBM Granite Powered',
    project_id: process.env.IBM_WATSONX_PROJECT_ID,
    model: process.env.IBM_GRANITE_MODEL_ID || 'ibm/granite-3-3-8b-instruct',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: [
      'literature_review',
      'research_query',
      'trend_analysis',
      'citation_gap_detection',
      'knowledge_graph',
      'paper_summarization',
      'research_proposals',
      'multimodal_analysis',
      'agent_chat',
      'pdf_upload'
    ]
  });
});

// Attach socket.io to app
app.set('io', io);

// Socket.IO — research collaboration events
io.on('connection', (socket) => {
  console.log(`[WS] Researcher connected: ${socket.id}`);

  socket.on('subscribe:domain', (domain) => {
    socket.join(`domain:${domain}`);
    console.log(`[WS] ${socket.id} subscribed to domain: ${domain}`);
  });

  socket.on('research:query', async (data) => {
    // Broadcast query to room for collaborative research
    socket.to(`domain:${data.domain || 'general'}`).emit('research:peer_query', {
      query: data.query,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Researcher disconnected: ${socket.id}`);
  });
});

// Start real-time research feed
startRealTimeUpdates(io);

// Fallback to frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║         RESEARCH AGENT — IBM GRANITE AI         ║`);
  console.log(`╠════════════════════════════════════════════════╣`);
  console.log(`║  Dashboard : http://localhost:${PORT}             ║`);
  console.log(`║  API Health: http://localhost:${PORT}/api/health  ║`);
  console.log(`║  Model     : ${(process.env.IBM_GRANITE_MODEL_ID || 'ibm/granite-3-3-8b-instruct').padEnd(32)} ║`);
  console.log(`║  Project   : ${(process.env.IBM_WATSONX_PROJECT_ID || 'not set').substring(0, 32).padEnd(32)} ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
});

module.exports = { app, server, io };
