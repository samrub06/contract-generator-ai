import DOMPurify from 'dompurify';
import React, { useCallback, useRef, useState } from 'react';
import type { ToSChunkResponse, ToSCompletionResponse, ToSSection } from '../api/htmlService';
import { htmlService } from '../api/htmlService';


// ToS Real-time Streaming Generation Home Page
const HomePage: React.FC = () => {
  const [prompt, setPrompt] = useState('Draft terms of service for a cloud cyber SaaS company based in New York');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{
    status: 'idle' | 'generating' | 'completed' | 'error' | 'stopped';
    sessionId?: string;
    currentChunk?: ToSSection[];
    progress?: string;
    isComplete?: boolean;
    message?: string;
    error?: string;
    chunkNumber?: number;
  }>({
    status: 'idle'
  });
  const [error, setError] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<ToSSection[]>([]);
  const [allHtmlSections, setAllHtmlSections] = useState<string[]>([]);
  
  // Ref to track if generation should continue
  const shouldContinueRef = useRef(true);

  const handleStartGeneration = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setError(null);
    setGeneratedSections([]);
    setAllHtmlSections([]);
    setStatus({
      status: 'generating',
      message: 'Starting Terms of Service generation...'
    });
    setIsGenerating(true);
    shouldContinueRef.current = true; // Reset the flag

    try {
      // Start ToS generation and get first chunk (4 sections)
      const result: ToSChunkResponse = await htmlService.startToSGeneration(prompt);
      
      setStatus({
        status: 'generating',
        sessionId: result.sessionId,
        currentChunk: result.sections,
        progress: result.progress,
        isComplete: result.isComplete,
        message: `Generated chunk ${result.chunkNumber} with ${result.sections.length} sections`,
        chunkNumber: result.chunkNumber
      });
      
      setGeneratedSections(result.sections);
      setAllHtmlSections([result.html]);

      // If not complete, automatically generate next chunks
      if (!result.isComplete) {
        // Start automatic generation of all remaining chunks
        generateAllChunks(result.sessionId);
      } else {
        setIsGenerating(false);
        setStatus(prev => ({
          ...prev,
          status: 'completed',
          message: 'Terms of Service generation completed!'
        }));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setIsGenerating(false);
      setStatus({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start generation'
      });
    }
  }, [prompt]);

  // Function to stop generation
  const handleStopGeneration = useCallback(async () => {
    if (!status.sessionId) return;

    try {
      shouldContinueRef.current = false; // Stop the generation loop
      
      const result = await htmlService.stopToSGeneration(status.sessionId);
      
      setIsGenerating(false);
      setStatus(prev => ({
        ...prev,
        status: 'stopped',
        message: `Generation stopped. ${result.sectionsGenerated} sections generated.`
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop generation');
    }
  }, [status.sessionId]);

  // Function to automatically generate all chunks with real-time streaming
  const generateAllChunks = useCallback(async (sessionId: string) => {
    try {
      while (shouldContinueRef.current) {
        const result: ToSChunkResponse | ToSCompletionResponse = await htmlService.generateNextToSSection(sessionId);
        
        if (result.isComplete) {
          setStatus({
            status: 'completed',
            sessionId: result.sessionId,
            progress: result.progress,
            isComplete: true,
            message: 'All sections completed!'
          });
          setIsGenerating(false);
          break;
        } else if ('sections' in result && result.html) {
          // Handle chunk response
          const chunkResponse = result as ToSChunkResponse;
          setStatus({
            status: 'generating',
            sessionId: chunkResponse.sessionId,
            currentChunk: chunkResponse.sections,
            progress: chunkResponse.progress,
            isComplete: false,
            message: `Generated chunk ${chunkResponse.chunkNumber} with ${chunkResponse.sections.length} sections`,
            chunkNumber: chunkResponse.chunkNumber
          });
          
          setGeneratedSections((prev: ToSSection[]) => [...prev, ...chunkResponse.sections]);
          setAllHtmlSections((prev: string[]) => [...prev, chunkResponse.html]);
          
          // Small delay to show real-time progress
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      if (shouldContinueRef.current) { // Only show error if not stopped intentionally
        setError(err instanceof Error ? err.message : 'Failed to generate next chunk');
        setIsGenerating(false);
        setStatus(prev => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to generate next chunk'
        }));
      }
    }
  }, []);



  const handleDownloadHTML = useCallback(() => {
    if (allHtmlSections.length === 0) return;

    // Combine all sections into a complete HTML document
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .tos-section { margin-bottom: 30px; }
        .section-title { color: #333; font-size: 1.5em; margin-bottom: 15px; }
        .subsection-title { color: #555; font-size: 1.2em; margin: 15px 0 10px 0; }
        .subsection-content { margin-bottom: 10px; line-height: 1.6; }
        .numbered-list { margin: 10px 0; padding-left: 20px; }
        .list-item { margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>
    ${allHtmlSections.join('\n')}
    <hr>
    <p><small>This document was generated by AI and should be reviewed by legal professionals.</small></p>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terms_of_service_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allHtmlSections]);

  // Combine all HTML sections for display
  const combinedHtml = allHtmlSections.join('');

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Input Section */}
      <div className="space-y-4">
        <textarea
          className="w-full min-h-24 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your Terms of Service requirements..."
          disabled={isGenerating}
        />

        <div className="flex justify-between items-center">
          {/* Left side - Action buttons */}
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              onClick={handleStartGeneration}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? 'Generating All Sections...' : 'Generate All Sections'}
            </button>
            
            {status.status === 'generating' && (
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                onClick={handleStopGeneration}
                disabled={!status.sessionId}
              >
                Stop Generation
              </button>
            )}

          </div>
          
          {/* Right side - Download button */}
          <button
            onClick={handleDownloadHTML}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={allHtmlSections.length === 0}
          >
            Download HTML
          </button>
        </div>

        {error && (
          <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Progress Display */}
        {status.progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">Progress:</span>
              <span className="font-mono text-sm text-blue-900">{status.progress}</span>
            </div>
            {status.message && (
              <div className="text-xs text-blue-700 mt-2">{status.message}</div>
            )}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isGenerating && (
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Generating sections...</p>
        </div>
      )}

      {/* Generated Sections Display */}
      {combinedHtml && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Generated Terms of Service</h2>
                      <span className="text-sm text-gray-500">
            {generatedSections.length} section{generatedSections.length !== 1 ? 's' : ''} generated
          </span>
          </div>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(combinedHtml) }}
          />
        </div>
      )}

      {/* Completion message */}
      {status.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-800 font-medium">
            🎉 Terms of Service generation completed!
          </div>
          <div className="text-green-700 text-sm mt-1">
            All {generatedSections.length} sections have been generated successfully.
          </div>
        </div>
      )}

      {status.status === 'stopped' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-800 font-medium">
            ⚠️ Generation stopped.
          </div>
          <div className="text-yellow-700 text-sm mt-1">
            {status.message}
          </div>
        </div>
      )}


    </div>
  );
};

export default HomePage;