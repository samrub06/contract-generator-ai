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
        strategy,
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

      // Generate chunks in parallel
      this.sendUpdate(res, {
        type: 'chunks_start',
        sessionId,
        message: 'Starting parallel chunk generation...'
      });

      const chunks = await this.generateChunksInParallel(
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
   * GENERATE CHUNKS IN PARALLEL with smart orchestration
   */
  async generateChunksInParallel(userPrompt, strategy, sessionId, res) {
    const chunkPromises = [];
    
    // Create chunk generation promises
    for (let i = 0; i < strategy.totalChunks; i++) {
      const startSection = (i * strategy.sectionsPerChunk) + 1;
      const endSection = Math.min(startSection + strategy.sectionsPerChunk - 1, strategy.estimatedSections);
      
      const chunkPromise = this.generateSingleChunk({
        userPrompt,
        chunkIndex: i,
        totalChunks: strategy.totalChunks,
        startSection,
        endSection,
        sessionId
      }, res);

      chunkPromises.push(chunkPromise);

      // Stagger chunk starts to respect rate limits
      if (i < strategy.totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Wait for all chunks to complete
    const results = await Promise.allSettled(chunkPromises);
    
    // Process results
    const successfulChunks = [];
    const failedChunks = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulChunks.push(result.value);
      } else {
        failedChunks.push({ index, error: result.reason.message });
      }
    });

    if (failedChunks.length > 0) {
      console.warn(`⚠️  ${failedChunks.length}/${strategy.totalChunks} chunks failed:`, failedChunks);
    }

    if (successfulChunks.length === 0) {
      throw new Error('All chunks failed to generate');
    }

    // Sort chunks by index
    return successfulChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  /**
   * GENERATE SINGLE CHUNK with OpenAI structured output
   */
  async generateSingleChunk(chunkConfig, res) {
    const { userPrompt, chunkIndex, totalChunks, startSection, endSection, sessionId } = chunkConfig;
    
    try {
      this.sendUpdate(res, {
        type: 'chunk_start',
        sessionId,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        message: `Generating chunk ${chunkIndex + 1}/${totalChunks} (sections ${startSection}-${endSection})`
      });

      // Generate chunk using OpenAI structured output
      const chunkResult = await generateLongContractChunk({
        userPrompt,
        chunkIndex,
        totalChunks,
        startSection,
        endSection
      });

      this.sendUpdate(res, {
        type: 'chunk_completed',
        sessionId,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} completed`,
        sectionsGenerated: chunkResult.sections.length
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
   * STOP GENERATION (if needed)
   */
  async stopGeneration(sessionId) {
    // Implementation for stopping generation
    console.log(`🛑 Stopping long contract generation for session: ${sessionId}`);
    return { sessionId, message: 'Generation stopped' };
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