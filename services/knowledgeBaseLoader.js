const fs = require('fs');
const path = require('path');

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadKnowledgeBase() {
  const filePath = path.join(__dirname, '..', 'ai_production_knowledge_base.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

module.exports = { loadKnowledgeBase, getRandomItem };
