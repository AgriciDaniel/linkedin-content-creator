# CLAUDE.md - AI Assistant Reference

This file provides context for AI assistants working on this project.

## Project Overview

LinkedIn Content Creator is an AI-powered app for generating and scheduling LinkedIn posts. It uses Google's Gemini API for content generation and supports multiple post types (text, image, carousel).

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build**: Vite
- **Testing**: Playwright
- **Backend**: Express.js (OAuth proxy)

## Key Directories

```
components/     # React UI components
services/       # Business logic and API services
e2e/           # Playwright E2E tests
server/        # OAuth proxy server for LinkedIn
types/         # TypeScript type definitions
```

## Core Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Main application entry point |
| `AIPlannerChat.tsx` | AI-powered post planner wizard |
| `ContentCalendar.tsx` | Post scheduling calendar |
| `ResultDisplay.tsx` | Generated content display |
| `Settings.tsx` | API configuration and preferences |
| `BatchGenerator.tsx` | Multiple post generation |
| `CarouselPreview.tsx` | Carousel/document preview |

## Core Services

| Service | Purpose |
|---------|---------|
| `geminiService.ts` | Gemini AI API integration |
| `linkedinService.ts` | LinkedIn posting API |
| `linkedinAuth.ts` | LinkedIn OAuth token management |
| `schedulerService.ts` | Post scheduling logic |
| `calendarStorage.ts` | Calendar data persistence |
| `profileService.ts` | User profile/brand settings |
| `aiPlannerService.ts` | AI content planning logic |

## Data Storage

All data is stored in browser localStorage:
- `gemini_api_key` - Gemini API key
- `linkedin_token` - LinkedIn OAuth token (JSON)
- `linkedin_user_profile` - User profile settings
- `scheduled_posts` - Scheduled posts array
- `theme` - UI theme preference

## Common Commands

```bash
# Development
npm run dev              # Start dev server (port 5000)
npm run dev:full         # Start with OAuth proxy

# Testing
npm run test:e2e         # Run all Playwright tests
npx playwright test --headed  # Run with browser visible

# Build
npm run build           # Production build
npm run preview         # Preview production build
```

## Testing

E2E tests are in `e2e/` directory:
- `app.spec.ts` - Core app functionality
- `settings.spec.ts` - Settings and configuration
- `ai-planner.spec.ts` - AI planner flow
- `content-generation.spec.ts` - Content generation
- `calendar.spec.ts` - Calendar functionality
- `scheduler.spec.ts` - Scheduling logic
- `live-generation-test.spec.ts` - Real API tests (requires keys)

## Environment Variables

Required in `.env`:
- `LINKEDIN_CLIENT_ID` - LinkedIn app client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn app client secret

Optional:
- `VITE_GEMINI_API_KEY` - Gemini API key (can be set in UI)
- `VITE_FIRECRAWL_API_KEY` - Firecrawl API for research

## Common Tasks

### Adding a New Feature
1. Create component in `components/`
2. Add service logic in `services/` if needed
3. Add E2E tests in `e2e/`
4. Run `npm run test:e2e` to verify

### Modifying AI Generation
- Main logic: `services/geminiService.ts`
- Planner: `services/aiPlannerService.ts`
- Prompts are inline in service files

### Updating LinkedIn Integration
- OAuth: `services/linkedinOAuth.ts`
- Token management: `services/linkedinAuth.ts`
- Posting API: `services/linkedinService.ts`

## Attribution

App created by **Agrici Daniel**

Community: [AI Marketing Hub Pro](https://www.skool.com/ai-marketing-hub-pro)
