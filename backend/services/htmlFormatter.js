/**
 * Simple HTML formatter for contract sections
 */

function formatContractToHTML(contractData) {
  let html = '<div class="contract">';
  
  contractData.forEach((section, index) => {
    html += `<div class="section" id="section-${index}">`;
    
    // Section header
    html += `<h2 class="section-title">${section.section}</h2>`;
    
    // Subsection if exists
    if (section.subsection) {
      html += `<h3 class="subsection-title">${section.subsection}</h3>`;
    }
    
    // Content
    if (section.content) {
      html += `<div class="content">${section.content.replace(/\n/g, '<br>')}</div>`;
    }
    
    // List items if exists
    if (section.listItems && section.listItems.length > 0) {
      html += '<ol class="list-items">';
      section.listItems.forEach(item => {
        html += `<li>${item}</li>`;
      });
      html += '</ol>';
    }
    
    html += '</div>';
  });
  
  html += '</div>';
  return html;
}

module.exports = {
  formatContractToHTML
}; 