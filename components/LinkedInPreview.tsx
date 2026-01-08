import React, { useState } from 'react';
import { SlideData } from '../types/slideLayouts';

interface LinkedInPreviewProps {
  post: string;
  contentType: 'carousel' | 'image' | 'text' | 'video' | 'article';
  imageUrl?: string | null;
  carouselThumbnails?: string[];
  userName?: string;
  userHeadline?: string;
  userAvatar?: string;
}

export const LinkedInPreview: React.FC<LinkedInPreviewProps> = ({
  post,
  contentType,
  imageUrl,
  carouselThumbnails = [],
  userName = 'Your Name',
  userHeadline = 'Your Professional Headline',
  userAvatar,
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [currentSlide, setCurrentSlide] = useState(0);

  // LinkedIn truncates at ~210 characters on mobile, ~300 on desktop
  const truncateLength = viewMode === 'mobile' ? 210 : 300;
  const shouldTruncate = post.length > truncateLength;
  const [isExpanded, setIsExpanded] = useState(false);

  // Format post with hashtag highlighting
  const formatPost = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-[#0A66C2] hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Get displayed text
  const displayedText = shouldTruncate && !isExpanded
    ? post.substring(0, truncateLength) + '...'
    : post;

  return (
    <div className="bg-white dark:bg-[#1D2226] rounded-2xl border border-gray-200 dark:border-[#3E4042] overflow-hidden">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#3E4042]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-black/30 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'desktop'
                ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'mobile'
                ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* LinkedIn Post Card */}
      <div className={`${viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}>
        {/* Post Header */}
        <div className="p-3 flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center text-white font-semibold text-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {userName}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">1st</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userHeadline}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">Just now</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 8a6 6 0 0 1 11.92 0H2.04z"/>
              </svg>
            </div>
          </div>

          {/* More Button */}
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>

        {/* Post Content */}
        <div className="px-3 pb-2">
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
            {formatPost(displayedText)}
            {shouldTruncate && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-gray-500 dark:text-gray-400 hover:text-[#0A66C2] ml-1"
              >
                ...see more
              </button>
            )}
          </p>
        </div>

        {/* Media Content */}
        {contentType === 'image' && imageUrl && (
          <div className="border-t border-b border-gray-200 dark:border-[#3E4042]">
            <img src={imageUrl} alt="Post" className="w-full object-cover max-h-[400px]" />
          </div>
        )}

        {contentType === 'carousel' && carouselThumbnails.length > 0 && (
          <div className="border-t border-b border-gray-200 dark:border-[#3E4042] relative">
            <img
              src={carouselThumbnails[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full object-cover"
            />
            {/* Carousel Navigation */}
            {carouselThumbnails.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button
                    onClick={() => setCurrentSlide(prev => prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 dark:bg-black/70 rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentSlide < carouselThumbnails.length - 1 && (
                  <button
                    onClick={() => setCurrentSlide(prev => prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 dark:bg-black/70 rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {/* Slide Counter */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                  {currentSlide + 1} / {carouselThumbnails.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Engagement Stats Bar */}
        <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
              </span>
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px]">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            </div>
            <span>Preview reactions</span>
          </div>
          <span>Preview comments</span>
        </div>

        {/* Action Buttons */}
        <div className="px-1 py-1 flex items-center justify-around">
          {[
            { icon: 'M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5', label: 'Like' },
            { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Comment' },
            { icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', label: 'Repost' },
            { icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', label: 'Send' },
          ].map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
              <span className="text-xs font-medium hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Character Count Overlay */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {post.length.toLocaleString()} characters
          </span>
          {post.length > 2500 && (
            <span className="text-amber-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Post will show "...see more"
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInPreview;
