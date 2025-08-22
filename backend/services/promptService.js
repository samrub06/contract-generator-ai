/**
 * Generic contract prompt service for any type of contract
 * Optimized for ultra-compact format to save tokens
 */

function generateContractPrompt(userPrompt) {
  return `Generate a professional legal contract in ultra-compact format. The contract type and structure will depend on the user's request.

REQUIRED FORMAT (follow exactly):
{
  "sections": [
    {
      "n": 1,
      "t": "Title",
      "ss": [
        {
          "n": "1.1",
          "t": "Subtitle",
          "c": "Content description",
          "l": ["(i) List item", "(ii) Another item"]
        }
      ]
    }
  ]
}

CONTRACT STRUCTURE GUIDELINES:
- Use ultra-short titles (2-3 words max) to save tokens
- Structure with numbered sections (1, 2, 3...) and subsections (1.1, 1.2...)
- Include relevant sections based on contract type
- Use (i), (ii), (iii) for numbered lists
- Keep content legally comprehensive but concise

COMMON CONTRACT SECTIONS (adapt based on type):
- Definitions/Scope
- Parties involved
- Services/obligations
- Terms and conditions
- Intellectual property
- Liability/indemnification
- Termination
- Governing law
- Signatures/effective date

User request: ${userPrompt}

Generate a complete, legally sound contract following this exact structure. Adapt the content and sections to match the specific contract type requested.`;
}

export {
  generateContractPrompt
};
