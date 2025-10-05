import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  Activity,
  Zap,
  FileText,
  Share2,
  Eye,
  MousePointer,
  Timer,
  Database
} from 'lucide-react';

interface AnalyticsData {
  totalAnalyses: number;
  totalUsers: number;
  avgResponseTime: number;
  errorRate: number;
  popularLanguages: { language: string; count: number }[];
  dailyUsage: { date: string; analyses: number; users: number }[];
  performanceMetrics: {
    avgLoadTime: number;
    cacheHitRate: number;
    apiUptime: number;
  };
  recentActivity: {
    id: string;
    type: string;
    timestamp: string;
    details: string;
  }[];
}

interface AnalyticsDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isVisible = true,
  onClose
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalAnalyses: 1247,
    totalUsers: 342,
    avgResponseTime: 2.4,
    errorRate: 0.02,
    popularLanguages: [
      { language: 'JavaScript', count: 456 },
      { language: 'Python', count: 321 },
      { language: 'TypeScript', count: 234 },
      { language: 'Java', count: 156 },
      { language: 'C++', count: 80 }
    ],
    dailyUsage: [
      { date: '2024-01-01', analyses: 45, users: 23 },
      { date: '2024-01-02', analyses: 52, users: 28 },
      { date: '2024-01-03', analyses: 38, users: 19 },
      { date: '2024-01-04', analyses: 67, users: 35 },
      { date: '2024-01-05', analyses: 71, users: 42 },
      { date: '2024-01-06', analyses: 59, users: 31 },
      { date: '2024-01-07', analyses: 84, users: 47 }
    ],
    performanceMetrics: {
      avgLoadTime: 1.2,
      cacheHitRate: 0.87,
      apiUptime: 0.999
    },
    recentActivity: [
      { id: '1', type: 'analysis', timestamp: '2 minutes ago', details: 'JavaScript code review completed' },
      { id: '2', type: 'error', timestamp: '5 minutes ago', details: 'Rate limit exceeded for user' },
      { id: '3', type: 'analysis', timestamp: '8 minutes ago', details: 'Python repository analysis' },
      { id: '4', type: 'user', timestamp: '12 minutes ago', details: 'New user registration' },
      { id: '5', type: 'analysis', timestamp: '15 minutes ago', details: 'TypeScript bug detection' }
    ]
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalyticsData(prev => ({
        ...prev,
        totalAnalyses: prev.totalAnalyses + Math.floor(Math.random() * 3),
        avgResponseTime: Math.max(1.8, prev.avgResponseTime + (Math.random() - 0.5) * 0.2)
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const dataStr = format === 'json'
      ? JSON.stringify(analyticsData, null, 2)
      : convertToCSV(analyticsData);

    const blob = new Blob([dataStr], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codesage-analytics-${timeRange}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: AnalyticsData): string => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Analyses', data.totalAnalyses.toString()],
      ['Total Users', data.totalUsers.toString()],
      ['Avg Response Time (s)', data.avgResponseTime.toString()],
      ['Error Rate (%)', (data.errorRate * 100).toString()],
      ['Cache Hit Rate (%)', (data.performanceMetrics.cacheHitRate * 100).toString()],
      ['API Uptime (%)', (data.performanceMetrics.apiUptime * 100).toString()]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const formatUptime = (uptime: number): string => {
    const percentage = (uptime * 100).toFixed(3);
    return `${percentage}%`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                <p className="text-sm text-gray-400">CodeSage usage and performance metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => handleExport('json')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Export as JSON"
                >
                  <Download className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => handleExport('csv')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Export as CSV"
                >
                  <FileText className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Refresh Button */}
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Refresh data"
              >
                <motion.div
                  animate={isRefreshing ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
              </motion.button>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Close dashboard"
              >
                ×
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Analyses</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(analyticsData.totalAnalyses)}</p>
                    <p className="text-xs text-green-400 mt-1">+12% from last week</p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Users</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(analyticsData.totalUsers)}</p>
                    <p className="text-xs text-green-400 mt-1">+8% from last week</p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Response Time</p>
                    <p className="text-2xl font-bold text-white">{analyticsData.avgResponseTime.toFixed(1)}s</p>
                    <p className="text-xs text-blue-400 mt-1">-5% improvement</p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Error Rate</p>
                    <p className="text-2xl font-bold text-white">{(analyticsData.errorRate * 100).toFixed(2)}%</p>
                    <p className="text-xs text-green-400 mt-1">-0.3% improvement</p>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Usage Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Daily Usage Trend
                </h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analyticsData.dailyUsage.map((day, index) => (
                    <div key={day.date} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full bg-white/10 rounded-t-lg relative group">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(day.analyses / 100) * 100}%` }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                          className="bg-gradient-to-t from-primary to-primary/60 rounded-t-lg w-full cursor-pointer"
                          title={`${day.analyses} analyses on ${day.date}`}
                        />
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {day.analyses} analyses
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Popular Languages */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Popular Languages
                </h3>
                <div className="space-y-3">
                  {analyticsData.popularLanguages.map((lang, index) => (
                    <motion.div
                      key={lang.language}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-400' :
                          index === 1 ? 'bg-green-400' :
                          index === 2 ? 'bg-purple-400' :
                          index === 3 ? 'bg-orange-400' : 'bg-gray-400'
                        }`} />
                        <span className="text-white">{lang.language}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-white/10 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(lang.count / 500) * 100}%` }}
                            transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-blue-400' :
                              index === 1 ? 'bg-green-400' :
                              index === 2 ? 'bg-purple-400' :
                              index === 3 ? 'bg-orange-400' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-12 text-right">{lang.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Performance Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="glass-card p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{analyticsData.performanceMetrics.avgLoadTime.toFixed(1)}s</div>
                  <div className="text-sm text-gray-400">Avg Load Time</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{(analyticsData.performanceMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Cache Hit Rate</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: '87%' }} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{formatUptime(analyticsData.performanceMetrics.apiUptime)}</div>
                  <div className="text-sm text-gray-400">API Uptime</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-purple-400 h-2 rounded-full" style={{ width: '99.9%' }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {analyticsData.recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'analysis' ? 'bg-green-400' :
                      activity.type === 'error' ? 'bg-red-400' :
                      activity.type === 'user' ? 'bg-blue-400' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.details}</p>
                      <p className="text-xs text-gray-400">{activity.timestamp}</p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      activity.type === 'analysis' ? 'bg-green-400/20 text-green-400' :
                      activity.type === 'error' ? 'bg-red-400/20 text-red-400' :
                      activity.type === 'user' ? 'bg-blue-400/20 text-blue-400' : 'bg-gray-400/20 text-gray-400'
                    }`}>
                      {activity.type}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnalyticsDashboard;
