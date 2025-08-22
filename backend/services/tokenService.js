import { encode } from 'gpt-tokenizer';

// Token counting and cost management service
export class TokenService {
  constructor() {
    // OpenAI pricing (as of 2024 - adjust as needed)
    this.pricing = {
      'gpt-4o': {
        input: 0.0025,    // $0.0025 per 1K input tokens
        output: 0.01      // $0.01 per 1K output tokens
      },
      'gpt-4o-mini': {
        input: 0.00015,   // $0.00015 per 1K input tokens
        output: 0.0006    // $0.0006 per 1K output tokens
      },
      'gpt-3.5-turbo': {
        input: 0.0005,    // $0.0005 per 1K input tokens
        output: 0.0015    // $0.0015 per 1K output tokens
      }
    };
    
    // Token limits
    this.limits = {
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-3.5-turbo': 16385
    };
  }

  /**
   * Count tokens in a text string
   * @param {string} text - Text to count tokens for
   * @returns {number} - Number of tokens
   */
  countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    
    try {
      // Use gpt-tokenizer for accurate counting
      return encode(text).length;
    } catch (error) {
      console.warn('Token counting failed, using fallback method:', error.message);
      // Fallback: rough estimation (1 token ≈ 4 characters for English)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Count tokens in messages array
   * @param {Array} messages - Array of message objects
   * @returns {number} - Total token count
   */
  countTokensInMessages(messages) {
    if (!Array.isArray(messages)) return 0;
    
    return messages.reduce((total, message) => {
      return total + this.countTokens(message.content || '');
    }, 0);
  }

  /**
   * Estimate cost for a request
   * @param {string} model - Model name
   * @param {number} inputTokens - Input token count
   * @param {number} outputTokens - Estimated output token count
   * @returns {Object} - Cost breakdown
   */
  estimateCost(model, inputTokens, outputTokens = 0) {
    const modelPricing = this.pricing[model];
    if (!modelPricing) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return {
      model,
      inputTokens,
      outputTokens,
      inputCost: parseFloat(inputCost.toFixed(6)),
      outputCost: parseFloat(outputCost.toFixed(6)),
      totalCost: parseFloat(totalCost.toFixed(6)),
      currency: 'USD'
    };
  }

  /**
   * Check if request exceeds token limits
   * @param {string} model - Model name
   * @param {number} inputTokens - Input token count
   * @returns {Object} - Validation result
   */
  validateTokenLimit(model, inputTokens) {
    const limit = this.limits[model];
    if (!limit) {
      return { valid: false, error: `Unknown model: ${model}` };
    }

    const isValid = inputTokens <= limit;
    const remaining = Math.max(0, limit - inputTokens);

    return {
      valid: isValid,
      limit,
      inputTokens,
      remaining,
      error: isValid ? null : `Input exceeds ${model} token limit of ${limit}`
    };
  }

  /**
   * Get recommended model based on token count
   * @param {number} tokenCount - Estimated token count
   * @returns {string} - Recommended model name
   */
  getRecommendedModel(tokenCount) {
    if (tokenCount <= 4000) {
      return 'gpt-3.5-turbo'; // Cheapest for short content
    } else if (tokenCount <= 32000) {
      return 'gpt-4o-mini';   // Good balance of cost/quality
    } else {
      return 'gpt-4o';        // Best quality for long content
    }
  }

  /**
   * Truncate text to fit within token limit
   * @param {string} text - Text to truncate
   * @param {number} maxTokens - Maximum tokens allowed
   * @returns {string} - Truncated text
   */
  truncateToTokenLimit(text, maxTokens) {
    const tokens = this.countTokens(text);
    if (tokens <= maxTokens) return text;

    // Simple truncation - in production you might want smarter truncation
    const ratio = maxTokens / tokens;
    const targetLength = Math.floor(text.length * ratio);
    
    return text.substring(0, targetLength) + '...';
  }
}

// Export singleton instance
export const tokenService = new TokenService(); 