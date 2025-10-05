# CodeSage.ai

CodeSage.ai is an AI-powered code review assistant that analyzes code from GitHub or pasted snippets and provides real-time feedback, suggestions, and reports.

## Quick Start

Recommended: Docker Compose (starts API, UI and optional services).

1. Clone the repo:

```
git clone https://github.com/Hammadtanveer/CodeSage.ai.git
cd CodeSage.ai
```

2. Create backend env file:

```
cp api/.env.example api/.env
# Edit api/.env and set CEREBRAS_API_KEY and ALLOWED_ORIGINS
```

3. Start with Docker Compose:

```

```

4. Open the UI: http://localhost (or http://localhost:5173 for dev)

## Development

Backend (api):

```
# CodeSage.ai

CodeSage.ai is an AI-powered code review assistant that analyzes code (single files or multiple files from GitHub) and provides real-time, actionable feedback: bug detection, suggested improvements, refactor guidance, performance tips, and security notes.

This README covers how to get the project running locally, the core architecture and how CodeSage works, usage examples, and developer notes.

## Key features

- Multi-file GitHub analysis (paste one or many blob URLs)
- Real-time streaming responses to the UI using Server-Sent Events (SSE)
- Multiple analysis modes: bugs, improvements, refactor, performance, security, explain
- Prompt-injection mitigation and input sanitization
- Lightweight caching of GitHub file content for speed
- Docker-ready API and UI with production-friendly Dockerfiles

## Quick start

Recommended: Docker Compose (starts API, UI and optional services).

1. Clone the repo:

```
git clone https://github.com/Hammadtanveer/CodeSage.ai.git
cd CodeSage.ai
```

2. Create backend env file and set your API key:

```
cp api/.env.example api/.env
# Edit api/.env and set CEREBRAS_API_KEY and ALLOWED_ORIGINS
```

3. Start with Docker Compose:

```
docker-compose up -d --build
```

4. Open the UI: http://localhost (or http://localhost:5173 for dev)

## Development

Backend (api):

```
cd api
python -m venv venv
# Windows: venv\Scripts\Activate.ps1
# macOS / Linux: source venv/bin/activate
pip install -r requirements.txt
pytest
```

Frontend (ui):

```
cd ui
npm ci
npm run dev
# Build for production
npm run build
```

## How it works (high level)

- The frontend sends a POST to `/api/review` with either `url` (single file), `urls` (array) or raw `code`.
- The backend fetches GitHub blob URLs (converted to raw URLs), sanitizes and aggregates content, builds a mode-specific prompt, and streams the AI provider responses back to clients via SSE.
- The backend filters provider metadata-only chunks from the stream and returns only human-readable content to the UI.
- A small in-memory cache reduces redundant GitHub downloads during short sessions.

## Architecture

- UI: React + TypeScript + Vite, Tailwind CSS for styling, Framer Motion for animations.
- API: Flask (Python 3.11), server-sent events for streaming responses.
- AI Provider: configured via `CEREBRAS_API_KEY` and external completion API (provider-specific code lives in `api/app.py`).
- Optional services: Redis (caching), Postgres (analytics) — defined in `docker-compose.yml`.

## API (examples)

POST /api/review (single-file)

Request body:

```json
{ "url": "https://github.com/user/repo/blob/main/file.js", "mode": "bugs" }
```

Multi-file:

```json
{ "urls": ["https://github.com/user/repo/blob/main/a.py", "https://github.com/user/repo/blob/main/b.py"], "mode": "refactor" }
```

Response: SSE stream with JSON/text chunks. The frontend consumes the stream and renders results progressively.

GET /api/health
- Returns current service health and simple metrics.

## Privacy and security notes

- Do not commit `api/.env` or any secret keys to the repo. The `.gitignore` excludes env files.
- The backend strips or ignores likely prompt-injection strings from input code before sending prompts to the AI provider.
- Rate-limiting and CORS are configured; set `RATE_LIMIT` and `ALLOWED_ORIGINS` appropriately for production.

## Known limitations

- The in-memory cache is short-lived and not designed for horizontal scaling (consider Redis for production caching).
- The current streaming implementation filters provider metadata but consumers should still expect incremental partial content and handle reconnection/duplication.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add tests and documentation for new functionality
4. Open a pull request

## License

MIT

---

If you'd like, I can expand the API reference with concrete sample responses, add a quick architecture diagram, or commit and push the README update for you. Tell me which you prefer.
