/**
 * ZOD SCHEMAS for structured contract output
 * Used with OpenAI structured output for intelligent chunking
 */

import { z } from 'zod';

// Schema for individual contract subsection
const ContractSubsectionSchema = z.object({
  id: z.string().describe("Unique identifier (e.g., '1.1', '2.3')"),
  title: z.string().describe("Subsection title"),
  content: z.string().describe("Legal content of the subsection"),
  items: z.array(z.string()).optional().describe("Optional list items")
});

// Schema for contract section
const ContractSectionSchema = z.object({
  id: z.string().describe("Section number (e.g., '1', '2')"),
  title: z.string().describe("Section title"),
  subsections: z.array(ContractSubsectionSchema).describe("Array of subsections")
});

// Schema for complete contract chunk
const ContractChunkSchema = z.object({
  chunkId: z.string().describe("Chunk identifier"),
  chunkIndex: z.number().describe("Chunk position (0-based)"),
  totalChunks: z.number().describe("Total number of chunks"),
  sections: z.array(ContractSectionSchema).describe("Array of contract sections in this chunk")
});

// Schema for contract metadata
const ContractMetadataSchema = z.object({
  title: z.string().describe("Contract title"),
  companyName: z.string().describe("Company name"),
  effectiveDate: z.string().describe("Effective date"),
  lastUpdated: z.string().describe("Last updated date"),
  version: z.string().describe("Contract version"),
  totalSections: z.number().describe("Total number of sections"),
  estimatedPages: z.number().describe("Estimated page count")
});

// Schema for complete long contract response
const LongContractResponseSchema = z.object({
  metadata: ContractMetadataSchema.describe("Contract metadata"),
  chunks: z.array(ContractChunkSchema).describe("Array of contract chunks"),
  generationInfo: z.object({
    sessionId: z.string().describe("Generation session ID"),
    strategy: z.enum(["CHUNKED_LONG"]).describe("Generation strategy used"),
    totalTokensUsed: z.number().describe("Total tokens consumed"),
    generationTime: z.number().describe("Generation time in seconds")
  }).describe("Generation information")
});

export {
  ContractChunkSchema,
  ContractMetadataSchema, ContractSectionSchema, ContractSubsectionSchema, LongContractResponseSchema
};

