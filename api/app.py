import os, re, json, time, requests, logging, secrets, hashlib, subprocess, tempfile, shutil, asyncio
from flask import Flask, request, Response, stream_with_context, jsonify
from functools import lru_cache
from flask_cors import CORS
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from urllib.parse import urlparse, quote
from concurrent.futures import ThreadPoolExecutor
import threading

# Create a session with connection pooling for better performance
http_session = requests.Session()
http_adapter = requests.adapters.HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20,
    max_retries=3,
    pool_block=False
)
http_session.mount("http://", http_adapter)
http_session.mount("https://", http_adapter)

VERSION = "0.1.0"

load_dotenv()
app = Flask(__name__)

# Security & Config hardening
REQUIRED_ENVS = ["CEREBRAS_API_KEY"]
missing = [k for k in REQUIRED_ENVS if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing env vars: {', '.join(missing)}")

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/minute")
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "120000"))

# Enhanced CORS with strict origin checking and debugging
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=True)

# Rate limiting with per-endpoint limits
limiter = Limiter(get_remote_address, app=app, default_limits=[RATE_LIMIT])

# Security headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response

# Request ID generation for tracking
def generate_request_id():
    return secrets.token_hex(8)

# Enhanced logging with structured format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Metrics collection
class Metrics:
    def __init__(self):
        self.requests_total = 0
        self.requests_success = 0
        self.requests_error = 0
        self.response_times = []
        self.start_time = time.time()

    def record_request(self, success: bool, response_time: float = 0):
        self.requests_total += 1
        if success:
            self.requests_success += 1
        else:
            self.requests_error += 1

        if response_time > 0:
            self.response_times.append(response_time)
            # Keep only last 1000 response times
            if len(self.response_times) > 1000:
                self.response_times = self.response_times[-1000:]

    def get_stats(self):
        uptime = time.time() - self.start_time
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        error_rate = (self.requests_error / self.requests_total * 100) if self.requests_total > 0 else 0

        return {
            "uptime_seconds": uptime,
            "requests_total": self.requests_total,
            "requests_success": self.requests_success,
            "requests_error": self.requests_error,
            "error_rate_percent": error_rate,
            "avg_response_time_ms": avg_response_time * 1000,
            "cache_size": len(github_cache._cache)
        }

# Global metrics instance
metrics = Metrics()

def error_response(msg: str, code: int = 400, request_id: str = None):
    error_data = {"message": msg, "code": code}
    if request_id:
        error_data["request_id"] = request_id
    return jsonify({"error": error_data}), code

def sanitize_code(raw: str) -> str:
    # Enhanced prompt injection filtering
    blocked_patterns = [
        "ignore previous", "you are now", "system:", "assistant:", "forget previous",
        "# system:", "// system:", "human:", "ai:", "user:", "bot:",
        "override", "bypass", "admin", "root", "sudo",
        "new instructions", "disregard", "ignore all",
        "role-play", "act as", "pretend to be",
        "developer mode", "debug mode", "unsafe mode"
    ]

    out = []
    for line in raw.splitlines():
        l = line.lower().strip()
        # Check for blocked patterns at start of line
        if any(l.startswith(p) for p in blocked_patterns):
            continue
        # Check for blocked patterns anywhere in line
        if any(p in l for p in blocked_patterns):
            continue
        # Remove comments that might contain injection attempts
        if l.startswith('//') or l.startswith('#') or l.startswith('/*') or l.startswith('*'):
            continue
        out.append(line)
    return "\n".join(out)

