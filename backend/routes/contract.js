import express from 'express';
import { contractGenerationLimiter } from '../middleware/rateLimiter.js';
import { streamContract } from '../services/openaiService.js';
import { generateContractPrompt } from '../services/promptService.js';
import { retryService } from '../services/retryService.js';
import { tokenService } from '../services/tokenService.js';

const router = express.Router();

/**
 * Enhanced contract generation with production features
 */
router.post('/generate', contractGenerationLimiter, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing prompt',
      message: 'Please provide a contract description'
    });
  }

  try {
    // Generate enhanced prompt
    const enhancedPrompt = generateContractPrompt(prompt);
    
    // Count tokens and validate
    const inputTokens = tokenService.countTokens(enhancedPrompt);
    const validation = tokenService.validateTokenLimit('gpt-4o', inputTokens);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Token limit exceeded',
        message: validation.error,
        details: {
          inputTokens,
          limit: validation.limit,
          remaining: validation.remaining
        }
      });
    }

    // Estimate cost
    const estimatedCost = tokenService.estimateCost('gpt-4o', inputTokens, 2000); // Estimate 2000 output tokens
    
    console.log(`Contract generation request:`, {
      inputTokens,
      estimatedCost: estimatedCost.totalCost,
      model: 'gpt-4o'
    });

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial status
    res.write(`data: ${JSON.stringify({
      progress: "validating",
      message: "Validating request and counting tokens...",
      tokenInfo: {
        inputTokens,
        estimatedCost: estimatedCost.totalCost,
        model: 'gpt-4o'
      },
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Execute OpenAI streaming with retry logic
    await retryService.executeStreamingWithRetry(
      () => streamContract(enhancedPrompt, res),
      {
        maxRetries: 2,
        timeout: 180000, // 3 minutes for contract generation
        baseDelay: 2000  // 2 seconds base delay
      }
    );

  } catch (error) {
    console.error('Contract generation error:', error);
    
    // Send error to client
    res.write(`data: ${JSON.stringify({
      progress: "failed",
      error: error.message,
      message: "Contract generation failed",
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    res.end();
  }
});

/**
 * Get token information for a prompt (pre-validation)
 */
router.post('/validate', contractGenerationLimiter, (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing prompt',
      message: 'Please provide a contract description'
    });
  }

  try {
    const enhancedPrompt = generateContractPrompt(prompt);
    const inputTokens = tokenService.countTokens(enhancedPrompt);
    const validation = tokenService.validateTokenLimit('gpt-4o', inputTokens);
    const estimatedCost = tokenService.estimateCost('gpt-4o', inputTokens, 2000);
    const recommendedModel = tokenService.getRecommendedModel(inputTokens);

    res.json({
      success: true,
      validation: {
        ...validation,
        recommendedModel
      },
      cost: estimatedCost,
      prompt: {
        original: prompt,
        enhanced: enhancedPrompt,
        inputTokens
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

export default router;
