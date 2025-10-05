import os, re, json, time, logging, secrets, requests
import threading
from pathlib import Path
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

VERSION = "0.1.0"

load_dotenv()
app = Flask(__name__)

# ----- Env validation -----
REQUIRED_ENVS = ["CEREBRAS_API_KEY"]
missing = [k for k in REQUIRED_ENVS if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing env vars: {', '.join(missing)}")

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/minute")
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "120000"))

# CORS + rate limiting
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})
limiter = Limiter(get_remote_address, app=app, default_limits=[RATE_LIMIT])

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("codesage")

# ----- Security headers -----
@app.after_request
def add_security_headers(response):
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    return response

# ----- Metrics -----
class Metrics:
    def __init__(self):
        self.start_time = time.time()
        self.requests_total = 0
        self.requests_success = 0
        self.requests_error = 0
        self.response_times = []

    def record_request(self, success: bool, response_time: float = 0.0):
        self.requests_total += 1
        if success:
            self.requests_success += 1
        else:
            self.requests_error += 1
        if response_time:
            self.response_times.append(response_time)

    def get_stats(self):
        uptime = time.time() - self.start_time
        avg_rt = (sum(self.response_times) / len(self.response_times)) if self.response_times else 0.0
        error_rate = (self.requests_error / self.requests_total * 100.0) if self.requests_total else 0.0
        return {
            "uptime_seconds": round(uptime, 2),
            "requests_total": self.requests_total,
            "requests_success": self.requests_success,
            "requests_error": self.requests_error,
            "error_rate_percent": round(error_rate, 2),
            "avg_response_time_ms": round(avg_rt * 1000, 1),
            "cache_size": 0  # populated below when cache is created
        }

metrics = Metrics()

# ----- Errors -----
def error_response(msg: str, code: int = 400, request_id: str = None):
    payload = {"error": {"message": msg, "code": code}}
    if request_id:
        payload["error"]["request_id"] = request_id
    return jsonify(payload), code

# ----- Sanitization -----
def sanitize_code(raw: str) -> str:
    blocked_patterns = (
        "ignore previous", "you are now", "system:", "assistant:",
        "forget previous", "# system:", "// system:", "human:", "user:", "bot:",
        "override", "bypass", "admin", "root", "sudo",
        "new instructions", "disregard", "ignore all",
        "role-play", "act as", "pretend to be",
        "developer mode", "debug mode", "unsafe mode"
    )
    out = []
    for line in raw.splitlines():
        l = line.lower().strip()
        # Check for blocked patterns anywhere in line
        if any(p in l for p in blocked_patterns):
            continue
        # Remove comments that might contain injection attempts
        if l.startswith('//') or l.startswith('#') or l.startswith('/*') or l.startswith('*'):
            continue
        out.append(line)
    return "\n".join(out)

# ----- Prompt builder (simple English, test-friendly) -----
def get_prompt(mode: str, code: str) -> str:
    base = (
        "You are CodeSage.ai, an expert code reviewer. Your audience is a junior developer. "
        "Use simple English. Use short sentences. Be clear and actionable."
    )
    tasks = {
        "bugs": "Explain each bug: what, why, and how to fix. Include a tiny code example.",
        "improvements": "Suggest improvements. One-line reason each. Include small before/after when helpful.",
        "refactor": "Give a small refactor plan. List steps. Name functions/modules. Include a short example.",
        "explain": "Explain what the code does. Summarize modules and key functions in simple terms.",
        "performance": "Identify performance bottlenecks. Mention complexity and concrete optimizations.",
        "security": "Identify security risks and misuse patterns. Provide safe fixes and best practices.",
        "overview": "Provide a high-level overview and key strengths/risks.",
        "architecture": "Assess architecture, module boundaries, and coupling. Suggest improvements.",
    }
    # Normalize unknown modes to closest category
    normalized = mode.lower()
    if normalized not in tasks:
        if normalized in ("perf", "speed", "latency"):
            normalized = "performance"
        elif normalized in ("sec", "vuln", "vulnerability"):
            normalized = "security"
        else:
            normalized = "bugs"
    t = tasks.get(normalized, tasks["bugs"])

    # Mode-specific instruction skeletons to make outputs distinct
    skeletons = {
        "bugs": (
            "Answer with: TL;DR (3-5 bullets), Findings (one bug per bullet, file/line if possible), "
            "Fix Steps (ordered, concrete), and a tiny code example showing the fix. Keep examples minimal."
        ),
        "improvements": (
            "Answer with: TL;DR (3-5 bullets), Improvements (each with one-line rationale), "
            "Before/After snippets when helpful, and optional trade-offs. Avoid rewriting whole files."
        ),
        "refactor": (
            "Answer with: Summary, High-level refactor plan (ordered steps), list of functions/modules to change, "
            "estimated effort, and a short example showing a refactored function. Emphasize small, safe refactors."
        ),
        "explain": (
            "Answer with: Short summary, what each major function does, and a brief line-by-line explanation for the top 10 lines or the most complex function. Keep it educational."
        ),
        "performance": (
            "Answer with: TL;DR, list of performance hotspots (with Big-O or complexity notes), concrete optimizations, and "
            "one small code change example to improve speed or memory. Include estimated impact."
        ),
        "security": (
            "Answer with: TL;DR, list of security issues (severity: low/medium/high), exploit example (short), and secure fix steps. Mention input validation and secrets handling."
        ),
        "overview": (
            "Answer with: Short project overview, main responsibilities of files, strengths, weaknesses, and recommended next steps."
        ),
        "architecture": (
            "Answer with: High-level architecture review, coupling/cohesion notes, suggested module boundaries, and migration steps for large changes."
        ),
    }

    instr = skeletons.get(normalized, skeletons["bugs"])

    return f"""{base}

Mode: {normalized.upper()}

Task instruction:
{t}

Required output style:
{instr}

Respond in markdown. Use the following headings where relevant: TL;DR, Findings, Fix Steps, Code Examples, Notes.

Code to review:
--------------------------------
{code}
--------------------------------
"""

