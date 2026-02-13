const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { runSinglePost } = require('../services/scheduler.service');

module.exports = (oauth) => {
  // Post a demo tweet
  router.get('/demo-tweet', (req, res) => {
    postController.postDemoTweet(req, res, oauth);
  });

  // Full AI flow: generate 1 tweet with Ollama + post to X
  router.get('/ai', async (req, res) => {
    try {
      const result = await runSinglePost(oauth);
      res.json({
        success: result.posted,
        posted: result.posted,
        tweet_id: result.tweet_id,
        content: result.tweet,
        metadata: result.metadata,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        posted: false,
        error: error.message
      });
    }
  });

  // Post a custom tweet
  router.post('/tweet', (req, res) => {
    postController.postCustomTweet(req, res, oauth);
  });

  return router;
};
