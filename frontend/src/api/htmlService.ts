// ToS Section interfaces
export interface ToSSection {
  n: number;
  t: string;
  ss: Array<{
    n: string;
    t: string;
    c: string;
    l: string[] | null;
  }>;
}

// Response interfaces for chunk-based generation
export interface ToSChunkResponse {
  success: boolean;
  sessionId: string;
  sections: ToSSection[];
  html: string;
  progress: string;
  isComplete: boolean;
  nextSection: number;
  chunkNumber: number;
}

export interface ToSCompletionResponse {
  success: boolean;
  sessionId: string;
  isComplete: true;
  progress: string;
  message: string;
}

export interface ToSStopResponse {
  success: boolean;
  sessionId: string;
  message: string;
  sectionsGenerated: number;
  progress: string;
}

// Real-time streaming interfaces
export interface StreamingData {
  type: 'connected' | 'content' | 'section_complete' | 'complete' | 'error' | 'timeout' | 'resume_started';
  sessionId: string;
  content?: string;
  fullContent?: string;
  sectionCount?: number;
  sectionNumber?: number;
  sectionContent?: string;
  totalSections?: number;
  message?: string;
  error?: string;
  canResume?: boolean;
  isResumed?: boolean;
  resumeData?: {
    fullContent: string;
    sectionCount: number;
    canResume: boolean;
  };
}

export interface SessionInfo {
  id: string;
  status: string;
  createdAt: string;
  lastContent: string;
  timeoutCount: number;
}

export interface ResumeResponse {
  success: boolean;
  sessionId: string;
  message: string;
  lastContent: string;
}

import { API_CONFIG } from '../config/api';

export const htmlService = {
  // Start REAL-TIME streaming (character by character like ChatGPT)
  // WITH TIMEOUT HANDLING AND RESUME CAPABILITY
  async startRealTimeStreaming(
    prompt: string, 
    onData: (data: StreamingData) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    resumeFrom?: string,
    existingSessionId?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/contract/tos/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt, 
          resumeFrom: resumeFrom || '', 
          sessionId: existingSessionId 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamingData = JSON.parse(line.slice(6));
                onData(data);

                if (data.type === 'complete' || data.type === 'error') {
                  if (data.type === 'complete') {
                    onComplete();
                  }
                  break;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  },

  // Resume generation after a timeout
  async resumeGeneration(
    sessionId: string,
    resumeFrom: string,
    onData: (data: StreamingData) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/contract/tos/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, resumeFrom }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamingData = JSON.parse(line.slice(6));
                onData(data);

                if (data.type === 'complete' || data.type === 'error') {
                  if (data.type === 'complete') {
                    onComplete();
                  }
                  break;
                }
              } catch (e) {
                console.error('Error parsing resume data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  },

  // Stop ToS generation
  async stopToSGeneration(sessionId: string): Promise<ResumeResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/contract/tos/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get session information
  async getSessionInfo(sessionId: string): Promise<SessionInfo> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/contract/tos/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.session;
  }
};