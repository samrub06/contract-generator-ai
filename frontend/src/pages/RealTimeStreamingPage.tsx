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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [currentSection, setCurrentSection] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const startStreaming = useCallback(async (resumeFrom = '', existingSessionId = '') => {
    if (!prompt.trim() && !resumeFrom) return;

    setIsStreaming(true);
    setError(null);
    setShowResumeButton(false);
    
    if (!resumeFrom) {
      // New generation
      setStreamedContent('');
      setSections([]);
      setCurrentSection('');
      setTimeoutCount(0);
      setParsedData(null);
    } else {
      // Resume from timeout
      setIsResuming(true);
      setStreamedContent(resumeFrom);
      setCurrentSection('');
    }

    try {
      await htmlService.startRealTimeStreaming(
        prompt,
        // onData callback
        (data: StreamingData) => {
          console.log('Streaming data received:', data);
          
          switch (data.type) {
            case 'connected':
              setSessionId(data.sessionId);
              if (data.isResumed) {
                setIsResuming(true);
              }
              break;
              
            case 'content':
              if (data.content) {
                // Add each character to the streamed content
                setStreamedContent(prev => {
                  const newContent = prev + data.content;
                  
                  // Try to parse JSON as it streams in
                  try {
                    if (newContent.trim().startsWith('{') && newContent.trim().endsWith('}')) {
                      const parsed = JSON.parse(newContent);
                      if (parsed.sections && Array.isArray(parsed.sections)) {
                        setParsedData(parsed);
                        setSections(parsed.sections);
                      }
                    }
                  } catch {
                    // JSON not complete yet, continue streaming
                  }
                  
                  return newContent;
                });
                setCurrentSection(prev => prev + data.content);
              }
              break;
              
            case 'section_complete':
              if (data.sectionContent && typeof data.sectionContent === 'object') {
                // Section is complete, add it to sections array
                setSections(prev => {
                  const newSections = [...prev];
                  const existingIndex = newSections.findIndex(s => s.n === data.sectionNumber);
                  const sectionContent = data.sectionContent as unknown as Section;
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
              console.log('Timeout detected, can resume:', data.canResume);
              setIsStreaming(false);
              setShowResumeButton(true);
              setError('Connection timeout detected. You can resume generation from where it left off.');
              break;
              
            case 'complete':
              setIsStreaming(false);
              setIsResuming(false);
              
              // Final parsing attempt
              try {
                if (streamedContent.trim().startsWith('{') && streamedContent.trim().endsWith('}')) {
                  const finalParsed = JSON.parse(streamedContent);
                  if (finalParsed.sections && Array.isArray(finalParsed.sections)) {
                    setParsedData(finalParsed);
                    setSections(finalParsed.sections);
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
        // onError callback
        (error: Error) => {
          console.error('Streaming error:', error);
          setError(error.message);
          setIsStreaming(false);
          setIsResuming(false);
        },
        // onComplete callback
        () => {
          console.log('Streaming completed');
          setIsStreaming(false);
          setIsResuming(false);
        },
        // resumeFrom parameter
        resumeFrom,
        // existingSessionId parameter
        existingSessionId
      );
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setError(error instanceof Error ? error.message : 'Failed to start streaming');
      setIsStreaming(false);
      setIsResuming(false);
    }
  }, [prompt, currentSection, streamedContent]);

  // Resume generation after timeout
  const handleResume = useCallback(async () => {
    if (!sessionId || !streamedContent) return;

    setError(null);
    setShowResumeButton(false);
    
    try {
      await htmlService.resumeGeneration(
        sessionId,
        streamedContent,
        // onData callback
        (data: StreamingData) => {
          console.log('Resume data received:', data);
          
          switch (data.type) {
            case 'resume_started':
              setIsResuming(true);
              break;
              
            case 'content':
              if (data.content) {
                setStreamedContent(prev => {
                  const newContent = prev + data.content;
                  
                  // Try to parse JSON as it streams in
                  try {
                    if (newContent.trim().startsWith('{') && newContent.trim().endsWith('}')) {
                      const parsed = JSON.parse(newContent);
                      if (parsed.sections && Array.isArray(parsed.sections)) {
                        setParsedData(parsed);
                        setSections(parsed.sections);
                      }
                    }
                  } catch {
                    // JSON not complete yet, continue streaming
                  }
                  
                  return newContent;
                });
                setCurrentSection(prev => prev + data.content);
              }
              break;
              
            case 'section_complete':
              if (data.sectionContent && typeof data.sectionContent === 'object') {
                setSections(prev => {
                  const newSections = [...prev];
                  const existingIndex = newSections.findIndex(s => s.n === data.sectionNumber);
                  const sectionContent = data.sectionContent as unknown as Section;
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
              setError('Connection timeout detected again. You can resume generation from where it left off.');
              break;
              
            case 'complete':
              setIsStreaming(false);
              setIsResuming(false);
              
              // Final parsing attempt
              try {
                if (streamedContent.trim().startsWith('{') && streamedContent.trim().endsWith('}')) {
                  const finalParsed = JSON.parse(streamedContent);
                  if (finalParsed.sections && Array.isArray(finalParsed.sections)) {
                    setParsedData(finalParsed);
                    setSections(finalParsed.sections);
                  }
                }
              } catch {
                console.error('Final JSON parsing failed');
              }
              break;
              
            case 'error':
              setIsStreaming(false);
              setIsResuming(false);
              setError(data.error || 'An error occurred during resume');
              if (data.canResume) {
                setShowResumeButton(true);
              }
              break;
          }
        },
        // onError callback
        (error: Error) => {
          console.error('Resume error:', error);
          setError(error.message);
          setIsStreaming(false);
          setIsResuming(false);
        },
        // onComplete callback
        () => {
          console.log('Resume completed');
          setIsStreaming(false);
          setIsResuming(false);
        }
      );
    } catch (error) {
      console.error('Failed to resume streaming:', error);
      setError(error instanceof Error ? error.message : 'Failed to resume streaming');
      setIsStreaming(false);
      setIsResuming(false);
    }
  }, [sessionId, streamedContent, currentSection]);

  const handleDownloadHTML = useCallback(() => {
    if (!parsedData || !parsedData.sections || parsedData.sections.length === 0) return;

    // Create a complete HTML document with the structured data
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Generated</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; background-color: #f8f9fa; }
        .tos-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tos-header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #007bff; }
        .tos-header h1 { color: #007bff; font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
        .tos-header p { color: #666; font-size: 1.1em; margin: 0; }
        .tos-section { margin-bottom: 40px; padding: 20px; border-left: 4px solid #007bff; background: #f8f9fa; border-radius: 0 8px 8px 0; }
        .section-title { color: #007bff; font-size: 1.8em; margin-bottom: 20px; font-weight: 600; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .subsection { margin-bottom: 25px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e9ecef; }
        .subsection-title { color: #495057; font-size: 1.3em; margin-bottom: 15px; font-weight: 600; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
        .subsection-content p { margin-bottom: 15px; text-align: justify; color: #495057; }
        .subsection-list { margin: 15px; padding-left: 20px; }
        .subsection-list li { margin-bottom: 8px; color: #495057; }
        .generation-info { background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 15px; margin-bottom: 30px; font-size: 0.9em; color: #1976d2; }
        .generation-info strong { color: #1565c0; }
        .table-of-contents { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin-bottom: 30px; }
        .table-of-contents h3 { color: #495057; margin-bottom: 15px; font-size: 1.3em; }
        .table-of-contents ul { list-style: none; padding: 0; margin: 0; }
        .table-of-contents li { margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .table-of-contents a { color: #007bff; text-decoration: none; font-weight: 500; }
        .table-of-contents a:hover { text-decoration: underline; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e9ecef; text-align: center; color: #6c757d; font-size: 0.9em; }
        .timeout-info { background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #ffc107; }
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
            <strong>Format:</strong> Structured JSON with real-time streaming<br>
            <strong>Total Sections:</strong> ${parsedData.sections.length}
            ${timeoutCount > 0 ? `<br><strong>Timeout recovery:</strong> ${timeoutCount} timeout(s) handled with automatic resume` : ''}
        </div>
        
        ${timeoutCount > 0 ? `
        <div class="timeout-info">
            <p><strong>⚠️ Note:</strong> This document was generated with ${timeoutCount} timeout recovery(ies). 
            The AI seamlessly continued from where it left off, maintaining consistency.</p>
        </div>
        ` : ''}
        
        <div class="table-of-contents">
            <h3>Table of Contents</h3>
            <ul>
                ${parsedData.sections.map((section: Section) => `<li><a href="#section-${section.n}">${section.n}. ${section.t}</a></li>`).join('')}
            </ul>
        </div>
        
        ${parsedData.sections.map((section: Section) => `
            <div class="tos-section" id="section-${section.n}">
                <h3 class="section-title">${section.n}. ${section.t}</h3>
                ${section.ss ? section.ss.map((subsection: Subsection) => `
                    <div class="subsection">
                        <h4 class="subsection-title">${subsection.n} ${subsection.t}</h4>
                        ${subsection.c ? `<div class="subsection-content">${subsection.c.split('\\n\\n').filter((p: string) => p.trim()).map((p: string) => `<p>${p.trim()}</p>`).join('')}</div>` : ''}
                        ${subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0 ? `
                            <ol class="subsection-list">
                                ${subsection.l.map((item: string) => `<li>${item.trim()}</li>`).join('')}
                            </ol>
                        ` : ''}
                    </div>
                `).join('') : ''}
            </div>
        `).join('')}
        
        <div class="footer">
            <p>This document was generated by AI and should be reviewed by legal professionals before use.</p>
            <p>Generated with Contract Generator AI - Real-time streaming technology</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terms_of_service_structured_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [parsedData, timeoutCount]);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Real-Time Terms of Service Generator
        </h1>
        <p className="text-gray-600">
          Watch your Terms of Service being generated in structured JSON format, character by character!
        </p>
        <p className="text-sm text-blue-600 mt-2">
          ⚡ With automatic timeout recovery and structured output like Perplexity & Zoom
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
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!parsedData}
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

      {/* Info about the system */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Structured JSON:</strong> Output format like Perplexity & Zoom</li>
          <li>• <strong>Real-time streaming:</strong> Watch content appear character by character</li>
          <li>• <strong>Professional format:</strong> Sections, subsections, and numbered lists</li>
          <li>• <strong>Automatic timeout recovery:</strong> Seamlessly resume if connection drops</li>
          <li>• <strong>Professional export:</strong> Beautiful HTML document ready for use</li>
        </ul>
      </div>
    </div>
  );
};

export default RealTimeStreamingPage; 