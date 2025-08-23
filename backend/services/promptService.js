/**
 * Optimized Terms of Service prompt service with intelligent chunking
 * Generates chunks of 4 sections to save API calls and reduce costs
 */

function generateToSChunkPrompt(userPrompt, startSection, chunkSize = 4) {
  const sectionNames = [
    "Definitions & Scope",
    "Services & Usage", 
    "User Obligations",
    "Intellectual Property",
    "Privacy & Data",
    "Limitation of Liability",
    "Indemnification",
    "Termination",
    "Governing Law",
    "Miscellaneous"
  ];

  const currentChunkSections = sectionNames.slice(startSection - 1, startSection - 1 + chunkSize);
  
  return `Generate Terms of Service for: ${userPrompt}

INSTRUCTIONS:
- Generate ${chunkSize} consecutive sections starting from Section ${startSection}
- Use ultra-compact format to save tokens
- Each section should be different and legally comprehensive
- Focus on: ${currentChunkSections.join(', ')}

REQUIRED JSON FORMAT (${chunkSize} sections at once):
{
  "sections": [
    {
      "n": ${startSection},
      "t": "Title",
      "ss": [
        {
          "n": "${startSection}.1",
          "t": "Subtitle",
          "c": "Legal content...",
          "l": ["(i) item", "(ii) item"] or null
        }
      ]
    },
    {
      "n": ${startSection + 1},
      "t": "Title",
      "ss": [
        {
          "n": "${startSection + 1}.1",
          "t": "Subtitle", 
          "c": "Legal content...",
          "l": ["(i) item", "(ii) item"] or null
        }
      ]
    }
    // ... continue for ${chunkSize} sections
  ]
}

TOKEN OPTIMIZATION:
- Use abbreviations: "Def" for Definitions, "IP" for Intellectual Property
- Keep titles under 3 words
- Use short legal terms
- Minimize redundant language
- Each section should be 800-1200 tokens max

IMPORTANT: Return ONLY valid JSON format with ${chunkSize} sections. Generate sections ${startSection} to ${startSection + chunkSize - 1}.`;
}

export {
  generateToSChunkPrompt
};

