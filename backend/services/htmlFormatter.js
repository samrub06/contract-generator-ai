/**
 * HTML Formatter for structured JSON Terms of Service
 * Converts the structured JSON output to professional HTML
 */

/**
 * Format a single subsection to HTML
 * @param {Object} subsection - Subsection object with n, t, c, l properties
 * @returns {string} - HTML formatted subsection
 */
function formatSubsectionToHTML(subsection) {
  let html = '';
  
  // Subsection header
  html += `<div class="subsection">`;
  html += `<h4 class="subsection-title">${subsection.n} ${subsection.t}</h4>`;
  
  // Subsection content
  if (subsection.c) {
    html += `<div class="subsection-content">`;
    
    // Split content by newlines and format
    const paragraphs = subsection.c.split('\n\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        html += `<p>${paragraph.trim()}</p>`;
      }
    });
    
    html += `</div>`;
  }
  
  // Subsection list items
  if (subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0) {
    html += `<ol class="subsection-list">`;
    subsection.l.forEach(item => {
      if (item.trim()) {
        html += `<li>${item.trim()}</li>`;
      }
    });
    html += `</ol>`;
  }
  
  html += `</div>`;
  return html;
}

/**
 * Format a single section to HTML
 * @param {Object} section - Section object with n, t, ss properties
 * @returns {string} - HTML formatted section
 */
function formatSectionToHTML(section) {
  let html = '';
  
  // Section header
  html += `<div class="tos-section" id="section-${section.n}">`;
  html += `<h3 class="section-title">${section.n}. ${section.t}</h3>`;
  
  // Section subsections
  if (section.ss && Array.isArray(section.ss)) {
    section.ss.forEach(subsection => {
      html += formatSubsectionToHTML(subsection);
    });
  }
  
  html += `</div>`;
  return html;
}

/**
 * Format complete Terms of Service JSON to HTML
 * @param {Object} tosData - Complete ToS data object
 * @returns {string} - Complete HTML document
 */
function formatToSToHTML(tosData) {
  if (!tosData || !tosData.sections || !Array.isArray(tosData.sections)) {
    return '<div class="error">Invalid Terms of Service data</div>';
  }

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Generated</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        
        .tos-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tos-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        
        .tos-header h1 {
            color: #007bff;
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .tos-header p {
            color: #666;
            font-size: 1.1em;
            margin: 0;
        }
        
        .tos-section {
            margin-bottom: 40px;
            padding: 20px;
            border-left: 4px solid #007bff;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }
        
        .section-title {
            color: #007bff;
            font-size: 1.8em;
            margin-bottom: 20px;
            font-weight: 600;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        
        .subsection {
            margin-bottom: 25px;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .subsection-title {
            color: #495057;
            font-size: 1.3em;
            margin-bottom: 15px;
            font-weight: 600;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 8px;
        }
        
        .subsection-content p {
            margin-bottom: 15px;
            text-align: justify;
            color: #495057;
        }
        
        .subsection-list {
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .subsection-list li {
            margin-bottom: 8px;
            color: #495057;
        }
        
        .generation-info {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 30px;
            font-size: 0.9em;
            color: #1976d2;
        }
        
        .generation-info strong {
            color: #1565c0;
        }
        
        .table-of-contents {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .table-of-contents h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        
        .table-of-contents ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .table-of-contents li {
            margin-bottom: 8px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .table-of-contents a {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        
        .table-of-contents a:hover {
            text-decoration: underline;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .tos-container {
                padding: 20px;
            }
            
            .tos-header h1 {
                font-size: 2em;
            }
            
            .section-title {
                font-size: 1.5em;
            }
        }
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
            <strong>Total Sections:</strong> ${tosData.sections.length}
        </div>
        
        <div class="table-of-contents">
            <h3>Table of Contents</h3>
            <ul>`;
  
  // Generate table of contents
  tosData.sections.forEach(section => {
    html += `<li><a href="#section-${section.n}">${section.n}. ${section.t}</a></li>`;
  });
  
  html += `
            </ul>
        </div>`;
  
  // Generate sections content
  tosData.sections.forEach(section => {
    html += formatSectionToHTML(section);
  });
  
  html += `
        <div class="footer">
            <p>This document was generated by AI and should be reviewed by legal professionals before use.</p>
            <p>Generated with Contract Generator AI - Real-time streaming technology</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Format a single section for display in the frontend
 * @param {Object} section - Section object
 * @returns {string} - HTML formatted section
 */
function formatSectionForDisplay(section) {
  if (!section || !section.ss) {
    return '<div class="error">Invalid section data</div>';
  }

  let html = `<div class="section-display">`;
  html += `<h3 class="section-title">${section.n}. ${section.t}</h3>`;
  
  section.ss.forEach(subsection => {
    html += `<div class="subsection-display">`;
    html += `<h4 class="subsection-title">${subsection.n} ${subsection.t}</h4>`;
    
    if (subsection.c) {
      const paragraphs = subsection.c.split('\n\n').filter(p => p.trim());
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          html += `<p>${paragraph.trim()}</p>`;
        }
      });
    }
    
    if (subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0) {
      html += `<ol class="subsection-list">`;
      subsection.l.forEach(item => {
        if (item.trim()) {
          html += `<li>${item.trim()}</li>`;
        }
      });
      html += `</ol>`;
    }
    
    html += `</div>`;
  });
  
  html += `</div>`;
  return html;
}

export {
  formatSectionForDisplay,
  formatSectionToHTML,
  formatSubsectionToHTML, formatToSToHTML
};