def get_prompt(mode: str, code: str) -> str:
    # Enhanced prompt design for simple English and actionable output
    base = (
        "You are CodeSage.ai, an expert code reviewer. Your audience is a junior developer. "
        "Use simple English. Use short sentences. Avoid jargon. Be clear, concise, and helpful. "
        "Focus on practical advice that developers can use right away."
    )

    tasks = {
        "bugs": "Find potential bugs in this code. For each bug, explain what the problem is, why it happens, and how to fix it. Show a small code example of the fix.",
        "improvements": "Suggest ways to make this code better. Focus on making it easier to read, faster, and follow best practices. For each suggestion, give a one-line reason and show a small before/after example if it helps.",
        "refactor": "Plan how to restructure this code for better organization. List concrete steps to take. Suggest new function or module names. Show a brief example of a key change.",
        "explain": "Explain what this code does in simple terms. Break down the functionality, purpose, and how each part works together. Use analogies and simple language.",
        "performance": "Analyze this code for performance issues. Find bottlenecks, suggest optimizations, and explain how changes will improve speed and efficiency.",
        "security": "Review this code for security vulnerabilities. Check for common issues like injection attacks, authentication problems, and data exposure risks."
    }

    examples = {
        "bugs": """Example response format:
## TL;DR
- Found 3 potential issues in the code
- Variable naming could cause confusion
- Error handling needs improvement

## Findings
- The function uses a variable name 'data' that conflicts with a built-in type, which can cause unexpected behavior
- Missing null checks before accessing object properties leads to runtime errors
- Loop variable 'i' is modified inside the loop, causing infinite loops

## Fix Steps
1. Rename the 'data' variable to 'userData' to avoid naming conflicts
2. Add null checks before accessing object properties
3. Use a separate variable for the loop counter to prevent infinite loops

## Code Examples
```javascript
// Before (problematic)
function process(data) {
  for (let i = 0; i < items.length; i++) {
    if (data.items[i]) {
      // process item
    }
  }
}

// After (fixed)
function process(userData) {
  for (let i = 0; i < items.length; i++) {
    if (userData && userData.items && userData.items[i]) {
      // process item
    }
  }
}
```""",
        "improvements": """Example response format:
## TL;DR
- Code can be more readable
- Performance can be improved
- Following best practices will help

## Findings
- Function is too long and does too many things
- Variable names are not clear
- Code repeats similar logic in multiple places

## Fix Steps
1. Break the large function into smaller, focused functions
2. Use more descriptive variable names
3. Create a helper function for repeated logic

## Code Examples
```javascript
// Before
function bigFunction(data) {
  let result = [];
  for (let x of data) {
    if (x.active) {
      result.push(x.name);
    }
  }
  return result;
}

// After
function getActiveNames(items) {
  return items
    .filter(item => item.active)
    .map(item => item.name);
}
```""",
        "refactor": """Example response format:
## TL;DR
- Code structure needs improvement
- Functions can be better organized
- Logic can be simplified

## Findings
- Related functions are mixed together
- Data processing and validation are in the same place
- Class has too many responsibilities

## Fix Steps
1. Group related functions into separate modules
2. Create a validation module for data checking
3. Split the large class into smaller, focused classes

## Code Examples
```javascript
// Before - everything in one class
class UserManager {
  validateUser() { /* validation logic */ }
  saveUser() { /* save logic */ }
  sendEmail() { /* email logic */ }
}

// After - separated into modules
// userValidation.js
export function validateUser(user) { /* validation logic */ }

// userRepository.js
export function saveUser(user) { /* save logic */ }

// emailService.js
export function sendEmail(email) { /* email logic */ }
```"""
    }

    t = tasks.get(mode, tasks["bugs"])
    example = examples.get(mode, examples["bugs"])

    return f"""{base}

Task: {t}

{example}

Code to review:
--------------------------------
{code}
--------------------------------

Remember: Keep language simple. Use short sentences. Focus on actionable advice. Always follow the exact format above."""

RAW_GITHUB_RE = re.compile(r"https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/blob/(?P<branch>[^/]+)/(?P<path>.+)")

