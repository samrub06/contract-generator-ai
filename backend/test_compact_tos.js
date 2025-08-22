/**
 * Test file for compact contract generation
 * Tests the new ultra-compact format and HTML conversion for any contract type
 */

import { convertCompactContractToHTML, expandCompactTitle } from './services/openaiService.js';

// Test data simulating OpenAI output for different contract types
const testContracts = {
  // Terms of Service example
  tos: {
    "sections": [
      {
        "n": 1,
        "t": "Def",
        "ss": [
          {
            "n": "1.1",
            "t": "Scope",
            "c": "These Terms of Service govern your use of our AI contract generation service.",
            "l": ["(i) Service includes contract creation and HTML formatting", "(ii) Users must be 18+ or have parental consent"]
          }
        ]
      }
    ]
  },
  
  // NDA example
  nda: {
    "sections": [
      {
        "n": 1,
        "t": "ConfInfo",
        "ss": [
          {
            "n": "1.1",
            "t": "Definition",
            "c": "Confidential information includes all proprietary and sensitive business information.",
            "l": ["(i) Technical specifications", "(ii) Business strategies", "(iii) Customer data"]
          }
        ]
      }
    ]
  },
  
  // Employment contract example
  employment: {
    "sections": [
      {
        "n": 1,
        "t": "Emp",
        "ss": [
          {
            "n": "1.1",
            "t": "Position",
            "c": "Employee will serve as Senior Software Developer.",
            "l": ["(i) Full-time position", "(ii) Remote work allowed", "(iii) Reporting to CTO"]
          }
        ]
      }
    ]
  }
};

// Test the HTML conversion for different contract types
console.log('Testing compact contract to HTML conversion...\n');

Object.entries(testContracts).forEach(([contractType, contractData]) => {
  console.log(`=== ${contractType.toUpperCase()} Contract ===`);
  const htmlOutput = convertCompactContractToHTML(contractData);
  console.log('Generated HTML:');
  console.log(htmlOutput);
  console.log('\n' + '='.repeat(50) + '\n');
});

// Test title expansion
console.log('Testing title expansion:');
console.log('Def ->', expandCompactTitle('Def'));
console.log('ConfInfo ->', expandCompactTitle('ConfInfo'));
console.log('Emp ->', expandCompactTitle('Emp'));
console.log('Unknown ->', expandCompactTitle('Unknown'));

console.log('\nTest completed successfully!'); 