/**
 * LONG CONTRACT SERVICE
 * Orchestrates intelligent chunking for 10+ page contracts
 * Uses OpenAI structured output with Zod schemas
 */

import { LongContractResponseSchema } from '../schemas/contractSchemas.js';
import { generateLongContractChunk } from './openaiService.js';

class LongContractService {
  constructor() {
    // Smart chunking configuration for 10+ page contracts
    this.chunkConfig = {
      sectionsPerChunk: 3,     // 3 sections per chunk to stay under token limits
      maxTokensPerChunk: 3000, // Safe token limit per chunk
      estimatedSectionsForLongContract: 12, // Typical sections for comprehensive contract
      parallelChunks: 4        // Generate 4 chunks in parallel
    };
    
    // Track stopped sessions
    this.stoppedSessions = new Set();
    // Track active OpenAI requests per session
    this.activeRequests = new Map(); // sessionId -> AbortController
  }

  /**
   * GENERATE LONG CONTRACT with intelligent chunking
   * @param {string} userPrompt - User's contract requirements
   * @param {string} sessionId - Unique session identifier
   * @param {Object} res - Express response for streaming updates
   * @returns {Promise<Object>} - Complete structured contract
   */
  async generateLongContract(userPrompt, sessionId, res) {
    const startTime = Date.now();
    
    try {
      // Send initial status
      this.sendUpdate(res, {
        type: 'started',
        sessionId,
        message: 'Analyzing requirements for long contract generation...'
      });

      // Calculate chunking strategy
      const strategy = this.calculateChunkingStrategy(userPrompt);
      
      this.sendUpdate(res, {
        type: 'strategy',
        sessionId,
        analysis: {
          strategy: strategy.strategy,
          totalChunks: strategy.totalChunks,
          sectionsPerChunk: strategy.sectionsPerChunk
        },
        message: `Generating ${strategy.totalChunks} chunks with ${strategy.sectionsPerChunk} sections each`
      });

      // Generate contract metadata first
      const metadata = this.generateContractMetadata(userPrompt);
      
      this.sendUpdate(res, {
        type: 'metadata',
        sessionId,
        metadata,
        message: 'Contract metadata generated'
      });

      // Generate chunks sequentially (in order)
      this.sendUpdate(res, {
        type: 'chunks_start',
        sessionId,
        message: 'Starting sequential chunk generation...'
      });

      const chunks = await this.generateChunksSequentially(
        userPrompt, 
        strategy, 
        sessionId, 
        res
      );

      // Assemble final contract
      const generationTime = (Date.now() - startTime) / 1000;
      const totalTokensUsed = chunks.reduce((sum, chunk) => sum + (chunk.tokensUsed || 0), 0);

      const completeContract = {
        metadata,
        chunks: chunks.map(chunk => ({
          chunkId: chunk.chunkId,
          chunkIndex: chunk.chunkIndex,
          totalChunks: strategy.totalChunks,
          sections: chunk.sections
        })),
        generationInfo: {
          sessionId,
          strategy: "CHUNKED_LONG",
          totalTokensUsed,
          generationTime
        }
      };

      // Validate and sanitize data before Zod validation
      const sanitizedContract = this.sanitizeContractData(completeContract);
      
      // Validate with Zod schema
      const validatedContract = LongContractResponseSchema.parse(sanitizedContract);

      this.sendUpdate(res, {
        type: 'completed',
        sessionId,
        message: `Long contract generated successfully in ${generationTime.toFixed(2)}s`,
        contract: validatedContract
      });

      return validatedContract;

    } catch (error) {
      console.error('❌ Long contract generation error:', error);
      
      this.sendUpdate(res, {
        type: 'error',
        sessionId,
        error: error.message,
        message: 'Failed to generate long contract'
      });
      
      throw error;
    }
  }