class GitHubCache:
    def __init__(self, max_size=100, ttl_seconds=3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache = {}
        self._access_times = {}

    def _is_expired(self, key):
        return time.time() - self._access_times[key] > self.ttl_seconds

    def _evict_expired(self):
        expired_keys = [key for key in self._access_times.keys() if self._is_expired(key)]
        for key in expired_keys:
            del self._cache[key]
            del self._access_times[key]

    def get(self, key):
        self._evict_expired()
        if key in self._cache:
            self._access_times[key] = time.time()
            return self._cache[key]
        return None

    def set(self, key, value):
        self._evict_expired()
        if len(self._cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self._access_times.keys(), key=self._access_times.get)
            del self._cache[oldest_key]
            del self._access_times[oldest_key]

        self._cache[key] = value
        self._access_times[key] = time.time()

# Enhanced caching with TTL and size limits
github_cache = GitHubCache(max_size=100, ttl_seconds=3600)

class ResponseCache:
    def __init__(self, max_size=200, ttl_seconds=7200):  # 2 hour TTL for responses
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache = {}
        self._access_times = {}

    def _is_expired(self, key):
        return time.time() - self._access_times[key] > self.ttl_seconds

    def _evict_expired(self):
        expired_keys = [key for key in self._access_times.keys() if self._is_expired(key)]
        for key in expired_keys:
            del self._cache[key]
            del self._access_times[key]

    def get(self, key):
        self._evict_expired()
        if key in self._cache:
            self._access_times[key] = time.time()
            return self._cache[key]
        return None

    def set(self, key, value):
        self._evict_expired()
        if len(self._cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self._access_times.keys(), key=self._access_times.get)
            del self._cache[oldest_key]
            del self._access_times[oldest_key]

        self._cache[key] = value
        self._access_times[key] = time.time()

    def generate_key(self, prompt_hash, mode, file_count):
        return f"{prompt_hash}_{mode}_{file_count}"

# Response cache for AI responses
response_cache = ResponseCache(max_size=200, ttl_seconds=7200)

def detect_language(filename: str) -> str:
    """Detect programming language from file extension"""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    language_map = {
        'js': 'JavaScript', 'jsx': 'JavaScript (React)',
        'ts': 'TypeScript', 'tsx': 'TypeScript (React)',
        'py': 'Python', 'java': 'Java',
        'cpp': 'C++', 'cc': 'C++', 'cxx': 'C++',
        'c': 'C', 'cs': 'C#',
        'php': 'PHP', 'rb': 'Ruby',
        'go': 'Go', 'rs': 'Rust',
        'swift': 'Swift', 'kt': 'Kotlin',
        'scala': 'Scala', 'clj': 'Clojure',
        'html': 'HTML', 'css': 'CSS',
        'scss': 'SCSS', 'sass': 'Sass',
        'less': 'Less', 'md': 'Markdown',
        'json': 'JSON', 'xml': 'XML',
        'yaml': 'YAML', 'yml': 'YAML',
        'sh': 'Shell', 'bash': 'Bash',
        'sql': 'SQL', 'r': 'R',
        'matlab': 'MATLAB', 'm': 'MATLAB',
        'dart': 'Dart', 'lua': 'Lua',
        'perl': 'Perl', 'pl': 'Perl',
        'haskell': 'Haskell', 'hs': 'Haskell',
        'clojure': 'Clojure', 'elm': 'Elm',
        'erlang': 'Erlang', 'ex': 'Elixir',
        'nim': 'Nim', 'zig': 'Zig'
    }

    return language_map.get(ext, 'Unknown')

def analyze_repository_structure(repo_path: str) -> dict:
    """Analyze repository structure and provide insights"""
    structure = {
        'total_files': 0,
        'languages': {},
        'file_types': {},
        'directories': [],
        'main_files': [],
        'config_files': [],
        'test_files': [],
        'documentation_files': []
    }

    try:
        for root, dirs, files in os.walk(repo_path):
            # Skip common directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', '.git', 'dist', 'build', 'target']]

            for file in files:
                if file.startswith('.'):
                    continue

                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, repo_path)

                structure['total_files'] += 1

                # Detect language
                lang = detect_language(file)
                if lang != 'Unknown':
                    structure['languages'][lang] = structure['languages'].get(lang, 0) + 1

                # Categorize files
                if file in ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'composer.json']:
                    structure['config_files'].append(rel_path)
                elif file in ['README.md', 'README.txt', 'README.rst', 'README']:
                    structure['documentation_files'].append(rel_path)
                elif any(test_pattern in file.lower() for test_pattern in ['test', 'spec']):
                    structure['test_files'].append(rel_path)
                elif file in ['main.py', 'main.js', 'main.ts', 'main.go', 'main.rs', 'index.js', 'index.ts', 'app.py', 'app.js']:
                    structure['main_files'].append(rel_path)

            # Track directories
            for dir_name in dirs:
                dir_path = os.path.relpath(os.path.join(root, dir_name), repo_path)
                if dir_path not in structure['directories']:
                    structure['directories'].append(dir_path)

    except Exception as e:
        logger.error(f"Error analyzing repository structure: {e}")

    return structure

