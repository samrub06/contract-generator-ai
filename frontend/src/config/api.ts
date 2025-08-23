// API Configuration - Updated for streaming support
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  ENDPOINTS: {
    TOS_START: '/api/contract/tos/start',
    TOS_NEXT: '/api/contract/tos/next',
    TOS_STOP: '/api/contract/tos/stop',
  },
} as const;

 