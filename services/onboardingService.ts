// Onboarding Service - Guide first-time users through setup

const ONBOARDING_KEY = 'onboarding_state';

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt?: string;
  completedAt?: string;
}

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to LinkedIn Content Creator',
    description: 'Your AI-powered marketing assistant for creating engaging LinkedIn posts.',
  },
  {
    id: 'api-key',
    title: 'Connect to AI',
    description: 'Add your Gemini API key to enable AI content generation.',
  },
  {
    id: 'linkedin',
    title: 'Connect LinkedIn',
    description: 'Link your LinkedIn account to post directly from the app.',
  },
  {
    id: 'profile',
    title: 'Set Up Your Profile',
    description: 'Tell us about yourself so AI can match your voice and style.',
  },
  {
    id: 'first-post',
    title: 'Create Your First Post',
    description: 'Generate your first LinkedIn post with AI assistance.',
  },
];

// Get onboarding state from localStorage
export function getOnboardingState(): OnboardingState {
  try {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load onboarding state:', error);
  }

  // Default state for new users
  return {
    completed: false,
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
  };
}

// Save onboarding state
function saveOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
  }
}

// Check if onboarding is complete
export function isOnboardingComplete(): boolean {
  const state = getOnboardingState();
  return state.completed;
}

// Check if this is a new user (never started onboarding)
export function isNewUser(): boolean {
  const state = getOnboardingState();
  return !state.startedAt && !state.completed;
}

// Start onboarding
export function startOnboarding(): void {
  const state = getOnboardingState();
  state.startedAt = new Date().toISOString();
  state.currentStep = 0;
  saveOnboardingState(state);
}

// Get current step
export function getCurrentStep(): number {
  return getOnboardingState().currentStep;
}

// Move to next step
export function nextStep(): number {
  const state = getOnboardingState();
  const nextStepIndex = Math.min(state.currentStep + 1, ONBOARDING_STEPS.length - 1);
  state.currentStep = nextStepIndex;
  saveOnboardingState(state);
  return nextStepIndex;
}

// Move to previous step
export function prevStep(): number {
  const state = getOnboardingState();
  const prevStepIndex = Math.max(state.currentStep - 1, 0);
  state.currentStep = prevStepIndex;
  saveOnboardingState(state);
  return prevStepIndex;
}

// Go to specific step
export function goToStep(stepIndex: number): void {
  const state = getOnboardingState();
  state.currentStep = Math.max(0, Math.min(stepIndex, ONBOARDING_STEPS.length - 1));
  saveOnboardingState(state);
}

// Mark step as completed
export function completeStep(stepId: string): void {
  const state = getOnboardingState();
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
  }
  saveOnboardingState(state);
}

// Skip a step
export function skipStep(stepId: string): void {
  const state = getOnboardingState();
  if (!state.skippedSteps.includes(stepId)) {
    state.skippedSteps.push(stepId);
  }
  nextStep();
}

// Check if a step is completed
export function isStepCompleted(stepId: string): boolean {
  const state = getOnboardingState();
  return state.completedSteps.includes(stepId);
}

// Complete onboarding
export function completeOnboarding(): void {
  const state = getOnboardingState();
  state.completed = true;
  state.completedAt = new Date().toISOString();
  saveOnboardingState(state);
}

// Reset onboarding (for testing or re-onboarding)
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

// Get progress percentage
export function getOnboardingProgress(): number {
  const state = getOnboardingState();
  const totalSteps = ONBOARDING_STEPS.length;
  const completedCount = state.completedSteps.length + state.skippedSteps.length;
  return Math.round((completedCount / totalSteps) * 100);
}

// Check if user should see onboarding
export function shouldShowOnboarding(): boolean {
  // Show onboarding for new users or users who haven't completed it
  const state = getOnboardingState();
  return !state.completed;
}
