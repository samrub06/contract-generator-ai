import React, { useCallback, useState } from 'react';
import type { StreamingData } from '../api/htmlService';
import { htmlService } from '../api/htmlService';

// Types for structured JSON
interface Subsection {
  n: string;
  t: string;
  c: string;
  l: string[] | null;
}

interface Section {
  n: number;
  t: string;
  ss: Subsection[];
}

interface ParsedData {
  sections: Section[];
}

// Real-time streaming page for structured JSON Terms of Service generation
// WITH TIMEOUT HANDLING AND AUTOMATIC RESUME CAPABILITY
const RealTimeStreamingPage: React.FC = () => {
  const [prompt, setPrompt] = useState('Draft terms of service for a cloud cyber SaaS company based in New York');
  const [streamedContent, setStreamedContent] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [isJsonComplete, setIsJsonComplete] = useState(false);

  const startStreaming = useCallback(async (resumeFrom = '', existingSessionId = '') => {
    setIsStreaming(true);
    setError(null);
    setShowResumeButton(false);
    setCanDownload(false);
    setIsJsonComplete(false);
    
    if (!resumeFrom) {
      setStreamedContent('');
      setSections([]);
      setTimeoutCount(0);
      setParsedData(null);
    } else {
      setIsResuming(true);
      setStreamedContent(resumeFrom);
    }

    try {
      await htmlService.startRealTimeStreaming(
        prompt,
        (data: StreamingData) => {
          switch (data.type) {
            case 'connected':
              setSessionId(data.sessionId);
              if (data.isResumed) setIsResuming(true);
              break;
            
            case 'content':
              if (data.content) {
                setStreamedContent(prev => {
                  const newContent = prev + data.content;
                  
                  // Try to parse JSON in real-time
                  try {
                    if (newContent.trim().startsWith('{') && newContent.trim().endsWith('}')) {
                      const parsed = JSON.parse(newContent);
                      if (parsed.sections && Array.isArray(parsed.sections)) {
                        setParsedData(parsed);
                        setSections(parsed.sections);
                        setIsJsonComplete(true);
                        setCanDownload(true);
                        // Auto-stop when JSON is complete
                        if (isStreaming) {
                          htmlService.stopToSGeneration(sessionId);
                          setIsStreaming(false);
                        }
                      }
                    }
                  } catch {
                    // JSON not complete yet
                    setIsJsonComplete(false);
                  }
                  
                  return newContent;
                });
              }
              break;
            
            case 'section_complete':
              if (data.sectionContent && typeof data.sectionContent === 'object') {
                setSections(prev => {
                  const newSections = [...prev];
                  const sectionContent = data.sectionContent as unknown as Section;
                  const existingIndex = newSections.findIndex(s => s.n === data.sectionNumber);
                  if (existingIndex >= 0) {
                    newSections[existingIndex] = sectionContent;
                  } else {
                    newSections.push(sectionContent);
                  }
                  return newSections;
                });
              }
              break;
            
            case 'timeout':
              setIsStreaming(false);
              setShowResumeButton(true);
              setError('Connection timeout detected. You can resume generation from where it left off.');
              break;
            
            case 'complete':
              setIsStreaming(false);
              setIsResuming(false);
              try {
                if (streamedContent.trim().startsWith('{') && streamedContent.trim().endsWith('}')) {
                  const finalParsed = JSON.parse(streamedContent);
                  if (finalParsed.sections && Array.isArray(finalParsed.sections)) {
                    setParsedData(finalParsed);
                    setSections(finalParsed.sections);
                    setIsJsonComplete(true);
                    setCanDownload(true);
                  }
                }
              } catch {
                console.error('Final JSON parsing failed');
              }
              break;
            
            case 'error':
              setIsStreaming(false);
              setIsResuming(false);
              setError(data.error || 'An error occurred during streaming');
              if (data.canResume) {
                setShowResumeButton(true);
              }
              break;
          }
        },
        (error: Error) => {
          console.error('Streaming error:', error);
          setError(error.message);
          setIsStreaming(false);
          setIsResuming(false);
        },
        () => {
          console.log('Streaming completed');
          setIsStreaming(false);
          setIsResuming(false);
        },
        resumeFrom,
        existingSessionId
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start streaming');
      setIsStreaming(false);
      setIsResuming(false);
    }
  }, [prompt, streamedContent, isStreaming, sessionId]);

  const handleStop = useCallback(async () => {
    if (sessionId && isStreaming) {
      try {
        await htmlService.stopToSGeneration(sessionId);
        setIsStreaming(false);
        setIsResuming(false);
        
        // Try to parse the partial content for download
        if (streamedContent.trim().startsWith('{')) {
          try {
            // Try to complete the JSON if it's almost done
            let completedContent = streamedContent;
            if (!completedContent.trim().endsWith('}')) {
              // Find the last complete section and close it
              const lastCompleteSection = completedContent.lastIndexOf('},');
              if (lastCompleteSection > 0) {
                completedContent = completedContent.substring(0, lastCompleteSection + 1) + ']}';
              }
            }
            
            const parsed = JSON.parse(completedContent);
            if (parsed.sections && Array.isArray(parsed.sections)) {
              setParsedData(parsed);
              setSections(parsed.sections);
              setCanDownload(true);
            }
          } catch {
            // If we can't parse, still allow download of raw content
            setCanDownload(true);
          }
        }
      } catch {
        setError('Failed to stop generation');
      }
    }
  }, [sessionId, isStreaming, streamedContent]);

  const handleResume = useCallback(async () => {
    if (sessionId && streamedContent) {
      await startStreaming(streamedContent, sessionId);
    }
  }, [sessionId, streamedContent, startStreaming]);

  const handleDownloadHTML = useCallback(() => {
    // If we have parsed data, use it; otherwise use raw content
    let contentToFormat = parsedData;
    
    if (!contentToFormat && streamedContent.trim().startsWith('{')) {
      try {
        // Try to parse the raw content
        let completedContent = streamedContent;
        if (!completedContent.trim().endsWith('}')) {
          // Find the last complete section and close it
          const lastCompleteSection = completedContent.lastIndexOf('},');
          if (lastCompleteSection > 0) {
            completedContent = completedContent.substring(0, lastCompleteSection + 1) + ']}';
          }
        }
        contentToFormat = JSON.parse(completedContent);
      } catch {
        // If parsing fails, create a basic structure from what we have
        contentToFormat = {
          sections: sections.length > 0 ? sections : [{
            n: 1,
            t: "Partial Content",
            ss: [{
              n: "1.1",
              t: "Generated Content",
              c: streamedContent,
              l: null
            }]
          }]
        };
      }
    }

    if (!contentToFormat) {
      setError('No content available for download');
      return;
    }

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Generated</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .tos-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tos-header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .tos-header h1 { color: #1e40af; margin: 0; font-size: 2.5em; }
        .generation-info { background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 30px; border-left: 4px solid #2563eb; }
        .table-of-contents { background: #f1f5f9; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        .table-of-contents h3 { color: #1e40af; margin-top: 0; }
        .table-of-contents ul { list-style: none; padding: 0; }
        .table-of-contents li { margin: 8px 0; }
        .table-of-contents a { color: #2563eb; text-decoration: none; font-weight: 500; }
        .table-of-contents a:hover { text-decoration: underline; }
        .section { margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #2563eb; }
        .section h3 { color: #1e40af; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .subsection { margin: 15px 0; padding: 15px; background: white; border-radius: 4px; border: 1px solid #e2e8f0; }
        .subsection h4 { color: #374151; margin-top: 0; }
        .content { margin: 15px 0; line-height: 1.7; }
        .list { margin: 15px 0; padding-left: 20px; }
        .list li { margin: 8px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #6b7280; font-size: 0.9em; }
        .partial-notice { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="tos-container">
        <div class="tos-header">
            <h1>Terms of Service</h1>
            <p>Generated Terms of Service Agreement</p>
        </div>
        
        <div class="generation-info">
            <strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
            <strong>Total Sections:</strong> ${contentToFormat.sections ? contentToFormat.sections.length : 'Partial'}
        </div>
        
        ${!isJsonComplete ? '<div class="partial-notice"><strong>⚠️ Partial Content:</strong> This document contains partially generated content. The generation was stopped before completion.</div>' : ''}
        
        <div class="table-of-contents">
            <h3>Table of Contents</h3>
            <ul>
                ${contentToFormat.sections ? contentToFormat.sections.map((section: Section) => 
                    `<li><a href="#section-${section.n}">${section.n}. ${section.t}</a></li>`
                ).join('') : '<li>Partial content available</li>'}
            </ul>
        </div>
        
        ${contentToFormat.sections ? contentToFormat.sections.map((section: Section) => `
            <div class="section" id="section-${section.n}">
                <h3>${section.n}. ${section.t}</h3>
                ${section.ss && Array.isArray(section.ss) ? section.ss.map((subsection: Subsection) => `
                    <div class="subsection">
                        <h4>${subsection.n} ${subsection.t}</h4>
                        ${subsection.c ? `<div class="content">${subsection.c.split('\\n\\n').filter(p => p.trim()).map((paragraph: string) => `<p>${paragraph.trim()}</p>`).join('')}</div>` : ''}
                        ${subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0 ? `
                            <ol class="list">
                                ${subsection.l.map((item: string) => `<li>${item.trim()}</li>`).join('')}
                            </ol>
                        ` : ''}
                    </div>
                `).join('') : ''}
            </div>
        `).join('') : '<div class="section"><h3>Partial Content</h3><div class="content"><p>Content generation was stopped before completion.</p></div></div>'}
        
        <div class="footer">
            <p>This document was generated by AI and should be reviewed by legal professionals before use.</p>
            <p>Generated with Contract Generator AI - Real-time streaming technology</p>
            ${!isJsonComplete ? '<p><strong>Note:</strong> This is a partial document. Consider resuming generation to complete the Terms of Service.</p>' : ''}
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terms_of_service_${isJsonComplete ? 'complete' : 'partial'}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [parsedData, sections, streamedContent, isJsonComplete]);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Contract Generator AI
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Generate professional Terms of Service with real-time streaming
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <textarea
          className="w-full min-h-24 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your Terms of Service requirements..."
          disabled={isStreaming}
        />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
              onClick={() => startStreaming()}
              disabled={isStreaming || (!prompt.trim() && !streamedContent)}
            >
              {isStreaming ? '🔄 Streaming...' : '🚀 Start Real-Time Generation'}
            </button>
            
            {showResumeButton && (
              <button
                className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-lg"
                onClick={handleResume}
                disabled={isStreaming}
              >
                🔄 Resume Generation
              </button>
            )}
            {isStreaming && (
              <button
                className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-lg"
                onClick={handleStop}
                disabled={!sessionId || !isStreaming}
              >
                ⚠️ Stop Generation
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canDownload}
            >
              📥 Download HTML
            </button>
          </div>
        </div>

        {error && (
          <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            ❌ {error}
          </div>
        )}

        {/* Session Info */}
        {sessionId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Session ID:</strong> {sessionId}
              {timeoutCount > 0 && (
                <span className="ml-2 text-orange-600">
                  ⚠️ {timeoutCount} timeout(s) handled
                </span>
              )}
            </div>
          </div>
        )}

        {/* Resume Status */}
        {isResuming && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              🔄 <strong>Resuming generation</strong> from where it left off...
            </div>
          </div>
        )}

            {/* Streaming Status */}
            {isStreaming && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-800">
                      {isResuming ? '🔄 Resuming Generation...' : '🚀 Generating Terms of Service...'}
                    </h3>
                    <p className="text-blue-600">
                      {isResuming 
                        ? 'Continuing from where we left off...' 
                        : 'Creating professional legal content in real-time...'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Generation Complete Status */}
            {!isStreaming && isJsonComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-green-600 text-2xl">✅</div>
                  <div>
                    <h3 className="text-lg font-medium text-green-800">Generation Complete!</h3>
                    <p className="text-green-600">
                      Your Terms of Service has been generated successfully. You can now download the HTML document.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Partial Content Status */}
            {!isStreaming && !isJsonComplete && streamedContent && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-yellow-600 text-2xl">⚠️</div>
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800">Partial Content Generated</h3>
                    <p className="text-yellow-600">
                      Generation was stopped before completion. You can download what was generated or resume to continue.
                    </p>
                  </div>
                </div>
              </div>
            )}
      </div>

      {/* Real-time Streaming Display */}
      {isStreaming && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex space-x-1">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {isResuming ? 'Resuming generation...' : 'Generating structured JSON in real-time...'}
            </span>
          </div>
          
          {/* Live content being generated */}
          <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
            <div className="whitespace-pre-wrap font-mono text-sm">
              {streamedContent}
              <span className="animate-pulse text-blue-600">|</span>
            </div>
          </div>
        </div>
      )}

      {/* Structured Sections Display */}
      {sections.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Generated Sections ({sections.length})
            </h2>
            <span className="text-sm text-gray-500">
              Structured JSON format with real-time generation
            </span>
          </div>
          
          {sections.map((section, index) => (
            <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-medium text-gray-700 mb-3 text-lg">
                Section {section.n}: {section.t}
              </h3>
              
              {section.ss && Array.isArray(section.ss) && section.ss.map((subsection, subIndex) => (
                <div key={subIndex} className="ml-4 mb-3 p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-600 mb-2">
                    {subsection.n} {subsection.t}
                  </h4>
                  
                  {subsection.c && (
                    <div className="text-sm text-gray-700 mb-2">
                      {subsection.c.split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => (
                        <p key={pIndex} className="mb-2">{paragraph.trim()}</p>
                      ))}
                    </div>
                  )}
                  
                  {subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0 && (
                    <ol className="ml-4 text-sm text-gray-700">
                      {subsection.l.map((item, itemIndex) => (
                        <li key={itemIndex} className="mb-1">{item.trim()}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Completion message */}
      {!isStreaming && sections.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-800 font-medium text-lg">
            🎉 Real-time generation completed!
          </div>
          <div className="text-green-700 text-sm mt-1">
            All {sections.length} sections have been generated in structured JSON format.
            {timeoutCount > 0 && ` ${timeoutCount} timeout(s) were automatically handled.`}
          </div>
        </div>
      )}

      {/* Footer with Features */}
      <div className="text-center text-gray-500 text-sm">
        <p>Powered by OpenAI GPT-4 • Real-time streaming technology</p>
      </div>
    </div>
  );
};

export default RealTimeStreamingPage; 