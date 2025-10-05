import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Github, Wand2, Sparkles, Copy, Download, Check, Code2, Link as LinkIcon, FolderOpen, AlertCircle, RefreshCw, FileText, Zap, Sun, Moon, Monitor, Smartphone, X, Lightbulb } from 'lucide-react';

// Enhanced Loading Component with Advanced Animations
const EnhancedLoading = ({ progress }: { progress: {
  stage: string;
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  percentage: number;
  currentTask: string;
  bytesProcessed: number;
  totalBytes: number;
  estimatedTimeRemaining: number;
} }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  // Dynamic color based on progress stage - Always green as requested
  const getProgressColor = () => {
    return '#10b981'; // Always green
  };

  return (
    <motion.div
      className="loading-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        {/* Background glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${getProgressColor()} 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <svg width="120" height="120" className="progress-ring relative z-10">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />

          {/* Main progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth="3"
            className="progress-ring-circle"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${getProgressColor()})`
            }}
          />

          {/* Animated inner circle for extra visual appeal */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius - 8}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth="1"
            strokeDasharray="10 5"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            opacity={0.6}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-3 h-3 rounded-full mb-2"
            style={{ backgroundColor: getProgressColor() }}
          />
        </div>
      </div>

      {/* Enhanced status display */}
      <motion.div
        className="loading-status text-center"
        key={progress.currentTask}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {progress.currentTask}
      </motion.div>

      {/* File processing indicator */}
      {progress.currentFile && (
        <motion.div
          className="file-indicator"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="file-icon"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="file-name">{progress.currentFile}</span>
        </motion.div>
      )}

      {/* Enhanced progress bar */}
      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: "0%" }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
          style={{
            background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}dd)`
          }}
        />
      </div>

      {/* Processing stats */}
      {(progress.bytesProcessed > 0 || progress.filesProcessed > 0) && (
        <motion.div
          className="text-xs text-gray-400 text-center mt-2 space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {progress.bytesProcessed > 0 && (
            <div>📊 {Math.round(progress.bytesProcessed / 1024)}KB processed</div>
          )}
          {progress.filesProcessed > 0 && progress.totalFiles > 0 && (
            <div>📁 {progress.filesProcessed}/{progress.totalFiles} files</div>
          )}
        </motion.div>
      )}
    </motion.div>
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
type Theme = 'light' | 'dark' | 'auto';

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleShowPrompt = () => setShowPrompt(true);
    const handlePWAInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('showInstallPrompt', handleShowPrompt);
    window.addEventListener('pwaInstalled', handlePWAInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('showInstallPrompt', handleShowPrompt);
      window.removeEventListener('pwaInstalled', handlePWAInstalled);
    };
  }, []);

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="glass-card p-4 bg-primary/10 border-primary/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Install CodeSage</h3>
              <p className="text-sm text-gray-300 mb-3">
                Get the full experience with offline access and native app features.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => {
                    (window as any).installPWA?.();
                    setShowPrompt(false);
                  }}
                  className="btn-primary text-sm px-3 py-1.5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Install
                </motion.button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Theme Switcher Component
const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<Theme>('auto');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('codesage-theme') as Theme || 'auto';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('codesage-theme', newTheme);
    applyTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Change theme"
      >
        <Monitor className="w-4 h-4 text-gray-300" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-2 z-50 glass-card p-2 min-w-[200px]"
            >
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'auto', label: 'Auto', icon: Monitor }
              ].map((themeOption) => (
                <motion.button
                  key={themeOption.key}
                  onClick={() => handleThemeChange(themeOption.key as Theme)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    theme === themeOption.key
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <themeOption.icon className="w-4 h-4" />
                  {themeOption.label}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Demo Button Component
const DemoButton = () => {
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const loadDemo = async () => {
    setIsLoadingDemo(true);

    // Simulate loading demo content
    setTimeout(() => {
      // Set demo code in the appropriate input
      const demoCode = `// Demo: React Component with Performance Issues
import React, { useState, useEffect } from 'react';

function ExpensiveComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // This effect runs on every render - performance issue!
  useEffect(() => {
    console.log('Effect running...');
    fetchData();
  });

  const fetchData = async () => {
    // Simulate API call
    const result = await new Promise(resolve =>
      setTimeout(() => resolve([1, 2, 3, 4, 5]), 1000)
    );
    setData(result);
    setLoading(false);
  };

  // This function is recreated on every render - another issue!
  const handleClick = (item) => {
    console.log('Clicked:', item);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {data.map(item => (
        <button key={item} onClick={() => handleClick(item)}>
          Item {item}
        </button>
      ))}
    </div>
  );
}

