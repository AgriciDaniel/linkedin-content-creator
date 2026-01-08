/**
 * LinkedIn OAuth Proxy Server
 *
 * This lightweight server handles LinkedIn OAuth token exchange
 * to bypass CORS restrictions when calling LinkedIn's token endpoint from the browser.
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const https = require('https');
const querystring = require('querystring');

const app = express();
const PORT = process.env.SERVER_PORT || 5001;

// LinkedIn OAuth configuration (must be set via env or API)
let CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
let CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';

// Flag to track if OAuth is configured
let isOAuthConfigured = !!CLIENT_SECRET;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://localhost:5173'],
  credentials: true
}));
// Increase body size limit to handle larger posts (default is 100kb)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LinkedIn OAuth Proxy Server is running' });
});

/**
 * OAuth configuration endpoint
 * POST /api/oauth/config
 *
 * Body: { clientId, clientSecret }
 * Returns: { success: true }
 */
app.post('/api/oauth/config', (req, res) => {
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both clientId and clientSecret are required'
    });
  }

  console.log(`\n→ OAuth configuration updated`);
  console.log(`  Client ID: ${clientId}`);
  console.log(`  Client Secret: ***${clientSecret.slice(-4)}\n`);

  // Update global configuration
  CLIENT_ID = clientId;
  CLIENT_SECRET = clientSecret;
  isOAuthConfigured = true;

  res.json({
    success: true,
    message: 'OAuth configuration saved successfully'
  });
});

/**
 * Get OAuth configuration status
 * GET /api/oauth/status
 */
app.get('/api/oauth/status', (req, res) => {
  res.json({
    configured: isOAuthConfigured,
    clientId: isOAuthConfigured ? CLIENT_ID : null
  });
});

/**
 * Token exchange endpoint
 * POST /api/linkedin/token
 *
 * Body: { code, redirectUri }
 * Returns: { access_token, expires_in }
 */
app.post('/api/linkedin/token', async (req, res) => {
  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both code and redirectUri are required'
    });
  }

  console.log(`\n→ Token exchange request received`);
  console.log(`  Code: ${code.substring(0, 20)}...`);
  console.log(`  Redirect URI: ${redirectUri}`);

  const postData = querystring.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const options = {
    hostname: 'www.linkedin.com',
    port: 443,
    path: '/oauth/v2/accessToken',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.access_token) {
            console.log(`✓ Token exchange successful`);
            console.log(`  Token: ${result.access_token.substring(0, 20)}...`);
            console.log(`  Expires in: ${result.expires_in} seconds (${Math.floor(result.expires_in / 86400)} days)\n`);

            res.json(result);
            resolve();
          } else if (result.error) {
            console.error(`✗ Token exchange failed: ${result.error}`);
            console.error(`  Description: ${result.error_description || 'No description'}\n`);

            res.status(400).json({
              error: result.error,
              message: result.error_description || 'Token exchange failed'
            });
            resolve();
          } else {
            console.error(`✗ Unexpected response: ${data}\n`);

            res.status(500).json({
              error: 'unexpected_response',
              message: 'Unexpected response from LinkedIn'
            });
            resolve();
          }
        } catch (error) {
          console.error(`✗ Failed to parse LinkedIn response: ${error.message}\n`);

          res.status(500).json({
            error: 'parse_error',
            message: 'Failed to parse LinkedIn response'
          });
          resolve();
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Request error: ${error.message}\n`);

      res.status(500).json({
        error: 'request_failed',
        message: error.message
      });
      resolve();
    });

    request.write(postData);
    request.end();
  });
});

/**
 * Get LinkedIn user profile
 * POST /api/linkedin/userinfo
 *
 * Body: { accessToken }
 * Returns: { sub, name, email, picture }
 */
app.post('/api/linkedin/userinfo', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'accessToken is required'
    });
  }

  console.log(`\n→ User profile request received`);
  console.log(`  Token: ${accessToken.substring(0, 20)}...`);

  const options = {
    hostname: 'api.linkedin.com',
    port: 443,
    path: '/v2/userinfo',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.sub) {
            console.log(`✓ User profile fetched successfully`);
            console.log(`  Name: ${result.name || 'N/A'}`);
            console.log(`  Email: ${result.email || 'N/A'}\n`);

            res.json(result);
            resolve();
          } else if (result.error) {
            console.error(`✗ Profile fetch failed: ${result.error}\n`);

            res.status(400).json({
              error: result.error,
              message: result.error_description || 'Failed to fetch user profile'
            });
            resolve();
          } else {
            console.error(`✗ Unexpected response: ${data}\n`);

            res.status(500).json({
              error: 'unexpected_response',
              message: 'Unexpected response from LinkedIn'
            });
            resolve();
          }
        } catch (error) {
          console.error(`✗ Failed to parse LinkedIn response: ${error.message}\n`);

          res.status(500).json({
            error: 'parse_error',
            message: 'Failed to parse LinkedIn response'
          });
          resolve();
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Request error: ${error.message}\n`);

      res.status(500).json({
        error: 'request_failed',
        message: error.message
      });
      resolve();
    });

    request.end();
  });
});

