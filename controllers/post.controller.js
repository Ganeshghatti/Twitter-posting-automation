const axios = require('axios');

// Direct function to post a tweet (used by scheduler)
const postTweetDirect = async (oauth, consumerKey, consumerSecret, accessToken, accessTokenSecret, text) => {
  const token = {
    key: accessToken,
    secret: accessTokenSecret
  };

  const request_data = {
    url: 'https://api.x.com/2/tweets',
    method: 'POST'
  };

  const authHeader = oauth.toHeader(oauth.authorize(request_data, token));

  const response = await axios.post(request_data.url,
    { text },
    {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

// Controller to post a demo tweet
const postDemoTweet = async (req, res, oauth) => {
  try {
    const result = await postTweetDirect(
      oauth,
      process.env.CONSUMER_KEY,
      process.env.CONSUMER_KEY_SECRET,
      process.env.ACCESS_TOKEN,
      process.env.ACCESS_TOKEN_SECRET,
      `Hello from X API with OAuth 1.0a! Posted at ${new Date().toLocaleString()}`
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
};

// Controller to post a custom tweet
const postCustomTweet = async (req, res, oauth) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Tweet text is required',
        example: { text: 'Your tweet content here' }
      });
    }

    if (!process.env.ACCESS_TOKEN || !process.env.ACCESS_TOKEN_SECRET) {
      return res.status(500).json({
        error: 'Access tokens not configured',
        message: 'Please complete the OAuth flow first at /auth/twitter'
      });
    }

    const result = await postTweetDirect(
      oauth,
      process.env.CONSUMER_KEY,
      process.env.CONSUMER_KEY_SECRET,
      process.env.ACCESS_TOKEN,
      process.env.ACCESS_TOKEN_SECRET,
      text
    );

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  postDemoTweet,
  postCustomTweet,
  postTweetDirect
};