  /**
   * CALCULATE CHUNKING STRATEGY based on prompt complexity
   */
  calculateChunkingStrategy(userPrompt) {
    const prompt = userPrompt.toLowerCase();
    
    // Base configuration for long contracts
    let totalChunks = 4;
    let sectionsPerChunk = 3;
    let estimatedSections = 12;

    // Adjust based on complexity indicators
    if (prompt.includes('enterprise') || prompt.includes('comprehensive')) {
      totalChunks = 5;
      estimatedSections = 15;
    }
    
    if (prompt.includes('international') || prompt.includes('gdpr') || prompt.includes('global')) {
      totalChunks = 6;
      estimatedSections = 18;
    }

    return {
      totalChunks,
      sectionsPerChunk,
      estimatedSections,
      strategy: 'PARALLEL_CHUNKING'
    };
  }

  /**
   * GENERATE CONTRACT METADATA
   */
  generateContractMetadata(userPrompt) {
    const now = new Date();
    
    // Extract company name from prompt or use default
    const companyMatch = userPrompt.match(/for\s+([A-Z][a-zA-Z\s]+)/i);
    const companyName = companyMatch ? companyMatch[1].trim() : "Your Company";

    return {
      title: "Terms of Service Agreement",
      companyName,
      effectiveDate: now.toISOString().split('T')[0],
      lastUpdated: now.toISOString().split('T')[0],
      version: "1.0",
      totalSections: 12,
      estimatedPages: 15
    };
  }

  /**
   * GENERATE CHUNKS SEQUENTIALLY in order (much better for debugging & UX)
   */
  async generateChunksSequentially(userPrompt, strategy, sessionId, res) {
    const successfulChunks = [];
    const failedChunks = [];
    
    // Generate chunks one by one in order
    for (let i = 0; i < strategy.totalChunks; i++) {
      // Check if session was stopped
      if (this.stoppedSessions.has(sessionId)) {
        console.log(`🛑 Session ${sessionId} was stopped, halting generation at chunk ${i + 1}`);
        
        this.sendUpdate(res, {
          type: 'stopped',
          sessionId,
          message: `Generation stopped at chunk ${i + 1}/${strategy.totalChunks}`,
          completedChunks: successfulChunks.length
        });
        
        break; // Exit the loop immediately
      }
      
      const startSection = (i * strategy.sectionsPerChunk) + 1;
      const endSection = Math.min(startSection + strategy.sectionsPerChunk - 1, strategy.estimatedSections);
      
      try {
        console.log(`Starting chunk ${i + 1}/${strategy.totalChunks} (sequential)`);
        
        // Create abort controller for this chunk
        const abortController = new AbortController();
        this.activeRequests.set(sessionId, abortController);
        
        const chunkResult = await this.generateSingleChunk({
          userPrompt,
          chunkIndex: i,
          totalChunks: strategy.totalChunks,
          startSection,
          endSection,
          sessionId,
          abortSignal: abortController.signal
        }, res);
        
        // Clear the abort controller when chunk completes
        this.activeRequests.delete(sessionId);

        successfulChunks.push(chunkResult);
        
        console.log(`Chunk ${i + 1}/${strategy.totalChunks} completed successfully`);
        
        // Small delay between chunks to avoid rate limits (also check for stop)
        if (i < strategy.totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check again after delay
          if (this.stoppedSessions.has(sessionId)) {
            console.log(`🛑 Session ${sessionId} was stopped during delay, halting generation`);
            break;
          }
        }
        
      } catch (error) {
        // Check if error is from abort
        if (error.message.includes('aborted') || error.message.includes('stopped by user')) {
          console.log(`🛑 Chunk ${i + 1} generation aborted by user stop`);
          break; // Exit the loop completely
        }
        
        console.error(`❌ Chunk ${i + 1} failed (attempt 1):`, error.message);
        
        // Retry logic: Try up to 2 more times with fallback content
        let retrySuccess = false;
        const maxRetries = 2;
        
        for (let retry = 1; retry <= maxRetries && !retrySuccess; retry++) {
          try {
            console.log(`Retrying chunk ${i + 1} (attempt ${retry + 1}/${maxRetries + 1})`);
            
            this.sendUpdate(res, {
              type: 'chunk_retry',
              sessionId,
              chunkIndex: i + 1,
              totalChunks: strategy.totalChunks,
              retryAttempt: retry,
              message: `Retrying chunk ${i + 1} (attempt ${retry + 1})...`
            });
            
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const retryResult = await this.generateSingleChunk({
              userPrompt,
              chunkIndex: i,
              totalChunks: strategy.totalChunks,
              startSection,
              endSection,
              sessionId,
              abortSignal: abortController.signal
            }, res);

            successfulChunks.push(retryResult);
            retrySuccess = true;
            
            console.log(`Chunk ${i + 1} succeeded on retry ${retry}`);
            
          } catch (retryError) {
            console.error(`❌ Chunk ${i + 1} retry ${retry} failed:`, retryError.message);
          }
        }
        
        if (!retrySuccess) {
          // Fallback: Create a placeholder chunk with basic content
          console.log(`🛠️ Creating fallback content for chunk ${i + 1}`);
          
          const fallbackChunk = this.createFallbackChunk(i, strategy.totalChunks, startSection, endSection, userPrompt);
          successfulChunks.push(fallbackChunk);
          
          failedChunks.push({ index: i, error: error.message, hadFallback: true });
          
          this.sendUpdate(res, {
            type: 'chunk_fallback',
            sessionId,
            chunkIndex: i + 1,
            totalChunks: strategy.totalChunks,
            error: error.message,
            message: `Chunk ${i + 1} failed, using fallback content`,
            // Send fallback chunk data for display
            chunkData: {
              chunkId: fallbackChunk.chunkId,
              chunkIndex: fallbackChunk.chunkIndex,
              totalChunks,
              sections: fallbackChunk.sections
            }
          });
        }
      }
    }

    if (failedChunks.length > 0) {
      console.warn(`⚠️  ${failedChunks.length}/${strategy.totalChunks} chunks failed:`, failedChunks);
    }

    if (successfulChunks.length === 0) {
      throw new Error('All chunks failed to generate');
    }

    console.log(`🎉 Sequential generation completed: ${successfulChunks.length}/${strategy.totalChunks} chunks successful`);
    return successfulChunks; // Already in order!
  }

