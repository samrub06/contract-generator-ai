export interface ContractRequest {
  prompt: string;
}

export interface ContractResponse {
  success: boolean;
  html: string;
  message: string;
}

// Enhanced interface for contract generation with streaming display
export interface GenerationStatus {
  status: 'idle' | 'generating' | 'completed' | 'error' | 'stopped' | 'validating';
  message?: string;
  html?: string;
  error?: string;
  streamingContent?: string; // Raw content being streamed
  tokenInfo?: {
    inputTokens: number;
    estimatedCost: number;
    model: string;
  };
  validation?: {
    valid: boolean;
    limit: number;
    inputTokens: number;
    remaining: number;
    recommendedModel: string;
  };
  // New fields for intelligent chunking
  chunkInfo?: {
    chunkType: string;
    bufferSize: number;
    totalChunks: number;
    lastChunkTime: string;
  };
}

// Token validation interface
export interface TokenValidation {
  success: boolean;
  validation: {
    valid: boolean;
    limit: number;
    inputTokens: number;
    remaining: number;
    recommendedModel: string;
    error?: string;
  };
  cost: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  };
  prompt: {
    original: string;
    enhanced: string;
    inputTokens: number;
  };
}

import { API_CONFIG } from '../config/api';

export const htmlService = {
  // Validate prompt before generation
  async validatePrompt(prompt: string): Promise<TokenValidation> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT_VALIDATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Generate contract with streaming SSE - shows streaming content and final HTML
  generateContractStreaming(
    request: ContractRequest,
    onStatusUpdate: (status: GenerationStatus) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): () => void {
    const controller = new AbortController();
    let streamingContent = '';
    let isAborted = false;
    let totalChunks = 0;
    let lastChunkTime = '';
    
    fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      
      function readStream() {
        if (isAborted) return;
        
        reader!.read().then(({ done, value }) => {
          if (done || isAborted) {
            if (!isAborted) {
              onComplete();
            }
            return;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                // Handle the new streaming format from backend
                if (data.progress === "complete" && data.html) {
                  // Final complete HTML received - show it now
                  console.log('Complete HTML received from backend');
                  onStatusUpdate({
                    status: 'completed',
                    html: data.html,
                    message: 'Contract generation completed successfully'
                  });
                } else if (data.progress === "validating") {
                  // Validation phase
                  onStatusUpdate({
                    status: 'validating',
                    message: data.message || 'Validating request...',
                    tokenInfo: data.tokenInfo
                  });
                } else if (data.progress === "header" && data.html_chunk) {
                  // HTML header received, just store it, don't show yet
                  streamingContent = data.html_chunk;
                  onStatusUpdate({
                    status: 'generating',
                    message: 'Template loaded, generating contract content...'
                  });
                } else if (data.progress === "content" && data.html_chunk) {
                  // Contract content received, add to the document but don't show yet
                  streamingContent += data.html_chunk;
                  onStatusUpdate({
                    status: 'generating',
                    message: 'Contract content generated, finalizing...'
                  });
                } else if (data.progress === "footer" && data.html_chunk) {
                  // HTML footer received, complete the document and show it
                  streamingContent += data.html_chunk;
                  onStatusUpdate({
                    status: 'completed',
                    html: streamingContent,
                    message: 'Contract generation completed successfully'
                  });
                } else if (data.progress === "streaming" && data.html_chunk) {
                  // Intelligent streaming content with chunk info
                  totalChunks++;
                  lastChunkTime = data.timestamp;
                  
                  // Add to streaming content for real-time display
                  streamingContent += data.html_chunk;
                  
                  onStatusUpdate({
                    status: 'generating',
                    message: 'Generating contract...',
                    streamingContent: streamingContent,
                    chunkInfo: {
                      chunkType: data.chunk_type || 'unknown',
                      bufferSize: data.buffer_size || 0,
                      totalChunks: totalChunks,
                      lastChunkTime: lastChunkTime
                    }
                  });
                } else if (data.progress === "failed") {
                  // Error occurred
                  onError(data.error || 'Generation failed');
                  return;
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming data:', parseError);
              }
            }
          }
          
          if (!isAborted) {
            readStream();
          }
        }).catch(error => {
          if (!isAborted) {
            onError(error.message);
          }
        });
      }
      
      readStream();
    }).catch(error => {
      if (!isAborted) {
        onError(error.message);
      }
    });

    // Return cleanup function
    return () => {
      isAborted = true;
      try {
        controller.abort();
      } catch {
        console.log('Clean abort completed');
      }
    };
  },

  // Generate contract with OpenAI + Zod validation (fallback)
  async generateContract(request: ContractRequest): Promise<ContractResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};