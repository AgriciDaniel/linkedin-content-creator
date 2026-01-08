import React, { useState, useEffect } from 'react';
import {
  ONBOARDING_STEPS,
  getOnboardingState,
  nextStep,
  prevStep,
  completeStep,
  skipStep,
  completeOnboarding,
  startOnboarding,
} from '../services/onboardingService';
import { isGeminiConfigured } from '../services/geminiService';
import { isTokenValid } from '../services/linkedinAuth';
import { getProfile } from '../services/profileService';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onStartGeneration: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenProfile,
  onStartGeneration,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const state = getOnboardingState();
      if (!state.startedAt) {
        startOnboarding();
      }
      setCurrentStep(state.currentStep);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Check completion status for each step
  const isApiConfigured = isGeminiConfigured();
  const isLinkedInConnected = isTokenValid();
  const profile = getProfile();
  const isProfileSet = !!(profile.name || profile.description || profile.industry);

  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' => {
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  const isStepAutoCompleted = (stepId: string): boolean => {
    switch (stepId) {
      case 'api-key':
        return isApiConfigured;
      case 'linkedin':
        return isLinkedInConnected;
      case 'profile':
        return isProfileSet;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
      onClose();
      return;
    }

    setIsAnimating(true);
    completeStep(step.id);
    const next = nextStep();
    setTimeout(() => {
      setCurrentStep(next);
      setIsAnimating(false);
    }, 200);
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setIsAnimating(true);
    const prev = prevStep();
    setTimeout(() => {
      setCurrentStep(prev);
      setIsAnimating(false);
    }, 200);
  };

  const handleSkip = () => {
    if (isLastStep) {
      completeOnboarding();
      onClose();
      return;
    }

    setIsAnimating(true);
    skipStep(step.id);
    setTimeout(() => {
      setCurrentStep(currentStep + 1);
      setIsAnimating(false);
    }, 200);
  };

  const handleAction = () => {
    switch (step.id) {
      case 'api-key':
      case 'linkedin':
        onOpenSettings();
        break;
      case 'profile':
        onOpenProfile();
        break;
      case 'first-post':
        completeOnboarding();
        onClose();
        onStartGeneration();
        break;
    }
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome to LinkedIn Content Creator
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Create engaging LinkedIn posts with AI assistance. Let's get you set up in just a few steps.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-Powered</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Carousels</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Auto-Post</p>
              </div>
            </div>
          </div>
        );

      case 'api-key':
        return (
          <div className="py-6">
            <div className="flex items-center justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isApiConfigured
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {isApiConfigured ? (
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {isApiConfigured ? 'AI is Connected!' : 'Connect to AI'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {isApiConfigured
                ? 'Your Gemini API key is configured. You\'re ready to generate content!'
                : 'Add your free Gemini API key to enable AI content generation.'}
            </p>
            {!isApiConfigured && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>How to get your API key:</strong><br />
                  1. Visit <span className="font-mono">aistudio.google.com</span><br />
                  2. Sign in with Google<br />
                  3. Create an API key (it's free!)
                </p>
              </div>
            )}
            {!isApiConfigured && (
              <button
                onClick={handleAction}
                className="w-full py-3 bg-[#0A66C2] text-white font-semibold rounded-xl hover:bg-[#004182] transition-colors"
              >
                Open Settings to Add API Key
              </button>
            )}
          </div>
        );

      case 'linkedin':
        return (
          <div className="py-6">
            <div className="flex items-center justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isLinkedInConnected
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-[#0A66C2]/10'
              }`}>
                {isLinkedInConnected ? (
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {isLinkedInConnected ? 'LinkedIn Connected!' : 'Connect Your LinkedIn'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {isLinkedInConnected
                ? 'Your LinkedIn account is connected. You can post directly from the app!'
                : 'Link your LinkedIn account to post directly without leaving the app.'}
            </p>
            {!isLinkedInConnected && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Post text, images, and carousels
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Schedule posts for later
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Enable Auto-Pilot mode
                  </div>
                </div>
                <button
                  onClick={handleAction}
                  className="w-full py-3 bg-[#0A66C2] text-white font-semibold rounded-xl hover:bg-[#004182] transition-colors"
                >
                  Open Settings to Connect
                </button>
              </>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="py-6">
            <div className="flex items-center justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isProfileSet
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-purple-100 dark:bg-purple-900/30'
              }`}>
                {isProfileSet ? (
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {isProfileSet ? 'Profile Set Up!' : 'Set Up Your Profile'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {isProfileSet
                ? 'Your profile is configured. AI will match your unique voice and style!'
                : 'Help AI understand your brand voice and create content that sounds like you.'}
            </p>
            {!isProfileSet && (
              <>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    <strong>You'll tell AI about:</strong><br />
                    • Your name and industry<br />
                    • Your target audience<br />
                    • Your preferred tone (professional, casual, etc.)
                  </p>
                </div>
                <button
                  onClick={handleAction}
                  className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Open Profile Settings
                </button>
              </>
            )}
          </div>
        );

      case 'first-post':
        return (
          <div className="py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              You're All Set!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              Everything is configured. Let's create your first AI-powered LinkedIn post!
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isApiConfigured ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={isApiConfigured ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isLinkedInConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={isLinkedInConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>LinkedIn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isProfileSet ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={isProfileSet ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>Profile</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleAction}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25"
            >
              Create Your First Post
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-[#3E4042]">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-[#0A66C2] to-purple-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep
                    ? 'bg-[#0A66C2]'
                    : i < currentStep || isStepAutoCompleted(s.id)
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={`px-6 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#3E4042]">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2 bg-[#0A66C2] text-white font-medium rounded-lg hover:bg-[#004182] transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
