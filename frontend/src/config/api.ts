// API Configuration - Updated for streaming support
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  ENDPOINTS: {
    CONTRACT: '/api/contract/generate',
    CONTRACT_STREAM: '/api/contract/generate',
    CONTRACT_VALIDATE: '/api/contract/validate',
    CONTRACT_MOCK: '/api/contract/mock',
    HEALTH: '/api/health',
  },
} as const;

// Computed URLs
export const CONTRACT_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT}`;
export const CONTRACT_STREAM_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT_STREAM}`;
export const CONTRACT_VALIDATE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT_VALIDATE}`;
export const CONTRACT_MOCK_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT_MOCK}`;
export const HEALTH_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`;

// To test different routes, change the BASE_URL or ENDPOINTS above
// Examples:
// - BASE_URL: 'http://localhost:3001' (local backend)
// - BASE_URL: 'https://your-api.com' (production)
// - ENDPOINTS.CONTRACT: '/api/contract' (complete generation)
// - ENDPOINTS.CONTRACT_STREAM: '/api/contract/stream' (streaming generation) 