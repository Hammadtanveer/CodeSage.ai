import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Github, Wand2, Sparkles, Copy, Download, Check, Code2, Link as LinkIcon, FolderOpen, AlertCircle, RefreshCw, FileText, Zap } from 'lucide-react';

// Enhanced Loading Component
const EnhancedLoading = ({ progress }: { progress: {
  stage: string;
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  percentage: number;
  currentTask: string;
} }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  return (
    <div className="loading-container">
      <div className="relative">
        <svg width="120" height="120" className="progress-ring">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary-hue), var(--primary-saturation), var(--primary-lightness))"
            strokeWidth="3"
            className="progress-ring-circle"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 bg-primary rounded-full"
          />
          <div className="loading-text">
            {progress.percentage}%
          </div>
        </div>
      </div>

      <div className="loading-status">
        {progress.currentTask}
      </div>

      {progress.currentFile && (
        <div className="file-indicator">
          <div className="file-icon" />
          <span className="file-name">{progress.currentFile}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: "0%" }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Enhanced Error Component with Recovery Suggestions
const EnhancedError = ({ error, onRetry }: { error: string; onRetry?: () => void }) => {
  const getErrorInfo = (errorMessage: string) => {
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        icon: <Zap className="w-6 h-6" />,
        title: 'Rate Limit Exceeded',
        message: 'Too many requests. Please wait a moment before trying again.',
        suggestion: 'Wait 30-60 seconds and try again',
        canRetry: true
      };
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        icon: <AlertCircle className="w-6 h-6" />,
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        suggestion: 'Check your connection and try again',
        canRetry: true
      };
    }
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        icon: <FileText className="w-6 h-6" />,
        title: 'Repository Not Found',
        message: 'The GitHub repository or file could not be found.',
        suggestion: 'Check the URL and ensure the repository is public',
        canRetry: true
      };
    }
    return {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'Analysis Error',
      message: errorMessage,
      suggestion: 'Please try again or contact support if the issue persists',
      canRetry: true
    };
  };

  const errorInfo = getErrorInfo(error);

  return (
    <motion.div
      className="error-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="error-icon">
        {errorInfo.icon}
      </div>

      <h3 className="error-title">
        {errorInfo.title}
      </h3>

      <p className="error-message">
        {errorInfo.message}
      </p>

      <p className="text-sm text-gray-400 mb-4">
        <strong>Suggestion:</strong> {errorInfo.suggestion}
      </p>

      {errorInfo.canRetry && onRetry && (
        <div className="error-actions">
          <motion.button
            onClick={onRetry}
            className="btn-retry"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

// Custom component to add copy buttons to code blocks
const CodeBlockWithCopy = ({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code block: ', err);
    }
  };

  return (
    <div className="relative group">
      <pre className={`${className} pr-12`}>
        <code {...props}>{children}</code>
      </pre>
      <motion.button
        onClick={handleCopy}
        className={`absolute top-2 right-2 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
          copied
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={copied ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        title={copied ? "Copied!" : "Copy code"}
      >
        <motion.div
          animate={copied ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </motion.div>
      </motion.button>
    </div>
  );
};

type Mode = 'bugs' | 'improvements' | 'refactor' | 'explain' | 'performance' | 'security';
type AnalysisMode = 'overview' | 'bugs' | 'improvements' | 'refactor' | 'architecture' | 'security' | 'explain' | 'performance';
type InputMode = 'github' | 'code' | 'repository';

function App() {
  const [inputMode, setInputMode] = useState<InputMode>('github');
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [mode, setMode] = useState<Mode>('bugs');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('overview');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Enhanced loading states
  const [loadingProgress, setLoadingProgress] = useState({
    stage: 'idle', // 'idle', 'fetching', 'analyzing', 'complete'
    currentFile: '',
    filesProcessed: 0,
    totalFiles: 0,
    percentage: 0,
    currentTask: 'Initializing...'
  });

  // Debounce timer for API requests
  const debounceTimer = useRef<number | null>(null);

  // Mouse position tracking for custom cursor
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Load persisted data on component mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('codesage-url');
    const savedMode = localStorage.getItem('codesage-mode');
    const savedResponse = localStorage.getItem('codesage-response');

    if (savedUrl) setUrl(savedUrl);
    if (savedMode && ['bugs', 'improvements', 'refactor'].includes(savedMode)) {
      setMode(savedMode as Mode);
    }
    if (savedResponse) setResponse(savedResponse);
  }, []);

  // Persist data when it changes
  useEffect(() => {
    if (url) localStorage.setItem('codesage-url', url);
  }, [url]);

  useEffect(() => {
    localStorage.setItem('codesage-mode', mode);
  }, [mode]);

  useEffect(() => {
    if (response) localStorage.setItem('codesage-response', response);
  }, [response]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([response], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codesage-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Advanced Ripple Effect for Buttons
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  // Debounced API call function
  const debouncedApiCall = useCallback(async () => {
    if (inputMode === 'github' && !url) {
      setError('Please enter a GitHub URL.');
      return;
    }
    if (inputMode === 'code' && !code.trim()) {
      setError('Please paste your code.');
      return;
    }
    if (inputMode === 'repository' && !repositoryUrl.trim()) {
      setError('Please enter a repository URL.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      let requestBody;
      let endpoint;

      if (inputMode === 'repository') {
        requestBody = {
          repository_url: repositoryUrl.trim(),
          mode: analysisMode
        };
        endpoint = 'http://localhost:5000/api/analyze-repo';
      } else {
        requestBody = inputMode === 'github'
          ? { url, mode }
          : { code: code.trim(), mode };
        endpoint = 'http://localhost:5000/api/review';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonPart = trimmed.slice(5).trim();
          if (jsonPart === '[DONE]') continue;

          try {
            const obj = JSON.parse(jsonPart);
            const evt = obj.event as string | undefined;

            if (evt === 'error') {
              const errChunk = obj?.choices?.[0]?.delta?.content || 'Unknown error';
              setError(errChunk);
              continue;
            }

            if (evt === 'token' || !evt) {
              const piece = obj?.choices?.[0]?.delta?.content || '';
              if (piece) setResponse(prev => prev + piece);
            }
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [inputMode, url, code, repositoryUrl, mode, analysisMode]);

  const handleReview = useCallback(() => {
    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set a new debounce timer for 500ms
    debounceTimer.current = window.setTimeout(() => {
      debouncedApiCall();
    }, 500);
  }, [debouncedApiCall]);

  return (
    <div className="min-h-screen w-full aurora-background">
      {/* Enhanced Particles Layer */}
      <div className="particles-layer"></div>

      {/* Mouse Cursor Tracker */}
      <motion.div
        className="mouse-cursor"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '20px',
          height: '20px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
        animate={{
          x: mousePosition.x - 10,
          y: mousePosition.y - 10,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 28,
          mass: 0.5
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(79, 172, 254, 0.9), transparent)',
            borderRadius: '50%',
            boxShadow: '0 0 20px rgba(79, 172, 254, 0.6)',
            mixBlendMode: 'screen' as const,
          }}
        />
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-16">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 stagger-item"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
              className="p-2"
            >
              <Sparkles className="w-12 h-12 text-primary drop-shadow-lg" />
            </motion.div>
            <h1 className="text-6xl font-bold tracking-tight gradient-text">
              CodeSage
            </h1>
            <motion.span
              className="text-2xl font-bold text-primary"
              animate={{
                textShadow: [
                  "0 0 10px rgba(79, 172, 254, 0.5)",
                  "0 0 20px rgba(79, 172, 254, 0.8)",
                  "0 0 10px rgba(79, 172, 254, 0.5)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              .ai
            </motion.span>
          </div>
          <motion.p
            className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Your personal AI code mentor. Get instant feedback and write better code with advanced AI analysis.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card stagger-item p-8"
          style={{ animationDelay: '0.2s' }}
        >
          {/* Input Mode Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Input Method
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setInputMode('github')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  inputMode === 'github'
                    ? 'bg-primary text-primary-foreground shadow-lg transform scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                GitHub URL
              </button>
              <button
                onClick={() => setInputMode('code')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  inputMode === 'code'
                    ? 'bg-primary text-primary-foreground shadow-lg transform scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Paste Code
              </button>
              <button
                onClick={() => setInputMode('repository')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  inputMode === 'repository'
                    ? 'bg-primary text-primary-foreground shadow-lg transform scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Repository
              </button>
            </div>
          </div>

          {/* GitHub URL Input */}
          {inputMode === 'github' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Github className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://github.com/username/repo/blob/main/file.js"
                  className="w-full input-enhanced pl-10 pr-4 py-3 text-white"
                />
              </div>
            </motion.div>
          )}

          {/* Code Paste Input */}
          {inputMode === 'code' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Code
              </label>
              <div className="relative">
                <Code2 className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  placeholder="Paste your code here..."
                  rows={12}
                  className="w-full input-enhanced pl-10 pr-4 py-3 text-white font-mono text-sm resize-vertical"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Supports: JavaScript, Python, TypeScript, Java, C++, and more
              </p>
            </motion.div>
          )}

          {/* Repository Input */}
          {inputMode === 'repository' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub Repository URL
              </label>
              <div className="relative">
                <FolderOpen className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={repositoryUrl}
                  onChange={(e) => {
                    setRepositoryUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://github.com/username/repository"
                  className="w-full input-enhanced pl-10 pr-4 py-3 text-white"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Analyze entire repositories for comprehensive insights
              </p>
            </motion.div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm mt-2"
            >
              {error}
            </motion.p>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Analysis Type
            </label>
            <div className="flex flex-wrap gap-3">
              {inputMode === 'repository' ? (
                <>
                  {[
                    { key: 'overview', label: 'Overview', icon: '📊' },
                    { key: 'explain', label: 'Explain Code', icon: '📖' },
                    { key: 'architecture', label: 'Architecture', icon: '🏗️' },
                    { key: 'performance', label: 'Performance', icon: '⚡' },
                    { key: 'bugs', label: 'Find Bugs', icon: '🐛' },
                    { key: 'improvements', label: 'Improvements', icon: '✨' },
                    { key: 'security', label: 'Security', icon: '🔒' },
                    { key: 'refactor', label: 'Refactor', icon: '🔧' }
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setAnalysisMode(option.key as AnalysisMode)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        analysisMode === option.key
                          ? 'bg-primary text-primary-foreground shadow-lg transform scale-105'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105'
                      }`}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { key: 'explain', label: 'Explain Code', icon: '📖' },
                    { key: 'bugs', label: 'Find Bugs', icon: '🐛' },
                    { key: 'performance', label: 'Performance', icon: '⚡' },
                    { key: 'improvements', label: 'Improvements', icon: '✨' },
                    { key: 'security', label: 'Security', icon: '🔒' },
                    { key: 'refactor', label: 'Refactor', icon: '🔧' }
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setMode(option.key as Mode)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        mode === option.key
                          ? 'bg-primary text-primary-foreground shadow-lg transform scale-105'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105'
                      }`}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <motion.button
            onClick={(e) => {
              if (!isLoading) {
                createRipple(e);
                handleReview();
              }
            }}
            disabled={isLoading || (inputMode === 'github' && !url) || (inputMode === 'code' && !code.trim()) || (inputMode === 'repository' && !repositoryUrl.trim())}
            className={`w-full btn-primary btn-magnetic py-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isLoading ? 'pulse-glow' : ''}`}
            whileHover={!isLoading ? {
              scale: 1.02,
              rotateX: 5,
              boxShadow: "0 20px 60px rgba(79, 172, 254, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
            } : {}}
            whileTap={!isLoading ? { scale: 0.98, rotateX: 2 } : {}}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <motion.div
              animate={isLoading ? {
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Wand2 className="w-5 h-5" />
            </motion.div>
            <span>{isLoading ? 'Analyzing Your Code...' : 'Review My Code'}</span>
          </motion.button>
        </motion.div>

        {(response || isLoading || error) && (
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 glass-card stagger-item p-8"
            style={{ animationDelay: '0.4s' }}
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              <Sparkles className="w-6 h-6 text-primary" />
              Analysis Result
            </h2>
            {error && (
              <EnhancedError
                error={error}
                onRetry={() => {
                  setError('');
                  handleReview();
                }}
              />
            )}
            {isLoading && !response && (
              <EnhancedLoading progress={loadingProgress} />
            )}
            {response && (
              <div className="bg-gray-900/50 rounded-lg p-6 border border-white/10 max-h-[65vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 tooltip ${
                        copied
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
                      }`}
                      data-tooltip={copied ? "Copied to clipboard!" : "Copy to clipboard"}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={copied ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={copied ? { rotate: [0, -10, 10, 0] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </motion.div>
                      {copied ? 'Copied!' : 'Copy'}
                    </motion.button>
                    <motion.button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200 tooltip"
                      data-tooltip="Download as markdown file"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Download className="w-4 h-4" />
                      </motion.div>
                      Download
                    </motion.button>
                  </div>
                </div>
                <div className="markdown-body prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <CodeBlockWithCopy className={className} {...props}>
                            {children}
                          </CodeBlockWithCopy>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {response}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>&copy; 2025 CodeSage.ai - Your AI Code Mentor</p>
      </footer>
    </div>
  );
}

export default App;
