/**
 * Long Contract Generator Component
 * Handles 10+ page contract generation with intelligent chunking
 */

import React, { useCallback, useEffect, useState } from 'react';
import { longContractService } from '../api/longContractService';
import type {
  ContractChunk,
  ContractSection,
  GenerationStatus,
  LongContractResponse,
  LongContractSSEEvent
} from '../types/longContract';

export const LongContractGenerator: React.FC = () => {
  // State management
  const [prompt, setPrompt] = useState('comprehensive enterprise SaaS platform terms with API access, international compliance, GDPR support, and advanced security features');
  const [contract, setContract] = useState<LongContractResponse | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: false,
    currentPhase: 'idle',
    completedChunks: 0,
    totalChunks: 0,
  });
  const [sessionId, setSessionId] = useState('');
  const [logs, setLogs] = useState<LongContractSSEEvent[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Add log entry
  const addLog = useCallback((event: LongContractSSEEvent) => {
    setLogs(prev => [...prev, { ...event, timestamp: Date.now() } as LongContractSSEEvent & { timestamp: number }]);
  }, []);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: LongContractSSEEvent) => {
    console.log('📡 SSE Event:', event.type, event.message);
    addLog(event);

    switch (event.type) {
      case 'connected':
        setSessionId(event.sessionId);
        setStatus(prev => ({ ...prev, currentPhase: 'analyzing' }));
        break;

      case 'started':
        setStatus(prev => ({ ...prev, currentPhase: 'analyzing' }));
        break;

      case 'strategy':
        if (event.analysis) {
          setStatus(prev => ({ 
            ...prev, 
            currentPhase: 'chunking',
            totalChunks: event.analysis!.totalChunks 
          }));
        }
        break;

      case 'metadata':
        setStatus(prev => ({ ...prev, currentPhase: 'generating' }));
        break;

      case 'chunks_start':
        setStatus(prev => ({ ...prev, currentPhase: 'generating' }));
        break;

      case 'chunk_start':
        if (event.chunkIndex) {
          setStatus(prev => ({ ...prev, currentChunk: event.chunkIndex }));
        }
        break;

      case 'chunk_completed':
        setStatus(prev => ({ 
          ...prev, 
          completedChunks: prev.completedChunks + 1 
        }));
        break;

      case 'chunk_error':
        console.error('❌ Chunk error:', event.error);
        break;

      case 'completed':
        setStatus(prev => ({ ...prev, currentPhase: 'completed' }));
        break;

      case 'final_result':
        setStatus(prev => ({ 
          ...prev, 
          currentPhase: 'completed',
          isGenerating: false 
        }));
        break;

      case 'error':
        setStatus(prev => ({ 
          ...prev, 
          currentPhase: 'error',
          isGenerating: false,
          errorMessage: event.error 
        }));
        break;
    }
  }, [addLog]);

  // Start generation
  const startGeneration = useCallback(async () => {
    if (!prompt.trim()) return;

    try {
      setStatus({
        isGenerating: true,
        currentPhase: 'analyzing',
        completedChunks: 0,
        totalChunks: 0,
      });
      setContract(null);
      setLogs([]);
      setSessionId('');

      const es = await longContractService.startLongContractGeneration(
        prompt,
        handleSSEEvent,
        (error) => {
          console.error('❌ Generation error:', error);
          setStatus(prev => ({ 
            ...prev, 
            currentPhase: 'error',
            isGenerating: false,
            errorMessage: error.message 
          }));
        },
        (contractResult) => {
          console.log('✅ Contract generation completed:', contractResult);
          setContract(contractResult);
          setStatus(prev => ({ 
            ...prev, 
            currentPhase: 'completed',
            isGenerating: false 
          }));
        }
      );

      setEventSource(es);
    } catch (error) {
      console.error('❌ Failed to start generation:', error);
      setStatus(prev => ({ 
        ...prev, 
        currentPhase: 'error',
        isGenerating: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to start generation'
      }));
    }
  }, [prompt, handleSSEEvent]);

  // Stop generation
  const stopGeneration = useCallback(async () => {
    if (sessionId) {
      try {
        await longContractService.stopGeneration(sessionId);
        setStatus(prev => ({ 
          ...prev, 
          isGenerating: false,
          currentPhase: 'idle' 
        }));
      } catch (error) {
        console.error('❌ Failed to stop generation:', error);
      }
    }
  }, [sessionId]);

  // Download HTML
  const downloadHTML = useCallback(() => {
    if (!contract) return;

    const html = generateHTMLFromContract(contract);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `long_contract_${contract.generationInfo.sessionId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [contract]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        longContractService.disconnect();
      }
    };
  }, [eventSource]);

  // Calculate progress
  const progress = status.totalChunks > 0 ? (status.completedChunks / status.totalChunks) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          🚀 Long Contract Generator
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Generate comprehensive 10+ page contracts with intelligent chunking
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <textarea
          className="w-full min-h-32 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your comprehensive contract requirements..."
          disabled={status.isGenerating}
        />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
              onClick={startGeneration}
              disabled={status.isGenerating || !prompt.trim()}
            >
              {status.isGenerating ? '🔄 Generating...' : '🚀 Generate Long Contract'}
            </button>
            
            {status.isGenerating && (
              <button
                className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-lg"
                onClick={stopGeneration}
              >
                ⚠️ Stop Generation
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={downloadHTML}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!contract}
            >
              📥 Download HTML
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {status.isGenerating && status.totalChunks > 0 && (
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Status Display */}
        <StatusDisplay status={status} sessionId={sessionId} />
      </div>

      {/* Generation Logs */}
      {logs.length > 0 && (
        <GenerationLogs logs={logs} />
      )}

      {/* Contract Display */}
      {contract && (
        <ContractDisplay contract={contract} />
      )}
    </div>
  );
};

// Status Display Component
const StatusDisplay: React.FC<{ status: GenerationStatus; sessionId: string }> = ({ status, sessionId }) => {
  const getStatusColor = () => {
    switch (status.currentPhase) {
      case 'error': return 'red';
      case 'completed': return 'green';
      case 'idle': return 'gray';
      default: return 'blue';
    }
  };

  const getStatusMessage = () => {
    switch (status.currentPhase) {
      case 'analyzing': return '🧠 Analyzing contract requirements...';
      case 'chunking': return '🧩 Planning intelligent chunks...';
      case 'generating': return `⚡ Generating chunks (${status.completedChunks}/${status.totalChunks})`;
      case 'completed': return '✅ Contract generation completed!';
      case 'error': return `❌ Error: ${status.errorMessage}`;
      default: return '⏳ Ready to generate';
    }
  };

  const color = getStatusColor();

  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        {status.isGenerating && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        )}
        <div>
          <h3 className={`text-lg font-medium text-${color}-800`}>
            {getStatusMessage()}
          </h3>
          {sessionId && (
            <p className={`text-${color}-600 text-sm`}>
              Session: {sessionId}
            </p>
          )}
          {status.currentChunk && (
            <p className={`text-${color}-600 text-sm`}>
              Currently generating chunk {status.currentChunk}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Generation Logs Component
const GenerationLogs: React.FC<{ logs: LongContractSSEEvent[] }> = ({ logs }) => (
  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
    <h3 className="text-white mb-2">🔍 Generation Logs</h3>
    {logs.map((log, index) => (
      <div key={index} className="mb-1">
        <span className="text-gray-400">[{log.type}]</span> {log.message}
      </div>
    ))}
  </div>
);

// Contract Display Component
const ContractDisplay: React.FC<{ contract: LongContractResponse }> = ({ contract }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">📄 Generated Contract</h2>
      <div className="text-sm text-gray-500">
        {contract.chunks.length} chunks • {contract.metadata.totalSections} sections • ~{contract.metadata.estimatedPages} pages
      </div>
    </div>

    {/* Metadata */}
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold mb-2">📋 Contract Metadata</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Title:</strong> {contract.metadata.title}</div>
        <div><strong>Company:</strong> {contract.metadata.companyName}</div>
        <div><strong>Version:</strong> {contract.metadata.version}</div>
        <div><strong>Effective Date:</strong> {contract.metadata.effectiveDate}</div>
      </div>
    </div>

    {/* Chunks */}
    {contract.chunks.map((chunk, chunkIndex) => (
      <ChunkDisplay key={chunk.chunkId} chunk={chunk} chunkIndex={chunkIndex} />
    ))}

    {/* Generation Info */}
    <div className="bg-blue-50 p-4 rounded-lg mt-6">
      <h3 className="font-semibold mb-2">⚡ Generation Statistics</h3>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><strong>Strategy:</strong> {contract.generationInfo.strategy}</div>
        <div><strong>Time:</strong> {contract.generationInfo.generationTime.toFixed(2)}s</div>
        <div><strong>Tokens:</strong> {contract.generationInfo.totalTokensUsed.toLocaleString()}</div>
      </div>
    </div>
  </div>
);

// Chunk Display Component  
const ChunkDisplay: React.FC<{ chunk: ContractChunk; chunkIndex: number }> = ({ chunk }) => (
  <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
    <h3 className="font-medium text-gray-700 mb-3 text-lg">
      🧩 Chunk {chunk.chunkIndex + 1}/{chunk.totalChunks} ({chunk.sections.length} sections)
    </h3>
    
    {chunk.sections.map((section) => (
      <SectionDisplay key={section.id} section={section} />
    ))}
  </div>
);

// Section Display Component
const SectionDisplay: React.FC<{ section: ContractSection }> = ({ section }) => (
  <div className="ml-4 mb-4 p-3 bg-white rounded border">
    <h4 className="font-medium text-gray-800 mb-2">
      📄 Section {section.id}: {section.title}
    </h4>
    
    {section.subsections.map((subsection) => (
      <div key={subsection.id} className="ml-4 mb-3 p-2 bg-gray-50 rounded">
        <h5 className="font-medium text-gray-700 mb-1 text-sm">
          {subsection.id} {subsection.title}
        </h5>
        
        <div className="text-sm text-gray-600 mb-2">
          {subsection.content.split('\n').map((paragraph, pIndex) => (
            <p key={pIndex} className="mb-1">{paragraph}</p>
          ))}
        </div>
        
        {subsection.items && subsection.items.length > 0 && (
          <ul className="ml-4 text-sm text-gray-600">
            {subsection.items.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">• {item}</li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </div>
);

// HTML Generation utility
const generateHTMLFromContract = (contract: LongContractResponse): string => {
  const allSections = contract.chunks.flatMap(chunk => chunk.sections);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contract.metadata.title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e40af; margin: 0; font-size: 2.5em; }
        .metadata { background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .subsection { margin: 15px 0; }
        .subsection h3 { color: #374151; }
        .content { margin: 15px 0; line-height: 1.7; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${contract.metadata.title}</h1>
            <p>Company: ${contract.metadata.companyName}</p>
        </div>
        
        <div class="metadata">
            <strong>Effective Date:</strong> ${contract.metadata.effectiveDate}<br>
            <strong>Version:</strong> ${contract.metadata.version}<br>
            <strong>Total Sections:</strong> ${contract.metadata.totalSections}<br>
            <strong>Estimated Pages:</strong> ${contract.metadata.estimatedPages}
        </div>
        
        ${allSections.map(section => `
            <div class="section">
                <h2>${section.id}. ${section.title}</h2>
                ${section.subsections.map(sub => `
                    <div class="subsection">
                        <h3>${sub.id} ${sub.title}</h3>
                        <div class="content">${sub.content.replace(/\n/g, '<br>')}</div>
                        ${sub.items ? `<ul>${sub.items.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
        
        <div class="footer">
            <p>Generated by Long Contract Generator AI</p>
            <p>Generation Time: ${contract.generationInfo.generationTime.toFixed(2)}s | Strategy: ${contract.generationInfo.strategy}</p>
        </div>
    </div>
</body>
</html>`;
};

export default LongContractGenerator;