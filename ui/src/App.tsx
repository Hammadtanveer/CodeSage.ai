import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Github, Wand2, Sparkles } from 'lucide-react';

// A simple but effective streaming JSON parser
const streamJsonObjects = (text: string): any[] => {
  const jsonObjects = [];
  const regex = /data: (\{.*?\})(?=\n|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const jsonObj = JSON.parse(match[1]);
      jsonObjects.push(jsonObj);
    } catch (e) {
      // Incomplete JSON object, ignore for now
    }
  }
  return jsonObjects;
};

function App() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'bugs' | 'improvements' | 'refactor'>('bugs');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReview = async () => {
    if (!url) {
      setError('Please enter a GitHub URL.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('http://localhost:5000/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedText += decoder.decode(value, { stream: true });

        const jsonObjects = streamJsonObjects(accumulatedText);

        let fullContent = '';
        jsonObjects.forEach(obj => {
          if (obj.choices && obj.choices[0].delta.content) {
            fullContent += obj.choices[0].delta.content;
          }
        });

        setResponse(fullContent);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full aurora-background">
      <div className="max-w-4xl mx-auto px-4 py-16">

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-12 h-12 text-primary" />
            <h1 className="text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-primary via-blue-400 to-purple-400">
              CodeSage
            </h1>
            <span className="text-2xl font-bold text-primary">.ai</span>
          </div>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Your personal AI code mentor. Get instant feedback and write better code with advanced AI analysis.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-white/10 shadow-2xl"
        >
          <div className="mb-6">
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
                className="w-full bg-gray-900/50 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
              />
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm mt-2"
              >
                {error}
              </motion.p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Analysis Type
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'bugs', label: 'Find Bugs', icon: '🐛' },
                { key: 'improvements', label: 'Improvements', icon: '⚡' },
                { key: 'refactor', label: 'Refactor', icon: '🔧' }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setMode(option.key as any)}
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
            </div>
          </div>

          <button
            onClick={handleReview}
            disabled={isLoading || !url}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-lg flex items-center justify-center space-x-2 hover:from-primary/90 hover:to-blue-600/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Wand2 className="w-5 h-5" />
            <span>{isLoading ? 'Analyzing Your Code...' : 'Review My Code'}</span>
          </button>
        </motion.div>

        {(response || isLoading || error) && (
           <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              <Sparkles className="w-6 h-6 text-primary" />
              Analysis Result
            </h2>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            {isLoading && !response && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">CodeSage.ai is analyzing your code...</p>
              </div>
            )}
            {response && (
              <div className="bg-gray-900/50 rounded-lg p-6 border border-white/10">
                <article className="prose prose-invert prose-blue max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </article>
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