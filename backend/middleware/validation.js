/**
 * Middleware for prompt validation
 * Validates prompt, requestId, and timestamp
 */

/**
 * Validate if prompt exists and meets length requirements
 * @param {string} prompt - The prompt to validate
 * @returns {boolean} - True if prompt is valid, false otherwise
 */
function validatePromptExists(prompt) {
  // Basic validation - only check length
  if (!prompt || prompt.trim().length === 0) {
    return false;
  }
  
  // Check if prompt has minimum length
  if (prompt.trim().length < 10) {
    return false;
  }
  
  return true;
}

/**
 * Validate request body fields
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validatePromptRequest(req, res, next) {
  const { prompt, requestId, timestamp } = req.body;

  // Check if all required fields are present
  if (!prompt || !requestId || !timestamp) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'prompt, requestId, and timestamp are required',
      received: { prompt: !!prompt, requestId: !!requestId, timestamp: !!timestamp }
    });
  }

  // Validate timestamp format
  const inputTimestamp = new Date(timestamp);
  if (isNaN(inputTimestamp.getTime())) {
    return res.status(400).json({
      error: 'Invalid timestamp format',
      message: 'timestamp must be a valid ISO date string',
      received: timestamp
    });
  }

  // Validate prompt content
  if (!validatePromptExists(prompt)) {
    return res.status(400).json({
      error: 'Invalid prompt',
      message: 'prompt must be at least 10 characters long',
      received: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    });
  }

  // Add validation result to request for use in route
  req.validation = {
    promptExists: true,
    validatedPrompt: prompt,
    validatedRequestId: requestId,
    validatedTimestamp: inputTimestamp
  };

  next();
}

export {
    validatePromptExists,
    validatePromptRequest
};
