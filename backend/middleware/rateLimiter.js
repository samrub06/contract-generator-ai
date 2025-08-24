import rateLimit from 'express-rate-limit';

// Rate limiting for contract generation (critical endpoint)
export const contractGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many contract generation requests',
    message: 'Please wait before generating another contract',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many contract generation requests. Please try again later.',
      retryAfter: Math.ceil(15 * 60), // seconds
      limit: 10,
      windowMs: 15 * 60 * 1000
    });
  }
});

// General API rate limiting
export const generalAPILimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many API requests',
    message: 'Please slow down your requests',
    retryAfter: '15 minutes'
  }
});

// Strict rate limiting for development/testing
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  message: {
    error: 'Development rate limit exceeded',
    message: 'Too many requests in development mode',
    retryAfter: '1 minute'
  }
}); 