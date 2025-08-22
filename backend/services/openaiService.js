import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

// Zod schema for ultra-compact ToS output - optimized for token saving
const CompactToSSchema = z.object({
  sections: z.array(z.object({
    n: z.number(),                    // Section number (1, 2, 3...)
    t: z.string(),                    // Short title (2-3 words max)
    ss: z.array(z.object({            // Subsections
      n: z.string(),                  // Subsection number (1.1, 1.2...)
      t: z.string(),                  // Short subtitle
      c: z.string(),                  // Content
      l: z.array(z.string()).nullable() // List items (i), (ii)... or null
    }))
  }))
});

// Use the schema directly
const ContractSchema = CompactToSSchema;

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('Loading OpenAI client with API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing or empty');
    }
    
    openai = new OpenAI({
      apiKey: apiKey
    });
  }
  return openai;
}

/**
 * Convert raw formatted text to HTML
 * @param {string} rawText - Raw text with S:, SS:, C: format
 * @returns {string} - Formatted HTML
 */
function convertRawTextToHTML(rawText) {
  if (!rawText) return '';
  
  const lines = rawText.split('\n');
  let html = '';
  let currentSection = '';
  let currentSubsection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      html += '<br>';
      continue;
    }
    
    // Section header (S:)
    if (trimmedLine.startsWith('S:')) {
      currentSection = trimmedLine.substring(2).trim();
      html += `<h2 class="section-header">${currentSection}</h2>`;
      continue;
    }
    
    // Subsection header (SS:)
    if (trimmedLine.startsWith('SS:')) {
      currentSubsection = trimmedLine.substring(3).trim();
      html += `<h3 class="subsection-header">${currentSubsection}</h3>`;
      continue;
    }
    
    // Content (C:)
    if (trimmedLine.startsWith('C:')) {
      const content = trimmedLine.substring(2).trim();
      if (content) {
        html += `<p class="section-content">${content}</p>`;
      }
      continue;
    }
    
    // List items (i), (ii), (iii), etc.
    if (trimmedLine.match(/^\([ivx]+\)/)) {
      html += `<li class="list-item">${trimmedLine}</li>`;
      continue;
    }
    
    // Regular content (continuation of previous content)
    if (trimmedLine && !trimmedLine.startsWith('(')) {
      html += `<p class="section-content">${trimmedLine}</p>`;
      continue;
    }
  }
  
  return html;
}

/**
 * Convert contract data to formatted HTML
 * @param {Object} contractData - Contract data from Zod validation
 * @returns {string} - Formatted HTML
 */
function convertContractToHTML(contractData) {
  try {
    // Parse the JSON string if it's a string
    let data = contractData;
    if (typeof contractData === 'string') {
      data = JSON.parse(contractData);
    }
    
    if (!data || !data.sections) {
      console.log('No sections found in contract data:', data);
      return '';
    }
    
    let html = '<div class="contract-container">';
    
    data.sections.forEach((section, index) => {
      html += `<div class="contract-section" data-section="${index}">`;
      
      // Section header
      if (section.section) {
        html += `<h2 class="section-header">${section.section}</h2>`;
      }
      
      // Subsection header
      if (section.subsection) {
        html += `<h3 class="subsection-header">${section.subsection}</h3>`;
      }
      
      // Content
      if (section.content) {
        // Remove the "C:" prefix if present
        let content = section.content;
        if (content.startsWith('C:')) {
          content = content.substring(2).trim();
        }
        html += `<p class="section-content">${content}</p>`;
      }
      
      // List items
      if (section.listItems && section.listItems.length > 0) {
        html += '<ul class="section-list">';
        section.listItems.forEach(item => {
          html += `<li class="list-item">${item}</li>`;
        });
        html += '</ul>';
      }
      
      html += '</div>';
    });
    
    html += '</div>';
    console.log('Generated HTML:', html);
    return html;
  } catch (error) {
    console.error('Error converting contract to HTML:', error);
    return '<div class="error">Error converting contract to HTML</div>';
  }
}

/**
 * Convert compact contract data to formatted HTML with clear numbering and concise content
 * Generic function that works with any contract type
 * @param {Object} contractData - Compact contract data from Zod validation
 * @returns {string} - Formatted HTML with clear numbering and concise content
 */
