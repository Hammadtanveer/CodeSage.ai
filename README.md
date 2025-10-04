# CodeSage.ai

Your personal AI code mentor. Get instant feedback and write better code with advanced AI analysis.

## 🚀 Features

- **Multi-file Analysis**: Review multiple GitHub files in a single request
- **Smart Caching**: Fast responses with intelligent GitHub content caching
- **Real-time Streaming**: Server-sent events for responsive UI updates
- **Security First**: Enhanced prompt injection protection and input sanitization
- **Production Ready**: Docker containers, health checks, and monitoring
- **Developer Experience**: Copy results, download reports, and persistent settings

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codesage
   ```

2. **Set up environment variables**
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env with your Cerebras API key
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - UI: http://localhost
   - API: http://localhost:5000
   - Health: http://localhost:5000/api/health

### Manual Installation

#### Backend Setup

```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python app.py
```

#### Frontend Setup

```bash
cd ui
npm install
npm run dev
```

## 🔧 Development Setup

### Prerequisites

- Python 3.9+
- Node.js 20+
- Docker (optional)

### Environment Variables

Create `api/.env` with:

```env
CEREBRAS_API_KEY=your_cerebras_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT=30/minute
MAX_FILE_BYTES=120000
```

### Running Tests

```bash
# API tests
cd api
pip install pytest
pytest

# Frontend tests
cd ui
npm test
```

## 📚 API Reference

### Endpoints

#### POST /api/review

Analyze GitHub code files.

**Request Body:**
```json
{
  "urls": ["https://github.com/user/repo/blob/main/file.js"],
  "mode": "bugs" | "improvements" | "refactor"
}
```

**Legacy format (single URL):**
```json
{
  "url": "https://github.com/user/repo/blob/main/file.js",
  "mode": "bugs"
}
```

**Response:** Server-sent events stream with analysis results.

#### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "metrics": {
    "uptime_seconds": 3600,
    "requests_total": 150,
    "requests_success": 145,
    "requests_error": 5,
    "error_rate_percent": 3.33,
    "avg_response_time_ms": 1250.5,
    "cache_size": 25
  },
  "cache": {
    "enabled": true,
    "size": 25,
    "max_size": 100,
    "ttl_seconds": 3600
  }
}
```

#### GET /api/metrics

Detailed metrics for monitoring.

## 🚢 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export CEREBRAS_API_KEY="your_production_key"
   export ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
   ```

2. **Docker Deployment**
   ```bash
   # Build and start
   docker-compose -f docker-compose.yml up -d

   # View logs
   docker-compose logs -f

   # Scale services
   docker-compose up -d --scale api=3
   ```

3. **Health Monitoring**
   ```bash
   # Check health
   curl http://localhost/api/health

   # View metrics
   curl http://localhost/api/metrics
   ```

### Production Checklist

- [ ] Set strong Cerebras API key
- [ ] Configure allowed origins for CORS
- [ ] Set appropriate rate limits
- [ ] Configure file size limits
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx recommended)
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup strategy

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

## 🧪 Testing

### Running Tests

```bash
# API unit tests
cd api
pytest test_app.py -v

# With coverage
pytest --cov=app --cov-report=html

