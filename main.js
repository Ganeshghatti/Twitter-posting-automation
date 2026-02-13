require('dotenv').config();
const express = require('express');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const { renderTemplate } = require('./utils/htmlRenderer');

const app = express();
const PORT = process.env.PORT || 3000;
const CALLBACK_URL = `http://localhost:${PORT}/auth/twitter/callback`;

// Middleware
app.use(express.json());

// Initialize OAuth 1.0a
const oauth = OAuth({
  consumer: { 
    key: process.env.CONSUMER_KEY, 
    secret: process.env.CONSUMER_KEY_SECRET 
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) { 
    return crypto.createHmac('sha1', key).update(base_string).digest('base64'); 
  }
});

// Import routes
const authRoutes = require('./routes/auth.routes')(oauth, CALLBACK_URL);
const postRoutes = require('./routes/post.routes')(oauth);

// Use routes
app.use('/auth', authRoutes);
app.use('/post', postRoutes);

// Home page with instructions
app.get('/', (req, res) => {
  const html = renderTemplate('index.html', {
    CALLBACK_URL: CALLBACK_URL
  });
  res.send(html);
});

// Test route
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    port: PORT,
    callback_url: CALLBACK_URL,
    routes: {
      auth: ['/auth/twitter', '/auth/twitter/callback'],
      post: ['/post/demo-tweet', 'GET /post/ai', 'POST /post/tweet']
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`=================================\n`);
  console.log(`Available routes:`);
  console.log(`  • Home: http://localhost:${PORT}/`);
  console.log(`  • Test: http://localhost:${PORT}/test`);
  console.log(`  • OAuth: http://localhost:${PORT}/auth/twitter`);
  console.log(`  • Post: http://localhost:${PORT}/post/demo-tweet`);
  console.log(`  • AI post: GET http://localhost:${PORT}/post/ai`);
  console.log(`  • Custom: POST http://localhost:${PORT}/post/tweet`);
  console.log(`\n=================================\n`);
  
  // Initialize automated scheduler
  const { initializeScheduler } = require('./services/scheduler.service');
  initializeScheduler(oauth);
  
  console.log('🤖 Automated posting scheduler is ACTIVE');
  console.log('📅 Posting 2 tweets at: 9 AM, 12 PM, 5 PM, 8 PM, 11 PM');
  console.log('📈 Total: 10 tweets per day\n');
});
