import React, { useState, useEffect } from 'react';
import {
  SavedPost,
  getPostHistory,
  deletePostFromHistory,
  clearPostHistory,
  formatPostDate,
} from '../services/postHistoryService';
import { clearDraftAndScheduledPosts } from '../services/schedulerService';
import { clearMemory } from '../services/memoryService';

interface PastPostsProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPost: (post: SavedPost) => void;
}

const PastPosts: React.FC<PastPostsProps> = ({ isOpen, onClose, onLoadPost }) => {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPosts(getPostHistory());
      setExpandedPost(null);
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePostFromHistory(id);
    setPosts(getPostHistory());
    if (expandedPost === id) setExpandedPost(null);
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearPostHistory();
      clearDraftAndScheduledPosts(); // Only clears drafts/scheduled, keeps posted
      clearMemory(); // Clear AI Memory
      setPosts([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.post.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContentTypeColor = (type: SavedPost['contentType']) => {
    switch (type) {
      case 'carousel': return 'bg-[#0A66C2]';
      case 'image': return 'bg-purple-500';
      case 'video': return 'bg-pink-500';
      case 'article': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-[#3E4042]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Past Posts</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{posts.length} generated posts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg focus:ring-1 focus:ring-[#0A66C2] outline-none text-xs text-gray-900 dark:text-white"
            />
          </div>
          {posts.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {filteredPosts.length} of {posts.length}
              </span>
              <button
                onClick={handleClearAll}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  confirmClear
                    ? 'bg-red-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                }`}
              >
                {confirmClear ? 'Confirm clear' : 'Clear all'}
              </button>
            </div>
          )}
        </div>

        {/* Posts List */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-3">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {posts.length === 0 ? 'No posts yet' : 'No matching posts'}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Generated posts appear here</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredPosts.map((post) => {
                const isExpanded = expandedPost === post.id;
                return (
                  <div
                    key={post.id}
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isExpanded
                        ? 'bg-[#0A66C2]/5 border-[#0A66C2]/30'
                        : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-[#3E4042] hover:border-[#0A66C2]/50'
                    }`}
                  >
                    {/* Compact Header */}
                    <div className="flex items-center gap-2">
                      <span className={`w-1 h-6 rounded-full flex-shrink-0 ${getContentTypeColor(post.contentType)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{post.topic}</p>
                          {post.postedToLinkedIn && (
                            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Posted to LinkedIn" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatPostDate(post.createdAt)} · {post.contentType}
                        </p>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Preview (always visible) */}
                    {!isExpanded && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-1 ml-3">
                        {post.post}
                      </p>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-2 ml-3 space-y-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-4">
                          {post.post}
                        </p>

                        {post.generatedImage && (
                          <img
                            src={post.generatedImage}
                            alt="Generated"
                            className="w-full h-20 object-cover rounded-lg"
                          />
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onLoadPost(post); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0A66C2] text-white text-[10px] font-medium rounded-lg hover:bg-[#004182] transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Load
                          </button>
                          {post.linkedInPostUrl && (
                            <a
                              href={post.linkedInPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-1 py-1.5 px-3 bg-[#0A66C2]/10 text-[#0A66C2] text-[10px] font-medium rounded-lg hover:bg-[#0A66C2]/20 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View
                            </a>
                          )}
                          <button
                            onClick={(e) => handleDelete(post.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastPosts;