/**
 * LinkedIn API Proxy - Initialize Document Upload
 * POST /api/linkedin/documents/initialize
 *
 * Body: { accessToken, userUrn }
 * Returns: { uploadUrl, documentUrn }
 */
app.post('/api/linkedin/documents/initialize', async (req, res) => {
  const { accessToken, userUrn } = req.body;

  if (!accessToken || !userUrn) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both accessToken and userUrn are required'
    });
  }

  console.log(`\n→ Document upload initialization`);
  console.log(`  User URN: ${userUrn}`);

  const postData = JSON.stringify({
    initializeUploadRequest: {
      owner: userUrn,
    },
  });

  const options = {
    hostname: 'api.linkedin.com',
    port: 443,
    path: '/rest/documents?action=initializeUpload',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202501',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.value) {
            console.log(`✓ Document upload initialized`);
            console.log(`  Upload URL obtained\n`);

            res.json({
              uploadUrl: result.value.uploadUrl,
              documentUrn: result.value.document,
            });
            resolve();
          } else {
            console.error(`✗ Initialization failed: ${data}\n`);
            res.status(response.statusCode).json({
              error: 'initialization_failed',
              message: 'Failed to initialize document upload',
              details: result
            });
            resolve();
          }
        } catch (error) {
          console.error(`✗ Parse error: ${error.message}\n`);
          res.status(500).json({
            error: 'parse_error',
            message: 'Failed to parse LinkedIn response'
          });
          resolve();
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Request error: ${error.message}\n`);
      res.status(500).json({
        error: 'request_failed',
        message: error.message
      });
      resolve();
    });

    request.write(postData);
    request.end();
  });
});

/**
 * LinkedIn API Proxy - Upload Document
 * PUT /api/linkedin/documents/upload
 *
 * Body: binary PDF data
 * Headers: accessToken, uploadUrl
 */
app.put('/api/linkedin/documents/upload', async (req, res) => {
  const accessToken = req.headers['x-access-token'];
  const uploadUrl = req.headers['x-upload-url'];

  if (!accessToken || !uploadUrl) {
    return res.status(400).json({
      error: 'Missing required headers',
      message: 'x-access-token and x-upload-url headers are required'
    });
  }

  console.log(`\n→ Uploading document to LinkedIn`);

  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);

    const url = new URL(uploadUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
      },
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          console.log(`✓ Document uploaded successfully\n`);
          res.status(response.statusCode).send(data);
        } else {
          console.error(`✗ Upload failed: ${response.statusCode}\n`);
          res.status(response.statusCode).json({
            error: 'upload_failed',
            message: `Upload failed with status ${response.statusCode}`,
            details: data
          });
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Upload error: ${error.message}\n`);
      res.status(500).json({
        error: 'upload_error',
        message: error.message
      });
    });

    request.write(pdfBuffer);
    request.end();
  });
});

/**
 * LinkedIn API Proxy - Initialize Image Upload
 * POST /api/linkedin/images/initialize
 *
 * Body: { accessToken, userUrn }
 * Returns: { uploadUrl, imageUrn }
 */
