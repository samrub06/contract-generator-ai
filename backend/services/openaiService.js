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
You are a senior legal counsel specializing in technology law and SaaS agreements. Generate a comprehensive, legally sound Terms of Service document that matches the professional quality and style of major technology companies like Zoom, Microsoft, and Google.

CRITICAL REQUIREMENTS:
- Output in STRICT JSON format as specified below
- Use professional legal language and terminology
- Include comprehensive legal protections and disclaimers
- Follow modern SaaS agreement best practices
- Make it legally enforceable and comprehensive
- Use clear, precise legal language that protects the company

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
          "c": "Legal content...", // Legal content (detailed, professional)
          "l": ["(i) item", "(ii) item"] // Numbered list items or null
        }
      ]
    }
  ]
}

SECTIONS TO GENERATE (with professional legal content):

1. DEFINITIONS AND AGREEMENT SCOPE
   - Comprehensive definitions of key terms
   - Agreement formation and acceptance
   - Legal entity representation and authority
   - Governing law and jurisdiction references

2. SERVICES AND SOFTWARE ACCESS
   - Service description and availability
   - Software licensing and access rights
   - Service modifications and updates
   - Geographic restrictions and compliance

3. USER ACCOUNTS AND REGISTRATION
   - Account creation and verification
   - User responsibilities and representations
   - Prohibition on account sharing
   - Security and password requirements

4. INTELLECTUAL PROPERTY RIGHTS
   - Company IP ownership and protection
   - User content and data rights
   - License grants and restrictions
   - Trademark and copyright notices

5. PRIVACY AND DATA PROTECTION
   - Data collection and processing
   - User privacy rights and consent
   - Data security measures
   - Compliance with privacy laws

6. ACCEPTABLE USE AND PROHIBITIONS
   - Permitted use of services
   - Prohibited activities and content
   - Compliance with laws and regulations
   - Consequences of violations

7. PAYMENT TERMS AND SUBSCRIPTIONS
   - Pricing and payment methods
   - Subscription terms and renewals
   - Billing and invoicing
   - Refund and cancellation policies

8. LIMITATION OF LIABILITY
   - Liability exclusions and limitations
   - Damages caps and restrictions
   - Essential purpose limitations
   - Force majeure provisions

9. INDEMNIFICATION AND DEFENSE
   - User indemnification obligations
   - Company defense rights
   - Settlement authority
   - Cooperation requirements

10. TERMINATION AND SUSPENSION
    - Termination rights and procedures
    - Account suspension conditions
    - Data retention and deletion
    - Survival of key provisions

11. DISPUTE RESOLUTION
    - Arbitration requirements
    - Class action waivers
    - Governing law and venue
    - Informal dispute resolution

12. MISCELLANEOUS PROVISIONS
    - Entire agreement clauses
    - Severability and waiver
    - Assignment restrictions
    - Notices and communications

LEGAL LANGUAGE REQUIREMENTS:
- Use formal legal terminology and structure
- Include comprehensive disclaimers and limitations
- Add professional legal boilerplate language
- Ensure enforceability and legal validity
- Match the tone and style of major SaaS agreements
- Include specific legal protections for the company
- Add arbitration and class action waiver clauses
- Include comprehensive liability limitations

CONTENT STYLE:
- Professional and authoritative legal tone
- Clear, precise language that protects the company
- Comprehensive coverage of legal issues
- Modern SaaS agreement best practices
- Industry-standard legal protections

IMPORTANT: 
- Output ONLY valid JSON
- No markdown, no explanations
- Follow the exact structure above
- Use professional legal terminology throughout
- Include numbered lists where appropriate
- Make it comprehensive and legally sound
- Ensure it matches the quality of Zoom's Terms of Service`;

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
          content: "You are a senior legal counsel with 20+ years of experience in technology law, SaaS agreements, and intellectual property. You specialize in drafting Terms of Service for major technology companies. Your expertise includes contract law, data protection regulations, intellectual property rights, and SaaS business models. You MUST output ONLY valid JSON in the exact structure specified. Use professional legal terminology, comprehensive disclaimers, and industry-standard legal protections. Your output should match the quality and style of Zoom, Microsoft, and Google's Terms of Service. If interrupted, continue seamlessly from where you left off, maintaining the same professional legal tone and JSON structure."
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000, // Increased for full document
      stream: true // Real streaming - character by character
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

/**
 * GENERATE LONG CONTRACT CHUNK with structured output
 * Uses OpenAI structured output for reliable JSON parsing
 * @param {Object} chunkConfig - Chunk configuration
 * @returns {Promise<Object>} - Structured chunk data
 */
