/**
 * LinkedIn OAuth Service
 * Handles OAuth 2.0 Authentication with PKCE for LinkedIn
 */

import { storeTokenWithMethod, storeUser } from './linkedinAuth';
import { OAuthConfig, OAuthCallbackResult } from '../types';

const OAUTH_CONFIG_KEY = 'linkedin_oauth_config';
const OAUTH_STATE_KEY = 'linkedin_oauth_state';
const OAUTH_VERIFIER_KEY = 'linkedin_oauth_verifier';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

const REQUIRED_SCOPES = 'openid profile email w_member_social';

// =============================================================================
// PKCE Utilities
// =============================================================================

/**
 * Generate a cryptographically secure random code verifier
 */
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

/**
 * Generate code challenge from verifier using SHA-256
 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
};

/**
 * Base64 URL encode (without padding)
 */
const base64URLEncode = (buffer: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate random state for CSRF protection
 */
const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

// =============================================================================
// OAuth Configuration Storage
// =============================================================================

/**
 * Store OAuth configuration (Client ID)
 */
export const storeOAuthConfig = (clientId: string): void => {
  const config: OAuthConfig = { clientId };
  localStorage.setItem(OAUTH_CONFIG_KEY, JSON.stringify(config));
};

/**
 * Get stored OAuth configuration
 */
export const getOAuthConfig = (): OAuthConfig | null => {
  try {
    const stored = localStorage.getItem(OAUTH_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load OAuth config:', error);
    return null;
  }
};

/**
 * Clear OAuth configuration
 */
export const clearOAuthConfig = (): void => {
  localStorage.removeItem(OAUTH_CONFIG_KEY);
};

/**
 * Check if OAuth is configured
 */
export const isOAuthConfigured = (): boolean => {
  const config = getOAuthConfig();
  return config !== null && !!config.clientId;
};

// =============================================================================
// OAuth Flow Management
// =============================================================================

/**
 * Initiate OAuth flow - redirects user to LinkedIn
 * Using standard OAuth 2.0 flow with client secret handled by backend
 */
export const initiateOAuthFlow = async (clientId: string): Promise<void> => {
  try {
    // Clear any previous callback processed flag to allow new OAuth flow
    sessionStorage.removeItem('oauth_callback_processed');

    // Generate state for CSRF protection
    const state = generateState();

    // Store state in sessionStorage for callback validation
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    // Build authorization URL (no PKCE needed since backend handles auth with client secret)
    const redirectUri = window.location.origin;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: REQUIRED_SCOPES,
    });

    const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;

    // Redirect to LinkedIn
    window.location.href = authUrl;
  } catch (error) {
    console.error('Failed to initiate OAuth flow:', error);
    throw new Error('Failed to start LinkedIn authentication');
  }
};

/**
 * Handle OAuth callback - processes authorization code
 */
export const handleOAuthCallback = async (): Promise<OAuthCallbackResult | null> => {
  try {
    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Handle OAuth errors
    if (error) {
      const errorMsg = getOAuthErrorMessage(error, errorDescription);
      clearOAuthState();
      return {
        success: false,
        error: errorMsg,
      };
    }

    // No callback parameters - not an OAuth callback
    if (!code || !state) {
      return null;
    }

    // Validate state (CSRF protection)
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!storedState || state !== storedState) {
      clearOAuthState();
      return {
        success: false,
        error: 'Security validation failed. Please try again.',
      };
    }

    // Get OAuth config
    const config = getOAuthConfig();
    if (!config) {
      clearOAuthState();
      return {
        success: false,
        error: 'OAuth configuration not found.',
      };
    }

    // Exchange authorization code for access token (backend handles auth with client secret)
    const accessToken = await exchangeCodeForToken(code, '', config.clientId);

    // Fetch user profile
    await fetchUserProfile(accessToken);

    // Store token with OAuth method
    storeTokenWithMethod(accessToken, 'oauth');

    // Clear OAuth state
    clearOAuthState();

    return {
      success: true,
      token: accessToken,
    };
  } catch (error) {
    clearOAuthState();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
};

/**
 * Exchange authorization code for access token via backend proxy
 * This avoids CORS issues by using our backend server
 */
export const exchangeCodeForToken = async (
  code: string,
  verifier: string,
  clientId: string
): Promise<string> => {
  try {
    const redirectUri = window.location.origin;
    const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';

    // Call our backend proxy server instead of LinkedIn directly
    const response = await fetch(`${proxyServerUrl}/api/linkedin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirectUri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown', message: 'Token exchange failed' }));
      console.error('Token exchange failed:', errorData);
      throw new Error(errorData.message || 'Failed to exchange authorization code for token');
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access token received from LinkedIn');
    }

    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to complete LinkedIn authentication');
  }
};

/**
 * Fetch user profile using access token via backend proxy
 * This avoids CORS issues by using our backend server
 */
const fetchUserProfile = async (accessToken: string): Promise<void> => {
  try {
    const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';
    const response = await fetch(`${proxyServerUrl}/api/linkedin/userinfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch user profile');
    }

    const data = await response.json();

    // Map LinkedIn userinfo response to our user object
    const user = {
      id: data.sub,
      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      email: data.email,
      profilePicture: data.picture,
    };

    // Store user profile
    storeUser(user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

/**
 * Clear OAuth state from sessionStorage
 */
const clearOAuthState = (): void => {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
};

/**
 * Get user-friendly error message for OAuth errors
 */
const getOAuthErrorMessage = (error: string, description: string | null): string => {
  switch (error) {
    case 'access_denied':
      return 'You declined LinkedIn access. Try again when ready.';
    case 'invalid_request':
      return 'Invalid authentication request. Please check your OAuth configuration.';
    case 'unauthorized_client':
      return 'Client ID is not authorized. Please check your LinkedIn app settings.';
    case 'invalid_scope':
      return 'Invalid permissions requested. Please contact support.';
    default:
      return description || 'Authentication failed. Please try again.';
  }
};
