const { Ollama } = require('ollama');

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
});

async function generateTweetContent(knowledgeBase, postType, rewriteDirection = null) {
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const systemPrompt = `You are an expert AI content creator specializing in Twitter posts about AI engineering and production systems. Your tweets are:
- Technically accurate
- Engaging and thought-provoking
- Written in a conversational tone
- Include relevant emojis sparingly
- NO hashtags unless specifically requested

Generate ONLY the tweet text, nothing else.`;

  let userPrompt = `Create a Twitter post using this knowledge and structure:

KNOWLEDGE BASE:
Topic: ${knowledgeBase.topic}
Content: ${knowledgeBase.content}
Key Points: ${knowledgeBase.key_points.join(', ')}

POST TYPE: ${postType.name}
Description: ${postType.description}
Structure: ${JSON.stringify(postType.structure, null, 2)}
Tone: ${postType.characteristics.tone}
Length: ${postType.characteristics.length}

Elements to include:
${postType.elements_to_include.join('\n')}

Generate a compelling tweet that follows the "${postType.name}" format and incorporates the knowledge about "${knowledgeBase.topic}".`;

  if (rewriteDirection) {
    userPrompt += `\n\nCRITIQUE FEEDBACK - apply these changes:\n${rewriteDirection}`;
  }

  const response = await ollama.generate({
    model,
    prompt: userPrompt,
    system: systemPrompt,
    stream: false,
    options: { temperature: 0.7, top_p: 0.9, max_tokens: 1000 }
  });

  return response.response.trim();
}

async function callOllama(systemPrompt, userPrompt, options = {}) {
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const response = await ollama.generate({
    model,
    prompt: userPrompt,
    system: systemPrompt,
    stream: false,
    options: { temperature: 0.3, max_tokens: 1500, ...options }
  });
  return response.response.trim();
}

async function checkOllamaHealth() {
  try {
    const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const models = await ollama.list();
    const isModelAvailable = models.models.some(m => m.name.includes(model.split(':')[0]));
    if (!isModelAvailable) return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateTweetContent,
  callOllama,
  checkOllamaHealth
};
