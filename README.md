# PermaCraft

AI-first, map-based permaculture planning platform for small farmers and permaculture enthusiasts.

## Features

- 🗺️ Interactive map-based farm design with MapLibre GL JS
- ✏️ Draw zones and plan layouts
- 🤖 AI-powered design recommendations using vision models
- 🌱 Native species database
- 🌍 Public gallery to share designs
- 📊 Growth simulation and timeline

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Turso (libSQL)
- **Auth**: Better Auth
- **Maps**: MapLibre GL JS
- **AI**: OpenRouter (Free Vision Models)
- **Storage**: Cloudflare R2
- **Styling**: Tailwind CSS + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Turso CLI
- OpenRouter API key (free tier available)
- Cloudflare R2 bucket

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Turso database:
   ```bash
   turso db create permacraft
   turso db shell permacraft < lib/db/schema.sql
   turso db shell permacraft < data/seed-species.sql
   ```

4. Configure environment variables (see `.env.example`)

5. Run development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `turso db shell permacraft` - Open database shell

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to us.

[Code of Conduct](./CODE_OF_CONDUCT.md)

## License

MIT
