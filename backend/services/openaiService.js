import { OpenAI } from "openai";

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('Loading OpenAI client with API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing or empty');
    }
    
    openai = new OpenAI({
      apiKey: apiKey
    });
  }
  return openai;
}

/**
 * Generate Terms of Service with REAL-TIME streaming (character by character)
 * WITH TIMEOUT HANDLING AND RESUME CAPABILITY
 * OUTPUTS STRUCTURED JSON FORMAT
 * @param {string} userPrompt - User's prompt
 * @param {string} sessionId - Session identifier
 * @param {Object} res - Express response object for streaming
 * @param {string} resumeFrom - Content to resume from (for timeout recovery)
 * @returns {Promise<void>} - Streams content directly to response
 */
async function generateRealTimeStreaming(userPrompt, sessionId, res, resumeFrom = '') {
  try {
    const client = getOpenAIClient();
    
    // Create a comprehensive prompt for structured JSON output
    let fullPrompt = `Generate complete Terms of Service for: ${userPrompt}

INSTRUCTIONS:
- Generate a complete Terms of Service document with 10 sections
- Output in STRICT JSON format as specified below
- Each section must follow the exact structure
- Use clear, professional legal language
- Include practical examples and legal protections
- Make it comprehensive and legally sound

REQUIRED JSON STRUCTURE:
{
  "sections": [
    {
      "n": 1,                    // Section number
      "t": "Definitions",        // Compact title (2-3 words max)
      "ss": [                    // Subsections array
        {
          "n": "1.1",            // Subsection number
          "t": "Scope",          // Subsection title
          "c": "Legal content...", // Legal content (detailed)
          "l": ["(i) item", "(ii) item"] // Numbered list items or null
        }
      ]
    }
  ]
}

SECTIONS TO GENERATE:
1. Definitions and Scope
2. Services and Usage
3. User Obligations and Account Information
4. Intellectual Property Rights
5. Privacy and Data Protection
6. Limitation of Liability
7. Indemnification
8. Termination and Suspension
9. Governing Law and Disputes
10. Miscellaneous Provisions

IMPORTANT: 
- Output ONLY valid JSON
- No markdown, no explanations
- Follow the exact structure above
- Use proper legal terminology
- Include numbered lists where appropriate`;

    // If resuming from a timeout, add context
    if (resumeFrom) {
      fullPrompt += `\n\nIMPORTANT: Continue exactly from where you left off. Here's what was already generated:\n\n${resumeFrom}\n\nContinue generating from this point, maintaining the same JSON structure and format.`;
      console.log(`Resuming generation for session ${sessionId} from: ${resumeFrom.substring(0, 100)}...`);
    }

    console.log(`Starting real-time streaming for session ${sessionId}${resumeFrom ? ' (resumed)' : ''}`);

    // Create streaming response with timeout handling
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a legal expert specializing in Terms of Service generation. You MUST output ONLY valid JSON in the exact structure specified. No markdown, no explanations, just pure JSON. If interrupted, continue seamlessly from where you left off, maintaining the JSON structure."
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000, // Increased for full document
      stream: true // VRAI STREAMING - caractère par caractère
    });

    let fullContent = resumeFrom;
    let currentSection = '';
    let sectionCount = 0;
    let lastSuccessfulContent = '';
    let timeoutCounter = 0;
    const MAX_TIMEOUTS = 3; // Maximum number of timeouts before giving up

    // Stream the response character by character
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullContent += content;
        currentSection += content;
        lastSuccessfulContent = fullContent;
        
        // Send each character to the frontend in real-time
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: content,
          sessionId: sessionId,
          fullContent: fullContent,
          sectionCount: sectionCount,
          isResumed: !!resumeFrom
        })}\n\n`);

        // Try to detect if we have a complete JSON structure
        try {
          // Check if we have a complete JSON object
          if (fullContent.trim().startsWith('{') && fullContent.trim().endsWith('}')) {
            const parsed = JSON.parse(fullContent);
            if (parsed.sections && Array.isArray(parsed.sections)) {
              sectionCount = parsed.sections.length;
              
              // Send section complete notification for each section
              parsed.sections.forEach((section, index) => {
                if (section.ss && Array.isArray(section.ss)) {
                  res.write(`data: ${JSON.stringify({
                    type: 'section_complete',
                    sessionId: sessionId,
                    sectionNumber: section.n,
                    sectionTitle: section.t,
                    sectionContent: section,
                    totalSections: parsed.sections.length
                  })}\n\n`);
                }
              });
            }
          }
        } catch (parseError) {
          // JSON not complete yet, continue streaming
          // This is normal during streaming
        }
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      sessionId: sessionId,
      totalSections: sectionCount,
      fullContent: fullContent,
      wasResumed: !!resumeFrom
    })}\n\n`);

    console.log(`Real-time streaming completed for session ${sessionId} with ${sectionCount} sections${resumeFrom ? ' (resumed successfully)' : ''}`);

  } catch (error) {
    console.error('Error in real-time streaming:', error);
    
    // Check if it's a timeout error
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT') || error.code === 'ECONNRESET') {
      console.log(`Timeout detected for session ${sessionId}, will attempt to resume`);
      
      // Send timeout notification to frontend
      res.write(`data: ${JSON.stringify({
        type: 'timeout',
        sessionId: sessionId,
        error: 'Connection timeout detected',
        message: 'Will attempt to resume generation automatically',
        resumeData: {
          fullContent: lastSuccessfulContent || '',
          sectionCount: sectionCount,
          canResume: true
        }
      })}\n\n`);
      
      // Don't end the response, let the frontend handle resumption
      return;
    }
    
    // For other errors, send error to frontend
    res.write(`data: ${JSON.stringify({
      type: 'error',
      sessionId: sessionId,
      error: error.message,
      canResume: false
    })}\n\n`);
  }
}

export {
  generateRealTimeStreaming
};

