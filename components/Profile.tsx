import React, { useState, useEffect, useRef } from 'react';
import {
  getProfile,
  saveProfile,
  UserProfile,
  StyleAnalysis,
} from '../services/profileService';
import { analyzeStyleImage } from '../services/geminiService';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileChange?: (profile: UserProfile) => void;
}

const Profile: React.FC<ProfileProps> = ({ isOpen, onClose, onProfileChange }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [styleReferencePreview, setStyleReferencePreview] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandPersonality, setBrandPersonality] = useState<'professional' | 'thought-leader' | 'casual' | 'data-driven' | 'custom'>('professional');
  const [customBrandVoice, setCustomBrandVoice] = useState('');
  const [autoSuggestTopics, setAutoSuggestTopics] = useState(true);

  // Content preferences
  const [contentGoals, setContentGoals] = useState('');
  const [keyTopics, setKeyTopics] = useState('');
  const [topicsToAvoid, setTopicsToAvoid] = useState('');
  const [preferredLength, setPreferredLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [ctaStyle, setCtaStyle] = useState<'question' | 'action' | 'subtle' | 'none'>('question');
  const [uniqueValue, setUniqueValue] = useState('');

  // Style analysis
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const profile = getProfile();
      setName(profile.name);
      setDescription(profile.description);
      setStyleReferenceImage(profile.styleReferenceImage);
      setStyleReferencePreview(profile.styleReferencePreview);
      setIndustry(profile.industry || '');
      setTargetAudience(profile.targetAudience || '');
      setBrandPersonality(profile.brandPersonality || 'professional');
      setCustomBrandVoice(profile.customBrandVoice || '');
      setAutoSuggestTopics(profile.autoSuggestTopics !== false);
      // Content preferences
      setContentGoals(profile.contentGoals || '');
      setKeyTopics(profile.keyTopics || '');
      setTopicsToAvoid(profile.topicsToAvoid || '');
      setPreferredLength(profile.preferredLength || 'medium');
      setCtaStyle(profile.ctaStyle || 'question');
      setUniqueValue(profile.uniqueValue || '');
      // Style analysis
      setStyleAnalysis(profile.styleAnalysis || null);
      setHasChanges(false);
      setSuccess(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      const updatedProfile = saveProfile({
        name,
        description,
        styleReferenceImage,
        styleReferencePreview,
        industry,
        targetAudience,
        brandPersonality,
        customBrandVoice,
        autoSuggestTopics,
        contentGoals,
        keyTopics,
        topicsToAvoid,
        preferredLength,
        ctaStyle,
        uniqueValue,
        styleAnalysis: styleAnalysis || undefined,
      });

      const verified = getProfile();
      if (verified.updatedAt !== updatedProfile.updatedAt) {
        throw new Error('Profile verification failed');
      }

      setSuccess('Profile saved!');
      setError(null);
      setHasChanges(false);
      onProfileChange?.(updatedProfile);

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setSuccess(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setStyleReferencePreview(dataUrl);
        const base64 = dataUrl.split(',')[1];
        setStyleReferenceImage(base64);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setStyleReferenceImage(null);
    setStyleReferencePreview(null);
    setStyleAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setHasChanges(true);
  };

  const handleAnalyzeStyle = async () => {
    if (!styleReferenceImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await analyzeStyleImage(styleReferenceImage);
      setStyleAnalysis(analysis);
      setHasChanges(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Personalize your content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-130px)] p-5">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                    placeholder="Your name or brand"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Bio / Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                    placeholder="Brief description of yourself or expertise"
                    rows={3}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Style Reference */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Default Style Reference</h3>
                {styleReferencePreview && (
                  <button onClick={handleClearImage} className="text-[10px] text-red-500 hover:text-red-600">Remove</button>
                )}
              </div>

              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

              {styleReferencePreview ? (
                <div>
                  <div className="relative group">
                    <img src={styleReferencePreview} alt="Style reference" className="w-full aspect-video object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Analyze Style Button */}
                  <button
                    onClick={handleAnalyzeStyle}
                    disabled={isAnalyzing}
                    className="w-full mt-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {styleAnalysis ? 'Re-analyze Style' : 'Analyze Style'}
                      </>
                    )}
                  </button>

                  {/* Style Analysis Results */}
                  {styleAnalysis && (
                    <div className="mt-3 space-y-2.5">
                      {/* Color Palette */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Colors</label>
                        <div className="flex gap-1.5">
                          {styleAnalysis.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#3E4042] shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Style & Mood - Editable */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Style</label>
                          <input
                            type="text"
                            value={styleAnalysis.style}
                            onChange={(e) => {
                              setStyleAnalysis({ ...styleAnalysis, style: e.target.value });
                              setHasChanges(true);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-[#0A66C2] outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Mood</label>
                          <input
                            type="text"
                            value={styleAnalysis.mood}
                            onChange={(e) => {
                              setStyleAnalysis({ ...styleAnalysis, mood: e.target.value });
                              setHasChanges(true);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-[#0A66C2] outline-none"
                          />
                        </div>
                      </div>

                      {/* Elements */}
                      {styleAnalysis.elements.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Elements</label>
                          <div className="flex flex-wrap gap-1">
                            {styleAnalysis.elements.map((element, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-[#0A66C2]/10 text-[#0A66C2] text-[10px] rounded-md">
                                {element}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Prompt - Editable */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Prompt Template</label>
                        <textarea
                          value={styleAnalysis.suggestedPrompt}
                          onChange={(e) => {
                            setStyleAnalysis({ ...styleAnalysis, suggestedPrompt: e.target.value });
                            setHasChanges(true);
                          }}
                          rows={3}
                          className="w-full px-2 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-[10px] text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                          placeholder="Describe the visual style for image generation..."
                        />
                      </div>

                      <div className="flex items-center gap-1 text-emerald-500">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium">Style analyzed - edit fields above to customize</span>
                      </div>
                    </div>
                  )}

                  {!styleAnalysis && (
                    <div className="flex items-center gap-1 mt-2 text-emerald-500">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] font-medium">Style configured - click Analyze for AI insights</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-[#3E4042] rounded-lg hover:border-[#0A66C2] transition-colors"
                >
                  <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload style reference</p>
                </button>
              )}
            </div>

            {/* Topic Suggestions */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Topic Suggestions</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => { setIndustry(e.target.value); setHasChanges(true); }}
                      placeholder="e.g., SaaS, AI"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Audience</label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => { setTargetAudience(e.target.value); setHasChanges(true); }}
                      placeholder="e.g., Founders"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Brand Voice</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['professional', 'thought-leader', 'casual', 'data-driven', 'custom'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setBrandPersonality(p); setHasChanges(true); }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          brandPersonality === p
                            ? 'bg-[#0A66C2] text-white'
                            : 'bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] text-gray-600 dark:text-gray-400 hover:border-[#0A66C2]'
                        }`}
                      >
                        {p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                  {brandPersonality === 'custom' && (
                    <textarea
                      value={customBrandVoice}
                      onChange={(e) => { setCustomBrandVoice(e.target.value); setHasChanges(true); }}
                      placeholder="Describe your unique voice style, e.g., 'Witty and conversational with tech industry insights, uses occasional humor'"
                      rows={2}
                      className="w-full mt-2 px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-[#3E4042]">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Auto-Suggest Topics</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Show AI ideas on homepage</p>
                  </div>
                  <button
                    onClick={() => { setAutoSuggestTopics(!autoSuggestTopics); setHasChanges(true); }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${autoSuggestTopics ? 'bg-[#0A66C2]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoSuggestTopics ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Preferences */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Content Preferences</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Content Goals</label>
                  <textarea
                    value={contentGoals}
                    onChange={(e) => { setContentGoals(e.target.value); setHasChanges(true); }}
                    placeholder="What do you want to achieve? e.g., Generate leads, Build authority, Grow audience"
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Preferred Length</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['short', 'medium', 'long'] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => { setPreferredLength(len); setHasChanges(true); }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          preferredLength === len
                            ? 'bg-[#0A66C2] text-white'
                            : 'bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] text-gray-600 dark:text-gray-400 hover:border-[#0A66C2]'
                        }`}
                      >
                        {len.charAt(0).toUpperCase() + len.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase">CTA Style</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['question', 'action', 'subtle', 'none'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => { setCtaStyle(style); setHasChanges(true); }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          ctaStyle === style
                            ? 'bg-[#0A66C2] text-white'
                            : 'bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] text-gray-600 dark:text-gray-400 hover:border-[#0A66C2]'
                        }`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Focus Areas</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Key Topics / Expertise</label>
                  <textarea
                    value={keyTopics}
                    onChange={(e) => { setKeyTopics(e.target.value); setHasChanges(true); }}
                    placeholder="Topics you want to focus on, e.g., AI productivity, remote work, startup growth"
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Topics to Avoid</label>
                  <textarea
                    value={topicsToAvoid}
                    onChange={(e) => { setTopicsToAvoid(e.target.value); setHasChanges(true); }}
                    placeholder="Topics to stay away from, e.g., Politics, controversial subjects"
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Unique Value Proposition</label>
                  <textarea
                    value={uniqueValue}
                    onChange={(e) => { setUniqueValue(e.target.value); setHasChanges(true); }}
                    placeholder="What makes you different? e.g., 10+ years in fintech, built 3 successful startups"
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-[#3E4042]">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {hasChanges ? 'Save Profile' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
