/**
 * TypeScript types for Long Contract system
 * Matches the Zod schemas from backend
 */

// Contract subsection structure
export interface ContractSubsection {
  id: string;
  title: string;
  content: string;
  items?: string[];
}

// Contract section structure
export interface ContractSection {
  id: string;
  title: string;
  subsections: ContractSubsection[];
}

// Contract chunk structure
export interface ContractChunk {
  chunkId: string;
  chunkIndex: number;
  totalChunks: number;
  sections: ContractSection[];
}

// Contract metadata
export interface ContractMetadata {
  title: string;
  companyName: string;
  effectiveDate: string;
  lastUpdated: string;
  version: string;
  totalSections: number;
  estimatedPages: number;
}

// Complete long contract response
export interface LongContractResponse {
  metadata: ContractMetadata;
  chunks: ContractChunk[];
  generationInfo: {
    sessionId: string;
    strategy: "CHUNKED_LONG";
    totalTokensUsed: number;
    generationTime: number;
  };
}

// SSE Event types for long contract generation
export interface LongContractSSEEvent {
  type: 'connected' | 'started' | 'strategy' | 'metadata' | 'chunks_start' | 
        'chunk_start' | 'chunk_completed' | 'chunk_error' | 'chunk_retry' | 
        'chunk_fallback' | 'stopped' | 'completed' | 'final_result' | 'error';
  sessionId: string;
  message: string;
  
  // Type-specific properties
  analysis?: {
    strategy: string;
    totalChunks: number;
    sectionsPerChunk: number;
  };
  metadata?: ContractMetadata;
  chunkIndex?: number;
  totalChunks?: number;
  sectionsGenerated?: number;
  retryAttempt?: number; // For retry events
  completedChunks?: number; // For stopped events
  chunkData?: ContractChunk; // Real-time chunk data
  contract?: LongContractResponse;
  error?: string;
}

// Generation status
export interface GenerationStatus {
  isGenerating: boolean;
  currentPhase: 'idle' | 'analyzing' | 'chunking' | 'generating' | 'completed' | 'error';
  completedChunks: number;
  totalChunks: number;
  currentChunk?: number;
  errorMessage?: string;
}

// Component state interface
export interface LongContractState {
  prompt: string;
  sessionId: string;
  status: GenerationStatus;
  contract: LongContractResponse | null;
  eventStream: EventSource | null;
  logs: LongContractSSEEvent[];
}