app.post('/api/linkedin/images/initialize', async (req, res) => {
  const { accessToken, userUrn } = req.body;

  if (!accessToken || !userUrn) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both accessToken and userUrn are required'
    });
  }

  console.log(`\n→ Image upload initialization`);
  console.log(`  User URN: ${userUrn}`);

  const postData = JSON.stringify({
    initializeUploadRequest: {
      owner: userUrn,
    },
  });

  const options = {
    hostname: 'api.linkedin.com',
    port: 443,
    path: '/rest/images?action=initializeUpload',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202501',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.value) {
            console.log(`✓ Image upload initialized`);
            console.log(`  Upload URL obtained\n`);

            res.json({
              uploadUrl: result.value.uploadUrl,
              imageUrn: result.value.image,
            });
            resolve();
          } else {
            console.error(`✗ Initialization failed: ${data}\n`);
            res.status(response.statusCode).json({
              error: 'initialization_failed',
              message: 'Failed to initialize image upload',
              details: result
            });
            resolve();
          }
        } catch (error) {
          console.error(`✗ Parse error: ${error.message}\n`);
          res.status(500).json({
            error: 'parse_error',
            message: 'Failed to parse LinkedIn response'
          });
          resolve();
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Request error: ${error.message}\n`);
      res.status(500).json({
        error: 'request_failed',
        message: error.message
      });
      resolve();
    });

    request.write(postData);
    request.end();
  });
});

/**
 * LinkedIn API Proxy - Upload Image
 * PUT /api/linkedin/images/upload
 *
 * Body: binary image data
 * Headers: x-access-token, x-upload-url
 */
app.put('/api/linkedin/images/upload', async (req, res) => {
  const accessToken = req.headers['x-access-token'];
  const uploadUrl = req.headers['x-upload-url'];

  if (!accessToken || !uploadUrl) {
    return res.status(400).json({
      error: 'Missing required headers',
      message: 'x-access-token and x-upload-url headers are required'
    });
  }

  console.log(`\n→ Uploading image to LinkedIn`);

  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const imageBuffer = Buffer.concat(chunks);

    const url = new URL(uploadUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': imageBuffer.length,
      },
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          console.log(`✓ Image uploaded successfully\n`);
          res.status(response.statusCode).send(data);
        } else {
          console.error(`✗ Upload failed: ${response.statusCode}\n`);
          res.status(response.statusCode).json({
            error: 'upload_failed',
            message: `Upload failed with status ${response.statusCode}`,
            details: data
          });
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Upload error: ${error.message}\n`);
      res.status(500).json({
        error: 'upload_error',
        message: error.message
      });
    });

    request.write(imageBuffer);
    request.end();
  });
});

/**
 * LinkedIn API Proxy - Create Post
 * POST /api/linkedin/posts
 *
 * Body: { accessToken, postData }
 * Returns: LinkedIn API response
 */
app.post('/api/linkedin/posts', async (req, res) => {
  const { accessToken, postData } = req.body;

  if (!accessToken || !postData) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both accessToken and postData are required'
    });
  }

  console.log(`\n→ Creating LinkedIn post`);
  console.log(`  Commentary length: ${postData.commentary?.length || 0} characters`);

  const postDataString = JSON.stringify(postData);
  console.log(`  JSON payload size: ${Buffer.byteLength(postDataString, 'utf8')} bytes`);

  const options = {
    hostname: 'api.linkedin.com',
    port: 443,
    path: '/rest/posts',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202501',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postDataString),
    },
  };

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          console.log(`✓ Post created successfully`);

          // LinkedIn returns the post ID in the x-restli-id header
          const postId = response.headers['x-restli-id'] || '';

          let result;
          try {
            // Try to parse JSON response if present
            result = data ? JSON.parse(data) : {};
          } catch (e) {
            // If no JSON or parse error, create empty object
            result = {};
          }

          // Ensure we have the post ID in the response
          if (postId && !result.id) {
            result.id = postId;
          }

          console.log(`  Post ID: ${result.id || postId || 'N/A'}\n`);

          // Always return consistent JSON format
          res.status(response.statusCode).json(result);
          resolve();
        } else {
          console.error(`✗ Post creation failed: ${response.statusCode}`);
          console.error(`  Response: ${data}\n`);

          try {
            const errorData = JSON.parse(data);
            res.status(response.statusCode).json(errorData);
          } catch (e) {
            res.status(response.statusCode).json({
              error: 'post_creation_failed',
              message: `Post creation failed with status ${response.statusCode}`,
              details: data
            });
          }
          resolve();
        }
      });
    });

    request.on('error', (error) => {
      console.error(`✗ Request error: ${error.message}\n`);
      res.status(500).json({
        error: 'request_failed',
        message: error.message
      });
      resolve();
    });

    request.write(postDataString);
    request.end();
  });
});

/**
 * Get server configuration
 * GET /api/config
 */
app.get('/api/config', (req, res) => {
  res.json({
    clientId: CLIENT_ID,
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3001',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   LinkedIn OAuth Proxy Server                ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Client ID: ${CLIENT_ID}`);
  console.log(`✓ Client Secret: ${CLIENT_SECRET ? '***' + CLIENT_SECRET.slice(-4) : 'NOT SET - Configure in Profile panel'}`);
  console.log(`\n${isOAuthConfigured ? '✓ Ready to handle OAuth token exchanges' : '⚠ OAuth not configured - Set Client ID and Secret in Profile panel'}\n`);
  console.log('Press Ctrl+C to stop the server\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...\n');
  process.exit(0);
});
