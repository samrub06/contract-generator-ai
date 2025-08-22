// Basic contract types for MVP - Simple structure first
const ContractTypes = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  NDA: 'nda'
};

// Simple contract structure
const ContractStructure = {
  title: String,
  sections: Array,
  metadata: Object
};

// Basic section structure
const Section = {
  heading: String,
  content: String,
  order: Number
};

// Simple AI response
const AIResponse = {
  content: String,
  section: String,
  success: Boolean
};

export {
    AIResponse, ContractStructure, ContractTypes, Section
};
