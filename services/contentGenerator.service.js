const fs = require('fs');
const path = require('path');
const { generateTweetContent } = require('./ollama.service');

/**
 * Get random item from array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Load knowledge base from JSON file
 */
function loadKnowledgeBase() {
  const filePath = path.join(__dirname, '..', 'ai_production_knowledge_base.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Generate a single tweet
 * @returns {Promise<{tweet: string, metadata: object}>}
 */
async function generateSingleTweet() {
  const data = loadKnowledgeBase();
  
  // Pick random knowledge base and post type
  const knowledgeBase = getRandomItem(data.knowledge_base);
  const postType = getRandomItem(data.twitter_post_types);
  
  console.log('\n📝 Generating tweet...');
  console.log('Knowledge:', knowledgeBase.topic);
  console.log('Post Type:', postType.name);
  
  const tweetContent = await generateTweetContent(knowledgeBase, postType);
  
  return {
    tweet: tweetContent,
    metadata: {
      knowledge_id: knowledgeBase.id,
      knowledge_topic: knowledgeBase.topic,
      post_type_id: postType.type_id,
      post_type_name: postType.name,
      generated_at: new Date().toISOString(),
      character_count: tweetContent.length
    }
  };
}

/**
 * Generate multiple tweets
 * @param {number} count - Number of tweets to generate
 * @returns {Promise<Array>}
 */
async function generateMultipleTweets(count = 2) {
  const tweets = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const result = await generateSingleTweet();
      tweets.push(result);
      
      // Add delay between generations to avoid overwhelming Ollama
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Failed to generate tweet ${i + 1}:`, error.message);
      tweets.push({
        tweet: null,
        error: error.message,
        metadata: {
          generated_at: new Date().toISOString(),
          failed: true
        }
      });
    }
  }
  
  return tweets;
}

/**
 * Log generated tweets to file
 */
function logTweets(tweets, posted = false) {
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'generated_tweets.json');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  let logs = [];
  if (fs.existsSync(logFile)) {
    try {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch (e) {
      logs = [];
    }
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    tweets: tweets,
    posted: posted,
    success_count: tweets.filter(t => t.tweet).length,
    failed_count: tweets.filter(t => !t.tweet).length
  };
  
  logs.push(logEntry);
  
  // Keep only last 100 entries
  if (logs.length > 100) {
    logs = logs.slice(-100);
  }
  
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log('📄 Tweets logged to:', logFile);
}

module.exports = {
  generateSingleTweet,
  generateMultipleTweets,
  logTweets,
  loadKnowledgeBase
};