export default ExpensiveComponent;`;

      // Set to code input mode and populate with demo
      setTimeout(() => {
        // This would need to be passed down as props or use context
        // For now, we'll use localStorage to communicate with parent
        localStorage.setItem('codesage-demo-code', demoCode);
        localStorage.setItem('codesage-input-mode', 'code');

        // Trigger a custom event that parent can listen to
        window.dispatchEvent(new CustomEvent('loadDemo'));

        setIsLoadingDemo(false);
      }, 500);
    }, 1000);
  };

  return (
    <motion.button
      onClick={loadDemo}
      disabled={isLoadingDemo}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transition-all duration-200 disabled:opacity-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Try CodeSage with sample code"
    >
      <motion.div
        animate={isLoadingDemo ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Lightbulb className="w-4 h-4" />
      </motion.div>
      {isLoadingDemo ? 'Loading Demo...' : 'Try Demo'}
    </motion.button>
  );
};

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
  // collaboration feature removed

  // Enhanced loading states with real-time progress
  const [loadingProgress, setLoadingProgress] = useState({
    stage: 'idle', // 'idle', 'fetching', 'analyzing', 'complete'
    currentFile: '',
    filesProcessed: 0,
    totalFiles: 0,
    percentage: 0,
    currentTask: 'Initializing...',
    bytesProcessed: 0,
    totalBytes: 0,
    estimatedTimeRemaining: 0
  });

  // Debounce timer for API requests
  const debounceTimer = useRef<number | null>(null);

  // Smooth progress timer (useRef to avoid re-declaration on renders)
  const smoothProgressTimer = useRef<number | null>(null);

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

  // Debounced API call function with enhanced progress tracking
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

    // Initialize loading progress
    setLoadingProgress({
      stage: 'fetching',
      currentFile: '',
      filesProcessed: 0,
      totalFiles: 0,
      percentage: 0,
      currentTask: 'Connecting to AI service...',
      bytesProcessed: 0,
      totalBytes: 0,
      estimatedTimeRemaining: 0
    });

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

      // Update progress for request initiation
      setLoadingProgress({
        stage: 'fetching',
        currentFile: '',
        filesProcessed: 0,
        totalFiles: 0,
        percentage: 10,
        currentTask: 'Sending request to AI service...',
        bytesProcessed: 0,
        totalBytes: 0,
        estimatedTimeRemaining: 0
      });

      console.log('🚀 Starting API request to:', endpoint);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', res.status);

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Update progress for successful connection
      setLoadingProgress({
        stage: 'analyzing',
        currentFile: '',
        filesProcessed: 0,
        totalFiles: 0,
        percentage: 25,
        currentTask: 'AI is analyzing your code...',
        bytesProcessed: 0,
        totalBytes: 0,
        estimatedTimeRemaining: 8
      });

      console.log('✅ Connected to API, starting stream processing');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let totalResponseLength = 0;
      let progressUpdateCount = 0;

      // Progress update function to avoid conflicts
      const updateProgress = (percentage: number, task: string, timeRemaining?: number) => {
        progressUpdateCount++;
        setLoadingProgress({
          stage: progressUpdateCount > 10 ? 'analyzing' : 'fetching',
          currentFile: '',
          filesProcessed: 0,
          totalFiles: 0,
          percentage: Math.min(percentage, 95),
          currentTask: task,
          bytesProcessed: totalResponseLength,
          totalBytes: 0,
          estimatedTimeRemaining: timeRemaining || 5
        });
      };

      // Ultra-smooth progressive loading system
      let currentSmoothProgress = 10;
      let progressVelocity = 0;
      let targetProgress = 25;

      const startSmoothProgress = () => {
        smoothProgressTimer.current = window.setInterval(() => {
          // Physics-based smooth progress animation
          const diff = targetProgress - currentSmoothProgress;
          progressVelocity += diff * 0.1; // Spring physics
          progressVelocity *= 0.8; // Damping
          currentSmoothProgress += progressVelocity;

          // Snap to target when close enough
          if (Math.abs(diff) < 1) {
            currentSmoothProgress = targetProgress;

            // Move to next target
            if (targetProgress === 25) {
              targetProgress = 35;
            } else if (targetProgress === 35) {
              targetProgress = 45;
            } else if (targetProgress === 45) {
              targetProgress = 60;
            } else if (targetProgress === 60) {
              targetProgress = 75;
            } else if (targetProgress === 75) {
              targetProgress = 85;
            }
          }

          setLoadingProgress(prev => ({
            ...prev,
            percentage: Math.round(Math.max(prev.percentage, currentSmoothProgress)),
            currentTask: getTaskForProgress(Math.round(currentSmoothProgress))
          }));
        }, 100); // Update every 100ms for ultra-smooth animation
      };

      const getTaskForProgress = (progress: number): string => {
        if (progress <= 15) return 'Sending request to AI service...';
        if (progress <= 25) return 'Establishing connection...';
        if (progress <= 35) return 'AI is analyzing your code...';
        if (progress <= 45) return 'Processing initial response...';
        if (progress <= 60) return 'Analyzing code structure...';
        if (progress <= 75) return 'Generating insights...';
        if (progress <= 85) return 'Finalizing analysis...';
        return 'Streaming analysis results...';
      };



      // Start ultra-smooth progressive loading system
      startSmoothProgress();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        chunkCount++;
        totalResponseLength += value.length;

        // Update progress based on chunks received with proper timing
        if (chunkCount === 1) {
          updateProgress(35, 'Processing initial response...');
        } else if (chunkCount === 3) {
          updateProgress(45, 'Analyzing code structure...');
        } else if (chunkCount === 6) {
          updateProgress(60, 'Generating insights...');
        } else if (chunkCount === 10) {
          updateProgress(75, 'Finalizing analysis...');
        } else if (chunkCount % 8 === 0 && chunkCount > 10) {
          updateProgress(80 + Math.min(chunkCount / 2, 10), 'Streaming analysis results...');
        }

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
              if (piece) {
                setResponse(prev => prev + piece);

                // Update progress based on response content length
                if (progressUpdateCount > 5) {
                  const newProgress = Math.min(85 + Math.floor(piece.length / 100), 95);
                  updateProgress(newProgress, 'Streaming analysis results...');
                }
              }
            }
          } catch {
            // ignore non-JSON lines
          }
        }
      }

      // Final progress update
      setLoadingProgress({
        stage: 'complete',
        currentFile: '',
        filesProcessed: 0,
        totalFiles: 0,
        percentage: 100,
        currentTask: 'Analysis complete!',
        bytesProcessed: totalResponseLength,
        totalBytes: 0,
        estimatedTimeRemaining: 0
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setLoadingProgress({
        stage: 'idle',
        currentFile: '',
        filesProcessed: 0,
        totalFiles: 0,
        percentage: 0,
        currentTask: 'Error occurred',
        bytesProcessed: 0,
        totalBytes: 0,
        estimatedTimeRemaining: 0
      });
    } finally {
      setIsLoading(false);
      // Stop smooth progress mechanism and reset state
      if (smoothProgressTimer.current) {
        clearInterval(smoothProgressTimer.current as number);
        smoothProgressTimer.current = null;
      }
      // Reset loading state after a brief delay
      setTimeout(() => {
        setLoadingProgress({
          stage: 'idle',
          currentFile: '',
          filesProcessed: 0,
          totalFiles: 0,
          percentage: 0,
          currentTask: 'Initializing...',
          bytesProcessed: 0,
          totalBytes: 0,
          estimatedTimeRemaining: 0
        });
      }, 2000);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        handleReview();
      }

      // Ctrl+K or Cmd+K to clear all
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setUrl('');
        setCode('');
        setRepositoryUrl('');
        setResponse('');
        setError('');
      }

      // Ctrl+S or Cmd+S to save analysis
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && response) {
        e.preventDefault();
        handleDownload();
      }

      // Escape to close modals/dropdowns
      if (e.key === 'Escape') {
        setError('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, handleReview, response, handleDownload]);

  // Listen for demo load events
  useEffect(() => {
    const handleDemoLoad = () => {
      const demoCode = localStorage.getItem('codesage-demo-code');
      const demoInputMode = localStorage.getItem('codesage-input-mode');

      if (demoCode && demoInputMode === 'code') {
        setCode(demoCode);
        setInputMode('code');
        localStorage.removeItem('codesage-demo-code');
        localStorage.removeItem('codesage-input-mode');
      }
    };

    window.addEventListener('loadDemo', handleDemoLoad);
    return () => window.removeEventListener('loadDemo', handleDemoLoad);
  }, []);

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

        {/* Header with Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-4">
            <DemoButton />
          </div>
          <div className="flex items-center gap-3">
            {/* Collaboration Hub removed */}
            <ThemeSwitcher />
          </div>
        </motion.div>

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



      {/* Collaboration Hub removed */}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>&copy; 2025 CodeSage.ai - Your AI Code Mentor</p>
      </footer>
    </div>
  );
}

export default App;
