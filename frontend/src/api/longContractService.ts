/**
 * Long Contract Service API
 * Handles communication with the new long contract backend endpoint
 */

import { API_CONFIG } from '../config/api';
import type { LongContractResponse, LongContractSSEEvent } from '../types/longContract';

export class LongContractService {
  private eventSource: EventSource | null = null;

  /**
   * Start long contract generation with intelligent chunking
   * @param prompt - User's contract requirements
   * @param onEvent - Callback for SSE events
   * @param onError - Error callback
   * @param onComplete - Completion callback
   * @returns EventSource for the connection
   */
  async startLongContractGeneration(
    prompt: string,
    onEvent: (event: LongContractSSEEvent) => void,
    onError: (error: Error) => void,
    onComplete: (contract: LongContractResponse) => void
  ): Promise<EventSource> {
    try {
      // Close existing connection if any
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Start the long contract generation via POST
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LONG_CONTRACT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create EventSource from the response stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Process the SSE stream manually
      const decoder = new TextDecoder();
      let buffer = '';

      const processChunk = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Long contract generation stream completed');
            return;
          }

          // Decode and process the chunk
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6)) as LongContractSSEEvent;
                onEvent(eventData);

                // Handle completion
                if (eventData.type === 'final_result' && eventData.contract) {
                  onComplete(eventData.contract);
                  return;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }
            }
          }

          // Continue processing
          await processChunk();
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Stream processing error'));
        }
      };

      // Start processing
      processChunk();

      // Create a mock EventSource for compatibility
      const mockEventSource = {
        close: () => {
          reader.cancel();
        },
        readyState: 1, // OPEN
        url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LONG_CONTRACT}`,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        onopen: null,
        onmessage: null,
        onerror: null,
        withCredentials: false,
        CONNECTING: 0,
        OPEN: 1,
        CLOSED: 2,
      } as unknown as EventSource;

      this.eventSource = mockEventSource;
      return mockEventSource as unknown as EventSource;

    } catch (error) {
      console.error('❌ Failed to start long contract generation:', error);
      onError(error instanceof Error ? error : new Error('Failed to start generation'));
      throw error;
    }
  }

  /**
   * Stop long contract generation
   * @param sessionId - Session ID to stop
   */
  async stopGeneration(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LONG_CONTRACT_STOP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to stop generation: ${response.statusText}`);
      }

      // Close the EventSource connection
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      console.log('🛑 Long contract generation stopped');
    } catch (error) {
      console.error('❌ Failed to stop generation:', error);
      throw error;
    }
  }

  /**
   * Close the current connection
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Export singleton instance
export const longContractService = new LongContractService();