  /**
   * GENERATE SINGLE CHUNK with OpenAI structured output
   */
  async generateSingleChunk(chunkConfig, res) {
    const { userPrompt, chunkIndex, totalChunks, startSection, endSection, sessionId, abortSignal } = chunkConfig;
    
    try {
      this.sendUpdate(res, {
        type: 'chunk_start',
        sessionId,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        message: `Generating chunk ${chunkIndex + 1}/${totalChunks} (sections ${startSection}-${endSection})`
      });

      // Check for abort before OpenAI call
      if (abortSignal && abortSignal.aborted) {
        throw new Error('Generation was stopped by user');
      }
      
      // Generate chunk using OpenAI structured output
      const chunkResult = await generateLongContractChunk({
        userPrompt,
        chunkIndex,
        totalChunks,
        startSection,
        endSection,
        abortSignal
      });

              this.sendUpdate(res, {
          type: 'chunk_completed',
          sessionId,
          chunkIndex: chunkIndex + 1,
          totalChunks,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} completed`,
          sectionsGenerated: chunkResult.sections.length,
          // Send chunk data for real-time display
          chunkData: {
            chunkId: `chunk_${chunkIndex + 1}`,
            chunkIndex,
            totalChunks,
            sections: chunkResult.sections
          }
        });

      return {
        chunkId: `chunk_${chunkIndex + 1}`,
        chunkIndex,
        sections: chunkResult.sections,
        tokensUsed: chunkResult.tokensUsed || 0
      };

    } catch (error) {
      console.error(`❌ Chunk ${chunkIndex + 1} generation failed:`, error);
      
      this.sendUpdate(res, {
        type: 'chunk_error',
        sessionId,
        chunkIndex: chunkIndex + 1,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * SEND UPDATE to frontend via SSE
   */
  sendUpdate(res, data) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Failed to send update:', error);
    }
  }

  /**
   * STOP GENERATION (immediate stop)
   */
  async stopGeneration(sessionId) {
    // Mark session as stopped
    this.stoppedSessions.add(sessionId);
    
    // Abort active OpenAI request
    const abortController = this.activeRequests.get(sessionId);
    if (abortController) {
      console.log(`🛑 Aborting active OpenAI request for session: ${sessionId}`);
      abortController.abort();
      this.activeRequests.delete(sessionId);
    }
    
    console.log(`🛑 Stopping long contract generation for session: ${sessionId}`);
    
    // Clean up after a delay to prevent memory leaks
    setTimeout(() => {
      this.stoppedSessions.delete(sessionId);
      console.log(`🧹 Cleaned up stopped session: ${sessionId}`);
    }, 60000); // Clean up after 1 minute
    
    return { sessionId, message: 'Generation stopped immediately' };
  }

  /**
   * CREATE FALLBACK CHUNK when OpenAI fails
   * @param {number} chunkIndex - Index of the failed chunk
   * @param {number} totalChunks - Total number of chunks
   * @param {number} startSection - Start section number
   * @param {number} endSection - End section number
   * @param {string} userPrompt - Original user prompt
   * @returns {Object} - Fallback chunk with basic content
   */
  createFallbackChunk(chunkIndex, totalChunks, startSection, endSection, userPrompt) {
    const sectionCount = endSection - startSection + 1;
    const sections = [];
    
    for (let i = 0; i < sectionCount; i++) {
      const sectionNumber = startSection + i;
      const sectionTitle = this.getFallbackSectionTitle(sectionNumber);
      
      sections.push({
        id: sectionNumber.toString(),
        title: sectionTitle,
        subsections: [{
          id: `${sectionNumber}.1`,
          title: "General Provisions",
          content: `This section covers ${sectionTitle.toLowerCase()} for the services described as: ${userPrompt}. Detailed legal provisions will be added in a future version of this document.`,
          items: [
            "This is a placeholder section generated due to temporary service issues",
            "Legal review is recommended before using this document",
            "Contact support for complete section generation"
          ]
        }]
      });
    }
    
    return {
      chunkId: `chunk_${chunkIndex + 1}_fallback`,
      chunkIndex,
      sections,
      tokensUsed: 0
    };
  }

  /**
   * GET FALLBACK SECTION TITLE based on section number
   */
  getFallbackSectionTitle(sectionNumber) {
    const titles = {
      1: "Service Definition and Scope",
      2: "User Account and Registration",
      3: "Acceptable Use Policy",
      4: "Intellectual Property Rights",
      5: "Privacy and Data Protection",
      6: "Payment and Billing Terms",
      7: "Service Availability",
      8: "Limitation of Liability",
      9: "Indemnification",
      10: "Termination and Suspension",
      11: "Governing Law",
      12: "General Provisions",
      13: "Service Level Agreement",
      14: "International Compliance",
      15: "API Terms and Conditions",
      16: "Enterprise Features",
      17: "Security Standards",
      18: "Amendment Procedures"
    };
    
    return titles[sectionNumber] || `Legal Provisions Section ${sectionNumber}`;
  }

  /**
   * SANITIZE CONTRACT DATA to ensure Zod validation passes
   * @param {Object} contract - Contract data to sanitize
   * @returns {Object} - Sanitized contract data
   */
  sanitizeContractData(contract) {
    return {
      ...contract,
      chunks: contract.chunks.map(chunk => ({
        ...chunk,
        sections: chunk.sections.map(section => ({
          ...section,
          subsections: Array.isArray(section.subsections) ? section.subsections.map(sub => ({
            ...sub,
            items: Array.isArray(sub.items) ? sub.items : (sub.items ? [sub.items] : [])
          })) : []
        }))
      }))
    };
  }
}

// Create singleton instance
const longContractService = new LongContractService();

export default longContractService;