def clone_repository(repo_url: str, request_id: str) -> str:
    """Clone repository to temporary directory"""
    try:
        # Parse GitHub URL
        parsed = urlparse(repo_url)
        if 'github.com' not in parsed.netloc:
            raise ValueError("Only GitHub repositories are supported")

        path_parts = parsed.path.strip('/').split('/')
        if len(path_parts) < 2:
            raise ValueError("Invalid repository URL format")

        owner = path_parts[0]
        repo = path_parts[1].replace('.git', '')

        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix=f"codesage_repo_{request_id}_")
        repo_path = os.path.join(temp_dir, repo)

        logger.info(f"[{request_id}] Cloning repository {owner}/{repo} to {temp_dir}")

        # Clone repository (shallow clone for performance)
        clone_cmd = [
            'git', 'clone',
            '--depth', '1',
            '--single-branch',
            f'https://github.com/{owner}/{repo}.git',
            repo_path
        ]

        result = subprocess.run(
            clone_cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            raise ValueError(f"Failed to clone repository: {result.stderr}")

        logger.info(f"[{request_id}] Repository cloned successfully")
        return repo_path

    except Exception as e:
        logger.error(f"[{request_id}] Repository cloning failed: {e}")
        raise ValueError(f"Failed to clone repository: {str(e)}")

def fetch_code(url: str) -> str:
    m = RAW_GITHUB_RE.match(url.strip())
    if not m:
        raise ValueError("Unsupported GitHub URL. Use a direct blob file URL.")

    # Check cache first
    cache_key = f"{m.group('owner')}/{m.group('repo')}/{m.group('branch')}/{m.group('path')}"
    cached_result = github_cache.get(cache_key)
    if cached_result:
        logger.info(f"Cache hit for {cache_key}")
        return cached_result

    raw_url = f"https://raw.githubusercontent.com/{m.group('owner')}/{m.group('repo')}/{m.group('branch')}/{m.group('path')}"

    try:
        with requests.get(raw_url, timeout=15, stream=True) as r:
            if r.status_code != 200:
                raise ValueError(f"GitHub fetch failed with status {r.status_code}")

            # Check content length before downloading
            content_length = r.headers.get('content-length')
            if content_length and int(content_length) > MAX_FILE_BYTES:
                raise ValueError(f"File too large ({content_length} > {MAX_FILE_BYTES})")

            data = r.content

            # Double-check size after download
            if len(data) > MAX_FILE_BYTES:
                raise ValueError(f"File too large ({len(data)} > {MAX_FILE_BYTES})")

            decoded_content = data.decode("utf-8", errors="replace")

            # Cache the result
            github_cache.set(cache_key, decoded_content)
            logger.info(f"Cached content for {cache_key}, size: {len(decoded_content)}")

            return decoded_content

    except requests.exceptions.RequestException as e:
        raise ValueError(f"Network error fetching code: {str(e)}")
    except UnicodeDecodeError as e:
        raise ValueError(f"Could not decode file content: {str(e)}")

def get_github_repo_metadata(repo_url: str) -> dict:
    """Get repository metadata using GitHub API instead of cloning"""
    try:
        # Parse GitHub URL
        parsed = urlparse(repo_url)
        if 'github.com' not in parsed.netloc:
            raise ValueError("Only GitHub repositories are supported")

        path_parts = parsed.path.strip('/').split('/')
        if len(path_parts) < 2:
            raise ValueError("Invalid repository URL format. Expected: https://github.com/owner/repo")

        owner = path_parts[0]
        repo = path_parts[1].replace('.git', '')

        logger.info(f"Fetching metadata for repository: {owner}/{repo}")

        # GitHub API URLs
        repo_api_url = f"https://api.github.com/repos/{owner}/{repo}"
        contents_api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"

        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSage-AI/1.0'
        }

        # Get repository metadata
        logger.info(f"Making request to: {repo_api_url}")
        repo_response = requests.get(repo_api_url, headers=headers, timeout=10)
        logger.info(f"Repository API response status: {repo_response.status_code}")

        if repo_response.status_code == 404:
            raise ValueError(f"Repository '{owner}/{repo}' not found. Please check the URL and ensure the repository is public.")
        elif repo_response.status_code == 403:
            raise ValueError(f"Access forbidden to repository '{owner}/{repo}'. The repository might be private or rate limits exceeded.")
        elif repo_response.status_code != 200:
            raise ValueError(f"GitHub API error: {repo_response.status_code} - {repo_response.text[:200]}")

        repo_data = repo_response.json()
        logger.info(f"Repository data fetched: {repo_data.get('full_name', 'Unknown')}")

        # Get root contents for structure analysis
        logger.info(f"Fetching contents from: {contents_api_url}")
        contents_response = requests.get(contents_api_url, headers=headers, timeout=10)
        logger.info(f"Contents API response status: {contents_response.status_code}")

        if contents_response.status_code != 200:
            logger.warning(f"Failed to fetch repository contents: {contents_response.status_code}")
            contents_data = []
        else:
            contents_data = contents_response.json()
            logger.info(f"Fetched {len(contents_data)} items from repository contents")

        # Analyze structure from API data
        structure = analyze_repo_from_api(repo_data, contents_data)

        key_files = get_key_files_from_api(structure, contents_data, owner, repo)
        logger.info(f"Found {len(key_files)} key files for analysis")

        return {
            'repo_data': repo_data,
            'structure': structure,
            'key_files': key_files
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error fetching repository metadata: {e}")
        raise ValueError(f"Network error accessing GitHub API: {str(e)}")
    except ValueError as e:
        # Re-raise ValueError as-is for validation errors
        raise e
    except Exception as e:
        logger.error(f"Unexpected error fetching repository metadata: {e}")
        raise ValueError(f"Failed to analyze repository: {str(e)}")

def analyze_repo_from_api(repo_data: dict, contents_data: list) -> dict:
    """Analyze repository structure from GitHub API data"""
    structure = {
        'total_files': 0,
        'languages': {},
        'file_types': {},
        'directories': [],
        'main_files': [],
        'config_files': [],
        'test_files': [],
        'documentation_files': []
    }

    try:
        # Get languages from repo data
        if 'language' in repo_data and repo_data['language']:
            structure['languages'][repo_data['language']] = 1

        # Analyze contents
        for item in contents_data:
            if item['type'] == 'file':
                structure['total_files'] += 1
                filename = item['name']

                # Detect language
                lang = detect_language(filename)
                if lang != 'Unknown':
                    structure['languages'][lang] = structure['languages'].get(lang, 0) + 1

                # Categorize files
                if filename in ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'composer.json']:
                    structure['config_files'].append(filename)
                elif filename in ['README.md', 'README.txt', 'README.rst', 'README']:
                    structure['documentation_files'].append(filename)
                elif any(test_pattern in filename.lower() for test_pattern in ['test', 'spec']):
                    structure['test_files'].append(filename)
                elif filename in ['main.py', 'main.js', 'main.ts', 'main.go', 'main.rs', 'index.js', 'index.ts', 'app.py', 'app.js']:
                    structure['main_files'].append(filename)

            elif item['type'] == 'dir':
                structure['directories'].append(item['name'])

        return structure

    except Exception as e:
        logger.error(f"Error analyzing repository from API: {e}")
        return structure