# ----- GitHub fetch with raw URL conversion -----
RAW_GITHUB_RE = re.compile(r"https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/blob/(?P<branch>[^/]+)/(?P<path>.+)")

def fetch_code(url: str) -> str:
    m = RAW_GITHUB_RE.match(url.strip())
    if not m:
        raise ValueError("Unsupported GitHub URL. Use a direct blob file URL.")
    raw_url = f"https://raw.githubusercontent.com/{m.group('owner')}/{m.group('repo')}/{m.group('branch')}/{m.group('path')}"
    with requests.get(raw_url, timeout=15, stream=True) as r:
        if r.status_code != 200:
            raise ValueError(f"Fetch failed {r.status_code}")
        data = r.content
        if len(data) > MAX_FILE_BYTES:
            raise ValueError(f"File too large ({len(data)} > {MAX_FILE_BYTES})")
        return data.decode("utf-8", errors="replace")

# ----- Simple in-memory cache with TTL (used only for health metrics in tests) -----
class GitHubCache:
    def __init__(self, max_size=100, ttl_seconds=3600):
        self.max_size = max_size
        self.ttl = ttl_seconds
        self._cache = {}  # key -> (value, expiry)
    def _is_expired(self, key):
        item = self._cache.get(key)
        return (item is None) or (time.time() > item[1])
    def _evict_expired(self):
        for k in list(self._cache.keys()):
            if self._is_expired(k):
                self._cache.pop(k, None)
        # basic size bound
        while len(self._cache) > self.max_size:
            self._cache.pop(next(iter(self._cache)))
    def get(self, key):
        if self._is_expired(key):
            self._cache.pop(key, None)
            return None
        return self._cache[key][0]
    def set(self, key, value):
        self._cache[key] = (value, time.time() + self.ttl)
        self._evict_expired()

github_cache = GitHubCache()


# ----- Streaming helpers -----
HEARTBEAT_INTERVAL = 8
def _chunk(content: str = "", event: str = "token", done: bool = False) -> str:
    payload = {"choices": [{"delta": {"content": content}}], "event": event}
    if done:
        payload["done"] = True
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n"

