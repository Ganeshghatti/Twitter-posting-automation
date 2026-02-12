const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');

module.exports = (oauth) => {
  // Post a demo tweet
  router.get('/demo-tweet', (req, res) => {
    postController.postDemoTweet(req, res, oauth);
  });

  // Post a custom tweet
  router.post('/tweet', (req, res) => {
    postController.postCustomTweet(req, res, oauth);
  });

  return router;
};
