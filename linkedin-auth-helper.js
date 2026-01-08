/**
 * LinkedIn OAuth Helper Script
 *
 * This script helps users get their LinkedIn access token easily.
 *
 * Usage:
 * 1. Run: node linkedin-auth-helper.js
 * 2. Follow the instructions in the terminal
 * 3. Copy the access token and paste it in the app
 */

const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

// Configuration - Get these from environment or command line
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const REDIRECT_URI = 'http://localhost:3001/callback';
const PORT = 3001;

// You need to set your Client Secret here
let CLIENT_SECRET = '';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Check if CLIENT_ID and CLIENT_SECRET are provided via environment or command line
// Command line args: node linkedin-auth-helper.js CLIENT_ID CLIENT_SECRET
if (process.argv[2]) {
  if (process.argv[3]) {
    // Both args provided: CLIENT_ID and CLIENT_SECRET
    CLIENT_ID = process.argv[2];
    CLIENT_SECRET = process.argv[3];
  } else {
    // Only one arg provided: assume it's CLIENT_SECRET and CLIENT_ID is in env
    CLIENT_SECRET = process.argv[2];
  }
}

if (!CLIENT_ID) {
  console.log(`\n${colors.red}${colors.bright}ERROR: Client ID is required!${colors.reset}\n`);
  console.log(`${colors.yellow}Usage:${colors.reset}`);
  console.log(`  node linkedin-auth-helper.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET\n`);
  console.log(`${colors.yellow}Or set environment variable:${colors.reset}`);
  console.log(`  LINKEDIN_CLIENT_ID=your_id node linkedin-auth-helper.js YOUR_CLIENT_SECRET\n`);
  console.log(`${colors.cyan}To get your Client ID:${colors.reset}`);
  console.log(`  1. Go to https://www.linkedin.com/developers/apps`);
  console.log(`  2. Select your app`);
  console.log(`  3. Go to "Auth" tab`);
  console.log(`  4. Copy the "Client ID"\n`);
  process.exit(1);
}

if (!CLIENT_SECRET) {
  console.log(`\n${colors.red}${colors.bright}ERROR: Client Secret is required!${colors.reset}\n`);
  console.log(`${colors.yellow}Usage:${colors.reset}`);
  console.log(`  node linkedin-auth-helper.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET\n`);
  console.log(`${colors.yellow}Example:${colors.reset}`);
  console.log(`  node linkedin-auth-helper.js abc123def456 xyz789secret123\n`);
  console.log(`${colors.cyan}To get your Client Secret:${colors.reset}`);
  console.log(`  1. Go to https://www.linkedin.com/developers/apps`);
  console.log(`  2. Select your app`);
  console.log(`  3. Go to "Auth" tab`);
  console.log(`  4. Copy the "Primary Client Secret"\n`);
  process.exit(1);
}

console.log(`\n${colors.bright}${colors.green}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bright}${colors.green}║   LinkedIn OAuth Helper - Token Generator    ║${colors.reset}`);
console.log(`${colors.bright}${colors.green}╚════════════════════════════════════════════════╝${colors.reset}\n`);