def get_key_files_from_api(structure: dict, contents_data: list, owner: str, repo: str) -> list:
    """Get key files for analysis from API data"""
    key_files = []

    # Prioritize main files
    key_files.extend(structure['main_files'][:3])
    key_files.extend(structure['config_files'][:2])
    key_files.extend(structure['documentation_files'][:1])

    # Add some source files - be more flexible
    source_files = []
    for item in contents_data:
        if item['type'] == 'file' and not item['name'].startswith('.'):
            # Accept more file types for analysis
            lang = detect_language(item['name'])
            if lang != 'Unknown' and item['name'] not in [f['name'] for f in key_files if isinstance(f, dict)]:
                source_files.append({
                    'name': item['name'],
                    'language': lang,
                    'download_url': item['download_url']
                })

    # If we don't have enough source files, add some other files
    if len(source_files) < 3:
        for item in contents_data:
            if (item['type'] == 'file' and
                not item['name'].startswith('.') and
                item['name'] not in [f['name'] for f in key_files if isinstance(f, dict)] and
                item['name'] not in [f['name'] for f in source_files]):
                source_files.append({
                    'name': item['name'],
                    'language': detect_language(item['name']),
                    'download_url': item['download_url']
                })

    key_files.extend(source_files[:8])  # Increased to 8 files

    return key_files

HEARTBEAT_INTERVAL = 8
def chunk(content: str = "", event: str = "token", done: bool = False) -> str:
    # Consistent JSON schema with proper structure
    payload = {
        "choices": [{"delta": {"content": content}}],
        "event": event,
        "model": "llama3.1-8b",
        "usage": None
    }
    if done:
        payload["done"] = True
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n"

