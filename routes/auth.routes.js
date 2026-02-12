const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

module.exports = (oauth, CALLBACK_URL) => {
  // Step 1: Initiate OAuth flow - Get request token
  router.get('/twitter', (req, res) => {
    authController.initiateOAuth(req, res, oauth, CALLBACK_URL);
  });

  // Step 3: Handle callback and exchange for access tokens
  router.get('/twitter/callback', (req, res) => {
    authController.handleCallback(req, res, oauth);
  });

  return router;
};
