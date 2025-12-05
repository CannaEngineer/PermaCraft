# PermaCraft AI-Powered Permaculture Design Platform

## Project Overview

PermaCraft is an AI-powered permaculture design platform that combines interactive mapping with intelligent terrain analysis for regenerative agriculture planning. The application is built with Next.js 14, TypeScript, and uses Turso (libSQL) as its database. It leverages AI vision models through OpenRouter to provide permaculture design recommendations based on satellite and topographic map analysis.

### Key Features
- Interactive map-based design with support for polygons, lines, points, and circles
- AI-powered terrain analysis with multi-view vision capabilities
- Permaculture-first design with native species priority
- Grid-based location referencing for precise planning
- Collaboration features and public gallery sharing
- Support for various map layers (satellite, terrain, topographic, street maps)

### Tech Stack
- **Framework**: Next.js 14 with App Router, TypeScript
- **Database**: Turso (libSQL) - serverless SQLite
- **Authentication**: Better Auth
- **Maps**: MapLibre GL JS with various tile sources
- **AI**: OpenRouter vision models (Llama 3.2 90B Vision)
- **Storage**: Cloudflare R2 (or base64 fallback)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Deployment**: Vercel

## Building and Running

### Prerequisites
- Node.js 18+ and npm
- Turso CLI (`npm install -g @tursodatabase/turso-cli`)
- OpenRouter API Key (free tier available)
- Cloudflare R2 bucket (optional)

### Installation
```bash
# Install dependencies
npm install

# Set up Turso database
turso db create permacraft
turso db shell permacraft < lib/db/schema.sql
turso db shell permacraft < data/seed-species.sql

# Get database credentials
turso db show permacraft
turso db tokens create permacraft

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables
Required:
- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Database authentication token
- `BETTER_AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `OPENROUTER_API_KEY` - Free tier available at openrouter.ai
- `NEXT_PUBLIC_APP_URL` - Same as BETTER_AUTH_URL

Optional (for screenshot storage):
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Available Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with Vitest
```

## Project Structure
```
permacraft/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated routes
│   │   ├── dashboard/     # User's farms list
│   │   ├── farm/          # Farm editor
│   │   └── gallery/       # Public gallery
│   ├── (auth)/            # Auth pages (login/register)
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── map/               # Map-related components
│   ├── ai/                # AI chat and suggestions
│   └── shared/            # Shared components
├── lib/
│   ├── db/                # Database client and schema
│   ├── auth/              # Better Auth config
│   ├── ai/                # OpenRouter client and prompts
│   ├── map/               # Map utilities
│   └── storage/           # R2 storage utilities
├── data/                  # Seed data
└── scripts/               # Setup and utility scripts
```

## Architecture Details

### Database Schema
The application uses a well-structured SQLite schema with these main tables:
- Users (with Better Auth integration)
- Farms (user-owned properties)
- Zones (drawn features on maps)
- Species (permaculture plant database)
- Plantings (specific plants on farms)
- AI Conversations and Analyses
- Farm Collaborators (for sharing)
- Regional Knowledge

### AI Vision Pipeline
The application implements a sophisticated AI vision pipeline that:
1. Captures dual screenshots (current map view + topographic view)
2. Sends both images to OpenRouter vision models
3. Analyzes terrain features, slopes, and drainage patterns
4. Provides location-specific recommendations using grid coordinates
5. Stores analysis results with screenshot data

### Map System
The mapping system uses MapLibre GL JS with:
- Multiple tile sources (ESRI, USGS, OpenTopoMap, OpenStreetMap)
- Drawing tools for creating zones and features
- Grid system with alphanumeric coordinates (50ft spacing)
- Interactive, zoomable interface

### Authentication
Uses Better Auth for secure session management with:
- OAuth and traditional login support
- Session validation on protected routes
- User ownership verification for data access

## Development Conventions

### Code Style
- TypeScript with strict typing enabled
- Component-based architecture with clear separation of concerns
- Server Components for data fetching, Client Components for interactivity
- Zod for input validation
- Tailwind CSS with consistent design system

### Database Patterns
- Unix timestamps for date storage
- UUIDs for primary keys
- Foreign key constraints with appropriate cascade behavior
- Parameterized queries to prevent SQL injection

### File Organization
- Component logic separated by domain (ui, map, ai, shared)
- Utility functions organized by category in lib/
- API routes following REST conventions
- Server and client components clearly marked

## Key Development Files to Understand
1. `/app/farm/[id]/page.tsx` - Main farm editor page
2. `/components/map/farm-editor-client.tsx` - Map interface with drawing tools
3. `/lib/ai/prompts.ts` - AI prompt engineering
4. `/lib/db/schema.sql` - Database schema
5. `/lib/auth/index.ts` - Authentication setup
6. `/components/ai/ai-chat-panel.tsx` - AI chat interface

## Security Considerations
- Input validation with Zod schemas
- Parameterized database queries
- Protected routes with session validation
- Environment variables for secrets
- Proper CORS configuration for R2 storage

## Future Enhancements
Potential areas for improvement:
- Mobile-responsive design improvements
- Additional map tile sources
- Species database expansion
- Real-time collaboration features
- Export to PDF/CAD formats
- Watershed and water flow calculations