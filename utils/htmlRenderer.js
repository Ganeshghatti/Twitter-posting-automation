const fs = require('fs');
const path = require('path');

/**
 * Render HTML template with dynamic data
 * @param {string} templateName - Name of the HTML file in views folder
 * @param {object} data - Data to replace in template
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, data = {}) {
  const templatePath = path.join(__dirname, '..', 'views', templateName);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(placeholder, data[key] || '');
  });
  
  return html;
}

module.exports = { renderTemplate };
