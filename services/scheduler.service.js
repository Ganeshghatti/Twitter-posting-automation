const cron = require('node-cron');
const { generateMultipleTweets, logTweets } = require('./contentGenerator.service');
const { checkOllamaHealth } = require('./ollama.service');
const postController = require('../controllers/post.controller');

// Store scheduled jobs
const scheduledJobs = [];

/**
 * Post generated tweets
 */
async function postGeneratedTweets(tweets, oauth) {
  const results = [];
  
  for (const tweetData of tweets) {
    if (!tweetData.tweet) {
      results.push({
        ...tweetData,
        posted: false,
        error: 'No tweet content generated'
      });
      continue;
    }
    
    try {
      console.log('\n🐦 Posting tweet to X...');
      console.log('Content:', tweetData.tweet);
      
      const response = await postController.postTweetDirect(
        oauth,
        process.env.CONSUMER_KEY,
        process.env.CONSUMER_KEY_SECRET,
        process.env.ACCESS_TOKEN,
        process.env.ACCESS_TOKEN_SECRET,
        tweetData.tweet
      );
      
      results.push({
        ...tweetData,
        posted: true,
        tweet_id: response.data?.id,
        response: response
      });
      
      console.log('✅ Tweet posted successfully!');
      console.log('Tweet ID:', response.data?.id);
      
      // Wait between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('❌ Failed to post tweet:', error.message);
      results.push({
        ...tweetData,
        posted: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Automated job that runs at scheduled times
 */
async function automatedPostingJob(oauth) {
  const timestamp = new Date().toLocaleString();
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AUTOMATED POSTING JOB STARTED');
  console.log('Time:', timestamp);
  console.log('='.repeat(60));
  
  try {
    // Check Ollama health
    const isHealthy = await checkOllamaHealth();
    if (!isHealthy) {
      console.error('❌ Ollama is not available. Skipping this run.');
      return;
    }
    
    // Generate 2 tweets
    console.log('\n📝 Generating 2 tweets...');
    const tweets = await generateMultipleTweets(2);
    
    console.log(`\n✅ Generated ${tweets.filter(t => t.tweet).length} tweets successfully`);
    
    // Display generated tweets
    tweets.forEach((t, i) => {
      if (t.tweet) {
        console.log(`\n--- Tweet ${i + 1} ---`);
        console.log(t.tweet);
        console.log(`Topic: ${t.metadata.knowledge_topic}`);
        console.log(`Type: ${t.metadata.post_type_name}`);
        console.log(`Length: ${t.metadata.character_count} chars`);
      }
    });
    
    // Post tweets to X
    console.log('\n🚀 Posting tweets to X...');
    const results = await postGeneratedTweets(tweets, oauth);
    
    // Log results
    logTweets(results, true);
    
    const successCount = results.filter(r => r.posted).length;
    const failedCount = results.filter(r => !r.posted).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 JOB SUMMARY');
    console.log(`✅ Successfully posted: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('Time:', new Date().toLocaleString());
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Automated posting job failed:', error.message);
    console.error(error.stack);
  }
}

/**
 * Initialize cron scheduler
 */
function initializeScheduler(oauth) {
  console.log('\n🕐 Initializing automated posting scheduler...');
  
  const schedules = [
    { time: '0 9 * * *', label: '9:00 AM' },    // 9 AM
    { time: '0 12 * * *', label: '12:00 PM' },  // 12 PM (noon)
    { time: '0 17 * * *', label: '5:00 PM' },   // 5 PM
    { time: '0 20 * * *', label: '8:00 PM' },   // 8 PM
    { time: '0 23 * * *', label: '11:00 PM' }   // 11 PM
  ];
  
  schedules.forEach(({ time, label }) => {
    const job = cron.schedule(time, () => {
      automatedPostingJob(oauth);
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    });
    
    scheduledJobs.push({ time, label, job });
    console.log(`✅ Scheduled: ${label} (${time})`);
  });
  
  console.log(`\n🎯 Total scheduled jobs: ${scheduledJobs.length}`);
  console.log(`📅 Timezone: ${process.env.TIMEZONE || 'Asia/Kolkata'}`);
  console.log(`🐦 Posts per run: 2 tweets`);
  console.log(`📈 Total daily posts: ${scheduledJobs.length * 2} tweets\n`);
  
  return scheduledJobs;
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
  scheduledJobs.forEach(({ label, job }) => {
    job.stop();
    console.log(`⏸️ Stopped: ${label}`);
  });
  console.log('All scheduled jobs stopped.');
}

/**
 * Run full content-creation flow once: generate 1 tweet with Ollama and post to X.
 * Used by GET /post/ai route.
 */
async function runSinglePost(oauth) {
  const isHealthy = await checkOllamaHealth();
  if (!isHealthy) {
    throw new Error('Ollama is not available. Start it with: systemctl start ollama');
  }

  const [tweetData] = await generateMultipleTweets(1);
  if (!tweetData.tweet) {
    throw new Error(tweetData.error || 'Failed to generate tweet');
  }

  const [result] = await postGeneratedTweets([tweetData], oauth);
  logTweets([result], true);
  return result;
}

/**
 * Manual test run (not posted to X)
 */
async function testGeneration() {
  console.log('\n🧪 TEST MODE - Generating tweets without posting...\n');
  
  const isHealthy = await checkOllamaHealth();
  if (!isHealthy) {
    console.error('❌ Ollama is not available.');
    return;
  }
  
  const tweets = await generateMultipleTweets(2);
  
  tweets.forEach((t, i) => {
    if (t.tweet) {
      console.log(`\n--- Generated Tweet ${i + 1} ---`);
      console.log(t.tweet);
      console.log(`\nTopic: ${t.metadata.knowledge_topic}`);
      console.log(`Type: ${t.metadata.post_type_name}`);
      console.log(`Length: ${t.metadata.character_count} chars`);
    } else {
      console.log(`\n❌ Tweet ${i + 1} failed:`, t.error);
    }
  });
  
  logTweets(tweets, false);
  
  return tweets;
}

module.exports = {
  initializeScheduler,
  stopAllJobs,
  automatedPostingJob,
  runSinglePost,
  testGeneration
};
