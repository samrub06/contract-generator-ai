import express from 'express';
import { contractGenerationLimiter } from '../middleware/rateLimiter.js';
import realTimeStreamingService from '../services/streamingService.js';

const router = express.Router();

/**
 * Start REAL-TIME streaming generation (character by character like ChatGPT)
 * WITH TIMEOUT HANDLING AND RESUME CAPABILITY
 */
router.post('/tos/stream', contractGenerationLimiter, async (req, res) => {
  const { prompt, resumeFrom, sessionId: existingSessionId } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing prompt',
      message: 'Please provide a description for Terms of Service'
    });
  }

  try {
    // Generate new session ID or use existing one for resume
    const sessionId = existingSessionId || `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Configure response for Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      sessionId: sessionId,
      message: resumeFrom ? 'Resuming generation...' : 'Real-time streaming started',
      isResumed: !!resumeFrom
    })}\n\n`);

    // Start real-time streaming with resume capability
    await realTimeStreamingService.startRealTimeStreaming(prompt, sessionId, res, resumeFrom || '');
    
  } catch (error) {
    console.error('ToS real-time streaming error:', error);
    
    // Send error to frontend
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Generation failed',
      message: error.message,
      canResume: false
    })}\n\n`);
    
    res.end();
  }
});

/**
 * Resume generation after a timeout
 */
router.post('/tos/resume', contractGenerationLimiter, async (req, res) => {
  const { sessionId, resumeFrom } = req.body;

  if (!sessionId || !resumeFrom) {
    return res.status(400).json({
      error: 'Missing sessionId or resumeFrom',
      message: 'Session ID and content to resume from are required'
    });
  }

  try {
    // Configure response for Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send resume connection message
    res.write(`data: ${JSON.stringify({
      type: 'resume_started',
      sessionId: sessionId,
      message: 'Resuming generation from timeout...',
      isResumed: true
    })}\n\n`);

    // Resume streaming from where it left off
    await realTimeStreamingService.resumeGeneration(sessionId, resumeFrom, res);
    
  } catch (error) {
    console.error('ToS resume error:', error);
    
    // Send error to frontend
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Resume failed',
      message: error.message,
      canResume: false
    })}\n\n`);
    
    res.end();
  }
});

/**
 * Stop generation for a specific session
 */
router.post('/tos/stop', contractGenerationLimiter, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Missing sessionId',
      message: 'Session ID is required'
    });
  }

  try {
    const result = await realTimeStreamingService.stopGeneration(sessionId);
    
    res.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message,
      lastContent: result.lastContent
    });
    
  } catch (error) {
    console.error('ToS stop error:', error);
    res.status(500).json({
      error: 'Stop failed',
      message: error.message
    });
  }
});

/**
 * Get session information
 */
router.get('/tos/session/:sessionId', contractGenerationLimiter, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = realTimeStreamingService.getSession(sessionId);
    const timeoutCount = realTimeStreamingService.getTimeoutCount(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session does not exist or has expired'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        lastContent: session.lastContent,
        timeoutCount: timeoutCount
      }
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Failed to get session',
      message: error.message
    });
  }
});

export default router;