function convertCompactContractToHTML(contractData) {
  try {
    // Parse the JSON string if it's a string
    let data = contractData;
    if (typeof contractData === 'string') {
      data = JSON.parse(contractData);
    }
    
    if (!data || !data.sections) {
      console.log('No sections found in compact contract data:', data);
      return '';
    }
    
    let html = '<div class="contract-content">';
    
    // Add professional header
    html += `
      <div class="contract-header">
        <h1 class="contract-title">TERMS OF SERVICE AGREEMENT</h1>
        <div class="contract-meta">
          <p class="contract-date">Effective Date: ${new Date().toLocaleDateString()}</p>
          <p class="contract-version">Version: 1.0</p>
        </div>
        <div class="contract-intro">
          <p>This Terms of Service Agreement ("Agreement") is entered into between the Company and the User. By accessing or using our services, you agree to be bound by the terms and conditions set forth herein.</p>
        </div>
      </div>
    `;
    
    data.sections.forEach((section, index) => {
      html += `<div class="section">`;
      
      // Section header with clear numbering
      if (section.n && section.t) {
        const expandedTitle = expandCompactTitle(section.t);
        html += `<h2 class="section-title">${section.n}. ${expandedTitle}</h2>`;
      }
      
      // Subsections
      if (section.ss && section.ss.length > 0) {
        section.ss.forEach(subsection => {
          if (subsection.n && subsection.t) {
            const expandedSubtitle = expandCompactTitle(subsection.t);
            html += `<h3 class="subsection-title">${subsection.n} ${expandedSubtitle}</h3>`;
          }
          
          // Content - comprehensive legal content
          if (subsection.c) {
            html += `<p class="content">${subsection.c}</p>`;
          }
          
          // List items with proper numbered lists (i), (ii), (iii) -> 1, 2, 3
          if (subsection.l && subsection.l.length > 0) {
            html += '<ol class="numbered-list">';
            subsection.l.forEach((item, itemIndex) => {
              // Convert (i), (ii), (iii) to proper numbered list items
              let cleanItem = item;
              if (item.match(/^\([ivx]+\)\s*/)) {
                // Remove the (i), (ii), (iii) prefix and let the <ol> handle numbering
                cleanItem = item.replace(/^\([ivx]+\)\s*/, '');
              }
              html += `<li class="list-item">${cleanItem}</li>`;
            });
            html += '</ol>';
          }
        });
      }
      
      html += '</div>';
    });
    
    // Add footer
    html += `
      <div class="contract-footer">
        <p class="footer-text">This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, representations, and understandings.</p>
        <p class="footer-signature">By using our services, you acknowledge that you have read, understood, and agree to be bound by this Agreement.</p>
      </div>
    `;
    
    html += '</div>';
    console.log('Generated compact contract HTML:', html);
    return html;
  } catch (error) {
    console.error('Error converting compact contract to HTML:', error);
    return '<div class="error">Error converting compact contract to HTML</div>';
  }
}

/**
 * Convert compact contract data to HTML content only (without header/footer)
 * @param {Object} contractData - Compact contract data from Zod validation
 * @returns {string} - HTML content only
 */
function convertCompactContractToHTMLContent(contractData) {
  try {
    // Parse the JSON string if it's a string
    let data = contractData;
    if (typeof contractData === 'string') {
      data = JSON.parse(contractData);
    }
    
    if (!data || !data.sections) {
      console.log('No sections found in compact contract data:', data);
      return '';
    }
    
    let html = '';
    
    data.sections.forEach((section, index) => {
      html += `<div class="section">`;
      
      // Section header with clear numbering
      if (section.n && section.t) {
        const expandedTitle = expandCompactTitle(section.t);
        html += `<h2 class="section-title">${section.n}. ${expandedTitle}</h2>`;
      }
      
      // Subsections
      if (section.ss && section.ss.length > 0) {
        section.ss.forEach(subsection => {
          if (subsection.n && subsection.t) {
            const expandedSubtitle = expandCompactTitle(subsection.t);
            html += `<h3 class="subsection-title">${subsection.n} ${expandedSubtitle}</h3>`;
          }
          
          // Content - comprehensive legal content
          if (subsection.c) {
            html += `<p class="content">${subsection.c}</p>`;
          }
          
          // List items with proper numbered lists (i), (ii), (iii) -> 1, 2, 3
          if (subsection.l && subsection.l.length > 0) {
            html += '<ol class="numbered-list">';
            subsection.l.forEach((item, itemIndex) => {
              // Convert (i), (ii), (iii) to proper numbered list items
              let cleanItem = item;
              if (item.match(/^\([ivx]+\)\s*/)) {
                // Remove the (i), (ii), (iii) prefix and let the <ol> handle numbering
                cleanItem = item.replace(/^\([ivx]+\)\s*/, '');
              }
              html += `<li class="list-item">${cleanItem}</li>`;
            });
            html += '</ol>';
          }
        });
      }
      
      html += '</div>';
    });
    
    return html;
  } catch (error) {
    console.error('Error converting compact contract to HTML content:', error);
    return '<div class="error">Error converting contract to HTML</div>';
  }
}