async function generateLongContractChunk(chunkConfig) {
  try {
    const client = getOpenAIClient();
    const { userPrompt, chunkIndex, totalChunks, startSection, endSection, abortSignal } = chunkConfig;

    console.log(`🔧 Generating chunk ${chunkIndex + 1}/${totalChunks} (sections ${startSection}-${endSection})`);

    // Create structured prompt for chunk generation
    const chunkPrompt = `Generate a comprehensive Terms of Service chunk for: ${userPrompt}

CHUNK REQUIREMENTS:
- Generate sections ${startSection} through ${endSection}
- This is chunk ${chunkIndex + 1} of ${totalChunks} total chunks
- Each section must be legally comprehensive and professional
- Use clear, enforceable legal language
- Target 10+ pages total when all chunks combined

SECTION THEMES (use as guidance):
Section ${startSection}: ${getSectionTheme(startSection)}
${endSection > startSection ? `Section ${startSection + 1}: ${getSectionTheme(startSection + 1)}` : ''}
${endSection > startSection + 1 ? `Section ${startSection + 2}: ${getSectionTheme(startSection + 2)}` : ''}

IMPORTANT:
- Each section MUST have at least 1 subsection (never empty subsections array)
- Each section should have 2-4 comprehensive subsections
- Include detailed legal content with specific clauses
- Use professional legal terminology
- Ensure content is substantial for a 10+ page contract
- ALL required fields must be present: id, title, subsections for sections
- ALL required fields must be present: id, title, content for subsections`;

    // Define structured response schema
    const responseSchema = {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Section number (e.g., '1', '2')"
              },
              title: {
                type: "string",
                description: "Section title"
              },
              subsections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "Subsection ID (e.g., '1.1', '2.3')"
                    },
                    title: {
                      type: "string", 
                      description: "Subsection title"
                    },
                    content: {
                      type: "string",
                      description: "Detailed legal content"
                    },
                    items: {
                      type: "array",
                      items: {
                        type: "string"
                      },
                      description: "Optional list items"
                    }
                  },
                  required: ["id", "title", "content"]
                }
              }
            },
            required: ["id", "title", "subsections"]
          }
        }
      },
      required: ["sections"]
    };

    // Check for abort before API call
    if (abortSignal && abortSignal.aborted) {
      throw new Error('Request was aborted by user');
    }

    // Generate with structured output
    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-08-06", // Model that supports structured output
      messages: [
        {
          role: "system",
          content: "You are a senior legal counsel specializing in SaaS and technology agreements. Generate comprehensive, legally sound Terms of Service content."
        },
        {
          role: "user",
          content: chunkPrompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "contract_chunk",
          schema: responseSchema
        }
      },
      max_tokens: 4000,
      temperature: 0.3
    }, {
      signal: abortSignal // Pass abort signal to OpenAI request
    });

    const response = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(response);

    // Validate and fix the sections structure
    const validatedSections = parsedResponse.sections.map(section => ({
      ...section,
      id: section.id || `section_${Date.now()}`,
      title: section.title || 'Untitled Section',
      subsections: Array.isArray(section.subsections) 
        ? section.subsections.map(sub => ({
            ...sub,
            id: sub.id || `subsection_${Date.now()}`,
            title: sub.title || 'Untitled Subsection',
            content: sub.content || 'Content not generated',
            items: Array.isArray(sub.items) ? sub.items : []
          }))
        : [{ // Create a default subsection if missing
            id: `${section.id || 'section'}.1`,
            title: 'General Provisions',
            content: 'This section contains the general provisions and requirements.',
            items: []
          }]
    }));

    console.log(`Chunk ${chunkIndex + 1} generated: ${validatedSections.length} sections`);

    return {
      sections: validatedSections,
      tokensUsed: completion.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error(`❌ Error generating chunk ${chunkConfig.chunkIndex + 1}:`, error);
    throw new Error(`Failed to generate chunk ${chunkConfig.chunkIndex + 1}: ${error.message}`);
  }
}

/**
 * GET SECTION THEME based on section number
 */
function getSectionTheme(sectionNumber) {
  const themes = {
    1: "Definitions and Scope of Services",
    2: "User Account and Registration",
    3: "Acceptable Use and Prohibited Activities", 
    4: "Intellectual Property Rights",
    5: "Privacy and Data Protection",
    6: "Payment Terms and Billing",
    7: "Service Availability and Support",
    8: "Limitation of Liability",
    9: "Indemnification and Legal Protection",
    10: "Termination and Account Suspension",
    11: "Governing Law and Dispute Resolution",
    12: "General Provisions and Miscellaneous",
    13: "Service Level Agreements",
    14: "International Compliance",
    15: "API Terms and Developer Provisions",
    16: "Enterprise and Business Terms",
    17: "Security and Compliance Standards",
    18: "Amendment and Modification Procedures"
  };
  
  return themes[sectionNumber] || `Legal Provisions Section ${sectionNumber}`;
}

export {
  generateLongContractChunk, generateRealTimeStreaming
};

