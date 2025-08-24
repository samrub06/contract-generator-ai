import express from 'express';
import { contractGenerationLimiter } from '../middleware/rateLimiter.js';
import longContractService from '../services/longContractService.js';

const router = express.Router();

/**
 * 🚀 SINGLE ROUTE FOR LONG CONTRACTS (10+ PAGES)
 * Intelligent chunking with OpenAI structured output + Zod
 * Orchestrates chunks and sends structured JSON to frontend
 */
router.post('/tos/long-contract', contractGenerationLimiter, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing prompt',
      message: 'Please provide a description for Terms of Service'
    });
  }

  // Generate unique session ID for long contract (declare outside try block)
  const sessionId = `long_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
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
      sessionId,
      message: 'Starting long contract generation with intelligent chunking...',
      mode: 'LONG_CONTRACT_ONLY'
    })}\n\n`);

    // Generate long contract: Smart chunking + OpenAI structured output
    const contractResult = await longContractService.generateLongContract(prompt, sessionId, res);
    
    // Send final structured JSON result
    res.write(`data: ${JSON.stringify({
      type: 'final_result',
      sessionId,
      message: 'Long contract generation completed',
      contract: contractResult
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('❌ Long contract generation error:', error);
    
    // Send error to frontend
    res.write(`data: ${JSON.stringify({
      type: 'error',
      sessionId,
      error: error.message,
      message: 'Failed to generate long contract'
    })}\n\n`);
    
    res.end();
  }
});

/**
 * 🛑 STOP LONG CONTRACT GENERATION
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
    const result = await longContractService.stopGeneration(sessionId);
    
    res.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message
    });
    
  } catch (error) {
    console.error('Stop generation error:', error);
    res.status(500).json({
      error: 'Stop failed',
      message: error.message
    });
  }
});

export default router;