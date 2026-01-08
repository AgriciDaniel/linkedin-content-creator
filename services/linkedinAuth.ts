import { LinkedInToken, LinkedInUser } from '../types';

const TOKEN_STORAGE_KEY = 'linkedin_token';
const USER_STORAGE_KEY = 'linkedin_user';

// Store token in localStorage
export const storeToken = (accessToken: string, expiresInDays: number = 60, authMethod?: 'oauth' | 'manual'): void => {
  const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
  const tokenData: LinkedInToken = {
    accessToken,
    expiresAt,
    authMethod,
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  if (authMethod) {
    setAuthMethod(authMethod);
  }
};

// Get stored token
export const getStoredToken = (): LinkedInToken | null => {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LinkedInToken;
  } catch {
    return null;
  }
};

// Get access token string if valid
export const getAccessToken = (): string | null => {
  const token = getStoredToken();
  if (!token) return null;
  if (!isTokenValid()) return null;
  return token.accessToken;
};

// Check if token is valid (not expired)
export const isTokenValid = (): boolean => {
  const token = getStoredToken();
  if (!token) return false;
  return Date.now() < token.expiresAt;
};

// Get days until token expires
export const getDaysUntilExpiry = (): number => {
  const token = getStoredToken();
  if (!token) return 0;
  const msUntilExpiry = token.expiresAt - Date.now();
  return Math.max(0, Math.floor(msUntilExpiry / (24 * 60 * 60 * 1000)));
};

// Check if token is expiring soon (within 7 days)
export const isTokenExpiringSoon = (): boolean => {
  return getDaysUntilExpiry() <= 7;
};

// Clear token (logout)
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

// Store user info
export const storeUser = (user: LinkedInUser): void => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

// Get stored user info
export const getStoredUser = (): LinkedInUser | null => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LinkedInUser;
  } catch {
    return null;
  }
};

// Fetch user profile from LinkedIn API via backend proxy
export const fetchUserProfile = async (): Promise<LinkedInUser | null> => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    // Use backend proxy to avoid CORS issues
    const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';
    const response = await fetch(`${proxyServerUrl}/api/linkedin/userinfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: token,
      }),
    });

    if (!response.ok) {
      console.error('Failed to fetch user profile:', response.status);
      return null;
    }

    const data = await response.json();

    const user: LinkedInUser = {
      id: data.sub,
      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      email: data.email,
      profilePicture: data.picture,
    };

    storeUser(user);
    return user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Validate token by making a test API call
export const validateToken = async (): Promise<boolean> => {
  const user = await fetchUserProfile();
  return user !== null;
};

// Check if connected (has valid token and user)
export const isConnected = (): boolean => {
  return isTokenValid() && getStoredUser() !== null;
};

// =============================================================================
// Hybrid Authentication (OAuth + Manual Token)
// =============================================================================

const AUTH_METHOD_KEY = 'linkedin_auth_method';

/**
 * Set authentication method
 */
export const setAuthMethod = (method: 'oauth' | 'manual'): void => {
  localStorage.setItem(AUTH_METHOD_KEY, method);
};

/**
 * Get authentication method
 */
export const getAuthMethod = (): 'oauth' | 'manual' | null => {
  const method = localStorage.getItem(AUTH_METHOD_KEY);
  if (method === 'oauth' || method === 'manual') {
    return method;
  }

  // Fallback: check token object
  const token = getStoredToken();
  if (token?.authMethod) {
    return token.authMethod;
  }

  // Default to 'manual' for backward compatibility
  return token ? 'manual' : null;
};

/**
 * Store token with authentication method
 */
export const storeTokenWithMethod = (
  accessToken: string,
  method: 'oauth' | 'manual',
  expiresInDays: number = 60
): void => {
  const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
  const tokenData: LinkedInToken = {
    accessToken,
    expiresAt,
    authMethod: method,
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  setAuthMethod(method);
};
