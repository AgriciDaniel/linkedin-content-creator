# One-Click LinkedIn OAuth Setup Guide

This guide will help you set up the one-click "Login with LinkedIn" feature in the app.

## ✨ Overview

With this setup, users can:
- Click "Login with LinkedIn" button
- Authorize with LinkedIn in a popup/redirect
- Automatically logged in - no manual token copying!

## 📋 Prerequisites

1. A LinkedIn Developer App (create one at [LinkedIn Developers](https://www.linkedin.com/developers/apps))
2. Node.js installed on your system
3. Your LinkedIn App's Client Secret

## 🚀 Setup Instructions

### Step 1: Configure Your LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Select your app (or create a new one)
3. Navigate to the **"Auth"** tab
4. Under **"Authorized redirect URLs for your app"**, add:
   ```
   http://localhost:3001
   http://localhost:5173
   ```
5. Make sure these **Products** are enabled for your app:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
6. Copy your **Client Secret** (click the eye icon 👁️ to reveal it)

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your LinkedIn Client Secret:
   ```env
   LINKEDIN_CLIENT_SECRET=your_actual_client_secret_here
   ```

   **IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

### Step 3: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Backend server
- `cors` - Handle cross-origin requests
- `dotenv` - Load environment variables
- `concurrently` - Run frontend and backend together (optional)

### Step 4: Run the Application

#### Option A: Run Frontend and Backend Together (Recommended)

```bash
npm run start:all
```

This starts both:
- Frontend: http://localhost:3001 (or 5173)
- Backend: http://localhost:3002

#### Option B: Run Separately

**Terminal 1** - Frontend:
```bash
npm run dev
```

**Terminal 2** - Backend:
```bash
npm run server
```

### Step 5: Test OAuth Login

1. Open the app in your browser
2. Go to the **Profile** section
3. Click **"Login with LinkedIn"** button
4. You'll be redirected to LinkedIn
5. Click **"Allow"** to grant permissions
6. You'll be automatically logged in! ✨

## 🔧 Configuration Options

### Environment Variables

Edit `.env` to customize:

```env
# Required
LINKEDIN_CLIENT_SECRET=your_secret_here

# Required - get from LinkedIn Developer Portal
LINKEDIN_CLIENT_ID=your_client_id_here
SERVER_PORT=3002
REDIRECT_URI=http://localhost:3001
```

### Frontend Environment

Create `.env.local` (optional) to configure the frontend:

```env
# Backend proxy server URL (default: http://localhost:3002)
VITE_PROXY_SERVER_URL=http://localhost:3002
```

## 📖 How It Works

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │         │ Proxy Server │         │   LinkedIn   │
│ (React App) │◄────────►│  (Node.js)   │◄────────►│     API      │
└─────────────┘         └──────────────┘         └──────────────┘
```

1. **User clicks "Login with LinkedIn"**
   - App redirects to LinkedIn with OAuth parameters

2. **User authorizes on LinkedIn**
   - LinkedIn redirects back with authorization code

3. **App receives code**
   - Automatically sends code to proxy server

4. **Proxy server exchanges code for token**
   - Calls LinkedIn API with client secret (server-to-server)
   - Returns access token to app

5. **App stores token**
   - User is logged in and can post to LinkedIn!

### Why a Backend Server?

LinkedIn's token exchange endpoint has **CORS restrictions** - it can't be called directly from the browser. Our lightweight proxy server:
- Handles the secure token exchange
- Keeps client secret safe (never exposed to browser)
- Only ~180 lines of code!

## 🔐 Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Keep client secret private** - Don't share it publicly
3. **Use HTTPS in production** - Update redirect URLs for deployment
4. **Rotate secrets regularly** - Generate new client secret periodically

## 🐛 Troubleshooting

### "Port 3002 is already in use"

Something else is using port 3002. Either:
- Kill the process using that port
- Change the port in `.env`: `SERVER_PORT=3003`

### "CLIENT_SECRET is not set"

Make sure:
1. You created `.env` file (copy from `.env.example`)
2. You added `LINKEDIN_CLIENT_SECRET=...` in `.env`
3. The value is your actual client secret (no quotes needed)

### "OAuth callback failed: CORS error"

Make sure the backend server is running:
```bash
npm run server
```

### "Invalid redirect_uri"

Make sure you added the correct redirect URI in LinkedIn Developer Portal:
- Development: `http://localhost:3001` and `http://localhost:5173`
- Must match exactly (no trailing slashes)

### "Token exchange failed"

Check:
1. Client Secret is correct in `.env`
2. Backend server is running on port 3002
3. No network/firewall blocking localhost connections

## 📚 Additional Resources

- [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Express.js Documentation](https://expressjs.com/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## 🎉 Success!

Once configured, your users can:
- ✅ One-click login with LinkedIn
- ✅ Automatic token management
- ✅ Secure authentication
- ✅ No manual token copying required!

Enjoy your new LinkedIn OAuth integration! 🚀
