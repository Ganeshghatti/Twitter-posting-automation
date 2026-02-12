const { Ollama } = require('ollama');

// Initialize Ollama client
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
});

/**
 * Generate tweet content using Ollama
 * @param {object} knowledgeBase - Selected knowledge base item
 * @param {object} postType - Selected twitter post type
 * @returns {Promise<string>} Generated tweet content
 */
async function generateTweetContent(knowledgeBase, postType) {
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  
  const systemPrompt = `You are an expert AI content creator specializing in Twitter posts about AI engineering and production systems. Your tweets are:
- Technically accurate
- Engaging and thought-provoking
- Written in a conversational tone
- Include relevant emojis sparingly
- NO hashtags unless specifically requested

Generate ONLY the tweet text, nothing else.`;

  const userPrompt = `Create a Twitter post using this knowledge and structure:

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

Generate a compelling tweet that follows the "${postType.name}" format and incorporates the knowledge about "${knowledgeBase.topic}"`;

  try {
    console.log('🤖 Generating tweet with Ollama...');
    console.log('Model:', model);
    console.log('Topic:', knowledgeBase.topic);
    console.log('Post Type:', postType.name);

    const response = await ollama.generate({
      model: model,
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    });

    const generatedText = response.response.trim();

    console.log('✅ Tweet generated successfully');
    console.log('Length:', generatedText.length, 'characters');
    
    return generatedText;
  } catch (error) {
    console.error('❌ Error generating tweet with Ollama:', error.message);
    throw error;
  }
}

/**
 * Check if Ollama is running and model is available
 * @returns {Promise<boolean>}
 */
async function checkOllamaHealth() {
  try {
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    const models = await ollama.list();
    const isModelAvailable = models.models.some(m => m.name.includes(model.split(':')[0]));
    
    if (!isModelAvailable) {
      console.log(`⚠️ Model "${model}" not found. Available models:`, 
        models.models.map(m => m.name).join(', '));
      return false;
    }
    
    console.log(`✅ Ollama is healthy. Model "${model}" is available.`);
    return true;
  } catch (error) {
    console.error('❌ Ollama health check failed:', error.message);
    return false;
  }
}

module.exports = {
  generateTweetContent,
  checkOllamaHealth
};