// Function to exchange authorization code for access token
function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
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

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response);
          } else {
            reject(new Error(data));
          }
        } catch (error) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Create HTTP server to handle OAuth callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/callback') {
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;
    const errorDescription = parsedUrl.query.error_description;

    if (error) {
      console.log(`\n${colors.red}${colors.bright}✗ Authorization failed!${colors.reset}`);
      console.log(`${colors.red}Error: ${error}${colors.reset}`);
      if (errorDescription) {
        console.log(`${colors.red}Description: ${errorDescription}${colors.reset}\n`);
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Auth - Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #d32f2f; }
            p { color: #666; line-height: 1.6; }
            .error { background: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Authorization Failed</h1>
            <div class="error">
              <strong>Error:</strong> ${error}<br>
              ${errorDescription ? `<strong>Description:</strong> ${errorDescription}` : ''}
            </div>
            <p>You can close this window and try again.</p>
          </div>
        </body>
        </html>
      `);

      setTimeout(() => {
        server.close();
        process.exit(1);
      }, 2000);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing authorization code');
      return;
    }

    console.log(`\n${colors.bright}${colors.blue}→ Authorization code received!${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}→ Exchanging code for access token...${colors.reset}\n`);

    try {
      const tokenResponse = await exchangeCodeForToken(code);

      console.log(`${colors.green}${colors.bright}✓ Success! Access token received!${colors.reset}\n`);
      console.log(`${colors.bright}════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.cyan}${colors.bright}ACCESS TOKEN:${colors.reset}`);
      console.log(`${colors.bright}${tokenResponse.access_token}${colors.reset}`);
      console.log(`${colors.bright}════════════════════════════════════════════════${colors.reset}\n`);

      console.log(`${colors.yellow}Token expires in: ${tokenResponse.expires_in} seconds (${Math.floor(tokenResponse.expires_in / 86400)} days)${colors.reset}\n`);

      console.log(`${colors.green}${colors.bright}Next Steps:${colors.reset}`);
      console.log(`  1. Copy the access token above`);
      console.log(`  2. Open your LinkedIn Content Creation app`);
      console.log(`  3. Go to Profile section`);
      console.log(`  4. Paste the token in the "Access Token" field`);
      console.log(`  5. Click "Connect LinkedIn"\n`);

      // Send success page to browser
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Auth - Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
            h1 { color: #0a66c2; }
            p { color: #666; line-height: 1.6; }
            .token-box { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; word-break: break-all; font-family: monospace; border: 2px solid #0a66c2; }
            .copy-btn { background: #0a66c2; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 10px; }
            .copy-btn:hover { background: #004182; }
            .success { color: #2e7d32; margin-top: 10px; display: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authorization Successful!</h1>
            <p>Your LinkedIn access token has been generated. Copy it below:</p>
            <div class="token-box" id="token">${tokenResponse.access_token}</div>
            <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
            <div class="success" id="success">✓ Token copied to clipboard!</div>
            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              Token expires in ${Math.floor(tokenResponse.expires_in / 86400)} days<br>
              You can now close this window
            </p>
          </div>
          <script>
            function copyToken() {
              const token = document.getElementById('token').textContent;
              navigator.clipboard.writeText(token).then(() => {
                document.getElementById('success').style.display = 'block';
                setTimeout(() => {
                  document.getElementById('success').style.display = 'none';
                }, 3000);
              });
            }
          </script>
        </body>
        </html>
      `);

      // Close server after 30 seconds
      setTimeout(() => {
        console.log(`${colors.cyan}Closing server...${colors.reset}\n`);
        server.close();
        process.exit(0);
      }, 30000);

    } catch (error) {
      console.log(`\n${colors.red}${colors.bright}✗ Error exchanging code for token:${colors.reset}`);
      console.log(`${colors.red}${error.message}${colors.reset}\n`);

      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Auth - Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #d32f2f; }
            .error { background: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; color: #c62828; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Token Exchange Failed</h1>
            <div class="error">${error.message}</div>
            <p>Please check your Client Secret and try again.</p>
          </div>
        </body>
        </html>
      `);

      setTimeout(() => {
        server.close();
        process.exit(1);
      }, 2000);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`${colors.bright}${colors.green}✓ Server started on http://localhost:${PORT}${colors.reset}\n`);

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email%20w_member_social`;

  console.log(`${colors.bright}${colors.cyan}Step 1: Open this URL in your browser:${colors.reset}\n`);
  console.log(`${colors.blue}${authUrl}${colors.reset}\n`);
  console.log(`${colors.bright}${colors.cyan}Step 2: Authorize the application${colors.reset}`);
  console.log(`  - You'll be redirected to LinkedIn`);
  console.log(`  - Click "Allow" to grant permissions`);
  console.log(`  - You'll be redirected back automatically\n`);
  console.log(`${colors.yellow}Waiting for authorization...${colors.reset}\n`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`\n${colors.red}${colors.bright}✗ Error: Port ${PORT} is already in use!${colors.reset}`);
    console.log(`${colors.yellow}Please close any other application using port ${PORT} and try again.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}✗ Server error: ${error.message}${colors.reset}\n`);
  }
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Server stopped by user.${colors.reset}\n`);
  server.close();
  process.exit(0);
});
