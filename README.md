# LinkedIn Content Creator

An AI-powered application for generating and scheduling engaging LinkedIn posts. Built with React, TypeScript, and powered by Google's Gemini AI.

![LinkedIn Content Creator](app-screenshot.png)

## Features

- **AI Content Generation** - Generate professional LinkedIn posts using Gemini AI
- **Multiple Content Types** - Create text posts, image posts, and carousel/document posts
- **Smart Research** - AI researches topics and best practices before generating content
- **Content Calendar** - Schedule and manage your posts with an intuitive calendar view
- **AI Planner** - Plan multiple posts at once with intelligent scheduling
- **Batch Generation** - Generate multiple post variations simultaneously
- **Profile Customization** - Configure your brand voice, target audience, and content preferences
- **Dark/Light Mode** - Full theme support for comfortable viewing
- **LinkedIn Integration** - Direct posting to LinkedIn via OAuth

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI**: Google Gemini API
- **Build**: Vite
- **Testing**: Playwright (E2E)
- **Backend**: Express.js (OAuth proxy server)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AgriciDaniel/linkedin-content-creator.git
   cd linkedin-content-creator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

4. **Required API Keys**

   | Service | Required | Purpose | Get it from |
   |---------|----------|---------|-------------|
   | Gemini API | Yes | AI content generation | [Google AI Studio](https://aistudio.google.com/app/apikey) |
   | LinkedIn OAuth | Yes | Post to LinkedIn | [LinkedIn Developers](https://www.linkedin.com/developers/apps) |
   | Firecrawl API | Optional | Web research | [Firecrawl](https://www.firecrawl.dev/) |

## Configuration

### Gemini API Key
Add your Gemini API key in the app's Settings panel, or set it in `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key
```

### LinkedIn OAuth Setup
1. Create an app at [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Add these OAuth 2.0 redirect URLs:
   - `http://localhost:5000` (main app)
   - `http://localhost:5001` (OAuth proxy server)
3. Request the following permissions:
   - `openid`
   - `profile`
   - `w_member_social`
4. Copy your Client ID and Client Secret to `.env`

## Usage

### Development
```bash
# Start the development server
npm run dev

# Start with OAuth proxy server (for LinkedIn posting)
npm run dev:full
```

### Production Build
```bash
npm run build
npm run preview
```

### Testing
```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npx playwright test --headed

# Run specific test file
npx playwright test e2e/app.spec.ts
```

## Project Structure

```
├── components/        # React components
├── services/          # API and business logic services
├── e2e/              # Playwright E2E tests
├── server/           # OAuth proxy server
├── public/           # Static assets
└── types/            # TypeScript type definitions
```

## Testing Coverage

The app includes comprehensive E2E tests:
- **100 integration tests** covering UI, storage, calendar, and scheduling
- **3 live generation tests** for real API testing (requires API keys)

---

## Attribution

**App created by Agrici Daniel**

## Community

Join our community for tips, updates, and support:

**[AI Marketing Hub Pro](https://www.skool.com/ai-marketing-hub-pro)**

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

Built by [Agrici Daniel](https://agricidaniel.com/about) - AI Workflow Architect.

- [Blog](https://agricidaniel.com/blog) - Deep dives on AI marketing automation
- [AI Marketing Hub](https://www.skool.com/ai-marketing-hub) - Free community, 2,800+ members
- [YouTube](https://www.youtube.com/@AgriciDaniel) - Tutorials and demos
- [All open-source tools](https://github.com/AgriciDaniel)
