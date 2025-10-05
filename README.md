# CodeSage.ai — AI Code Mentor

CodeSage.ai is an AI‑powered code review assistant. Paste code or point it to GitHub files and get real‑time analysis with clear, actionable insights across bug detection, improvements, refactoring, performance, security, and more.

- Live streaming responses (SSE) for instant feedback
- GitHub integration (single or multiple file URLs)
- Secure by default (sanitization, rate limiting, CORS)
- PWA with offline support and install prompts
- Docker‑ready; easy to deploy on Render (free) or anywhere

---

## Table of contents
- Overview
- Features
- Tech stack
- Architecture at a glance
- Getting started (local dev)
- Environment variables
- API reference
- Docker Compose
- Deploy to Render (free)
- PWA notes
- Testing
- Security and privacy
- Roadmap
- License

---

## Overview

CodeSage.ai helps developers quickly understand and improve code. It accepts:
- GitHub blob URLs (single file or an array of files)
- Raw code pasted into the UI
- Minimal repository overview via README analysis

The backend builds a mode‑specific prompt and streams results to the UI using Server‑Sent Events, so users see insights as they’re generated.

---

## Features

- Analysis modes
  - bugs — find issues and fixes with tiny code examples
  - improvements — targeted suggestions with rationale
  - refactor — safe step‑by‑step refactor plan
  - performance — hotspots, complexity notes, concrete optimizations
  - security — risks, severity, and safe fixes
  - explain — simple English explanations of what code does
  - overview / architecture — high‑level summaries and structure feedback
- Multi‑file analysis (array of GitHub blob URLs)
- Streaming UI with progress indicators
- Copy and download results (Markdown)
- Theme switcher (light/dark/auto), keyboard shortcuts, demo button
- Input sanitization against prompt injection
- CORS allow‑listing and rate limiting
- PWA: service worker, manifest, install prompt, offline fallbacks

---

## Tech stack

- Frontend: React + TypeScript + Vite, Tailwind CSS, Framer Motion, PWA (service worker + manifest)
- Backend: Flask, Flask‑CORS, Flask‑Limiter, requests, python‑dotenv
- AI provider: Cerebras API (chat completions, streamed)
- Packaging/Infra: Docker, Docker Compose, Nginx (for UI image), GitHub Actions (CI)
- Optional (docker‑compose): Redis, Postgres (not required for basic functionality)

---

## Architecture at a glance

- UI (Vite) calls the API at /api/review and /api/analyze-repo
- API
  - fetches GitHub raw content (for blob URLs)
  - sanitizes inputs to reduce prompt injection
  - builds mode‑specific prompts
  - streams the AI response as SSE
- Nginx (UI container) proxies /api/* to the API container
- Optional services (Redis/Postgres) are provided in docker-compose.yml for future expansion

---

## Getting started (local dev)

Prereqs: Node 18+ (or 20+), Python 3.11, Git.

1) Backend (Flask)
- Set up venv and install:
```
cd api
python -m venv venv
# Windows
venv\Scripts\Activate.ps1
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```
- Create api/.env:
```
CEREBRAS_API_KEY=your_cerebras_key
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT=30/minute
MAX_FILE_BYTES=120000
```
- Run:
```
python app.py
# API at http://localhost:5000
```

2) Frontend (Vite)
```
cd ui
npm ci
npm run dev
# UI at http://localhost:5173
```

Quick check:
```
# Health
curl http://localhost:5000/api/health
```

---

## Environment variables

Backend (api/.env):
```
CEREBRAS_API_KEY=your_cerebras_key  # required
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT=30/minute
MAX_FILE_BYTES=120000
```

Frontend:
- Typically none required. If you use an absolute API URL, add:
```
VITE_API_BASE_URL=https://your-api-domain/api
```

---

## API reference

Base URL:
- Local: http://localhost:5000/api
- Docker (via Nginx at port 80): http://localhost/api

1) POST /api/review
- Analyze raw code or GitHub file(s). Supports streaming (text/event-stream).
- Request (one of):
```
{ "code": "<your code>", "mode": "bugs" }
```
```
{ "url": "https://github.com/user/repo/blob/branch/path/file.js", "mode": "refactor" }
```
```
{ "urls": ["https://github.com/.../a.ts","https://github.com/.../b.ts"], "mode": "performance" }
```
- Modes: bugs | improvements | refactor | explain | performance | security | overview | architecture
- Response: SSE stream with JSON chunks shaped like:
```
data: {"choices":[{"delta":{"content":"...chunk..."}}],"event":"token"}
```
Ends with:
```
data: {"event":"end","choices":[{"delta":{"content":""}}],"done":true}
data: [DONE]
```

2) POST /api/analyze-repo
- Minimal README‑based overview:
```
{ "repository_url": "https://github.com/user/repo", "mode": "overview" }
```
- Response: SSE stream (same shape as above).

3) GET /api/health
- Returns status, version, simple metrics, and cache info.

---

## Docker Compose

Build and run both services (API + UI). Optional Redis and Postgres included but not required.

```
docker-compose up -d --build
# UI at http://localhost
# API at http://localhost:5000
```

Tip: Ensure api/.env exists before running compose. The UI container proxies /api/ to the API container (see ui/nginx.conf).
## Testing

Backend:
```
cd api
pytest -q
```

CI: GitHub Actions workflow runs lint, tests, and a basic security audit on pushes/PRs to main/develop.

---

## Security and privacy

- Do not commit api/.env or any secrets. A .gitignore is included.
- Input sanitization removes common injection phrases before prompting the model.
- CORS is locked to allowed origins; rate limiting is enabled.
- If a key was ever committed, rotate it immediately with the provider.

---

## License

MIT — see LICENSE for details.

---

