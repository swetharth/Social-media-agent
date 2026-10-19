# 📊 Social Media Agent — IBM Granite AI

**Problem Statement #10 | IBM Bob + IBM Cloud + IBM Granite**

An intelligent, agentic social media companion that fuses multichannel data, enables multimodal interaction, provides predictive analytics, and visualizes real-time social media pulse — all powered by IBM Granite 3.3 via IBM watsonx.ai.

---

## 🚀 Features

### 1. Multichannel Data Fusion
- Unified feed from **Twitter/X, LinkedIn, Instagram, Facebook**
- Real API integration (when tokens provided) with intelligent mock data fallback
- Live multichannel search and filtering

### 2. AI-Powered Content Creation (IBM Granite)
- Generate platform-optimized posts (Twitter, LinkedIn, Instagram, Facebook)
- Multi-platform content generation in one click
- Hashtag optimization and post performance scoring
- Campaign strategy generation

### 3. Predictive & Agentic Layer
- Trend forecasting with growth velocity analysis
- Audience sentiment analysis via IBM Granite NLP
- Competitor intelligence and benchmarking
- Optimal posting schedule recommendations
- Conversational AI agent for strategy Q&A

### 4. Real-time Dashboard
- Live engagement metrics via Socket.IO
- Sentiment tracking across all platforms
- Influencer mapping and collaboration scores
- Interactive Chart.js visualizations
- Live alert feed for trend spikes and engagement events

---

## 🏗️ Architecture

```
social-media-agent/
├── server/
│   ├── index.js              # Express + Socket.IO server
│   ├── services/
│   │   ├── granite.js        # IBM Granite / watsonx.ai integration
│   │   ├── social.js         # Multichannel social media service
│   │   └── realtime.js       # WebSocket live updates
│   └── routes/
│       ├── agent.js          # AI agent endpoints
│       ├── analytics.js      # Analytics & sentiment endpoints
│       ├── content.js        # Content generation endpoints
│       └── social.js         # Social feed endpoints
├── public/
│   └── index.html            # Full dashboard SPA
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- IBM watsonx.ai account (Project ID + API Key provided)

### 1. Configure Environment
```bash
cp env.example .env
```

Edit `.env` and set:
```
IBM_WATSONX_API_KEY=a7986ff0-a020-48dc-97a4-438314182826
IBM_WATSONX_PROJECT_ID=7186deab-885c-46e8-9f5f-9e8efd862a09
IBM_GRANITE_MODEL_ID=ibm/granite-3-3-8b-instruct
```

### 2. Install & Run
```bash
npm install
npm start
```

Open **http://localhost:3000**

### 3. Docker
```bash
# Build & run
docker-compose up --build

# Or manually
docker build -t social-media-agent .
docker run -p 3000:3000 \
  -e IBM_WATSONX_API_KEY=your_key \
  -e IBM_WATSONX_PROJECT_ID=your_project_id \
  social-media-agent
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health + model info |
| POST | `/api/agent/chat` | AI agent conversation |
| POST | `/api/agent/analyze` | Full multichannel analysis |
| POST | `/api/agent/campaign` | Campaign strategy generation |
| POST | `/api/agent/competitor` | Competitor intelligence |
| GET | `/api/analytics/overview` | All-platform dashboard data |
| GET | `/api/analytics/:platform` | Single platform metrics |
| GET | `/api/analytics/trends/hashtags` | Trending hashtags |
| POST | `/api/analytics/sentiment` | Sentiment analysis |
| GET | `/api/analytics/influencers/map` | Influencer data |
| POST | `/api/content/generate` | AI post generation |
| POST | `/api/content/generate-multi` | Multi-platform generation |
| POST | `/api/content/hashtags` | Hashtag recommendations |
| POST | `/api/content/optimize` | Post optimization |
| GET | `/api/social/feed` | Unified multichannel feed |
| POST | `/api/social/competitors` | Competitor data |

---

## 🤖 IBM Granite Integration

The app uses **IBM Granite 3.3 8B Instruct** via the watsonx.ai REST API for:

- **Post generation** — Platform-aware content with brand voice
- **Sentiment analysis** — Structured JSON sentiment scoring
- **Trend forecasting** — Predictive hashtag and topic analysis
- **Campaign strategy** — Full strategic plans with KPIs
- **Competitor analysis** — Actionable competitive intelligence
- **Conversational agent** — Multi-turn strategy conversations

Authentication uses IBM IAM token exchange with automatic 50-minute cache refresh.

---

## 📡 Real-time Features (Socket.IO)

| Event | Frequency | Description |
|-------|-----------|-------------|
| `live:pulse` | 8s | Live platform metrics + alerts |
| `live:sentiment` | 15s | Cross-platform sentiment scores |
| `live:engagement_spike` | 30s | Viral engagement alerts |

---

## 🎨 Dashboard Views

1. **Overview** — KPI cards, engagement chart, trending list, live alerts
2. **Analytics** — Platform-specific deep dive with time series
3. **Sentiment** — AI sentiment analysis + live platform scores
4. **Trending** — Hashtag velocity across all platforms
5. **AI Agent** — Conversational IBM Granite AI
6. **Content Studio** — Post generator + multi-platform drafting
7. **Campaign Planner** — AI campaign strategy builder
8. **Competitors** — Competitive intelligence dashboard
9. **Influencers** — Collaboration scoring and mapping
10. **Live Feed** — Multichannel unified post stream

---

## 🔑 Project Info

| Key | Value |
|-----|-------|
| Project ID | `7186deab-885c-46e8-9f5f-9e8efd862a09` |
| Model | `ibm/granite-3-3-8b-instruct` |
| Region | `us-south` |
| Platform | IBM watsonx.ai |
