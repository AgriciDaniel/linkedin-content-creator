import React, { useState, useRef, useEffect } from 'react';
import { CarouselSlide, SlideData } from '../types';
import { SlideLayoutType } from '../types/slideLayouts';

interface CarouselPreviewProps {
  slides: (CarouselSlide | SlideData)[];
  thumbnails?: string[]; // Actual rendered slide images
  onSlideEdit?: (index: number) => void;
  onSlideDelete?: (index: number) => void;
  onSlideRegenerate?: (index: number) => void;
  isGenerating?: boolean; // Show loading state while thumbnails generate
}

// Helper to check if slide is new layout format
function isLayoutSlide(slide: CarouselSlide | SlideData): slide is SlideData {
  return 'layout' in slide;
}

// Get slide title based on format
function getSlideTitle(slide: CarouselSlide | SlideData): string {
  if (isLayoutSlide(slide)) {
    switch (slide.layout) {
      case 'title-hook':
        return slide.headline;
      case 'bullet-list':
      case 'numbered-steps':
      case 'stat-card':
      case 'bar-chart':
      case 'pie-chart':
      case 'line-chart':
      case 'comparison':
        return slide.title;
      case 'quote':
        return slide.quote.slice(0, 50) + (slide.quote.length > 50 ? '...' : '');
      case 'cta':
        return slide.headline;
      default:
        return 'Slide';
    }
  }
  return slide.title;
}

// Get slide content preview based on format
function getSlidePreview(slide: CarouselSlide | SlideData): string {
  if (isLayoutSlide(slide)) {
    switch (slide.layout) {
      case 'title-hook':
        return slide.subtext || '';
      case 'bullet-list':
        return slide.bullets.slice(0, 2).join(' • ');
      case 'numbered-steps':
        return slide.steps.slice(0, 2).map((s, i) => `${i + 1}. ${s}`).join(' ');
      case 'stat-card':
        return `${slide.stat} - ${slide.description}`;
      case 'bar-chart':
      case 'pie-chart':
      case 'line-chart':
        return slide.description || slide.labels.slice(0, 3).join(', ');
      case 'comparison':
        return `${slide.before.label}: ${slide.before.value} → ${slide.after.label}: ${slide.after.value}`;
      case 'quote':
        return `— ${slide.attribution}`;
      case 'cta':
        return slide.subtext;
      default:
        return '';
    }
  }
  return slide.content;
}

