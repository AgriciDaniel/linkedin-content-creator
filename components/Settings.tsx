import React, { useState, useEffect } from 'react';
import {
  storeToken,
  clearToken,
  isTokenValid,
  getDaysUntilExpiry,
  isTokenExpiringSoon,
  getStoredUser,
  validateToken,
  getAuthMethod,
} from '../services/linkedinAuth';
import {
  storeOAuthConfig,
  getOAuthConfig,
  initiateOAuthFlow,
  isOAuthConfigured,
} from '../services/linkedinOAuth';
import { LinkedInUser } from '../types';
import {
  storeGeminiApiKey,
  getGeminiApiKey,
  clearGeminiApiKey,
  isGeminiConfigured,
  testGeminiConnection,
} from '../services/geminiService';
import {
  storeFirecrawlApiKey,
  getFirecrawlApiKey,
  clearFirecrawlApiKey,
  isFirecrawlConfigured,
  testFirecrawlConnection,
} from '../services/firecrawlService';
import LoadingSpinner from './LoadingSpinner';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, isConnected, onConnectionChange }) => {
  // LinkedIn connection state
  const [accessToken, setAccessToken] = useState('');
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [user, setUser] = useState<LinkedInUser | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'manual' | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinSuccess, setLinkedinSuccess] = useState<string | null>(null);

  // OAuth state
  const [clientId, setClientId] = useState('77v67bntywdysq');
  const [clientSecret, setClientSecret] = useState('');
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [oauthSaving, setOauthSaving] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  // Gemini API state
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isGeminiConnected, setIsGeminiConnected] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiSuccess, setGeminiSuccess] = useState<string | null>(null);
  const [isGeminiTesting, setIsGeminiTesting] = useState(false);

  // Firecrawl API state
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [isFirecrawlConnected, setIsFirecrawlConnected] = useState(false);
  const [firecrawlError, setFirecrawlError] = useState<string | null>(null);
  const [firecrawlSuccess, setFirecrawlSuccess] = useState<string | null>(null);
  const [isFirecrawlTesting, setIsFirecrawlTesting] = useState(false);

  // Factory reset state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');


  useEffect(() => {
    if (isOpen) {
      const connected = isTokenValid();
      setLinkedinConnected(connected);
      if (connected) {
        setUser(getStoredUser());
        setDaysRemaining(getDaysUntilExpiry());
        setAuthMethod(getAuthMethod());
      }
    }
    setIsGeminiConnected(isGeminiConfigured());
    setIsFirecrawlConnected(isFirecrawlConfigured());
  }, [isOpen]);

  // Gemini API handlers
  const handleSaveGeminiKey = () => {
    if (!geminiApiKey.trim()) { setGeminiError('Please enter your Gemini API key'); return; }
    setGeminiError(null);
    storeGeminiApiKey(geminiApiKey.trim());
    setIsGeminiConnected(true);
    setGeminiSuccess('Gemini API key saved!');
    setGeminiApiKey('');
  };

  const handleClearGeminiKey = () => {
    clearGeminiApiKey();
    setIsGeminiConnected(false);
    setGeminiSuccess('Gemini API key removed');
  };

  const handleTestGeminiConnection = async () => {
    setIsGeminiTesting(true);
    setGeminiError(null);
    setGeminiSuccess(null);
    try {
      const result = await testGeminiConnection();
      if (result.success) setGeminiSuccess('Gemini API connection successful!');
      else setGeminiError(result.error || 'Connection test failed');
    } catch (error) {
      setGeminiError(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsGeminiTesting(false);
    }
  };

  // Firecrawl API handlers
  const handleSaveFirecrawlKey = () => {
    if (!firecrawlApiKey.trim()) { setFirecrawlError('Please enter your Firecrawl API key'); return; }
    setFirecrawlError(null);
    storeFirecrawlApiKey(firecrawlApiKey.trim());
    setIsFirecrawlConnected(true);
    setFirecrawlSuccess('Firecrawl API key saved!');
    setFirecrawlApiKey('');
  };

  const handleClearFirecrawlKey = () => {
    clearFirecrawlApiKey();
    setIsFirecrawlConnected(false);
    setFirecrawlSuccess('Firecrawl API key removed');
  };

  const handleTestFirecrawlConnection = async () => {
    setIsFirecrawlTesting(true);
    setFirecrawlError(null);
    setFirecrawlSuccess(null);
    try {
      const result = await testFirecrawlConnection();
      if (result.success) setFirecrawlSuccess('Firecrawl API connection successful!');
      else setFirecrawlError(result.error || 'Connection test failed');
    } catch (error) {
      setFirecrawlError(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsFirecrawlTesting(false);
    }
  };

  // LinkedIn connection handlers
  const handleConnect = async () => {
    if (!accessToken.trim()) { setLinkedinError('Please enter your LinkedIn access token'); return; }
    setIsValidating(true);
    setLinkedinError(null);
    setLinkedinSuccess(null);
    try {
      storeToken(accessToken.trim(), 60, 'manual');
      const isValid = await validateToken();
      if (isValid) {
        setLinkedinConnected(true);
        setUser(getStoredUser());
        setDaysRemaining(getDaysUntilExpiry());
        setAuthMethod('manual');
        setLinkedinSuccess('Connected to LinkedIn!');
        setAccessToken('');
        onConnectionChange?.(true);
      } else {
        clearToken();
        setLinkedinError('Invalid token. Please check and try again.');
      }
    } catch (err) {
      clearToken();
      setLinkedinError(err instanceof Error ? err.message : 'Failed to validate token');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    clearToken();
    setLinkedinConnected(false);
    setUser(null);
    setDaysRemaining(0);
    setAuthMethod(null);
    setLinkedinSuccess('Disconnected from LinkedIn');
    onConnectionChange?.(false);
  };

  const handleTestConnection = async () => {
    setIsValidating(true);
    setLinkedinError(null);
    setLinkedinSuccess(null);
    try {
      const isValid = await validateToken();
      if (isValid) {
        setLinkedinSuccess('LinkedIn connection is working!');
        setUser(getStoredUser());
        setDaysRemaining(getDaysUntilExpiry());
        setAuthMethod(getAuthMethod());
        setTimeout(() => setLinkedinSuccess(null), 5000);
      } else {
        setLinkedinError('Connection test failed. Token may have expired.');
      }
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : 'Failed to test connection');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveOAuthConfig = async () => {
    if (!clientId.trim()) { setOauthError('Please enter your LinkedIn Client ID'); return; }
    if (!clientSecret.trim()) { setOauthError('Please enter your LinkedIn Client Secret'); return; }
    setOauthSaving(true);
    setOauthError(null);
    setOauthSuccess(null);
    try {
      const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';
      const response = await fetch(`${proxyServerUrl}/api/oauth/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      if (!response.ok) throw new Error('Failed to save OAuth configuration');
      storeOAuthConfig(clientId.trim());
      setOauthConfigured(true);
      setOauthSuccess('OAuth configuration saved!');
      setClientSecret('');
      setTimeout(() => setOauthSuccess(null), 5000);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setOauthSaving(false);
    }
  };

  const handleOAuthLogin = async () => {
    try {
      setLinkedinError(null);
      if (!isOAuthConfigured() && !oauthConfigured) {
        setLinkedinError('Please configure OAuth settings first');
        return;
      }
      if (!isOAuthConfigured()) storeOAuthConfig(clientId);
      await initiateOAuthFlow(clientId);
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : 'Failed to start LinkedIn login');
    }
  };

  const handleFactoryReset = () => {
    // Clear all localStorage data
    localStorage.clear();
    // Reload the page to reset all state
    window.location.reload();
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure your integrations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-65px)] p-5">
          <div className="space-y-4">
            {/* LinkedIn Connection */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <img src="https://static.vecteezy.com/system/resources/previews/018/930/480/non_2x/linkedin-logo-linkedin-icon-transparent-free-png.png" alt="" className="h-4 w-4" />
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LinkedIn Connection</h3>
              </div>

              {linkedinConnected && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-medium text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                        {authMethod && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${authMethod === 'oauth' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                            {authMethod === 'oauth' ? 'OAuth' : 'Token'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Connected · {daysRemaining}d remaining
                      </p>
                    </div>
                  </div>

                  {isTokenExpiringSoon() && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-[10px] text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Token expires soon. Please renew.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <button onClick={handleTestConnection} disabled={isValidating} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-medium rounded-lg border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 disabled:opacity-50 transition-colors">
                      {isValidating ? <LoadingSpinner className="h-3 w-3" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      Test
                    </button>
                    <button onClick={handleDisconnect} className="flex-1 py-1.5 px-2 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* OAuth Login Button */}
                  <button type="button" onClick={handleOAuthLogin} disabled={!oauthConfigured && !isOAuthConfigured()} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <img src="https://static.vecteezy.com/system/resources/previews/018/930/480/non_2x/linkedin-logo-linkedin-icon-transparent-free-png.png" alt="" className="h-4 w-4 brightness-0 invert" />
                    Login with LinkedIn
                  </button>

                  {/* OAuth Config */}
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            OAuth Config {oauthConfigured && <span className="text-[8px] px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">OK</span>}
                          </span>
                          <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2 p-2.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <ol className="text-[9px] text-blue-700 dark:text-blue-400 space-y-0.5 list-decimal list-inside">
                          <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer Portal</a></li>
                          <li>Select app → Auth tab → Add Redirect: <code className="bg-blue-100 dark:bg-blue-800 px-0.5 rounded">http://localhost:3001</code></li>
                          <li>Copy Client ID and Secret below</li>
                        </ol>
                      </div>
                      <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="w-full px-2 py-1.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none font-mono" />
                      <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client Secret" className="w-full px-2 py-1.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none font-mono" />
                      <button type="button" onClick={handleSaveOAuthConfig} disabled={oauthSaving || !clientId.trim() || !clientSecret.trim()} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {oauthSaving ? <LoadingSpinner className="h-3 w-3" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        Save Config
                      </button>
                      {oauthError && <p className="text-[10px] text-red-500 dark:text-red-400">{oauthError}</p>}
                      {oauthSuccess && <p className="text-[10px] text-emerald-500 dark:text-emerald-400">{oauthSuccess}</p>}
                    </div>
                  </details>

                  {/* Manual Token */}
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            Manual Token Entry
                          </span>
                          <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2 p-2.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg">
                      <textarea value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste your LinkedIn access token..." className="w-full h-16 px-2 py-1.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none font-mono resize-none" disabled={isValidating} />
                      <button type="button" onClick={handleConnect} disabled={isValidating || !accessToken.trim()} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isValidating ? <><LoadingSpinner className="h-3 w-3" />Validating...</> : 'Connect'}
                      </button>
                    </div>
                  </details>
                </div>
              )}

              {linkedinError && <p className="mt-2 text-[10px] text-red-500 dark:text-red-400">{linkedinError}</p>}
              {linkedinSuccess && <p className="mt-2 text-[10px] text-emerald-500 dark:text-emerald-400">{linkedinSuccess}</p>}
            </div>

            {/* Gemini API */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gemini API</h3>
              </div>

              {isGeminiConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">API Key Configured</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleTestGeminiConnection} disabled={isGeminiTesting} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-medium rounded-lg border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 disabled:opacity-50 transition-colors">
                      {isGeminiTesting ? <LoadingSpinner className="h-3 w-3" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      Test
                    </button>
                    <button onClick={handleClearGeminiKey} className="flex-1 py-1.5 px-2 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">How to get API key</span>
                          <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-[#3E4042] rounded-lg">
                      <ol className="text-[9px] text-gray-600 dark:text-gray-400 space-y-0.5 list-decimal list-inside">
                        <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-[#0A66C2]">Google AI Studio</a></li>
                        <li>Sign in and create API Key</li>
                        <li>Copy and paste below</li>
                      </ol>
                    </div>
                  </details>
                  <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="Paste your Gemini API key..." className="w-full px-2 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none font-mono" />
                  <button onClick={handleSaveGeminiKey} disabled={!geminiApiKey.trim()} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save Key
                  </button>
                </div>
              )}
              {geminiError && <p className="mt-2 text-[10px] text-red-500 dark:text-red-400">{geminiError}</p>}
              {geminiSuccess && <p className="mt-2 text-[10px] text-emerald-500 dark:text-emerald-400">{geminiSuccess}</p>}
            </div>

            {/* Firecrawl API */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Firecrawl API</h3>
                </div>
                <span className="text-[9px] text-gray-400 dark:text-gray-500">Optional</span>
              </div>

              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">Enables real-time web research and trending topics.</p>

              {isFirecrawlConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">API Key Configured</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleTestFirecrawlConnection} disabled={isFirecrawlTesting} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-medium rounded-lg border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 disabled:opacity-50 transition-colors">
                      {isFirecrawlTesting ? <LoadingSpinner className="h-3 w-3" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      Test
                    </button>
                    <button onClick={handleClearFirecrawlKey} className="flex-1 py-1.5 px-2 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">How to get API key</span>
                          <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-[#3E4042] rounded-lg">
                      <ol className="text-[9px] text-gray-600 dark:text-gray-400 space-y-0.5 list-decimal list-inside">
                        <li>Go to <a href="https://www.firecrawl.dev" target="_blank" rel="noopener noreferrer" className="underline text-[#0A66C2]">Firecrawl</a></li>
                        <li>Sign up and get API Key</li>
                        <li>Copy and paste below</li>
                      </ol>
                    </div>
                  </details>
                  <input type="password" value={firecrawlApiKey} onChange={(e) => setFirecrawlApiKey(e.target.value)} placeholder="Paste your Firecrawl API key..." className="w-full px-2 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none font-mono" />
                  <button onClick={handleSaveFirecrawlKey} disabled={!firecrawlApiKey.trim()} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save Key
                  </button>
                </div>
              )}
              {firecrawlError && <p className="mt-2 text-[10px] text-red-500 dark:text-red-400">{firecrawlError}</p>}
              {firecrawlSuccess && <p className="mt-2 text-[10px] text-emerald-500 dark:text-emerald-400">{firecrawlSuccess}</p>}
            </div>

            {/* Scheduler Info */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduler</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-[#3E4042]">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#0A66C2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">How it works</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        Enable the <span className="font-medium text-[#0A66C2]">Scheduler</span> toggle in the header to automatically publish your scheduled posts from the Content Calendar at their designated times.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Schedule posts via the Calendar button in the header</span>
                </div>

                {/* Requirements */}
                {(!isConnected || !isGeminiConnected) && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {!isConnected ? 'Connect LinkedIn' : 'Configure Gemini API'} to enable Scheduler
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Danger Zone</h3>
              </div>

              <p className="text-[10px] text-red-600/70 dark:text-red-400/70 mb-3">
                Permanently delete all data including posts, schedules, profile settings, and API configurations.
              </p>

              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Erase All Data
              </button>
            </div>

            {/* About */}
            <div className="pt-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                LinkedIn Content Creator · AI-powered posts optimized for 2026 algorithm
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1">
                Credentials stored locally · Token lifespan: 60 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Factory Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-[#3E4042] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Factory Reset</h3>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-2">This will permanently delete:</p>
                <ul className="text-[11px] text-red-600/80 dark:text-red-400/80 space-y-1 list-disc list-inside">
                  <li>All scheduled and draft posts</li>
                  <li>Your profile settings and preferences</li>
                  <li>LinkedIn, Gemini, and Firecrawl API keys</li>
                  <li>Content history and analytics</li>
                  <li>All other app data</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Type <span className="font-bold text-red-600 dark:text-red-400">ERASE</span> to confirm
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="ERASE"
                  className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsResetConfirmOpen(false);
                    setResetConfirmText('');
                  }}
                  className="flex-1 py-2 px-3 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFactoryReset}
                  disabled={resetConfirmText !== 'ERASE'}
                  className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-900/30 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Erase All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