/**
 * Expand compact titles to full titles for better readability
 * Generic function that works with any contract type
 * @param {string} compactTitle - Compact title like "Def", "Obl", "IP", etc.
 * @returns {string} - Expanded title
 */
function expandCompactTitle(compactTitle) {
  // Generic title expansions that work for any contract type
  const titleExpansions = {
    // Common contract elements
    'Def': 'Definitions',
    'Scope': 'Scope',
    'Parties': 'Parties',
    'Svc': 'Services',
    'Obl': 'Obligations',
    'IP': 'Intellectual Property',
    'Priv': 'Privacy',
    'Liab': 'Liability',
    'Term': 'Termination',
    'Law': 'Governing Law',
    
    // Contract-specific elements
    'Acc': 'Account',
    'Sec': 'Security',
    'Data': 'Data Protection',
    'Comp': 'Compliance',
    'Mod': 'Modifications',
    'Not': 'Notices',
    'Dis': 'Disclaimers',
    'Ind': 'Indemnification',
    
    // Employment/Partnership specific
    'Emp': 'Employment',
    'Comp': 'Compensation',
    'Work': 'Work',
    'Conf': 'Confidentiality',
    'NonComp': 'Non-Compete',
    'Sever': 'Severance',
    
    // NDA specific
    'ConfInfo': 'Confidential Information',
    'Use': 'Use',
    'Disclosure': 'Disclosure',
    'Return': 'Return',
    
    // Partnership specific
    'Part': 'Partnership',
    'Profit': 'Profit Sharing',
    'Management': 'Management',
    'Dissolution': 'Dissolution'
  };
  
  return titleExpansions[compactTitle] || compactTitle;
}

/**
 * Stream contract generation from OpenAI using new API
 */