def cerebras_stream(prompt: str, request_id: str = ""):
    # Optimized settings for code analysis (Cerebras API compatible)
    payload = {
        "model": "llama3.1-8b",
        "messages": [
            {"role": "system", "content": "You are CodeSage.ai, an expert senior software engineer specializing in code analysis. Provide precise, actionable feedback."},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "temperature": 0.2,  # Lower temperature for more consistent code analysis
        "max_tokens": 2000,  # Increased token limit for detailed analysis
        "top_p": 0.9  # Nucleus sampling for better quality
    }
    headers = {"Authorization": f"Bearer {CEREBRAS_API_KEY}", "Content-Type": "application/json"}

    # Enhanced retry logic with exponential backoff and connection pooling
    max_retries = 3  # Increased retries for better reliability
    for attempt in range(max_retries):
        try:
            logger.info(f"[{request_id}] Starting Cerebras request (attempt {attempt + 1})")
            resp = requests.post(CEREBRAS_API_URL, json=payload, headers=headers, stream=True, timeout=120)
            if resp.status_code != 200:
                error_msg = f"[API error] {resp.status_code}: {resp.text[:160]}"
                logger.error(f"[{request_id}] {error_msg}")
                yield chunk(error_msg, "error", True)
                return
            logger.info(f"[{request_id}] Cerebras request successful")
            break
        except Exception as e:
            if attempt == max_retries - 1:
                error_msg = f"[Connection error] {str(e)}"
                logger.error(f"[{request_id}] {error_msg}")
                yield chunk(error_msg, "error", True)
                return
            wait_time = (2 ** attempt) * 1.2  # Exponential backoff
            logger.warning(f"[{request_id}] Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
            time.sleep(wait_time)

    last_emit = time.time()
    last_heartbeat = time.time()
    yield chunk(event="start")

    try:
        for raw in resp.iter_lines(decode_unicode=True):
            now = time.time()

            # Send heartbeat every 8 seconds
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                yield chunk(event="heartbeat")
                last_heartbeat = now

            if not raw:
                continue

            line = raw.strip()
            if line.startswith("data:"):
                line = line[5:].strip()
            if line == "[DONE]":
                break

            # Parse JSON response chunks
            if line.startswith("{") and line.endswith("}"):
                try:
                    obj = json.loads(line)
                    if "choices" in obj and obj["choices"]:
                        content = ""
                        for choice in obj.get("choices", []):
                            if choice and "delta" in choice:
                                delta = choice["delta"]
                                if "content" in delta:
                                    content += delta["content"]

                        if content:
                            yield chunk(content, "token")
                            last_emit = time.time()
                except json.JSONDecodeError as e:
                    logger.warning(f"[{request_id}] Failed to parse JSON: {e}")
                    continue

    except GeneratorExit:
        logger.info(f"[{request_id}] Client disconnected")
        return
    except Exception as e:
        error_msg = f"[Stream error] {str(e)}"
        logger.error(f"[{request_id}] {error_msg}")
        yield chunk(error_msg, "error")
    finally:
        logger.info(f"[{request_id}] Stream completed")
        yield chunk(event="end", done=True)
        yield "data: [DONE]\n"

@app.route("/api/review", methods=["POST"])
@limiter.limit(RATE_LIMIT)
def review():
    request_id = generate_request_id()
    start_time = time.time()
    logger.info(f"[{request_id}] New review request received")

    body = request.get_json(silent=True) or {}

    # Check for direct code input or GitHub URL
    code_input = body.get("code")
    urls = body.get("urls")  # Support both single URL and array of URLs
    url = body.get("url")  # Legacy support
    mode = body.get("mode", "bugs")

    # Handle both single URL (legacy) and array of URLs
    if not urls and not code_input:
        if url:
            urls = [url]
        else:
            logger.warning(f"[{request_id}] Missing code input and URLs")
            metrics.record_request(success=False, response_time=time.time() - start_time)
            return error_response("Missing 'code' or 'urls' or 'url'")

    if mode not in ("bugs", "improvements", "refactor", "explain", "performance", "security"):
        logger.warning(f"[{request_id}] Invalid mode: {mode}")
        metrics.record_request(success=False, response_time=time.time() - start_time)
        return error_response("Invalid mode")

    try:
        all_code = []
        file_info = []

        # Handle direct code input
        if code_input:
            logger.info(f"[{request_id}] Processing direct code input, length: {len(code_input)}")
            code_clean = sanitize_code(code_input)
            logger.info(f"[{request_id}] Code sanitized, length: {len(code_clean)}")

            all_code.append(f"## Code to Review\n\n```\n{code_clean}\n```")
            file_info.append({"type": "direct_input", "size": len(code_clean)})
        else:
            # Handle GitHub URLs (existing logic)
            if isinstance(urls, str):
                urls = [urls]

            for i, url_item in enumerate(urls):
                if not url_item:
                    continue

                logger.info(f"[{request_id}] Fetching code from GitHub: {url_item}")
                code_raw = fetch_code(url_item)
                logger.info(f"[{request_id}] Code fetched, length: {len(code_raw)}")

                code_clean = sanitize_code(code_raw)
                logger.info(f"[{request_id}] Code sanitized, length: {len(code_clean)}")

                # Extract file path from URL for labeling
                m = RAW_GITHUB_RE.match(url_item.strip())
                file_path = m.group('path') if m else f"file_{i+1}"

                all_code.append(f"## File: {file_path}\n\n```\n{code_clean}\n```")
                file_info.append({"url": url_item, "path": file_path, "size": len(code_clean)})

        if not all_code:
            metrics.record_request(success=False, response_time=time.time() - start_time)
            return error_response("No valid code provided")

        combined_code = "\n\n".join(all_code)
        file_count = len(urls) if urls else 1
        logger.info(f"[{request_id}] Combined {file_count} files, total length: {len(combined_code)}")

        # Check cache for similar requests
        prompt_hash = hashlib.md5(combined_code.encode()).hexdigest()[:16]
        cache_key = response_cache.generate_key(prompt_hash, mode, file_count)

        # For demo purposes, we'll skip caching for now but log cache stats
        logger.info(f"[{request_id}] Cache key: {cache_key}, cache size: {len(response_cache._cache)}")

        # Enhanced prompt for multi-file analysis
        multi_file_prompt = get_prompt(mode, combined_code)
        if len(all_code) > 1:
            multi_file_prompt = multi_file_prompt.replace(
                "Code to review:",
                f"Files to review ({len(all_code)} files):"
            )

        logger.info(f"[{request_id}] Prompt generated, length: {len(multi_file_prompt)}")

        response = Response(
            stream_with_context(cerebras_stream(multi_file_prompt, request_id)),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "X-Request-ID": request_id
            }
        )
        logger.info(f"[{request_id}] Response stream initiated")
        metrics.record_request(success=True, response_time=time.time() - start_time)
        return response

    except Exception as e:
        logger.error(f"[{request_id}] Error processing request: {str(e)}")
        metrics.record_request(success=False, response_time=time.time() - start_time)
        return error_response(str(e))

@app.route("/api/analyze-repo", methods=["POST"])
@limiter.limit(RATE_LIMIT)
def analyze_repository():
    """Analyze entire GitHub repositories using GitHub API"""
    request_id = generate_request_id()
    start_time = time.time()
    logger.info(f"[{request_id}] New repository analysis request received")

    body = request.get_json(silent=True) or {}
    repo_url = body.get("repository_url")
    mode = body.get("mode", "overview")

    if not repo_url:
        logger.warning(f"[{request_id}] Missing repository URL")
        metrics.record_request(success=False, response_time=time.time() - start_time)
        return error_response("Missing 'repository_url'")

    if mode not in ("overview", "bugs", "improvements", "refactor", "architecture", "security"):
        logger.warning(f"[{request_id}] Invalid mode: {mode}")
        metrics.record_request(success=False, response_time=time.time() - start_time)
        return error_response("Invalid mode")

    try:
        # Use GitHub API for faster analysis instead of cloning
        logger.info(f"[{request_id}] Fetching repository metadata via GitHub API: {repo_url}")
        repo_metadata = get_github_repo_metadata(repo_url)

        structure = repo_metadata['structure']
        key_files = repo_metadata['key_files']
        repo_data = repo_metadata['repo_data']

        # Fetch and combine key files
        all_code = []
        file_info = []

        for file_item in key_files[:8]:  # Reduced to 8 files for better performance
            try:
                if isinstance(file_item, dict) and 'download_url' in file_item:
                    # From GitHub API
                    file_response = requests.get(file_item['download_url'], timeout=10)
                    if file_response.status_code == 200:
                        content = file_response.text
                        filename = file_item['name']
                        language = file_item['language']
                    else:
                        continue
                else:
                    # Fallback to git clone for complex repos
                    logger.warning(f"[{request_id}] Falling back to git clone for {repo_url}")
                    repo_path = clone_repository(repo_url, request_id)

                    try:
                        with open(os.path.join(repo_path, file_item), 'r', encoding='utf-8', errors='replace') as f:
                            content = f.read()
                        filename = file_item
                        language = detect_language(filename)
                    finally:
                        shutil.rmtree(os.path.dirname(repo_path))
                        break

                if len(content.strip()) > 0 and len(content) < MAX_FILE_BYTES:
                    code_clean = sanitize_code(content)

                    all_code.append(f"## {filename} ({language})\n\n```\n{code_clean}\n```")
                    file_info.append({
                        "path": filename,
                        "language": language,
                        "size": len(code_clean)
                    })

            except Exception as e:
                logger.warning(f"[{request_id}] Could not fetch file {file_item}: {e}")
                continue

        if not all_code:
            raise ValueError("No readable source files found in repository")

        # Create repository overview
        repo_overview = f"""
# Repository Analysis: {repo_url}

## Project Overview
- **Repository**: {repo_data.get('full_name', 'Unknown')}
- **Description**: {repo_data.get('description', 'No description')}
- **Stars**: {repo_data.get('stargazers_count', 0)}
- **Forks**: {repo_data.get('forks_count', 0)}
- **Total Files**: {structure['total_files']}
- **Languages**: {', '.join([f"{lang} ({count})" for lang, count in list(structure['languages'].items())[:5]])}
- **Directories**: {len(structure['directories'])}
- **Main Files**: {len(structure['main_files'])}
- **Config Files**: {len(structure['config_files'])}
- **Test Files**: {len(structure['test_files'])}
- **Documentation**: {len(structure['documentation_files'])}

## Project Structure
{chr(10).join(f"- {dir_path}" for dir_path in structure['directories'][:10])}

## Selected Files for Analysis ({len(all_code)} files)
{chr(10).join(f"- {info['path']} ({info['language']})" for info in file_info)}

---
"""

        combined_code = repo_overview + "\n\n" + "\n\n".join(all_code)

        # Create optimized prompt for repository analysis
        base_prompt = (
            "You are CodeSage.ai, an expert software architect and code reviewer. "
            "Analyze this repository efficiently and provide actionable insights."
        )

        mode_prompts = {
            "overview": "Provide a comprehensive overview. Focus on: project purpose, code quality, architecture patterns, and key improvements. Be concise but thorough.",
            "architecture": "Analyze software architecture. Identify: design patterns, component relationships, structural issues. Suggest specific improvements.",
            "bugs": "Find potential bugs and reliability issues. Focus on: error handling, race conditions, logic errors. Provide concrete fixes.",
            "improvements": "Suggest code improvements. Focus on: readability, performance, maintainability. Give specific before/after examples.",
            "refactor": "Plan refactoring strategy. Identify: reorganization opportunities, naming improvements, structural changes.",
            "security": "Analyze security. Focus on: vulnerabilities, authentication, data handling, access control."
        }

        task_prompt = mode_prompts.get(mode, mode_prompts["overview"])

        # Optimized prompt - shorter and more focused
        full_prompt = f"""{base_prompt}

Task: {task_prompt}

Repository: {repo_data.get('full_name', 'Unknown')}
Description: {repo_data.get('description', 'No description')}

Structure: {structure['total_files']} files, {len(structure['directories'])} dirs
Languages: {', '.join([f"{lang} ({count})" for lang, count in list(structure['languages'].items())[:3]])}

Files to analyze ({len(all_code)} files):
{chr(10).join(f"- {info['path']} ({info['language']})" for info in file_info)}

Codebase:
--------------------------------
{combined_code[:6000]}
--------------------------------

Provide focused, actionable analysis."""

        logger.info(f"[{request_id}] Repository analysis prompt generated, length: {len(full_prompt)}")

        response = Response(
            stream_with_context(cerebras_stream(full_prompt, request_id)),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "X-Request-ID": request_id
            }
        )

        logger.info(f"[{request_id}] Repository analysis stream initiated")
        metrics.record_request(success=True, response_time=time.time() - start_time)
        return response

    except Exception as e:
        logger.error(f"[{request_id}] Repository analysis error: {str(e)}")
        metrics.record_request(success=False, response_time=time.time() - start_time)
        return error_response(str(e))

