// API Configuration - Updated for long contract chunking
// Resolve BASE_URL with sensible defaults:
// 1) Use VITE_API_BASE_URL if provided (trim trailing slash)
// 2) In production, default to same-origin (empty base: "")
// 3) In development, default to local backend
const resolvedBaseUrl = (() => {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, '');
  }
  if ((import.meta as any).env?.PROD) {
    return '';
  }
  return 'http://localhost:3001';
})();

export const API_CONFIG = {
  BASE_URL: resolvedBaseUrl,
  ENDPOINTS: {
    // Legacy streaming endpoints (kept for compatibility)
    TOS_STREAM: '/api/contract/tos/stream',
    TOS_STOP: '/api/contract/tos/stop',
    // New long contract endpoint (single route for 10+ page contracts)
    LONG_CONTRACT: '/api/contract/tos/long-contract',
    LONG_CONTRACT_STOP: '/api/contract/tos/stop',
  },
} as const;

 