def cerebras_stream(prompt: str):
    headers = {"Authorization": f"Bearer {CEREBRAS_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama3.1-8b",
        "messages": [
            {"role": "system", "content": "You are an expert senior software engineer assistant."},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "temperature": 0.4,
        "max_tokens": 1200,
    }

    # One retry
    for attempt in (1, 2):
        try:
            resp = requests.post(CEREBRAS_API_URL, headers=headers, json=payload, stream=True, timeout=120)
            if resp.status_code != 200:
                yield _chunk(f"[API error] {resp.status_code}: {resp.text[:160]}", "error", True)
                return
            break
        except Exception as e:
            if attempt == 2:
                yield _chunk(f"[Connection error] {e}", "error", True)
                return
            time.sleep(1.0)

    last_emit = time.time()
    yield _chunk(event="start")
    try:
        for raw in resp.iter_lines(decode_unicode=True):
            now = time.time()
            if now - last_emit >= HEARTBEAT_INTERVAL:
                yield _chunk(event="heartbeat"); last_emit = now
            if not raw:
                continue
            line = raw.strip()
            if line.startswith("data:"):
                line = line[5:].strip()
            if line == "[DONE]":
                break
            sent = False
            if line.startswith("{") and line.endswith("}"):
                try:
                    obj = json.loads(line)
                    if "choices" in obj:
                        acc = ""
                        for c in obj.get("choices", []):
                            delta = (c or {}).get("delta") or {}
                            piece = delta.get("content", "")
                            if piece:
                                acc += piece
                        if acc:
                            yield _chunk(acc, "token"); last_emit = time.time(); sent = True
                except json.JSONDecodeError:
                    pass
            if not sent:
                yield _chunk(line, "token"); last_emit = time.time()
    except GeneratorExit:
        return
    except Exception as e:
        yield _chunk(f"[Stream error] {e}", "error")
    finally:
        yield _chunk(event="end", done=True)
        yield "data: [DONE]\n"

# ----- Routes -----
@app.route("/api/review", methods=["POST"])
@limiter.limit(RATE_LIMIT)
def review():
    request_id = secrets.token_hex(8)
    t0 = time.time()
    body = request.get_json(silent=True) or {}
    url = body.get("url")
    urls = body.get("urls")  # optional array for multi-file
    code_input = body.get("code")
    mode = (body.get("mode") or "bugs").lower()

    # Accept: either code OR url(s)
    if not code_input and not url and not urls:
        metrics.record_request(False)
        return error_response("Provide 'code' or 'url' (or 'urls' array)", 400, request_id)

    try:
        aggregated_code = ""
        if code_input:
            aggregated_code = f"// Provided code snippet\n{code_input}"
        else:
            target_urls = []
            if urls and isinstance(urls, list):
                target_urls.extend([u for u in urls if isinstance(u, str) and u.strip()])
            if url and isinstance(url, str):
                target_urls.append(url)
            if not target_urls:
                raise ValueError("No valid URL(s) provided")
            parts = []
            for idx, u in enumerate(target_urls, start=1):
                try:
                    content = fetch_code(u)
                    parts.append(f"// File {idx}: {u}\n{content}")
                except Exception as fe:
                    parts.append(f"// File {idx}: {u} (fetch error: {fe})\n")
            aggregated_code = "\n\n".join(parts)

        clean_code = sanitize_code(aggregated_code)
        prompt = get_prompt(mode, clean_code)
    except Exception as e:
        metrics.record_request(False)
        return error_response(str(e), 400, request_id)

    resp = Response(
        stream_with_context(cerebras_stream(prompt)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
    metrics.record_request(True, time.time() - t0)
    return resp

@app.route("/api/analyze-repo", methods=["POST"])
@limiter.limit(RATE_LIMIT)
def analyze_repo():
    """Minimal repository analysis to avoid 400s and provide useful output.
    Tries to fetch README.md from the repo (main/master) and run the same analysis pipeline.
    Expects: { "repository_url": "https://github.com/owner/repo", "mode": "overview" | ... }
    """
    request_id = secrets.token_hex(8)
    t0 = time.time()
    body = request.get_json(silent=True) or {}
    repo_url = (body.get("repository_url") or body.get("repo") or body.get("url") or "").strip()
    mode = (body.get("mode") or "overview").lower()
    if not repo_url:
        metrics.record_request(False)
        return error_response("Missing 'repository_url'", 400, request_id)

    # Parse owner/repo from URL like https://github.com/owner/repo[.git][/...]
    m = re.match(r"https?://github\.com/([^/]+)/([^/#?]+)", repo_url)
    if not m:
        metrics.record_request(False)
        return error_response("Unsupported repository URL", 400, request_id)
    owner, repo = m.group(1), m.group(2).replace(".git", "")

    def stream_repo():
        yield _chunk(event="start")
        branches = ["main", "master"]
        tried = []
        content = None
        for br in branches:
            raw = f"https://raw.githubusercontent.com/{owner}/{repo}/{br}/README.md"
            tried.append(raw)
            try:
                r = requests.get(raw, timeout=15)
                if r.status_code == 200 and r.content:
                    content = r.content.decode("utf-8", errors="replace")
                    break
            except Exception:
                pass
        if not content:
            msg = (
                "Could not fetch README.md from the repository (tried: "
                + ", ".join(tried)
                + "). Please provide specific file URLs instead."
            )
            # Still return as a valid SSE stream, not a 400
            yield _chunk(msg, event="token")
            yield _chunk(event="end", done=True)
            yield "data: [DONE]\n"
            return

        # Limit to a reasonable size
        if len(content.encode("utf-8")) > MAX_FILE_BYTES:
            content = content[: MAX_FILE_BYTES // 2] + "\n... (truncated)"

        prompt = get_prompt(mode, sanitize_code(content))
        for piece in cerebras_stream(prompt):
            yield piece

    resp = Response(
        stream_with_context(stream_repo()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
    metrics.record_request(True, time.time() - t0)
    return resp

@app.route("/api/health")
def health():
    stats = metrics.get_stats()
    stats["cache_size"] = len(github_cache._cache)
    return jsonify({
        "status": "ok",
        "version": VERSION,
        "metrics": stats,
        "cache": {
            "enabled": True,
            "size": len(github_cache._cache),
            "max_size": github_cache.max_size,
            "ttl_seconds": github_cache.ttl
        }
    })




@app.errorhandler(429)
def ratelimit_handler(e):
    return error_response("Rate limit exceeded. Try again shortly.", 429)

@app.errorhandler(Exception)
def internal_error(e):
    # Hide stack traces from clients
    logger.exception("Internal server error")
    return error_response("Unexpected server error. Please try again.", 500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