async function streamContract(prompt, res) {
  try {
    const client = getOpenAIClient();
    
    // Buffer pour accumuler les chunks avant envoi
    let chunkBuffer = '';
    let lastSentTime = Date.now();
    const CHUNK_BUFFER_SIZE = 50; // Nombre de caractères avant envoi
    const MAX_BUFFER_TIME = 100; // Temps max en ms avant envoi forcé
    
    // Fonction pour détecter la fin d'une phrase
    function isSentenceComplete(text) {
      return /[.!?]\s*$/.test(text.trim());
    }
    
    // Fonction pour détecter la fin d'un mot
    function isWordComplete(text) {
      return /\s+$/.test(text);
    }
    
    // Send HTML template header first - simplified version without status indicator
    const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Generation</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .contract-header {
            text-align: center;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .contract-title {
            color: #2c3e50;
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 15px 0;
        }
        .contract-meta {
            color: #7f8c8d;
            font-size: 14px;
            margin: 10px 0;
        }
        .contract-intro {
            color: #34495e;
            font-size: 16px;
            line-height: 1.8;
            margin: 20px 0;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            color: #2c3e50;
            font-size: 20px;
            font-weight: 600;
            margin: 20px 0 15px 0;
            padding: 10px 0;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .subsection-title {
            color: #34495e;
            font-size: 18px;
            font-weight: 500;
            margin: 15px 0 10px 0;
        }
        .content {
            color: #2c3e50;
            font-size: 15px;
            line-height: 1.8;
            margin: 10px 0;
            text-align: justify;
        }
        .numbered-list {
            margin: 15px 0;
            padding-left: 20px;
        }
        .list-item {
            color: #2c3e50;
            font-size: 15px;
            line-height: 1.7;
            margin: 8px 0;
        }
        .contract-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1 class="contract-title">TERMS OF SERVICE AGREEMENT</h1>
            <div class="contract-meta">
                <p class="contract-date">Effective Date: ${new Date().toLocaleDateString()}</p>
                <p class="contract-version">Version: 1.0</p>
            </div>
            <div class="contract-intro">
                <p>This Terms of Service Agreement ("Agreement") is entered into between the Company and the User. By accessing or using our services, you agree to be bound by the terms and conditions set forth herein.</p>
            </div>
        </div>
        <div id="contract-content">`;
    
    // Send the HTML header
    res.write(`data: ${JSON.stringify({
      html_chunk: htmlHeader,
      progress: "header",
      section: "template",
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    const stream = client.responses
      .stream({
        model: "gpt-4o",
        input: [
          {
            role: "system",
            content: `You are a senior legal contract specialist with 20+ years of experience drafting contracts for Fortune 500 companies. Generate the FIRST 3-4 sections of a professional legal contract (like the beginning of a 10+ page contract) that match the quality and depth of contracts from top-tier law firms like Skadden, Sullivan & Cromwell, or major corporations like Microsoft, Google, and Zoom.

FORMAT REQUIREMENTS:
- Use ultra-short titles (2-3 words max) to save tokens
- Structure: n:1, t:Title, ss:[{n:"1.1", t:"Subtitle", c:"Content", l:["(i) item", "(ii) item"]}]
- Generate ONLY 3-4 comprehensive sections (this is just the beginning)
- Include detailed legal content like a real contract

CONTENT GUIDELINES:
- Generate COMPLETE LEGAL CLAUSES, not descriptive text or summaries
- Use professional legal language exactly like real contracts
- Include SPECIFIC legal obligations, rights, and conditions
- Use (i), (ii), (iii) for numbered legal provisions
- Structure: Numbered sections (1, 2, 3...) and subsections (1.1, 1.2...)
- Make it look like the beginning of a real, professional legal contract

REQUIRED CONTRACT STRUCTURE (FIRST 3-4 SECTIONS ONLY):
1. DEFINITIONS: Complete legal definitions with specific scope and applicability
2. PARTIES: Detailed identification and obligations of all parties involved
3. SERVICES: Specific performance requirements, timelines, and standards
4. TERMS: Key rules, restrictions, and compliance requirements

CONTENT DEPTH REQUIREMENTS:
- Each subsection (c field) must contain 3-4 sentences of SPECIFIC legal clauses
- Include concrete obligations: "User shall maintain the confidentiality of their account credentials. User agrees to notify Company immediately of any unauthorized access. User acknowledges that sharing account access violates this Agreement."
- Use enforceable legal language with specific terms and conditions
- Make each subsection contain enough legal substance to be enforceable in court
- Content should be the actual legal terms with specific obligations, rights, and consequences

LEGAL LANGUAGE REQUIREMENTS:
- Use professional legal terminology: "shall", "herein", "thereof", "pursuant to", "subject to"
- Include specific legal clauses: "User acknowledges and agrees that...", "Company reserves the right to...", "User shall be responsible for..."
- Use precise legal language: "immediate termination", "written notice", "breach of this Agreement"
- Include specific consequences: "shall result in immediate termination", "shall be liable for damages", "shall indemnify and hold harmless"

IMPORTANT: STOP after these 4 sections - this is just the beginning of the full contract. Focus on QUALITY over quantity. Make these first sections look like the authentic beginning of a major corporate contract.

OUTPUT FORMAT: Follow the Zod schema exactly with n (number), t (title), ss (subsections), c (COMPLETE legal clauses with 3-4 sentences of specific obligations, not descriptive text), l (specific legal provisions). Generate the beginning of a professional legal contract with enforceable legal clauses that could actually be used in court by a major corporation.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: zodTextFormat(ContractSchema, "contract"),
        },
      })
      .on("response.output_text.delta", (event) => {
        // Accumuler les chunks dans le buffer
        chunkBuffer += event.delta;
        
        const currentTime = Date.now();
        let shouldSend = false;
        let chunkType = 'partial';
        
        // Logique intelligente : envoyer si phrase complète, mot complet, ou timeout
        if (isSentenceComplete(chunkBuffer)) {
          shouldSend = true;
          chunkType = 'sentence';
        } else if (isWordComplete(chunkBuffer)) {
          shouldSend = true;
          chunkType = 'word';
        } else if (chunkBuffer.length >= CHUNK_BUFFER_SIZE) {
          shouldSend = true;
          chunkType = 'size_limit';
        } else if ((currentTime - lastSentTime) >= MAX_BUFFER_TIME) {
          shouldSend = true;
          chunkType = 'timeout';
        }
        
        if (shouldSend && chunkBuffer.trim().length > 0) {
          // Envoyer le buffer accumulé
          res.write(`data: ${JSON.stringify({
            html_chunk: chunkBuffer,
            raw_chunk: chunkBuffer,
            section: "contract",
            progress: "streaming",
            timestamp: new Date().toISOString(),
            buffer_size: chunkBuffer.length,
            chunk_type: chunkType
          })}\n\n`);
          
          // Réinitialiser le buffer
          chunkBuffer = '';
          lastSentTime = currentTime;
        }
      })
      .on("response.output_text.done", (event) => {
        // Envoyer le reste du buffer s'il y en a
        if (chunkBuffer.length > 0) {
          res.write(`data: ${JSON.stringify({
            html_chunk: chunkBuffer,
            raw_chunk: chunkBuffer,
            section: "contract",
            progress: "streaming",
            timestamp: new Date().toISOString(),
            buffer_size: chunkBuffer.length
          })}\n\n`);
        }
        
        // Handle completion
        try {
          const validated = event.text;
          
          // Convert the complete contract to HTML content (without header/footer)
          const htmlContent = convertCompactContractToHTMLContent(validated);
          
          // Send the contract content
          res.write(`data: ${JSON.stringify({
            html_chunk: htmlContent,
            section: "content",
            progress: "content",
            timestamp: new Date().toISOString(),
            data: validated
          })}\n\n`);
          
          // Send the HTML footer
          const htmlFooter = `
        </div>
        <div class="contract-footer">
            <p class="footer-text">This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, representations, and understandings.</p>
            <p class="footer-signature">By using our services, you acknowledge that you have read, understood, and agree to be bound by this Agreement.</p>
        </div>
    </div>
</body>
</html>`;
          
          res.write(`data: ${JSON.stringify({
            html_chunk: htmlFooter,
            section: "footer",
            progress: "complete",
            timestamp: new Date().toISOString(),
            html: htmlHeader + htmlContent + htmlFooter
          })}\n\n`);
          
        } catch (parseError) {
          res.write(`data: ${JSON.stringify({
            html_chunk: "PARSE_ERROR",
            section: "error",
            progress: "failed",
            timestamp: new Date().toISOString(),
            error: parseError.message
          })}\n\n`);
        }
        
        res.end();
      })
      .on("error", (error) => {
        res.write(`data: ${JSON.stringify({
          html_chunk: "OPENAI_ERROR",
          section: "error", 
          progress: "failed",
          timestamp: new Date().toISOString(),
          error: error.message
        })}\n\n`);
        res.end();
      });

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      html_chunk: "OPENAI_ERROR",
      section: "error", 
      progress: "failed",
      timestamp: new Date().toISOString(),
      error: error.message
    })}\n\n`);
    res.end();
  }
}

/**
 * Parse contract text to structured format (fallback method)
 */
function parseContractText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith('S:')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        section: line.substring(2).trim(),
        content: ''
      };
    } else if (line.startsWith('SS:') && currentSection) {
      currentSection.subsection = line.substring(3).trim();
    } else if (line.startsWith('C:') && currentSection) {
      currentSection.content = line.substring(2).trim();
    } else if (line.startsWith('(') && currentSection) {
      if (!currentSection.listItems) currentSection.listItems = [];
      currentSection.listItems.push(line.trim());
    } else if (currentSection && line.trim()) {
      currentSection.content += '\n' + line.trim();
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

export {
  convertCompactContractToHTML,
  convertCompactContractToHTMLContent,
  expandCompactTitle, parseContractText,
  streamContract
};

