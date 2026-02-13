const fs = require('fs');
const path = require('path');
const { runTweetGraph } = require('../graph/tweetGraph');
const { loadKnowledgeBase, getRandomItem } = require('./knowledgeBaseLoader');

/**
 * Generate a single tweet using LangGraph (Generator → Critique agents).
 * Returns final tweet and metadata; may run up to MAX_ITERATIONS if critique requests revisions.
 * @returns {Promise<{tweet: string, metadata: object, critiqueResult?: object, approved?: boolean, iterations?: number}>}
 */
async function generateSingleTweet() {
  console.log('\n📝 Running LangGraph (Generator → Critique)...');
  const result = await runTweetGraph();
  const metadata = {
    ...result.metadata,
    critique_approved: result.approved,
    critique_iterations: result.iterations,
    critique_scores: result.critiqueResult ? {
      authenticity: result.critiqueResult.authenticity_score,
      hook: result.critiqueResult.hook_score,
      formatting: result.critiqueResult.formatting_score,
      content_value: result.critiqueResult.content_value_score,
      overall: result.critiqueResult.overall_score
    } : null
  };
  return {
    tweet: result.tweet,
    metadata,
    critiqueResult: result.critiqueResult,
    approved: result.approved,
    iterations: result.iterations
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
