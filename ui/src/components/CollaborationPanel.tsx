import React from 'react';

// Collaboration feature removed. Export a simple stub to avoid import errors.
const CollaborationPanel: React.FC = () => null;

export default CollaborationPanel;

  // Handle reply to comment
  const handleReply = (commentId: string, replyContent: string) => {
    if (!replyContent.trim()) return;

    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const reply: Comment = {
          id: `${commentId}-${Date.now()}`,
          author: 'You',
          content: replyContent,
          timestamp: 'Just now',
          likes: 0,
          isLiked: false
        };

        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        };
      }
      return comment;
    }));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Collaboration Hub</h2>
                <p className="text-sm text-gray-400">Share, discuss, and collaborate on code analysis</p>
              </div>
            </div>

            <motion.button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Close panel"
            >
              ×
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {[
              { key: 'share', label: 'Share', icon: Share2 },
              { key: 'comments', label: 'Comments', icon: MessageCircle },
              { key: 'activity', label: 'Activity', icon: Activity }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'text-primary border-b-2 border-primary bg-primary/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Share Tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'share' && (
                <motion.div
                  key="share"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Shareable Link */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-primary" />
                      Shareable Link
                    </h3>

                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <motion.button
                        onClick={handleCopyUrl}
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                          copied
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          animate={copied ? { rotate: [0, -10, 10, 0] } : {}}
                          transition={{ duration: 0.5 }}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.div>
                      </motion.button>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleGenerateQR}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <QrCode className="w-4 h-4" />
                        Generate QR Code
                      </motion.button>

                      <motion.button
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                          isBookmarked
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                      </motion.button>
                    </div>
                  </div>

                  {/* Social Sharing */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Share on Social Media</h3>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => handleSocialShare('twitter')}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </motion.button>

                      <motion.button
                        onClick={() => handleSocialShare('facebook')}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </motion.button>

                      <motion.button
                        onClick={() => handleSocialShare('linkedin')}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-800 hover:bg-blue-900 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </motion.button>
                    </div>
                  </div>

                  {/* Engagement Actions */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Engage with Analysis</h3>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => setIsLiked(!isLiked)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                          isLiked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        {isLiked ? 'Liked' : 'Like'}
                      </motion.button>

                      <motion.button
                        onClick={() => setActiveTab('comments')}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Comments ({comments.length})
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comments Tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'comments' && (
                <motion.div
                  key="comments"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Add Comment */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Add Comment</h3>
                    <div className="flex gap-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts about this analysis..."
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        rows={3}
                      />
                      <motion.button
                        onClick={handleCommentSubmit}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 self-end"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-4"
                      >
                        <div className="flex gap-3">
                          <img
                            src={comment.avatar || `https://ui-avatars.com/api/?name=${comment.author}&background=4f9cf9&color=fff&size=32`}
                            alt={comment.author}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-white">{comment.author}</span>
                              <span className="text-xs text-gray-400">{comment.timestamp}</span>
                            </div>
                            <p className="text-gray-300 mb-3">{comment.content}</p>

                            {/* Comment Actions */}
                            <div className="flex items-center gap-4">
                              <motion.button
                                onClick={() => handleLikeToggle(comment.id)}
                                className={`flex items-center gap-1 text-sm transition-all duration-200 ${
                                  comment.isLiked
                                    ? 'text-red-400'
                                    : 'text-gray-400 hover:text-red-400'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                                {comment.likes}
                              </motion.button>

                              <button className="text-sm text-gray-400 hover:text-white transition-colors">
                                Reply
                              </button>

                              <button className="text-sm text-gray-400 hover:text-white transition-colors">
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-4 pl-4 border-l border-white/10 space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-3">
                                    <img
                                      src={`https://ui-avatars.com/api/?name=${reply.author}&background=4f9cf9&color=fff&size=24`}
                                      alt={reply.author}
                                      className="w-6 h-6 rounded-full"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-white">{reply.author}</span>
                                        <span className="text-xs text-gray-400">{reply.timestamp}</span>
                                      </div>
                                      <p className="text-sm text-gray-300">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Activity Tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {[
                        { user: 'Alice Johnson', action: 'liked your analysis', time: '2 hours ago' },
                        { user: 'Bob Smith', action: 'commented on your analysis', time: '4 hours ago' },
                        { user: 'Carol Davis', action: 'shared your analysis', time: '1 day ago' },
                        { user: 'David Wilson', action: 'bookmarked your analysis', time: '2 days ago' }
                      ].map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        >
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white">
                              <span className="font-medium">{activity.user}</span> {activity.action}
                            </p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CollaborationPanel;
