const axios = require('axios');
const { renderTemplate } = require('../utils/htmlRenderer');

// Store for temporary OAuth tokens (in production, use a database)
const oauthTokenStore = {};

// Step 1: POST oauth/request_token - Get request token
const initiateOAuth = async (req, res, oauth, CALLBACK_URL) => {
  try {
    console.log('Step 1: Requesting OAuth token...');
    
    const request_data = {
      url: 'https://api.x.com/oauth/request_token',
      method: 'POST'
    };

    // Add oauth_callback to the authorization
    const authHeader = oauth.toHeader(oauth.authorize(request_data, null, {
      oauth_callback: CALLBACK_URL
    }));

    console.log('Auth Header:', authHeader);

    const response = await axios.post(request_data.url, null, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Step 1 Response:', response.data);

    // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy&oauth_callback_confirmed=true)
    const params = new URLSearchParams(response.data);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');
    const callbackConfirmed = params.get('oauth_callback_confirmed');

    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Failed to get oauth_token from response');
    }

    if (callbackConfirmed !== 'true') {
      throw new Error('Callback was not confirmed');
    }

    // Store the token secret temporarily (needed for Step 3)
    oauthTokenStore[oauthToken] = oauthTokenSecret;
    console.log('Stored token:', oauthToken);

    // Step 2: Redirect user to GET oauth/authorize
    const authorizeUrl = `https://api.x.com/oauth/authorize?oauth_token=${oauthToken}`;
    console.log('Redirecting to:', authorizeUrl);
    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('Error in Step 1:', error.response?.data || error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate OAuth flow',
      details: error.response?.data || error.message,
      stack: error.stack
    });
  }
};

// Step 3: POST oauth/access_token - Exchange request token for access tokens
const handleCallback = async (req, res, oauth) => {
  try {
    console.log('Step 3: Callback received');
    const { oauth_token, oauth_verifier } = req.query;
    console.log('oauth_token:', oauth_token);
    console.log('oauth_verifier:', oauth_verifier);

    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({ error: 'Missing oauth_token or oauth_verifier' });
    }

    // Retrieve the token secret from Step 1
    const oauthTokenSecret = oauthTokenStore[oauth_token];
    if (!oauthTokenSecret) {
      return res.status(400).json({ 
        error: 'Invalid oauth_token',
        message: 'Token not found in store. The OAuth flow may have expired.' 
      });
    }

    console.log('Token secret retrieved from store');

    const token = {
      key: oauth_token,
      secret: oauthTokenSecret
    };

    // Build URL with oauth_verifier as query parameter
    const request_data = {
      url: `https://api.x.com/oauth/access_token?oauth_verifier=${oauth_verifier}`,
      method: 'POST'
    };

    const authHeader = oauth.toHeader(oauth.authorize(request_data, token));

    console.log('Auth Header for Step 3:', authHeader);
    console.log('Request URL:', request_data.url);

    const response = await axios.post(request_data.url, null, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Step 3 Response:', response.data);

    // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy&user_id=zzz&screen_name=aaa)
    const params = new URLSearchParams(response.data);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to get access tokens from response');
    }

    // Clean up temporary storage
    delete oauthTokenStore[oauth_token];
    console.log('OAuth flow completed successfully');

    // Render the success page with tokens
    const html = renderTemplate('oauth-success.html', {
      SCREEN_NAME: screenName,
      USER_ID: userId,
      ACCESS_TOKEN: accessToken,
      ACCESS_TOKEN_SECRET: accessTokenSecret
    });

    res.send(html);
  } catch (error) {
    console.error('Error in Step 3:', error.response?.data || error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to exchange tokens',
      details: error.response?.data || error.message,
      stack: error.stack
    });
  }
};

module.exports = {
  initiateOAuth,
  handleCallback
};
