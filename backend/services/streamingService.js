/**
 * Real-time streaming service for Terms of Service generation
 * WITH TIMEOUT HANDLING AND RESUME CAPABILITY
 * Generates content character by character like ChatGPT
 */

import { generateRealTimeStreaming } from './openaiService.js';

class RealTimeStreamingService {
  constructor() {
    this.activeSessions = new Map(); // Track active generation sessions
    this.sessionTimeouts = new Map(); // Track timeout attempts per session
  }

  /**
   * Start REAL-TIME streaming generation (character by character like ChatGPT)
   * WITH TIMEOUT RECOVERY
   * @param {string} userPrompt - User's initial prompt
   * @param {string} sessionId - Unique session identifier
   * @param {Object} res - Express response object for streaming
   * @param {string} resumeFrom - Content to resume from (for timeout recovery)
   * @returns {Promise<void>} - Streams content directly to response
   */
  async startRealTimeStreaming(userPrompt, sessionId, res, resumeFrom = '') {
    try {
      // Create or update session for real-time streaming
      const session = {
        id: sessionId,
        userPrompt,
        status: 'streaming',
        createdAt: new Date(),
        lastContent: resumeFrom,
        timeoutCount: this.sessionTimeouts.get(sessionId) || 0
      };

      this.activeSessions.set(sessionId, session);

      console.log(`Starting real-time streaming session ${sessionId}${resumeFrom ? ' (resumed)' : ''}`);

      // Start real-time streaming with resume capability
      await generateRealTimeStreaming(userPrompt, sessionId, res, resumeFrom);

      // Mark session as completed
      session.status = 'completed';
      
    } catch (error) {
      console.error('Error in real-time streaming:', error);
      
      // Send error to frontend
      res.write(`data: ${JSON.stringify({
        type: 'error',
        sessionId: sessionId,
        error: error.message,
        canResume: false
      })}\n\n`);
    }
  }

  /**
   * Resume generation after a timeout
   * @param {string} sessionId - Session identifier
   * @param {string} resumeFrom - Content to resume from
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Resumes streaming from where it left off
   */
  async resumeGeneration(sessionId, resumeFrom, res) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Increment timeout counter
      const timeoutCount = (this.sessionTimeouts.get(sessionId) || 0) + 1;
      this.sessionTimeouts.set(sessionId, timeoutCount);

      if (timeoutCount > 3) {
        // Too many timeouts, give up
        res.write(`data: ${JSON.stringify({
          type: 'error',
          sessionId: sessionId,
          error: 'Too many timeouts, generation cannot be resumed',
          canResume: false
        })}\n\n`);
        return;
      }

      console.log(`Resuming generation for session ${sessionId} (timeout attempt ${timeoutCount})`);

      // Resume streaming from where it left off
      await this.startRealTimeStreaming(session.userPrompt, sessionId, res, resumeFrom);
      
    } catch (error) {
      console.error('Error resuming generation:', error);
      
      res.write(`data: ${JSON.stringify({
        type: 'error',
        sessionId: sessionId,
        error: error.message,
        canResume: false
      })}\n\n`);
    }
  }

  /**
   * Stop generation for a specific session
   * @param {string} sessionId - Session identifier
   * @returns {Object} Stop result with session info
   */
  async stopGeneration(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Mark session as stopped
      session.status = 'stopped';
      
      console.log(`Generation stopped for session ${sessionId}`);

      return {
        sessionId,
        message: 'Generation stopped successfully',
        lastContent: session.lastContent || ''
      };
    } catch (error) {
      console.error('Error stopping generation:', error);
      throw error;
    }
  }

  /**
   * Get session information
   * @param {string} sessionId - Session identifier
   * @returns {Object} Session information
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAgeHours - Maximum age in hours before cleanup
   */
  cleanupExpiredSessions(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.activeSessions.delete(sessionId);
        this.sessionTimeouts.delete(sessionId);
        console.log(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  /**
   * Get timeout statistics for a session
   * @param {string} sessionId - Session identifier
   * @returns {number} Number of timeout attempts
   */
  getTimeoutCount(sessionId) {
    return this.sessionTimeouts.get(sessionId) || 0;
  }
}

// Create singleton instance
const realTimeStreamingService = new RealTimeStreamingService();

// Cleanup expired sessions every hour
setInterval(() => {
  realTimeStreamingService.cleanupExpiredSessions();
}, 60 * 60 * 1000);

export default realTimeStreamingService; 