# Frontend tests
cd ui
npm test
```

### Manual Testing

1. **Single File Test**
   ```bash
   curl -X POST http://localhost:5000/api/review \
     -H "Content-Type: application/json" \
     -d '{"url": "https://github.com/example/repo/blob/main/test.js", "mode": "bugs"}'
   ```

2. **Multi-file Test**
   ```bash
   curl -X POST http://localhost:5000/api/review \
     -H "Content-Type: application/json" \
     -d '{
       "urls": [
         "https://github.com/example/repo/blob/main/file1.js",
         "https://github.com/example/repo/blob/main/file2.js"
       ],
       "mode": "refactor"
     }'
   ```

## 🔒 Security Features

- **Prompt Injection Protection**: Advanced filtering of malicious patterns
- **Input Sanitization**: Code cleaning and validation
- **CORS Configuration**: Strict origin allowlisting
- **Rate Limiting**: Configurable request throttling
- **Security Headers**: XSS, CSRF, and content-type protection
- **Request Tracking**: Unique request IDs for debugging

## 📊 Monitoring

### Health Endpoints

- `/api/health` - Basic health check with metrics
- `/api/metrics` - Detailed metrics for monitoring systems

### Key Metrics

- Request count and success rate
- Average response times
- Cache hit rates
- Error rates by type
- System uptime

### Logging

Structured logging with request IDs for traceability:

```
2024-01-15 10:30:15 - app - INFO - [a1b2c3d4] New review request received
2024-01-15 10:30:15 - app - INFO - [a1b2c3d4] URLs: ['https://github.com/...'], Mode: bugs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style

- Python: Follow PEP 8, use type hints
- JavaScript/TypeScript: ESLint configuration provided
- Tests: Comprehensive coverage required

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with Flask, React, and TypeScript
- AI powered by Cerebras
- UI enhanced with Tailwind CSS and Framer Motion

## 🚀 **IMMEDIATE IMPROVEMENTS (Pre-Submission)**

### **High-Impact Enhancements:**

#### **1. Enhanced Loading States**
```css
/* Add to ui/src/index.css */
.loading-shimmer {
  background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

#### **2. Progress Indicators**
- Add file upload progress bars
- Show analysis completion percentage
- Real-time token usage display

#### **3. Advanced Export Features**
- PDF report generation
- Code diff viewers
- Shareable analysis links

#### **4. Performance Optimizations**
- Implement code compression
- Add request batching
- Enhanced caching strategies

---

## 🎬 Demo Video Script (3 Minutes)

### **Scene 1: Problem Introduction (0:00-0:30)**
*[Screen shows developer struggling with code review]*

**Narrator:**
"Every developer knows the pain of code review. Hours spent manually analyzing complex codebases, missed bugs, and inconsistent feedback. What if you could get instant, expert-level code analysis with AI?"

**[Cut to CodeSage.ai interface]**

### **Scene 2: Multi-File Analysis Demo (0:30-1:30)**
*[Show dragging multiple GitHub files into the interface]*

**Narrator:**
"CodeSage.ai revolutionizes code review with powerful multi-file analysis. Simply paste your GitHub URLs or code snippets..."

*[Demonstrate selecting different analysis modes: bugs, improvements, performance]*

**Narrator:**
"Choose from multiple analysis modes - find bugs, suggest improvements, optimize performance, or get detailed explanations."

*[Show streaming response in real-time]*

**Narrator:**
"Get instant feedback with our advanced Cerebras AI integration, featuring real-time streaming responses and intelligent caching for lightning-fast results."

### **Scene 3: Advanced Features (1:30-2:15)**
*[Show repository analysis feature]*

**Narrator:**
"Go beyond single files with comprehensive repository analysis. CodeSage.ai analyzes entire codebases, identifying architectural patterns and suggesting structural improvements."

*[Demonstrate security features and production-ready aspects]*

**Narrator:**
"Built with enterprise-grade security - prompt injection protection, input sanitization, and CORS configuration ensure your code stays safe."

### **Scene 4: Production Ready & Deployment (2:15-2:45)**
*[Show Docker deployment and health monitoring]*

**Narrator:**
"Production-ready with Docker deployment, health monitoring, and comprehensive logging. Scale effortlessly with our robust architecture."

### **Scene 5: Call to Action (2:45-3:00)**
*[Show final interface with results]*

**Narrator:**
"Join thousands of developers who've improved their code with CodeSage.ai. Experience the future of AI-powered code review today."

**[End screen with submission link and contact info]**

---

**CodeSage.ai** - Your AI Code Mentor 🧙‍♂️
