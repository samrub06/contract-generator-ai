// API Configuration - Updated for long contract chunking
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  ENDPOINTS: {
    // Legacy streaming endpoints (kept for compatibility)
    TOS_STREAM: '/api/contract/tos/stream',
    TOS_STOP: '/api/contract/tos/stop',
    // New long contract endpoint (single route for 10+ page contracts)
    LONG_CONTRACT: '/api/contract/tos/long-contract',
    LONG_CONTRACT_STOP: '/api/contract/tos/stop',
  },
} as const;

 