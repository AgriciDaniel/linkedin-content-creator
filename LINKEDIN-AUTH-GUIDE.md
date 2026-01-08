# LinkedIn Authentication Guide

This guide will help you connect your LinkedIn account to the app easily.

## Quick Start (3 Simple Steps!)

### Step 1: Get Your LinkedIn App Credentials

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Select your app (or create one if you haven't)
3. Click on the **"Auth"** tab
4. Copy the **"Client ID"** (visible at the top)
5. Find **"Primary Client Secret"** and copy it
   - Click the eye icon to reveal it
   - Click the copy icon to copy it

### Step 2: Run the Helper Script

Open your terminal/command prompt in this folder and run:

```bash
node linkedin-auth-helper.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

**Example:**
```bash
node linkedin-auth-helper.js abc123clientid xyz789secret
```

Replace:
- `abc123clientid` with your actual Client ID from Step 1
- `xyz789secret` with your actual Client Secret from Step 1

### Step 3: Complete Authorization

1. The script will display a URL in your terminal
2. **Copy and paste** that URL into your browser
3. You'll be redirected to LinkedIn - click **"Allow"**
4. The browser will show your **Access Token**
5. **Copy the token** (there's a handy copy button!)
6. Open the app, go to **Profile** section
7. Paste the token and click **"Connect LinkedIn"**

**Done!** 🎉 You're now connected to LinkedIn!

---

## Full Example

Here's what you'll see when running the script:

```
╔════════════════════════════════════════════════╗
║   LinkedIn OAuth Helper - Token Generator    ║
╚════════════════════════════════════════════════╝

✓ Server started on http://localhost:3001

Step 1: Open this URL in your browser:

https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/callback&scope=openid%20profile%20email%20w_member_social

Step 2: Authorize the application
  - You'll be redirected to LinkedIn
  - Click "Allow" to grant permissions
  - You'll be redirected back automatically

Waiting for authorization...

→ Authorization code received!
→ Exchanging code for access token...

✓ Success! Access token received!

════════════════════════════════════════════════
ACCESS TOKEN:
AQVbS9x...your-long-token-here...xyz123
════════════════════════════════════════════════

Token expires in: 5184000 seconds (60 days)

Next Steps:
  1. Copy the access token above
  2. Open your LinkedIn Content Creation app
  3. Go to Profile section
  4. Paste the token in the "Access Token" field
  5. Click "Connect LinkedIn"
```

---

## Troubleshooting

### Error: "Port 3001 is already in use"
- Close any application using port 3001 (like your React dev server)
- Or temporarily stop your React app while getting the token
- Then restart it after you have the token

### Error: "Client Secret is required"
- Make sure you're passing the Client Secret as a command line argument
- Usage: `node linkedin-auth-helper.js YOUR_CLIENT_SECRET`

### Error: "Authorization failed"
- Make sure your LinkedIn app has the correct redirect URI configured:
  - Go to LinkedIn Developer Portal → Your App → Auth tab
  - Under "Authorized redirect URLs", make sure `http://localhost:3001/callback` is listed
  - If not, add it and save

### Token doesn't work in the app
- Make sure you copied the **entire token** (they can be very long!)
- Try copying from the browser page using the copy button
- The token should start with something like `AQV...`

---

## Alternative Method (Manual)

If the helper script doesn't work for some reason, you can do it manually:

### Using Postman:

1. **Get Authorization Code:**
   - Open this URL in your browser:
     ```
     https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001&scope=openid%20profile%20email%20w_member_social
     ```
   - Approve permissions
   - Copy the `code` parameter from the redirect URL

2. **Exchange Code for Token:**
   - Open Postman
   - Create a POST request to: `https://www.linkedin.com/oauth/v2/accessToken`
   - Body type: `x-www-form-urlencoded`
   - Add parameters:
     - `grant_type`: `authorization_code`
     - `code`: [paste the code from step 1]
     - `redirect_uri`: `http://localhost:3001`
     - `client_id`: `YOUR_CLIENT_ID`
     - `client_secret`: [your client secret]
   - Send the request
   - Copy the `access_token` from the response

---

## Security Notes

⚠️ **Keep your Client Secret and Access Token private!**
- Never commit them to version control
- Never share them publicly
- The helper script is for **local use only**

✅ **Tokens expire after 60 days**
- You'll need to generate a new token when it expires
- The app will notify you when your token is expiring soon

---

## Need Help?

If you're still having issues:
1. Check that your LinkedIn app has all required products enabled (Auth tab → Products)
2. Make sure the redirect URL `http://localhost:3001/callback` is in your app's authorized redirect URLs
3. Verify your Client Secret is correct (regenerate it if needed)

Good luck! 🚀