@app.errorhandler(429)
def ratelimit_handler(e):
    request_id = getattr(request, 'request_id', None)
    return error_response("Rate limit exceeded. Try again shortly.", 429, request_id)

@app.errorhandler(Exception)
def internal_error(e):
    request_id = getattr(request, 'request_id', None)
    logger.error(f"[{request_id}] Internal server error: {str(e)}")
    return error_response("Unexpected server error. Please try again.", 500, request_id)

@app.route("/api/health")
def health():
    stats = metrics.get_stats()
    return jsonify({
        "status": "ok",
        "version": VERSION,
        "metrics": stats,
        "cache": {
            "github_cache": {
                "enabled": True,
                "size": len(github_cache._cache),
                "max_size": github_cache.max_size,
                "ttl_seconds": github_cache.ttl_seconds
            },
            "response_cache": {
                "enabled": True,
                "size": len(response_cache._cache),
                "max_size": response_cache.max_size,
                "ttl_seconds": response_cache.ttl_seconds
            }
        }
    })

@app.route("/api/metrics")
def get_metrics():
    """Detailed metrics endpoint for monitoring"""
    stats = metrics.get_stats()
    return jsonify({
        "service": "codesage-api",
        "version": VERSION,
        "metrics": stats,
        "cache": {
            "github_cache": {
                "enabled": True,
                "size": len(github_cache._cache),
                "max_size": github_cache.max_size,
                "ttl_seconds": github_cache.ttl_seconds
            },
            "response_cache": {
                "enabled": True,
                "size": len(response_cache._cache),
                "max_size": response_cache.max_size,
                "ttl_seconds": response_cache.ttl_seconds
            },
            "hit_rate": "not_implemented"  # Could be enhanced with hit/miss tracking
        },
        "system": {
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}",
            "platform": os.sys.platform
        }
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
