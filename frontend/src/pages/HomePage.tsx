import DOMPurify from 'dompurify';
import React, { useCallback, useRef, useState } from 'react';
import type { GenerationStatus } from '../api/htmlService';
import { htmlService } from '../api/htmlService';

// Minimalist home page for contract generation
const HomePage: React.FC = () => {
  const [prompt, setPrompt] = useState('Draft terms of service for a cloud cyber SaaS company based in New York');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: 'idle'
  });
  const [error, setError] = useState<string | null>(null);
  const [currentHtmlChunks, setCurrentHtmlChunks] = useState<string[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setError(null);
    setCurrentHtmlChunks([]);
    setGenerationStatus({
      status: 'generating',
      message: 'Starting contract generation...'
    });
    setIsGenerating(true);

    try {
      const cleanup = htmlService.generateContractStreaming(
        { prompt },
        (status: GenerationStatus) => {
          setGenerationStatus(status);
          
          // Handle streaming content for real-time display
          if (status.streamingContent) {
            console.log('Streaming content received:', status.streamingContent.substring(0, 100) + '...');
            setCurrentHtmlChunks([status.streamingContent]);
          }
          
          // Handle final HTML when completed
          if (status.html && status.status === 'completed') {
            console.log('Final HTML received');
            setCurrentHtmlChunks([status.html]);
          }
          
          if (status.status === 'completed') {
            setIsGenerating(false);
          }
        },
        () => {
          setIsGenerating(false);
        },
        (errorMessage) => {
          setError(errorMessage);
          setIsGenerating(false);
          setGenerationStatus({
            status: 'error',
            error: errorMessage
          });
        }
      );
      
      abortRef.current = cleanup;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
      setIsGenerating(false);
    }
  }, [prompt, generationStatus.html]);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsGenerating(false);
    
    // Mark as stopped but keep the HTML content if available
    setGenerationStatus(prev => ({
      ...prev,
      status: 'stopped',
      message: 'Generation stopped by user - showing partial content'
    }));
  }, []);

  const handleDownload = useCallback(() => {
    // Download the HTML content from backend
    const contentToDownload = generationStatus.html;
    if (!contentToDownload) {
      console.log('No HTML content to download');
      return;
    }
    
    const blob = new Blob([contentToDownload], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_${generationStatus.status === 'completed' ? 'complete' : 'partial'}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Download initiated for:', generationStatus.status, 'Content length:', contentToDownload.length);
  }, [generationStatus.html, generationStatus.status]);

  // Combine all HTML chunks for display
  const combinedHtml = currentHtmlChunks.join('');

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Input Section */}
      <div className="space-y-4">
        <textarea
          className="w-full min-h-24 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your contract requirements..."
          disabled={isGenerating}
        />

        <div className="flex justify-between items-center">
          {/* Left side - Action buttons */}
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              onClick={handleStop}
              disabled={!isGenerating}
            >
              Stop
            </button>
        
          </div>
          
          {/* Right side - Download button */}
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!generationStatus.html}
          >
            Download HTML
          </button>
        </div>

        {error && (
          <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      {/* Simple Status - Show validation and generation progress */}
      {(isGenerating || generationStatus.status === 'validating') && (
        <div className="text-center space-y-3">
        
      
          {/* Show token information during validation */}
          {generationStatus.status === 'validating' && generationStatus.tokenInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
              <div className="text-xs text-blue-800 space-y-1">
                <div className="flex justify-between">
                  <span>Input Tokens:</span>
                  <span className="font-mono">{generationStatus.tokenInfo.inputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Cost:</span>
                  <span className="font-mono">${generationStatus.tokenInfo.estimatedCost.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono">{generationStatus.tokenInfo.model}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading indicator when waiting for first data */}
          {isGenerating && !generationStatus.streamingContent && (
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      )}

      {/* Real-time HTML Chunks Display - Show progressive content during generation */}
      {isGenerating && combinedHtml && (
        <div className="bg-white border border-gray-200 rounded p-4">  
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(combinedHtml) }}
          />
        </div>
      )}

      {/* Final Content Display - Show complete HTML from backend */}
      {!isGenerating && generationStatus.html && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generationStatus.html) }}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;