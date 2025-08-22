// Retry service with exponential backoff and timeout handling
export class RetryService {
  constructor() {
    this.defaultOptions = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000,  // 30 seconds
      timeout: 120000,  // 2 minutes
      backoffMultiplier: 2,
      jitter: 0.1 // 10% random jitter
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (1-based)
   * @param {Object} options - Retry options
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt, options = {}) {
    const { baseDelay, maxDelay, backoffMultiplier, jitter } = { ...this.defaultOptions, ...options };
    
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    // Cap at maxDelay
    delay = Math.min(delay, maxDelay);
    
    // Add jitter (±jitter%)
    const jitterAmount = delay * jitter;
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
    
    return Math.max(0, delay + randomJitter);
  }

  /**
   * Sleep for a given number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options
   * @returns {Promise} - Result of function execution
   */
  async executeWithRetry(fn, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    let lastError;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${config.timeout}ms`));
          }, config.timeout);
        });

        // Execute function with timeout
        const result = await Promise.race([
          fn(attempt),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === config.maxRetries) {
          throw new Error(`Operation failed after ${config.maxRetries} attempts. Last error: ${error.message}`);
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        
        console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
        
        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should not trigger a retry
   * @param {Error} error - Error to check
   * @returns {boolean} - True if should not retry
   */
  shouldNotRetry(error) {
    // Don't retry on authentication errors
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      return true;
    }
    
    // Don't retry on rate limit errors (let rate limiter handle it)
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return true;
    }
    
    // Don't retry on invalid input errors
    if (error.message?.includes('invalid') || error.message?.includes('bad request')) {
      return true;
    }
    
    return false;
  }

  /**
   * Execute OpenAI streaming with retry logic
   * @param {Function} streamingFn - OpenAI streaming function
   * @param {Object} options - Retry options
   * @returns {Promise} - Streaming result
   */
  async executeStreamingWithRetry(streamingFn, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    return this.executeWithRetry(async (attempt) => {
      console.log(`Executing OpenAI streaming attempt ${attempt}`);
      return await streamingFn();
    }, config);
  }
}

// Export singleton instance
export const retryService = new RetryService(); 