const CarouselPreview: React.FC<CarouselPreviewProps> = ({
  slides,
  thumbnails,
  onSlideEdit,
  onSlideDelete,
  onSlideRegenerate,
  isGenerating
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Reset active index when slides change
  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, activeIndex]);

  // Scroll to active slide using scrollLeft for reliability
  const scrollToSlide = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, slides.length - 1));
    setActiveIndex(boundedIndex);

    const slider = sliderRef.current;
    if (!slider) return;

    // Get all slide elements
    const slideElements = slider.querySelectorAll('[data-slide-index]');
    const targetSlide = slideElements[boundedIndex] as HTMLElement;

    if (targetSlide) {
      const sliderRect = slider.getBoundingClientRect();
      const slideRect = targetSlide.getBoundingClientRect();

      // Calculate scroll position to center the slide
      const scrollLeft = targetSlide.offsetLeft - (sliderRect.width / 2) + (slideRect.width / 2);

      slider.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  };

  // Initial scroll to center first slide
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || slides.length === 0) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const slideElements = slider.querySelectorAll('[data-slide-index]');
      const firstSlide = slideElements[0] as HTMLElement;

      if (firstSlide) {
        const sliderRect = slider.getBoundingClientRect();
        const scrollLeft = firstSlide.offsetLeft - (sliderRect.width / 2) + (firstSlide.offsetWidth / 2);
        slider.scrollLeft = scrollLeft;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [slides.length]);

  // Handle manual scroll to update active index
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const slideElements = slider.querySelectorAll('[data-slide-index]');
        const sliderCenter = slider.scrollLeft + slider.offsetWidth / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        slideElements.forEach((el, index) => {
          const slideEl = el as HTMLElement;
          const slideCenter = slideEl.offsetLeft + slideEl.offsetWidth / 2;
          const distance = Math.abs(sliderCenter - slideCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        setActiveIndex(closestIndex);
      }, 50);
    };

    slider.addEventListener('scroll', handleScroll);
    return () => {
      slider.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [slides.length]);

  const goToPrev = () => {
    if (activeIndex > 0) {
      scrollToSlide(activeIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeIndex < slides.length - 1) {
      scrollToSlide(activeIndex + 1);
    }
  };

  // Color palette for slides (fallback)
  const slideColors = [
    'from-[#0A66C2] to-[#004182]',
    'from-[#1D2226] to-[#0A0A0A]',
    'from-[#2E3B4E] to-[#1D2226]',
    'from-[#0A66C2] to-[#2E3B4E]',
    'from-[#1D2226] to-[#0A66C2]',
    'from-[#004182] to-[#0A0A0A]',
    'from-[#2E3B4E] to-[#004182]',
    'from-[#0A66C2] to-[#1D2226]',
  ];

  const hasActions = onSlideEdit || onSlideDelete || onSlideRegenerate;

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#0A66C2]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Carousel ({slides.length} slides)
        </h3>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            disabled={activeIndex === 0}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            disabled={activeIndex === slides.length - 1}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slider Container */}
      <div
        ref={sliderRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 px-[calc(50%-100px)] sm:px-[calc(50%-120px)] md:px-[calc(50%-140px)] scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollPaddingInline: 'calc(50% - 100px)',
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            data-slide-index={index}
            className={`flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] snap-center rounded-lg overflow-hidden shadow-lg transition-all duration-300 cursor-pointer ${
              index === activeIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-60 hover:opacity-80'
            }`}
            onClick={() => scrollToSlide(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Slide Card - Show actual thumbnail if available */}
            {thumbnails && thumbnails[index] ? (
              <div className="relative aspect-square bg-gray-900 group">
                <img
                  src={thumbnails[index]}
                  alt={`Slide ${index + 1}: ${getSlideTitle(slide)}`}
                  className="w-full h-full object-cover"
                />
                {/* Slide number overlay */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-mono">
                  {index + 1}/{slides.length}
                </div>

                {/* Action buttons overlay - show on hover */}
                {hasActions && (hoveredIndex === index || index === activeIndex) && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {onSlideEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSlideEdit(index); }}
                        className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                        title="Edit slide"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {onSlideRegenerate && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSlideRegenerate(index); }}
                        className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-green-600 transition-colors"
                        title="Regenerate slide"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    {onSlideDelete && slides.length > 4 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSlideDelete(index); }}
                        className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                        title="Delete slide"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback: Loading or placeholder state */
              <div className={`relative aspect-square bg-gradient-to-br ${slideColors[index % slideColors.length]} p-4 flex flex-col group`}>
                {isGenerating ? (
                  <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                    <p className="text-white/60 text-xs">Rendering...</p>
                  </div>
                ) : (
                  <>
                    {/* Slide Number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-white/60">
                        {index + 1}/{slides.length}
                      </span>
                    </div>

                    {/* Slide Content Preview */}
                    <div className="flex-grow flex flex-col justify-center">
                      <h4 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-tight line-clamp-3">
                        {getSlideTitle(slide)}
                      </h4>
                      <p className="text-white/70 text-[10px] leading-relaxed line-clamp-2">
                        {getSlidePreview(slide)}
                      </p>
                    </div>

                    {/* Action buttons overlay for fallback view */}
                    {hasActions && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {onSlideEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSlideEdit(index); }}
                            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                            title="Edit slide"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {onSlideRegenerate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSlideRegenerate(index); }}
                            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-green-600 transition-colors"
                            title="Regenerate slide"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        {onSlideDelete && slides.length > 4 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSlideDelete(index); }}
                            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                            title="Delete slide"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              index === activeIndex
                ? 'bg-[#0A66C2] w-3'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 w-1.5'
            }`}
          />
        ))}
      </div>

      {/* Mobile Swipe Hint */}
      <div className="sm:hidden flex items-center justify-center gap-1 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        Swipe to navigate
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CarouselPreview;
